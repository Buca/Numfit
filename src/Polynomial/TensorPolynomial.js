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
import { mapTensorPolynomialInWorkers } from '../Parallel.js';

export class TensorPolynomial {

	constructor(

		positions,
		values,
		dimension = 1,
		degree = this.constructor.degree,
		variables = this.constructor.variables

	) {

		if ( !Number.isInteger( degree ) || degree < 1 ) {

			throw new RangeError( 'degree must be a positive integer.' );

		}

		if ( !Number.isInteger( variables ) || variables < 1 ) {

			throw new RangeError( 'variables must be a positive integer.' );

		}

		validateTensorInput( positions, values, dimension, degree, variables, this.constructor.name );

		this.positions = positions;
		this.values = values;
		this.dimension = dimension;
		this.degree = degree;
		this.variables = variables;
		this._parallelVersion = 0;

	};

	static evaluate(

		positions, values, dimension = 1,
		position,
		output, outputOffset = 0,
		degree = this.degree,
		variables = this.variables

	) {

		const polynomial = new this( positions, values, dimension, degree, variables );

		return polynomial.evaluate( position, 0, output, outputOffset );

	};

	evaluate(

		position, inputOffset = 0,
		output, outputOffset = 0

	) {

		validateSamplePosition( position, this.variables );

		const outputNotProvided = !output;

		if ( !output ) output = new this.values.constructor( this.dimension );

		const pointsPerAxis = this.degree + 1;
		const sampleCount = pointsPerAxis ** this.variables;
		const weights = createAxisWeights( this.positions, position, inputOffset, this.degree, this.variables );

		for ( let i = 0; i < this.dimension; i ++ ) output[ outputOffset + i ] = 0;

		for ( let sample = 0; sample < sampleCount; sample ++ ) {

			let weight = 1;
			let stride = 1;

			for ( let variable = 0; variable < this.variables; variable ++ ) {

				const point = Math.floor( sample / stride ) % pointsPerAxis;

				weight *= weights[ variable * pointsPerAxis + point ];
				stride *= pointsPerAxis;

			}

			for ( let i = 0; i < this.dimension; i ++ ) {

				output[ outputOffset + i ] += this.values[ sample * this.dimension + i ] * weight;

			}

		}

		if ( outputNotProvided && this.dimension === 1 ) return output[ outputOffset ];
		else return output;

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

			if ( handler ) {

				handler( this.variables > 1 ? input : input[ 0 ], this.evaluate( input, 0, output, 0 ) );

			} else {

				this.evaluate( input, 0, output, index * this.dimension );

			}

		}

		return handler ? this : output;

	};

	mapAsync( positions, options ) {

		return mapTensorPolynomialInWorkers( this, positions, options );

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

export class Polynomial extends TensorPolynomial {

	static variables = 1;

	constructor( positions, values, dimension = 1, degree = positions.length - 1 ) {

		super( positions, values, dimension, degree, 1 );

	};

};

export class Multipolynomial extends TensorPolynomial {

	constructor( positions, values, dimension = 1, degree, variables ) {

		super(
			positions,
			values,
			dimension,
			degree ?? inferDegree( positions, variables ?? inferVariables( positions, values, dimension ) ),
			variables ?? inferVariables( positions, values, dimension )
		);

	};

};

export class Multilinear extends TensorPolynomial {

	static degree = 1;

	constructor( positions, values, dimension = 1, variables = inferVariablesForDegree( positions, 1 ) ) {

		super( positions, values, dimension, 1, variables );

	};

};

export class Multiquadratic extends TensorPolynomial {

	static degree = 2;

	constructor( positions, values, dimension = 1, variables = inferVariablesForDegree( positions, 2 ) ) {

		super( positions, values, dimension, 2, variables );

	};

};

export class Multicubic extends TensorPolynomial {

	static degree = 3;

	constructor( positions, values, dimension = 1, variables = inferVariablesForDegree( positions, 3 ) ) {

		super( positions, values, dimension, 3, variables );

	};

};

function validateTensorInput( positions, values, dimension, degree, variables, name ) {

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );

	const pointsPerAxis = degree + 1;
	const expectedPositions = pointsPerAxis * variables;
	const expectedValues = (pointsPerAxis ** variables) * dimension;

	if ( positions.length !== expectedPositions ) {

		throw new RangeError( `${ name } expects ${ expectedPositions } position values, received ${ positions.length }.` );

	}

	if ( values.length !== expectedValues ) {

		throw new RangeError( `${ name } expects ${ expectedValues } values for dimension ${ dimension }, received ${ values.length }.` );

	}

	for ( let variable = 0; variable < variables; variable ++ ) {

		const seen = new Set();

		for ( let point = 0; point < pointsPerAxis; point ++ ) {

			const value = positions[ point * variables + variable ];

			if ( seen.has( value ) ) {

				throw new RangeError( `${ name } positions must be unique on every axis. Duplicate ${ value } on axis ${ variable }.` );

			}

			seen.add( value );

		}

	}

};

function createAxisWeights( positions, position, inputOffset, degree, variables ) {

	const pointsPerAxis = degree + 1;
	const weights = new positions.constructor( variables * pointsPerAxis );

	for ( let variable = 0; variable < variables; variable ++ ) {

		const value = typeof position === 'number' ? position : position[ inputOffset + variable ];

		for ( let point = 0; point < pointsPerAxis; point ++ ) {

			let weight = 1;
			const pointValue = positions[ point * variables + variable ];

			for ( let other = 0; other < pointsPerAxis; other ++ ) {

				if ( other === point ) continue;

				const otherValue = positions[ other * variables + variable ];

				weight *= (value - otherValue) / (pointValue - otherValue);

			}

			weights[ variable * pointsPerAxis + point ] = weight;

		}

	}

	return weights;

};

function inferVariablesForDegree( positions, degree ) {

	validateArrayLike( positions, 'positions' );

	const variables = positions.length / (degree + 1);

	if ( !Number.isInteger( variables ) || variables < 1 ) {

		throw new RangeError( `positions length must be divisible by ${ degree + 1 }.` );

	}

	return variables;

};

function inferVariables( positions, values, dimension ) {

	validateArrayLike( values, 'values' );
	validateDimension( dimension );

	for ( let variables = 1; variables <= positions.length; variables ++ ) {

		if ( positions.length % variables !== 0 ) continue;

		const pointsPerAxis = positions.length / variables;
		const samples = values.length / dimension;

		if ( Number.isInteger( pointsPerAxis ) && samples === pointsPerAxis ** variables ) return variables;

	}

	throw new RangeError( 'Unable to infer variables from positions and values.' );

};

function inferDegree( positions, variables ) {

	return positions.length / variables - 1;

};

globalThis.TensorPolynomial = TensorPolynomial;
globalThis.Polynomial = Polynomial;
globalThis.Multipolynomial = Multipolynomial;
globalThis.Multilinear = Multilinear;
globalThis.Multiquadratic = Multiquadratic;
globalThis.Multicubic = Multicubic;
