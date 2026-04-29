const NODE_WORKER_THREADS = [ 'node', 'worker_threads' ].join( ':' );
const NODE_OS = [ 'node', 'os' ].join( ':' );
import { validateSamplePositions } from './Validation.js';

const evaluatorIds = new WeakMap();
const tensorPolynomialIds = new WeakMap();
const DEFAULT_WORK_UNIT_THRESHOLD = 2000000;
const DEFAULT_MAX_AUTO_WORKERS = 4;

let workerThreads;
let nodeOs;
let nextEvaluatorId = 1;
let nextTensorPolynomialId = 1;
let nextTaskId = 1;

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

	if ( workerThreads ) {

		return {
			Worker: workerThreads.Worker,
			type: 'node'
		};

	}

	if ( typeof Worker !== 'undefined' ) {

		return {
			Worker,
			type: 'browser'
		};

	}

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

export async function getDefaultWorkerCount() {

	const os = await getNodeOs();
	const cpus = os?.availableParallelism?.() || globalThis.navigator?.hardwareConcurrency || 2;

	return Math.max( 1, cpus - 1 );

};

export function getParallelPlan( evaluator, sampleCount, options = {}, maxWorkers = 1 ) {

	const degree = evaluator.constructor.degree;
	const variables = evaluator.constructor.variables;
	const dimension = evaluator.dimension;
	const coefficientCount = (degree + 1) ** variables;
	const workUnits = sampleCount * coefficientCount * dimension;
	const threshold = options.threshold ?? DEFAULT_WORK_UNIT_THRESHOLD;
	const usesExplicitThreshold = options.threshold !== undefined;
	const meetsThreshold = usesExplicitThreshold ? sampleCount >= threshold : workUnits >= threshold;

	if ( !meetsThreshold ) {

		return {
			workers: 1,
			workUnits,
			parallel: false
		};

	}

	if ( options.workers !== undefined ) {

		const workers = Math.min( Math.max( 1, options.workers ), sampleCount, maxWorkers );

		return {
			workers,
			workUnits,
			parallel: workers > 1
		};

	}

	const cappedMaxWorkers = Math.min( maxWorkers, DEFAULT_MAX_AUTO_WORKERS );
	const workers = Math.min(
		Math.max( 2, Math.ceil( workUnits / DEFAULT_WORK_UNIT_THRESHOLD ) ),
		sampleCount,
		cappedMaxWorkers
	);

	return {
		workers,
		workUnits,
		parallel: workers > 1
	};

};

export function getTensorPolynomialParallelPlan( polynomial, sampleCount, options = {}, maxWorkers = 1 ) {

	const pointsPerAxis = polynomial.degree + 1;
	const coefficientCount = pointsPerAxis ** polynomial.variables;
	const workUnits = sampleCount * coefficientCount * polynomial.variables * polynomial.dimension;
	const threshold = options.threshold ?? DEFAULT_WORK_UNIT_THRESHOLD;
	const usesExplicitThreshold = options.threshold !== undefined;
	const meetsThreshold = usesExplicitThreshold ? sampleCount >= threshold : workUnits >= threshold;

	if ( !meetsThreshold ) {

		return {
			workers: 1,
			workUnits,
			parallel: false
		};

	}

	if ( options.workers !== undefined ) {

		const workers = Math.min( Math.max( 1, options.workers ), sampleCount, maxWorkers );

		return {
			workers,
			workUnits,
			parallel: workers > 1
		};

	}

	const cappedMaxWorkers = Math.min( maxWorkers, DEFAULT_MAX_AUTO_WORKERS );
	const workers = Math.min(
		Math.max( 2, Math.ceil( workUnits / DEFAULT_WORK_UNIT_THRESHOLD ) ),
		sampleCount,
		cappedMaxWorkers
	);

	return {
		workers,
		workUnits,
		parallel: workers > 1
	};

};

function getArraySlice( values, start, end ) {

	if ( typeof values.slice === 'function' ) return values.slice( start, end );

	const output = new values.constructor( end - start );

	for ( let i = start; i < end; i ++ ) {

		output[ i - start ] = values[ i ];

	}

	return output;

};

