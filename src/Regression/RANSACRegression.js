import { validateDimension, validateArrayLike, validateFiniteValues } from '../Validation.js';
import {
	adaptiveSample,
	gridSample,
	latinHypercubeSample,
	poissonDiskSample,
	randomSample,
	sliceSample,
	streamSample
} from '../Samplers.js';
import {
	LinearRegression,
	PolynomialRegression
} from './PolynomialRegression.js';
import { createExponents } from './linearAlgebra.js';
import {
	copySamples,
	copySampleWeights,
	createIndexArray,
	createRandom
} from './utils.js';

export class RANSACRegression {

	constructor( options = {} ) {

		const {
			model = PolynomialRegression,
			positions,
			values,
			dimension = 1,
			variables = 1,
			threshold = 1,
			iterations = 100,
			sampleSize,
			minInliers,
			refit = true,
			seed = 123456789,
			...modelOptions
		} = options;

		validateRANSACInput( model, positions, values, dimension, variables, threshold, iterations, sampleSize, minInliers, seed );

		this.modelType = model;
		this.positions = positions;
		this.values = values;
		this.dimension = dimension;
		this.variables = variables;
		this.threshold = threshold;
		this.iterations = iterations;
		this.seed = seed;
		this.refit = refit !== false;
		this.modelOptions = {
			...modelOptions,
			positions,
			values,
			dimension,
			variables
		};
		this.sampleSize = sampleSize ?? getMinimumSampleSize( model, this.modelOptions, variables );
		this.minInliers = minInliers ?? this.sampleSize;

		const sampleCount = positions.length / variables;
		const fit = fitRANSAC( this, sampleCount );

		this.bestModel = fit.model;
		this.inlierMask = fit.inlierMask;
		this.inliers = createIndexArray( fit.inliers );
		this.outliers = createIndexArray( fit.outliers );
		this.bestError = fit.error;
		this.coefficients = this.bestModel.coefficients;

	}

	evaluate( position, inputOffset = 0, output, outputOffset = 0 ) { return this.bestModel.evaluate( position, inputOffset, output, outputOffset ); }
	predict( position, inputOffset = 0, output, outputOffset = 0 ) { return this.evaluate( position, inputOffset, output, outputOffset ); }
	map( positions, handler ) { return this.bestModel.map( positions, handler ); }
	mapAsync( positions, options ) { return this.bestModel.mapAsync( positions, options ); }
	residuals( positions = this.positions, values = this.values ) { return this.bestModel.residuals( positions, values ); }
	mse( positions = this.positions, values = this.values ) { return this.bestModel.mse( positions, values ); }
	rmse( positions = this.positions, values = this.values ) { return this.bestModel.rmse( positions, values ); }
	mae( positions = this.positions, values = this.values ) { return this.bestModel.mae( positions, values ); }
	rss( positions = this.positions, values = this.values ) { return this.bestModel.rss( positions, values ); }
	tss( positions = this.positions, values = this.values ) { return this.bestModel.tss( positions, values ); }
	aic( positions = this.positions, values = this.values ) { return this.bestModel.aic( positions, values ); }
	bic( positions = this.positions, values = this.values ) { return this.bestModel.bic( positions, values ); }
	leverage( positions = this.positions ) { return this.bestModel.leverage( positions ); }
	studentizedResiduals( positions = this.positions, values = this.values ) { return this.bestModel.studentizedResiduals( positions, values ); }
	cooksDistance( positions = this.positions, values = this.values ) { return this.bestModel.cooksDistance( positions, values ); }
	r2( positions = this.positions, values = this.values ) { return this.bestModel.r2( positions, values ); }
	score( positions = this.positions, values = this.values ) { return this.bestModel.score( positions, values ); }
	influence( positions = this.positions, values = this.values ) { return this.bestModel.influence( positions, values ); }

	summary( positions = this.positions, values = this.values ) {

		const summary = this.bestModel.summary( positions, values );

		return {
			...summary,
			model: this.constructor.name,
			baseModel: this.bestModel.constructor.name,
			inliers: this.inliers.length,
			outliers: this.outliers.length,
			bestError: this.bestError
		};

	}

	grid( options, handler ) { return gridSample( this, options, handler ); }
	slice( options, handler ) { return sliceSample( this, options, handler ); }
	random( count, options, handler ) { return randomSample( this, count, options, handler ); }
	latinHypercube( count, options, handler ) { return latinHypercubeSample( this, count, options, handler ); }
	poissonDisk( options, handler ) { return poissonDiskSample( this, options, handler ); }
	adaptive( start, end, options ) { return adaptiveSample( this, start, end, options ); }
	stream( options ) { return streamSample( this, options ); }

}

