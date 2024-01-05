import Evaluator from '../Evaluator.js';

export class Tricubic extends Evaluator {

	static degree = 3;
	static variables = 3;

	static coefficients(

		positions, values, dimension = 1,
		output, outputOffset = 0

	) {

		if ( !output ) output = new values.constructor( 64 );

		const x0 = positions[  0 ];
		const y0 = positions[  1 ];
		const z0 = positions[  2 ];
		const x1 = positions[  3 ];
		const y1 = positions[  4 ];
		const z1 = positions[  5 ];
		const x2 = positions[  6 ];
		const y2 = positions[  7 ];
		const z2 = positions[  8 ];
		const x3 = positions[  9 ];
		const y3 = positions[ 10 ];
		const z3 = positions[ 11 ];

		const qX = new positions.constructor( 4 );
		const qY = new positions.constructor( 4 );
		const qZ = new positions.constructor( 4 );

		qX[ 0 ] = 1/((x0 - x1)*(x0 - x2)*(x0 - x3));
		qX[ 1 ] = 1/((x1 - x0)*(x1 - x2)*(x1 - x3));
		qX[ 2 ] = 1/((x2 - x0)*(x2 - x1)*(x2 - x3));
		qX[ 3 ] = 1/((x3 - x0)*(x3 - x1)*(x3 - x2));

		qY[ 0 ] = 1/((y0 - y1)*(y0 - y2)*(y0 - y3));
		qY[ 1 ] = 1/((y1 - y0)*(y1 - y2)*(y1 - y3));
		qY[ 2 ] = 1/((y2 - y0)*(y2 - y1)*(y2 - y3));
		qY[ 3 ] = 1/((y3 - y0)*(y3 - y1)*(y3 - y2));

		qZ[ 0 ] = 1/((z0 - z1)*(z0 - z2)*(z0 - z3));
		qZ[ 1 ] = 1/((z1 - z0)*(z1 - z2)*(z1 - z3));
		qZ[ 2 ] = 1/((z2 - z0)*(z2 - z1)*(z2 - z3));
		qZ[ 3 ] = 1/((z3 - z0)*(z3 - z1)*(z3 - z2));

		const x01 = x0*x1;
		const x02 = x0*x2;
		const x03 = x0*x3;
		const x12 = x1*x2;
		const x13 = x1*x3;
		const x23 = x2*x3;

		const y01 = y0*y1;
		const y02 = y0*y2;
		const y03 = y0*y3;
		const y12 = y1*y2;
		const y13 = y1*y3;
		const y23 = y2*y3;

		const z01 = z0*z1;
		const z02 = z0*z2;
		const z03 = z0*z3;
		const z12 = z1*z2;
		const z13 = z1*z3;
		const z23 = z2*z3;

		const hX = new Float32Array( 16 );
		const hY = new Float32Array( 16 );
		const hZ = new Float32Array( 16 );

		hX[ 0 ] = -x12*x3;
		hX[ 1 ] = -x02*x3;
		hX[ 2 ] = -x01*x3;
		hX[ 3 ] = -x01*x2;

		hX[ 4 ] = x12 + x13 + x23;
		hX[ 5 ] = x02 + x03 + x23;
		hX[ 6 ] = x01 + x03 + x13;
		hX[ 7 ] = x01 + x02 + x12;

		hX[ 8 ] = -(x1 + x2 + x3);
		hX[ 9 ] = -(x0 + x2 + x3);
		hX[ 10 ] = -(x0 + x1 + x3);
		hX[ 11 ] = -(x0 + x1 + x2);

		hX[ 12 ] = 1;
		hX[ 13 ] = 1;
		hX[ 14 ] = 1;
		hX[ 15 ] = 1;


		hY[ 0 ] = -y12*y3;
		hY[ 1 ] = -y02*y3;
		hY[ 2 ] = -y01*y3;
		hY[ 3 ] = -y01*y2;

		hY[ 4 ] = y12 + y13 + y23;
		hY[ 5 ] = y02 + y03 + y23;
		hY[ 6 ] = y01 + y03 + y13;
		hY[ 7 ] = y01 + y02 + y12;

		hY[ 8 ] = -(y1 + y2 + y3);
		hY[ 9 ] = -(y0 + y2 + y3);
		hY[ 10 ] = -(y0 + y1 + y3);
		hY[ 11 ] = -(y0 + y1 + y2);

		hY[ 12 ] = 1;
		hY[ 13 ] = 1;
		hY[ 14 ] = 1;
		hY[ 15 ] = 1;


		hZ[ 0 ] = -z12*z3;
		hZ[ 1 ] = -z02*z3;
		hZ[ 2 ] = -z01*z3;
		hZ[ 3 ] = -z01*z2;

		hZ[ 4 ] = z12 + z13 + z23;
		hZ[ 5 ] = z02 + z03 + z23;
		hZ[ 6 ] = z01 + z03 + z13;
		hZ[ 7 ] = z01 + z02 + z12;

		hZ[ 8 ] = -(z1 + z2 + z3);
		hZ[ 9 ] = -(z0 + z2 + z3);
		hZ[ 10 ] = -(z0 + z1 + z3);
		hZ[ 11 ] = -(z0 + z1 + z2);

		hZ[ 12 ] = 1;
		hZ[ 13 ] = 1;
		hZ[ 14 ] = 1;
		hZ[ 15 ] = 1;

		const r000 = qX[0] * qY[0] * qZ[0];
		const r100 = qX[1] * qY[0] * qZ[0];
		const r200 = qX[2] * qY[0] * qZ[0];
		const r300 = qX[3] * qY[0] * qZ[0];

		const r010 = qX[0] * qY[1] * qZ[0];
		const r110 = qX[1] * qY[1] * qZ[0];
		const r210 = qX[2] * qY[1] * qZ[0];
		const r310 = qX[3] * qY[1] * qZ[0];

		const r020 = qX[0] * qY[2] * qZ[0];
		const r120 = qX[1] * qY[2] * qZ[0];
		const r220 = qX[2] * qY[2] * qZ[0];
		const r320 = qX[3] * qY[2] * qZ[0];

		const r030 = qX[0] * qY[3] * qZ[0];
		const r130 = qX[1] * qY[3] * qZ[0];
		const r230 = qX[2] * qY[3] * qZ[0];
		const r330 = qX[3] * qY[3] * qZ[0];

		const r001 = qX[0] * qY[0] * qZ[1];
		const r101 = qX[1] * qY[0] * qZ[1];
		const r201 = qX[2] * qY[0] * qZ[1];
		const r301 = qX[3] * qY[0] * qZ[1];

		const r011 = qX[0] * qY[1] * qZ[1];
		const r111 = qX[1] * qY[1] * qZ[1];
		const r211 = qX[2] * qY[1] * qZ[1];
		const r311 = qX[3] * qY[1] * qZ[1];

		const r021 = qX[0] * qY[2] * qZ[1];
		const r121 = qX[1] * qY[2] * qZ[1];
		const r221 = qX[2] * qY[2] * qZ[1];
		const r321 = qX[3] * qY[2] * qZ[1];

		const r031 = qX[0] * qY[3] * qZ[1];
		const r131 = qX[1] * qY[3] * qZ[1];
		const r231 = qX[2] * qY[3] * qZ[1];
		const r331 = qX[3] * qY[3] * qZ[1];

		const r002 = qX[0] * qY[0] * qZ[2];
		const r102 = qX[1] * qY[0] * qZ[2];
		const r202 = qX[2] * qY[0] * qZ[2];
		const r302 = qX[3] * qY[0] * qZ[2];

		const r012 = qX[0] * qY[1] * qZ[2];
		const r112 = qX[1] * qY[1] * qZ[2];
		const r212 = qX[2] * qY[1] * qZ[2];
		const r312 = qX[3] * qY[1] * qZ[2];

		const r022 = qX[0] * qY[2] * qZ[2];
		const r122 = qX[1] * qY[2] * qZ[2];
		const r222 = qX[2] * qY[2] * qZ[2];
		const r322 = qX[3] * qY[2] * qZ[2];

		const r032 = qX[0] * qY[3] * qZ[2];
		const r132 = qX[1] * qY[3] * qZ[2];
		const r232 = qX[2] * qY[3] * qZ[2];
		const r332 = qX[3] * qY[3] * qZ[2];

		const r003 = qX[0] * qY[0] * qZ[3];
		const r103 = qX[1] * qY[0] * qZ[3];
		const r203 = qX[2] * qY[0] * qZ[3];
		const r303 = qX[3] * qY[0] * qZ[3];

		const r013 = qX[0] * qY[1] * qZ[3];
		const r113 = qX[1] * qY[1] * qZ[3];
		const r213 = qX[2] * qY[1] * qZ[3];
		const r313 = qX[3] * qY[1] * qZ[3];

		const r023 = qX[0] * qY[2] * qZ[3];
		const r123 = qX[1] * qY[2] * qZ[3];
		const r223 = qX[2] * qY[2] * qZ[3];
		const r323 = qX[3] * qY[2] * qZ[3];

		const r033 = qX[0] * qY[3] * qZ[3];
		const r133 = qX[1] * qY[3] * qZ[3];
		const r233 = qX[2] * qY[3] * qZ[3];
		const r333 = qX[3] * qY[3] * qZ[3];

		for ( let i = 0, d = dimension, v = values; i < d; i ++ ) {

			let k = i;

			const v000 = v[ k ]*r000;
			const v100 = v[ k += d ]*r100;
			const v200 = v[ k += d ]*r200;
			const v300 = v[ k += d ]*r300;
			const v010 = v[ k += d ]*r010; 
			const v110 = v[ k += d ]*r110;
			const v210 = v[ k += d ]*r210;
			const v310 = v[ k += d ]*r310;
			const v020 = v[ k += d ]*r020; 
			const v120 = v[ k += d ]*r120;
			const v220 = v[ k += d ]*r220;
			const v320 = v[ k += d ]*r320;
			const v030 = v[ k += d ]*r030; 
			const v130 = v[ k += d ]*r130;
			const v230 = v[ k += d ]*r230;
			const v330 = v[ k += d ]*r330;

			const v001 = v[ k += d ]*r001;
			const v101 = v[ k += d ]*r101;
			const v201 = v[ k += d ]*r201;
			const v301 = v[ k += d ]*r301;
			const v011 = v[ k += d ]*r011; 
			const v111 = v[ k += d ]*r111;
			const v211 = v[ k += d ]*r211;
			const v311 = v[ k += d ]*r311;
			const v021 = v[ k += d ]*r021; 
			const v121 = v[ k += d ]*r121;
			const v221 = v[ k += d ]*r221;
			const v321 = v[ k += d ]*r321;
			const v031 = v[ k += d ]*r031; 
			const v131 = v[ k += d ]*r131;
			const v231 = v[ k += d ]*r231;
			const v331 = v[ k += d ]*r331;

			const v002 = v[ k += d ]*r002;
			const v102 = v[ k += d ]*r102;
			const v202 = v[ k += d ]*r202;
			const v302 = v[ k += d ]*r302;
			const v012 = v[ k += d ]*r012; 
			const v112 = v[ k += d ]*r112;
			const v212 = v[ k += d ]*r212;
			const v312 = v[ k += d ]*r312;
			const v022 = v[ k += d ]*r022; 
			const v122 = v[ k += d ]*r122;
			const v222 = v[ k += d ]*r222;
			const v322 = v[ k += d ]*r322;
			const v032 = v[ k += d ]*r032; 
			const v132 = v[ k += d ]*r132;
			const v232 = v[ k += d ]*r232;
			const v332 = v[ k += d ]*r332;

			const v003 = v[ k += d ]*r003;
			const v103 = v[ k += d ]*r103;
			const v203 = v[ k += d ]*r203;
			const v303 = v[ k += d ]*r303;
			const v013 = v[ k += d ]*r013; 
			const v113 = v[ k += d ]*r113;
			const v213 = v[ k += d ]*r213;
			const v313 = v[ k += d ]*r313;
			const v023 = v[ k += d ]*r023; 
			const v123 = v[ k += d ]*r123;
			const v223 = v[ k += d ]*r223;
			const v323 = v[ k += d ]*r323;
			const v033 = v[ k += d ]*r033; 
			const v133 = v[ k += d ]*r133;
			const v233 = v[ k += d ]*r233;
			const v333 = v[ k += d ]*r333;

			for( let j = 0, indexZ = 0, index = 0; j < 4; j ++ ) {

				const hZ0 = hZ[ indexZ ++ ];
				const hZ1 = hZ[ indexZ ++ ];
				const hZ2 = hZ[ indexZ ++ ];
				const hZ3 = hZ[ indexZ ++ ];

			for( let q = 0, indexY = 0; q < 4; q ++ ) {

				const hY0 = hY[ indexY ++ ];
				const hY1 = hY[ indexY ++ ];
				const hY2 = hY[ indexY ++ ];
				const hY3 = hY[ indexY ++ ];

			for ( let l = 0, indexX = 0; l < 4; l ++ ) {

				const hX0 = hX[ indexX ++ ];
				const hX1 = hX[ indexX ++ ];
				const hX2 = hX[ indexX ++ ];
				const hX3 = hX[ indexX ++ ];

				output[ outputOffset + 64*i + index ++ ] =

					hZ0*(hY0*(hX0*v000 + hX1*v100 + hX2*v200 + hX3*v300)
				+		 hY1*(hX0*v010 + hX1*v110 + hX2*v210 + hX3*v310)
				+		 hY2*(hX0*v020 + hX1*v120 + hX2*v220 + hX3*v320)
				+		 hY3*(hX0*v030 + hX1*v130 + hX2*v230 + hX3*v330))

				+	hZ1*(hY0*(hX0*v001 + hX1*v101 + hX2*v201 + hX3*v301)
				+ 		 hY1*(hX0*v011 + hX1*v111 + hX2*v211 + hX3*v311)
				+		 hY2*(hX0*v021 + hX1*v121 + hX2*v221 + hX3*v321)
				+		 hY3*(hX0*v031 + hX1*v131 + hX2*v231 + hX3*v331))
							
				+	hZ2*(hY0*(hX0*v002 + hX1*v102 + hX2*v202 + hX3*v302)
				+		 hY1*(hX0*v012 + hX1*v112 + hX2*v212 + hX3*v312)
				+		 hY2*(hX0*v022 + hX1*v122 + hX2*v222 + hX3*v322)
				+		 hY3*(hX0*v032 + hX1*v132 + hX2*v232 + hX3*v332))

				+	hZ3*(hY0*(hX0*v003 + hX1*v103 + hX2*v203 + hX3*v303)
				+		 hY1*(hX0*v013 + hX1*v113 + hX2*v213 + hX3*v313)
				+		 hY2*(hX0*v023 + hX1*v123 + hX2*v223 + hX3*v323)
				+		 hY3*(hX0*v033 + hX1*v133 + hX2*v233 + hX3*v333));

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

		const x0 = positions[  0 ];
		const y0 = positions[  1 ];
		const z0 = positions[  2 ];
		const x1 = positions[  3 ];
		const y1 = positions[  4 ];
		const z1 = positions[  5 ];
		const x2 = positions[  6 ];
		const y2 = positions[  7 ];
		const z2 = positions[  8 ];
		const x3 = positions[  9 ];
		const y3 = positions[ 10 ];
		const z3 = positions[ 11 ];

		const rX0 = (x-x1)*(x-x2)*(x-x3)/((x0-x1)*(x0-x2)*(x0-x3));
		const rX1 = (x-x0)*(x-x2)*(x-x3)/((x1-x0)*(x1-x2)*(x1-x3));
		const rX2 = (x-x0)*(x-x1)*(x-x3)/((x2-x0)*(x2-x1)*(x2-x3));
		const rX3 = (x-x0)*(x-x1)*(x-x2)/((x3-x0)*(x3-x1)*(x3-x2));

		const rY0 = (y-y1)*(y-y2)*(y-y3)/((y0-y1)*(y0-y2)*(y0-y3));
		const rY1 = (y-y0)*(y-y2)*(y-y3)/((y1-y0)*(y1-y2)*(y1-y3));
		const rY2 = (y-y0)*(y-y1)*(y-y3)/((y2-y0)*(y2-y1)*(y2-y3));
		const rY3 = (y-y0)*(y-y1)*(y-y2)/((y3-y0)*(y3-y1)*(y3-y2));

		const rZ0 = (z-z1)*(z-z2)*(z-z3)/((z0-z1)*(z0-z2)*(z0-z3));
		const rZ1 = (z-z0)*(z-z2)*(z-z3)/((z1-z0)*(z1-z2)*(z1-z3));
		const rZ2 = (z-z0)*(z-z1)*(z-z3)/((z2-z0)*(z2-z1)*(z2-z3));
		const rZ3 = (z-z0)*(z-z1)*(z-z2)/((z3-z0)*(z3-z1)*(z3-z2));

		const d = dimension;

		for ( let i = 0; i < d; i ++ ) {

			let k = i;

			const v000 = values[ k ];
			const v100 = values[ k += d ];
			const v200 = values[ k += d ];
			const v300 = values[ k += d ];
			const v010 = values[ k += d ];
			const v110 = values[ k += d ];
			const v210 = values[ k += d ];
			const v310 = values[ k += d ];
			const v020 = values[ k += d ];
			const v120 = values[ k += d ];
			const v220 = values[ k += d ];
			const v320 = values[ k += d ];
			const v030 = values[ k += d ];
			const v130 = values[ k += d ];
			const v230 = values[ k += d ];
			const v330 = values[ k += d ];
			const v001 = values[ k += d ];
			const v101 = values[ k += d ];
			const v201 = values[ k += d ];
			const v301 = values[ k += d ];
			const v011 = values[ k += d ];
			const v111 = values[ k += d ];
			const v211 = values[ k += d ];
			const v311 = values[ k += d ];
			const v021 = values[ k += d ];
			const v121 = values[ k += d ];
			const v221 = values[ k += d ];
			const v321 = values[ k += d ];
			const v031 = values[ k += d ];
			const v131 = values[ k += d ];
			const v231 = values[ k += d ];
			const v331 = values[ k += d ];
			const v002 = values[ k += d ];
			const v102 = values[ k += d ];
			const v202 = values[ k += d ];
			const v302 = values[ k += d ];
			const v012 = values[ k += d ];
			const v112 = values[ k += d ];
			const v212 = values[ k += d ];
			const v312 = values[ k += d ];
			const v022 = values[ k += d ];
			const v122 = values[ k += d ];
			const v222 = values[ k += d ];
			const v322 = values[ k += d ];
			const v032 = values[ k += d ];
			const v132 = values[ k += d ];
			const v232 = values[ k += d ];
			const v332 = values[ k += d ];
			const v003 = values[ k += d ];
			const v103 = values[ k += d ];
			const v203 = values[ k += d ];
			const v303 = values[ k += d ];
			const v013 = values[ k += d ];
			const v113 = values[ k += d ];
			const v213 = values[ k += d ];
			const v313 = values[ k += d ];
			const v023 = values[ k += d ];
			const v123 = values[ k += d ];
			const v223 = values[ k += d ];
			const v323 = values[ k += d ];
			const v033 = values[ k += d ];
			const v133 = values[ k += d ];
			const v233 = values[ k += d ];
			const v333 = values[ k += d ];

			const v00 = v000*rX0 + v100*rX1 + v200*rX2 + v300*rX3;
			const v10 = v010*rX0 + v110*rX1 + v210*rX2 + v310*rX3;
			const v20 = v020*rX0 + v120*rX1 + v220*rX2 + v320*rX3;
			const v30 = v020*rx0 + v130*rX1 + v230*rX2 + v330*rX3;

			const v01 = v001*rX0 + v101*rX1 + v201*rX2 + v301*rX3;
			const v11 = v011*rX0 + v111*rX1 + v211*rX2 + v311*rX3;
			const v21 = v021*rX0 + v121*rX1 + v221*rX2 + v321*rX3;
			const v31 = v021*rx0 + v131*rX1 + v231*rX2 + v331*rX3;

			const v02 = v002*rX0 + v102*rX1 + v202*rX2 + v302*rX3;
			const v12 = v012*rX0 + v112*rX1 + v212*rX2 + v312*rX3;
			const v22 = v022*rX0 + v122*rX1 + v222*rX2 + v322*rX3;
			const v32 = v022*rx0 + v132*rX1 + v232*rX2 + v332*rX3;

			const v03 = v003*rX0 + v103*rX1 + v203*rX2 + v303*rX3;
			const v13 = v013*rX0 + v113*rX1 + v213*rX2 + v313*rX3;
			const v23 = v023*rX0 + v123*rX1 + v223*rX2 + v323*rX3;
			const v33 = v023*rx0 + v133*rX1 + v233*rX2 + v333*rX3;

			const v0 = v00*rY0 + v10*rY1 + v20*rY2 + v30*rY3;
			const v1 = v01*rY0 + v11*rY1 + v21*rY2 + v31*rY3;
			const v2 = v02*rY0 + v12*rY1 + v22*rY2 + v32*rY3; 
			const v3 = v02*rY0 + v12*rY1 + v22*rY2 + v33*rY3;

			output[ outputOffset + i ] = v0*rZ0 + v1*rZ1 + v2*rZ2 + v3*rZ3;

		}

		if ( dimension === 1 ) return output[ outputOffset ];
		else return output;

	};

	constructor( positions, values, dimension ) {

		super( positions, values, dimension );

	};

};

globalThis.Tricubic = Tricubic;

/*
const positions = [
	0, 0, 0,
	1, 1, 1,
	2, 2, 2,
	3, 3, 3
];

const values = [

	10, 11,    2, 3,     1, -4,    0, 7,
	11, 13,	   4,66,    -4,  5,    7, 0,
	 3,  6,   -3, 3,     3, 11,    0, 7,
	66,  8,    1, 0,     6,  7,    9, 9,

	 1,  2,    3, 4,     5,  6,    7, 8,
	 9, 10,	  111,12,    13,  5,    7, 0,
	 3,  6,   -3, 3,     3, 11,    0, 7,
	66,  8,    1, 0,     6,  7,    9, 9,

	 1,  2,    3, 4,     5,  6,    7, 8,
	 9, 10,	  11111,12,    13,  5,    7, 0,
	 3,  6,   -3, 3,     3, 11,    0, 7,
	66,  8,    1, 0,     6,  7,    9, 9,

	 1,  2,    3, 4,     5,  6,    7, 8,
	 9, 10,	  111111,12,    13,  5,    7, 0,
	 3,  6,   -3, 3,     3, 11,    0, 7,
	66,  8,    1, 0,     6,  7,    9, 9

];

const dimension = 2;
const position = [ 1, 1, 1 ];

const tricubic = new Tricubic( positions, values, dimension );

console.log( tricubic.evaluate( position ) );*/