import Evaluator from '../Evaluator.js';

export class Triquadratic extends Evaluator {

	static degree = 2;
	static variables = 3;

	static coefficients(

		positions, values, dimension = 1,
		output, outputOffset = 0

	) {

		if ( !output ) output = new values.constructor( dimension * 27 );

		const x0 = positions[ 0 ];
		const y0 = positions[ 1 ];
		const z0 = positions[ 2 ];
		const x1 = positions[ 3 ];
		const y1 = positions[ 4 ];
		const z1 = positions[ 5 ];
		const x2 = positions[ 6 ];
		const y2 = positions[ 7 ];
		const z2 = positions[ 8 ];

		const qX0 = 1/((x0 - x1)*(x0 - x2));
		const qX1 = 1/((x1 - x0)*(x1 - x2));
		const qX2 = 1/((x2 - x0)*(x2 - x1));

		const qY0 = 1/((y0 - y1)*(y0 - y2));
		const qY1 = 1/((y1 - y0)*(y1 - y2));
		const qY2 = 1/((y2 - y0)*(y2 - y1));

		const qZ0 = 1/((z0 - z1)*(z0 - z2));
		const qZ1 = 1/((z1 - z0)*(z1 - z2));
		const qZ2 = 1/((z2 - z0)*(z2 - z1));

		const r000 = qX0 * qY0 * qZ0;
		const r100 = qX1 * qY0 * qZ0;
		const r200 = qX2 * qY0 * qZ0;

		const r010 = qX0 * qY1 * qZ0;
		const r110 = qX1 * qY1 * qZ0;
		const r210 = qX2 * qY1 * qZ0;
		
		const r020 = qX0 * qY2 * qZ0;
		const r120 = qX1 * qY2 * qZ0;
		const r220 = qX2 * qY2 * qZ0;
		
		const r001 = qX0 * qY0 * qZ1;
		const r101 = qX1 * qY0 * qZ1;
		const r201 = qX2 * qY0 * qZ1;
		
		const r011 = qX0 * qY1 * qZ1;
		const r111 = qX1 * qY1 * qZ1;
		const r211 = qX2 * qY1 * qZ1;
		
		const r021 = qX0 * qY2 * qZ1;
		const r121 = qX1 * qY2 * qZ1;
		const r221 = qX2 * qY2 * qZ1;
		
		const r002 = qX0 * qY0 * qZ2;
		const r102 = qX1 * qY0 * qZ2;
		const r202 = qX2 * qY0 * qZ2;
		
		const r012 = qX0 * qY1 * qZ2;
		const r112 = qX1 * qY1 * qZ2;
		const r212 = qX2 * qY1 * qZ2;
		
		const r022 = qX0 * qY2 * qZ2;
		const r122 = qX1 * qY2 * qZ2;
		const r222 = qX2 * qY2 * qZ2;

		const hX = new Float32Array( 9 );
		const hY = new Float32Array( 9 );
		const hZ = new Float32Array( 9 );

		hX[ 0 ] = x1*x2;
		hX[ 1 ] = x0*x2;
		hX[ 2 ] = x0*x1;

		hX[ 3 ] = -(x1 + x2);
		hX[ 4 ] = -(x0 + x2);
		hX[ 5 ] = -(x0 + x1);

		hX[ 6 ] = 1;
		hX[ 7 ] = 1;
		hX[ 8 ] = 1;

		hY[ 0 ] = y1*y2;
		hY[ 1 ] = y0*y2;
		hY[ 2 ] = y0*y1;

		hY[ 3 ] = -(y1 + y2);
		hY[ 4 ] = -(y0 + y2);
		hY[ 5 ] = -(y0 + y1);

		hY[ 6 ] = 1;
		hY[ 7 ] = 1;
		hY[ 8 ] = 1;

		hZ[ 0 ] = z1*z2;
		hZ[ 1 ] = z0*z2;
		hZ[ 2 ] = z0*z1;

		hZ[ 3 ] = -(z1 + z2);
		hZ[ 4 ] = -(z0 + z2);
		hZ[ 5 ] = -(z0 + z1);

		hZ[ 6 ] = 1;
		hZ[ 7 ] = 1;
		hZ[ 8 ] = 1;

		for ( let d = 0, v = values, t = dimension, index = 0; d < t; d ++ ) {

			let q = d;

			const v000 = values[ q ]*r000;
			const v100 = values[ q += t ]*r100;
			const v200 = values[ q += t ]*r200;

			const v010 = values[ q += t ]*r010;
			const v110 = values[ q += t ]*r110;
			const v210 = values[ q += t ]*r210;
			
			const v020 = values[ q += t ]*r020;
			const v120 = values[ q += t ]*r120;
			const v220 = values[ q += t ]*r220;
			
			const v001 = values[ q += t ]*r001;
			const v101 = values[ q += t ]*r101;
			const v201 = values[ q += t ]*r201;
			
			const v011 = values[ q += t ]*r011;
			const v111 = values[ q += t ]*r111;
			const v211 = values[ q += t ]*r211;
			
			const v021 = values[ q += t ]*r021;
			const v121 = values[ q += t ]*r121;
			const v221 = values[ q += t ]*r221;

			const v002 = values[ q += t ]*r002;
			const v102 = values[ q += t ]*r102;
			const v202 = values[ q += t ]*r202;

			const v012 = values[ q += t ]*r012;
			const v112 = values[ q += t ]*r112;
			const v212 = values[ q += t ]*r212;

			const v022 = values[ q += t ]*r022;
			const v122 = values[ q += t ]*r122;
			const v222 = values[ q += t ]*r222;

			for ( let z = 0, iZ = 0; z < 3; z ++ ) {

				const hZ0 = hZ[ iZ ++ ];
				const hZ1 = hZ[ iZ ++ ];
				const hZ2 = hZ[ iZ ++ ];

			for ( let y = 0, iY = 0; y < 3; y ++ ) {

				const hY0 = hY[ iY ++ ];
				const hY1 = hY[ iY ++ ];
				const hY2 = hY[ iY ++ ];

			for ( let x = 0, iX = 0; x < 3; x ++ ) {

				const hX0 = hX[ iX ++ ];
				const hX1 = hX[ iX ++ ];
				const hX2 = hX[ iX ++ ];

				output[ outputOffset + index ++ ] =

					hZ0*(hY0*(hX0*v000 + hX1*v100 + hX2*v200)
				+		 hY1*(hX0*v010 + hX1*v110 + hX2*v210)
				+		 hY2*(hX0*v020 + hX1*v120 + hX2*v220))

				+	hZ1*(hY0*(hX0*v001 + hX1*v101 + hX2*v201)
				+ 		 hY1*(hX0*v011 + hX1*v111 + hX2*v211)
				+		 hY2*(hX0*v021 + hX1*v121 + hX2*v221))
							
				+	hZ2*(hY0*(hX0*v002 + hX1*v102 + hX2*v202)
				+		 hY1*(hX0*v012 + hX1*v112 + hX2*v212)
				+		 hY2*(hX0*v022 + hX1*v122 + hX2*v222));

			}
			}
			}

		}

		return output;

	};

