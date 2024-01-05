import Evaluator from '../Evaluator.js';

export class Trilinear extends Evaluator {

	static degree = 1;
	static variables = 3;
    
	static evaluate( 

		positions, values, dimension = 1,
		position,
		output, outputOffset = 0

	) {

		if ( !output ) output = values.constructor( dimension );

		const x = position[ 0 ];
		const y = position[ 1 ];
		const z = position[ 2 ];

		const x0 = positions[ 0 ];
		const y0 = positions[ 1 ];
		const z0 = positions[ 2 ];
		const x1 = positions[ 3 ];
		const y1 = positions[ 4 ];
		const z1 = positions[ 5 ];

		const dX0 = (x-x1)/(x0-x1);
		const dX1 = (x-x0)/(x1-x0);
		const dY0 = (y-y1)/(y0-y1);
		const dY1 = (y-y0)/(y1-y0);
		const dZ0 = (z-z1)/(z0-z1);
		const dZ1 = (z-z0)/(z1-z0);

		let index = 0;

		for ( let i = 0, index = 0; i < dimension; i ++ ) {

			let k = i;

			const v000 = values[ k ];
			const v100 = values[ k += dimension ];
			const v010 = values[ k += dimension ];
			const v110 = values[ k += dimension ];
			const v001 = values[ k += dimension ];
			const v101 = values[ k += dimension ];
			const v011 = values[ k += dimension ];
			const v111 = values[ k += dimension ];

			const v00 = v000*dX0 + v100*dX1;
			const v10 = v010*dX0 + v110*dX1;
			const v01 = v001*dX0 + v101*dX1;
			const v11 = v011*dX0 + v111*dX1;

			const v0 = v00*dY0 + v10*dY1;
			const v1 = v01*dY0 + v11*dY1;

			output[ outputOffset + index ++ ] = v0*dZ0 + v1*dZ1;

			
		}

		if ( dimension === 1 ) return output[ 0 ];
		return output;

	};

    static coefficients( 

    	positions, values, dimension = 1,
		position,
		output, outputOffset = 0

	) {

    	if ( !output ) output = new values.constructor( dimension*8 );

		const x0 = positions[ 0 ];
		const y0 = positions[ 1 ];
		const z0 = positions[ 2 ];
		const x1 = positions[ 3 ];
		const y1 = positions[ 4 ];
		const z1 = positions[ 5 ];

        const inv = 1 / ((x1 - x0) * (y1 - y0) * (z1 - z0));

        for ( let i = 0, index = 0; i < dimension; i ++ ) {

        	let k = i;

			const v000 = values[ k ];
			const v100 = values[ k += dimension ];
			const v010 = values[ k += dimension ];
			const v110 = values[ k += dimension ];
			const v001 = values[ k += dimension ];
			const v101 = values[ k += dimension ];
			const v011 = values[ k += dimension ];
			const v111 = values[ k += dimension ];

	        const c000 = (-v000*x1*y1*z1 + v001*x1*y1*z0 + v010*x1*y0*z1 - v011*x1*y0*z0
	                    + v100*x0*y1*z1 - v101*x0*y1*z0 - v110*x0*y0*z1 + v111*x0*y0*z0) * inv;
	        const c100 = (v000*y1*z1 - v001*y1*z0 - v010*y0*z1 + v011*y0*z0
	                    - v100*y1*z1 + v101*y1*z0 + v110*y0*z1 - v111*y0*z0) * inv;
	        const c010 = (v000*x1*z1 - v001*x1*z0 - v010*x1*z1 + v011*x1*z0
	                    - v100*x0*z1 + v101*x0*z0 + v110*x0*z1 - v111*x0*z0) * inv;
	        const c110 = (-v000*z1 + v001*z0 + v010*z1 - v011*z0 + v100*z1 - v101*z0 - v110*z1 + v111*z0) * inv;
	        const c001 = (v000*x1*y1 - v001*x1*y1 - v010*x1*y0 + v011*x1*y0 - v100*x0*y1 + v101*x0*y1 + v110*x0*y0 - v111*x0*y0) * inv;
	        const c101 = (-v000*y1 + v001*y1 + v010*y0 - v011*y0 + v100*y1 - v101*y1 - v110*y0 + v111*y0) * inv;
	        const c011 = (-v000*x1 + v001*x1 + v010*x1 - v011*x1 + v100*x0 - v101*x0 - v110*x0 + v111*x0) * inv;
	        const c111 = (v000 - v001 - v010 + v011 - v100 + v101 + v110 - v111) * inv;

			output[ outputOffset + index ++ ] = c000; 
			output[ outputOffset + index ++ ] = c100;
			output[ outputOffset + index ++ ] = c010; 
			output[ outputOffset + index ++ ] = c110;

			output[ outputOffset + index ++ ] = c001; 
			output[ outputOffset + index ++ ] = c101;
			output[ outputOffset + index ++ ] = c011; 
			output[ outputOffset + index ++ ] = c111;

		}

    	return output;	
	
	};

	constructor( 

		positions, 
		values,
		dimension = 1

	) {

		super( positions, values, dimension );

	};

	evaluate( 

		position, inputOffset = 0, 
		output, outputOffset = 0 

	) {

		if ( !output ) output = new this.values.constructor( this.dimension );

		const x = position[ inputOffset + 0 ];
		const y = position[ inputOffset + 1 ];
		const z = position[ inputOffset + 2 ];

		for ( let i = 0; i < this.dimension; i ++ ) {

			const c000 = this.coefficients[ 8*i + 0 ];
			const c100 = this.coefficients[ 8*i + 1 ];
			const c010 = this.coefficients[ 8*i + 2 ];
			const c110 = this.coefficients[ 8*i + 3 ];

			const c001 = this.coefficients[ 8*i + 4 ];
			const c101 = this.coefficients[ 8*i + 5 ];
			const c011 = this.coefficients[ 8*i + 6 ];
			const c111 = this.coefficients[ 8*i + 7 ];

			output[ outputOffset + i ] = -(c000 + c100*x + c010*y + c110*x*y + (c001 + c101*x + c011*y + c111*x*y)*z);

		}

		return output;

	};

};

globalThis.Trilinear = Trilinear;

/*
const positions = [ 0,0,0,  1,1,1 ];
const values = [

	 1,3,  1,1,
	 1,1, 13,1,

	20,1, 20,1,
	20,1, 20,1

];
const dimension = 2;
const position = [ 1, 1, 1 ];

const trilinear = new Trilinear( positions, values, dimension );

console.log( trilinear.evaluate( position ) );*/