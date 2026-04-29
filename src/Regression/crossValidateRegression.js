import { validateArrayLike, validateDimension, validateFiniteValues } from '../Validation.js';
import {
	PolynomialRegression
} from './PolynomialRegression.js';
import {
	copySamples,
	copySampleWeights,
	createRandom
} from './utils.js';

export function crossValidateRegression( options = {} ) {

	const {
		model = PolynomialRegression,
		positions,
		values,
		dimension = 1,
		variables = 1,
		folds = 5,
		metric = 'mse',
		seed = 123456789,
		shuffle = true,
		...modelOptions
	} = options;

	validateCrossValidationInput( model, positions, values, dimension, variables, folds, metric, seed );

	const sampleCount = positions.length / variables;
	const candidates = expandOptionGrid( modelOptions );
	const foldIndices = createFolds( sampleCount, folds, seed, shuffle );
	const results = [];
	let best = null;

	for ( const candidate of candidates ) {

		const scores = [];

		for ( const fold of foldIndices ) {

			const trainIndices = [];
			const testIndices = fold;
			const testSet = new Set( testIndices );

			for ( let sample = 0; sample < sampleCount; sample ++ ) {
				if ( !testSet.has( sample ) ) trainIndices.push( sample );
			}

			const train = createSubset( positions, values, variables, dimension, trainIndices, candidate.weights );
			const test = createSubset( positions, values, variables, dimension, testIndices );
			const fitted = new model({
				...candidate,
				positions: train.positions,
				values: train.values,
				weights: train.weights,
				variables,
				dimension
			});

			scores.push( scoreModel( fitted, test.positions, test.values, metric ) );

		}

		const mean = meanValue( scores );
		const std = standardDeviation( scores, mean );
		const result = { options: candidate, scores, mean, std };

		results.push( result );

		if ( !best || isBetterScore( mean, best.mean, metric ) ) best = result;

	}

	const bestModel = new model({
		...best.options,
		positions,
		values,
		variables,
		dimension
	});

	return {
		bestModel,
		bestOptions: best.options,
		bestScore: best.mean,
		metric,
		folds,
		results
	};

}

function validateCrossValidationInput( model, positions, values, dimension, variables, folds, metric, seed ) {

	if ( typeof model !== 'function' ) throw new TypeError( 'model must be a regression constructor.' );

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );

	if ( !Number.isInteger( variables ) || variables < 1 ) throw new RangeError( 'variables must be a positive integer.' );
	if ( positions.length % variables !== 0 ) throw new RangeError( `positions length must be divisible by ${ variables }.` );

	const sampleCount = positions.length / variables;

	if ( sampleCount < 2 ) throw new RangeError( 'crossValidateRegression requires at least two samples.' );
	if ( values.length !== sampleCount * dimension ) throw new RangeError( `crossValidateRegression expects ${ sampleCount * dimension } values for dimension ${ dimension }, received ${ values.length }.` );
	if ( !Number.isInteger( folds ) || folds < 2 || folds > sampleCount ) throw new RangeError( `folds must be an integer from 2 to ${ sampleCount }.` );
	if ( metric !== 'mse' && metric !== 'rmse' && metric !== 'mae' && metric !== 'r2' ) throw new RangeError( "metric must be 'mse', 'rmse', 'mae', or 'r2'." );
	if ( typeof seed !== 'number' || !Number.isFinite( seed ) ) throw new RangeError( 'seed must be a finite number.' );

}

function expandOptionGrid( options ) {

	const entries = Object.entries( options );
	let candidates = [ {} ];

	for ( const [ key, value ] of entries ) {

		const values = isGridOption( key, value ) ? value : [ value ];
		const next = [];

		for ( const candidate of candidates ) {
			for ( const item of values ) next.push({ ...candidate, [ key ]: item });
		}

		candidates = next;

	}

	return candidates;

}

function isGridOption( key, value ) {

	if ( key === 'positions' || key === 'values' || key === 'weights' ) return false;

	return Array.isArray( value );

}

function createFolds( sampleCount, foldCount, seed, shuffle ) {

	const indices = new Array( sampleCount );

	for ( let i = 0; i < sampleCount; i ++ ) indices[ i ] = i;

	if ( shuffle ) {

		const random = createRandom( seed );

		for ( let i = sampleCount - 1; i > 0; i -- ) {

			const selected = Math.floor( random() * ( i + 1 ) );
			const value = indices[ i ];
			indices[ i ] = indices[ selected ];
			indices[ selected ] = value;

		}

	}

	const folds = [];

	for ( let fold = 0; fold < foldCount; fold ++ ) {
		const start = Math.floor( fold * sampleCount / foldCount );
		const end = Math.floor( ( fold + 1 ) * sampleCount / foldCount );
		folds.push( indices.slice( start, end ) );
	}

	return folds;

}

function createSubset( positions, values, variables, dimension, indices, weights ) {

	return {
		positions: copySamples( positions, indices, variables ),
		values: copySamples( values, indices, dimension ),
		weights: weights ? copySampleWeights( weights, indices ) : undefined
	};

}

function scoreModel( model, positions, values, metric ) {

	if ( metric === 'mse' ) return model.mse( positions, values );
	if ( metric === 'rmse' ) return Math.sqrt( model.mse( positions, values ) );
	if ( metric === 'r2' ) return model.r2( positions, values );

	const residuals = model.residuals( positions, values );
	let total = 0;

	for ( let i = 0; i < residuals.length; i ++ ) total += Math.abs( residuals[ i ] );

	return total / residuals.length;

}

function meanValue( values ) {

	let total = 0;

	for ( let i = 0; i < values.length; i ++ ) total += values[ i ];

	return total / values.length;

}

function standardDeviation( values, mean ) {

	let total = 0;

	for ( let i = 0; i < values.length; i ++ ) {
		const delta = values[ i ] - mean;
		total += delta * delta;
	}

	return Math.sqrt( total / values.length );

}

function isBetterScore( score, best, metric ) {

	if ( metric === 'r2' ) return score > best;

	return score < best;

}

globalThis.crossValidateRegression = crossValidateRegression;
