// One dimensional data handlers:
export function scale( positions, s, anchor ) {

	for ( let i = 0; i < positions.length; i ++ ) {

		const x = positions[ i ]; 
		positions[ i ] = (x - anchor)*s + anchor;

	}

};

export function translate( positions, t ) {

	for ( let i = 0; i < positions.length; i ++ ) {

		positions[ i ] += t;

	}

};

export function evaluate( 

	coefficients, degree, dimension,
	x 

) {

	if ( dimension === 1 ) {

		let r = 0;
		let xp = 1;

		for ( let i = 0; i <= degree; i ++ ) {

			const c = coefficients[ i ];

			r += c * xp;
			xp *= x;

		}

		return r;

	} else {

		const result = new coefficients[ 0 ].constructor( 2 );

		for ( let i = 0; i < dimension; i ++ ) {

			const coefficients = coefficients[ i ];

			let r = 0;
			let xp = 1;

			for ( let i = 0; i <= degree; i ++ ) {

				const c = coefficients[ i ];

				r += c * xp;
				xp *= x;

			}

			result[ i ] = r;

		}

		return result;
	
	}

};

export function step( 

	coefficients, degree, dimension,
	start, 
	end, 
	size, 
	handler 

) {

	const res = Math.floor( Math.abs( end - start ) / size );
	let x = start;

	if ( !handler ) {

		const result = new coefficients.constructor( dimension * ( res + 1 ) );

		let index = 0;

		for ( let i = 0; i <= res; i ++ ) {

			const v = evaluate( coefficients, degree, dimension, x );

			if ( dimension > 1 ) {

				for ( let j = 0; j < dimension; j ++ ) {

					result[ index ++ ] = v[ j ];
				
				}

			} else result[ index ++ ] = v;

			x += size;

		}

		return result;

	} else {

		for ( let i = 0; i <= res; i ++ ) {

			const v = evaluate( coefficients, degree, dimension, x );

			if ( dimension > 1 ) handler( x, ...v );
			else handler( x, v );

		}

	}

};

export function segment( 

	coefficients, degree, dimension,
	start, 
	end, 
	amount, 
	handler 

) {

	const size = Math.abs( end - start ) / amount;
	let x = start;

	if ( !handler ) {

		const result = new coefficients.constructor( dimension * amount );

		for ( let i = 0; i < amount; i ++ ) {

			const v = evaluate( coefficients, degree, dimension, x );

			if ( dimension > 1 ) {

				for ( let j = 0; j < dimension; j ++ ) {

					result[ index ++ ] = v[ j ];
				
				}

			} else result[ index ++ ] = v;

			x += size;

		}

		return result;
	
	} else {

		for ( let i = 0; i < amount; i ++ ) {

			const v = evaluate( coefficients, degree, dimension, x );

			if ( dimension > 1 ) handler( x, ...v );
			else handler( x, v );

			x += size;

		}

	}

};

export function map( 
	
	coefficients, degree, dimension,
	positions, 
	handler 

) {

	const length = positions.length;

	if ( !handler ) {

		const result = new coefficients.constructor( dimension * length );

		for ( let i = 0; i < length; i ++ ) {

			const x = positions[ i ];

			const v = evaluate( coefficients, degree, dimension, x );

			if ( dimension > 1 ) {

				for ( let j = 0; j < dimension; j ++ ) {

					result[ index ++ ] = v[ j ];
				
				}

			} else result[ index ++ ] = v;

		}

		return result;

	} else {

		for ( let i = 0; i < length; i ++ ) {

			const x = positions[ i ];
			const v = evaluate( coefficients, degree, dimension, x );

			if ( dimension > 1 ) handler( x, ...v );
			else handler( x, v );

		}

	}

};


// Two dimensional data handlers:
export function scale2D( positions, sX, sY, anchorX, anchorY ) {

	for ( let i = 0; i < positions.length; i += 2 ) {

		const x = positions[ i + 0 ];
		const y = positions[ i + 1 ];

		positions[ i + 0 ] = ( x - anchorX )*sX + anchorX;
		positions[ i + 1 ] = ( y - anchorY )*sY + anchorY;

	}

};

export function translate2D( positions, tX, tY ) {

	for ( let i = 0; i < positions.length; i += 2 ) {

		positions[ i + 0 ] += tX;
		positions[ i + 1 ] += tY;

	}

};

export function evaluate2D( 

	coefficients, degree, 
	x, y 

) {

	let index = 0;
	let r = 0;

	for ( let iY = 0; iY < degree; iY ++ ) {
		for ( let iX = 0; iX < degree; iX ++ ) {

			const c = coefficients[ index ++ ];

			r += c*(x**iX)*(y**iY);

		}
	}

	return r;

};

