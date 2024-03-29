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

test("Step sampling function using linear evaluation.", () => {
	
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

test("Step sampling function using bilinear evaluation.", () => {
	
	const positions = [ 
		0, 0, 
		1, 1
	];
	const values = [ 
		255, 0,
		0, 255 
	];
	const bilinear = new Bilinear( positions, values );

	const v = bilinear.step( [0,0], [1,1], [0.5,0.5] );

	expect( v[ 0 ] ).toBeCloseTo( bilinear.evaluate([  0,   0]) ); 
	expect( v[ 1 ] ).toBeCloseTo( bilinear.evaluate([0.5,   0]) );
	expect( v[ 2 ] ).toBeCloseTo( bilinear.evaluate([  1,   0]) );
	expect( v[ 3 ] ).toBeCloseTo( bilinear.evaluate([  0, 0.5]) );
	expect( v[ 4 ] ).toBeCloseTo( bilinear.evaluate([0.5, 0.5]) );
	expect( v[ 5 ] ).toBeCloseTo( bilinear.evaluate([  1, 0.5]) );
	expect( v[ 6 ] ).toBeCloseTo( bilinear.evaluate([  0,   1]) );
	expect( v[ 7 ] ).toBeCloseTo( bilinear.evaluate([0.5,   1]) );
	expect( v[ 8 ] ).toBeCloseTo( bilinear.evaluate([  1,   1]) );

});

test("Segment sampling function using bilinear evaluation.", () => {
	
	const positions = [ 
		0, 0, 
		1, 1
	];
	const values = [ 
		255, 0,
		0, 255 
	];
	const bilinear = new Bilinear( positions, values );

	const v = bilinear.segment( [0,0], [1,1], [3,3] );

	expect( v[ 0 ] ).toBeCloseTo( bilinear.evaluate([  0,   0]) ); 
	expect( v[ 1 ] ).toBeCloseTo( bilinear.evaluate([0.5,   0]) );
	expect( v[ 2 ] ).toBeCloseTo( bilinear.evaluate([  1,   0]) );
	expect( v[ 3 ] ).toBeCloseTo( bilinear.evaluate([  0, 0.5]) );
	expect( v[ 4 ] ).toBeCloseTo( bilinear.evaluate([0.5, 0.5]) );
	expect( v[ 5 ] ).toBeCloseTo( bilinear.evaluate([  1, 0.5]) );
	expect( v[ 6 ] ).toBeCloseTo( bilinear.evaluate([  0,   1]) );
	expect( v[ 7 ] ).toBeCloseTo( bilinear.evaluate([0.5,   1]) );
	expect( v[ 8 ] ).toBeCloseTo( bilinear.evaluate([  1,   1]) );

});

test("Segment sampling function using bilinear evaluation.", () => {
	
	const positions = [ 
		0, 0, 
		1, 1
	];
	const values = [ 
		255, 0,
		0, 255 
	];
	const bilinear = new Bilinear( positions, values );

	const v = bilinear.segment( [0,0], [1,1], [3,3] );

	expect( v[ 0 ] ).toBeCloseTo( bilinear.evaluate([  0,   0]) ); 
	expect( v[ 1 ] ).toBeCloseTo( bilinear.evaluate([0.5,   0]) );
	expect( v[ 2 ] ).toBeCloseTo( bilinear.evaluate([  1,   0]) );
	expect( v[ 3 ] ).toBeCloseTo( bilinear.evaluate([  0, 0.5]) );
	expect( v[ 4 ] ).toBeCloseTo( bilinear.evaluate([0.5, 0.5]) );
	expect( v[ 5 ] ).toBeCloseTo( bilinear.evaluate([  1, 0.5]) );
	expect( v[ 6 ] ).toBeCloseTo( bilinear.evaluate([  0,   1]) );
	expect( v[ 7 ] ).toBeCloseTo( bilinear.evaluate([0.5,   1]) );
	expect( v[ 8 ] ).toBeCloseTo( bilinear.evaluate([  1,   1]) );

});

test("Segment sampling function using bicubic evaluation.", () => {
	
	const positions = [ 
		0, 0, 
		1, 1,
		2, 2,
		3, 3
	];
	const values = [ 
		1, 2, 3, 4,
		5, 6, 7, 8,
		9, 10, 11, 12,
		13, 14, 15, 16

	];
	const bicubic = new Bicubic( positions, values );

	const v = bicubic.segment( [0,0], [1,1], [3,3] );

	expect( v[ 0 ] ).toBeCloseTo( bicubic.evaluate([  0,   0]) ); 
	expect( v[ 1 ] ).toBeCloseTo( bicubic.evaluate([0.5,   0]) );
	expect( v[ 2 ] ).toBeCloseTo( bicubic.evaluate([  1,   0]) );
	expect( v[ 3 ] ).toBeCloseTo( bicubic.evaluate([  0, 0.5]) );
	expect( v[ 4 ] ).toBeCloseTo( bicubic.evaluate([0.5, 0.5]) );
	expect( v[ 5 ] ).toBeCloseTo( bicubic.evaluate([  1, 0.5]) );
	expect( v[ 6 ] ).toBeCloseTo( bicubic.evaluate([  0,   1]) );
	expect( v[ 7 ] ).toBeCloseTo( bicubic.evaluate([0.5,   1]) );
	expect( v[ 8 ] ).toBeCloseTo( bicubic.evaluate([  1,   1]) );

});

test("Segment sampling function using bilinear evaluation of RGBA values.", () => {
	
	const positions = [ 
		0, 0, 
		1, 1
	];
	const values = [ 
		255,0,0,255, 0,255,0,255,
		0,0,255,255, 255,0,0,255 
	];
	const bilinear = new Bilinear( positions, values, 4 );

	const v = bilinear.segment( [0,0], [1,1], [3,3] );

	expect( v[ 0 ] ).toBeCloseTo( 255 ); 
	expect( v[ 1 ] ).toBeCloseTo( 0 ); 
	expect( v[ 2 ] ).toBeCloseTo( 0 ); 
	expect( v[ 3 ] ).toBeCloseTo( 255 ); 

	expect( v[ 4 ] ).toBeCloseTo( bilinear.evaluate([0.5,   0])[0] );
	expect( v[ 5 ] ).toBeCloseTo( bilinear.evaluate([0.5,   0])[1] );
	expect( v[ 6 ] ).toBeCloseTo( bilinear.evaluate([0.5,   0])[2] );
	expect( v[ 7 ] ).toBeCloseTo( bilinear.evaluate([0.5,   0])[3] );

	expect( v[  8 ] ).toBeCloseTo( 0 );
	expect( v[  9 ] ).toBeCloseTo( 255 );
	expect( v[ 10 ] ).toBeCloseTo( 0 );
	expect( v[ 11 ] ).toBeCloseTo( 255 );

	expect( v[ 12 ] ).toBeCloseTo( bilinear.evaluate([  0, 0.5])[0] );
	expect( v[ 13 ] ).toBeCloseTo( bilinear.evaluate([  0, 0.5])[1] );
	expect( v[ 14 ] ).toBeCloseTo( bilinear.evaluate([  0, 0.5])[2] );
	expect( v[ 15 ] ).toBeCloseTo( bilinear.evaluate([  0, 0.5])[3] );

	expect( v[ 16 ] ).toBeCloseTo( bilinear.evaluate([0.5, 0.5])[0] );
	expect( v[ 17 ] ).toBeCloseTo( bilinear.evaluate([0.5, 0.5])[1] );
	expect( v[ 18 ] ).toBeCloseTo( bilinear.evaluate([0.5, 0.5])[2] );
	expect( v[ 19 ] ).toBeCloseTo( bilinear.evaluate([0.5, 0.5])[3] );

	expect( v[ 20 ] ).toBeCloseTo( bilinear.evaluate([  1, 0.5])[0] );
	expect( v[ 21 ] ).toBeCloseTo( bilinear.evaluate([  1, 0.5])[1] );
	expect( v[ 22 ] ).toBeCloseTo( bilinear.evaluate([  1, 0.5])[2] );
	expect( v[ 23 ] ).toBeCloseTo( bilinear.evaluate([  1, 0.5])[3] );

	expect( v[ 24 ] ).toBeCloseTo( 0 );
	expect( v[ 25 ] ).toBeCloseTo( 0 );
	expect( v[ 26 ] ).toBeCloseTo( 255 );
	expect( v[ 27 ] ).toBeCloseTo( 255 );

	expect( v[ 28 ] ).toBeCloseTo( bilinear.evaluate([0.5,   1])[0] );
	expect( v[ 29 ] ).toBeCloseTo( bilinear.evaluate([0.5,   1])[1] );
	expect( v[ 30 ] ).toBeCloseTo( bilinear.evaluate([0.5,   1])[2] );
	expect( v[ 31 ] ).toBeCloseTo( bilinear.evaluate([0.5,   1])[3] );

	expect( v[ 32 ] ).toBeCloseTo( 255 );
	expect( v[ 33 ] ).toBeCloseTo( 0 );
	expect( v[ 34 ] ).toBeCloseTo( 0 );
	expect( v[ 35 ] ).toBeCloseTo( 255 );

});

test("Evaluator's step function with the handler defined.", () => {
	
	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );
	const v = [ -4, -3, -2, -1, 0, 1, 2, 3, 4 ];
	let i = 0;

	linear.step( -2, 2, .5, ( position, value ) => {

		expect( value ).toBeCloseTo( linear.evaluate( position ) );

	} );

});

test("Evaluator's segment function.", () => {
	
	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );

	const v = linear.segment( -2, 2, 9 );

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

test("Evaluator's segment function with the handler defined.", () => {
	
	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );
	const vs = [ -4, -3, -2, -1, 0, 1, 2, 3, 4 ];
	let i = 0;

	linear.segment( -2, 2, 8, ( position, value ) => {

		expect( value ).toBeCloseTo( vs[ i ++ ] );

	});
	
});

test("Evaluator's map function.", () => {
	
	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );

	const ps = [ -2, -1.5, -1, -.5, 0, .5, 1, 1.5, 2 ];
	const vs = linear.map( ps );

	expect( vs[ 0 ] ).toBeCloseTo( -4 );
	expect( vs[ 1 ] ).toBeCloseTo( -3 );
	expect( vs[ 2 ] ).toBeCloseTo( -2 );
	expect( vs[ 3 ] ).toBeCloseTo( -1 );
	expect( vs[ 4 ] ).toBeCloseTo( 0 );
	expect( vs[ 5 ] ).toBeCloseTo( 1 );
	expect( vs[ 6 ] ).toBeCloseTo( 2 );
	expect( vs[ 7 ] ).toBeCloseTo( 3 );

});