function validateRANSACInput( model, positions, values, dimension, variables, threshold, iterations, sampleSize, minInliers, seed ) {

	if ( typeof model !== 'function' ) throw new TypeError( 'model must be a regression constructor.' );

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );

	if ( !Number.isInteger( variables ) || variables < 1 ) throw new RangeError( 'variables must be a positive integer.' );
	if ( positions.length % variables !== 0 ) throw new RangeError( `positions length must be divisible by ${ variables }.` );

	const sampleCount = positions.length / variables;

	if ( sampleCount < 1 ) throw new RangeError( 'RANSACRegression requires at least one sample.' );
	if ( values.length !== sampleCount * dimension ) throw new RangeError( `RANSACRegression expects ${ sampleCount * dimension } values for dimension ${ dimension }, received ${ values.length }.` );
	if ( typeof threshold !== 'number' || !Number.isFinite( threshold ) || threshold < 0 ) throw new RangeError( 'threshold must be a non-negative finite number.' );
	if ( !Number.isInteger( iterations ) || iterations < 1 ) throw new RangeError( 'iterations must be a positive integer.' );
	if ( sampleSize !== undefined && ( !Number.isInteger( sampleSize ) || sampleSize < 1 || sampleSize > sampleCount ) ) throw new RangeError( `sampleSize must be an integer from 1 to ${ sampleCount }.` );
	if ( minInliers !== undefined && ( !Number.isInteger( minInliers ) || minInliers < 1 || minInliers > sampleCount ) ) throw new RangeError( `minInliers must be an integer from 1 to ${ sampleCount }.` );
	if ( typeof seed !== 'number' || !Number.isFinite( seed ) ) throw new RangeError( 'seed must be a finite number.' );

}

function fitRANSAC( regression, sampleCount ) {

	if ( regression.sampleSize > sampleCount ) throw new RangeError( `sampleSize must be at most ${ sampleCount }.` );
	if ( regression.minInliers > sampleCount ) throw new RangeError( `minInliers must be at most ${ sampleCount }.` );

	let random = createRandom( regression.seed );
	let best = null;

	for ( let iteration = 0; iteration < regression.iterations; iteration ++ ) {

		const sampleIndices = drawSample( sampleCount, regression.sampleSize, random );
		let candidate;

		try {
			candidate = createModelFromIndices( regression, sampleIndices );
		} catch ( error ) {
			if ( error instanceof RangeError ) continue;
			throw error;
		}

		const scored = scoreRANSACModel( regression, candidate, sampleCount );

		if ( scored.inliers.length < regression.minInliers ) continue;
		if ( !best || scored.inliers.length > best.inliers.length || ( scored.inliers.length === best.inliers.length && scored.error < best.error ) ) best = scored;

	}

	if ( !best ) throw new RangeError( 'RANSACRegression could not find a model with enough inliers.' );

	if ( regression.refit && best.inliers.length >= regression.sampleSize ) {

		try {
			best.model = createModelFromIndices( regression, best.inliers );
			best = {
				...scoreRANSACModel( regression, best.model, sampleCount ),
				model: best.model
			};
		} catch ( error ) {
			if ( !( error instanceof RangeError ) ) throw error;
		}

	}

	return best;

}

function getMinimumSampleSize( model, options, variables ) {

	const degree = model === LinearRegression ? 1 : options.degree ?? 1;

	return createExponents( variables, degree ).length;

}

function createModelFromIndices( regression, indices ) {

	const positions = copySamples( regression.positions, indices, regression.variables );
	const values = copySamples( regression.values, indices, regression.dimension );
	const weights = regression.modelOptions.weights ? copySampleWeights( regression.modelOptions.weights, indices ) : undefined;
	const options = {
		...regression.modelOptions,
		positions,
		values,
		dimension: regression.dimension,
		variables: regression.variables
	};

	if ( weights ) options.weights = weights;

	return new regression.modelType( options );

}

function scoreRANSACModel( regression, model, sampleCount ) {

	const inliers = [];
	const outliers = [];
	const inlierMask = new Array( sampleCount ).fill( false );
	let error = 0;

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		const residual = modelResidualNorm( regression, model, sample );

		if ( residual <= regression.threshold ) {
			inliers.push( sample );
			inlierMask[ sample ] = true;
			error += residual * residual;
		} else {
			outliers.push( sample );
		}

	}

	return { model, inliers, outliers, inlierMask, error };

}

function modelResidualNorm( regression, model, sample ) {

	const output = regression.dimension === 1 ? undefined : new regression.values.constructor( regression.dimension );
	const prediction = model.evaluate(
		regression.variables === 1 ? regression.positions[ sample ] : regression.positions,
		sample * regression.variables,
		output,
		0
	);
	let sum = 0;

	for ( let component = 0; component < regression.dimension; component ++ ) {

		const predicted = regression.dimension === 1 ? prediction : prediction[ component ];
		const residual = regression.values[ sample * regression.dimension + component ] - predicted;

		sum += residual * residual;

	}

	return Math.sqrt( sum );

}

function drawSample( sampleCount, size, random ) {

	const indices = new Array( sampleCount );

	for ( let i = 0; i < sampleCount; i ++ ) indices[ i ] = i;

	for ( let i = 0; i < size; i ++ ) {

		const selected = i + Math.floor( random() * ( sampleCount - i ) );
		const value = indices[ i ];
		indices[ i ] = indices[ selected ];
		indices[ selected ] = value;

	}

	return indices.slice( 0, size );

}

globalThis.RANSACRegression = RANSACRegression;
