import { InverseDistanceWeighting } from '../src/index.js';

const DEFAULT_SOURCE_SIZES = [ 1000, 10000 ];
const DEFAULT_QUERY_SIZES = [ 1000, 10000 ];
const DEFAULT_REPEATS = 3;
const DEFAULT_WARMUP = 1;
const EPSILON = 1e-9;

const sourceSizes = parseNumberList( process.env.NUMFIT_IDW_SOURCES, DEFAULT_SOURCE_SIZES );
const querySizes = parseNumberList( process.env.NUMFIT_IDW_QUERIES, DEFAULT_QUERY_SIZES );
const repeats = parsePositiveInteger( process.env.NUMFIT_IDW_REPEATS, DEFAULT_REPEATS );
const warmup = parseNonNegativeInteger( process.env.NUMFIT_IDW_WARMUP, DEFAULT_WARMUP );
const radius = parsePositiveNumber( process.env.NUMFIT_IDW_RADIUS, .08 );
const neighbors = parsePositiveInteger( process.env.NUMFIT_IDW_NEIGHBORS, 16 );
const validate = process.env.NUMFIT_IDW_VALIDATE !== '0';
let checksum = 0;

console.log( 'Numfit IDW benchmark' );
console.log( `Sources: ${ sourceSizes.join( ', ' ) }, queries: ${ querySizes.join( ', ' ) }` );
console.log( `Radius: ${ radius }, neighbors: ${ neighbors }, repeats: ${ repeats }, warmup: ${ warmup }` );
console.log( `Validation: ${ validate ? 'on' : 'off' }` );
console.log( '' );

for ( const sourceCount of sourceSizes ) {

	const sourcePositions = createSourcePositions( sourceCount );
	const sourceValues = createValues( sourcePositions );
	const linear = new InverseDistanceWeighting({
		positions: sourcePositions,
		values: sourceValues,
		variables: 2,
		radius,
		neighbors,
		empty: 'nearest'
	});
	const indexed = new InverseDistanceWeighting({
		positions: sourcePositions,
		values: sourceValues,
		variables: 2,
		radius,
		neighbors,
		empty: 'nearest',
		index: 'grid',
		resolution: 'auto'
	});

	console.log( `Sources: ${ formatNumber( sourceCount ) }, index: ${ indexed.index.resolution.join( 'x' ) }` );
	console.log( padLeft( 'Queries', 12 ) + padLeft( 'linear', 14 ) + padLeft( 'grid', 14 ) + padLeft( 'speedup', 12 ) );

	for ( const queryCount of querySizes ) {

		const queries = createQueryPositions( queryCount );
		const expected = linear.map( queries );
		const linearTime = await measure( () => linear.map( queries ), expected );
		const indexedTime = await measure( () => indexed.map( queries ), expected );

		console.log(
			padLeft( formatNumber( queryCount ), 12 )
			+ padLeft( formatMs( linearTime ), 14 )
			+ padLeft( formatMs( indexedTime ), 14 )
			+ padLeft( formatSpeedup( linearTime, indexedTime ), 12 )
		);

	}

	console.log( '' );

}

async function measure( fn, expected ) {

	let lastResult;

	for ( let i = 0; i < warmup; i ++ ) lastResult = await fn();

	const times = [];

	for ( let i = 0; i < repeats; i ++ ) {

		const start = performance.now();

		lastResult = await fn();

		times.push( performance.now() - start );

	}

	consume( lastResult );
	verify( lastResult, expected );
	times.sort( ( a, b ) => a - b );

	return times[ Math.floor( times.length / 2 ) ];

}

function verify( actual, expected ) {

	if ( !validate ) return;
	if ( actual.length !== expected.length ) throw new Error( `Expected ${ expected.length } values, received ${ actual.length }.` );

	for ( let i = 0; i < expected.length; i ++ ) {

		const diff = Math.abs( actual[ i ] - expected[ i ] );

		if ( diff > EPSILON ) throw new Error( `IDW benchmark validation failed at ${ i }: expected ${ expected[ i ] }, received ${ actual[ i ] }.` );

	}

}

function consume( values ) {

	if ( !values || values.length === 0 ) return;

	checksum += values[ 0 ] + values[ values.length - 1 ];

	if ( checksum === Infinity ) console.log( checksum );

}

function createSourcePositions( count ) {

	const positions = new Float64Array( count * 2 );

	for ( let i = 0; i < count; i ++ ) {

		positions[ i * 2 ] = ((i * 73) % 1009) / 1009;
		positions[ i * 2 + 1 ] = ((i * 151) % 1013) / 1013;

	}

	return positions;

}

function createQueryPositions( count ) {

	const positions = new Float64Array( count * 2 );

	for ( let i = 0; i < count; i ++ ) {

		positions[ i * 2 ] = ((i * 37 + 17) % 997) / 997;
		positions[ i * 2 + 1 ] = ((i * 89 + 29) % 991) / 991;

	}

	return positions;

}

function createValues( positions ) {

	const values = new Float64Array( positions.length / 2 );

	for ( let i = 0; i < values.length; i ++ ) {

		const x = positions[ i * 2 ];
		const y = positions[ i * 2 + 1 ];

		values[ i ] = Math.sin( x * Math.PI ) + Math.cos( y * Math.PI );

	}

	return values;

}

function parseNumberList( value, fallback ) {

	if ( !value ) return fallback;

	return value
		.split( ',' )
		.map( item => Number( item.trim() ) )
		.filter( value => Number.isFinite( value ) && value > 0 );

}

function parsePositiveInteger( value, fallback ) {

	if ( value === undefined ) return fallback;

	const parsed = Number( value );

	return Number.isInteger( parsed ) && parsed > 0 ? parsed : fallback;

}

function parseNonNegativeInteger( value, fallback ) {

	if ( value === undefined ) return fallback;

	const parsed = Number( value );

	return Number.isInteger( parsed ) && parsed >= 0 ? parsed : fallback;

}

function parsePositiveNumber( value, fallback ) {

	if ( value === undefined ) return fallback;

	const parsed = Number( value );

	return Number.isFinite( parsed ) && parsed > 0 ? parsed : fallback;

}

function formatMs( value ) {

	return `${ value.toFixed( 2 ) }ms`;

}

function formatSpeedup( baseline, value ) {

	return `${ (baseline / value).toFixed( 2 ) }x`;

}

function formatNumber( value ) {

	return value.toLocaleString( 'en-US' );

}

function padLeft( value, width ) {

	return String( value ).padStart( width );

}
