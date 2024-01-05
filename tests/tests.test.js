import { expect, test } from 'vitest';
import { 
	Linear, Bilinear, Trilinear,
	Quadratic, Biquadratic, Triquadratic,
	Cubic, Bicubic, Tricubic
} from '../src';

test('Translating positions and updating instance.', () => {
	
	const positions = [ -2, 2 ];
	const values = [ 10, 3 ];
	const linear = new Linear( positions, values );

	linear.translate( 2 );
	linear.update();

	expect( linear.positions[ 0 ] ).toBeCloseTo( 0 );
	expect( linear.positions[ 1 ] ).toBeCloseTo( 4 );

});

test('Scaling positions around a point and updating the instance.', () => {
	
	const positions = [ -2, 2 ];
	const values = [ 10, 3 ];
	const linear = new Linear( positions, values );

	linear.scale( 2, 0 );
	linear.update();

	expect( linear.positions[ 0 ] ).toBeCloseTo( -4 );
	expect( linear.positions[ 1 ] ).toBeCloseTo(  4 );

});

test("Evaluator's step function.", () => {
	
	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );

	const v = linear.step( -2, 2, .5 );

	expect( v[ 0 ] ).toBeCloseTo( -4 );
	expect( v[ 1 ] ).toBeCloseTo( -3 );
	expect( v[ 2 ] ).toBeCloseTo( -2 );
	expect( v[ 3 ] ).toBeCloseTo( -1 );
	expect( v[ 4 ] ).toBeCloseTo( 0 );
	expect( v[ 5 ] ).toBeCloseTo( 1 );
	expect( v[ 6 ] ).toBeCloseTo( 2 );
	expect( v[ 7 ] ).toBeCloseTo( 3 );
	expect( v[ 8 ] ).toBeCloseTo( 4 );

});


test("Evaluator's segment function.", () => {
	
	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );

	const v = linear.segment( -2, 2, 8 );

	expect( v[ 0 ] ).toBeCloseTo( -4 );
	expect( v[ 1 ] ).toBeCloseTo( -3 );
	expect( v[ 2 ] ).toBeCloseTo( -2 );
	expect( v[ 3 ] ).toBeCloseTo( -1 );
	expect( v[ 4 ] ).toBeCloseTo( 0 );
	expect( v[ 5 ] ).toBeCloseTo( 1 );
	expect( v[ 6 ] ).toBeCloseTo( 2 );
	expect( v[ 7 ] ).toBeCloseTo( 3 );

});

test("Evaluator's map function.", () => {
	
	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );

	const v = linear.map([ -2, -1.5, -1, -.5, 0, .5, 1, 1.5, 2 ]);

	expect( v[ 0 ] ).toBeCloseTo( -4 );
	expect( v[ 1 ] ).toBeCloseTo( -3 );
	expect( v[ 2 ] ).toBeCloseTo( -2 );
	expect( v[ 3 ] ).toBeCloseTo( -1 );
	expect( v[ 4 ] ).toBeCloseTo( 0 );
	expect( v[ 5 ] ).toBeCloseTo( 1 );
	expect( v[ 6 ] ).toBeCloseTo( 2 );
	expect( v[ 7 ] ).toBeCloseTo( 3 );

});

test('The Linear class.', () => {

	const positions = [ -2, 2 ];
	const values = [ 10, 3 ];
	const linear = new Linear( positions, values );

	expect( linear.evaluate( -2 ) ).toBeCloseTo( 10 );
	expect( linear.evaluate(  2 ) ).toBeCloseTo(  3 );

});


test('The Bilinear class.', () => {
	
	const positions = [ 
		0, 0,
		1, 1
	];
	const values = [ 
		10,  3,
		 1, -8
	];
	const bilinear = new Bilinear( positions, values );

	expect( bilinear.evaluate( [0, 0] ) ).toBeCloseTo( 10 );
	expect( bilinear.evaluate( [1, 0] ) ).toBeCloseTo(  3 );
	expect( bilinear.evaluate( [0, 1] ) ).toBeCloseTo(  1 );
	expect( bilinear.evaluate( [1, 1] ) ).toBeCloseTo( -8 );
	
});


