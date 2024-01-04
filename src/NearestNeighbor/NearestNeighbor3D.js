import { scale3D, translate3D } from './Utilities.js';

export class NN3D {

	static evaluate( x0, y0, z0, x1, y1, z1, w000, w100, w010, w110, w001, w101, w011, w111, x, y, z ) {

		const dX0 = x0 - x;
		const dY0 = y0 - y;
		const dZ0 = z0 - y;
		const dX1 = x - x1;
		const dY1 = y - y1;
		const dZ1 = z - z1;

		if ( dX0 >= dX1 ) {
			if ( dY0 >= dY1 ) {
				if ( dZ0 >= dZ1 ) return w000;
				else return w100;
			} else {
				if ( dZ >= dZ1 ) return w010;
				else return w110;
			}
		} else {
			if ( dY0 >= dY1 ) {
				if ( dZ0 >= dZ1 ) return w001;
				else return w101;
			} else {
				if ( dZ0 >= dZ1 ) return w011;
				else return w111;
			}
		}

	};

	constructor( positions, weights ) {

		this.coordinates = coordinates;
		this.weights = weights;

	};

	translate( tX, tY, tZ ) {

		translate2D( this.positions, tX, tY, tZ );

		return this;

	};

	scale( sX, sY, sZ, anchorX, anchorY, anchorZ ) {

		scale2D( this.positions, sX, sY, sZ, anchorX, anchorY, anchorZ );

		return this;

	};

	evaluate( x, y ) {

		const x0 = this.positions[ 0 ];
		const y0 = this.positions[ 1 ];
		const z0 = this.positions[ 2 ];
		const x1 = this.positions[ 3 ];
		const y1 = this.positions[ 4 ];
		const z1 = this.positions[ 5 ];
		
		const w000 = this.weights[ 0 ];
		const w100 = this.weights[ 1 ];
		const w010 = this.weights[ 2 ];
		const w110 = this.weights[ 3 ];
		const w001 = this.weights[ 4 ];
		const w101 = this.weights[ 5 ];
		const w011 = this.weights[ 6 ];
		const w111 = this.weights[ 7 ];

		return NN2D.evaluate( 
			x0, y0, z0, 
			x1, y1, z1,
			w000, w100, w010, w110, 
			w001, w101, w011, w111, 
			x, y, z
		);

	};

	step( startX, startY, endX, endY, sizeX, sizeY ) {

		const resX = Math.floor( Math.abs( endX - startX ) / sizeX );
		const resY = Math.floor( Math.abs( endY - startY ) / sizeY );
		const resZ = Math.floor( Math.abs( endZ - startZ ) / sizeZ );

		const result = Array( resX * resY * resZ ).fill( 0 );

		let x = startX;
		let y = startY;
		let z = startZ;

		for ( let i = 0; i <= resX; i ++ ) {
			for ( let j = 0; j <= resY; j ++ ) {
				for ( let k = 0; k <= resZ; k ++ ) {

					result[ i*resX*resY + j*resY + k ] = this.evaluate( x, y, z );
					z += sizeX;

				}
				y += sizeY;
			}
			x += sizeX;
		}

		return result;

	};

	apply( positions ) {

		const size = positions.length/3;
		const result = Array( size ).fill( 0 );

		for ( let i = 0; i < size; i ++ ) {

			const x = this.positions[ 3*i + 0 ];
			const y = this.positions[ 3*i + 1 ];
			const z = this.positions[ 3*i + 2 ];

			result[ i ] = this.evaluate( x, y, z );

		}

		return result;

	};

};