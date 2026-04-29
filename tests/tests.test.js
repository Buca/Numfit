import { expect, test } from 'vitest';
import { 
	Linear, Bilinear, Trilinear,
	Quadratic, Biquadratic, Triquadratic,
	Cubic, Bicubic, Tricubic,
	SimplexLinear, TriangleLinear, TetrahedralLinear,
	InterpolationMesh, Mesh, Spline,
	Polynomial, Multipolynomial, Multilinear, Multiquadratic, Multicubic,
	InverseDistanceWeighting, IDW, RadialBasisFunction, RBF,
	CubicHermite, Hermite, QuinticHermite,
	PolynomialRegression, LinearRegression, RidgeRegression, RANSACRegression, crossValidateRegression
} from '../src/index.js';

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

test('Constructor rejects invalid dimensions and value counts.', () => {

	expect( () => new Linear( [ 0, 1 ], [ 0, 1 ], 0 ) ).toThrow( /dimension/ );
	expect( () => new Linear( [ 0, 1 ], [ 0, 1, 2 ], 1 ) ).toThrow( /expects 2 values/ );
	expect( () => new Bilinear( [ 0, 0, 1, 1 ], [ 0, 1, 2 ], 1 ) ).toThrow( /expects 4 values/ );

});

test('Constructor rejects malformed and duplicate control positions.', () => {

	expect( () => new Linear( [ 0, 0 ], [ 0, 1 ] ) ).toThrow( /unique/ );
	expect( () => new Quadratic( [ 0, 1 ], [ 0, 1, 2 ] ) ).toThrow( /expects 3 position values/ );
	expect( () => new Linear( [ 0, Number.NaN ], [ 0, 1 ] ) ).toThrow( /finite numbers/ );

});

test('Static evaluation rejects invalid source grids.', () => {

	expect( () => Linear.evaluate( [ 0, 0 ], [ 0, 1 ], 1, .5 ) ).toThrow( /unique/ );
	expect( () => Bilinear.evaluate( [ 0, 0, 1, 1 ], [ 0, 1, 2 ], 1, [ .5, .5 ] ) ).toThrow( /expects 4 values/ );

});

