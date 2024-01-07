import Evaluator from '../Evaluator.js';

export class Biquadratic extends Evaluator {

	static degree = 2;
	static variables = 2;

	static evaluate(

		positions, values, dimension = 1,
		position,
		output, outputOffset = 0
	
	) {

		if ( !output ) output = new values.constructor( dimension );

		const x = position[ 0 ];
		const y = position[ 1 ];

		const x0 = positions[ 0 ];
		const y0 = positions[ 1 ];
		const x1 = positions[ 2 ];
		const y1 = positions[ 3 ];
		const x2 = positions[ 4 ];
		const y2 = positions[ 5 ];

		const dX01 = x0 - x1;
		const dX02 = x0 - x2;
		const dX12 = x1 - x2;

		const dX0 = x - x0;
		const dX1 = x - x1;
		const dX2 = x - x2;

		const dY0 = y - y0;
		const dY1 = y - y1;
		const dY2 = y - y2;

		const dY01 = y0 - y1;
		const dY02 = y0 - y2;
		const dY12 = y1 - y2; 

		const k0 = (dX1*dX2)/(dX01*dX02);
		const k1 = -(dX0*dX2)/(dX01*dX12);
		const k2 = (dX0*dX1)/(dX02*dX12);

		const q0 = (dY1*dY2)/(dY01*dY02);
		const q1 = -(dY0*dY2)/(dY01*dY12);
		const q2 = (dY0*dY1)/(dY02*dY12);

		for ( let i = 0; i < dimension; i ++ ) {

			let k = i;

			const v00 = values[ k ];
			const v10 = values[ k += dimension ];
			const v20 = values[ k += dimension ];
			const v01 = values[ k += dimension ];
			const v11 = values[ k += dimension ];
			const v21 = values[ k += dimension ];
			const v02 = values[ k += dimension ];
			const v12 = values[ k += dimension ];
			const v22 = values[ k += dimension ];

			const v0 = k0*v00 + k1*v10 + k2*v20;
			const v1 = k0*v01 + k1*v11 + k2*v21;
			const v2 = k0*v02 + k1*v12 + k2*v22;

			output[ outputOffset + i ] = q0*v0 + q1*v1 + q2*v2;

		}

		if ( dimension === 1 ) return output[ outputOffset ];
		else return output;


	};

	static coefficients( 

		positions, values, dimension = 1,
		output, outputOffset = 0

	) {

		if ( !output ) output = new values.constructor( dimension * 9 );

		const x0 = positions[ 0 ];
		const y0 = positions[ 1 ];
		const x1 = positions[ 2 ];
		const y1 = positions[ 3 ];
		const x2 = positions[ 4 ];
		const y2 = positions[ 5 ];

		const x01 = x0*x1;
		const x02 = x0*x2;
		const x12 = x1*x2;

		const y01 = y0*y1;
		const y02 = y0*y2;
		const y12 = y1*y2; 

		const qX0 = 1/((x0 - x1)*(x0 - x2));
		const qX1 = 1/((x1 - x0)*(x1 - x2));
		const qX2 = 1/((x2 - x0)*(x2 - x1));

		const qY0 = 1/((y0 - y1)*(y0 - y2));
		const qY1 = 1/((y1 - y0)*(y1 - y2));
		const qY2 = 1/((y2 - y0)*(y2 - y1));

		const r00 = qX0*qY0;
		const r10 = qX1*qY0;
		const r20 = qX2*qY0;

		const r01 = qX0*qY1;
		const r11 = qX1*qY1;
		const r21 = qX2*qY1;
		
		const r02 = qX0*qY2;
		const r12 = qX1*qY2;
		const r22 = qX2*qY2;

		const d = dimension, v = values;

		for ( let i = 0, j = 0; i < d; i ++ ) {

			let k = i;

			const v00 = v[ k ]*r00;
			const v01 = v[ k += d ]*r01;
			const v02 = v[ k += d ]*r02;
			const v10 = v[ k += d ]*r10;
			const v11 = v[ k += d ]*r11;
			const v12 = v[ k += d ]*r12;
			const v20 = v[ k += d ]*r20;
			const v21 = v[ k += d ]*r21;
			const v22 = v[ k += d ]*r22;

			const c00 = 	y12*(v00*x12 + v10*x02 + v20*x01) 
						+	y02*(v01*x12 + v11*x02 + v21*x01) 
						+	y01*(v02*x12 + v12*x02 + v22*x01);

			const c10 = -	(y1 + y2)*(v00*x12 - v10*x02 - v20*x01)
						-	(y0 + y2)*(v01*x12 - v11*x02 - v21*x01)
						-	(y0 + y1)*(v02*x12 - v12*x02 - v22*x01);

			const c01 = -	(x1 + x2)*(v00*y12 - v01*y02 - v02*y01)
						-	(x0 + x2)*(v10*y12 - v11*y02 - v12*y01)
						-	(x0 + x1)*(v20*y12 - v21*y02 - v22*y01);

			const c20 = 	v00*y12 - v10*y12 - v20*y12
						+	v01*y02 - v11*y02 - v21*y02
						+	v02*y01 - v12*y01 - v22*y01;

			const c02 = 	v00*x12 - v01*x12 - v02*x12
						+	v10*x02 - v11*x02 - v12*x02
						+	v20*x01 - v21*x01 - v22*x01;

			const c11 = 	(y1 + y2)*(v00*(x1 + x2) + v10*(x0 + x2) + v20*(x0 + x1))
						+	(y0 + y2)*(v01*(x1 + x2) + v11*(x0 + x2) + v21*(x0 + x1))
						+	(y0 + y1)*(v02*(x1 + x2) + v12*(x0 + x2) + v22*(x0 + x1));

			const c21 = -	(y1 + y2)*(v00 + v10 + v20)
						-	(y0 + y2)*(v01 + v11 + v21)
						-	(y0 + y1)*(v02 + v12 + v22);

			const c12 = -	(x1 + x2)*(v00 + v01 + v02)
						-	(x0 + x2)*(v10 + v11 + v12)
						-	(x0 + x1)*(v20 + v21 + v22);

			const c22 = 	v00 + v10 + v20
						+	v01 + v11 + v21
						+	v02 + v12 + v22;

			output[ outputOffset + j ++ ] = c00; 
			output[ outputOffset + j ++ ] = c10; 
			output[ outputOffset + j ++ ] = c20;
			output[ outputOffset + j ++ ] = c01; 
			output[ outputOffset + j ++ ] = c11; 
			output[ outputOffset + j ++ ] = c21;
			output[ outputOffset + j ++ ] = c02; 
			output[ outputOffset + j ++ ] = c12; 
			output[ outputOffset + j ++ ] = c22;

		}

		return output;

	};

	constructor( positions, values, dimension = 1 ) {

		super( positions, values, dimension );

	};

};

globalThis.Biquadratic = Biquadratic;

/*
const positions = [
	0, 0,
	1, 1,
	2, 2
];

const values = [
	0,0, 1,1, 2,2,
	3,3, 4,4, 5,5,
	6,6, 7,7, 8,8
];

const dimension = 2;

const position = [ 0,0 ];

const biquadratic = new Biquadratic( positions, values, dimension );

console.log( biquadratic.evaluate( position ) );
*/