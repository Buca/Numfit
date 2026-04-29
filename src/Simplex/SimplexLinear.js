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

const EPSILON = 1e-12;

export class SimplexLinear {

	static inferVariables( positions ) {

		validateArrayLike( positions, 'positions' );

		const variables = (Math.sqrt( 1 + 4 * positions.length ) - 1) / 2;

		if ( !Number.isInteger( variables ) || variables < 1 ) {

			throw new RangeError(
				`SimplexLinear positions length must be n * (n + 1), received ${ positions.length }.` 
			);

		}

		return variables;

	};

	static validateInput( positions, values, dimension = 1, variables = this.inferVariables( positions ) ) {

		validateDimension( dimension );
		validateArrayLike( positions, 'positions' );
		validateArrayLike( values, 'values' );
		validateFiniteValues( positions, 'positions' );
		validateFiniteValues( values, 'values' );

		const expectedPositions = variables * (variables + 1);
		const expectedValues = (variables + 1) * dimension;

		if ( positions.length !== expectedPositions ) {

			throw new RangeError(
				`SimplexLinear expects ${ expectedPositions } position values for ${ variables } variables, received ${ positions.length }.` 
			);

		}

		if ( values.length !== expectedValues ) {

			throw new RangeError(
				`SimplexLinear expects ${ expectedValues } values for dimension ${ dimension }, received ${ values.length }.` 
			);

		}

	};

	static evaluate(

		positions, values, dimension = 1,
		position,
		output, outputOffset = 0,
		variables = this.inferVariables( positions )

	) {

		const simplex = new this( positions, values, dimension, variables );

		return simplex.evaluate( position, 0, output, outputOffset );

	};

	constructor(

		positions,
		values,
		dimension = 1,
		variables = this.constructor.inferVariables( positions )

	) {

		this.constructor.validateInput( positions, values, dimension, variables );

		this.positions = positions;
		this.values = values;
		this.dimension = dimension;
		this.variables = variables;
		this.transform = invertSimplexTransform( positions, variables );

	};

	evaluate(

		position, inputOffset = 0,
		output, outputOffset = 0

	) {

		validateSamplePosition( position, this.variables );

		const outputNotProvided = !output;

		if ( !output ) output = new this.values.constructor( this.dimension );

		const weights = this.getWeights( position, inputOffset );

		for ( let i = 0; i < this.dimension; i ++ ) {

			let value = weights[ 0 ] * this.values[ i ];

			for ( let vertex = 1; vertex <= this.variables; vertex ++ ) {

				value += weights[ vertex ] * this.values[ vertex * this.dimension + i ];

			}

			output[ outputOffset + i ] = value;

		}

		if ( outputNotProvided && this.dimension === 1 ) return output[ outputOffset ];
		else return output;

	};

	getWeights( position, inputOffset = 0, output = new this.positions.constructor( this.variables + 1 ) ) {

		const variables = this.variables;
		let sum = 0;

		for ( let edge = 0; edge < variables; edge ++ ) {

			let weight = 0;

			for ( let variable = 0; variable < variables; variable ++ ) {

				const p0 = this.positions[ variable ];
				const p = typeof position === 'number'
					? position
					: position[ inputOffset + variable ];

				weight += this.transform[ edge * variables + variable ] * (p - p0);

			}

			output[ edge + 1 ] = weight;
			sum += weight;

		}

		output[ 0 ] = 1 - sum;

		return output;

	};

	contains( position, epsilon = EPSILON ) {

		const weights = this.getWeights( position );

		for ( let i = 0; i < weights.length; i ++ ) {

			if ( weights[ i ] < -epsilon || weights[ i ] > 1 + epsilon ) return false;

		}

		return true;

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

export class TriangleLinear extends SimplexLinear {

	constructor( positions, values, dimension = 1 ) {

		super( positions, values, dimension, 2 );

	};

};

export class TetrahedralLinear extends SimplexLinear {

	constructor( positions, values, dimension = 1 ) {

		super( positions, values, dimension, 3 );

	};

};

function invertSimplexTransform( positions, variables ) {

	const width = variables * 2;
	const matrix = new Array( variables * width ).fill( 0 );

	for ( let row = 0; row < variables; row ++ ) {

		for ( let column = 0; column < variables; column ++ ) {

			matrix[ row * width + column ] = positions[ (column + 1) * variables + row ] - positions[ row ];

		}

		matrix[ row * width + variables + row ] = 1;

	}

	for ( let column = 0; column < variables; column ++ ) {

		let pivotRow = column;
		let pivotSize = Math.abs( matrix[ pivotRow * width + column ] );

		for ( let row = column + 1; row < variables; row ++ ) {

			const size = Math.abs( matrix[ row * width + column ] );

			if ( size > pivotSize ) {

				pivotRow = row;
				pivotSize = size;

			}

		}

		if ( pivotSize <= EPSILON ) {

			throw new RangeError( 'SimplexLinear positions must form a non-degenerate simplex.' );

		}

		if ( pivotRow !== column ) {

			for ( let i = 0; i < width; i ++ ) {

				const a = column * width + i;
				const b = pivotRow * width + i;
				const value = matrix[ a ];

				matrix[ a ] = matrix[ b ];
				matrix[ b ] = value;

			}

		}

		const pivot = matrix[ column * width + column ];

		for ( let i = 0; i < width; i ++ ) matrix[ column * width + i ] /= pivot;

		for ( let row = 0; row < variables; row ++ ) {

			if ( row === column ) continue;

			const factor = matrix[ row * width + column ];

			for ( let i = 0; i < width; i ++ ) {

				matrix[ row * width + i ] -= factor * matrix[ column * width + i ];

			}

		}

	}

	const output = new positions.constructor( variables * variables );

	for ( let row = 0; row < variables; row ++ ) {

		for ( let column = 0; column < variables; column ++ ) {

			output[ row * variables + column ] = matrix[ row * width + variables + column ];

		}

	}

	return output;

};

globalThis.SimplexLinear = SimplexLinear;
globalThis.TriangleLinear = TriangleLinear;
globalThis.TetrahedralLinear = TetrahedralLinear;