test('The Trilinear class.', () => {
	
	const positions = [ 
		0, 0, 0,
		1, 1, 1
	];
	const values = [ 
		10,  3,
		 1, -8,

		6, -12,
		4,   3
	];
	const trilinear = new Trilinear( positions, values );

	expect( trilinear.evaluate( [0, 0, 0] ) ).toBeCloseTo(  10 );
	expect( trilinear.evaluate( [1, 0, 0] ) ).toBeCloseTo(   3 );
	expect( trilinear.evaluate( [0, 1, 0] ) ).toBeCloseTo(   1 );
	expect( trilinear.evaluate( [1, 1, 0] ) ).toBeCloseTo(  -8 );

	expect( trilinear.evaluate( [0, 0, 1] ) ).toBeCloseTo(   6 );
	expect( trilinear.evaluate( [1, 0, 1] ) ).toBeCloseTo( -12 );
	expect( trilinear.evaluate( [0, 1, 1] ) ).toBeCloseTo(   4 );
	expect( trilinear.evaluate( [1, 1, 1] ) ).toBeCloseTo(   3 );

});


test('The Quadratic class.', () => {
	
	const positions = [ 0, 1, 2 ];
	const values = [ 10,-2,  3,11,  -2,8 ];
	const dimension = 2;
	const quadratic = new Quadratic( positions, values, dimension );

	const v0 = quadratic.evaluate( 0 );
	const v1 = quadratic.evaluate( 1 );
	const v2 = quadratic.evaluate( 2 );

	expect( v0[0] ).toBeCloseTo( 10 );
	expect( v0[1] ).toBeCloseTo( -2 );
	expect( v1[0] ).toBeCloseTo(  3 );
	expect( v1[1] ).toBeCloseTo( 11 );
	expect( v2[0] ).toBeCloseTo( -2 );
	expect( v2[1] ).toBeCloseTo(  8 );

});

test('The Biquadratic class.', () => {
	
	const positions = [ 
		0, 0,
		1, 1,
		2, 2
	];
	const values = [ 
		0, 1, 2,
		3, 4, 5,
		6, 7, 8
	];
	const biquadratic = new Biquadratic( positions, values );

	expect( biquadratic.evaluate( [0, 0] ) ).toBeCloseTo( 0 );
	expect( biquadratic.evaluate( [1, 0] ) ).toBeCloseTo( 1 );
	expect( biquadratic.evaluate( [2, 0] ) ).toBeCloseTo( 2 );
	expect( biquadratic.evaluate( [0, 1] ) ).toBeCloseTo( 3 );
	expect( biquadratic.evaluate( [1, 1] ) ).toBeCloseTo( 4 );
	expect( biquadratic.evaluate( [2, 1] ) ).toBeCloseTo( 5 );
	expect( biquadratic.evaluate( [0, 2] ) ).toBeCloseTo( 6 );
	expect( biquadratic.evaluate( [1, 2] ) ).toBeCloseTo( 7 );
	expect( biquadratic.evaluate( [2, 2] ) ).toBeCloseTo( 8 );
	
});


