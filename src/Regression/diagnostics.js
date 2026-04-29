import {
	validateArrayLike,
	validateFiniteValues,
	validateSamplePositions
} from '../Validation.js';
import { applyNormalization } from './normalization.js';
import { createBaseWeights } from './utils.js';
import {
	evaluateBasis,
	solveLinearSystem
} from './linearAlgebra.js';

export function residualSumOfSquares( regression, positions = regression.positions, values = regression.values ) {

	const residuals = regression.residuals( positions, values );
	let total = 0;

	for ( let i = 0; i < residuals.length; i ++ ) total += residuals[ i ] * residuals[ i ];

	return total;

}

export function totalSumOfSquares( regression, positions = regression.positions, values = regression.values ) {

	validateSamplePositions( positions, regression.variables );
	validateArrayLike( values, 'values' );
	validateFiniteValues( values, 'values' );

	const sampleCount = positions.length / regression.variables;
	const means = new Array( regression.dimension ).fill( 0 );
	let total = 0;

	if ( values.length !== sampleCount * regression.dimension ) throw new RangeError( `values length must be ${ sampleCount * regression.dimension }.` );

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		for ( let component = 0; component < regression.dimension; component ++ ) {

			means[ component ] += values[ sample * regression.dimension + component ];

		}

	}

	for ( let component = 0; component < regression.dimension; component ++ ) means[ component ] /= sampleCount;

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		for ( let component = 0; component < regression.dimension; component ++ ) {

			const centered = values[ sample * regression.dimension + component ] - means[ component ];

			total += centered * centered;

		}

	}

	return total;

}

export function meanAbsoluteError( regression, positions = regression.positions, values = regression.values ) {

	const residuals = regression.residuals( positions, values );
	let total = 0;

	for ( let i = 0; i < residuals.length; i ++ ) total += Math.abs( residuals[ i ] );

	return total / residuals.length;

}

export function informationCriterion( rss, observations, parameters, penalty ) {

	if ( rss === 0 ) return Number.NEGATIVE_INFINITY;

	return observations * Math.log( rss / observations ) + penalty * parameters;

}

export function computeLeverage( regression, positions = regression.positions ) {

	validateSamplePositions( positions, regression.variables );

	const sampleCount = positions.length / regression.variables;
	const fitPositions = positions === regression.positions ? regression.fitPositions : applyNormalization( positions, regression.variables, regression.normalization );
	const termCount = regression.exponents.length;
	const matrix = createNormalMatrix( regression, regression.fitPositions, regression.positions.length / regression.variables );
	const output = new regression.values.constructor( sampleCount );

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		const basis = regression.exponents.map( exponent => evaluateBasis(
			fitPositions,
			sample * regression.variables,
			exponent,
			regression.variables
		) );
		const solved = solveLinearSystem( matrix, basis );
		const weight = fitPositions === regression.fitPositions && regression.weights ? regression.weights[ sample ] : 1;
		let leverage = 0;

		for ( let i = 0; i < termCount; i ++ ) leverage += basis[ i ] * solved[ i ];

		output[ sample ] = Math.max( 0, Math.min( 1, weight * leverage ) );

	}

	return output;

}

export function computeStudentizedResiduals( regression, positions = regression.positions, values = regression.values ) {

	validateSamplePositions( positions, regression.variables );
	validateArrayLike( values, 'values' );
	validateFiniteValues( values, 'values' );

	const sampleCount = positions.length / regression.variables;
	const residuals = regression.residuals( positions, values );
	const leverage = regression.leverage( positions );
	const output = new regression.values.constructor( residuals.length );
	const degrees = Math.max( 1, values.length - regression.coefficients.length );
	const variance = regression.rss( positions, values ) / degrees;
	const scale = variance <= 0 ? 0 : Math.sqrt( variance );

	if ( values.length !== sampleCount * regression.dimension ) throw new RangeError( `values length must be ${ sampleCount * regression.dimension }.` );

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		const denominator = scale * Math.sqrt( Math.max( Number.EPSILON, 1 - leverage[ sample ] ) );

		for ( let component = 0; component < regression.dimension; component ++ ) {

			const index = sample * regression.dimension + component;

			output[ index ] = denominator === 0 ? 0 : residuals[ index ] / denominator;

		}

	}

	return output;

}

export function computeCooksDistance( regression, positions = regression.positions, values = regression.values ) {

	validateSamplePositions( positions, regression.variables );
	validateArrayLike( values, 'values' );
	validateFiniteValues( values, 'values' );

	const sampleCount = positions.length / regression.variables;
	const residuals = regression.residuals( positions, values );
	const leverage = regression.leverage( positions );
	const output = new regression.values.constructor( sampleCount );
	const parameterCount = Math.max( 1, regression.exponents.length );
	const degrees = Math.max( 1, values.length - regression.coefficients.length );
	const variance = regression.rss( positions, values ) / degrees;

	if ( values.length !== sampleCount * regression.dimension ) throw new RangeError( `values length must be ${ sampleCount * regression.dimension }.` );

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		let residualSquared = 0;

		for ( let component = 0; component < regression.dimension; component ++ ) {

			const residual = residuals[ sample * regression.dimension + component ];

			residualSquared += residual * residual;

		}

		const oneMinusH = Math.max( Number.EPSILON, 1 - leverage[ sample ] );

		output[ sample ] = variance === 0 ? 0 : residualSquared * leverage[ sample ] / ( parameterCount * variance * oneMinusH * oneMinusH );

	}

	return output;

}

export function influence( regression, positions = regression.positions, values = regression.values ) {

	return {
		leverage: regression.leverage( positions ),
		studentizedResiduals: regression.studentizedResiduals( positions, values ),
		cooksDistance: regression.cooksDistance( positions, values )
	};

}

function createNormalMatrix( regression, positions, sampleCount ) {

	const termCount = regression.exponents.length;
	const matrix = new Array( termCount ).fill( 0 ).map( () => new Array( termCount ).fill( 0 ) );
	const weights = createBaseWeights( regression.weights, sampleCount );

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		const basis = regression.exponents.map( exponent => evaluateBasis(
			positions,
			sample * regression.variables,
			exponent,
			regression.variables
		) );
		const weight = weights[ sample ];

		for ( let row = 0; row < termCount; row ++ ) {

			for ( let column = 0; column < termCount; column ++ ) {

				matrix[ row ][ column ] += weight * basis[ row ] * basis[ column ];

			}

		}

	}

	for ( let i = 0; i < termCount; i ++ ) matrix[ i ][ i ] += regression.regularization;

	return matrix;

}
