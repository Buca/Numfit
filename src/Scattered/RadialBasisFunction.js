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

const DEFAULT_KERNEL = 'gaussian';
const DEFAULT_EPSILON = 1;

export class RadialBasisFunction {

	constructor(

		positionsOrOptions,
		values,
		dimension = 1,
		variables,
		options = {}

	) {

		const config = normalizeConstructorArguments( positionsOrOptions, values, dimension, variables, options );

		validateInput( config.positions, config.values, config.dimension, config.variables );
		validateOptions( config );

		this.positions = config.positions;
		this.values = config.values;
		this.dimension = config.dimension;
		this.variables = config.variables;
		this.kernel = config.kernel;
		this.epsilon = config.epsilon;
		this.smoothing = config.smoothing;
		const solution = solveWeights( this );
		this.weights = solution.weights;
		this.polynomial = solution.polynomial;

	};

	static evaluate( positionsOrOptions, valuesOrPosition, dimension = 1, variables, options = {}, position, output, outputOffset = 0 ) {

		if ( isOptionsObject( positionsOrOptions ) ) {

			const interpolator = new this( positionsOrOptions );

			return interpolator.evaluate( valuesOrPosition, 0, dimension, variables ?? 0 );

		}

		const interpolator = new this( positionsOrOptions, valuesOrPosition, dimension, variables, options );

		return interpolator.evaluate( position, 0, output, outputOffset );

	};

	evaluate(

		position, inputOffset = 0,
		output, outputOffset = 0

	) {

		validateSamplePosition( position, this.variables );

		const outputNotProvided = !output;

		if ( !output ) output = new this.values.constructor( this.dimension );

		const sampleCount = this.positions.length / this.variables;

		for ( let i = 0; i < this.dimension; i ++ ) output[ outputOffset + i ] = 0;

		for ( let sample = 0; sample < sampleCount; sample ++ ) {

			const value = evaluateKernel( this.kernel, this.getDistance( position, inputOffset, sample ), this.epsilon );

			for ( let component = 0; component < this.dimension; component ++ ) {

				output[ outputOffset + component ] += this.weights[ sample * this.dimension + component ] * value;

			}

		}

		if ( this.polynomial ) {

			for ( let component = 0; component < this.dimension; component ++ ) {

				let value = this.polynomial[ component * (this.variables + 1) ];

				for ( let variable = 0; variable < this.variables; variable ++ ) {

					value += this.polynomial[ component * (this.variables + 1) + variable + 1 ] * (
						typeof position === 'number' ? position : position[ inputOffset + variable ]
					);

				}

				output[ outputOffset + component ] += value;

			}

		}

		if ( outputNotProvided && this.dimension === 1 ) return output[ outputOffset ];
		else return output;

	};

	getDistance( position, inputOffset, sample ) {

		let distance = 0;

		for ( let variable = 0; variable < this.variables; variable ++ ) {

			const value = typeof position === 'number'
				? position
				: position[ inputOffset + variable ];
			const delta = value - this.positions[ sample * this.variables + variable ];

			distance += delta * delta;

		}

		return Math.sqrt( distance );

	};

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

	};

	mapAsync( positions, options ) {

		return Promise.resolve( this.map( positions, options?.handler ) );

	};

	grid( options, handler ) {

		return gridSample( this, options, handler );

	};

	slice( options, handler ) {

		return sliceSample( this, options, handler );

	};

	random( count, options, handler ) {

		return randomSample( this, count, options, handler );

	};

	latinHypercube( count, options, handler ) {

		return latinHypercubeSample( this, count, options, handler );

	};

	poissonDisk( options, handler ) {

		return poissonDiskSample( this, options, handler );

	};

	adaptive( start, end, options ) {

		return adaptiveSample( this, start, end, options );

	};

	stream( options ) {

		return streamSample( this, options );

	};

};

export const RBF = RadialBasisFunction;

