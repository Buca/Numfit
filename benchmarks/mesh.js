import { availableParallelism } from 'node:os';
import { InterpolationMesh } from '../src/index.js';

const DEFAULT_CELLS = [ 200, 2000, 20000 ];
const DEFAULT_SAMPLES = [ 1000, 10000 ];
const DEFAULT_REPEATS = 3;
const DEFAULT_WARMUP = 1;
const DEFAULT_RESOLUTIONS = [ 'auto', 16, 32, 64 ];
const EPSILON = 1e-9;

const cellCounts = parseNumberList( process.env.NUMFIT_MESH_CELLS, DEFAULT_CELLS );
const sampleCounts = parseNumberList( process.env.NUMFIT_MESH_SAMPLES, DEFAULT_SAMPLES );
const resolutions = parseResolutionList( process.env.NUMFIT_MESH_RESOLUTION, DEFAULT_RESOLUTIONS );
const repeats = parsePositiveInteger( process.env.NUMFIT_MESH_REPEATS, DEFAULT_REPEATS );
const warmup = parseNonNegativeInteger( process.env.NUMFIT_MESH_WARMUP, DEFAULT_WARMUP );
const validate = process.env.NUMFIT_MESH_VALIDATE !== '0';
const maxWorkers = Math.max( 1, availableParallelism() - 1 );
const workerCounts = parseNumberList(
	process.env.NUMFIT_MESH_WORKERS,
	[ 2, 4, maxWorkers ]
).filter( workers => workers > 1 && workers <= maxWorkers );
const uniqueWorkerCounts = [ ...new Set( workerCounts ) ];

console.log( 'Numfit mesh benchmark' );
console.log( `Node ${ process.version }, workers available: ${ maxWorkers }` );
console.log( `Cells: ${ cellCounts.join( ', ' ) }, samples: ${ sampleCounts.join( ', ' ) }` );
console.log( `Resolutions: ${ resolutions.join( ', ' ) }, repeats: ${ repeats }, warmup: ${ warmup }` );
console.log( `Validation: ${ validate ? 'on' : 'off' }` );
console.log( '' );

for ( const requestedCells of cellCounts ) {

	const meshData = createTriangleGrid( requestedCells );
	const linearMesh = InterpolationMesh.fromTriangles(
		meshData.positions,
		meshData.values,
		meshData.indices
	);

	console.log( `Cells: ${ formatNumber( meshData.cellCount ) } (${ meshData.segments }x${ meshData.segments } squares)` );
	console.log( padRight( 'Samples', 12 ) + padLeft( 'linear', 14 ) + resolutionHeader() + workerHeader() );

	for ( const sampleCount of sampleCounts ) {

		const samples = createSamplePositions( sampleCount );
		const baseline = linearMesh.map( samples );
		const linearTime = await measure( () => linearMesh.map( samples ), baseline );
		const indexedTimes = [];
		const workerTimes = [];
		let maxDiff = 0;

		for ( const resolution of resolutions ) {

			const indexedMesh = InterpolationMesh.fromTriangles(
				meshData.positions,
				meshData.values,
				meshData.indices,
				{
					index: 'grid',
					resolution: resolution === 'auto' ? 'auto' : [ resolution, resolution ]
				}
			);
			const time = await measure( () => indexedMesh.map( samples ), baseline, diff => {

				if ( diff > maxDiff ) maxDiff = diff;

			} );

			indexedTimes.push( time );

		}

		const asyncMesh = InterpolationMesh.fromTriangles(
			meshData.positions,
			meshData.values,
			meshData.indices,
			{
				index: 'grid',
				resolution: 'auto'
			}
		);

		for ( const workers of uniqueWorkerCounts ) {

			const time = await measure( () => asyncMesh.mapAsync( samples, {
				workers,
				threshold: 0
			} ), baseline, diff => {

				if ( diff > maxDiff ) maxDiff = diff;

			} );

			workerTimes.push( time );

		}

		console.log(
			padRight( formatNumber( sampleCount ), 12 )
			+ padLeft( formatMs( linearTime ), 14 )
			+ indexedTimes.map( time => padLeft( `${ formatMs( time ) } ${ formatSpeedup( linearTime, time ) }`, 18 ) ).join( '' )
			+ workerTimes.map( time => padLeft( `${ formatMs( time ) } ${ formatSpeedup( linearTime, time ) }`, 18 ) ).join( '' )
		);
		console.log(
			`${ ''.padEnd( 12 ) }`
			+ `checksum: ${ formatNumberValue( getChecksum( baseline ) ) }`
			+ `, max diff: ${ formatNumberValue( maxDiff ) }`
		);

	}

	console.log( '' );

}

function resolutionHeader() {

	return resolutions
		.map( resolution => padLeft( `grid ${ resolution }`, 18 ) )
		.join( '' );

};