test('Sampler functions reject invalid sampling inputs.', () => {

	const linear = new Linear( [ 0, 1 ], [ 0, 1 ] );
	const bilinear = new Bilinear( [ 0, 0, 1, 1 ], [ 0, 1, 2, 3 ] );

	expect( () => linear.step( 0, 1, 0 ) ).toThrow( /non-zero/ );
	expect( () => linear.segment( 0, 1, 1 ) ).toThrow( /greater than or equal to 2/ );
	expect( () => bilinear.map( [ 0, 0, 1 ] ) ).toThrow( /divisible by 2/ );
	expect( () => bilinear.evaluate( [ 0 ] ) ).toThrow( /at least 2/ );

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

test("Grid sampler returns positions, values, and shape metadata.", () => {

	const bilinear = new Bilinear(
		[ 0, 0, 1, 1 ],
		[ 0, 1, 2, 3 ]
	);
	const grid = bilinear.grid({
		start: [ 0, 0 ],
		end: [ 1, 1 ],
		shape: [ 3, 3 ]
	});

	expect( grid.shape ).toEqual([ 3, 3 ]);
	expect( grid.positions ).toBeInstanceOf( Array );
	expect( grid.values.length ).toBe( 9 );
	expect( Array.from( grid.values ) ).toEqual( Array.from( bilinear.segment( [ 0, 0 ], [ 1, 1 ], [ 3, 3 ] ) ) );

});

test("Slice sampler samples lower-dimensional cuts.", () => {

	const trilinear = new Trilinear(
		[ 0, 0, 0, 1, 1, 1 ],
		[ 0, 1, 2, 3, 4, 5, 6, 7 ]
	);
	const slice = trilinear.slice({
		axes: [ 0, 1 ],
		fixed: { 2: .5 },
		start: [ 0, 0 ],
		end: [ 1, 1 ],
		shape: [ 2, 2 ]
	});

	expect( slice.positions.length ).toBe( 12 );
	expect( slice.values.length ).toBe( 4 );
	expect( slice.values[ 0 ] ).toBeCloseTo( trilinear.evaluate([ 0, 0, .5 ]) );
	expect( slice.values[ 3 ] ).toBeCloseTo( trilinear.evaluate([ 1, 1, .5 ]) );

});

test("Random sampler is seeded and evaluates generated positions.", () => {

	const linear = new Linear( [ 0, 1 ], [ 0, 10 ] );
	const first = linear.random( 4, {
		min: 0,
		max: 1,
		seed: 123
	});
	const second = linear.random( 4, {
		min: 0,
		max: 1,
		seed: 123
	});

	expect( Array.from( first.positions ) ).toEqual( Array.from( second.positions ) );
	expect( first.values[ 0 ] ).toBeCloseTo( first.positions[ 0 ] * 10 );
	expect( first.values[ 3 ] ).toBeCloseTo( first.positions[ 3 ] * 10 );

});

test("Latin hypercube sampler stratifies each axis.", () => {

	const bilinear = new Bilinear(
		[ 0, 0, 1, 1 ],
		[ 0, 1, 2, 3 ]
	);
	const sample = bilinear.latinHypercube( 4, {
		min: [ 0, 0 ],
		max: [ 1, 1 ],
		seed: 10
	});
	const xBins = new Set();
	const yBins = new Set();

	for ( let i = 0; i < sample.positions.length; i += 2 ) {

		xBins.add( Math.floor( sample.positions[ i ] * 4 ) );
		yBins.add( Math.floor( sample.positions[ i + 1 ] * 4 ) );

	}

	expect( xBins.size ).toBe( 4 );
	expect( yBins.size ).toBe( 4 );
	expect( sample.values.length ).toBe( 4 );

});

test("Poisson disk sampler is seeded and keeps minimum spacing.", () => {

	const bilinear = new Bilinear(
		[ 0, 0, 1, 1 ],
		[ 0, 1, 2, 3 ]
	);
	const first = bilinear.poissonDisk({
		min: [ 0, 0 ],
		max: [ 1, 1 ],
		radius: .2,
		seed: 99
	});
	const second = bilinear.poissonDisk({
		min: [ 0, 0 ],
		max: [ 1, 1 ],
		radius: .2,
		seed: 99
	});

	expect( Array.from( first.positions ) ).toEqual( Array.from( second.positions ) );
	expect( first.values.length ).toBe( first.positions.length / 2 );
	expect( first.positions.length ).toBeGreaterThan( 2 );

	for ( let i = 0; i < first.positions.length; i += 2 ) {

		for ( let j = i + 2; j < first.positions.length; j += 2 ) {

			const dx = first.positions[ i ] - first.positions[ j ];
			const dy = first.positions[ i + 1 ] - first.positions[ j + 1 ];

			expect( Math.sqrt( dx * dx + dy * dy ) ).toBeGreaterThanOrEqual( .2 - 1e-12 );

		}

	}

});

test("Poisson disk sampler supports target count radius estimation.", () => {

	const bilinear = new Bilinear(
		[ 0, 0, 1, 1 ],
		[ 0, 1, 2, 3 ]
	);
	const sample = bilinear.poissonDisk({
		min: [ 0, 0 ],
		max: [ 1, 1 ],
		count: 12,
		seed: 2
	});

	expect( sample.positions.length / 2 ).toBeLessThanOrEqual( 12 );
	expect( sample.radius ).toBeGreaterThan( 0 );

});

test("Poisson disk sampler works for 1D interpolation.", () => {

	const linear = new Linear( [ 0, 1 ], [ 0, 10 ] );
	const sample = linear.poissonDisk({
		min: 0,
		max: 1,
		radius: .2,
		seed: 7
	});

	expect( sample.positions.length ).toBeGreaterThan( 1 );

	for ( let i = 1; i < sample.positions.length; i ++ ) {

		for ( let j = 0; j < i; j ++ ) {

			expect( Math.abs( sample.positions[ i ] - sample.positions[ j ] ) ).toBeGreaterThanOrEqual( .2 - 1e-12 );

		}

	}

});

test("Adaptive sampler refines nonlinear 1D interpolation.", () => {

	const quadratic = new Quadratic( [ 0, .5, 1 ], [ 0, .25, 1 ] );
	const sample = quadratic.adaptive( 0, 1, {
		tolerance: .01,
		maxDepth: 8
	});

	expect( sample.positions.length ).toBeGreaterThan( 2 );
	expect( sample.positions[ 0 ] ).toBeCloseTo( 0 );
	expect( sample.positions[ sample.positions.length - 1 ] ).toBeCloseTo( 1 );
	expect( sample.values[ sample.values.length - 1 ] ).toBeCloseTo( 1 );

});

test("Stream sampler yields grid chunks.", async () => {

	const linear = new Linear( [ 0, 1 ], [ 0, 10 ] );
	const chunks = [];

	for await ( const chunk of linear.stream({
		start: 0,
		end: 1,
		shape: 5,
		chunkSize: 2,
		mapOptions: { workers: 1 }
	}) ) {

		chunks.push( chunk );

	}

	expect( chunks.length ).toBe( 3 );
	expect( chunks[ 0 ].offset ).toBe( 0 );
	expect( Array.from( chunks[ 0 ].values ) ).toEqual([ 0, 2.5 ]);
	expect( Array.from( chunks[ 2 ].values ) ).toEqual([ 10 ]);

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

	linear.segment( -2, 2, 9, ( position, value ) => {

		expect( value ).toBeCloseTo( vs[ i ++ ] );

	});

	expect( i ).toBe( vs.length );
	
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

test("Evaluator's async map function can use worker threads.", async () => {

	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );
	const ps = [ -2, -1.5, -1, -.5, 0, .5, 1, 1.5, 2 ];

	const sync = linear.map( ps );
	const async = await linear.mapAsync( ps, { workers: 2, threshold: 0 } );

	expect( Array.from( async ) ).toEqual( Array.from( sync ) );

});

test("Evaluator's async map function falls back to synchronous evaluation.", async () => {

	const positions = [ -2, 2 ];
	const values = [ -4, 4 ];
	const linear = new Linear( positions, values );
	const ps = [ -2, -1.5, -1, -.5, 0, .5, 1, 1.5, 2 ];

	const sync = linear.map( ps );
	const async = await linear.mapAsync( ps, { workers: 1, threshold: 0 } );

	expect( Array.from( async ) ).toEqual( Array.from( sync ) );

});

test("Evaluator's async map function preserves typed array output.", async () => {

	const positions = new Float64Array([ 0, 0, 1, 1 ]);
	const values = new Float64Array([
		255,0,0,255, 0,255,0,255,
		0,0,255,255, 255,0,0,255
	]);
	const bilinear = new Bilinear( positions, values, 4 );
	const ps = new Float64Array([ 0,0, .5,0, 1,0, 0,.5, .5,.5, 1,.5, 0,1, .5,1, 1,1 ]);

	const sync = bilinear.map( ps );
	const async = await bilinear.mapAsync( ps, { workers: 3, threshold: 0 } );

	expect( async ).toBeInstanceOf( Float64Array );
	expect( Array.from( async ) ).toEqual( Array.from( sync ) );

});

test("Evaluator's async map function refreshes worker cache after update.", async () => {

	const linear = new Linear( [ 0, 1 ], [ 0, 10 ] );
	const ps = [ 0, .5, 1 ];

	const before = await linear.mapAsync( ps, { workers: 2, threshold: 0, idleTimeout: 500 } );

	linear.values[ 1 ] = 20;
	linear.update();

	const after = await linear.mapAsync( ps, { workers: 2, threshold: 0, idleTimeout: 500 } );

	expect( Array.from( before ) ).toEqual([ 0, 5, 10 ]);
	expect( Array.from( after ) ).toEqual([ 0, 10, 20 ]);

});

test("Evaluator's async map function uses an adaptive default policy.", async () => {

	const { getParallelPlan } = await import( '../src/Parallel.js' );
	const linear = new Linear( [ 0, 1 ], [ 0, 10 ] );
	const tricubic = new Tricubic(
		[ 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3 ],
		Array.from( { length: 64 }, ( _, i ) => i )
	);

	expect( getParallelPlan( linear, 1000, {}, 8 ).parallel ).toBe( false );
	expect( getParallelPlan( tricubic, 50000, {}, 8 ).parallel ).toBe( true );
	expect( getParallelPlan( tricubic, 50000, {}, 8 ).workers ).toBe( 2 );
	expect( getParallelPlan( tricubic, 500000, {}, 8 ).workers ).toBe( 4 );

});

test("Evaluator's async map function keeps explicit worker overrides.", async () => {

	const { getParallelPlan } = await import( '../src/Parallel.js' );
	const linear = new Linear( [ 0, 1 ], [ 0, 10 ] );

	expect( getParallelPlan( linear, 9, { workers: 2, threshold: 0 }, 8 ).parallel ).toBe( true );
	expect( getParallelPlan( linear, 9, { workers: 1, threshold: 0 }, 8 ).parallel ).toBe( false );
	expect( getParallelPlan( linear, 9, { workers: 99, threshold: 0 }, 8 ).workers ).toBe( 8 );

});

test("Evaluator's async map function detects Node's available worker count.", async () => {

	const { availableParallelism } = await import( 'node:os' );
	const { getDefaultWorkerCount, getParallelPlan } = await import( '../src/Parallel.js' );
	const linear = new Linear( [ 0, 1 ], [ 0, 10 ] );
	const workerCount = await getDefaultWorkerCount();
	const expectedWorkerCount = Math.max( 1, availableParallelism() - 1 );

	expect( workerCount ).toBe( expectedWorkerCount );

	const plan = getParallelPlan( linear, expectedWorkerCount + 1, {
		workers: expectedWorkerCount,
		threshold: 0
	}, workerCount );

	expect( plan.workers ).toBe( expectedWorkerCount );

});

test("TensorPolynomial async map can use worker threads.", async () => {

	const polynomial = new Multipolynomial(
		new Float64Array([ 0,0, 1,1, 2,2 ]),
		new Float64Array([
			0, 1, 4,
			1, 2, 5,
			4, 5, 8
		]),
		1,
		2,
		2
	);
	const ps = new Float64Array([ 0,0, .5,.5, 1,1, 1.5,1.5, 2,2 ]);
	const sync = polynomial.map( ps );
	const async = await polynomial.mapAsync( ps, {
		workers: 2,
		threshold: 0,
		idleTimeout: 500
	});

	expect( async ).toBeInstanceOf( Float64Array );
	expect( Array.from( async ) ).toEqual( Array.from( sync ) );

});

test("TensorPolynomial async map supports vector outputs.", async () => {

	const multilinear = new Multilinear(
		new Float64Array([ 0,0, 1,1 ]),
		new Float64Array([
			0,0, 1,0,
			0,1, 1,1
		]),
		2
	);
	const ps = new Float64Array([ 0,0, .5,.5, 1,1 ]);
	const sync = multilinear.map( ps );
	const async = await multilinear.mapAsync( ps, {
		workers: 2,
		threshold: 0,
		idleTimeout: 500
	});

	expect( async ).toBeInstanceOf( Float64Array );
	expect( Array.from( async ) ).toEqual( Array.from( sync ) );

});

test("TensorPolynomial async map sends fresh values to workers.", async () => {

	const multilinear = new Multilinear(
		new Float64Array([ 0, 1 ]),
		new Float64Array([ 0, 10 ])
	);
	const ps = new Float64Array([ 0, .5, 1 ]);
	const before = await multilinear.mapAsync( ps, {
		workers: 2,
		threshold: 0,
		idleTimeout: 500
	});

	multilinear.values[ 1 ] = 20;

	const after = await multilinear.mapAsync( ps, {
		workers: 2,
		threshold: 0,
		idleTimeout: 500
	});

	expect( Array.from( before ) ).toEqual([ 0, 5, 10 ]);
	expect( Array.from( after ) ).toEqual([ 0, 10, 20 ]);

});

test("TensorPolynomial async map uses an adaptive default policy.", async () => {

	const { getTensorPolynomialParallelPlan } = await import( '../src/Parallel.js' );
	const multilinear = new Multilinear(
		new Float64Array([ 0,0, 1,1 ]),
		new Float64Array([ 0, 1, 2, 3 ])
	);
	const multipolynomial = new Multipolynomial(
		new Float64Array([ 0,0,0, 1,1,1, 2,2,2, 3,3,3 ]),
		new Float64Array( 64 ).fill( 1 ),
		1,
		3,
		3
	);

	expect( getTensorPolynomialParallelPlan( multilinear, 1000, {}, 8 ).parallel ).toBe( false );
	expect( getTensorPolynomialParallelPlan( multipolynomial, 50000, {}, 8 ).parallel ).toBe( true );
	expect( getTensorPolynomialParallelPlan( multipolynomial, 500000, {}, 8 ).workers ).toBe( 4 );

});

test("InverseDistanceWeighting supports object-style construction and exact hits.", () => {

	const idw = new InverseDistanceWeighting({
		positions: new Float64Array([
			0, 0,
			1, 0,
			0, 1,
			1, 1
		]),
		values: new Float64Array([ 0, 10, 20, 30 ]),
		variables: 2,
		power: 2
	});

	expect( idw ).toBeInstanceOf( IDW );
	expect( idw.evaluate([ 1, 0 ]) ).toBeCloseTo( 10 );
	expect( idw.evaluate([ .5, .5 ]) ).toBeCloseTo( 15 );

});

test("InverseDistanceWeighting supports positional construction and map.", () => {

	const idw = new InverseDistanceWeighting(
		[ 0, 1 ],
		[ 0, 10 ],
		1,
		1,
		{ power: 2 }
	);
	const values = idw.map([ 0, .5, 1 ]);

	expect( Array.from( values ) ).toEqual([ 0, 5, 10 ]);
	expect( InverseDistanceWeighting.evaluate(
		[ 0, 1 ],
		[ 0, 10 ],
		1,
		1,
		{ power: 2 },
		.5
	) ).toBeCloseTo( 5 );

});

test("InverseDistanceWeighting supports vector-valued outputs.", () => {

	const idw = new InverseDistanceWeighting({
		positions: new Float64Array([
			0, 0,
			1, 0
		]),
		values: new Float64Array([
			0, 0,
			10, 20
		]),
		variables: 2,
		dimension: 2
	});
	const value = idw.evaluate([ .5, 0 ]);

	expect( value ).toBeInstanceOf( Float64Array );
	expect( value[ 0 ] ).toBeCloseTo( 5 );
	expect( value[ 1 ] ).toBeCloseTo( 10 );

});

test("InverseDistanceWeighting supports radius and nearest-neighbor limits.", () => {

	const idw = new InverseDistanceWeighting({
		positions: [ 0, 1, 10 ],
		values: [ 0, 10, 100 ],
		variables: 1,
		radius: 2
	});

	expect( idw.evaluate( .5 ) ).toBeCloseTo( 5 );
	expect( () => idw.evaluate( 6 ) ).toThrow( /radius/ );

	const nearest = new InverseDistanceWeighting({
		positions: [ 0, 1, 2 ],
		values: [ 0, 10, 100 ],
		variables: 1,
		neighbors: 1
	});

	expect( nearest.evaluate( 1.6 ) ).toBeCloseTo( 100 );

});

test("InverseDistanceWeighting empty mode defaults to throwing.", () => {

	const idw = new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1,
		radius: .1
	});

	expect( () => idw.evaluate( .5 ) ).toThrow( /radius/ );

});

test("InverseDistanceWeighting empty nearest mode returns closest sample.", () => {

	const idw = new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1,
		radius: .1,
		empty: 'nearest'
	});

	expect( idw.evaluate( .6 ) ).toBeCloseTo( 10 );
	expect( Array.from( idw.map([ .4, .6 ]) ) ).toEqual([ 0, 10 ]);

});

test("InverseDistanceWeighting empty constant mode supports scalar and vector fallback.", () => {

	const scalar = new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1,
		radius: .1,
		empty: -1
	});
	const vector = new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 0, 10, 20 ],
		variables: 1,
		dimension: 2,
		radius: .1,
		empty: [ -1, -2 ]
	});

	expect( scalar.evaluate( .5 ) ).toBeCloseTo( -1 );
	expect( Array.from( scalar.map([ .5 ]) ) ).toEqual([ -1 ]);

	const value = vector.evaluate( .5 );

	expect( value[ 0 ] ).toBeCloseTo( -1 );
	expect( value[ 1 ] ).toBeCloseTo( -2 );
	expect( Array.from( vector.map([ .5 ]) ) ).toEqual([ -1, -2 ]);

});

test("InverseDistanceWeighting empty undefined and null modes support direct evaluate.", () => {

	const undefinedMode = new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1,
		radius: .1,
		empty: 'undefined'
	});
	const nullMode = new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1,
		radius: .1,
		empty: 'null'
	});

	expect( undefinedMode.evaluate( .5 ) ).toBeUndefined();
	expect( nullMode.evaluate( .5 ) ).toBeNull();
	expect( Number.isNaN( undefinedMode.map([ .5 ])[ 0 ] ) ).toBe( true );
	expect( Number.isNaN( nullMode.map([ .5 ])[ 0 ] ) ).toBe( true );

});

