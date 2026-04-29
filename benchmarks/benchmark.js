import { availableParallelism } from 'node:os';
import {
	getParallelPlan,
	getTensorPolynomialParallelPlan
} from '../src/Parallel.js';
import {
	Bicubic,
	Bilinear,
	Linear,
	Multicubic,
	Multipolynomial,
	Tricubic
} from '../src/index.js';

const DEFAULT_SIZES = [ 1000, 10000, 50000, 500000 ];
const DEFAULT_REPEATS = 3;
const DEFAULT_WARMUP = 1;
const EPSILON = 1e-9;

const sizes = parseNumberList( process.env.NUMFIT_BENCH_SIZES, DEFAULT_SIZES );
const repeats = parsePositiveInteger( process.env.NUMFIT_BENCH_REPEATS, DEFAULT_REPEATS );
const warmup = parseNonNegativeInteger( process.env.NUMFIT_BENCH_WARMUP, DEFAULT_WARMUP );
const validate = process.env.NUMFIT_BENCH_VALIDATE !== '0';
const maxWorkers = Math.max( 1, availableParallelism() - 1 );
const workerCounts = parseNumberList(
	process.env.NUMFIT_BENCH_WORKERS,
	[ 2, 4, maxWorkers ]
).filter( workers => workers > 1 && workers <= maxWorkers );
const uniqueWorkerCounts = [ ...new Set( workerCounts ) ];

const cases = [
	createLinearCase(),
	createBilinearCase(),
	createBicubicCase(),
	createTricubicCase(),
	createMulticubicCase(),
	createMultipolynomialCase()
];
let checksum = 0;
let maxDiff = 0;

console.log( `Numfit benchmark` );
console.log( `Node ${ process.version }, workers available: ${ maxWorkers }` );
console.log( `Sizes: ${ sizes.join( ', ' ) }, repeats: ${ repeats }, warmup: ${ warmup }` );
console.log( `Validation: ${ validate ? 'on' : 'off' }` );
console.log( '' );

for ( const size of sizes ) {

	console.log( `Samples: ${ formatNumber( size ) }` );
	console.log( padRight( 'Case', 16 ) + padLeft( 'map()', 14 ) + padLeft( 'async auto', 16 ) + workerHeader() );

	for ( const testCase of cases ) {

		const positions = createSamplePositions( size, testCase.variables, testCase.max );
		const baseline = testCase.evaluator.map( positions );
		const baselineChecksum = getChecksum( baseline );
		const autoPlan = getPlan( testCase.evaluator, size, {}, maxWorkers );
		maxDiff = 0;
		const mapTime = await measure( () => testCase.evaluator.map( positions ), baseline );
		const autoTime = await measure( () => testCase.evaluator.mapAsync( positions ), baseline );
		const workerTimes = [];

		for ( const workers of uniqueWorkerCounts ) {

			const time = await measure( () => testCase.evaluator.mapAsync( positions, {
				workers,
				threshold: 0
			} ), baseline );

			workerTimes.push( time );

		}

		console.log(
			padRight( testCase.name, 16 )
			+ padLeft( formatMs( mapTime ), 14 )
			+ padLeft( `${ formatMs( autoTime ) } ${ formatSpeedup( mapTime, autoTime ) }`, 16 )
			+ workerTimes.map( time => padLeft( `${ formatMs( time ) } ${ formatSpeedup( mapTime, time ) }`, 16 ) ).join( '' )
		);
		console.log(
			`${ ''.padEnd( 16 ) }`
			+ `auto workers: ${ autoPlan.workers }`
			+ `, checksum: ${ formatNumberValue( baselineChecksum ) }`
			+ `, max diff: ${ formatNumberValue( maxDiff ) }`
		);

	}

	console.log( '' );

}

function workerHeader() {

	return uniqueWorkerCounts
		.map( workers => padLeft( `async x${ workers }`, 16 ) )
		.join( '' );

};

