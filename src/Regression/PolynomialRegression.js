import {
	validateArrayLike,
	validateDimension,
	validateFiniteValues,
	validateSamplePosition,
	validateSamplePositions
} from '../Validation.js';
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
	computeCooksDistance,
	computeLeverage,
	computeStudentizedResiduals,
	influence,
	informationCriterion,
	meanAbsoluteError,
	residualSumOfSquares,
	totalSumOfSquares
} from './diagnostics.js';
import {
	applyNormalization,
	createNormalization,
	normalizePosition,
	validateNormalizationMode
} from './normalization.js';
import {
	createExponents,
	evaluateBasis,
	solveLinearSystem
} from './linearAlgebra.js';
import {
	createBaseWeights,
	validateWeights
} from './utils.js';

export class PolynomialRegression {

	constructor( options = {} ) {

		const {
			positions,
			values,
			dimension = 1,
			variables = 1,
			degree = 1,
			regularization = 0,
			weights,
			robust = false,
			delta = 1,
			maxIterations = 20,
			tolerance = 1e-6,
			normalize = false
		} = options;

		validateInput( positions, values, dimension, variables, degree, regularization, weights, robust, delta, maxIterations, tolerance, normalize );

		this.positions = positions;
		this.values = values;
		this.dimension = dimension;
		this.variables = variables;
		this.degree = degree;
		this.regularization = regularization;
		this.weights = weights;
		this.robust = robust;
		this.delta = delta;
		this.maxIterations = maxIterations;
		this.tolerance = tolerance;
		this.normalize = normalize;
		this.normalization = createNormalization( positions, variables, normalize );
		this.fitPositions = applyNormalization( positions, variables, this.normalization );
		this.exponents = createExponents( variables, degree );
		this.iterations = 0;
		this.coefficients = solveCoefficients( this );

	}

	evaluate( position, inputOffset = 0, output, outputOffset = 0 ) {

		validateSamplePosition( position, this.variables );

		const outputNotProvided = !output;

		if ( !output ) output = new this.values.constructor( this.dimension );

		const normalized = normalizePosition( this, position, inputOffset );

		for ( let component = 0; component < this.dimension; component ++ ) output[ outputOffset + component ] = 0;

		for ( let term = 0; term < this.exponents.length; term ++ ) {

			const basis = evaluateBasis( normalized, 0, this.exponents[ term ], this.variables );

			for ( let component = 0; component < this.dimension; component ++ ) output[ outputOffset + component ] += this.coefficients[ component * this.exponents.length + term ] * basis;

		}

		if ( outputNotProvided && this.dimension === 1 ) return output[ outputOffset ];
		return output;

	}

	predict( position, inputOffset = 0, output, outputOffset = 0 ) {

		return this.evaluate( position, inputOffset, output, outputOffset );

	}

	map( positions, handler ) {

		validateSamplePositions( positions, this.variables );

		const sampleCount = positions.length / this.variables;
		const input = new this.positions.constructor( this.variables );
		let output;

		if ( handler ) output = new this.values.constructor( this.dimension );
		else output = new this.values.constructor( sampleCount * this.dimension );

		for ( let i = 0, index = 0; i < positions.length; i += this.variables, index ++ ) {

			for ( let j = 0; j < this.variables; j ++ ) input[ j ] = positions[ i + j ];

			if ( handler ) handler( this.variables > 1 ? input : input[ 0 ], this.evaluate( input, 0, output, 0 ) );
			else this.evaluate( input, 0, output, index * this.dimension );

		}

		return handler ? this : output;

	}

	mapAsync( positions, options ) {

		return Promise.resolve( this.map( positions, options?.handler ) );

	}

	residuals( positions = this.positions, values = this.values ) {

		validateSamplePositions( positions, this.variables );
		validateArrayLike( values, 'values' );
		validateFiniteValues( values, 'values' );

		const predicted = this.map( positions );
		const output = new this.values.constructor( predicted.length );

		if ( values.length !== predicted.length ) throw new RangeError( `values length must be ${ predicted.length }.` );

		for ( let i = 0; i < predicted.length; i ++ ) output[ i ] = values[ i ] - predicted[ i ];

		return output;

	}

	mse( positions = this.positions, values = this.values ) {

		return this.rss( positions, values ) / values.length;

	}

	rmse( positions = this.positions, values = this.values ) {

		return Math.sqrt( this.mse( positions, values ) );

	}

