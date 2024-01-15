import Evaluator from '../Evaluator.js';

function g( hX, r, hY ) {

	return 	(hX[ 0 ]*r[  0 ] + hX[ 1 ]*r[  1 ] + hX[ 2 ]*r[  2 ] + hX[ 3 ]*r[  3 ])*hY[ 0 ]
		+	(hX[ 0 ]*r[  4 ] + hX[ 1 ]*r[  5 ] + hX[ 2 ]*r[  6 ] + hX[ 3 ]*r[  7 ])*hY[ 1 ]
		+	(hX[ 0 ]*r[  8 ] + hX[ 1 ]*r[  9 ] + hX[ 2 ]*r[ 10 ] + hX[ 3 ]*r[ 11 ])*hY[ 2 ]
		+	(hX[ 0 ]*r[ 12 ] + hX[ 1 ]*r[ 13 ] + hX[ 2 ]*r[ 14 ] + hX[ 3 ]*r[ 15 ])*hY[ 3 ];

};

export class Bicubic extends Evaluator {

	static degree = 3;
	static variables = 2;

	static coefficients( 

		positions, values, dimension = 1,
		output, outputOffset = 0

	) {

		if ( !output ) output = new values.constructor( dimension*16 );

		const x0 = positions[ 0 ];
		const y0 = positions[ 1 ];
		const x1 = positions[ 2 ];
		const y1 = positions[ 3 ];
		const x2 = positions[ 4 ];
		const y2 = positions[ 5 ];
		const x3 = positions[ 6 ];
		const y3 = positions[ 7 ];

		const x01 = x0*x1;
		const x02 = x0*x2;
		const x03 = x0*x3;
		const x12 = x1*x2;
		const x13 = x1*x3;
		const x23 = x2*x3;

		const x012 = x01*x2;
		const x013 = x01*x3;
		const x023 = x02*x3;
		const x123 = x12*x3;

		const hX01 = x12 + x13 + x23;
		const hX11 = x02 + x03 + x23;
		const hX21 = x01 + x03 + x13;
		const hX31 = x01 + x02 + x12;

		const hX02 = x1 + x2 + x3;
		const hX12 = x0 + x2 + x3;
		const hX22 = x0 + x1 + x3;
		const hX32 = x0 + x1 + x2;

		const hX0 = [ -x123, -x023, -x013, -x012 ];
		const hX1 = [ hX01, hX11, hX21, hX31 ];
		const hX2 = [ -hX02, -hX12, -hX22, -hX32 ];
		const hX3 = [ 1, 1, 1, 1 ];

		const dX01 = x0 - x1;
		const dX02 = x0 - x2;
		const dX03 = x0 - x3;
		const dX12 = x1 - x2;
		const dX13 = x1 - x3;
		const dX23 = x2 - x3;

		const y01 = y0*y1;
		const y02 = y0*y2;
		const y03 = y0*y3;
		const y12 = y1*y2;
		const y13 = y1*y3;
		const y23 = y2*y3;

		const y012 = y01*y2;
		const y013 = y01*y3;
		const y023 = y02*y3;
		const y123 = y12*y3;

		const dY01 = y0 - y1;
		const dY02 = y0 - y2;
		const dY03 = y0 - y3;
		const dY12 = y1 - y2;
		const dY13 = y1 - y3;
		const dY23 = y2 - y3;

		const q0 = 1/(dX01*dX02*dX03);  // 0
		const q1 = -1/(dX01*dX12*dX13); // 1
		const q2 = 1/(dX02*dX12*dX23);  // 2
		const q3 = -1/(dX03*dX13*dX23); // 3

		const p0 = 1/(dY01*dY02*dY03);
		const p1 = -1/(dY01*dY12*dY13);
		const p2 = 1/(dY02*dY12*dY23);
		const p3 = -1/(dY03*dY13*dY23);

		const hY01 = y12 + y13 + y23;
		const hY11 = y02 + y03 + y23;
		const hY21 = y01 + y03 + y13;
		const hY31 = y01 + y02 + y12;

		const hY02 = y1 + y2 + y3;
		const hY12 = y0 + y2 + y3;
		const hY22 = y0 + y1 + y3;
		const hY32 = y0 + y1 + y2;

		const hY0 = [ -y123, -y023, -y013, -y012 ];
		const hY1 = [ hY01, hY11, hY21, hY31 ];
		const hY2 = [ -hY02, -hY12, -hY22, -hY32 ];
		const hY3 = hX3;

		const r = new Float32Array( 16 );

		const d = dimension;

		for ( let i = 0, j = 0; i < d; i ++ ) {

			let k = i;

			const v00 = values[ k ];
			const v10 = values[ k += d ];
			const v20 = values[ k += d ];
			const v30 = values[ k += d ];

			const v01 = values[ k += d ];
			const v11 = values[ k += d ];
			const v21 = values[ k += d ];
			const v31 = values[ k += d ];

			const v02 = values[ k += d ];
			const v12 = values[ k += d ];
			const v22 = values[ k += d ];
			const v32 = values[ k += d ];

			const v03 = values[ k += d ];
			const v13 = values[ k += d ];
			const v23 = values[ k += d ];
			const v33 = values[ k += d ];

			r[  0 ] = v00*q0*p0; r[  1 ] = v10*q1*p0; r[  2 ] = v20*q2*p0; r[  3 ] = v30*q3*p0;
			r[  4 ] = v01*q0*p1; r[  5 ] = v11*q1*p1; r[  6 ] = v21*q2*p1; r[  7 ] = v31*q3*p1;
			r[  8 ] = v02*q0*p2; r[  9 ] = v12*q1*p2; r[ 10 ] = v22*q2*p2; r[ 11 ] = v32*q3*p2;
			r[ 12 ] = v03*q0*p3; r[ 13 ] = v13*q1*p3; r[ 14 ] = v23*q2*p3; r[ 15 ] = v33*q3*p3;

			output[ outputOffset + j ++ ] = g( hX0, r, hY0 ); 
			output[ outputOffset + j ++ ] = g( hX1, r, hY0 );
			output[ outputOffset + j ++ ] = g( hX2, r, hY0 );
			output[ outputOffset + j ++ ] = g( hX3, r, hY0 );

			output[ outputOffset + j ++ ] = g( hX0, r, hY1 );
			output[ outputOffset + j ++ ] = g( hX1, r, hY1 );
			output[ outputOffset + j ++ ] = g( hX2, r, hY1 );
			output[ outputOffset + j ++ ] = g( hX3, r, hY1 );
			
			output[ outputOffset + j ++ ] = g( hX0, r, hY2 );
			output[ outputOffset + j ++ ] = g( hX1, r, hY2 );
			output[ outputOffset + j ++ ] = g( hX2, r, hY2 );
			output[ outputOffset + j ++ ] = g( hX3, r, hY2 );
			
			output[ outputOffset + j ++ ] = g( hX0, r, hY3 );
			output[ outputOffset + j ++ ] = g( hX1, r, hY3 );
			output[ outputOffset + j ++ ] = g( hX2, r, hY3 );
			output[ outputOffset + j ++ ] = g( hX3, r, hY3 );

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
		const x2 = positions[ 4 ];
		const y2 = positions[ 5 ];
		const x3 = positions[ 6 ];
		const y3 = positions[ 7 ];

		const dX0 = x - x0;
		const dX1 = x - x1;
		const dX2 = x - x2;
		const dX3 = x - x3;

		const dX01 = x0 - x1;
		const dX02 = x0 - x2;
		const dX03 = x0 - x3;
		const dX12 = x1 - x2;
		const dX13 = x1 - x3;
		const dX23 = x2 - x3;
		
		const dY0 = y - y0;
		const dY1 = y - y1;
		const dY2 = y - y2;
		const dY3 = y - y3;

		const dY01 = y0 - y1;
		const dY02 = y0 - y2;
		const dY03 = y0 - y3;
		const dY12 = y1 - y2;
		const dY13 = y1 - y3;
		const dY23 = y2 - y3;

		const dX123 = dX1*dX2*dX3/(dX01*dX02*dX03);
		const dX023 = -dX0*dX2*dX3/(dX01*dX12*dX13);
		const dX013 = dX0*dX1*dX3/(dX02*dX12*dX23);
		const dX012 = -dX0*dX1*dX2/(dX03*dX13*dX23);

		const dY123 = dY1*dY2*dY3/(dY01*dY02*dY03);
		const dY023 = -dY0*dY2*dY3/(dY01*dY12*dY13);
		const dY013 = dY0*dY1*dY3/(dY02*dY12*dY23);
		const dY012 = -dY0*dY1*dY2/(dY03*dY13*dY23);

		const d = dimension;

		for ( let i = 0; i < d; i ++ ) {

			let k = i;

			const v00 = values[ k ];
			const v10 = values[ k += d ];
			const v20 = values[ k += d ];
			const v30 = values[ k += d ];
			const v01 = values[ k += d ];
			const v11 = values[ k += d ];
			const v21 = values[ k += d ];
			const v31 = values[ k += d ];
			const v02 = values[ k += d ];
			const v12 = values[ k += d ];
			const v22 = values[ k += d ];
			const v32 = values[ k += d ];
			const v03 = values[ k += d ];
			const v13 = values[ k += d ];
			const v23 = values[ k += d ];
			const v33 = values[ k += d ];

			const v0 = v00*dX123 + v10*dX023 + v20*dX013 + v30*dX012;
			const v1 = v01*dX123 + v11*dX023 + v21*dX013 + v31*dX012;
			const v2 = v02*dX123 + v12*dX023 + v22*dX013 + v32*dX012;
			const v3 = v03*dX123 + v13*dX023 + v23*dX013 + v33*dX012;

			output[ outputOffset + i ] = v0*dY123 + v1*dY023 + v2*dY013 + v3*dY012;

		}

		if ( d === 1 ) return output[ outputOffset ];
		else return output;

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

		const dimension = this.dimension;

		if ( !output ) output = new this.values.constructor( dimension );

		const x = position[ 0 ];
		const y = position[ 1 ];

		for ( let i = 0, index = 0; i < dimension; i ++ ) {

			const c00 = this.coefficients[ index ++ ];
			const c10 = this.coefficients[ index ++ ];
			const c20 = this.coefficients[ index ++ ];
			const c30 = this.coefficients[ index ++ ];

			const c01 = this.coefficients[ index ++ ];
			const c11 = this.coefficients[ index ++ ];
			const c21 = this.coefficients[ index ++ ];
			const c31 = this.coefficients[ index ++ ];
			
			const c02 = this.coefficients[ index ++ ];
			const c12 = this.coefficients[ index ++ ];
			const c22 = this.coefficients[ index ++ ];
			const c32 = this.coefficients[ index ++ ];
			
			const c03 = this.coefficients[ index ++ ];
			const c13 = this.coefficients[ index ++ ];
			const c23 = this.coefficients[ index ++ ];
			const c33 = this.coefficients[ index ++ ];
			//   +      -         +         -
			output[ i ] =
				(c00 + c10*x + c20*x**2 + c30*x**3)			// +
			+	(c01 + c11*x + c21*x**2 + c31*x**3)*y 		// -
			+	(c02 + c12*x + c22*x**2 + c32*x**3)*y**2 	// +
			+	(c03 + c13*x + c23*x**2 + c33*x**3)*y**3;	// -

		}

		return output;

	}*/

};

globalThis.Bicubic = Bicubic;

/*
const bicubic = new Bicubic([ 

	0, 0,
	1, 1,
	2, 2,
	3, 3

], [

	10, 11,    2, 3,     1, -4,    0, 7,
	11, 13,	   4,66,    -4,  5,    7, 0,
	 3,  6,   -3, 3,     3, 11,    0, 7,
	66,  8,    1, 0,     6,  7,    9, 9

],
	2

);

console.log( bicubic.evaluate([2,3]) );*/