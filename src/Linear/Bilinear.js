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

		const d = dimension;

		for ( let i = 0, index = 0; i < dimension; i ++ ) {

			let k = i;

			const v00 = values[ k ];
			const v01 = values[ k += dimension ];
			const v10 = values[ k += dimension ];
			const v11 = values[ k += dimension ];

			output[ outputOffset + index ++ ] = (x1*y1*v00 - x1*y0*v10 - x0*y1*v01 + x0*y0*v11)*inv;
			output[ outputOffset + index ++ ] = (-y1*v00 + y0*v10 + y1*v01 - y0*v11)*inv;
			output[ outputOffset + index ++ ] = (-x1*v00 + x1*v10 + x0*v01 - x0*v11)*inv;
			output[ outputOffset + index ++ ] = (v00 - v10 - v01 + v11)*inv;

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

		const d = dimension;

		for ( let i = 0, index = 0; i < dimension; i ++ ) {

			let k = i;

			const v00 = values[ k ];
			const v10 = values[ k += d ];
			const v01 = values[ k += d ];
			const v11 = values[ k += d ];

			const v0 = v00*k0 + v10*k1;
			const v1 = v01*k0 + v11*k1; 	

			output[ outputOffset + i ] = v0*q0 + v1*q1;

		}

		if ( dimension === 1 ) return output[ outputOffset ];
		else return output;
 
	};

	constructor( positions, values, dimension = 1 ) {

		super( positions, values, dimension );

	};
	/*
	step( start, end, size, handler ) {

		const variables = this.constructor.variables;
		const dimension = this.dimension;

		let length = 1;

		length *= Math.floor( (end[0]-start[0])/size[0] );
		length *= Math.floor( (end[1]-start[1])/size[1] );
		length *= dimension;

		const input = new this.positions.constructor( variables );
		const output = new this.values.constructor( length)

		for ( let y = start[1], j = 0; y <= end[1]; y += size[1] ) {
			for ( let x = start[0]; x <= end[0]; x += size[0] ) {

				input[0] = x;
				input[1] = y;

				this.evaluate( input, 0, output, j );

				j += dimension;

			}
		}

		return output;

	};*/

	/*
	segment( start, end, amount ) {

		const variables = this.constructor.variables;
		const dimension = this.dimension;

		let length = 1;

		length *= amount[0];
		length *= amount[1];
		length *= dimension;

		const sizeX = (end[0] - start[0])/(amount[0]-1);
		const sizeY = (end[1] - start[1])/(amount[1]-1);

		const input = new this.positions.constructor( variables );
		const output = new this.values.constructor( length)

		for ( let y = start[1], j = 0; y <= end[1]; y += sizeY ) {
			for ( let x = start[0]; x <= end[0]; x += sizeX ) {

				input[0] = x;
				input[1] = y;

				this.evaluate( input, 0, output, j );

				j += dimension;

			}
		}

		return output;

	};*/

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