test("InverseDistanceWeighting grid index matches linear radius lookup.", () => {

	const positions = new Float64Array([
		0, 0,
		1, 0,
		0, 1,
		1, 1,
		.5, .5
	]);
	const values = new Float64Array([ 0, 10, 20, 30, 15 ]);
	const linear = new InverseDistanceWeighting({
		positions,
		values,
		variables: 2,
		radius: .8,
		neighbors: 3
	});
	const indexed = new InverseDistanceWeighting({
		positions,
		values,
		variables: 2,
		radius: .8,
		neighbors: 3,
		index: 'grid',
		resolution: 4
	});
	const samples = new Float64Array([
		.25, .25,
		.75, .25,
		.25, .75,
		.75, .75
	]);

	expect( indexed.index.resolution ).toEqual([ 4, 4 ]);
	expect( Array.from( indexed.map( samples ) ) ).toEqual( Array.from( linear.map( samples ) ) );

});

test("InverseDistanceWeighting grid index supports nearest empty fallback.", () => {

	const idw = new InverseDistanceWeighting({
		positions: [ 0, 0, 10, 0 ],
		values: [ 0, 100 ],
		variables: 2,
		radius: .1,
		empty: 'nearest',
		index: 'grid',
		resolution: [ 2, 1 ]
	});

	expect( idw.evaluate([ 9, 0 ]) ).toBeCloseTo( 100 );
	expect( idw.evaluate([ 1, 0 ]) ).toBeCloseTo( 0 );

});

test("InverseDistanceWeighting rebuildIndex refreshes mutated positions.", () => {

	const idw = new InverseDistanceWeighting({
		positions: new Float64Array([ 0, 0, 10, 0 ]),
		values: new Float64Array([ 0, 100 ]),
		variables: 2,
		radius: .5,
		index: 'grid',
		resolution: 4
	});

	expect( idw.evaluate([ 10, 0 ]) ).toBeCloseTo( 100 );

	idw.positions[ 2 ] = 2;
	idw.rebuildIndex();

	expect( idw.evaluate([ 2, 0 ]) ).toBeCloseTo( 100 );
	expect( () => idw.evaluate([ 10, 0 ]) ).toThrow( /radius/ );

});

test("InverseDistanceWeighting validates grid index options.", () => {

	expect( () => new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1,
		index: 'tree'
	}) ).toThrow( /Unsupported IDW index mode/ );

	expect( () => new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1,
		index: 'grid',
		resolution: 0
	}) ).toThrow( /resolution/ );

});

test("InverseDistanceWeighting rejects invalid empty modes.", () => {

	expect( () => new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1,
		empty: [ 1, 2 ]
	}) ).toThrow( /empty fallback array/ );

	expect( () => new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1,
		empty: 'mean'
	}) ).toThrow( /empty must/ );

});

test("InverseDistanceWeighting exposes sampler helpers.", async () => {

	const idw = new InverseDistanceWeighting({
		positions: [ 0, 1 ],
		values: [ 0, 10 ],
		variables: 1
	});
	const grid = idw.grid({
		start: 0,
		end: 1,
		shape: 3
	});
	const random = idw.random( 4, { seed: 1 });
	const async = await idw.mapAsync([ 0, .5, 1 ]);

	expect( Array.from( grid.values ) ).toEqual([ 0, 5, 10 ]);
	expect( random.positions.length ).toBe( 4 );
	expect( Array.from( async ) ).toEqual([ 0, 5, 10 ]);

});

test("RadialBasisFunction supports object-style construction and exact interpolation.", () => {

	const rbf = new RadialBasisFunction({
		positions: new Float64Array([
			0, 0,
			1, 0,
			0, 1
		]),
		values: new Float64Array([ 0, 10, 20 ]),
		variables: 2,
		kernel: 'gaussian',
		epsilon: 1
	});

	expect( rbf ).toBeInstanceOf( RBF );
	expect( rbf.evaluate([ 0, 0 ]) ).toBeCloseTo( 0 );
	expect( rbf.evaluate([ 1, 0 ]) ).toBeCloseTo( 10 );
	expect( rbf.evaluate([ 0, 1 ]) ).toBeCloseTo( 20 );

});

test("RadialBasisFunction supports positional construction and static evaluation.", () => {

	const rbf = new RadialBasisFunction(
		[ 0, 1 ],
		[ 0, 10 ],
		1,
		1,
		{ kernel: 'linear' }
	);

	expect( rbf.evaluate( 0 ) ).toBeCloseTo( 0 );
	expect( rbf.evaluate( 1 ) ).toBeCloseTo( 10 );
	expect( RadialBasisFunction.evaluate(
		[ 0, 1 ],
		[ 0, 10 ],
		1,
		1,
		{ kernel: 'linear' },
		1
	) ).toBeCloseTo( 10 );

});

test("RadialBasisFunction supports all built-in kernels.", () => {

	for ( const kernel of [
		'gaussian',
		'multiquadric',
		'inverse-multiquadric',
		'linear',
		'cubic',
		'thin-plate'
	] ) {

		const rbf = new RadialBasisFunction({
			positions: [ 0, 1, 2 ],
			values: [ 0, 1, 0 ],
			variables: 1,
			kernel,
			epsilon: 1
		});

		expect( rbf.evaluate( 0 ) ).toBeCloseTo( 0 );
		expect( rbf.evaluate( 1 ) ).toBeCloseTo( 1 );
		expect( rbf.evaluate( 2 ) ).toBeCloseTo( 0 );

	}

});

test("RadialBasisFunction supports vector-valued outputs.", () => {

	const rbf = new RadialBasisFunction({
		positions: new Float64Array([ 0, 1 ]),
		values: new Float64Array([
			0, 0,
			10, 20
		]),
		variables: 1,
		dimension: 2,
		kernel: 'gaussian'
	});
	const value = rbf.evaluate( 1 );

	expect( value ).toBeInstanceOf( Float64Array );
	expect( value[ 0 ] ).toBeCloseTo( 10 );
	expect( value[ 1 ] ).toBeCloseTo( 20 );

});

test("RadialBasisFunction supports smoothing and sampler helpers.", async () => {

	const rbf = new RadialBasisFunction({
		positions: [ 0, 1, 2 ],
		values: [ 0, 1, 0 ],
		variables: 1,
		kernel: 'gaussian',
		smoothing: .1
	});
	const mapped = rbf.map([ 0, 1, 2 ]);
	const async = await rbf.mapAsync([ 0, 1, 2 ]);
	const grid = rbf.grid({
		start: 0,
		end: 2,
		shape: 3
	});

	expect( mapped.length ).toBe( 3 );
	expect( Array.from( async ) ).toEqual( Array.from( mapped ) );
	expect( Array.from( grid.values ) ).toEqual( Array.from( mapped ) );

});

test("RadialBasisFunction rejects malformed inputs and options.", () => {

	expect( () => new RadialBasisFunction({
		positions: [ 0, 1 ],
		values: [ 0 ],
		variables: 1
	}) ).toThrow( /expects 2 values/ );

	expect( () => new RadialBasisFunction({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		variables: 1,
		kernel: 'magic'
	}) ).toThrow( /Unsupported RBF kernel/ );

	expect( () => new RadialBasisFunction({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		variables: 1,
		epsilon: 0
	}) ).toThrow( /epsilon/ );

	expect( () => new RadialBasisFunction({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		variables: 1,
		smoothing: -1
	}) ).toThrow( /smoothing/ );

});

test("LinearRegression fits a 1D line.", () => {

	const regression = new LinearRegression({
		positions: new Float64Array([ 0, 1, 2, 3 ]),
		values: new Float64Array([ 1, 3, 5, 7 ])
	});

	expect( regression ).toBeInstanceOf( PolynomialRegression );
	expect( regression.evaluate( 4 ) ).toBeCloseTo( 9 );
	expect( regression.predict( 4 ) ).toBeCloseTo( 9 );
	expect( regression.mse() ).toBeCloseTo( 0 );
	expect( regression.r2() ).toBeCloseTo( 1 );

});

test("PolynomialRegression fits a quadratic curve.", () => {

	const regression = new PolynomialRegression({
		positions: [ -2, -1, 0, 1, 2 ],
		values: [ 4, 1, 0, 1, 4 ],
		degree: 2
	});

	expect( regression.evaluate( 3 ) ).toBeCloseTo( 9 );
	expect( regression.coefficients.length ).toBe( 3 );

});

test("PolynomialRegression fits multivariate polynomial terms.", () => {

	const positions = [];
	const values = [];

	for ( const x of [ 0, 1, 2 ] ) {

		for ( const y of [ 0, 1, 2 ] ) {

			positions.push( x, y );
			values.push( 1 + 2 * x + 3 * y + x * y );

		}

	}

	const regression = new PolynomialRegression({
		positions,
		values,
		variables: 2,
		degree: 2
	});

	expect( regression.evaluate([ 3, 4 ]) ).toBeCloseTo( 1 + 2 * 3 + 3 * 4 + 3 * 4 );

});

test("PolynomialRegression supports vector-valued output.", () => {

	const regression = new PolynomialRegression({
		positions: new Float64Array([ 0, 1, 2 ]),
		values: new Float64Array([
			1, 2,
			3, 4,
			5, 6
		]),
		dimension: 2,
		degree: 1
	});
	const value = regression.evaluate( 3 );

	expect( value ).toBeInstanceOf( Float64Array );
	expect( value[ 0 ] ).toBeCloseTo( 7 );
	expect( value[ 1 ] ).toBeCloseTo( 8 );

});

test("PolynomialRegression exposes residuals, score, map, and samplers.", async () => {

	const regression = new PolynomialRegression({
		positions: [ 0, 1, 2 ],
		values: [ 1, 3, 5 ],
		degree: 1
	});
	const mapped = regression.map([ 0, 1, 2 ]);
	const async = await regression.mapAsync([ 0, 1, 2 ]);
	const grid = regression.grid({
		start: 0,
		end: 2,
		shape: 3
	});

	expect( Array.from( regression.residuals() ) ).toEqual([ 0, 0, 0 ]);
	expect( regression.score() ).toBeCloseTo( 1 );
	expect( Array.from( mapped ) ).toEqual([ 1, 3, 5 ]);
	expect( Array.from( async ) ).toEqual([ 1, 3, 5 ]);
	expect( Array.from( grid.values ) ).toEqual([ 1, 3, 5 ]);

});

