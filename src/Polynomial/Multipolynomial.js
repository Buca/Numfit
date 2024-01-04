import Polynomial from './Polynomial.js';

export class Multipolynomial {

	static evaluate( positions, values, position ) {

		const dim = positions.length / 2;
		const v = [ ...values ];
		let index = 0;

		for ( let i = dim - 1; i >= 0; i -- ) {

			const p0 = positions[ index ];
			const p1 = positions[ index + dim ];

			const p = position[ index ];

			

			for ( let j = 0; j < 2**dim; j += 2 ) {

				v[ j/2 ] = Polynomial.evaluate( p0, p1, v[ j ], v[ j + 1 ], p );

			}

			index ++;

		}

		return v[ 0 ];

	};

};