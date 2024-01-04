import { scale, translate } from './Utilities.js';

function k_combinations(set, k) {
    let combs, head, tailcombs;
    
    if (k > set.length || k <= 0 ) {
        return [];
    }
    
    if ( k === set.length ) {
        return [set];
    }
    
    if ( k === 1 ) {
        combs = [];
        for (i = 0; i < set.length; i++) {
            combs.push([set[i]]);
        }
        return combs;
    }

    combs = [];
    for ( let i = 0; i < set.length - k + 1; i++) {

        head = set.slice(i, i+1);
        tailcombs = k_combinations(set.slice(i + 1), k - 1);

        for ( let j = 0; j < tailcombs.length; j++) {
            combs.push(head.concat(tailcombs[j]));
        }

    }

    return combs;

};

function g( set, k, index ) {

	if ( k === 0 ) return 1;

	set = [ ...set ].toSpliced( index, 1 );

	const combinations = k_combinations( set, k );

	let result = 0;

	for ( let i = 0; i < combinations.length; i ++ ) {

		let r = 1;

		for ( let j = 0; j < combinations[ i ].length; j ++ ) {

			r *= combinations[ i ][ j ];

		}

		result += r;

	}

	return result;

};

function f( set, order, index ) {

	const length = set.length;

	for ( let i = 0; i < length; i ++ ) {

		

	}

};

export class Polynomial {

	static evaluate( positions, values, x ) {

		const size = positions.length;

		let result = 0;

		for ( let i = 0; i < size; i ++ ) {

			let product = 1;

			const xI = positions[ i ];
			const wI = weights[ i ];

			for ( let j = 0; j < size; j ++ ) {

				if ( i === j ) continue;

				const xJ = positions[ j ];

				product *= (x - xJ)/(xI - xJ);

			}

			product *= wI;
			result += product;

		}

		return result;

	};

	static coefficients( 
	
		positions, values, dimension = 1,
		output, outputOffset = 0
	
	) {

		const size = values.length;

		if ( !output ) output = new values.constructor( size ).fill( 0 );

		const r = new values.constructor( size ).fill( 1 );

		for( let i = 0; i < size; i ++ ) {

			for ( let j = 0; j < size; j ++ ) {

				if ( i === j ) continue;

				r[ i ] /= (positions[ i ] - positions[ j ]);

			}

			r[ i ] *= values[ i ];

		}

		// 

		for ( let i = 0; i < size; i ++ ) {

			for ( let j = 0; j < size; j ++ ) {

				output[ i ] += g( positions, size - i - 1, j ) * r[ j ];

			}

		}

		return output;

	};

	constructor( positions, values, coefficients ) {

		this.positions = positions;
		this.values = values;
		this.coefficients = coefficients;

		if ( !coefficients ) this.update();

	};

	get degree() {

		return this.values.length;

	};

	translate( t = 0 ) {

		translate( this.positions, t );

		return this; 

	};

	scale( s = 1, anchor = 0 ) {

		scale( this.positions, s, anchor );

		return this

	};

	evaluate( x ) {

		return Polynomial.evaluate( this.positions, this.weights, x );

	};

	step( start, end, size, handler ) {

		const result = step(
			this.coefficients, this.degree,
			start, end, size,
			handler
		);

		return result ? this : result;

	};

	segment( start, end, amount, handler ) {

		const result = step(
			this.coefficients, this.degree,
			start, end, amount,
			handler
		);

		return result ? this : result;

	};

	map( positions, handler ) {

		const result = map(
			this.coefficients, this.degree,
			start, end, size,
			handler
		);

		return result ? this : result;

	};

};