export function step2D( 

	coefficients, degree, 
	startX, startY, 
	endX, endY, 
	sizeX, sizeY, 
	handler 

) {

	const resX = Math.floor( Math.abs( endX - startX ) / sizeX );
	const resY = Math.floor( Math.abs( endY - startY ) / sizeY );

	let x = sX;
	let y = sY;

	if ( !handler ) {

		const result = new values.constructor( (resX + 1)*(resY + 1) );
		let index = 0;

		for ( let iY = 0; iY <= resY; iY ++ ) {
			for ( let iX = 0; iX <= resX; iX ++ ) {

				result[ index ++ ] = evaluate2D( coefficients, degree, x, y );

				x += sizeX;
			}
			y += sizeY;
		}

		return result;

	} else {

		for ( let iY = 0; iY <= resY; iY ++ ) {
			for ( let iX = 0; iX <= resX; iX ++ ) {

				handler( x, y, evaluate2D( coeffiecients, degree, x, y ) );

				x += sizeX;
			}
			y += sizeY;
		}

	}

};

export function segment2D( 

	coefficients, degree, 
	startX, startY, 
	endX, endY, 
	amountX, amountY, 
	handler 

) {

	const sizeX = Math.abs( endX - startX ) / amountX;
	const sizeY = Math.abs( endY - startY ) / amountY;

	let x = startX;
	let y = startY;

	if ( !handler ) {

		let index = 0;
		const result = new coefficients.constructor( amountX * amountY );

		for ( let iY = 0; iY < amount; iY ++ ) {
			for ( let iX = 0; iX < amount; iX ++ ) {

				result[ index ++ ] = evaluate2D( coefficients, degree, x, y )
				x += sizeX;
			}
			y += sizeY;
		}

		return result;
	
	} else {

		for ( let iY = 0; iY < amount; iY ++ ) {
			for ( let iX = 0; iX < amount; iX ++ ) {

				handler( x, y, evaluate2D( coefficients, degree, x, y ) );
				x += sizeX;
			}
			y += sizeY;
		}

	}

};

export function map2D( 

	coefficients, degree, 
	positions, 
	handler 

) {

	const length = positions.length;

	if ( !handler ) {

		const result = new coefficients.constructor( length );
		let index = 0;

		for ( let i = 0; i < length; i += 2 ) {

			const x = positions[ i + 0 ];
			const y = positions[ i + 1 ];

			result[ index ++ ] = evaluate2D( coefficients, degree, x, y );

		}

		return result;

	} else {

		for ( let i = 0; i < length; i += 2 ) {

			const x = positions[ i + 0 ];
			const y = positions[ i + 1 ];

			handler( x, y, evaluate2D( coefficients, degree, x, y ) );

		}

	}

};

// Three dimensional data handlers:
export function scale3D( positions, sX, sY, anchorX, anchorY ) {

	for ( let i = 0; i < positions.length; i += 3 ) {

		const x = positions[ i + 0 ];
		const y = positions[ i + 1 ];
		const z = positions[ i + 2 ];

		positions[ i + 0 ] = ( x - anchorX )*sX + anchorX;
		positions[ i + 1 ] = ( y - anchorY )*sY + anchorY;
		positions[ i + 2 ] = ( z - anchorZ )*sZ + anchorZ;

	}

};

export function translate3D( positions, tX, tY ) {

	for ( let i = 0; i < positions.length; i += 3 ) {

		positions[ i + 0 ] += tX;
		positions[ i + 1 ] += tY;
		positions[ i + 2 ] += tZ;

	}

};

export function evaluate3D( 

	coefficients, degree, 
	x, y, z 

) {

	let index = 0;
	let r = 0;

	for ( let iZ = 0; iZ < degree; iZ ++ ) {
		for ( let iY = 0; iY < degree; iY ++ ) {
			for ( let iX = 0; iX < degree; iX ++ ) {

				const c = coefficients[ index ++ ];

				r += c*(x**iX)*(y**iY)*(z**iZ);

			}
		}
	}

	return r;

};

export function step3D( 
	
	coefficients, degree, 
	startX, startY, startZ,
	endX, endY, endZ, 
	sizeX, sizeY, sizeZ, 
	handler 

) {

	const resX = Math.floor( Math.abs( endX - startX ) / sizeX );
	const resY = Math.floor( Math.abs( endY - startY ) / sizeY );
	const resZ = Math.floor( Math.abs( endZ - startZ ) / sizeZ );

	let x = startX;
	let y = startY;
	let z = startZ;

	if ( !handler ) {

		const result = new values.constructor( (resX + 1)*(resY + 1)*(resZ + 1) );
		let index = 0;

		for ( let iZ = 0; iZ <= resZ; iZ ++ ) {
			for ( let iY = 0; iY <= resY; iY ++ ) {
				for ( let iX = 0; iX <= resX; iX ++ ) {

					result[ index ++ ] = evaluate3D( coefficients, degree, x, y, z );

					x += sizeX;
				}
				y += sizeY;
			}
			z += sizeZ;
		}

		return result;

	} else {

		for ( let iZ = 0; iZ <= resZ; iZ ++ ) {
			for ( let iY = 0; iY <= resY; iY ++ ) {
				for ( let iX = 0; iX <= resX; iX ++ ) {

					handler( x, y, z, evaluate3D( coeffiecients, degree, x, y, z ) );

					x += sizeX;
				}
				y += sizeY;
			}
			z += sizeZ;
		}

	}

};

