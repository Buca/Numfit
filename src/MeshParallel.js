const NODE_WORKER_THREADS = [ 'node', 'worker_threads' ].join( ':' );
const NODE_OS = [ 'node', 'os' ].join( ':' );
import { validateSamplePositions } from './Validation.js';

const DEFAULT_WORK_UNIT_THRESHOLD = 50000;
const DEFAULT_MAX_AUTO_WORKERS = 4;

let workerThreads;
let nodeOs;
let nextMeshId = 1;
let nextTaskId = 1;

const meshIds = new WeakMap();
const pools = new Map();

async function getWorkerThreads() {

	if ( typeof process === 'undefined' || !process.versions?.node ) return null;

	if ( workerThreads === undefined ) {

		try {

			workerThreads = await import( NODE_WORKER_THREADS );

		} catch ( error ) {

			workerThreads = null;

		}

	}

	return workerThreads;

};

async function getWorkerConstructor() {

	const workerThreads = await getWorkerThreads();

	if ( workerThreads ) return { Worker: workerThreads.Worker, type: 'node' };
	if ( typeof Worker !== 'undefined' ) return { Worker, type: 'browser' };

	return null;

};

async function getNodeOs() {

	if ( typeof process === 'undefined' || !process.versions?.node ) return null;

	if ( nodeOs === undefined ) {

		try {

			nodeOs = await import( NODE_OS );

		} catch ( error ) {

			nodeOs = null;

		}

	}

	return nodeOs;

};

async function getDefaultWorkerCount() {

	const os = await getNodeOs();
	const cpus = os?.availableParallelism?.() || globalThis.navigator?.hardwareConcurrency || 2;

	return Math.max( 1, cpus - 1 );

};

function getMeshId( mesh ) {

	if ( !meshIds.has( mesh ) ) meshIds.set( mesh, nextMeshId ++ );

	return meshIds.get( mesh );

};

function getMeshKey( mesh ) {

	return `${ getMeshId( mesh ) }:${ mesh.cells.length }:${ mesh.indexMode }:${ mesh.resolution || 'auto' }:${ mesh.blending }`;

};

function getParallelPlan( mesh, sampleCount, options = {}, maxWorkers = 1 ) {

	const workUnits = sampleCount * Math.max( 1, mesh.cells.length );
	const threshold = options.threshold ?? DEFAULT_WORK_UNIT_THRESHOLD;
	const usesExplicitThreshold = options.threshold !== undefined;
	const meetsThreshold = usesExplicitThreshold ? sampleCount >= threshold : workUnits >= threshold;

	if ( !meetsThreshold ) return { workers: 1, workUnits, parallel: false };

	if ( options.workers !== undefined ) {

		const workers = Math.min( Math.max( 1, options.workers ), sampleCount, maxWorkers );

		return { workers, workUnits, parallel: workers > 1 };

	}

	const cappedMaxWorkers = Math.min( maxWorkers, DEFAULT_MAX_AUTO_WORKERS );
	const workers = Math.min(
		Math.max( 2, Math.ceil( workUnits / DEFAULT_WORK_UNIT_THRESHOLD ) ),
		sampleCount,
		cappedMaxWorkers
	);

	return { workers, workUnits, parallel: workers > 1 };

};

function getArraySlice( values, start, end ) {

	if ( typeof values.slice === 'function' ) return values.slice( start, end );

	const output = new values.constructor( end - start );

	for ( let i = start; i < end; i ++ ) output[ i - start ] = values[ i ];

	return output;

};

function copyChunk( output, chunk, offset ) {

	for ( let i = 0; i < chunk.length; i ++ ) output[ offset + i ] = chunk[ i ];

};

function isTypedArray( values ) {

	return ArrayBuffer.isView( values ) && !(values instanceof DataView);

};

function getTransferList( task ) {

	if ( !isTypedArray( task.positions ) ) return undefined;
	if (
		typeof SharedArrayBuffer !== 'undefined'
		&& task.positions.buffer instanceof SharedArrayBuffer
	) return undefined;

	return [ task.positions.buffer ];

};

function serializeMesh( mesh, key ) {

	const cells = mesh.cells.map( cell => serializeCell( cell ) );

	if ( !cells.every( Boolean ) ) return null;

	return {
		blending: mesh.blending,
		cells,
		dimension: mesh.dimension,
		index: mesh.indexMode,
		key,
		resolution: mesh.resolution,
		variables: mesh.variables
	};

};

function serializeCell( cell ) {

	if ( cell.hasCustomContains || cell.hasCustomWeight ) return null;

	const interpolator = cell.interpolator;
	const name = interpolator.constructor?.name;

	if ( name !== 'SimplexLinear' && name !== 'TriangleLinear' && name !== 'TetrahedralLinear' ) return null;

	return {
		bounds: cell.bounds,
		dimension: interpolator.dimension,
		positions: interpolator.positions,
		type: name,
		values: interpolator.values,
		variables: interpolator.variables
	};

};

class WorkerPool {

	constructor( workerConstructor, size, idleTimeout, workerUrl ) {

		this.Worker = workerConstructor.Worker;
		this.workerType = workerConstructor.type;
		this.size = size;
		this.idleTimeout = idleTimeout;
		this.workerUrl = workerUrl;
		this.queue = [];
		this.workers = [];
		this.activeTasks = 0;
		this.idleTimer = null;

	}

	run( task ) {

		return new Promise( ( resolve, reject ) => {

			this.queue.push( { task, resolve, reject } );
			this.drain();

		} );

	};

	drain() {

		clearTimeout( this.idleTimer );
		this.idleTimer = null;

		while ( this.queue.length > 0 ) {

			const worker = this.getIdleWorker();

			if ( !worker ) return;

			this.runOnWorker( worker, this.queue.shift() );

		}

		this.scheduleIdleTermination();

	};