	mae( positions = this.positions, values = this.values ) {

		return meanAbsoluteError( this, positions, values );

	}

	rss( positions = this.positions, values = this.values ) {

		return residualSumOfSquares( this, positions, values );

	}

	tss( positions = this.positions, values = this.values ) {

		return totalSumOfSquares( this, positions, values );

	}

	aic( positions = this.positions, values = this.values ) {

		return informationCriterion( this.rss( positions, values ), values.length, this.coefficients.length, 2 );

	}

	bic( positions = this.positions, values = this.values ) {

		return informationCriterion( this.rss( positions, values ), values.length, this.coefficients.length, Math.log( values.length ) );

	}

	leverage( positions = this.positions ) {

		return computeLeverage( this, positions );

	}

	studentizedResiduals( positions = this.positions, values = this.values ) {

		return computeStudentizedResiduals( this, positions, values );

	}

	cooksDistance( positions = this.positions, values = this.values ) {

		return computeCooksDistance( this, positions, values );

	}

	r2( positions = this.positions, values = this.values ) {

		const residualSum = this.rss( positions, values );
		const totalSum = this.tss( positions, values );

		return totalSum === 0 ? 1 : 1 - residualSum / totalSum;

	}

	score( positions = this.positions, values = this.values ) {

		return this.r2( positions, values );

	}

	summary( positions = this.positions, values = this.values ) {

		return {
			model: this.constructor.name,
			samples: positions.length / this.variables,
			variables: this.variables,
			dimension: this.dimension,
			degree: this.degree,
			regularization: this.regularization,
			robust: this.robust,
			normalize: this.normalize,
			iterations: this.iterations,
			coefficients: Array.from( this.coefficients ),
			rss: this.rss( positions, values ),
			tss: this.tss( positions, values ),
			mse: this.mse( positions, values ),
			rmse: this.rmse( positions, values ),
			mae: this.mae( positions, values ),
			r2: this.r2( positions, values ),
			aic: this.aic( positions, values ),
			bic: this.bic( positions, values )
		};

	}

	influence( positions = this.positions, values = this.values ) {

		return influence( this, positions, values );

	}

	grid( options, handler ) {

		return gridSample( this, options, handler );

	}

	slice( options, handler ) {

		return sliceSample( this, options, handler );

	}

	random( count, options, handler ) {

		return randomSample( this, count, options, handler );

	}

	latinHypercube( count, options, handler ) {

		return latinHypercubeSample( this, count, options, handler );

	}

	poissonDisk( options, handler ) {

		return poissonDiskSample( this, options, handler );

	}

	adaptive( start, end, options ) {

		return adaptiveSample( this, start, end, options );

	}

	stream( options ) {

		return streamSample( this, options );

	}

}

export class LinearRegression extends PolynomialRegression {

	constructor( options = {} ) {

		super({
			...options,
			degree: 1
		});

	}

}

export class RidgeRegression extends PolynomialRegression {}

function validateInput( positions, values, dimension, variables, degree, regularization, weights, robust, delta, maxIterations, tolerance, normalize ) {

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );

	if ( !Number.isInteger( variables ) || variables < 1 ) throw new RangeError( 'variables must be a positive integer.' );
	if ( !Number.isInteger( degree ) || degree < 0 ) throw new RangeError( 'degree must be a non-negative integer.' );
	if ( typeof regularization !== 'number' || !Number.isFinite( regularization ) || regularization < 0 ) throw new RangeError( 'regularization must be a non-negative finite number.' );
	if ( positions.length % variables !== 0 ) throw new RangeError( `positions length must be divisible by ${ variables }.` );

	const sampleCount = positions.length / variables;

	if ( sampleCount < 1 ) throw new RangeError( 'PolynomialRegression requires at least one sample.' );
	if ( values.length !== sampleCount * dimension ) throw new RangeError( `PolynomialRegression expects ${ sampleCount * dimension } values for dimension ${ dimension }, received ${ values.length }.` );
	if ( weights !== undefined ) validateWeights( weights, sampleCount );
	if ( robust !== false && robust !== 'huber' ) throw new RangeError( "robust must be false or 'huber'." );
	if ( typeof delta !== 'number' || !Number.isFinite( delta ) || delta <= 0 ) throw new RangeError( 'delta must be a positive finite number.' );
	if ( !Number.isInteger( maxIterations ) || maxIterations < 1 ) throw new RangeError( 'maxIterations must be a positive integer.' );
	if ( typeof tolerance !== 'number' || !Number.isFinite( tolerance ) || tolerance < 0 ) throw new RangeError( 'tolerance must be a non-negative finite number.' );

	validateNormalizationMode( normalize );

}

