import Evaluator from '../Evaluator.js';

export class Bilinear extends Evaluator {

	static degree = 1;
	static variables = 2;

	static coefficients(
	
		positions, values, dimension = 1,
		output, outputOffset = 0
	
	) {

		if ( !output ) output = values.constructor( dimension*4 );

		const x0 = positions[ 0 ];
		const y0 = positions[ 1 ];
		const x1 = positions[ 2 ];
		const y1 = positions[ 3 ];
		const inv = 1 / ((x1 - x0)*(y1 - y0));

		let index = 0;

		for ( let i = 0; i < dimension; i ++ ) {

			let k = i;

			const v00 = values[ k ];
			const v01 = values[ k += dimension ];
			const v10 = values[ k += dimension ];
			const v11 = values[ k += dimension ];

			output[ index ++ ] = (x1*y1*v00 - x1*y0*v10 - x0*y1*v01 + x0*y0*v11)*inv;
			output[ index ++ ] = (-y1*v00 + y0*v10 + y1*v01 - y0*v11)*inv;
			output[ index ++ ] = (-x1*v00 + x1*v10 + x0*v01 - x0*v11)*inv;
			output[ index ++ ] = (v00 - v10 - v01 + v11)*inv;

		}

		return output;
	
	};

	static evaluate( 

		positions, values, dimension = 1,
		position,
		output, outputOffset = 0

	) {

		if ( !output ) output = new values.constructor( dimension );

		const x = position[ 0 ];
		const y = position[ 1 ];

		const x0 = positions[ 0 ];
		const y0 = positions[ 1 ];
		const x1 = positions[ 2 ];
		const y1 = positions[ 3 ];

		const k0 = (x - x1)/(x0-x1);
		const k1 = (x - x0)/(x1-x0);
		const q0 = (y - y1)/(y0-y1);
		const q1 = (y - y0)/(y1-y0);

		let index = 0;

		for ( let i = 0; i < dimension; i ++ ) {

			const v00 = values[ index ++ ];
			const v10 = values[ index ++ ];
			const v01 = values[ index ++ ];
			const v11 = values[ index ++ ];

			const v0 = v00*k0 + v10*k1;
			const v1 = v01*k0 + v11*k1; 	

			output[ outputOffset + i ] = v0*q0 + v1*q1;

		}

		return output;
 
	};

	constructor( 

		positions = new Float32Array( 4 ), 
		values = new Float32Array( 4 ),
		dimension = 1

	) {

		super( positions, values, dimension );

	};

/*
	evaluate( 

		position, inputOffset = 0, 
		output, outputOffset = 0 

	) {

		if ( !output ) output = new this.values.constructor( this.dimension );

		const x = position[ inputOffset + 0 ];
		const y = position[ inputOffset + 1 ];

		for ( let i = 0; i < this.dimension; i ++ ) {

			const c00 = this.coefficients[ 4*i + 0 ];
			const c10 = this.coefficients[ 4*i + 1 ];
			const c01 = this.coefficients[ 4*i + 2 ];
			const c11 = this.coefficients[ 4*i + 3 ];

			output[ outputOffset + i ] = c00 + c10*x + c01*y + c11*x*y;

		}

		return output;

	};
*/

};

globalThis.Bilinear = Bilinear;

/*
const bilinear = new Bilinear([ 

	0, 0,
	1, 1

], [

	10, 11, 4,    1, 2, 3,
	11, 13,-2,    4, 4,66

],
	3

);

console.log( bilinear.evaluate([1,1]) );*/