test("PolynomialRegression exposes regression diagnostics.", () => {

	const regression = new LinearRegression({
		positions: [ 0, 1, 2 ],
		values: [ 1, 3, 6 ]
	});
	const summary = regression.summary();

	expect( Array.from( regression.residuals() ) ).toEqual( Array.from( regression.residuals() ) );
	expect( regression.rss() ).toBeCloseTo( 1 / 6 );
	expect( regression.tss() ).toBeCloseTo( 38 / 3 );
	expect( regression.mse() ).toBeCloseTo( 1 / 18 );
	expect( regression.rmse() ).toBeCloseTo( Math.sqrt( 1 / 18 ) );
	expect( regression.mae() ).toBeCloseTo( 2 / 9 );
	expect( regression.r2() ).toBeCloseTo( 1 - ( 1 / 6 ) / ( 38 / 3 ) );
	expect( Number.isFinite( regression.aic() ) ).toBe( true );
	expect( Number.isFinite( regression.bic() ) ).toBe( true );
	expect( summary.model ).toBe( 'LinearRegression' );
	expect( summary.samples ).toBe( 3 );
	expect( summary.coefficients.length ).toBe( regression.coefficients.length );
	expect( summary.rmse ).toBeCloseTo( regression.rmse() );

});

test("PolynomialRegression diagnostics handle perfect fits.", () => {

	const regression = new LinearRegression({
		positions: [ 0, 1, 2 ],
		values: [ 1, 3, 5 ]
	});

	expect( regression.rss() ).toBeCloseTo( 0 );
	expect( regression.rmse() ).toBeCloseTo( 0 );
	expect( regression.mae() ).toBeCloseTo( 0 );
	expect( regression.aic() ).toBe( Number.NEGATIVE_INFINITY );
	expect( regression.bic() ).toBe( Number.NEGATIVE_INFINITY );

});

test("PolynomialRegression exposes leverage and influence diagnostics.", () => {

	const regression = new LinearRegression({
		positions: [ 0, 1, 2, 3 ],
		values: [ 1, 3, 5, 8 ]
	});
	const leverage = regression.leverage();
	const studentized = regression.studentizedResiduals();
	const cooks = regression.cooksDistance();
	const influence = regression.influence();

	expect( Array.from( leverage ) ).toEqual( Array.from( influence.leverage ) );
	expect( leverage[ 0 ] ).toBeCloseTo( .7 );
	expect( leverage[ 1 ] ).toBeCloseTo( .3 );
	expect( leverage[ 2 ] ).toBeCloseTo( .3 );
	expect( leverage[ 3 ] ).toBeCloseTo( .7 );
	expect( studentized.length ).toBe( 4 );
	expect( cooks.length ).toBe( 4 );
	expect( cooks[ 3 ] ).toBeGreaterThan( cooks[ 1 ] );
	expect( Array.from( regression.leverage([ .5, 1.5 ]) ).length ).toBe( 2 );

});

test("PolynomialRegression influence diagnostics support weights and ridge regularization.", () => {

	const weighted = new LinearRegression({
		positions: [ 0, 1, 2 ],
		values: [ 1, 3, 5 ],
		weights: [ 1, 0, 1 ],
		regularization: .1
	});
	const leverage = weighted.leverage();
	const cooks = weighted.cooksDistance();

	expect( leverage[ 1 ] ).toBeCloseTo( 0 );
	expect( leverage[ 0 ] ).toBeGreaterThan( 0 );
	expect( cooks[ 1 ] ).toBeCloseTo( 0 );

});

test("RidgeRegression applies regularization.", () => {

	const ordinary = new PolynomialRegression({
		positions: [ 0, 1, 2 ],
		values: [ 1, 3, 5 ],
		degree: 1
	});
	const ridge = new RidgeRegression({
		positions: [ 0, 1, 2 ],
		values: [ 1, 3, 5 ],
		degree: 1,
		regularization: 10
	});

	expect( Math.abs( ridge.evaluate( 2 ) - 5 ) ).toBeGreaterThan( Math.abs( ordinary.evaluate( 2 ) - 5 ) );

});

test("PolynomialRegression supports weighted least squares.", () => {

	const weighted = new PolynomialRegression({
		positions: [ 0, 1, 2, 3 ],
		values: [ 0, 1, 100, 3 ],
		weights: [ 1, 1, 0, 1 ],
		degree: 1
	});

	expect( weighted.evaluate( 2 ) ).toBeCloseTo( 2 );
	expect( weighted.iterations ).toBe( 1 );

});

test("PolynomialRegression supports Huber IRLS robust fitting.", () => {

	const ordinary = new PolynomialRegression({
		positions: [ 0, 1, 2, 3, 4 ],
		values: [ 1, 3, 5, 100, 9 ],
		degree: 1
	});
	const robust = new PolynomialRegression({
		positions: [ 0, 1, 2, 3, 4 ],
		values: [ 1, 3, 5, 100, 9 ],
		degree: 1,
		robust: 'huber',
		delta: 1,
		maxIterations: 30,
		tolerance: 1e-10
	});

	expect( Math.abs( robust.evaluate( 4 ) - 9 ) ).toBeLessThan( Math.abs( ordinary.evaluate( 4 ) - 9 ) );
	expect( robust.iterations ).toBeGreaterThan( 1 );

});

test("RANSACRegression rejects outliers and refits on inliers.", () => {

	const ordinary = new LinearRegression({
		positions: [ 0, 1, 2, 3, 4, 5 ],
		values: [ 1, 3, 5, 100, 9, 11 ]
	});
	const ransac = new RANSACRegression({
		model: LinearRegression,
		positions: [ 0, 1, 2, 3, 4, 5 ],
		values: [ 1, 3, 5, 100, 9, 11 ],
		threshold: .25,
		iterations: 80,
		seed: 7
	});

	expect( ransac.bestModel ).toBeInstanceOf( LinearRegression );
	expect( Array.from( ransac.outliers ) ).toEqual([ 3 ]);
	expect( ransac.inliers.length ).toBe( 5 );
	expect( ransac.inlierMask ).toEqual([ true, true, true, false, true, true ]);
	expect( ransac.evaluate( 6 ) ).toBeCloseTo( 13 );
	expect( Math.abs( ransac.evaluate( 5 ) - 11 ) ).toBeLessThan( Math.abs( ordinary.evaluate( 5 ) - 11 ) );
	expect( ransac.summary().outliers ).toBe( 1 );
	expect( ransac.rmse() ).toBeGreaterThan( 0 );
	expect( ransac.influence().leverage.length ).toBe( 6 );

});

test("RANSACRegression supports vector-valued models and samplers.", () => {

	const ransac = new RANSACRegression({
		model: PolynomialRegression,
		positions: [ 0, 1, 2, 3, 4 ],
		values: [
			1, 2,
			3, 4,
			5, 6,
			100, 100,
			9, 10
		],
		dimension: 2,
		degree: 1,
		threshold: .5,
		iterations: 100,
		seed: 3
	});
	const value = ransac.evaluate( 5 );
	const mapped = ransac.map([ 0, 1 ]);
	const grid = ransac.grid({
		start: 0,
		end: 1,
		shape: 2
	});

	expect( value[ 0 ] ).toBeCloseTo( 11 );
	expect( value[ 1 ] ).toBeCloseTo( 12 );
	expect( Array.from( ransac.outliers ) ).toEqual([ 3 ]);
	expect( Array.from( mapped ) ).toEqual([ 1, 2, 3, 4 ]);
	expect( Array.from( grid.values ) ).toEqual([ 1, 2, 3, 4 ]);

});

test("PolynomialRegression supports normalized input fitting.", () => {

	const regression = new PolynomialRegression({
		positions: [ 1000000, 1000001, 1000002, 1000003 ],
		values: [ 1, 3, 5, 7 ],
		degree: 1,
		normalize: 'standard'
	});

	expect( regression.normalization.mode ).toBe( 'standard' );
	expect( regression.positions[ 0 ] ).toBe( 1000000 );
	expect( regression.fitPositions[ 0 ] ).not.toBe( 1000000 );
	expect( regression.evaluate( 1000004 ) ).toBeCloseTo( 9 );

});

test("PolynomialRegression supports minmax normalization for multivariate input.", () => {

	const regression = new PolynomialRegression({
		positions: [
			10, 100,
			20, 100,
			10, 200,
			20, 200
		],
		values: [ 111, 121, 211, 221 ],
		variables: 2,
		degree: 1,
		normalize: 'minmax'
	});

	expect( regression.normalization.mode ).toBe( 'minmax' );
	expect( regression.evaluate([ 15, 150 ]) ).toBeCloseTo( 166 );

});

test("crossValidateRegression selects model options by fold score.", () => {

	const result = crossValidateRegression({
		model: PolynomialRegression,
		positions: [ -2, -1, 0, 1, 2, 3 ],
		values: [ 4, 1, 0, 1, 4, 9 ],
		degree: [ 1, 2 ],
		regularization: [ 0, .1 ],
		folds: 3,
		seed: 4,
		metric: 'mse',
		normalize: true
	});

	expect( result.bestModel ).toBeInstanceOf( PolynomialRegression );
	expect( result.bestOptions.degree ).toBe( 2 );
	expect( result.results.length ).toBe( 4 );
	expect( result.bestModel.evaluate( 4 ) ).toBeCloseTo( 16 );

});

test("crossValidateRegression supports r2 scoring.", () => {

	const result = crossValidateRegression({
		model: LinearRegression,
		positions: [ 0, 1, 2, 3 ],
		values: [ 1, 3, 5, 7 ],
		folds: 2,
		metric: 'r2',
		shuffle: false
	});

	expect( result.bestScore ).toBeCloseTo( 1 );
	expect( result.bestModel.evaluate( 4 ) ).toBeCloseTo( 9 );

});

test("PolynomialRegression rejects malformed inputs.", () => {

	expect( () => new PolynomialRegression({
		positions: [ 0, 1 ],
		values: [ 0 ],
		degree: 1
	}) ).toThrow( /expects 2 values/ );

	expect( () => new PolynomialRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		degree: -1
	}) ).toThrow( /degree/ );

	expect( () => new PolynomialRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		regularization: -1
	}) ).toThrow( /regularization/ );

	expect( () => new PolynomialRegression({
		positions: [ 0 ],
		values: [ 0 ],
		degree: 2
	}) ).toThrow( /singular/ );

	expect( () => new PolynomialRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		weights: [ 1 ]
	}) ).toThrow( /weights length/ );

	expect( () => new PolynomialRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		weights: [ 1, -1 ]
	}) ).toThrow( /weights/ );

	expect( () => new PolynomialRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		robust: 'least-trimmed-squares'
	}) ).toThrow( /robust/ );

	expect( () => new PolynomialRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		robust: 'huber',
		delta: 0
	}) ).toThrow( /delta/ );

	expect( () => new PolynomialRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		normalize: 'unit'
	}) ).toThrow( /normalize/ );

	expect( () => new RANSACRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		sampleSize: 3
	}) ).toThrow( /sampleSize/ );

	expect( () => new RANSACRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		threshold: -1
	}) ).toThrow( /threshold/ );

	expect( () => crossValidateRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		folds: 3
	}) ).toThrow( /folds/ );

	expect( () => crossValidateRegression({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		folds: 2,
		metric: 'accuracy'
	}) ).toThrow( /metric/ );

});

