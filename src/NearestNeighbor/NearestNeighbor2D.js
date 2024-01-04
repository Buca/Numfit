import { scale2D, translate2D } from './Utilities.js';

export class NN2D {

	static evaluate( x0, y0, x1, y1, w00, w10, w01, w11, x, y ) {

		const dX0 = x0 - x;
		const dY0 = y1 - y;
		const dX1 = x - x1;
		const dY1 = y - y1;

		if ( dX0 >= dX1 ) {

			if ( dY0 >= dY1 ) return w00;
			else return w10;
		
		} else {

			if ( dY0 >= dY1 ) return w01;
			else return w11;

		}		

	};

	constructor( positions, weights ) {

		this.coordinates = coordinates;
		this.weights = weights;

	};

	translate( tX, tY ) {

		translate2D( this.positions, tX, tY );

		return this;

	};

	scale( sX, sY, anchorX, anchorY ) {

		scale2D( this.positions, sX, sY, anchorX, anchorY );

		return this;

	};

	evaluate( x, y ) {

		const x0 = this.positions[ 0 ];
		const y0 = this.positions[ 1 ];
		const x1 = this.positions[ 2 ];
		const y1 = this.positions[ 3 ];
		
		const w00 = this.weights[ 0 ];
		const w10 = this.weights[ 1 ];
		const w01 = this.weights[ 2 ];
		const w11 = this.weights[ 3 ];

		return NN2D.evaluate(
			x0, y0,
			x1, y1,
			w00, w10,
			w10, w11,
			x, y
		);

	};

	step( startX, startY, endX, endY, sizeX, sizeY ) {

		const resX = Math.floor( Math.abs( endX - startX ) / sizeX );
		const resY = Math.floor( Math.abs( endY - startY ) / sizeY );

		const result = Array( resX * resY ).fill( 0 );

		let x = startX;
		let y = startY;

		for ( let i = 0; i <= resX; i ++ ) {

			for ( let j = 0; j <= resY; j ++ ) {
			
				result[ i*resX + j ] = this.evaluate( x, y );
				y += sizeY;

			}
			x += sizeX;
		}

		return result;

	};

	apply( positions ) {

		const size = positions.length/2;
		const result = Array( size ).fill( 0 );

		for ( let i = 0; i < size; i ++ ) {

			const x = this.positions[ 2*i + 0 ];
			const y = this.positions[ 2*i + 1 ];

			result[ i ] = this.evaluate( x, y );

		}

		return result;

	};

};