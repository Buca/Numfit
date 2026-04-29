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

const EPSILON = 1e-12;

export class InverseDistanceWeighting {

	constructor(

		positionsOrOptions,
		values,
		dimension = 1,
		variables,
		options = {}

	) {

		const config = normalizeConstructorArguments( positionsOrOptions, values, dimension, variables, options );

		validateInput( config.positions, config.values, config.dimension, config.variables );
		validateOptions( config );

		this.positions = config.positions;
		this.values = config.values;
		this.dimension = config.dimension;
		this.variables = config.variables;
		this.power = config.power;
		this.radius = config.radius;
		this.neighbors = config.neighbors;
		this.epsilon = config.epsilon;
		this.empty = normalizeEmptyMode( config.empty, this.dimension, this.values.constructor );
		this.indexMode = config.index;
		this.resolution = config.resolution;
		this.index = null;

		this.rebuildIndex();

	};

	static evaluate( positionsOrOptions, valuesOrPosition, dimension = 1, variables, options = {}, position, output, outputOffset = 0 ) {

		if ( isOptionsObject( positionsOrOptions ) ) {

			const interpolator = new this( positionsOrOptions );

			return interpolator.evaluate( valuesOrPosition, 0, dimension, variables ?? 0 );

		}

		const interpolator = new this( positionsOrOptions, valuesOrPosition, dimension, variables, options );

		return interpolator.evaluate( position, 0, output, outputOffset );

	};

	evaluate(

		position, inputOffset = 0,
		output, outputOffset = 0

	) {

		validateSamplePosition( position, this.variables );

		const outputNotProvided = !output;

		if ( !output ) output = new this.values.constructor( this.dimension );

		const exactIndex = this.findExactSample( position, inputOffset );

		if ( exactIndex !== -1 ) {

			for ( let i = 0; i < this.dimension; i ++ ) {

				output[ outputOffset + i ] = this.values[ exactIndex * this.dimension + i ];

			}

			if ( outputNotProvided && this.dimension === 1 ) return output[ outputOffset ];
			else return output;

		}

		const samples = this.collectSamples( position, inputOffset );

		if ( samples.length === 0 ) {

			const value = this.evaluateEmpty( position, inputOffset, output, outputOffset );

			if ( outputNotProvided && this.dimension === 1 ) return value;
			else return output;

		}

		for ( let i = 0; i < this.dimension; i ++ ) output[ outputOffset + i ] = 0;

		let totalWeight = 0;

		for ( const sample of samples ) {

			const weight = 1 / sample.distance ** this.power;

			totalWeight += weight;

			for ( let i = 0; i < this.dimension; i ++ ) {

				output[ outputOffset + i ] += this.values[ sample.index * this.dimension + i ] * weight;

			}

		}

		for ( let i = 0; i < this.dimension; i ++ ) output[ outputOffset + i ] /= totalWeight;

		if ( outputNotProvided && this.dimension === 1 ) return output[ outputOffset ];
		else return output;

	};

	evaluateEmpty( position, inputOffset, output, outputOffset ) {

		if ( this.empty.mode === 'throw' ) throw new RangeError( 'Position has no IDW samples within the configured radius.' );

		if ( this.empty.mode === 'nearest' ) {

			const sample = this.findNearestSample( position, inputOffset );

			for ( let i = 0; i < this.dimension; i ++ ) {

				output[ outputOffset + i ] = this.values[ sample * this.dimension + i ];

			}

			return this.dimension === 1 ? output[ outputOffset ] : output;

		}

		if ( this.empty.mode === 'undefined' ) {

			for ( let i = 0; i < this.dimension; i ++ ) output[ outputOffset + i ] = Number.NaN;

			return undefined;

		}

		if ( this.empty.mode === 'null' ) {

			for ( let i = 0; i < this.dimension; i ++ ) output[ outputOffset + i ] = Number.NaN;

			return null;

		}

		for ( let i = 0; i < this.dimension; i ++ ) output[ outputOffset + i ] = this.empty.value[ i ];

		return this.dimension === 1 ? output[ outputOffset ] : output;

	};

	findExactSample( position, inputOffset ) {

		const sampleCount = this.positions.length / this.variables;
		const epsilonSquared = this.epsilon * this.epsilon;

		for ( let sample = 0; sample < sampleCount; sample ++ ) {

			if ( this.distanceSquared( position, inputOffset, sample ) <= epsilonSquared ) return sample;

		}

		return -1;

	};