	getIdleWorker() {

		let worker = this.workers.find( item => !item.busy );

		if ( worker ) return worker;
		if ( this.workers.length >= this.size ) return null;

		worker = this.createWorker();
		this.workers.push( worker );

		return worker;

	};

	createWorker() {

		const workerUrl = this.workerUrl || getWorkerUrl( this.workerType );

		if ( !workerUrl ) throw new Error( 'Unable to resolve mesh worker URL.' );

		const worker = new this.Worker( workerUrl, { type: 'module' } );
		const entry = {
			worker,
			busy: false,
			cache: new Set(),
			current: null
		};

		if ( typeof worker.on === 'function' ) {

			worker.on( 'message', message => this.handleMessage( entry, message ) );
			worker.on( 'error', error => this.handleError( entry, error ) );
			worker.on( 'exit', code => this.handleExit( entry, code ) );

		} else {

			worker.addEventListener( 'message', event => this.handleMessage( entry, event.data ) );
			worker.addEventListener( 'error', error => this.handleError( entry, error ) );
			worker.addEventListener( 'messageerror', error => this.handleError( entry, error ) );

		}

		return entry;

	};

	runOnWorker( worker, job ) {

		const message = { ...job.task };

		if ( message.config && worker.cache.has( message.config.key ) ) {

			delete message.config;

		} else if ( message.config ) {

			worker.cache.add( message.config.key );

		}

		worker.busy = true;
		worker.current = job;
		this.activeTasks ++;
		worker.worker.postMessage( message, getTransferList( message ) );

	};

	handleMessage( worker, message ) {

		const job = worker.current;

		worker.busy = false;
		worker.current = null;
		this.activeTasks --;

		if ( !job ) return;
		if ( message.error ) job.reject( new Error( message.error ) );
		else job.resolve( message );

		this.drain();

	};

	handleError( worker, error ) {

		this.rejectCurrent( worker, error );
		this.removeWorker( worker );
		this.drain();

	};

	handleExit( worker, code ) {

		if ( code !== 0 ) this.rejectCurrent( worker, new Error( `Mesh worker stopped with exit code ${ code }.` ) );

		this.removeWorker( worker );
		this.drain();

	};

	rejectCurrent( worker, error ) {

		if ( worker.current ) {

			worker.current.reject( error );
			worker.current = null;
			this.activeTasks --;

		}

		worker.busy = false;

	};

	removeWorker( worker ) {

		const index = this.workers.indexOf( worker );

		if ( index !== -1 ) this.workers.splice( index, 1 );

	};

	scheduleIdleTermination() {

		if ( this.activeTasks > 0 || this.queue.length > 0 || this.workers.length === 0 ) return;
		if ( this.idleTimeout === Number.POSITIVE_INFINITY ) return;

		this.idleTimer = setTimeout( () => this.terminate(), this.idleTimeout );

	};

	terminate() {

		clearTimeout( this.idleTimer );
		this.idleTimer = null;

		for ( const worker of this.workers ) {

			worker.current?.reject( new Error( 'Mesh worker pool terminated.' ) );
			worker.worker.terminate();

		}

		this.workers.length = 0;
		this.queue.length = 0;
		this.activeTasks = 0;

	};

};

function getWorkerUrl( workerType ) {

	if ( workerType === 'browser' ) {

		const baseUrl = globalThis.document?.currentScript?.src || import.meta.url;

		if ( !baseUrl ) return null;

		return new URL( './Numfit.mesh.worker.js', baseUrl );

	}

	return new URL( './MeshWorker.js', import.meta.url );

};

function getPool( workerConstructor, workers, idleTimeout, workerUrl ) {

	const key = `${ workerConstructor.type }:mesh:${ workers }:${ idleTimeout }:${ workerUrl || '' }`;
	let pool = pools.get( key );

	if ( !pool ) {

		pool = new WorkerPool( workerConstructor, workers, idleTimeout, workerUrl );
		pools.set( key, pool );

	}

	return pool;

};

export async function mapMeshInWorkers( mesh, positions, options = {} ) {

	validateSamplePositions( positions, mesh.variables );

	const sampleCount = positions.length / mesh.variables;
	const workerConstructor = await getWorkerConstructor();

	if ( !workerConstructor ) return mesh.map( positions );

	const plan = getParallelPlan( mesh, sampleCount, options, await getDefaultWorkerCount() );
	const workers = plan.workers;

	if ( !plan.parallel ) return mesh.map( positions );

	const key = getMeshKey( mesh );
	const config = serializeMesh( mesh, key );

	if ( !config ) return mesh.map( positions );

	const idleTimeout = options.idleTimeout ?? 1000;
	const pool = getPool( workerConstructor, workers, idleTimeout, options.meshWorkerUrl );
	const chunkSize = Math.ceil( sampleCount / workers );
	const tasks = [];

	for ( let i = 0; i < workers; i ++ ) {

		const sampleStart = i * chunkSize;
		const sampleEnd = Math.min( sampleCount, sampleStart + chunkSize );

		if ( sampleStart >= sampleEnd ) continue;

		const positionStart = sampleStart * mesh.variables;
		const positionEnd = sampleEnd * mesh.variables;

		tasks.push( pool.run( {
			id: nextTaskId ++,
			key,
			config,
			positions: getArraySlice( positions, positionStart, positionEnd ),
			outputOffset: sampleStart * mesh.dimension
		} ) );

	}

	const chunks = await Promise.all( tasks );
	const output = new mesh.values.constructor( sampleCount * mesh.dimension );

	for ( const chunk of chunks ) copyChunk( output, chunk.values, chunk.outputOffset );

	return output;

};