test('The Triquadratic class.', () => {
	
	const positions = [ 
		0, 0, 0,
		1, 1, 1,
		2, 2, 2
	];
	const values = [ 
		0, 1, 2,
		3, 4, 5,
		6, 7, 8,

		 9, 10, 11,
		12, 13, 14,
		15, 16, 17,

		18, 19, 20,
		21, 22, 23,
		24, 25, 26
	];
	const triquadratic = new Triquadratic( positions, values );

	expect( triquadratic.evaluate( [0, 0, 0] ) ).toBeCloseTo(  0 );
	expect( triquadratic.evaluate( [1, 0, 0] ) ).toBeCloseTo(  1 );
	expect( triquadratic.evaluate( [2, 0, 0] ) ).toBeCloseTo(  2 );
	expect( triquadratic.evaluate( [0, 1, 0] ) ).toBeCloseTo(  3 );
	expect( triquadratic.evaluate( [1, 1, 0] ) ).toBeCloseTo(  4 );
	expect( triquadratic.evaluate( [2, 1, 0] ) ).toBeCloseTo(  5 );
	expect( triquadratic.evaluate( [0, 2, 0] ) ).toBeCloseTo(  6 );
	expect( triquadratic.evaluate( [1, 2, 0] ) ).toBeCloseTo(  7 );
	expect( triquadratic.evaluate( [2, 2, 0] ) ).toBeCloseTo(  8 );

	expect( triquadratic.evaluate( [0, 0, 1] ) ).toBeCloseTo(  9 );
	expect( triquadratic.evaluate( [1, 0, 1] ) ).toBeCloseTo( 10 );
	expect( triquadratic.evaluate( [2, 0, 1] ) ).toBeCloseTo( 11 );
	expect( triquadratic.evaluate( [0, 1, 1] ) ).toBeCloseTo( 12 );
	expect( triquadratic.evaluate( [1, 1, 1] ) ).toBeCloseTo( 13 );
	expect( triquadratic.evaluate( [2, 1, 1] ) ).toBeCloseTo( 14 );
	expect( triquadratic.evaluate( [0, 2, 1] ) ).toBeCloseTo( 15 );
	expect( triquadratic.evaluate( [1, 2, 1] ) ).toBeCloseTo( 16 );
	expect( triquadratic.evaluate( [2, 2, 1] ) ).toBeCloseTo( 17 );

	expect( triquadratic.evaluate( [0, 0, 2] ) ).toBeCloseTo( 18 );
	expect( triquadratic.evaluate( [1, 0, 2] ) ).toBeCloseTo( 19 );
	expect( triquadratic.evaluate( [2, 0, 2] ) ).toBeCloseTo( 20 );
	expect( triquadratic.evaluate( [0, 1, 2] ) ).toBeCloseTo( 21 );
	expect( triquadratic.evaluate( [1, 1, 2] ) ).toBeCloseTo( 22 );
	expect( triquadratic.evaluate( [2, 1, 2] ) ).toBeCloseTo( 23 );
	expect( triquadratic.evaluate( [0, 2, 2] ) ).toBeCloseTo( 24 );
	expect( triquadratic.evaluate( [1, 2, 2] ) ).toBeCloseTo( 25 );
	expect( triquadratic.evaluate( [2, 2, 2] ) ).toBeCloseTo( 26 );

});


test('The Cubic class.', () => {
	
	const positions = [ 0, 1, 2, 3 ];
	const values = [ 10, -1, 2, 4 ];
	const cubic = new Cubic( positions, values );

	expect( cubic.evaluate( [0] ) ).toBeCloseTo( 10 );
	expect( cubic.evaluate( [1] ) ).toBeCloseTo( -1 );
	expect( cubic.evaluate( [2] ) ).toBeCloseTo(  2 );
	expect( cubic.evaluate( [3] ) ).toBeCloseTo(  4 );

});

test('The Bicubic class.', () => {
		
	const positions = [ 
		0, 0,
		1, 1,
		2, 2,
		3, 3
	];
	const values = [ 
		10,  3,  7,  -6,
		 1, -8,  9,   4,
		 8, 13,  2,  77,
		12, -2, -7, -23
	];
	const bicubic = new Bicubic( positions, values );

	expect( bicubic.evaluate( [0, 0] ) ).toBeCloseTo(  10 );
	expect( bicubic.evaluate( [1, 0] ) ).toBeCloseTo(   3 );
	expect( bicubic.evaluate( [2, 0] ) ).toBeCloseTo(   7 );
	expect( bicubic.evaluate( [3, 0] ) ).toBeCloseTo(  -6 );
	expect( bicubic.evaluate( [0, 1] ) ).toBeCloseTo(   1 );
	expect( bicubic.evaluate( [1, 1] ) ).toBeCloseTo(  -8 );
	expect( bicubic.evaluate( [2, 1] ) ).toBeCloseTo(   9 );
	expect( bicubic.evaluate( [3, 1] ) ).toBeCloseTo(   4 );
	expect( bicubic.evaluate( [0, 2] ) ).toBeCloseTo(   8 );
	expect( bicubic.evaluate( [1, 2] ) ).toBeCloseTo(  13 );
	expect( bicubic.evaluate( [2, 2] ) ).toBeCloseTo(   2 );
	expect( bicubic.evaluate( [3, 2] ) ).toBeCloseTo(  77 );
	expect( bicubic.evaluate( [0, 3] ) ).toBeCloseTo(  12 );
	expect( bicubic.evaluate( [1, 3] ) ).toBeCloseTo(  -2 );
	expect( bicubic.evaluate( [2, 3] ) ).toBeCloseTo(  -7 );
	expect( bicubic.evaluate( [3, 3] ) ).toBeCloseTo( -23 );

	
});