function solveCoefficients( regression ) {

	const sampleCount = regression.positions.length / regression.variables;
	const baseWeights = createBaseWeights( regression.weights, sampleCount );

	if ( regression.robust === 'huber' ) return solveHuberCoefficients( regression, baseWeights );

	regression.iterations = 1;
	return solveWeightedCoefficients( regression, baseWeights );

}

function solveHuberCoefficients( regression, baseWeights ) {

	const sampleCount = regression.positions.length / regression.variables;
	const weights = baseWeights.slice();
	let coefficients = solveWeightedCoefficients( regression, weights );
	let previous = coefficients;

	for ( let iteration = 0; iteration < regression.maxIterations; iteration ++ ) {

		for ( let sample = 0; sample < sampleCount; sample ++ ) {

			const residual = sampleResidualNorm( regression, previous, sample );
			const huberWeight = residual <= regression.delta ? 1 : regression.delta / residual;

			weights[ sample ] = baseWeights[ sample ] * huberWeight;

		}

		coefficients = solveWeightedCoefficients( regression, weights );
		regression.iterations = iteration + 1;

		if ( coefficientDelta( previous, coefficients ) <= regression.tolerance ) return coefficients;

		previous = coefficients;

	}

	return coefficients;

}

function solveWeightedCoefficients( regression, weights ) {

	const sampleCount = regression.positions.length / regression.variables;
	const termCount = regression.exponents.length;
	const matrix = new Array( termCount ).fill( 0 ).map( () => new Array( termCount ).fill( 0 ) );
	const rhs = new Array( termCount ).fill( 0 );
	const coefficients = new regression.values.constructor( termCount * regression.dimension ).fill( 0 );

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		const basis = regression.exponents.map( exponent => evaluateBasis(
			regression.fitPositions,
			sample * regression.variables,
			exponent,
			regression.variables
		) );
		const weight = weights[ sample ];

		for ( let row = 0; row < termCount; row ++ ) {

			for ( let column = 0; column < termCount; column ++ ) matrix[ row ][ column ] += weight * basis[ row ] * basis[ column ];

		}

		for ( let component = 0; component < regression.dimension; component ++ ) {

			const value = regression.values[ sample * regression.dimension + component ];

			for ( let row = 0; row < termCount; row ++ ) coefficients[ component * termCount + row ] += weight * basis[ row ] * value;

		}

	}

	for ( let i = 0; i < termCount; i ++ ) matrix[ i ][ i ] += regression.regularization;

	for ( let component = 0; component < regression.dimension; component ++ ) {

		for ( let i = 0; i < termCount; i ++ ) rhs[ i ] = coefficients[ component * termCount + i ];

		const solved = solveLinearSystem( matrix, rhs );

		for ( let i = 0; i < termCount; i ++ ) coefficients[ component * termCount + i ] = solved[ i ];

	}

	return coefficients;

}

function sampleResidualNorm( regression, coefficients, sample ) {

	const termCount = regression.exponents.length;
	let sum = 0;

	for ( let component = 0; component < regression.dimension; component ++ ) {

		let predicted = 0;

		for ( let term = 0; term < termCount; term ++ ) {

			const basis = evaluateBasis(
				regression.fitPositions,
				sample * regression.variables,
				regression.exponents[ term ],
				regression.variables
			);

			predicted += coefficients[ component * termCount + term ] * basis;

		}

		const residual = regression.values[ sample * regression.dimension + component ] - predicted;

		sum += residual * residual;

	}

	return Math.sqrt( sum );

}

function coefficientDelta( a, b ) {

	let max = 0;

	for ( let i = 0; i < a.length; i ++ ) {

		const scale = Math.max( 1, Math.abs( a[ i ] ), Math.abs( b[ i ] ) );
		const delta = Math.abs( a[ i ] - b[ i ] ) / scale;

		if ( delta > max ) max = delta;

	}

	return max;

}

globalThis.PolynomialRegression = PolynomialRegression;
globalThis.LinearRegression = LinearRegression;
globalThis.RidgeRegression = RidgeRegression;