async function measure( fn, expected ) {

	let lastResult;

	for ( let i = 0; i < warmup; i ++ ) {

		lastResult = await fn();

	}

	const times = [];

	for ( let i = 0; i < repeats; i ++ ) {

		const start = performance.now();

		lastResult = await fn();

		const end = performance.now();

		times.push( end - start );

	}

	consume( lastResult );
	verify( lastResult, expected );

	times.sort( ( a, b ) => a - b );

	return times[ Math.floor( times.length / 2 ) ];

};

function verify( actual, expected ) {

	if ( !validate ) return;
	if ( actual.length !== expected.length ) {

		throw new Error( `Expected ${ expected.length } values but received ${ actual.length }.` );

	}

	for ( let i = 0; i < expected.length; i ++ ) {

		const diff = Math.abs( actual[ i ] - expected[ i ] );

		if ( diff > maxDiff ) maxDiff = diff;
		if ( diff > EPSILON ) {

			throw new Error( `Benchmark validation failed at index ${ i }: expected ${ expected[ i ] }, received ${ actual[ i ] }.` );

		}

	}

};

function consume( values ) {

	if ( !values || values.length === 0 ) return;

	checksum += values[ 0 ] + values[ values.length - 1 ];

	if ( checksum === Number.POSITIVE_INFINITY ) console.log( checksum );

};

function getChecksum( values ) {

	let output = 0;

	for ( let i = 0; i < values.length; i ++ ) {

		output += values[ i ] * ((i % 97) + 1);

	}

	return output;

};

function createLinearCase() {

	return {
		name: 'Linear',
		variables: 1,
		max: 1,
		evaluator: new Linear(
			new Float64Array([ 0, 1 ]),
			new Float64Array([ 0, 10 ])
		)
	};

};

function createBilinearCase() {

	return {
		name: 'Bilinear',
		variables: 2,
		max: 1,
		evaluator: new Bilinear(
			new Float64Array([ 0, 0, 1, 1 ]),
			new Float64Array([ 0, 1, 2, 3 ])
		)
	};

};

function createBicubicCase() {

	return {
		name: 'Bicubic',
		variables: 2,
		max: 3,
		evaluator: new Bicubic(
			new Float64Array([ 0, 0, 1, 1, 2, 2, 3, 3 ]),
			createSequence( 16 )
		)
	};

};

function createTricubicCase() {

	return {
		name: 'Tricubic',
		variables: 3,
		max: 3,
		evaluator: new Tricubic(
			new Float64Array([ 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3 ]),
			createSequence( 64 )
		)
	};

};

function createMulticubicCase() {

	return {
		name: 'Multicubic',
		variables: 3,
		max: 3,
		evaluator: new Multicubic(
			new Float64Array([ 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3 ]),
			createSequence( 64 )
		)
	};

};

function createMultipolynomialCase() {

	return {
		name: 'Multipoly',
		variables: 3,
		max: 4,
		evaluator: new Multipolynomial(
			new Float64Array([ 0,0,0, 1,1,1, 2,2,2, 3,3,3, 4,4,4 ]),
			createSequence( 125 ),
			1,
			4,
			3
		)
	};

};

function getPlan( evaluator, sampleCount, options, maxWorkers ) {

	if ( evaluator.constructor.degree !== undefined && evaluator.constructor.variables !== undefined ) {

		return getParallelPlan( evaluator, sampleCount, options, maxWorkers );

	}

	return getTensorPolynomialParallelPlan( evaluator, sampleCount, options, maxWorkers );

};

function createSequence( length ) {

	const values = new Float64Array( length );

	for ( let i = 0; i < length; i ++ ) values[ i ] = i;

	return values;

};

function createSamplePositions( samples, variables, max ) {

	const positions = new Float64Array( samples * variables );

	for ( let i = 0; i < samples; i ++ ) {

		for ( let j = 0; j < variables; j ++ ) {

			positions[ i * variables + j ] = ((i * (j + 3)) % 997) / 997 * max;

		}

	}

	return positions;

};

function parseNumberList( value, fallback ) {

	if ( !value ) return fallback;

	const parsed = value
		.split( ',' )
		.map( item => Number.parseInt( item.trim(), 10 ) )
		.filter( item => Number.isInteger( item ) && item > 0 );

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
