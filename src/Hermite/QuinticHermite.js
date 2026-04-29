import {
	validateArrayLike,
	validateDimension,
	validateFiniteValues,
	validateSamplePosition,
	validateSamplePositions
} from '../Validation.js';
import {
	adaptiveSample,
	gridSample,
	latinHypercubeSample,
	poissonDiskSample,
	randomSample,
	sliceSample,
	streamSample
} from '../Samplers.js';

export class QuinticHermite {

	static degree = 5;
	static variables = 1;
	static secondDerivatives = true;

	constructor(

		positionsOrOptions,
		values,
		derivatives,
		secondDerivatives,
		dimension = 1

	) {

		const config = normalizeConstructorArguments( positionsOrOptions, values, derivatives, secondDerivatives, dimension );

		validateInput( config.positions, config.values, config.derivatives, config.secondDerivatives, config.dimension );

		this.positions = config.positions;
		this.values = config.values;
		this.derivatives = config.derivatives;
		this.secondDerivatives = config.secondDerivatives;
		this.dimension = config.dimension;

	};

	static evaluate( positionsOrOptions, valuesOrPosition, derivatives, secondDerivatives, dimension = 1, position, output, outputOffset = 0 ) {

		if ( isOptionsObject( positionsOrOptions ) ) {

			const hermite = new this( positionsOrOptions );

			return hermite.evaluate( valuesOrPosition, 0, derivatives, secondDerivatives ?? 0 );

		}

		const hermite = new this( positionsOrOptions, valuesOrPosition, derivatives, secondDerivatives, dimension );

		return hermite.evaluate( position, 0, output, outputOffset );

	};

	evaluate( position, inputOffset = 0, output, outputOffset = 0 ) {

		return evaluateQuintic( this, position, inputOffset, output, outputOffset, 0 );

	};

	derivative( position, inputOffset = 0, output, outputOffset = 0 ) {

		return evaluateQuintic( this, position, inputOffset, output, outputOffset, 1 );

	};

	secondDerivative( position, inputOffset = 0, output, outputOffset = 0 ) {

		return evaluateQuintic( this, position, inputOffset, output, outputOffset, 2 );

	};

	map( positions, handler ) {

		validateSamplePositions( positions, 1 );

		const sampleCount = positions.length;
		let output;

		if ( handler ) output = new this.values.constructor( this.dimension );
		else output = new this.values.constructor( sampleCount * this.dimension );

		for ( let i = 0; i < positions.length; i ++ ) {

			if ( handler ) handler( positions[ i ], this.evaluate( positions[ i ], 0, output, 0 ) );
			else this.evaluate( positions[ i ], 0, output, i * this.dimension );

		}

		return handler ? this : output;

	};

	mapAsync( positions, options ) {

		return Promise.resolve( this.map( positions, options?.handler ) );

	};

	grid( options, handler ) {

		return gridSample( this, options, handler );

	};

	slice( options, handler ) {

		return sliceSample( this, options, handler );

	};

	random( count, options, handler ) {

		return randomSample( this, count, options, handler );

	};

	latinHypercube( count, options, handler ) {

		return latinHypercubeSample( this, count, options, handler );

	};

	poissonDisk( options, handler ) {

		return poissonDiskSample( this, options, handler );

	};

	adaptive( start, end, options ) {

		return adaptiveSample( this, start, end, options );

	};

	stream( options ) {

		return streamSample( this, options );

	};

};

function evaluateQuintic( hermite, position, inputOffset, output, outputOffset, order ) {

	validateSamplePosition( position, 1 );

	const outputNotProvided = !output;

	if ( !output ) output = new hermite.values.constructor( hermite.dimension );

	const x = typeof position === 'number' ? position : position[ inputOffset ];
	const x0 = hermite.positions[ 0 ];
	const x1 = hermite.positions[ 1 ];
	const h = x1 - x0;
	const t = (x - x0) / h;
	const basis = getBasis( t, h, order );

	for ( let i = 0; i < hermite.dimension; i ++ ) {

		const y0 = hermite.values[ i ];
		const y1 = hermite.values[ hermite.dimension + i ];
		const m0 = hermite.derivatives[ i ];
		const m1 = hermite.derivatives[ hermite.dimension + i ];
		const a0 = hermite.secondDerivatives[ i ];
		const a1 = hermite.secondDerivatives[ hermite.dimension + i ];

		output[ outputOffset + i ] = basis[ 0 ] * y0
			+ basis[ 1 ] * h * m0
			+ basis[ 2 ] * h * h * a0
			+ basis[ 3 ] * y1
			+ basis[ 4 ] * h * m1
			+ basis[ 5 ] * h * h * a1;

	}

	if ( outputNotProvided && hermite.dimension === 1 ) return output[ outputOffset ];
	else return output;

}