function normalizeConstructorArguments( positionsOrOptions, values, dimension, variables, options ) {

	if ( isOptionsObject( positionsOrOptions ) ) {

		return {
			positions: positionsOrOptions.positions,
			values: positionsOrOptions.values,
			dimension: positionsOrOptions.dimension ?? 1,
			variables: positionsOrOptions.variables ?? inferVariables( positionsOrOptions.positions, positionsOrOptions.values, positionsOrOptions.dimension ?? 1 ),
			kernel: positionsOrOptions.kernel ?? DEFAULT_KERNEL,
			epsilon: positionsOrOptions.epsilon ?? DEFAULT_EPSILON,
			smoothing: positionsOrOptions.smoothing ?? 0
		};

	}

	return {
		positions: positionsOrOptions,
		values,
		dimension,
		variables: variables ?? inferVariables( positionsOrOptions, values, dimension ),
		kernel: options.kernel ?? DEFAULT_KERNEL,
		epsilon: options.epsilon ?? DEFAULT_EPSILON,
		smoothing: options.smoothing ?? 0
	};

}

function isOptionsObject( value ) {

	return value
		&& typeof value === 'object'
		&& !ArrayBuffer.isView( value )
		&& !Array.isArray( value )
		&& Object.prototype.hasOwnProperty.call( value, 'positions' );

}

function validateInput( positions, values, dimension, variables ) {

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );

	if ( !Number.isInteger( variables ) || variables < 1 ) throw new RangeError( 'variables must be a positive integer.' );
	if ( positions.length % variables !== 0 ) throw new RangeError( `positions length must be divisible by ${ variables }.` );

	const sampleCount = positions.length / variables;

	if ( sampleCount < 1 ) throw new RangeError( 'RadialBasisFunction requires at least one sample.' );
	if ( values.length !== sampleCount * dimension ) {

		throw new RangeError( `RadialBasisFunction expects ${ sampleCount * dimension } values for dimension ${ dimension }, received ${ values.length }.` );

	}

}

function validateOptions( options ) {

	if ( !isSupportedKernel( options.kernel ) ) throw new RangeError( `Unsupported RBF kernel "${ options.kernel }".` );
	if ( typeof options.epsilon !== 'number' || !Number.isFinite( options.epsilon ) || options.epsilon <= 0 ) {

		throw new RangeError( 'epsilon must be a positive finite number.' );

	}
	if ( typeof options.smoothing !== 'number' || !Number.isFinite( options.smoothing ) || options.smoothing < 0 ) {

		throw new RangeError( 'smoothing must be a non-negative finite number.' );

	}

}

function isSupportedKernel( kernel ) {

	return kernel === 'gaussian'
		|| kernel === 'multiquadric'
		|| kernel === 'inverse-multiquadric'
		|| kernel === 'linear'
		|| kernel === 'cubic'
		|| kernel === 'thin-plate';

}

function evaluateKernel( kernel, radius, epsilon ) {

	const scaled = epsilon * radius;

	if ( kernel === 'gaussian' ) return Math.exp( -(scaled * scaled) );
	if ( kernel === 'multiquadric' ) return Math.sqrt( 1 + scaled * scaled );
	if ( kernel === 'inverse-multiquadric' ) return 1 / Math.sqrt( 1 + scaled * scaled );
	if ( kernel === 'linear' ) return radius;
	if ( kernel === 'cubic' ) return radius * radius * radius;
	if ( radius === 0 ) return 0;

	return radius * radius * Math.log( radius );

}

function solveWeights( rbf ) {

	const sampleCount = rbf.positions.length / rbf.variables;
	const polynomialSize = needsPolynomialTail( rbf.kernel ) ? rbf.variables + 1 : 0;
	const matrix = createKernelMatrix( rbf, sampleCount, polynomialSize );
	const rhs = new Array( sampleCount + polynomialSize ).fill( 0 );
	const weights = new rbf.values.constructor( sampleCount * rbf.dimension );
	const polynomial = polynomialSize > 0
		? new rbf.values.constructor( polynomialSize * rbf.dimension )
		: null;

	for ( let component = 0; component < rbf.dimension; component ++ ) {

		for ( let sample = 0; sample < sampleCount; sample ++ ) rhs[ sample ] = rbf.values[ sample * rbf.dimension + component ];

		const solved = solveLinearSystem( matrix, rhs );

		for ( let sample = 0; sample < sampleCount; sample ++ ) weights[ sample * rbf.dimension + component ] = solved[ sample ];
		for ( let term = 0; term < polynomialSize; term ++ ) polynomial[ component * polynomialSize + term ] = solved[ sampleCount + term ];

	}

	return { weights, polynomial };

}

