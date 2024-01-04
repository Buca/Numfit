import Evaluator from '../Evaluator.js';

export class Linear extends Evaluator {

	static degree = 1;
	static variables = 1;

	static coefficients( 

		positions, values, dimension = 1,
		output, outputOffset = 0

	) {

		if ( !output ) output = new values.constructor( dimension*2 );

		const p0 = positions[ 0 ];
		const p1 = positions[ 1 ];
		const dX = p1 - p0;

		for ( let i = 0, index = 0; i < dimension; i ++ ) {

			const v0 = values[ i ];
			const v1 = values[ i + dimension ];

			const c1 = (v1 - v0)/dX;
			const c0 = v0 - p0*c1;

			output[ outputOffset + index ++ ] = c0;
			output[ outputOffset + index ++ ] = c1;

		}

		return output;

	};

	static evaluate( 

		positions, values, dimension = 1, 
		position,
		output, outputOffset = 0

	) {

		if ( !output ) output = new values.constructor( dimension );

		const p0 = positions[ 0 ];
		const p1 = positions[ 1 ];
		const dX = p1 - p0;

		let index = 0;

		for ( let i = 0; i < dimension; i ++ ) {

			const v0 = values[ index ++ ];
			const v1 = values[ index ++ ];

			const c1 = (v1 - v0)/dX;
			const c0 = v0 - p0*c1;

			const x = position[ i ];

			output[ i + outputOffset ] = c1*x + c0;

		}

		return output;

	};

	constructor( 
	
		positions, 
		values,
		dimension = 1
	
	) {

		super( positions, values, dimension );

	};

	/*evaluate( 

		position, inputOffset = 0, 
		output, outputOffset = 0 

	) {

		const d = this.dimension;
		const coefficients = this.coefficients;

		if ( !output ) output = new this.values.constructor( d );

		const x = position[ inputOffset ];

		for ( let i = 0, index = 0; i < d; i ++ ) {

			const c0 = coefficients[ index ++ ];
			const c1 = coefficients[ index ++ ];

			output[ outputOffset + i ] = c0 + c1*x;

		}

		return output;

	}*/

};

globalThis.Linear = Linear;

/*
const positions = [ 0, 1 ];
const values = [ 2,-4, 6,8 ];
const dimension = 2;
const linear = new Linear( positions, values, dimension );

const position = [1];

console.log( linear.evaluate( [1] ) );*/