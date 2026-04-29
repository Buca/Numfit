export function createExponents( variables, degree ) {

	const output = [];

	collectExponents( variables, degree, 0, [], output );

	return output;

}

export function evaluateBasis( position, inputOffset, exponents, variables ) {

	let value = 1;

	for ( let variable = 0; variable < variables; variable ++ ) {

		const x = typeof position === 'number' ? position : position[ inputOffset + variable ];

		value *= x ** exponents[ variable ];

	}

	return value;

}

export function solveLinearSystem( matrix, rhs ) {

	const size = matrix.length;
	const a = matrix.map( row => row.slice() );
	const b = rhs.slice();

	for ( let column = 0; column < size; column ++ ) {

		let pivot = column;
		let pivotValue = Math.abs( a[ column ][ column ] );

		for ( let row = column + 1; row < size; row ++ ) {

			const value = Math.abs( a[ row ][ column ] );

			if ( value > pivotValue ) {

				pivot = row;
				pivotValue = value;

			}

		}

		if ( pivotValue === 0 ) throw new RangeError( 'Regression normal equation matrix is singular.' );

		if ( pivot !== column ) {

			const row = a[ column ];
			a[ column ] = a[ pivot ];
			a[ pivot ] = row;

			const value = b[ column ];
			b[ column ] = b[ pivot ];
			b[ pivot ] = value;

		}

		for ( let row = column + 1; row < size; row ++ ) {

			const factor = a[ row ][ column ] / a[ column ][ column ];

			if ( factor === 0 ) continue;

			a[ row ][ column ] = 0;

			for ( let item = column + 1; item < size; item ++ ) a[ row ][ item ] -= factor * a[ column ][ item ];

			b[ row ] -= factor * b[ column ];

		}

	}

	const output = new Array( size );

	for ( let row = size - 1; row >= 0; row -- ) {

		let value = b[ row ];

		for ( let column = row + 1; column < size; column ++ ) value -= a[ row ][ column ] * output[ column ];

		output[ row ] = value / a[ row ][ row ];

	}

	return output;

}

function collectExponents( variables, remaining, index, current, output ) {

	if ( index === variables ) {

		output.push( current.slice() );
		return;

	}

	for ( let exponent = 0; exponent <= remaining; exponent ++ ) {

		current[ index ] = exponent;
		collectExponents( variables, remaining - exponent, index + 1, current, output );

	}

}