function createKernelMatrix( rbf, sampleCount, polynomialSize ) {

	const size = sampleCount + polynomialSize;
	const matrix = new Array( size );

	for ( let row = 0; row < size; row ++ ) matrix[ row ] = new Array( size ).fill( 0 );

	for ( let row = 0; row < sampleCount; row ++ ) {

		for ( let column = 0; column < sampleCount; column ++ ) {

			const distance = getSampleDistance( rbf.positions, rbf.variables, row, column );

			matrix[ row ][ column ] = evaluateKernel( rbf.kernel, distance, rbf.epsilon );

		}

		matrix[ row ][ row ] += rbf.smoothing;

	}

	if ( polynomialSize > 0 ) {

		for ( let sample = 0; sample < sampleCount; sample ++ ) {

			matrix[ sample ][ sampleCount ] = 1;
			matrix[ sampleCount ][ sample ] = 1;

			for ( let variable = 0; variable < rbf.variables; variable ++ ) {

				const value = rbf.positions[ sample * rbf.variables + variable ];
				const term = sampleCount + variable + 1;

				matrix[ sample ][ term ] = value;
				matrix[ term ][ sample ] = value;

			}

		}

	}

	return matrix;

}

function needsPolynomialTail( kernel ) {

	return kernel === 'linear' || kernel === 'cubic' || kernel === 'thin-plate';

}

function solveLinearSystem( matrix, rhs ) {

	const size = matrix.length;
	const a = matrix.map( row => row.slice() );
	const b = rhs.slice();

	for ( let column = 0; column < size; column ++ ) {

		let pivot = column;
		let pivotValue = Math.abs( a[ column ][ column ] );

		for ( let row = column + 1; row < size; row ++ ) {

			const value = Math.abs( a[ row ][ column ] );

			if ( value > pivotValue ) {

				pivot = row;
				pivotValue = value;

			}

		}

		if ( pivotValue === 0 ) throw new RangeError( 'RBF interpolation matrix is singular.' );

		if ( pivot !== column ) {

			const row = a[ column ];
			a[ column ] = a[ pivot ];
			a[ pivot ] = row;

			const value = b[ column ];
			b[ column ] = b[ pivot ];
			b[ pivot ] = value;

		}

		for ( let row = column + 1; row < size; row ++ ) {

			const factor = a[ row ][ column ] / a[ column ][ column ];

			if ( factor === 0 ) continue;

			a[ row ][ column ] = 0;

			for ( let item = column + 1; item < size; item ++ ) a[ row ][ item ] -= factor * a[ column ][ item ];

			b[ row ] -= factor * b[ column ];

		}

	}

	const output = new Array( size );

	for ( let row = size - 1; row >= 0; row -- ) {

		let value = b[ row ];

		for ( let column = row + 1; column < size; column ++ ) value -= a[ row ][ column ] * output[ column ];

		output[ row ] = value / a[ row ][ row ];

	}

	return output;

}

function getSampleDistance( positions, variables, a, b ) {

	let distance = 0;

	for ( let variable = 0; variable < variables; variable ++ ) {

		const delta = positions[ a * variables + variable ] - positions[ b * variables + variable ];

		distance += delta * delta;

	}

	return Math.sqrt( distance );

}

function inferVariables( positions, values, dimension ) {

	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateDimension( dimension );

	const sampleCount = values.length / dimension;

	if ( !Number.isInteger( sampleCount ) || sampleCount < 1 ) throw new RangeError( 'Unable to infer variables from positions and values.' );

	const variables = positions.length / sampleCount;

	if ( !Number.isInteger( variables ) || variables < 1 ) throw new RangeError( 'Unable to infer variables from positions and values.' );

	return variables;

}

globalThis.RadialBasisFunction = RadialBasisFunction;
globalThis.RBF = RBF;