function copyChunk( output, chunk, offset ) {

	for ( let i = 0; i < chunk.length; i ++ ) {

		output[ offset + i ] = chunk[ i ];

	}

};

function isTypedArray( values ) {

	return ArrayBuffer.isView( values ) && !(values instanceof DataView);

};

function canShareOutput( evaluator ) {

	return (
		typeof SharedArrayBuffer !== 'undefined'
		&& isTypedArray( evaluator.values )
		&& typeof evaluator.values.constructor.BYTES_PER_ELEMENT === 'number'
	);

};

function getTransferList( task ) {

	if ( !isTypedArray( task.positions ) ) return undefined;
	if (
		typeof SharedArrayBuffer !== 'undefined'
		&& task.positions.buffer instanceof SharedArrayBuffer
	) return undefined;

	return [ task.positions.buffer ];

};

function getEvaluatorId( evaluator ) {

	if ( !evaluatorIds.has( evaluator ) ) {

		evaluatorIds.set( evaluator, nextEvaluatorId ++ );

	}

	return evaluatorIds.get( evaluator );

};

function getEvaluatorKey( evaluator ) {

	return `${ getEvaluatorId( evaluator ) }:${ evaluator._parallelVersion ?? 0 }`;

};

function getTensorPolynomialId( polynomial ) {

	if ( !tensorPolynomialIds.has( polynomial ) ) {

		tensorPolynomialIds.set( polynomial, nextTensorPolynomialId ++ );

	}

	return tensorPolynomialIds.get( polynomial );

};

function getTensorPolynomialKey( polynomial ) {

	return `tensor:${ getTensorPolynomialId( polynomial ) }:${ polynomial._parallelVersion ?? 0 }`;

};

function createEvaluatorConfig( evaluator, key ) {

	return {
		key,
		type: 'evaluator',
		coefficients: evaluator.coefficients,
		degree: evaluator.constructor.degree,
		variables: evaluator.constructor.variables,
		dimension: evaluator.dimension
	};

};