test("CubicHermite matches endpoint values and derivatives.", () => {

	const hermite = new CubicHermite({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 0, 0 ]
	});

	expect( hermite ).toBeInstanceOf( Hermite );
	expect( hermite.evaluate( 0 ) ).toBeCloseTo( 0 );
	expect( hermite.evaluate( 1 ) ).toBeCloseTo( 1 );
	expect( hermite.evaluate( .5 ) ).toBeCloseTo( .5 );
	expect( hermite.derivative( 0 ) ).toBeCloseTo( 0 );
	expect( hermite.derivative( 1 ) ).toBeCloseTo( 0 );
	expect( hermite.derivative( .5 ) ).toBeCloseTo( 1.5 );

});

test("CubicHermite supports positional construction and static evaluation.", () => {

	const hermite = new CubicHermite(
		[ 0, 1 ],
		[ 0, 1 ],
		[ 1, 1 ]
	);

	expect( hermite.evaluate( .25 ) ).toBeCloseTo( .25 );
	expect( CubicHermite.evaluate( [ 0, 1 ], [ 0, 1 ], [ 1, 1 ], 1, .75 ) ).toBeCloseTo( .75 );
	expect( CubicHermite.evaluate({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 1, 1 ]
	}, .75 ) ).toBeCloseTo( .75 );

});

test("CubicHermite supports vector-valued outputs.", () => {

	const hermite = new CubicHermite({
		positions: new Float64Array([ 0, 1 ]),
		values: new Float64Array([
			0, 0,
			1, 2
		]),
		derivatives: new Float64Array([
			0, 1,
			0, 1
		]),
		dimension: 2
	});
	const value = hermite.evaluate( .5 );
	const derivative = hermite.derivative( .5 );

	expect( value ).toBeInstanceOf( Float64Array );
	expect( value[ 0 ] ).toBeCloseTo( .5 );
	expect( value[ 1 ] ).toBeCloseTo( 1 );
	expect( derivative[ 0 ] ).toBeCloseTo( 1.5 );
	expect( derivative[ 1 ] ).toBeCloseTo( 2.5 );

});

test("CubicHermite supports map and sampler helpers.", async () => {

	const hermite = new CubicHermite({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 1, 1 ]
	});
	const mapped = hermite.map([ 0, .5, 1 ]);
	const async = await hermite.mapAsync([ 0, .5, 1 ]);
	const grid = hermite.grid({
		start: 0,
		end: 1,
		shape: 3
	});

	expect( Array.from( mapped ) ).toEqual([ 0, .5, 1 ]);
	expect( Array.from( async ) ).toEqual([ 0, .5, 1 ]);
	expect( Array.from( grid.values ) ).toEqual([ 0, .5, 1 ]);

});

test("CubicHermite rejects malformed inputs.", () => {

	expect( () => new CubicHermite([ 0, 0 ], [ 0, 1 ], [ 0, 0 ]) ).toThrow( /unique/ );
	expect( () => new CubicHermite([ 0, 1, 2 ], [ 0, 1 ], [ 0, 0 ]) ).toThrow( /two positions/ );
	expect( () => new CubicHermite([ 0, 1 ], [ 0 ], [ 0, 0 ]) ).toThrow( /expects 2 values/ );
	expect( () => new CubicHermite([ 0, 1 ], [ 0, 1 ], [ 0 ]) ).toThrow( /expects 2 derivatives/ );

});

test("QuinticHermite matches endpoint values and derivatives.", () => {

	const hermite = new QuinticHermite({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 0, 0 ],
		secondDerivatives: [ 0, 0 ]
	});

	expect( hermite.evaluate( 0 ) ).toBeCloseTo( 0 );
	expect( hermite.evaluate( 1 ) ).toBeCloseTo( 1 );
	expect( hermite.evaluate( .5 ) ).toBeCloseTo( .5 );
	expect( hermite.derivative( 0 ) ).toBeCloseTo( 0 );
	expect( hermite.derivative( 1 ) ).toBeCloseTo( 0 );
	expect( hermite.secondDerivative( 0 ) ).toBeCloseTo( 0 );
	expect( hermite.secondDerivative( 1 ) ).toBeCloseTo( 0 );

});

test("QuinticHermite supports positional construction and static evaluation.", () => {

	const hermite = new QuinticHermite(
		[ 0, 1 ],
		[ 0, 1 ],
		[ 1, 1 ],
		[ 0, 0 ]
	);

	expect( hermite.evaluate( .25 ) ).toBeCloseTo( .25 );
	expect( QuinticHermite.evaluate( [ 0, 1 ], [ 0, 1 ], [ 1, 1 ], [ 0, 0 ], 1, .75 ) ).toBeCloseTo( .75 );
	expect( QuinticHermite.evaluate({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 1, 1 ],
		secondDerivatives: [ 0, 0 ]
	}, .75 ) ).toBeCloseTo( .75 );

});

test("QuinticHermite supports vector-valued outputs.", () => {

	const hermite = new QuinticHermite({
		positions: new Float64Array([ 0, 1 ]),
		values: new Float64Array([
			0, 0,
			1, 2
		]),
		derivatives: new Float64Array([
			1, 2,
			1, 2
		]),
		secondDerivatives: new Float64Array([
			0, 0,
			0, 0
		]),
		dimension: 2
	});
	const value = hermite.evaluate( .5 );
	const derivative = hermite.derivative( .5 );
	const secondDerivative = hermite.secondDerivative( .5 );

	expect( value ).toBeInstanceOf( Float64Array );
	expect( value[ 0 ] ).toBeCloseTo( .5 );
	expect( value[ 1 ] ).toBeCloseTo( 1 );
	expect( derivative[ 0 ] ).toBeCloseTo( 1 );
	expect( derivative[ 1 ] ).toBeCloseTo( 2 );
	expect( secondDerivative[ 0 ] ).toBeCloseTo( 0 );
	expect( secondDerivative[ 1 ] ).toBeCloseTo( 0 );

});

test("QuinticHermite supports map and sampler helpers.", async () => {

	const hermite = new QuinticHermite({
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 1, 1 ],
		secondDerivatives: [ 0, 0 ]
	});
	const mapped = hermite.map([ 0, .5, 1 ]);
	const async = await hermite.mapAsync([ 0, .5, 1 ]);
	const grid = hermite.grid({
		start: 0,
		end: 1,
		shape: 3
	});

	expect( Array.from( mapped ) ).toEqual([ 0, .5, 1 ]);
	expect( Array.from( async ) ).toEqual([ 0, .5, 1 ]);
	expect( Array.from( grid.values ) ).toEqual([ 0, .5, 1 ]);

});

test("QuinticHermite rejects malformed inputs.", () => {

	expect( () => new QuinticHermite([ 0, 0 ], [ 0, 1 ], [ 0, 0 ], [ 0, 0 ]) ).toThrow( /unique/ );
	expect( () => new QuinticHermite([ 0, 1, 2 ], [ 0, 1 ], [ 0, 0 ], [ 0, 0 ]) ).toThrow( /two positions/ );
	expect( () => new QuinticHermite([ 0, 1 ], [ 0 ], [ 0, 0 ], [ 0, 0 ]) ).toThrow( /expects 2 values/ );
	expect( () => new QuinticHermite([ 0, 1 ], [ 0, 1 ], [ 0 ], [ 0, 0 ]) ).toThrow( /expects 2 derivatives/ );
	expect( () => new QuinticHermite([ 0, 1 ], [ 0, 1 ], [ 0, 0 ], [ 0 ]) ).toThrow( /expects 2 secondDerivatives/ );

});

test("Spline alias handles mixed 1D interpolator cells.", () => {

	expect( Spline ).toBe( InterpolationMesh );

	const spline = new Spline([
		new CubicHermite([ 0, 1 ], [ 0, 1 ], [ 1, 0 ]),
		new Linear([ 1, 2 ], [ 1, 3 ])
	]);

	expect( spline.evaluate( .5 ) ).toBeCloseTo( .625 );
	expect( spline.evaluate( 1.5 ) ).toBeCloseTo( 2 );

});

test("Spline alias handles Hermite segments with map and samplers.", async () => {

	const spline = new Spline([
		new CubicHermite([ 0, 1 ], [ 0, 1 ], [ 1, 1 ]),
		new CubicHermite([ 1, 2 ], [ 1, 2 ], [ 1, 1 ])
	]);
	const mapped = spline.map([ 0, .5, 1, 1.5, 2 ]);
	const async = await spline.mapAsync([ 0, .5, 1 ]);
	const grid = spline.grid({
		start: 0,
		end: 2,
		shape: 3
	});

	expect( Array.from( mapped ) ).toEqual([ 0, .5, 1, 1.5, 2 ]);
	expect( Array.from( async ) ).toEqual([ 0, .5, 1 ]);
	expect( Array.from( grid.values ) ).toEqual([ 0, 1, 2 ]);

});

test("Spline fromIntervals builds linear interval cells.", () => {

	const spline = Spline.fromIntervals({
		type: Linear,
		positions: [ 0, 1, 2, 3 ],
		values: [ 0, 1, 0, 2 ]
	});

	expect( spline ).toBeInstanceOf( InterpolationMesh );
	expect( spline.evaluate( .5 ) ).toBeCloseTo( .5 );
	expect( spline.evaluate( 1.5 ) ).toBeCloseTo( .5 );
	expect( spline.evaluate( 2.5 ) ).toBeCloseTo( 1 );

});

test("Spline fromIntervals builds Hermite interval cells.", () => {

	const spline = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 2 ],
		values: [ 0, 1, 0 ],
		derivatives: [ 0, 0, 0 ]
	});

	expect( spline.evaluate( .5 ) ).toBeCloseTo( .5 );
	expect( spline.evaluate( 1.5 ) ).toBeCloseTo( .5 );
	expect( spline.cells[ 0 ].interpolator ).toBeInstanceOf( CubicHermite );

});

test("Spline fromIntervals infers finite-difference derivatives.", () => {

	const spline = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 3 ],
		values: [ 0, 2, 8 ],
		derivatives: 'finite-difference'
	});

	expect( spline.cells[ 0 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 2 );
	expect( spline.cells[ 0 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 8 / 3 );
	expect( spline.cells[ 1 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 8 / 3 );
	expect( spline.cells[ 1 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 3 );

});

test("Spline fromIntervals infers catmull-rom derivatives.", () => {

	const spline = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 3 ],
		values: [ 0, 2, 8 ],
		derivatives: 'catmull-rom'
	});

	expect( spline.cells[ 0 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 2 );
	expect( spline.cells[ 0 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 2.5 );
	expect( spline.cells[ 1 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 2.5 );
	expect( spline.cells[ 1 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 3 );

});

test("Spline fromIntervals supports zero and vector derivative inference.", () => {

	const zero = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 2 ],
		values: [ 0, 1, 0 ],
		derivatives: 'zero'
	});
	const vector = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 3 ],
		values: [
			0, 0,
			2, 4,
			8, 16
		],
		derivatives: 'finite-difference',
		dimension: 2
	});

	expect( Array.from( zero.cells[ 0 ].interpolator.derivatives ) ).toEqual([ 0, 0 ]);
	expect( vector.cells[ 0 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 2 );
	expect( vector.cells[ 0 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 4 );
	expect( vector.cells[ 0 ].interpolator.derivatives[ 2 ] ).toBeCloseTo( 8 / 3 );
	expect( vector.cells[ 0 ].interpolator.derivatives[ 3 ] ).toBeCloseTo( 16 / 3 );

});