function workerHeader() {

	return uniqueWorkerCounts
		.map( workers => padLeft( `async x${ workers }`, 18 ) )
		.join( '' );

};

async function measure( fn, expected, diffHandler = () => {} ) {

	let lastResult;

	for ( let i = 0; i < warmup; i ++ ) lastResult = await fn();

	const times = [];

	for ( let i = 0; i < repeats; i ++ ) {

		const start = performance.now();

		lastResult = await fn();

		const end = performance.now();

		times.push( end - start );

	}

	verify( lastResult, expected, diffHandler );
	times.sort( ( a, b ) => a - b );

	return times[ Math.floor( times.length / 2 ) ];

};

function verify( actual, expected, diffHandler ) {

	if ( !validate ) return;
	if ( actual.length !== expected.length ) {

		throw new Error( `Expected ${ expected.length } values but received ${ actual.length }.` );

	}

	for ( let i = 0; i < expected.length; i ++ ) {

		const diff = Math.abs( actual[ i ] - expected[ i ] );

		diffHandler( diff );

		if ( diff > EPSILON ) {

			throw new Error( `Mesh benchmark validation failed at index ${ i }: expected ${ expected[ i ] }, received ${ actual[ i ] }.` );

		}

	}

};

function createTriangleGrid( requestedCells ) {

	const segments = Math.max( 1, Math.ceil( Math.sqrt( requestedCells / 2 ) ) );
	const vertexCount = (segments + 1) * (segments + 1);
	const positions = new Float64Array( vertexCount * 2 );
	const values = new Float64Array( vertexCount );
	const indices = new Uint32Array( segments * segments * 6 );

	for ( let y = 0, vertex = 0; y <= segments; y ++ ) {

		for ( let x = 0; x <= segments; x ++, vertex ++ ) {

			const px = x / segments;
			const py = y / segments;

			positions[ vertex * 2 ] = px;
			positions[ vertex * 2 + 1 ] = py;
			values[ vertex ] = sampleFunction( px, py );

		}

	}

	for ( let y = 0, index = 0; y < segments; y ++ ) {

		for ( let x = 0; x < segments; x ++ ) {

			const a = y * (segments + 1) + x;
			const b = a + 1;
			const c = a + segments + 1;
			const d = c + 1;

			indices[ index ++ ] = a;
			indices[ index ++ ] = b;
			indices[ index ++ ] = c;
			indices[ index ++ ] = b;
			indices[ index ++ ] = d;
			indices[ index ++ ] = c;

		}

	}

	return {
		cellCount: indices.length / 3,
		indices,
		positions,
		segments,
		values
	};

};

function createSamplePositions( sampleCount ) {

	const positions = new Float64Array( sampleCount * 2 );

	for ( let i = 0; i < sampleCount; i ++ ) {

		positions[ i * 2 ] = ((i * 37) % 1000) / 1000;
		positions[ i * 2 + 1 ] = ((i * 61) % 1000) / 1000;

	}

	return positions;

};

function sampleFunction( x, y ) {

	return x * 10 + y * 20;

};

function getChecksum( values ) {

	let output = 0;

	for ( let i = 0; i < values.length; i ++ ) output += values[ i ] * ((i % 97) + 1);

	return output;

};

function parseNumberList( value, fallback ) {

	if ( !value ) return fallback;

	const parsed = value
		.split( ',' )
		.map( item => Number.parseInt( item.trim(), 10 ) )
		.filter( item => Number.isInteger( item ) && item > 0 );

	return parsed.length > 0 ? parsed : fallback;

};

function parseResolutionList( value, fallback ) {

	if ( !value ) return fallback;

	const parsed = value
		.split( ',' )
		.map( item => item.trim().toLowerCase() )
		.map( item => item === 'auto' ? 'auto' : Number.parseInt( item, 10 ) )
		.filter( item => item === 'auto' || (Number.isInteger( item ) && item > 0) );

	return parsed.length > 0 ? parsed : fallback;

};

function parsePositiveInteger( value, fallback ) {

	const parsed = Number.parseInt( value, 10 );

	return Number.isInteger( parsed ) && parsed > 0 ? parsed : fallback;

};

function parseNonNegativeInteger( value, fallback ) {

	const parsed = Number.parseInt( value, 10 );

	return Number.isInteger( parsed ) && parsed >= 0 ? parsed : fallback;

};

function formatMs( value ) {

	return `${ value.toFixed( 2 ) }ms`;

};

function formatSpeedup( baseline, value ) {

	return `${ (baseline / value).toFixed( 2 ) }x`;

};

function formatNumber( value ) {

	return new Intl.NumberFormat( 'en-US' ).format( value );

};

function formatNumberValue( value ) {

	return Number.isInteger( value ) ? formatNumber( value ) : value.toExponential( 6 );

};

function padRight( value, length ) {

	return String( value ).padEnd( length, ' ' );

};

function padLeft( value, length ) {

	return String( value ).padStart( length, ' ' );

};
