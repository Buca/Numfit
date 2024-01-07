import Evaluator from '../Evaluator.js';

export class Quadratic extends Evaluator {

	static degree = 2;
	static variables = 1;

	static coefficients( 
	
		positions, values, dimension = 1,
		output, outputOffset = 0 

	) {

		if ( !output ) output = new values.constructor( 3*dimension );

		const x0 = positions[ 0 ];
		const x1 = positions[ 1 ];
		const x2 = positions[ 2 ];

		const r0 = 1/((x0-x1)*(x0-x2));
		const r1 = 1/((x1-x0)*(x1-x2));
		const r2 = 1/((x2-x0)*(x2-x1));

		const d = dimension;

		for ( let i = 0, j = 0; i < d; i ++ ) {

			let k = i;

			const v0 = values[ k ]*r0;
			const v1 = values[ k += d ]*r1;
			const v2 = values[ k += d ]*r2;

			const c0 = (v0*x1*x2 + v1*x0*x2 + v2*x0*x1);
			const c1 = -(v0*(x1 + x2) + v1*(x0 + x2) + v2*(x0 + x1));
			const c2 = (v0 + v1 + v2);

			output[ outputOffset + j ++ ] = c0;
			output[ outputOffset + j ++ ] = c1;
			output[ outputOffset + j ++ ] = c2;

		}

		return output;

	};

	static evaluate( 
		
		positions, values, dimension = 1,
		position,
		output, outputOffset = 0

	) {

		output = !output ? new values.constructor( dimension ) : output; 

		const x = typeof position === 'number' ? position : position[ 0 ];

		const x0 = positions[ 0 ];
		const x1 = positions[ 1 ];
		const x2 = positions[ 2 ];

		const dX0 = x - x0;
		const dX1 = x - x1;
		const dX2 = x - x2;
		const dX01 = 1 / (x0 - x1);
		const dX02 = 1 / (x0 - x2);
		const dX12 = 1 / (x1 - x2);

		const r0 = dX1*dX2*dX01*dX02;
		const r1 = -dX0*dX2*dX01*dX12;
		const r2 = dX0*dX1*dX01*dX02;

		for ( let i = 0; i < dimension; i ++ ) {

			let k = i;

			const v0 = values[ k ];
			const v1 = values[ k += dimension ];
			const v2 = values[ k += dimension ];

			output[ outputOffset + i ] = r0*v0 + r1*v1 + r2*v2;

		}

		if ( dimension === 1 ) return output[ outputOffset ];
		else return output;

	};

	constructor( 

		positions, values, dimension = 1

	) {

		super( positions, values, dimension );

	};

};

globalThis.Quadratic = Quadratic;

/*
const positions = [ 0, 1, 2 ];
const values = [ 2,3, 1,1, 33,33 ];
const dimension = 2;
const position = [ 2 ];

const quadratic = new Quadratic( positions, values, dimension );

console.log( quadratic.evaluate( position ) );*/