	static evaluate(

		positions, values, dimension = 1,
		position,
		output, outputOffset = 0

	) {

		output = !output ? new values.constructor( dimension ) : output; 

		const x = position[ 0 ];
		const y = position[ 1 ];
		const z = position[ 2 ];

		const x0 = positions[ 0 ];
		const y0 = positions[ 1 ];
		const z0 = positions[ 2 ];
		const x1 = positions[ 3 ];
		const y1 = positions[ 4 ];
		const z1 = positions[ 5 ];
		const x2 = positions[ 6 ];
		const y2 = positions[ 7 ];
		const z2 = positions[ 8 ];

		const rX0 = (x-x1)*(x-x2)/((x0-x1)*(x0-x2));
		const rX1 = (x-x0)*(x-x2)/((x1-x0)*(x1-x2));
		const rX2 = (x-x0)*(x-x1)/((x2-x0)*(x2-x1));

		const rY0 = (y-y1)*(y-y2)/((y0-y1)*(y0-y2));
		const rY1 = (y-y0)*(y-y2)/((y1-y0)*(y1-y2));
		const rY2 = (y-y0)*(y-y1)/((y2-y0)*(y2-y1));

		const rZ0 = (z-z1)*(z-z2)/((z0-z1)*(z0-z2));
		const rZ1 = (z-z0)*(z-z2)/((z1-z0)*(z1-z2));
		const rZ2 = (z-z0)*(z-z1)/((z2-z0)*(z2-z1));

		const v = values;
		const d = dimension;

		for ( let i = 0; i < d; i ++ ) {

			let k = i;

			const v00 = 	 v[ k ]*rX0 + v[ k += d ]*rX1 + v[ k += d ]*rX2;
			const v10 = v[ k += d ]*rX0 + v[ k += d ]*rX1 + v[ k += d ]*rX2;
			const v20 = v[ k += d ]*rX0 + v[ k += d ]*rX1 + v[ k += d ]*rX2;

			const v01 = v[ k += d ]*rX0 + v[ k += d ]*rX1 + v[ k += d ]*rX2;
			const v11 = v[ k += d ]*rX0 + v[ k += d ]*rX1 + v[ k += d ]*rX2;
			const v21 = v[ k += d ]*rX0 + v[ k += d ]*rX1 + v[ k += d ]*rX2;
			
			const v02 = v[ k += d ]*rX0 + v[ k += d ]*rX1 + v[ k += d ]*rX2;
			const v12 = v[ k += d ]*rX0 + v[ k += d ]*rX1 + v[ k += d ]*rX2;
			const v22 = v[ k += d ]*rX0 + v[ k += d ]*rX1 + v[ k += d ]*rX2;

			const v0 = v00*rY0 + v10*rY1 + v20*rY2;
			const v1 = v01*rY0 + v11*rY1 + v21*rY2;
			const v2 = v02*rY0 + v12*rY1 + v22*rY2;

			output[ outputOffset + i ] = v0*rZ0 + v1*rZ1 + v2*rZ2;

		}

		if ( dimension === 1 ) return output[ outputOffset ];
		else return output;

	};

	constructor( positions, values, dimension = 1 ) {

		super( positions, values, dimension );

	};
};

globalThis.Triquadratic = Triquadratic;

/*
const positions = [
	0,0,0,
	1,1,1,
	2,2,2
];

const values = [
	
	0,1,2, 3,4,5, 6,6,6,
	5,5,5, 7,7,7, 1,1,1,
	2,2,2, 3,3,3, 4,4,4,

	8,8,8, 4,1,2, 5,3,7,
	4,5,1, 6,7,0, 5,3,7,
	1,8,2, 8,4,3, 6,7,4,

	1,1,1, 2,2,2, 3,3,3,
	4,4,4, 5,5,5, 6,6,6,
	7,7,7, 8,8,8, 9,9,9

];

const dimension = 3;

const triquadratic = new Triquadratic( positions, values, dimension );

const position = [0,0,0];

console.log( triquadratic.evaluate( position ) );*/