	collectSamples( position, inputOffset ) {

		if ( this.index ) return collectIndexedSamples( this, position, inputOffset );

		const sampleCount = this.positions.length / this.variables;
		const radiusSquared = this.radius === Infinity ? Infinity : this.radius * this.radius;
		const samples = [];

		for ( let sample = 0; sample < sampleCount; sample ++ ) {

			const distanceSquared = this.distanceSquared( position, inputOffset, sample );

			if ( distanceSquared > radiusSquared ) continue;

			samples.push({
				index: sample,
				distance: Math.sqrt( distanceSquared )
			});

		}

		if ( this.neighbors !== Infinity && samples.length > this.neighbors ) {

			samples.sort( ( a, b ) => a.distance - b.distance );
			samples.length = this.neighbors;

		}

		return samples;

	};

	findNearestSample( position, inputOffset ) {

		if ( this.index ) return findNearestIndexedSample( this, position, inputOffset );

		return this.findNearestSampleLinear( position, inputOffset );

	};

	findNearestSampleLinear( position, inputOffset ) {

		const sampleCount = this.positions.length / this.variables;
		let bestIndex = 0;
		let bestDistance = Infinity;

		for ( let sample = 0; sample < sampleCount; sample ++ ) {

			const distance = this.distanceSquared( position, inputOffset, sample );

			if ( distance < bestDistance ) {

				bestDistance = distance;
				bestIndex = sample;

			}

		}

		return bestIndex;

	};

	rebuildIndex() {

		if ( this.indexMode === 'none' || this.indexMode === false ) {

			this.index = null;
			return this;

		}

		if ( this.indexMode !== 'grid' ) {

			throw new RangeError( `Unsupported IDW index mode "${ this.indexMode }".` );

		}

		this.index = createGridIndex( this.positions, this.variables, this.resolution );

		return this;

	};

	distanceSquared( position, inputOffset, sample ) {

		let distance = 0;

		for ( let variable = 0; variable < this.variables; variable ++ ) {

			const value = typeof position === 'number'
				? position
				: position[ inputOffset + variable ];
			const delta = value - this.positions[ sample * this.variables + variable ];

			distance += delta * delta;

		}

		return distance;

	};