test('The Tricubic class.', () => {
	
	const positions = [ 
		0, 0, 0,
		1, 1, 1,
		2, 2, 2,
		3, 3, 3
	];
	const values = [ 
		 0,  1,  2,  3,
		 4,  5,  6,  7,
		 8,  9, 10, 11,
		12, 13, 14, 15,

		16, 17, 18, 19,
		20, 21, 22, 23,
		24, 25, 26, 27,
		28, 29, 30, 31,

		32, 33, 34, 35,
		36, 37, 38, 39,
		40, 41, 42, 43,
		44, 45, 46, 47,

		48, 49, 50, 51,
		52, 53, 54, 55,
		56, 57, 58, 59,
		60, 61, 62, 63

	];
	const tricubic = new Tricubic( positions, values );

	expect( tricubic.evaluate( [0, 0, 0] ) ).toBeCloseTo(  0 );
	expect( tricubic.evaluate( [1, 0, 0] ) ).toBeCloseTo(  1 );
	expect( tricubic.evaluate( [2, 0, 0] ) ).toBeCloseTo(  2 );
	expect( tricubic.evaluate( [3, 0, 0] ) ).toBeCloseTo(  3 );

	expect( tricubic.evaluate( [0, 1, 0] ) ).toBeCloseTo(  4 );
	expect( tricubic.evaluate( [1, 1, 0] ) ).toBeCloseTo(  5 );
	expect( tricubic.evaluate( [2, 1, 0] ) ).toBeCloseTo(  6 );
	expect( tricubic.evaluate( [3, 1, 0] ) ).toBeCloseTo(  7 );

	expect( tricubic.evaluate( [0, 2, 0] ) ).toBeCloseTo(  8 );
	expect( tricubic.evaluate( [1, 2, 0] ) ).toBeCloseTo(  9 );
	expect( tricubic.evaluate( [2, 2, 0] ) ).toBeCloseTo( 10 );
	expect( tricubic.evaluate( [3, 2, 0] ) ).toBeCloseTo( 11 );

	expect( tricubic.evaluate( [0, 3, 0] ) ).toBeCloseTo( 12 );
	expect( tricubic.evaluate( [1, 3, 0] ) ).toBeCloseTo( 13 );
	expect( tricubic.evaluate( [2, 3, 0] ) ).toBeCloseTo( 14 );
	expect( tricubic.evaluate( [3, 3, 0] ) ).toBeCloseTo( 15 );

	expect( tricubic.evaluate( [0, 0, 1] ) ).toBeCloseTo( 16 );
	expect( tricubic.evaluate( [1, 0, 1] ) ).toBeCloseTo( 17 );
	expect( tricubic.evaluate( [2, 0, 1] ) ).toBeCloseTo( 18 );
	expect( tricubic.evaluate( [3, 0, 1] ) ).toBeCloseTo( 19 );

	expect( tricubic.evaluate( [0, 1, 1] ) ).toBeCloseTo( 20 );
	expect( tricubic.evaluate( [1, 1, 1] ) ).toBeCloseTo( 21 );
	expect( tricubic.evaluate( [2, 1, 1] ) ).toBeCloseTo( 22 );
	expect( tricubic.evaluate( [3, 1, 1] ) ).toBeCloseTo( 23 );

	expect( tricubic.evaluate( [0, 2, 1] ) ).toBeCloseTo( 24 );
	expect( tricubic.evaluate( [1, 2, 1] ) ).toBeCloseTo( 25 );
	expect( tricubic.evaluate( [2, 2, 1] ) ).toBeCloseTo( 26 );
	expect( tricubic.evaluate( [3, 2, 1] ) ).toBeCloseTo( 27 );

	expect( tricubic.evaluate( [0, 3, 1] ) ).toBeCloseTo( 28 );
	expect( tricubic.evaluate( [1, 3, 1] ) ).toBeCloseTo( 29 );
	expect( tricubic.evaluate( [2, 3, 1] ) ).toBeCloseTo( 30 );
	expect( tricubic.evaluate( [3, 3, 1] ) ).toBeCloseTo( 31 );

	expect( tricubic.evaluate( [0, 0, 2] ) ).toBeCloseTo( 32 );
	expect( tricubic.evaluate( [1, 0, 2] ) ).toBeCloseTo( 33 );
	expect( tricubic.evaluate( [2, 0, 2] ) ).toBeCloseTo( 34 );
	expect( tricubic.evaluate( [3, 0, 2] ) ).toBeCloseTo( 35 );

	expect( tricubic.evaluate( [0, 1, 2] ) ).toBeCloseTo( 36 );
	expect( tricubic.evaluate( [1, 1, 2] ) ).toBeCloseTo( 37 );
	expect( tricubic.evaluate( [2, 1, 2] ) ).toBeCloseTo( 38 );
	expect( tricubic.evaluate( [3, 1, 2] ) ).toBeCloseTo( 39 );

	expect( tricubic.evaluate( [0, 2, 2] ) ).toBeCloseTo( 40 );
	expect( tricubic.evaluate( [1, 2, 2] ) ).toBeCloseTo( 41 );
	expect( tricubic.evaluate( [2, 2, 2] ) ).toBeCloseTo( 42 );
	expect( tricubic.evaluate( [3, 2, 2] ) ).toBeCloseTo( 43 );

	expect( tricubic.evaluate( [0, 3, 2] ) ).toBeCloseTo( 44 );
	expect( tricubic.evaluate( [1, 3, 2] ) ).toBeCloseTo( 45 );
	expect( tricubic.evaluate( [2, 3, 2] ) ).toBeCloseTo( 46 );
	expect( tricubic.evaluate( [3, 3, 2] ) ).toBeCloseTo( 47 );

	expect( tricubic.evaluate( [0, 0, 3] ) ).toBeCloseTo( 48 );
	expect( tricubic.evaluate( [1, 0, 3] ) ).toBeCloseTo( 49 );
	expect( tricubic.evaluate( [2, 0, 3] ) ).toBeCloseTo( 50 );
	expect( tricubic.evaluate( [3, 0, 3] ) ).toBeCloseTo( 51 );

	expect( tricubic.evaluate( [0, 1, 3] ) ).toBeCloseTo( 52 );
	expect( tricubic.evaluate( [1, 1, 3] ) ).toBeCloseTo( 53 );
	expect( tricubic.evaluate( [2, 1, 3] ) ).toBeCloseTo( 54 );
	expect( tricubic.evaluate( [3, 1, 3] ) ).toBeCloseTo( 55 );

	expect( tricubic.evaluate( [0, 2, 3] ) ).toBeCloseTo( 56 );
	expect( tricubic.evaluate( [1, 2, 3] ) ).toBeCloseTo( 57 );
	expect( tricubic.evaluate( [2, 2, 3] ) ).toBeCloseTo( 58 );
	expect( tricubic.evaluate( [3, 2, 3] ) ).toBeCloseTo( 59 );

	expect( tricubic.evaluate( [0, 3, 3] ) ).toBeCloseTo( 60 );
	expect( tricubic.evaluate( [1, 3, 3] ) ).toBeCloseTo( 61 );
	expect( tricubic.evaluate( [2, 3, 3] ) ).toBeCloseTo( 62 );
	expect( tricubic.evaluate( [3, 3, 3] ) ).toBeCloseTo( 63 );

});
