import Evaluator from '../Evaluator.js';

export class Cubic extends Evaluator {

	static degree = 3;
	static variables = 1;

	static evaluate( 
	
		positions, values, dimension = 1,
		position,
		output, outputOffset = 0

	) {

		if ( !output ) output = new values.constructor( dimension );

		const x = position[ 0 ];
		
		const x0 = positions[ 0 ];
		const x1 = positions[ 1 ];
		const x2 = positions[ 2 ];
		const x3 = positions[ 3 ];

		const d01 = x0 - x1;
		const d02 = x0 - x2;
		const d03 = x0 - x3;
		const d12 = x1 - x2;
		const d13 = x1 - x3;
		const d23 = x2 - x3;

		const d0 = x - x0;
		const d1 = x - x1;
		const d2 = x - x2;
		const d3 = x - x3;

		const r0 = d1*d2*d3/(d01*d02*d03);
		const r1 = d0*d2*d3/(d01*d12*d13);
		const r2 = d0*d1*d3/(d02*d12*d23);
		const r3 = d0*d1*d2/(d03*d13*d23);

		const d = dimension;

		for ( let i = 0; i < d; i ++ ) {

			let k = i; 

			const v0 = values[ k ];
			const v1 = values[ k += d ];
			const v2 = values[ k += d ];
			const v3 = values[ k += d ];

			output[ outputOffset + i ] = v0*r0 - v1*r1 + v2*r2 - v3*r3;

		}

		if ( d === 1 ) return output[ outputOffset ];
		else return output;

	};

	static coefficients( 
	
		positions, values, dimension = 1,
		output, outputOffset = 0
	
	) {

		if ( !output ) output = new values.constructor( 4*dimension );

		const x0 = positions[ 0 ];
		const x1 = positions[ 1 ];
		const x2 = positions[ 2 ];
		const x3 = positions[ 3 ];

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

		const k0 = 1/(x0**3 - (x01 + x02 + x03)*x0 + (x012 + x013 + x023) - x123);
		const k1 = 1/(x1**3 - (x01 + x12 + x13)*x1 + (x012 + x013 + x123) - x023);
		const k2 = 1/(x2**3 - (x02 + x12 + x23)*x2 + (x012 + x023 + x123) - x013);
		const k3 = 1/(x3**3 - (x03 + x13 + x23)*x3 + (x013 + x023 + x123) - x012);

		const d = dimension;

		for ( let i = 0, j = 0; i < dimension; i ++ ) {

			let k = i;

			const r0 = values[ k ]*k0;
			const r1 = values[ k += d ]*k1;
			const r2 = values[ k += d ]*k2;
			const r3 = values[ k += d ]*k3;

			const c0 = -(r0*x123 + r1*x023 + r2*x013 + r3*x012);
			const c1 = r0*(x12 + x13 + x23) + r1*(x02 + x03 + x23) + r2*(x01 + x03 + x13) + r3*(x01 + x02 + x12);
			const c2 = -(r0*(x1 + x2 + x3) + r1*(x0 + x2 + x3) + r2*(x0 + x1 + x3) + r3*(x0 + x1 + x2)); 
			const c3 = r0 + r1 + r2 + r3;

			output[ outputOffset + j ++ ] = c0;
			output[ outputOffset + j ++ ] = c1;
			output[ outputOffset + j ++ ] = c2;
			output[ outputOffset + j ++ ] = c3;

		}

		return output;

	};

	constructor( positions, values, dimension = 1 ) {

		super( positions, values, dimension );

	};

};

globalThis.Cubic = Cubic;

/*
const cubic = new Cubic( 
	[ 0, 1, 2, 3 ], 
	[ 10,4,1,   1,-4,1,   10,11,1,   33,111,1 ], 
	3
);

console.log( cubic.evaluate( [ 3 ] ) );*/
// console.log( linear.evaluate( [1.2] ) );
//console.log( linear.step( [0], [2], [.5] ) );