	map( positions, handler ) {

		validateSamplePositions( positions, this.variables );

		const sampleCount = positions.length / this.variables;
		const input = new this.positions.constructor( this.variables );
		let output;

		if ( handler ) output = new this.values.constructor( this.dimension );
		else output = new this.values.constructor( sampleCount * this.dimension );

		for ( let i = 0, index = 0; i < positions.length; i += this.variables, index ++ ) {

			for ( let j = 0; j < this.variables; j ++ ) input[ j ] = positions[ i + j ];

			if ( handler ) {

				handler( this.variables > 1 ? input : input[ 0 ], this.evaluate( input, 0, output, 0 ) );

			} else {

				this.evaluate( input, 0, output, index * this.dimension );

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

export const IDW = InverseDistanceWeighting;

function normalizeConstructorArguments( positionsOrOptions, values, dimension, variables, options ) {

	if ( isOptionsObject( positionsOrOptions ) ) {

		return {
			positions: positionsOrOptions.positions,
			values: positionsOrOptions.values,
			dimension: positionsOrOptions.dimension ?? 1,
			variables: positionsOrOptions.variables ?? inferVariables( positionsOrOptions.positions, positionsOrOptions.values, positionsOrOptions.dimension ?? 1 ),
			power: positionsOrOptions.power ?? 2,
			radius: positionsOrOptions.radius ?? Infinity,
			neighbors: positionsOrOptions.neighbors ?? Infinity,
			epsilon: positionsOrOptions.epsilon ?? EPSILON,
			empty: positionsOrOptions.empty ?? 'throw',
			index: positionsOrOptions.index ?? 'none',
			resolution: positionsOrOptions.resolution
		};

	}

	return {
		positions: positionsOrOptions,
		values,
		dimension,
		variables: variables ?? inferVariables( positionsOrOptions, values, dimension ),
		power: options.power ?? 2,
		radius: options.radius ?? Infinity,
		neighbors: options.neighbors ?? Infinity,
		epsilon: options.epsilon ?? EPSILON,
		empty: options.empty ?? 'throw',
		index: options.index ?? 'none',
		resolution: options.resolution
	};

}

function isOptionsObject( value ) {

	return value
		&& typeof value === 'object'
		&& !ArrayBuffer.isView( value )
		&& !Array.isArray( value )
		&& Object.prototype.hasOwnProperty.call( value, 'positions' );

}

function validateInput( positions, values, dimension, variables ) {

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );

	if ( !Number.isInteger( variables ) || variables < 1 ) {

		throw new RangeError( 'variables must be a positive integer.' );

	}

	if ( positions.length % variables !== 0 ) {

		throw new RangeError( `positions length must be divisible by ${ variables }.` );

	}

	const sampleCount = positions.length / variables;

	if ( sampleCount < 1 ) throw new RangeError( 'InverseDistanceWeighting requires at least one sample.' );

	if ( values.length !== sampleCount * dimension ) {

		throw new RangeError(
			`InverseDistanceWeighting expects ${ sampleCount * dimension } values for dimension ${ dimension }, received ${ values.length }.` 
		);

	}

}

function validateOptions( options ) {

	if ( typeof options.power !== 'number' || !Number.isFinite( options.power ) || options.power <= 0 ) {

		throw new RangeError( 'power must be a positive finite number.' );

	}

	if (
		options.radius !== Infinity
		&& ( typeof options.radius !== 'number' || !Number.isFinite( options.radius ) || options.radius <= 0 )
	) {

		throw new RangeError( 'radius must be a positive finite number or Infinity.' );

	}

	if (
		options.neighbors !== Infinity
		&& ( !Number.isInteger( options.neighbors ) || options.neighbors < 1 )
	) {

		throw new RangeError( 'neighbors must be a positive integer or Infinity.' );

	}

	if ( typeof options.epsilon !== 'number' || !Number.isFinite( options.epsilon ) || options.epsilon < 0 ) {

		throw new RangeError( 'epsilon must be a non-negative finite number.' );

	}

	if ( options.index !== 'none' && options.index !== false && options.index !== 'grid' ) {

		throw new RangeError( `Unsupported IDW index mode "${ options.index }".` );

	}

}

function createGridIndex( positions, variables, resolution ) {

	const bounds = getPointBounds( positions, variables );
	const size = normalizeResolution( resolution, variables, positions.length / variables );
	const buckets = new Map();
	const sampleCount = positions.length / variables;

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		const coordinate = getSampleBucketCoordinates( bounds, size, positions, sample, variables );
		const key = coordinate.join( ',' );
		let bucket = buckets.get( key );

		if ( !bucket ) {

			bucket = [];
			buckets.set( key, bucket );

		}

		bucket.push( sample );

	}

	return {
		bounds,
		buckets,
		resolution: size,
		variables
	};

}

function collectIndexedSamples( idw, position, inputOffset ) {

	const candidates = idw.radius === Infinity
		? collectAllIndexedCandidates( idw.index )
		: collectRadiusCandidates( idw.index, position, inputOffset, idw.radius );
	const radiusSquared = idw.radius === Infinity ? Infinity : idw.radius * idw.radius;
	const samples = [];

	for ( const sample of candidates ) {

		const distanceSquared = idw.distanceSquared( position, inputOffset, sample );

		if ( distanceSquared > radiusSquared ) continue;

		samples.push({
			index: sample,
			distance: Math.sqrt( distanceSquared )
		});

	}

	if ( idw.neighbors !== Infinity && samples.length > idw.neighbors ) {

		samples.sort( ( a, b ) => a.distance - b.distance );
		samples.length = idw.neighbors;

	}

	return samples;

}

function findNearestIndexedSample( idw, position, inputOffset ) {

	const point = getPositionVector( position, inputOffset, idw.variables );
	const coordinate = getPositionBucketCoordinates( idw.index.bounds, idw.index.resolution, point );

	if ( !coordinate ) return idw.findNearestSampleLinear( position, inputOffset );

	let bestIndex = -1;
	let bestDistance = Infinity;
	const maxRadius = Math.max( ...idw.index.resolution );
	const visited = new Set();

	for ( let radius = 0; radius <= maxRadius; radius ++ ) {

		forEachCoordinateInRadius( coordinate, radius, idw.index.resolution, candidateCoordinate => {

			const key = candidateCoordinate.join( ',' );

			if ( visited.has( key ) ) return;

			visited.add( key );

			const bucket = idw.index.buckets.get( key );

			if ( !bucket ) return;

			for ( const sample of bucket ) {

				const distance = idw.distanceSquared( position, inputOffset, sample );

				if ( distance < bestDistance ) {

					bestDistance = distance;
					bestIndex = sample;

				}

			}

		} );

		if ( bestIndex !== -1 && radiusShellMinimumDistance( idw.index, point, coordinate, radius + 1 ) > bestDistance ) {

			return bestIndex;

		}

	}

	return bestIndex === -1 ? 0 : bestIndex;

}

function collectRadiusCandidates( index, position, inputOffset, radius ) {

	const point = getPositionVector( position, inputOffset, index.variables );
	const min = point.map( value => value - radius );
	const max = point.map( value => value + radius );
	const minCoordinate = getBoundsBucketCoordinates( index.bounds, index.resolution, min, 'min' );
	const maxCoordinate = getBoundsBucketCoordinates( index.bounds, index.resolution, max, 'max' );
	const candidates = [];

	if ( !minCoordinate || !maxCoordinate ) return candidates;

	const coordinate = minCoordinate.slice();

	while ( true ) {

		const bucket = index.buckets.get( coordinate.join( ',' ) );

		if ( bucket ) candidates.push( ...bucket );

		let axis = 0;

		for ( ; axis < index.variables; axis ++ ) {

			if ( coordinate[ axis ] < maxCoordinate[ axis ] ) {

				coordinate[ axis ] ++;
				for ( let reset = 0; reset < axis; reset ++ ) coordinate[ reset ] = minCoordinate[ reset ];
				break;

			}

		}

		if ( axis === index.variables ) break;

	}

	return candidates;

}

function collectAllIndexedCandidates( index ) {

	const candidates = [];

	for ( const bucket of index.buckets.values() ) candidates.push( ...bucket );

	return candidates;

}

function getPointBounds( positions, variables ) {

	const bounds = new Array( variables );

	for ( let variable = 0; variable < variables; variable ++ ) {

		let min = Infinity;
		let max = -Infinity;

		for ( let i = variable; i < positions.length; i += variables ) {

			if ( positions[ i ] < min ) min = positions[ i ];
			if ( positions[ i ] > max ) max = positions[ i ];

		}

		if ( min === max ) {

			min -= .5;
			max += .5;

		}

		bounds[ variable ] = { min, max };

	}

	return bounds;

}

function normalizeResolution( resolution, variables, sampleCount ) {

	if ( resolution === undefined || resolution === 'auto' ) {

		const perAxis = Math.max( 1, Math.ceil( sampleCount ** ( 1 / variables ) ) );

		return new Array( variables ).fill( perAxis );

	}

	if ( typeof resolution === 'number' ) {

		if ( !Number.isInteger( resolution ) || resolution < 1 ) throw new RangeError( 'resolution must be a positive integer.' );

		return new Array( variables ).fill( resolution );

	}

	validateArrayLike( resolution, 'resolution' );

	if ( resolution.length !== variables ) throw new RangeError( `resolution must contain ${ variables } values.` );

	const output = new Array( variables );

	for ( let i = 0; i < variables; i ++ ) {

		const value = resolution[ i ];

		if ( !Number.isInteger( value ) || value < 1 ) throw new RangeError( 'resolution values must be positive integers.' );

		output[ i ] = value;

	}

	return output;

}

function getSampleBucketCoordinates( bounds, resolution, positions, sample, variables ) {

	const coordinate = new Array( variables );

	for ( let variable = 0; variable < variables; variable ++ ) {

		coordinate[ variable ] = getAxisBucketCoordinate(
			bounds[ variable ],
			resolution[ variable ],
			positions[ sample * variables + variable ]
		);

	}

	return coordinate;

}

function getPositionBucketCoordinates( bounds, resolution, position ) {

	const coordinate = new Array( bounds.length );

	for ( let variable = 0; variable < bounds.length; variable ++ ) {

		const value = position[ variable ];

		if ( value < bounds[ variable ].min || value > bounds[ variable ].max ) return null;

		coordinate[ variable ] = getAxisBucketCoordinate( bounds[ variable ], resolution[ variable ], value );

	}

	return coordinate;

}

function getBoundsBucketCoordinates( bounds, resolution, values, side ) {

	const coordinate = new Array( bounds.length );

	for ( let variable = 0; variable < bounds.length; variable ++ ) {

		const clamped = Math.min( bounds[ variable ].max, Math.max( bounds[ variable ].min, values[ variable ] ) );

		if ( values[ variable ] < bounds[ variable ].min && side === 'max' ) return null;
		if ( values[ variable ] > bounds[ variable ].max && side === 'min' ) return null;

		coordinate[ variable ] = getAxisBucketCoordinate( bounds[ variable ], resolution[ variable ], clamped );

	}

	return coordinate;

}

function getAxisBucketCoordinate( bound, resolution, value ) {

	const ratio = ( value - bound.min ) / ( bound.max - bound.min );

	return Math.min( resolution - 1, Math.max( 0, Math.floor( ratio * resolution ) ) );

}

function getPositionVector( position, inputOffset, variables ) {

	if ( typeof position === 'number' ) return [ position ];

	const output = new Array( variables );

	for ( let variable = 0; variable < variables; variable ++ ) output[ variable ] = position[ inputOffset + variable ];

	return output;

}

function forEachCoordinateInRadius( center, radius, resolution, callback ) {

	const variables = center.length;
	const min = new Array( variables );
	const max = new Array( variables );
	const coordinate = new Array( variables );

	for ( let axis = 0; axis < variables; axis ++ ) {

		min[ axis ] = Math.max( 0, center[ axis ] - radius );
		max[ axis ] = Math.min( resolution[ axis ] - 1, center[ axis ] + radius );
		coordinate[ axis ] = min[ axis ];

	}

	while ( true ) {

		let onShell = radius === 0;

		for ( let axis = 0; axis < variables; axis ++ ) {

			if ( Math.abs( coordinate[ axis ] - center[ axis ] ) === radius ) {

				onShell = true;
				break;

			}

		}

		if ( onShell ) callback( coordinate.slice() );

		let axis = 0;

		for ( ; axis < variables; axis ++ ) {

			if ( coordinate[ axis ] < max[ axis ] ) {

				coordinate[ axis ] ++;
				for ( let reset = 0; reset < axis; reset ++ ) coordinate[ reset ] = min[ reset ];
				break;

			}

		}

		if ( axis === variables ) break;

	}

}

function radiusShellMinimumDistance( index, point, center, radius ) {

	let distance = 0;

	for ( let axis = 0; axis < index.variables; axis ++ ) {

		const lowerIndex = center[ axis ] - radius;
		const upperIndex = center[ axis ] + radius;
		const bound = index.bounds[ axis ];
		const cellSize = ( bound.max - bound.min ) / index.resolution[ axis ];
		let axisDistance = 0;

		if ( lowerIndex >= 0 ) {

			const upperEdge = bound.min + ( lowerIndex + 1 ) * cellSize;

			if ( upperEdge < point[ axis ] ) axisDistance = point[ axis ] - upperEdge;

		}

		if ( upperIndex < index.resolution[ axis ] ) {

			const lowerEdge = bound.min + upperIndex * cellSize;

			if ( lowerEdge > point[ axis ] ) axisDistance = Math.min(
				axisDistance || Infinity,
				lowerEdge - point[ axis ]
			);

		}

		distance += axisDistance * axisDistance;

	}

	return distance;

}

function normalizeEmptyMode( empty, dimension, Type ) {

	if ( empty === 'throw' || empty === undefined ) return { mode: 'throw' };
	if ( empty === 'nearest' ) return { mode: 'nearest' };
	if ( empty === 'undefined' ) return { mode: 'undefined' };
	if ( empty === 'null' ) return { mode: 'null' };

	if ( typeof empty === 'number' ) {

		if ( !Number.isFinite( empty ) ) throw new RangeError( 'empty fallback values must be finite numbers.' );

		return {
			mode: 'constant',
			value: new Type( dimension ).fill( empty )
		};

	}

	if ( Array.isArray( empty ) || ArrayBuffer.isView( empty ) ) {

		validateArrayLike( empty, 'empty' );
		validateFiniteValues( empty, 'empty' );

		if ( empty.length !== dimension ) {

			throw new RangeError( `empty fallback array must contain ${ dimension } values.` );

		}

		const value = new Type( dimension );

		for ( let i = 0; i < dimension; i ++ ) value[ i ] = empty[ i ];

		return {
			mode: 'constant',
			value
		};

	}

	throw new RangeError( 'empty must be "throw", "nearest", "undefined", "null", a number, or an array-like fallback.' );

}

function inferVariables( positions, values, dimension ) {

	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateDimension( dimension );

	const sampleCount = values.length / dimension;

	if ( !Number.isInteger( sampleCount ) || sampleCount < 1 ) {

		throw new RangeError( 'Unable to infer variables from positions and values.' );

	}

	const variables = positions.length / sampleCount;

	if ( !Number.isInteger( variables ) || variables < 1 ) {

		throw new RangeError( 'Unable to infer variables from positions and values.' );

	}

	return variables;

}