test("Spline fromIntervals infers monotone derivatives without overshoot.", () => {

	const spline = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 2 ],
		values: [ 0, 1, 1 ],
		derivatives: 'monotone'
	});

	expect( spline.cells[ 0 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 1 );
	expect( spline.cells[ 0 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 0 );
	expect( spline.evaluate( .5 ) ).toBeGreaterThanOrEqual( 0 );
	expect( spline.evaluate( .5 ) ).toBeLessThanOrEqual( 1 );
	expect( spline.evaluate( 1.5 ) ).toBeCloseTo( 1 );

});

test("Spline fromIntervals infers natural cubic derivatives.", () => {

	const spline = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 2 ],
		values: [ 0, 1, 0 ],
		derivatives: 'natural'
	});

	expect( spline.cells[ 0 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 1.5 );
	expect( spline.cells[ 0 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 0 );
	expect( spline.cells[ 1 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 0 );
	expect( spline.cells[ 1 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( -1.5 );

});

test("Spline fromIntervals infers clamped cubic derivatives.", () => {

	const spline = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 2 ],
		values: [ 0, 1, 0 ],
		derivatives: {
			mode: 'clamped',
			start: 0,
			end: 0
		}
	});

	expect( spline.cells[ 0 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 0 );
	expect( spline.cells[ 0 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 0 );
	expect( spline.cells[ 1 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 0 );
	expect( spline.cells[ 1 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 0 );

});

test("Spline fromIntervals infers cardinal derivatives with tension.", () => {

	const catmullRom = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 2 ],
		values: [ 0, 2, 8 ],
		derivatives: {
			mode: 'cardinal',
			tension: 0
		}
	});
	const tense = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 2 ],
		values: [ 0, 2, 8 ],
		derivatives: {
			mode: 'cardinal',
			tension: .5
		}
	});

	expect( catmullRom.cells[ 0 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 4 );
	expect( tense.cells[ 0 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 2 );

});

test("Spline fromIntervals infers akima derivatives.", () => {

	const spline = Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1, 2, 3 ],
		values: [ 0, 1, 1, 2 ],
		derivatives: 'akima'
	});

	expect( spline.cells[ 0 ].interpolator.derivatives[ 0 ] ).toBeCloseTo( 1 );
	expect( Number.isFinite( spline.cells[ 0 ].interpolator.derivatives[ 1 ] ) ).toBe( true );
	expect( Number.isFinite( spline.cells[ 1 ].interpolator.derivatives[ 0 ] ) ).toBe( true );
	expect( spline.cells[ 2 ].interpolator.derivatives[ 1 ] ).toBeCloseTo( 1 );

});

test("Spline fromIntervals supports vector-valued interval cells.", () => {

	const spline = Spline.fromIntervals({
		type: CubicHermite,
		positions: new Float64Array([ 0, 1, 2 ]),
		values: new Float64Array([
			0, 0,
			1, 2,
			2, 4
		]),
		derivatives: new Float64Array([
			1, 2,
			1, 2,
			1, 2
		]),
		dimension: 2
	});
	const value = spline.evaluate( 1.5 );

	expect( value ).toBeInstanceOf( Float64Array );
	expect( value[ 0 ] ).toBeCloseTo( 1.5 );
	expect( value[ 1 ] ).toBeCloseTo( 3 );

});

test("Spline fromIntervals builds QuinticHermite interval cells.", () => {

	const spline = Spline.fromIntervals({
		type: QuinticHermite,
		positions: [ 0, 1, 2 ],
		values: [ 0, 1, 2 ],
		derivatives: 'finite-difference',
		secondDerivatives: 'zero'
	});

	expect( spline.evaluate( .5 ) ).toBeCloseTo( .5 );
	expect( spline.evaluate( 1.5 ) ).toBeCloseTo( 1.5 );
	expect( spline.cells[ 0 ].interpolator ).toBeInstanceOf( QuinticHermite );
	expect( Array.from( spline.cells[ 0 ].interpolator.secondDerivatives ) ).toEqual([ 0, 0 ]);

});

test("Spline fromIntervals infers finite-difference second derivatives.", () => {

	const spline = Spline.fromIntervals({
		type: QuinticHermite,
		positions: [ 0, 1, 2 ],
		values: [ 0, 1, 4 ],
		derivatives: 'finite-difference',
		secondDerivatives: 'finite-difference'
	});

	expect( spline.cells[ 0 ].interpolator.secondDerivatives[ 0 ] ).toBeCloseTo( 0 );
	expect( spline.cells[ 0 ].interpolator.secondDerivatives[ 1 ] ).toBeCloseTo( 2 );
	expect( spline.cells[ 1 ].interpolator.secondDerivatives[ 0 ] ).toBeCloseTo( 2 );
	expect( spline.cells[ 1 ].interpolator.secondDerivatives[ 1 ] ).toBeCloseTo( 0 );

});

test("Spline fromIntervals supports explicit second derivatives.", () => {

	const spline = Spline.fromIntervals({
		type: QuinticHermite,
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 1, 1 ],
		secondDerivatives: [ 2, 3 ]
	});

	expect( Array.from( spline.cells[ 0 ].interpolator.secondDerivatives ) ).toEqual([ 2, 3 ]);

});

test("Spline fromIntervals rejects malformed second derivatives.", () => {

	expect( () => Spline.fromIntervals({
		type: QuinticHermite,
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 1, 1 ],
		secondDerivatives: [ 0 ]
	}) ).toThrow( /expects 2 secondDerivatives/ );

	expect( () => Spline.fromIntervals({
		type: QuinticHermite,
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 1, 1 ],
		secondDerivatives: 'curvature-magic'
	}) ).toThrow( /Unsupported second derivative inference mode/ );

});

test("Spline fromIntervals accepts mesh options.", () => {

	const spline = Spline.fromIntervals({
		type: Linear,
		positions: [ 0, 1, 2, 3 ],
		values: [ 0, 1, 0, 2 ],
		index: 'grid',
		resolution: 4
	});

	expect( spline.index.resolution ).toEqual([ 4 ]);
	expect( spline.evaluate( 2.5 ) ).toBeCloseTo( 1 );

});

test("Spline fromIntervals rejects malformed interval input.", () => {

	expect( () => Spline.fromIntervals({
		type: Linear,
		positions: [ 0 ],
		values: [ 0 ]
	}) ).toThrow( /at least two/ );

	expect( () => Spline.fromIntervals({
		type: Linear,
		positions: [ 0, 0 ],
		values: [ 0, 1 ]
	}) ).toThrow( /strictly increasing/ );

	expect( () => Spline.fromIntervals({
		type: Linear,
		positions: [ 0, 1 ],
		values: [ 0 ]
	}) ).toThrow( /expects 2 values/ );

	expect( () => Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: [ 0 ]
	}) ).toThrow( /expects 2 derivatives/ );

	expect( () => Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: 'spline-magic'
	}) ).toThrow( /Unsupported derivative inference mode/ );

	expect( () => Spline.fromIntervals({
		type: CubicHermite,
		positions: [ 0, 1 ],
		values: [ 0, 1 ],
		derivatives: {
			mode: 'cardinal',
			tension: Number.NaN
		}
	}) ).toThrow( /tension/ );

	expect( () => Spline.fromIntervals({
		positions: [ 0, 1 ],
		values: [ 0, 1 ]
	}) ).toThrow( /interpolator type/ );

});

test("SimplexLinear infers variables from simplex positions.", () => {

	expect( SimplexLinear.inferVariables([ 0,0, 1,0, 0,1 ]) ).toBe( 2 );
	expect( SimplexLinear.inferVariables([ 0,0,0, 1,0,0, 0,1,0, 0,0,1 ]) ).toBe( 3 );
	expect( () => SimplexLinear.inferVariables([ 0, 1, 2 ]) ).toThrow( /n \* \(n \+ 1\)/ );

});

test("TriangleLinear evaluates inside a triangle.", () => {

	const triangle = new TriangleLinear(
		new Float64Array([ 0,0, 1,0, 0,1 ]),
		new Float64Array([ 10, 20, 30 ])
	);

	expect( triangle.evaluate([ 0, 0 ]) ).toBeCloseTo( 10 );
	expect( triangle.evaluate([ 1, 0 ]) ).toBeCloseTo( 20 );
	expect( triangle.evaluate([ 0, 1 ]) ).toBeCloseTo( 30 );
	expect( triangle.evaluate([ .25, .25 ]) ).toBeCloseTo( 17.5 );
	expect( TriangleLinear.evaluate([ 0,0, 1,0, 0,1 ], [ 10, 20, 30 ], 1, [ .25, .25 ]) ).toBeCloseTo( 17.5 );

});

test("TriangleLinear reports barycentric containment.", () => {

	const triangle = new TriangleLinear(
		[ 0,0, 1,0, 0,1 ],
		[ 10, 20, 30 ]
	);

	expect( Array.from( triangle.getWeights([ .25, .25 ]) ) ).toEqual([ .5, .25, .25 ]);
	expect( triangle.contains([ .25, .25 ]) ).toBe( true );
	expect( triangle.contains([ 1, 1 ]) ).toBe( false );

});

test("SimplexLinear supports vector-valued triangle output.", () => {

	const triangle = new TriangleLinear(
		new Float64Array([ 0,0, 1,0, 0,1 ]),
		new Float64Array([ 0,0, 10,0, 0,10 ]),
		2
	);
	const value = triangle.evaluate([ .25, .25 ]);

	expect( value ).toBeInstanceOf( Float64Array );
	expect( value[ 0 ] ).toBeCloseTo( 2.5 );
	expect( value[ 1 ] ).toBeCloseTo( 2.5 );

});

test("TetrahedralLinear evaluates inside a tetrahedron.", () => {

	const tetrahedron = new TetrahedralLinear(
		[ 0,0,0, 1,0,0, 0,1,0, 0,0,1 ],
		[ 10, 20, 30, 40 ]
	);

	expect( tetrahedron.evaluate([ 0, 0, 0 ]) ).toBeCloseTo( 10 );
	expect( tetrahedron.evaluate([ 1, 0, 0 ]) ).toBeCloseTo( 20 );
	expect( tetrahedron.evaluate([ 0, 1, 0 ]) ).toBeCloseTo( 30 );
	expect( tetrahedron.evaluate([ 0, 0, 1 ]) ).toBeCloseTo( 40 );
	expect( tetrahedron.evaluate([ .25, .25, .25 ]) ).toBeCloseTo( 25 );

});

