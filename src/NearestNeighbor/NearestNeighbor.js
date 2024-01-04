import { scale, translate } from './Utilities.js';

export class NearestNeighbor {

	static evaluate( x0, x1, w0, w1, x ) {

		const d0 = x0 - x;
		const d1 = x - x1;

		return d0 >= d1 ? w0 : w1;

	};

	constructor( positions, weights ) {

		this.coordinates = coordinates;
		this.weights = weights;

	};

	translate( t = 0 ) {

		translate( this.positions, t, update );

		return this;

	};

	scale( s = 1, anchor = 0 ) {

		scale( this.positions, s, anchor );

		return this;

	};

	evaluate( x ) {

		return NN.evaluate( 
		
			this.positions[ 0 ], this.positions[ 1 ], 
			this.weights[ 0 ], this.weights[ 1 ]
			x 

		);

	};

	step( start, end, size ) {

		const res = Math.floor( Math.abs( end - start ) / size );
		const result = Array( res ).fill( 0 );

		let x = start;

		for ( let i = 0; i <= res; i ++ ) {

			result[ i ] = this.evaluate( x );

			x += size;

		}

		return result;

	};

	apply( positions ) {

		const size = positions.length;
		const result = Array( size ).fill( 0 );

		for ( let i = 0; i < size; i ++ ) {

			const x = this.positions[ i ];

			result[ i ] = this.evaluate( x );

		}

		return result;

	};

};