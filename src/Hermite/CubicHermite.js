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

export class CubicHermite {

	static degree = 3;
	static variables = 1;

	constructor(

		positionsOrOptions,
		values,
		derivatives,
		dimension = 1

	) {

		const config = normalizeConstructorArguments( positionsOrOptions, values, derivatives, dimension );

		validateInput( config.positions, config.values, config.derivatives, config.dimension );

		this.positions = config.positions;
		this.values = config.values;
		this.derivatives = config.derivatives;
		this.dimension = config.dimension;

	};

	static evaluate( positionsOrOptions, valuesOrPosition, derivatives, dimension = 1, position, output, outputOffset = 0 ) {

		if ( isOptionsObject( positionsOrOptions ) ) {

			const hermite = new this( positionsOrOptions );

			return hermite.evaluate( valuesOrPosition, 0, derivatives, dimension ?? 0 );

		}

		const hermite = new this( positionsOrOptions, valuesOrPosition, derivatives, dimension );

		return hermite.evaluate( position, 0, output, outputOffset );

	};

	evaluate( position, inputOffset = 0, output, outputOffset = 0 ) {

		validateSamplePosition( position, 1 );

		const outputNotProvided = !output;

		if ( !output ) output = new this.values.constructor( this.dimension );

		const x = typeof position === 'number' ? position : position[ inputOffset ];
		const x0 = this.positions[ 0 ];
		const x1 = this.positions[ 1 ];
		const dx = x1 - x0;
		const t = (x - x0) / dx;
		const t2 = t * t;
		const t3 = t2 * t;
		const h00 = 2 * t3 - 3 * t2 + 1;
		const h10 = t3 - 2 * t2 + t;
		const h01 = -2 * t3 + 3 * t2;
		const h11 = t3 - t2;

		for ( let i = 0; i < this.dimension; i ++ ) {

			const y0 = this.values[ i ];
			const y1 = this.values[ this.dimension + i ];
			const m0 = this.derivatives[ i ];
			const m1 = this.derivatives[ this.dimension + i ];

			output[ outputOffset + i ] = h00 * y0 + h10 * dx * m0 + h01 * y1 + h11 * dx * m1;

		}

		if ( outputNotProvided && this.dimension === 1 ) return output[ outputOffset ];
		else return output;

	};

	derivative( position, inputOffset = 0, output, outputOffset = 0 ) {

		validateSamplePosition( position, 1 );

		const outputNotProvided = !output;

		if ( !output ) output = new this.values.constructor( this.dimension );

		const x = typeof position === 'number' ? position : position[ inputOffset ];
		const x0 = this.positions[ 0 ];
		const x1 = this.positions[ 1 ];
		const dx = x1 - x0;
		const t = (x - x0) / dx;
		const t2 = t * t;
		const dh00 = 6 * t2 - 6 * t;
		const dh10 = 3 * t2 - 4 * t + 1;
		const dh01 = -6 * t2 + 6 * t;
		const dh11 = 3 * t2 - 2 * t;

		for ( let i = 0; i < this.dimension; i ++ ) {

			const y0 = this.values[ i ];
			const y1 = this.values[ this.dimension + i ];
			const m0 = this.derivatives[ i ];
			const m1 = this.derivatives[ this.dimension + i ];

			output[ outputOffset + i ] = (dh00 * y0 + dh10 * dx * m0 + dh01 * y1 + dh11 * dx * m1) / dx;

		}

		if ( outputNotProvided && this.dimension === 1 ) return output[ outputOffset ];
		else return output;

	};

	map( positions, handler ) {

		validateSamplePositions( positions, 1 );

		const sampleCount = positions.length;
		let output;

		if ( handler ) output = new this.values.constructor( this.dimension );
		else output = new this.values.constructor( sampleCount * this.dimension );

		for ( let i = 0; i < positions.length; i ++ ) {

			if ( handler ) {

				handler( positions[ i ], this.evaluate( positions[ i ], 0, output, 0 ) );

			} else {

				this.evaluate( positions[ i ], 0, output, i * this.dimension );

			}

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

export const Hermite = CubicHermite;

function normalizeConstructorArguments( positionsOrOptions, values, derivatives, dimension ) {

	if ( isOptionsObject( positionsOrOptions ) ) {

		return {
			positions: positionsOrOptions.positions,
			values: positionsOrOptions.values,
			derivatives: positionsOrOptions.derivatives,
			dimension: positionsOrOptions.dimension ?? 1
		};

	}

	return {
		positions: positionsOrOptions,
		values,
		derivatives,
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

function validateInput( positions, values, derivatives, dimension ) {

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateArrayLike( derivatives, 'derivatives' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );
	validateFiniteValues( derivatives, 'derivatives' );

	if ( positions.length !== 2 ) throw new RangeError( 'CubicHermite expects exactly two positions.' );
	if ( positions[ 0 ] === positions[ 1 ] ) throw new RangeError( 'CubicHermite positions must be unique.' );
	if ( values.length !== dimension * 2 ) {

		throw new RangeError( `CubicHermite expects ${ dimension * 2 } values for dimension ${ dimension }, received ${ values.length }.` );

	}
	if ( derivatives.length !== dimension * 2 ) {

		throw new RangeError( `CubicHermite expects ${ dimension * 2 } derivatives for dimension ${ dimension }, received ${ derivatives.length }.` );

	}

}

globalThis.CubicHermite = CubicHermite;
globalThis.Hermite = Hermite;