test("SimplexLinear maps batches of simplex positions.", async () => {

	const triangle = new TriangleLinear(
		new Float64Array([ 0,0, 1,0, 0,1 ]),
		new Float64Array([ 10, 20, 30 ])
	);
	const positions = new Float64Array([ 0,0, .25,.25, 0,1 ]);
	const sync = triangle.map( positions );
	const async = await triangle.mapAsync( positions );

	expect( sync ).toBeInstanceOf( Float64Array );
	expect( Array.from( sync ) ).toEqual([ 10, 17.5, 30 ]);
	expect( Array.from( async ) ).toEqual( Array.from( sync ) );

});

test("SimplexLinear rejects malformed simplexes.", () => {

	expect( () => new TriangleLinear([ 0,0, 1,0, 2,0 ], [ 1, 2, 3 ]) ).toThrow( /non-degenerate/ );
	expect( () => new TriangleLinear([ 0,0, 1,0 ], [ 1, 2, 3 ]) ).toThrow( /position values/ );
	expect( () => new TriangleLinear([ 0,0, 1,0, 0,1 ], [ 1, 2 ]) ).toThrow( /expects 3 values/ );

});

test("InterpolationMesh evaluates piecewise 1D interpolators.", async () => {

	const mesh = new InterpolationMesh([
		new Linear([ 0, 1 ], [ 0, 10 ]),
		new Linear([ 1, 2 ], [ 10, 40 ])
	]);

	expect( mesh.evaluate( .5 ) ).toBeCloseTo( 5 );
	expect( mesh.evaluate( 1.5 ) ).toBeCloseTo( 25 );
	expect( mesh.contains( .25 ) ).toBe( true );
	expect( mesh.contains( 3 ) ).toBe( false );
	expect( Array.from( mesh.map([ .5, 1.5 ]) ) ).toEqual([ 5, 25 ]);
	expect( Array.from( await mesh.mapAsync([ .5, 1.5 ]) ) ).toEqual([ 5, 25 ]);

});

test("InterpolationMesh can mix simplex and grid interpolators.", () => {

	const triangle = new TriangleLinear(
		new Float64Array([ 0,0, 1,0, 0,1 ]),
		new Float64Array([ 0, 10, 20 ])
	);
	const rectangle = new Bilinear(
		new Float64Array([ 1,0, 2,1 ]),
		new Float64Array([ 100, 200, 300, 400 ])
	);
	const mesh = new Mesh([ triangle, rectangle ]);

	expect( mesh.evaluate([ .25, .25 ]) ).toBeCloseTo( 7.5 );
	expect( mesh.evaluate([ 1.5, .5 ]) ).toBeCloseTo( 250 );
	expect( mesh.find([ .25, .25 ]).interpolator ).toBe( triangle );
	expect( mesh.find([ 1.5, .5 ]).interpolator ).toBe( rectangle );
	expect( () => mesh.evaluate([ -1, -1 ]) ).toThrow( /outside/ );

});

test("InterpolationMesh supports vector-valued mixed cells.", () => {

	const mesh = new InterpolationMesh([
		new TriangleLinear(
			new Float64Array([ 0,0, 1,0, 0,1 ]),
			new Float64Array([ 0,0, 10,0, 0,10 ]),
			2
		),
		new Bilinear(
			new Float64Array([ 1,0, 2,1 ]),
			new Float64Array([ 10,0, 20,0, 10,10, 20,10 ]),
			2
		)
	]);
	const triangleValue = mesh.evaluate([ .25, .25 ]);
	const rectangleValue = mesh.evaluate([ 1.5, .5 ]);

	expect( triangleValue[ 0 ] ).toBeCloseTo( 2.5 );
	expect( triangleValue[ 1 ] ).toBeCloseTo( 2.5 );
	expect( rectangleValue[ 0 ] ).toBeCloseTo( 15 );
	expect( rectangleValue[ 1 ] ).toBeCloseTo( 5 );

});

test("InterpolationMesh accepts custom cell containment predicates.", () => {

	const left = new Linear([ 0, 1 ], [ 0, 10 ]);
	const right = new Linear([ 0, 1 ], [ 100, 110 ]);
	const mesh = new InterpolationMesh([
		{
			interpolator: left,
			contains: position => position < .5
		},
		{
			interpolator: right,
			contains: position => position >= .5
		}
	]);

	expect( mesh.evaluate( .25 ) ).toBeCloseTo( 2.5 );
	expect( mesh.evaluate( .75 ) ).toBeCloseTo( 107.5 );

});

test("InterpolationMesh keeps first-match behavior by default in overlaps.", () => {

	const mesh = new InterpolationMesh([
		{
			interpolator: new Linear([ 0, 1 ], [ 0, 10 ]),
			contains: position => position >= 0 && position <= 1
		},
		{
			interpolator: new Linear([ 0, 1 ], [ 100, 110 ]),
			contains: position => position >= 0 && position <= 1
		}
	]);

	expect( mesh.evaluate( .5 ) ).toBeCloseTo( 5 );

});

test("InterpolationMesh can blend overlapping cells with custom weights.", () => {

	const mesh = new InterpolationMesh([
		{
			interpolator: new Linear([ 0, 1 ], [ 0, 10 ]),
			contains: position => position >= 0 && position <= 1,
			weight: position => 1 - position
		},
		{
			interpolator: new Linear([ 0, 1 ], [ 100, 110 ]),
			contains: position => position >= 0 && position <= 1,
			weight: position => position
		}
	], {
		blending: 'weighted'
	});

	expect( mesh.evaluate( .25 ) ).toBeCloseTo( 27.5 );
	expect( mesh.evaluate( .5 ) ).toBeCloseTo( 55 );
	expect( mesh.evaluate( .75 ) ).toBeCloseTo( 82.5 );

});

test("InterpolationMesh weighted blending ignores zero-weight matches.", () => {

	const mesh = new InterpolationMesh([
		{
			interpolator: new Linear([ 0, 1 ], [ 0, 10 ]),
			contains: position => position >= 0 && position <= 1,
			weight: () => 0
		},
		{
			interpolator: new Linear([ 0, 1 ], [ 100, 110 ]),
			contains: position => position >= 0 && position <= 1,
			weight: () => 1
		}
	], {
		blending: 'weighted'
	});

	expect( mesh.evaluate( .5 ) ).toBeCloseTo( 105 );

});

test("InterpolationMesh weighted blending supports vector outputs.", () => {

	const mesh = new InterpolationMesh([
		{
			interpolator: new Linear([ 0, 1 ], [ 0,0, 10,10 ], 2 ),
			contains: position => position >= 0 && position <= 1,
			weight: position => 1 - position
		},
		{
			interpolator: new Linear([ 0, 1 ], [ 100,0, 110,10 ], 2 ),
			contains: position => position >= 0 && position <= 1,
			weight: position => position
		}
	], {
		blending: 'weighted'
	});
	const value = mesh.evaluate( .5 );

	expect( value[ 0 ] ).toBeCloseTo( 55 );
	expect( value[ 1 ] ).toBeCloseTo( 5 );

});

test("InterpolationMesh weighted blending rejects invalid weights.", () => {

	const mesh = new InterpolationMesh([
		{
			interpolator: new Linear([ 0, 1 ], [ 0, 10 ]),
			contains: position => position >= 0 && position <= 1,
			weight: () => Number.NaN
		}
	], {
		blending: 'weighted'
	});

	expect( () => mesh.evaluate( .5 ) ).toThrow( /finite/ );
	expect( () => new InterpolationMesh([
		new Linear([ 0, 1 ], [ 0, 10 ])
	], {
		blending: 'mystery'
	}).evaluate( .5 ) ).toThrow( /Unsupported/ );

});

test("InterpolationMesh rejects incompatible or empty meshes.", () => {

	expect( () => new InterpolationMesh().evaluate( 0 ) ).toThrow( /at least one cell/ );
	expect( () => new InterpolationMesh([
		new Linear([ 0, 1 ], [ 0, 10 ]),
		new Bilinear([ 0,0, 1,1 ], [ 0, 1, 2, 3 ])
	]) ).toThrow( /variables/ );
	expect( () => new InterpolationMesh([
		new Linear([ 0, 1 ], [ 0, 10 ]),
		new Linear([ 0, 1 ], [ 0, 0, 10, 10 ], 2 )
	]) ).toThrow( /dimension/ );

});

test("InterpolationMesh grid index matches linear mesh lookup.", () => {

	const cells = [
		new TriangleLinear([ 0,0, 1,0, 0,1 ], [ 0, 10, 20 ]),
		new Bilinear([ 1,0, 2,1 ], [ 100, 200, 300, 400 ]),
		new TriangleLinear([ 0,1, 1,1, 0,2 ], [ 20, 30, 40 ])
	];
	const linear = new InterpolationMesh( cells );
	const indexed = new InterpolationMesh( cells, {
		index: 'grid',
		resolution: [ 4, 4 ]
	});
	const samples = [
		[ .25, .25 ],
		[ 1.5, .5 ],
		[ .25, 1.25 ]
	];

	for ( const sample of samples ) {

		expect( indexed.evaluate( sample ) ).toBeCloseTo( linear.evaluate( sample ) );
		expect( indexed.find( sample ).interpolator ).toBe( linear.find( sample ).interpolator );

	}

	expect( indexed.contains([ 10, 10 ]) ).toBe( false );

});

test("InterpolationMesh grid index supports custom bounds.", () => {

	const mesh = new InterpolationMesh([
		{
			interpolator: new Linear([ 0, 1 ], [ 0, 10 ]),
			bounds: [ { min: 0, max: 1 } ],
			contains: position => position >= .25 && position <= .75
		}
	], {
		index: 'grid',
		resolution: 4
	});

	expect( mesh.evaluate( .5 ) ).toBeCloseTo( 5 );
	expect( mesh.contains( .1 ) ).toBe( false );

});

test("InterpolationMesh grid index rebuilds after adding cells.", () => {

	const mesh = new InterpolationMesh([
		new Linear([ 0, 1 ], [ 0, 10 ])
	], {
		index: 'grid',
		resolution: 4
	});

	expect( mesh.evaluate( .5 ) ).toBeCloseTo( 5 );
	mesh.add( new Linear([ 1, 2 ], [ 10, 40 ]) );
	expect( mesh.evaluate( 1.5 ) ).toBeCloseTo( 25 );

});