function createTensorPolynomialConfig( polynomial, key ) {

	return {
		key,
		type: 'tensor-polynomial',
		cache: false,
		positions: polynomial.positions,
		values: polynomial.values,
		degree: polynomial.degree,
		variables: polynomial.variables,
		dimension: polynomial.dimension
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

		if ( !workerUrl ) throw new Error( 'Unable to resolve worker URL.' );

		const worker = new this.Worker( workerUrl, {
			type: 'module'
		} );
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

		if ( message.config?.cache !== false && worker.cache.has( message.config.key ) ) {

			delete message.config;

		} else if ( message.config ) {

			if ( message.config.cache !== false ) worker.cache.add( message.config.key );

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

		if ( code !== 0 ) this.rejectCurrent( worker, new Error( `Worker stopped with exit code ${ code }.` ) );

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

			worker.current?.reject( new Error( 'Worker pool terminated.' ) );
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

		return new URL( './Numfit.worker.js', baseUrl );

	}

	return new URL( './ParallelWorker.js', import.meta.url );

};

function getPool( workerConstructor, workers, idleTimeout, workerUrl ) {

	const key = `${ workerConstructor.type }:${ workers }:${ idleTimeout }:${ workerUrl || '' }`;
	let pool = pools.get( key );

	if ( !pool ) {

		pool = new WorkerPool( workerConstructor, workers, idleTimeout, workerUrl );
		pools.set( key, pool );

	}

	return pool;

};

export async function closeWorkerPools() {

	for ( const pool of pools.values() ) pool.terminate();

	pools.clear();

};

export async function mapInWorkers( evaluator, positions, options = {} ) {

	const variables = evaluator.constructor.variables;
	const dimension = evaluator.dimension;

	validateSamplePositions( positions, variables );

	const sampleCount = positions.length / variables;
	const workerConstructor = await getWorkerConstructor();

	if ( !workerConstructor ) return evaluator.map( positions );

	const plan = getParallelPlan(
		evaluator,
		sampleCount,
		options,
		await getDefaultWorkerCount()
	);
	const workers = plan.workers;

	if ( !plan.parallel ) return evaluator.map( positions );

	const idleTimeout = options.idleTimeout ?? 1000;
	const pool = getPool( workerConstructor, workers, idleTimeout, options.workerUrl );
	const chunkSize = Math.ceil( sampleCount / workers );
	const key = getEvaluatorKey( evaluator );
	const config = createEvaluatorConfig( evaluator, key );
	const tasks = [];
	const sharedOutput = canShareOutput( evaluator );
	const sharedOutputValues = sharedOutput
		? new evaluator.values.constructor(
			new SharedArrayBuffer(
				sampleCount * dimension * evaluator.values.constructor.BYTES_PER_ELEMENT
			)
		)
		: null;

	for ( let i = 0; i < workers; i ++ ) {

		const sampleStart = i * chunkSize;
		const sampleEnd = Math.min( sampleCount, sampleStart + chunkSize );

		if ( sampleStart >= sampleEnd ) continue;

		const positionStart = sampleStart * variables;
		const positionEnd = sampleEnd * variables;

		tasks.push( pool.run( {
			id: nextTaskId ++,
			key,
			config,
			positions: getArraySlice( positions, positionStart, positionEnd ),
			outputBuffer: sharedOutput ? sharedOutputValues.buffer : undefined,
			outputOffset: sampleStart * dimension
		} ) );

	}

	const chunks = await Promise.all( tasks );

	if ( sharedOutput ) return sharedOutputValues;

	const output = new evaluator.values.constructor( sampleCount * dimension );

	for ( const chunk of chunks ) {

		copyChunk( output, chunk.values, chunk.outputOffset );

	}

	return output;

};

export async function mapTensorPolynomialInWorkers( polynomial, positions, options = {} ) {

	const variables = polynomial.variables;
	const dimension = polynomial.dimension;

	validateSamplePositions( positions, variables );

	if ( options?.handler ) return polynomial.map( positions, options.handler );

	const sampleCount = positions.length / variables;
	const workerConstructor = await getWorkerConstructor();

	if ( !workerConstructor ) return polynomial.map( positions );

	const plan = getTensorPolynomialParallelPlan(
		polynomial,
		sampleCount,
		options,
		await getDefaultWorkerCount()
	);
	const workers = plan.workers;

	if ( !plan.parallel ) return polynomial.map( positions );

	const idleTimeout = options.idleTimeout ?? 1000;
	const pool = getPool( workerConstructor, workers, idleTimeout, options.workerUrl );
	const chunkSize = Math.ceil( sampleCount / workers );
	const key = getTensorPolynomialKey( polynomial );
	const config = createTensorPolynomialConfig( polynomial, key );
	const tasks = [];
	const sharedOutput = canShareOutput( polynomial );
	const sharedOutputValues = sharedOutput
		? new polynomial.values.constructor(
			new SharedArrayBuffer(
				sampleCount * dimension * polynomial.values.constructor.BYTES_PER_ELEMENT
			)
		)
		: null;

	for ( let i = 0; i < workers; i ++ ) {

		const sampleStart = i * chunkSize;
		const sampleEnd = Math.min( sampleCount, sampleStart + chunkSize );

		if ( sampleStart >= sampleEnd ) continue;

		const positionStart = sampleStart * variables;
		const positionEnd = sampleEnd * variables;

		tasks.push( pool.run( {
			id: nextTaskId ++,
			key,
			config,
			positions: getArraySlice( positions, positionStart, positionEnd ),
			outputBuffer: sharedOutput ? sharedOutputValues.buffer : undefined,
			outputOffset: sampleStart * dimension
		} ) );

	}

	const chunks = await Promise.all( tasks );

	if ( sharedOutput ) return sharedOutputValues;

	const output = new polynomial.values.constructor( sampleCount * dimension );

	for ( const chunk of chunks ) {

		copyChunk( output, chunk.values, chunk.outputOffset );

	}

	return output;

};
