const NODE_WORKER_THREADS = [ 'node', 'worker_threads' ].join( ':' );
import {
	InterpolationMesh,
	SimplexLinear,
	TetrahedralLinear,
	TriangleLinear
} from './index.js';

const meshes = new Map();
const port = await getWorkerPort();

port.onMessage( task => {

	try {

		if ( task.config ) meshes.set( task.config.key, createMesh( task.config ) );

		const mesh = meshes.get( task.key );

		if ( !mesh ) throw new Error( `Missing mesh config "${ task.key }".` );

		const values = mesh.map( task.positions );

		port.postMessage( {
			id: task.id,
			outputOffset: task.outputOffset,
			values
		}, getTransferList( values ) );

	} catch ( error ) {

		port.postMessage( {
			id: task.id,
			error: error.message || String( error )
		} );

	}

} );

async function getWorkerPort() {

	if (
		typeof self !== 'undefined'
		&& typeof self.addEventListener === 'function'
		&& typeof self.postMessage === 'function'
	) {

		return {
			onMessage( handler ) {

				self.addEventListener( 'message', event => handler( event.data ) );

			},
			postMessage( message, transferList ) {

				self.postMessage( message, transferList );

			}
		};

	}

	const { parentPort } = await import( NODE_WORKER_THREADS );

	return {
		onMessage( handler ) {

			parentPort.on( 'message', handler );

		},
		postMessage( message, transferList ) {

			parentPort.postMessage( message, transferList );

		}
	};

};

function createMesh( config ) {

	return new InterpolationMesh(
		config.cells.map( createCell ),
		{
			blending: config.blending,
			index: config.index,
			resolution: config.resolution
		}
	);

};

function createCell( cell ) {

	const CellType = getCellType( cell.type );

	return new CellType( cell.positions, cell.values, cell.dimension, cell.variables );

};

function getCellType( type ) {

	if ( type === 'TriangleLinear' ) return TriangleLinear;
	if ( type === 'TetrahedralLinear' ) return TetrahedralLinear;
	if ( type === 'SimplexLinear' ) return SimplexLinear;

	throw new Error( `Unsupported mesh worker cell type "${ type }".` );

};

function getTransferList( values ) {

	if ( !ArrayBuffer.isView( values ) ) return undefined;
	if (
		typeof SharedArrayBuffer !== 'undefined'
		&& values.buffer instanceof SharedArrayBuffer
	) return undefined;

	return [ values.buffer ];

};
