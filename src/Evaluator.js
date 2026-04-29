import {
	validateConstructorInput,
	validateSamplePosition,
	validateSamplePositions,
	validateSegmentInput,
	validateStepInput
} from './Validation.js';
import { mapInWorkers } from './Parallel.js';
import {
	adaptiveSample,
	gridSample,
	latinHypercubeSample,
	poissonDiskSample,
	randomSample,
	sliceSample,
	streamSample
} from './Samplers.js';

export default class Evaluator {

	static degree;
	static variables;

	static validateInput( positions, values, dimension = 1 ) {

		validateConstructorInput( this, positions, values, dimension );

	};

	constructor( 
	
		positions, values, dimension = 1
	
	) {

		validateConstructorInput( this.constructor, positions, values, dimension );

		this.positions = positions;
		this.values = values;
		this.dimension = dimension;
		this._parallelVersion = 0;
		
		const degree = this.constructor.degree;
		const variables = this.constructor.variables;
		const length = (degree + 1)**variables;
		const type = this.values.constructor;

		this.coefficients = new type( dimension*length ).fill( 0 );

		this.update();

	};

	get variables() {

		// Should be implemented in the extended class.

	};

	get degree() {

		// Should be implemented in the extended class.

	};	

	update() {

		validateConstructorInput( this.constructor, this.positions, this.values, this.dimension );

		this.coefficients = this.constructor.coefficients(
			this.positions,
			this.values,
			this.dimension,
			this.coefficients
		);
		this._parallelVersion ++;

		return this;

	};

	translate( offset ) {

		const variables = this.constructor.variables;
		const positions = this.positions;
		const length = positions.length;

		for ( let i = 0; i < length; i += variables ) {
			
			if ( variables === 1 && typeof offset === 'number' ) {

				positions[ i ] += offset;

			} else {				

				for ( let j = 0; j < variables; j ++ ) {

					positions[ i + j ] += offset[ j ];
				
				}

			}

		}

		return this;

	};

	scale( scale, orgin ) {

		const variables = this.constructor.variables;
		const positions = this.positions;
		const length = positions.length;

		for ( let i = 0; i < length; i += variables ) {

			if ( variables === 1 && typeof scale === 'number' && typeof orgin === 'number' ) {

				const x = positions[ i ];
				positions[ i ] = (x - orgin)*scale + orgin;

			} else {

				for ( let j = 0; j < variables; j ++ ) {

					const x = positions[ i + j ];
					const s = scale[ j ];
					const o = orgin[ j ];

					positions[ i + j ] = (x - o)*s + o;
				
				}

			}

		}

		return this;

	};