export function segment3D( 

	coefficients, degree, 
	startX, startY, startZ, 
	endX, endY, endZ,
	amountX, amountY, amountZ, 
	handler 

) {

	const sizeX = Math.abs( endX - startX ) / amountX;
	const sizeY = Math.abs( endY - startY ) / amountY;
	const sizeZ = Math.abs( endZ - startZ ) / amountZ;
	
	let x = startX;
	let y = startY;
	let z = startZ;

	if ( !handler ) {

		const result = new coefficients.constructor( amount );
		let index = 0;

		for ( let iZ = 0; iZ < amountZ; iZ ++ ) {
			for ( let iY = 0; iY < amountY; iY ++ ) {
				for ( let iX = 0; iX < amountX; iX ++ ) {

					result[ index ++ ] = evaluate3D( coefficients, degree, x, y, z )
					
					x += sizeX;
				}
				y += sizeY;
			}
			z += sizeZ;
		}

		return result;
	
	} else {

		for ( let iZ = 0; iZ < amountZ; iZ ++ ) {
			for ( let iY = 0; iY < amountY; iY ++ ) {
				for ( let iX = 0; iX < amountX; iX ++ ) {

					handler( x, y, z, evaluate3D( coefficients, degree, x, y, z ) );
					
					x += sizeX;
				}
				y += sizeY;
			}
			z += sizeZ;
		}

	}

};

export function map3D( 

	coefficients, degree, 
	positions, 
	handler 

) {

	const length = positions.length;

	if ( !handler ) {

		const result = new coefficients.constructor( length );
		let index = 0;

		for ( let i = 0; i < length; i += 3 ) {

			const x = positions[ i + 0 ];
			const y = positions[ i + 1 ];
			const z = positions[ i + 2 ];

			result[ index ++ ] = evaluate3D( coefficients, degree, x );

		}

		return result;

	} else {

		for ( let i = 0; i < length; i += 3 ) {

			const x = positions[ i + 0 ];
			const y = positions[ i + 1 ];
			const z = positions[ i + 2 ];

			handler( x, y, z, evaluate3D( coefficients, degree, x ) );

		}

	}

};


function gaussJordanDivide( matrix, row, col, numCols ) {
	
	for ( let i = col + 1; i < numCols; i ++ ) {

		matrix[row][i] /= matrix[row][col];
	
	}
	
	matrix[row][col] = 1;
	
};

/**
 * Perform gauss-jordan elimination
 *
 * @param {number[][]|Float64Array[]} matrix - gets modified
 * @param {number} row
 * @param {number} col
 * @param {number} numRows
 * @param {number} numCols
 * @returns void
 */

function gaussJordanEliminate( matrix, row, col, numRows, numCols ) {

	for ( let i = 0; i < numRows; i ++ ) {
		
		if ( i !== row && matrix[i][col] !== 0 ) {
			
			for ( let j = col + 1; j < numCols; j ++ ) {

				matrix[i][j] -= matrix[i][col] * matrix[row][j];
			
			}

			matrix[i][col] = 0;

		}

	}

};

export function gaussJordanEchelonize( matrix ) {
	
	const rows = matrix.length;
	const cols = matrix[0].length;
	
	let i = 0;
	let j = 0;
	let k;
	
	while ( i < rows && j < cols ) {
		
		k = i;
		
		// Look for non-zero entries in col j at or below row i
		while ( k < rows && matrix[k][j] === 0 ) k ++;

		// If an entry is found at row k
		if ( k < rows ) {

			// If k is not i, then swap row i with row k
			if ( k !== i ) {

				let swap = matrix[i];
				matrix[i] = matrix[k];
				matrix[k] = swap;
			
			}

			// If matrix[i][j] is != 1, divide row i by matrix[i][j]
			if ( matrix[i][j] !== 1 ) gaussJordanDivide( matrix, i, j, cols );

			// Eliminate all other non-zero entries
			gaussJordanEliminate( matrix, i, j, rows, cols );
			
			i++;
		
		}
		
		j++;
	
	}
	
	return matrix;
	
};