test("Evaluator's map function with the handler defined.", () => {
	
	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );

	const ps = [ -2, -1.5, -1, -.5, 0, .5, 1, 1.5, 2 ];
	const vs = [ -4, -3, -2, -1, 0, 1, 2, 3, 4 ];

	let i = 0;
	linear.map( ps, ( position, value ) => {

		expect( position ).toBeCloseTo( ps[ i ] )
		expect( value ).toBeCloseTo( vs[ i ++ ] );

	});

});

test("Linear's instance evaluation.", () => {

	const positions = [ -2, 2 ];
	const values = [ 10, 3 ];
	const linear = new Linear( positions, values );

	expect( linear.evaluate( -2 ) ).toBeCloseTo( 10 );
	expect( linear.evaluate(  2 ) ).toBeCloseTo(  3 );

});

test("Linear's static evaluation.", () => {

	const positions = [ -2, 2 ];
	const values = [ 10, 3 ];
	const dim = 1;

	expect( Linear.evaluate( positions, values, dim, -2 ) ).toBeCloseTo( 10 );
	expect( Linear.evaluate( positions, values, dim,  2 ) ).toBeCloseTo(  3 );

});


test('Bilinear instance evaluation.', () => {
	
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

test("Bilinear's static evaluation.", () => {
	
	const ps = [ 
		0, 0,
		1, 1
	];
	const vs = [ 
		10,  3,
		 1, -8
	];
	const dim = 1;

	expect( Bilinear.evaluate( ps, vs, dim, [0, 0] ) ).toBeCloseTo( 10 );
	expect( Bilinear.evaluate( ps, vs, dim, [1, 0] ) ).toBeCloseTo(  3 );
	expect( Bilinear.evaluate( ps, vs, dim, [0, 1] ) ).toBeCloseTo(  1 );
	expect( Bilinear.evaluate( ps, vs, dim, [1, 1] ) ).toBeCloseTo( -8 );
	
});

test("Trilinear's instance evaluation.", () => {
	
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

test("Trilinear's static evaluation.", () => {
	
	const ps = [ 
		0, 0, 0,
		1, 1, 1
	];
	const vs = [ 
		10,  3,
		 1, -8,

		6, -12,
		4,   3
	];
	const dim = 1;

	expect( Trilinear.evaluate( ps, vs, dim, [0, 0, 0] ) ).toBeCloseTo(  10 );
	expect( Trilinear.evaluate( ps, vs, dim, [1, 0, 0] ) ).toBeCloseTo(   3 );
	expect( Trilinear.evaluate( ps, vs, dim, [0, 1, 0] ) ).toBeCloseTo(   1 );
	expect( Trilinear.evaluate( ps, vs, dim, [1, 1, 0] ) ).toBeCloseTo(  -8 );

	expect( Trilinear.evaluate( ps, vs, dim, [0, 0, 1] ) ).toBeCloseTo(   6 );
	expect( Trilinear.evaluate( ps, vs, dim, [1, 0, 1] ) ).toBeCloseTo( -12 );
	expect( Trilinear.evaluate( ps, vs, dim, [0, 1, 1] ) ).toBeCloseTo(   4 );
	expect( Trilinear.evaluate( ps, vs, dim, [1, 1, 1] ) ).toBeCloseTo(   3 );

});

test("Quadratic's instance evaluation.", () => {
	
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

test("Quadratic's static evaluation.", () => {
	
	const ps = [ 0, 1, 2 ];
	const vs = [ 10,-2,  3,11,  -2,8 ];
	const dim = 2;
	
	const v0 = Quadratic.evaluate( ps, vs, dim, 0 );
	const v1 = Quadratic.evaluate( ps, vs, dim, 1 );
	const v2 = Quadratic.evaluate( ps, vs, dim, 2 );

	expect( v0[0] ).toBeCloseTo( 10 );
	expect( v0[1] ).toBeCloseTo( -2 );
	expect( v1[0] ).toBeCloseTo(  3 );
	expect( v1[1] ).toBeCloseTo( 11 );
	expect( v2[0] ).toBeCloseTo( -2 );
	expect( v2[1] ).toBeCloseTo(  8 );

});

test("Biquadratic's instance evaluation.", () => {
	
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

test("Biquadratic static evaluation.", () => {
	
	const ps = [ 
		0, 0,
		1, 1,
		2, 2
	];
	const vs = [ 
		0, 1, 2,
		3, 4, 5,
		6, 7, 8
	];
	const dim = 1;

	expect( Biquadratic.evaluate( ps, vs, dim, [0, 0] ) ).toBeCloseTo( 0 );
	expect( Biquadratic.evaluate( ps, vs, dim, [1, 0] ) ).toBeCloseTo( 1 );
	expect( Biquadratic.evaluate( ps, vs, dim, [2, 0] ) ).toBeCloseTo( 2 );
	expect( Biquadratic.evaluate( ps, vs, dim, [0, 1] ) ).toBeCloseTo( 3 );
	expect( Biquadratic.evaluate( ps, vs, dim, [1, 1] ) ).toBeCloseTo( 4 );
	expect( Biquadratic.evaluate( ps, vs, dim, [2, 1] ) ).toBeCloseTo( 5 );
	expect( Biquadratic.evaluate( ps, vs, dim, [0, 2] ) ).toBeCloseTo( 6 );
	expect( Biquadratic.evaluate( ps, vs, dim, [1, 2] ) ).toBeCloseTo( 7 );
	expect( Biquadratic.evaluate( ps, vs, dim, [2, 2] ) ).toBeCloseTo( 8 );
	
});

test("Triquadratic's instance evaluation.", () => {
	
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

test("Triquadratic's static evaluation.", () => {
	
	const ps = [ 
		0, 0, 0,
		1, 1, 1,
		2, 2, 2
	];
	const vs = [ 
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
	const dim = 1;

	expect( Triquadratic.evaluate( ps, vs, dim, [0, 0, 0] ) ).toBeCloseTo(  0 );
	expect( Triquadratic.evaluate( ps, vs, dim, [1, 0, 0] ) ).toBeCloseTo(  1 );
	expect( Triquadratic.evaluate( ps, vs, dim, [2, 0, 0] ) ).toBeCloseTo(  2 );
	expect( Triquadratic.evaluate( ps, vs, dim, [0, 1, 0] ) ).toBeCloseTo(  3 );
	expect( Triquadratic.evaluate( ps, vs, dim, [1, 1, 0] ) ).toBeCloseTo(  4 );
	expect( Triquadratic.evaluate( ps, vs, dim, [2, 1, 0] ) ).toBeCloseTo(  5 );
	expect( Triquadratic.evaluate( ps, vs, dim, [0, 2, 0] ) ).toBeCloseTo(  6 );
	expect( Triquadratic.evaluate( ps, vs, dim, [1, 2, 0] ) ).toBeCloseTo(  7 );
	expect( Triquadratic.evaluate( ps, vs, dim, [2, 2, 0] ) ).toBeCloseTo(  8 );

	expect( Triquadratic.evaluate( ps, vs, dim, [0, 0, 1] ) ).toBeCloseTo(  9 );
	expect( Triquadratic.evaluate( ps, vs, dim, [1, 0, 1] ) ).toBeCloseTo( 10 );
	expect( Triquadratic.evaluate( ps, vs, dim, [2, 0, 1] ) ).toBeCloseTo( 11 );
	expect( Triquadratic.evaluate( ps, vs, dim, [0, 1, 1] ) ).toBeCloseTo( 12 );
	expect( Triquadratic.evaluate( ps, vs, dim, [1, 1, 1] ) ).toBeCloseTo( 13 );
	expect( Triquadratic.evaluate( ps, vs, dim, [2, 1, 1] ) ).toBeCloseTo( 14 );
	expect( Triquadratic.evaluate( ps, vs, dim, [0, 2, 1] ) ).toBeCloseTo( 15 );
	expect( Triquadratic.evaluate( ps, vs, dim, [1, 2, 1] ) ).toBeCloseTo( 16 );
	expect( Triquadratic.evaluate( ps, vs, dim, [2, 2, 1] ) ).toBeCloseTo( 17 );

	expect( Triquadratic.evaluate( ps, vs, dim, [0, 0, 2] ) ).toBeCloseTo( 18 );
	expect( Triquadratic.evaluate( ps, vs, dim, [1, 0, 2] ) ).toBeCloseTo( 19 );
	expect( Triquadratic.evaluate( ps, vs, dim, [2, 0, 2] ) ).toBeCloseTo( 20 );
	expect( Triquadratic.evaluate( ps, vs, dim, [0, 1, 2] ) ).toBeCloseTo( 21 );
	expect( Triquadratic.evaluate( ps, vs, dim, [1, 1, 2] ) ).toBeCloseTo( 22 );
	expect( Triquadratic.evaluate( ps, vs, dim, [2, 1, 2] ) ).toBeCloseTo( 23 );
	expect( Triquadratic.evaluate( ps, vs, dim, [0, 2, 2] ) ).toBeCloseTo( 24 );
	expect( Triquadratic.evaluate( ps, vs, dim, [1, 2, 2] ) ).toBeCloseTo( 25 );
	expect( Triquadratic.evaluate( ps, vs, dim, [2, 2, 2] ) ).toBeCloseTo( 26 );

});

test("Cubic's instance evaluation.", () => {
	
	const positions = [ 0, 1, 2, 3 ];
	const values = [ 10, -1, 2, 4 ];
	const cubic = new Cubic( positions, values );

	expect( cubic.evaluate( 0 ) ).toBeCloseTo( 10 );
	expect( cubic.evaluate( 1 ) ).toBeCloseTo( -1 );
	expect( cubic.evaluate( 2 ) ).toBeCloseTo(  2 );
	expect( cubic.evaluate( 3 ) ).toBeCloseTo(  4 );

});

test("Cubic's static evaluation.", () => {
	
	const ps = [ 0, 1, 2, 3 ];
	const vs = [ 10, -1, 2, 4 ];
	const dim = 1;

	expect( Cubic.evaluate( ps, vs, dim, 0 ) ).toBeCloseTo( 10 );
	expect( Cubic.evaluate( ps, vs, dim, 1 ) ).toBeCloseTo( -1 );
	expect( Cubic.evaluate( ps, vs, dim, 2 ) ).toBeCloseTo(  2 );
	expect( Cubic.evaluate( ps, vs, dim, 3 ) ).toBeCloseTo(  4 );

});

test('Bicubic instance evaluation.', () => {
		
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

test('Bicubic static evaluation.', () => {
		
	const ps = [ 
		0, 0,
		1, 1,
		2, 2,
		3, 3
	];
	const vs = [ 
		10,  3,  7,  -6,
		 1, -8,  9,   4,
		 8, 13,  2,  77,
		12, -2, -7, -23
	];
	const dim = 1;

	expect( Bicubic.evaluate( ps, vs, dim, [0, 0] ) ).toBeCloseTo(  10 );
	expect( Bicubic.evaluate( ps, vs, dim, [1, 0] ) ).toBeCloseTo(   3 );
	expect( Bicubic.evaluate( ps, vs, dim, [2, 0] ) ).toBeCloseTo(   7 );
	expect( Bicubic.evaluate( ps, vs, dim, [3, 0] ) ).toBeCloseTo(  -6 );
	expect( Bicubic.evaluate( ps, vs, dim, [0, 1] ) ).toBeCloseTo(   1 );
	expect( Bicubic.evaluate( ps, vs, dim, [1, 1] ) ).toBeCloseTo(  -8 );
	expect( Bicubic.evaluate( ps, vs, dim, [2, 1] ) ).toBeCloseTo(   9 );
	expect( Bicubic.evaluate( ps, vs, dim, [3, 1] ) ).toBeCloseTo(   4 );
	expect( Bicubic.evaluate( ps, vs, dim, [0, 2] ) ).toBeCloseTo(   8 );
	expect( Bicubic.evaluate( ps, vs, dim, [1, 2] ) ).toBeCloseTo(  13 );
	expect( Bicubic.evaluate( ps, vs, dim, [2, 2] ) ).toBeCloseTo(   2 );
	expect( Bicubic.evaluate( ps, vs, dim, [3, 2] ) ).toBeCloseTo(  77 );
	expect( Bicubic.evaluate( ps, vs, dim, [0, 3] ) ).toBeCloseTo(  12 );
	expect( Bicubic.evaluate( ps, vs, dim, [1, 3] ) ).toBeCloseTo(  -2 );
	expect( Bicubic.evaluate( ps, vs, dim, [2, 3] ) ).toBeCloseTo(  -7 );
	expect( Bicubic.evaluate( ps, vs, dim, [3, 3] ) ).toBeCloseTo( -23 );

});

test('Tricubic instance evaluation.', () => {
	
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

test('Tricubic static evaluation.', () => {
	
	const ps = [ 
		0, 0, 0,
		1, 1, 1,
		2, 2, 2,
		3, 3, 3
	];
	const vs = [ 
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
	const dim = 1;

	expect( Tricubic.evaluate( ps, vs, dim, [0, 0, 0] ) ).toBeCloseTo(  0 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 0, 0] ) ).toBeCloseTo(  1 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 0, 0] ) ).toBeCloseTo(  2 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 0, 0] ) ).toBeCloseTo(  3 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 1, 0] ) ).toBeCloseTo(  4 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 1, 0] ) ).toBeCloseTo(  5 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 1, 0] ) ).toBeCloseTo(  6 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 1, 0] ) ).toBeCloseTo(  7 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 2, 0] ) ).toBeCloseTo(  8 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 2, 0] ) ).toBeCloseTo(  9 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 2, 0] ) ).toBeCloseTo( 10 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 2, 0] ) ).toBeCloseTo( 11 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 3, 0] ) ).toBeCloseTo( 12 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 3, 0] ) ).toBeCloseTo( 13 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 3, 0] ) ).toBeCloseTo( 14 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 3, 0] ) ).toBeCloseTo( 15 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 0, 1] ) ).toBeCloseTo( 16 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 0, 1] ) ).toBeCloseTo( 17 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 0, 1] ) ).toBeCloseTo( 18 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 0, 1] ) ).toBeCloseTo( 19 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 1, 1] ) ).toBeCloseTo( 20 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 1, 1] ) ).toBeCloseTo( 21 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 1, 1] ) ).toBeCloseTo( 22 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 1, 1] ) ).toBeCloseTo( 23 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 2, 1] ) ).toBeCloseTo( 24 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 2, 1] ) ).toBeCloseTo( 25 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 2, 1] ) ).toBeCloseTo( 26 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 2, 1] ) ).toBeCloseTo( 27 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 3, 1] ) ).toBeCloseTo( 28 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 3, 1] ) ).toBeCloseTo( 29 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 3, 1] ) ).toBeCloseTo( 30 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 3, 1] ) ).toBeCloseTo( 31 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 0, 2] ) ).toBeCloseTo( 32 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 0, 2] ) ).toBeCloseTo( 33 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 0, 2] ) ).toBeCloseTo( 34 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 0, 2] ) ).toBeCloseTo( 35 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 1, 2] ) ).toBeCloseTo( 36 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 1, 2] ) ).toBeCloseTo( 37 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 1, 2] ) ).toBeCloseTo( 38 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 1, 2] ) ).toBeCloseTo( 39 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 2, 2] ) ).toBeCloseTo( 40 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 2, 2] ) ).toBeCloseTo( 41 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 2, 2] ) ).toBeCloseTo( 42 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 2, 2] ) ).toBeCloseTo( 43 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 3, 2] ) ).toBeCloseTo( 44 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 3, 2] ) ).toBeCloseTo( 45 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 3, 2] ) ).toBeCloseTo( 46 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 3, 2] ) ).toBeCloseTo( 47 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 0, 3] ) ).toBeCloseTo( 48 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 0, 3] ) ).toBeCloseTo( 49 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 0, 3] ) ).toBeCloseTo( 50 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 0, 3] ) ).toBeCloseTo( 51 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 1, 3] ) ).toBeCloseTo( 52 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 1, 3] ) ).toBeCloseTo( 53 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 1, 3] ) ).toBeCloseTo( 54 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 1, 3] ) ).toBeCloseTo( 55 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 2, 3] ) ).toBeCloseTo( 56 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 2, 3] ) ).toBeCloseTo( 57 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 2, 3] ) ).toBeCloseTo( 58 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 2, 3] ) ).toBeCloseTo( 59 );

	expect( Tricubic.evaluate( ps, vs, dim, [0, 3, 3] ) ).toBeCloseTo( 60 );
	expect( Tricubic.evaluate( ps, vs, dim, [1, 3, 3] ) ).toBeCloseTo( 61 );
	expect( Tricubic.evaluate( ps, vs, dim, [2, 3, 3] ) ).toBeCloseTo( 62 );
	expect( Tricubic.evaluate( ps, vs, dim, [3, 3, 3] ) ).toBeCloseTo( 63 );

});