	evaluate(

		position, inputOffset = 0,
		output, outputOffset = 0
	
	) {

		const dimension = this.dimension;
		const degree = this.constructor.degree;
		const variables = this.constructor.variables;
		const d = degree + 1;

		const outputNotProvided = !output;

		validateSamplePosition( position, variables );

		if ( !output ) output = new this.values.constructor( dimension );

		const size = (degree + 1)**variables;

		for ( let i = 0; i < dimension; i ++ ) {

			output[ outputOffset + i ] = 0;

			for ( let j = 0; j < size; j ++ ) {

				const c = this.coefficients[ i*size + j ];
				let v = 1;

				for ( let k = 0; k < variables; k ++ ) {

					const exponent = Math.floor((j / d**k ) % d);

					if ( typeof position === 'number' ) {

						v *= position**exponent;

					} else {

						v *= position[ inputOffset + k ]**exponent;

					}

				}
				
				output[ outputOffset + i ] += c*v;

			}

		}

		if ( dimension === 1 ) return output[ outputOffset ];
		else return output;

	};
/*
	segment( start, end, amount, handler ) {

		// Assume start, end and amount is a vector.

		const dimension = this.dimension;
		const variables = this.constructor.variables;

		let length = 1;

		for ( let i = 0; i < variables; i ++ ) length *= amount[ i ];
		
		length *= dimension;

		const input = new start.constructor( variables );
		let output;

		if ( handler ) output = new this.values.constructor( dimension ).fill( 0 );
		else output = new this.values.constructor( length ).fill( 0 );

		for ( let i = 0; i < length; i += dimension ) {

			let product = 1;

			for ( let j = 0; j < variables; j ++ ) {
				
				const _start = typeof start === 'number' ? start : start[ j ];
				const _end = typeof end === 'number' ? end : end[ j ];
				const _amount = (typeof amount === 'number' ? amount : amount[ j ]);
				
				const size = (_end - _start)/_amount;
				const multiplier = Math.floor( i / (dimension*product) ) % _amount;

				input[ j ] = _start + multiplier*size;

				product *= _amount;

			}

			if ( handler ) handler( variables > 1 ? input : input[ 0 ], this.evaluate( input, 0, output, 0 ) );
			else this.evaluate( input, 0, output, i );

		}

		return handler ? this : output;

	}
*/
	step( 

		start, end, size, 
		handler 

	) {

		const dimension = this.dimension;
		const variables = this.constructor.variables;

		validateStepInput( start, end, size, variables );

		let sampleCount = 1;
		const amounts = new this.positions.constructor( variables );
		const sizes = new this.positions.constructor( variables );
		const starts = new this.positions.constructor( variables );

		for ( let i = 0; i < variables; i ++ ) {

			const _start = typeof start === 'number' ? start : start[ i ];
			const _end = typeof end === 'number' ? end : end[ i ];
			const _size = typeof size === 'number' ? size : size[ i ];

			starts[ i ] = _start;
			sizes[ i ] = _size;
			amounts[ i ] = Math.floor( Math.abs( _end - _start ) / _size ) + 1;
			sampleCount *= amounts[ i ];

		}

		const input = new this.positions.constructor( variables );
		let output;

		if ( handler ) output = new this.values.constructor( dimension ).fill( 0 );
		else output = new this.values.constructor( sampleCount * dimension ).fill( 0 );

		for ( let i = 0; i < sampleCount; i ++ ) {

			let product = 1;

			for ( let j = 0; j < variables; j ++ ) {

				const multiplier = Math.floor( i / product ) % amounts[ j ];

				input[ j ] = starts[ j ] + multiplier*sizes[ j ];
				product *= amounts[ j ];

			}

			if ( handler ) handler( variables > 1 ? input : input[ 0 ], this.evaluate( input, 0, output, 0 ) );
			else this.evaluate( input, 0, output, i * dimension );

		}

		return handler ? this : output;

	};

	segment( 

		start, end, amount, 
		handler 

	) {

		const variables = this.constructor.variables;
		const size = new this.positions.constructor( variables );

		validateSegmentInput( start, end, amount, variables );

		for ( let i = 0; i < variables; i ++ ) {

			const _start = typeof start === 'number' ? start : start[ i ];
			const _end = typeof end === 'number' ? end : end[ i ];
			const _amount = typeof amount === 'number' ? amount : amount[ i ];

			size[ i ] = (_end - _start)/(_amount-1);

		}

		return this.step( start, end, size, handler );

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

	map( 

		positions, 
		handler 

	) {

		const variables = this.constructor.variables;
		const dimension = this.dimension;

		validateSamplePositions( positions, variables );

		const sampleCount = positions.length / variables;

		const input = new this.positions.constructor( variables );
		let output;

		if ( handler ) {

			output = new this.values.constructor( dimension );

		} else output = new this.values.constructor( sampleCount * dimension ).fill( 0 );

		for ( let i = 0, index = 0; i < positions.length; i += variables, index ++ ) {

			for ( let j = 0; j < variables; j ++ ) {

				input[ j ] = positions[ i + j ];
			}

			if ( handler ) {

				handler( variables > 1 ? input : input[ 0 ], this.evaluate( input, 0, output, 0 ) );
			
			} else this.evaluate( input, 0, output, index * dimension );

		}

		return handler ? this : output;

	};

	mapAsync(

		positions,
		options

	) {

		return mapInWorkers( this, positions, options );


	};

};