function getBasis( t, h, order ) {

	const t2 = t * t;
	const t3 = t2 * t;
	const t4 = t3 * t;
	const t5 = t4 * t;

	if ( order === 0 ) return [
		1 - 10 * t3 + 15 * t4 - 6 * t5,
		t - 6 * t3 + 8 * t4 - 3 * t5,
		.5 * (t2 - 3 * t3 + 3 * t4 - t5),
		10 * t3 - 15 * t4 + 6 * t5,
		-4 * t3 + 7 * t4 - 3 * t5,
		.5 * (t3 - 2 * t4 + t5)
	];

	if ( order === 1 ) return [
		(-30 * t2 + 60 * t3 - 30 * t4) / h,
		1 - 18 * t2 + 32 * t3 - 15 * t4,
		h * (.5 * (2 * t - 9 * t2 + 12 * t3 - 5 * t4)),
		(30 * t2 - 60 * t3 + 30 * t4) / h,
		-12 * t2 + 28 * t3 - 15 * t4,
		h * (.5 * (3 * t2 - 8 * t3 + 5 * t4))
	];

	return [
		(-60 * t + 180 * t2 - 120 * t3) / (h * h),
		(-36 * t + 96 * t2 - 60 * t3) / h,
		1 - 9 * t + 18 * t2 - 10 * t3,
		(60 * t - 180 * t2 + 120 * t3) / (h * h),
		(-24 * t + 84 * t2 - 60 * t3) / h,
		3 * t - 12 * t2 + 10 * t3
	];

}

function normalizeConstructorArguments( positionsOrOptions, values, derivatives, secondDerivatives, dimension ) {

	if ( isOptionsObject( positionsOrOptions ) ) {

		return {
			positions: positionsOrOptions.positions,
			values: positionsOrOptions.values,
			derivatives: positionsOrOptions.derivatives,
			secondDerivatives: positionsOrOptions.secondDerivatives,
			dimension: positionsOrOptions.dimension ?? 1
		};

	}

	return {
		positions: positionsOrOptions,
		values,
		derivatives,
		secondDerivatives,
		dimension
	};

}

function isOptionsObject( value ) {

	return value
		&& typeof value === 'object'
		&& !ArrayBuffer.isView( value )
		&& !Array.isArray( value )
		&& Object.prototype.hasOwnProperty.call( value, 'positions' );

}

function validateInput( positions, values, derivatives, secondDerivatives, dimension ) {

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateArrayLike( derivatives, 'derivatives' );
	validateArrayLike( secondDerivatives, 'secondDerivatives' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );
	validateFiniteValues( derivatives, 'derivatives' );
	validateFiniteValues( secondDerivatives, 'secondDerivatives' );

	if ( positions.length !== 2 ) throw new RangeError( 'QuinticHermite expects exactly two positions.' );
	if ( positions[ 0 ] === positions[ 1 ] ) throw new RangeError( 'QuinticHermite positions must be unique.' );
	if ( values.length !== dimension * 2 ) throw new RangeError( `QuinticHermite expects ${ dimension * 2 } values for dimension ${ dimension }, received ${ values.length }.` );
	if ( derivatives.length !== dimension * 2 ) throw new RangeError( `QuinticHermite expects ${ dimension * 2 } derivatives for dimension ${ dimension }, received ${ derivatives.length }.` );
	if ( secondDerivatives.length !== dimension * 2 ) throw new RangeError( `QuinticHermite expects ${ dimension * 2 } secondDerivatives for dimension ${ dimension }, received ${ secondDerivatives.length }.` );

}

globalThis.QuinticHermite = QuinticHermite;