test("InterpolationMesh grid index supports automatic resolution.", () => {

	const mesh = InterpolationMesh.fromTriangles(
		new Float64Array([
			0,0,
			1,0,
			0,1,
			1,1
		]),
		new Float64Array([ 0, 10, 20, 30 ]),
		new Uint16Array([ 0,1,2, 1,3,2 ]),
		{
			index: 'grid',
			resolution: 'auto'
		}
	);

	expect( mesh.index.resolution ).toEqual([ 4, 4 ]);
	expect( mesh.evaluate([ .25, .25 ]) ).toBeCloseTo( 7.5 );

	const defaultResolution = InterpolationMesh.fromTriangles(
		new Float64Array([ 0,0, 1,0, 0,1 ]),
		new Float64Array([ 0, 10, 20 ]),
		new Uint16Array([ 0,1,2 ]),
		{
			index: 'grid'
		}
	);

	expect( defaultResolution.index.resolution ).toEqual([ 4, 4 ]);

	const largerMesh = InterpolationMesh.fromTriangles(
		new Float64Array([
			0,0, 1,0, 0,1, 1,1,
			2,0, 2,1, 3,0, 3,1
		]),
		new Float64Array([ 0, 10, 20, 30, 40, 50, 60, 70 ]),
		new Uint16Array([ 0,1,2, 1,3,2, 4,6,5, 6,7,5 ]),
		{
			index: 'grid',
			resolution: 'auto'
		}
	);

	expect( largerMesh.index.resolution ).toEqual([ 4, 4 ]);

});

test("InterpolationMesh builds triangle meshes from index buffers.", () => {

	const mesh = InterpolationMesh.fromTriangles(
		new Float64Array([
			0,0,
			1,0,
			0,1,
			1,1
		]),
		new Float64Array([ 0, 10, 20, 30 ]),
		new Uint16Array([ 0,1,2, 1,3,2 ]),
		{
			index: 'grid',
			resolution: [ 2, 2 ]
		}
	);

	expect( mesh.cells.length ).toBe( 2 );
	expect( mesh.evaluate([ .25, .25 ]) ).toBeCloseTo( 7.5 );
	expect( mesh.evaluate([ .75, .75 ]) ).toBeCloseTo( 22.5 );
	expect( mesh.contains([ 2, 2 ]) ).toBe( false );

});

test("InterpolationMesh async map can use workers for indexed simplex meshes.", async () => {

	const mesh = InterpolationMesh.fromTriangles(
		new Float64Array([
			0,0,
			1,0,
			0,1,
			1,1
		]),
		new Float64Array([ 0, 10, 20, 30 ]),
		new Uint16Array([ 0,1,2, 1,3,2 ]),
		{
			index: 'grid',
			resolution: 'auto'
		}
	);
	const samples = new Float64Array([ .25,.25, .75,.75, .1,.8 ]);
	const sync = mesh.map( samples );
	const async = await mesh.mapAsync( samples, {
		workers: 2,
		threshold: 0,
		idleTimeout: 500
	});

	expect( async ).toBeInstanceOf( Float64Array );
	expect( Array.from( async ) ).toEqual( Array.from( sync ) );

});

test("InterpolationMesh async map falls back for custom cell predicates.", async () => {

	const mesh = new InterpolationMesh([
		{
			interpolator: new Linear([ 0, 1 ], [ 0, 10 ]),
			contains: position => position >= 0 && position <= 1
		}
	]);
	const samples = [ .25, .5, .75 ];
	const sync = mesh.map( samples );
	const async = await mesh.mapAsync( samples, {
		workers: 2,
		threshold: 0,
		idleTimeout: 500
	});

	expect( Array.from( async ) ).toEqual( Array.from( sync ) );

});

test("InterpolationMesh builds vector-valued triangle meshes from index buffers.", () => {

	const mesh = Mesh.fromTriangles(
		new Float64Array([
			0,0,
			1,0,
			0,1
		]),
		new Float64Array([
			0,0,
			10,0,
			0,10
		]),
		new Uint16Array([ 0,1,2 ]),
		{
			dimension: 2
		}
	);
	const value = mesh.evaluate([ .25, .25 ]);

	expect( value[ 0 ] ).toBeCloseTo( 2.5 );
	expect( value[ 1 ] ).toBeCloseTo( 2.5 );

});

test("InterpolationMesh builds tetrahedron meshes from index buffers.", () => {

	const mesh = InterpolationMesh.fromTetrahedra(
		new Float64Array([
			0,0,0,
			1,0,0,
			0,1,0,
			0,0,1
		]),
		new Float64Array([ 10, 20, 30, 40 ]),
		new Uint16Array([ 0,1,2,3 ]),
		{
			index: 'grid',
			resolution: [ 2, 2, 2 ]
		}
	);

	expect( mesh.cells.length ).toBe( 1 );
	expect( mesh.evaluate([ .25, .25, .25 ]) ).toBeCloseTo( 25 );
	expect( mesh.contains([ 1, 1, 1 ]) ).toBe( false );

});

test("InterpolationMesh builds generic simplex meshes from index buffers.", () => {

	const mesh = InterpolationMesh.fromSimplexes(
		new Float64Array([
			0,0,
			1,0,
			0,1
		]),
		new Float64Array([ 0, 10, 20 ]),
		new Uint16Array([ 0,1,2 ]),
		{
			cellSize: 3,
			variables: 2
		}
	);

	expect( mesh.evaluate([ .25, .25 ]) ).toBeCloseTo( 7.5 );

});

test("InterpolationMesh rejects invalid grid index options.", () => {

	expect( () => new InterpolationMesh([
		new Linear([ 0, 1 ], [ 0, 10 ])
	], {
		index: 'tree'
	}).evaluate( .5 ) ).toThrow( /Unsupported/ );

	expect( () => new InterpolationMesh([
		new Linear([ 0, 1 ], [ 0, 10 ])
	], {
		index: 'grid',
		resolution: [ 2, 2 ]
	}) ).toThrow( /resolution/ );

});

test("InterpolationMesh rejects malformed indexed meshes.", () => {

	expect( () => InterpolationMesh.fromTriangles(
		[ 0,0, 1,0, 0,1 ],
		[ 0, 10, 20 ],
		[ 0, 1 ]
	) ).toThrow( /indices length/ );

	expect( () => InterpolationMesh.fromTriangles(
		[ 0,0, 1,0, 0,1 ],
		[ 0, 10, 20 ],
		[ 0, 1, 3 ]
	) ).toThrow( /Invalid index/ );

	expect( () => InterpolationMesh.fromTetrahedra(
		[ 0,0,0, 1,0,0, 0,1,0 ],
		[ 0, 10, 20 ],
		[ 0, 1, 2, 0 ]
	) ).toThrow( /values length|expects|non-degenerate/ );

});

test("Polynomial evaluates arbitrary 1D degrees.", () => {

	const polynomial = new Polynomial(
		new Float64Array([ 0, 1, 2, 3, 4 ]),
		new Float64Array([ 1, 3, 9, 19, 33 ])
	);

	expect( polynomial.evaluate( 0 ) ).toBeCloseTo( 1 );
	expect( polynomial.evaluate( 2 ) ).toBeCloseTo( 9 );
	expect( polynomial.evaluate( 2.5 ) ).toBeCloseTo( 13.5 );
	expect( Polynomial.evaluate([ 0, 1, 2 ], [ 0, 1, 4 ], 1, 1.5 ) ).toBeCloseTo( 2.25 );

});

test("Polynomial supports vector-valued 1D output.", () => {

	const polynomial = new Polynomial(
		new Float64Array([ 0, 1, 2 ]),
		new Float64Array([ 0,0, 10,20, 20,40 ]),
		2
	);
	const value = polynomial.evaluate( .5 );

	expect( value ).toBeInstanceOf( Float64Array );
	expect( value[ 0 ] ).toBeCloseTo( 5 );
	expect( value[ 1 ] ).toBeCloseTo( 10 );

});

test("Multilinear matches Bilinear on a rectangle.", () => {

	const positions = new Float64Array([ 0,0, 1,1 ]);
	const values = new Float64Array([ 0, 10, 20, 30 ]);
	const bilinear = new Bilinear( positions, values );
	const multilinear = new Multilinear( positions, values );

	expect( multilinear.variables ).toBe( 2 );
	expect( multilinear.evaluate([ .25, .75 ]) ).toBeCloseTo( bilinear.evaluate([ .25, .75 ]) );

});

test("Multiquadratic and Multicubic support arbitrary variable counts.", () => {

	const quadraticPositions = new Float64Array([ 0,0, 1,1, 2,2 ]);
	const quadraticValues = new Float64Array([
		0, 1, 4,
		1, 2, 5,
		4, 5, 8
	]);
	const multiquadratic = new Multiquadratic( quadraticPositions, quadraticValues );

	expect( multiquadratic.evaluate([ .5, .5 ]) ).toBeCloseTo( .5 );
	expect( multiquadratic.evaluate([ 1.5, 1.5 ]) ).toBeCloseTo( 4.5 );

	const cubicPositions = new Float64Array([ 0,0,0, 1,1,1, 2,2,2, 3,3,3 ]);
	const cubicValues = new Float64Array( 64 );

	for ( let z = 0, index = 0; z < 4; z ++ ) {

		for ( let y = 0; y < 4; y ++ ) {

			for ( let x = 0; x < 4; x ++ ) {

				cubicValues[ index ++ ] = x + y + z;

			}

		}

	}

	const multicubic = new Multicubic( cubicPositions, cubicValues );

	expect( multicubic.variables ).toBe( 3 );
	expect( multicubic.evaluate([ .5, .5, .5 ]) ).toBeCloseTo( 1.5 );

});

test("Multipolynomial supports generic degree and variable counts.", () => {

	const positions = new Float64Array([ 0,0, 1,1, 2,2 ]);
	const values = new Float64Array([
		0, 1, 4,
		1, 2, 5,
		4, 5, 8
	]);
	const polynomial = new Multipolynomial( positions, values, 1, 2, 2 );

	expect( polynomial.degree ).toBe( 2 );
	expect( polynomial.variables ).toBe( 2 );
	expect( polynomial.evaluate([ .5, .5 ]) ).toBeCloseTo( .5 );
	expect( Array.from( polynomial.map([ 0,0, 1,1 ]) ) ).toEqual([ 0, 2 ]);

});

test("Tensor polynomial variants reject malformed inputs.", () => {

	expect( () => new Polynomial([ 0, 0 ], [ 1, 2 ]) ).toThrow( /unique/ );
	expect( () => new Multilinear([ 0,0, 1,1 ], [ 1, 2, 3 ]) ).toThrow( /expects 4 values/ );
	expect( () => new Multipolynomial([ 0,0, 1,1 ], [ 1, 2, 3, 4 ], 1, 0, 2 ) ).toThrow( /degree/ );

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
