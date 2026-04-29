import {
	validateSamplePosition
} from './Validation.js';

const DEFAULT_ADAPTIVE_TOLERANCE = 1e-6;
const DEFAULT_ADAPTIVE_MAX_DEPTH = 16;

export function gridSample( interpolator, options, handler ) {

	const settings = normalizeGridOptions( interpolator, options );
	const positions = createGridPositions( interpolator, settings.start, settings.end, settings.shape );
	const values = interpolator.map( positions, handler );

	if ( handler ) return interpolator;

	return {
		positions,
		values,
		start: settings.start,
		end: settings.end,
		shape: settings.shape,
		variables: getVariables( interpolator ),
		dimension: interpolator.dimension
	};

};

export function sliceSample( interpolator, options, handler ) {

	const variables = getVariables( interpolator );
	const axes = options?.axes || inferSliceAxes( variables, options?.fixed );
	const fixed = options?.fixed || {};

	if ( axes.length < 1 ) throw new RangeError( 'slice axes must contain at least one axis.' );

	for ( const axis of axes ) {

		if ( !Number.isInteger( axis ) || axis < 0 || axis >= variables ) {

			throw new RangeError( `slice axis ${ axis } is outside the interpolator variable range.` );

		}

	}

	const start = normalizeVector( options.start, axes.length, 'start' );
	const end = normalizeVector( options.end, axes.length, 'end' );
	const shape = normalizeShape( options.shape ?? options.amount, axes.length );
	const type = getPositionType( interpolator );
	const sampleCount = shape.reduce( ( total, amount ) => total * amount, 1 );
	const positions = new type( sampleCount * variables );
	const slicePosition = new type( variables );

	for ( let axis = 0; axis < variables; axis ++ ) {

		const value = getFixedValue( fixed, axis );

		if ( value === undefined && !axes.includes( axis ) ) {

			throw new RangeError( `slice requires a fixed value for axis ${ axis }.` );

		}

		if ( value !== undefined ) slicePosition[ axis ] = value;

	}

	for ( let sample = 0; sample < sampleCount; sample ++ ) {

		let stride = 1;

		for ( let i = 0; i < axes.length; i ++ ) {

			const multiplier = Math.floor( sample / stride ) % shape[ i ];
			const t = shape[ i ] === 1 ? 0 : multiplier / ( shape[ i ] - 1 );

			slicePosition[ axes[ i ] ] = start[ i ] + ( end[ i ] - start[ i ] ) * t;
			stride *= shape[ i ];

		}

		for ( let axis = 0; axis < variables; axis ++ ) {

			positions[ sample * variables + axis ] = slicePosition[ axis ];

		}

	}

	const values = interpolator.map( positions, handler );

	if ( handler ) return interpolator;

	return {
		positions,
		values,
		axes,
		fixed,
		start,
		end,
		shape,
		variables,
		dimension: interpolator.dimension
	};

};

export function randomSample( interpolator, count, options = {}, handler ) {

	return scatteredSample( interpolator, count, options, handler, false );

};

export function latinHypercubeSample( interpolator, count, options = {}, handler ) {

	return scatteredSample( interpolator, count, options, handler, true );

};

export function poissonDiskSample( interpolator, options = {}, handler ) {

	if ( !options || typeof options !== 'object' ) throw new TypeError( 'poissonDisk options must be an object.' );

	const variables = getVariables( interpolator );
	const bounds = normalizeBounds( interpolator, options );
	const random = createRandom( options.seed );
	const radius = options.radius ?? estimatePoissonRadius( bounds, variables, options.count );
	const candidates = options.candidates ?? 30;
	const maxSamples = options.maxSamples ?? options.count ?? Infinity;

	if ( typeof radius !== 'number' || !Number.isFinite( radius ) || radius <= 0 ) {

		throw new RangeError( 'poissonDisk radius must be a positive finite number.' );

	}

	if ( !Number.isInteger( candidates ) || candidates < 1 ) {

		throw new RangeError( 'poissonDisk candidates must be a positive integer.' );

	}

	if ( maxSamples !== Infinity && ( !Number.isInteger( maxSamples ) || maxSamples < 1 ) ) {

		throw new RangeError( 'poissonDisk count/maxSamples must be a positive integer.' );

	}

	const points = generatePoissonPoints( bounds, variables, radius, candidates, maxSamples, random );
	const type = getPositionType( interpolator );
	const positions = new type( points.length * variables );

	for ( let i = 0; i < points.length; i ++ ) {

		for ( let axis = 0; axis < variables; axis ++ ) positions[ i * variables + axis ] = points[ i ][ axis ];

	}

	const values = interpolator.map( positions, handler );

	if ( handler ) return interpolator;

	return {
		positions,
		values,
		min: bounds.min,
		max: bounds.max,
		radius,
		variables,
		dimension: interpolator.dimension
	};

};

export function adaptiveSample( interpolator, start, end, options = {} ) {

	const variables = getVariables( interpolator );

	if ( variables !== 1 ) throw new RangeError( 'adaptive sampling currently supports 1D interpolators only.' );

	validateSamplePosition( start, 1, 'start' );
	validateSamplePosition( end, 1, 'end' );

	const tolerance = options.tolerance ?? DEFAULT_ADAPTIVE_TOLERANCE;
	const maxDepth = options.maxDepth ?? DEFAULT_ADAPTIVE_MAX_DEPTH;
	const minDepth = options.minDepth ?? 0;

	if ( typeof tolerance !== 'number' || !Number.isFinite( tolerance ) || tolerance <= 0 ) {

		throw new RangeError( 'adaptive tolerance must be a positive finite number.' );

	}

	if ( !Number.isInteger( maxDepth ) || maxDepth < 0 ) {

		throw new RangeError( 'adaptive maxDepth must be a non-negative integer.' );

	}

	const samples = [];
	const a = Number( start );
	const b = Number( end );
	const va = evaluatePacked( interpolator, a );
	const vb = evaluatePacked( interpolator, b );

	subdivideAdaptive( interpolator, a, b, va, vb, 0, minDepth, maxDepth, tolerance, samples );
	samples.push({ position: b, value: vb });

	const type = getPositionType( interpolator );
	const valueType = getValueType( interpolator );
	const positions = new type( samples.length );
	const values = new valueType( samples.length * interpolator.dimension );

	for ( let i = 0; i < samples.length; i ++ ) {

		positions[ i ] = samples[ i ].position;

		for ( let j = 0; j < interpolator.dimension; j ++ ) {

			values[ i * interpolator.dimension + j ] = samples[ i ].value[ j ];

		}

	}

	return {
		positions,
		values,
		tolerance,
		variables,
		dimension: interpolator.dimension
	};

};

export async function * streamSample( interpolator, options = {} ) {

	const settings = normalizeGridOptions( interpolator, options );
	const variables = getVariables( interpolator );
	const chunkSize = options.chunkSize ?? 1024;

	if ( !Number.isInteger( chunkSize ) || chunkSize < 1 ) {

		throw new RangeError( 'stream chunkSize must be a positive integer.' );

	}

	const sampleCount = settings.shape.reduce( ( total, amount ) => total * amount, 1 );
	const type = getPositionType( interpolator );

	for ( let offset = 0; offset < sampleCount; offset += chunkSize ) {

		const count = Math.min( chunkSize, sampleCount - offset );
		const positions = new type( count * variables );

		writeGridPositions( positions, 0, offset, count, variables, settings.start, settings.end, settings.shape );

		yield {
			offset,
			positions,
			values: await interpolator.mapAsync( positions, options.mapOptions ),
			shape: settings.shape,
			variables,
			dimension: interpolator.dimension
		};

	}

};

function scatteredSample( interpolator, count, options, handler, stratified ) {

	if ( !Number.isInteger( count ) || count < 1 ) throw new RangeError( 'sample count must be a positive integer.' );

	const variables = getVariables( interpolator );
	const bounds = normalizeBounds( interpolator, options );
	const type = getPositionType( interpolator );
	const positions = new type( count * variables );
	const random = createRandom( options.seed );

	if ( stratified ) {

		for ( let axis = 0; axis < variables; axis ++ ) {

			const values = [];

			for ( let i = 0; i < count; i ++ ) values.push( ( i + random() ) / count );
			shuffle( values, random );

			for ( let i = 0; i < count; i ++ ) {

				positions[ i * variables + axis ] = bounds.min[ axis ] + values[ i ] * ( bounds.max[ axis ] - bounds.min[ axis ] );

			}

		}

	} else {

		for ( let i = 0; i < count; i ++ ) {

			for ( let axis = 0; axis < variables; axis ++ ) {

				positions[ i * variables + axis ] = bounds.min[ axis ] + random() * ( bounds.max[ axis ] - bounds.min[ axis ] );

			}

		}

	}

	const values = interpolator.map( positions, handler );

	if ( handler ) return interpolator;

	return {
		positions,
		values,
		min: bounds.min,
		max: bounds.max,
		variables,
		dimension: interpolator.dimension
	};

}

function generatePoissonPoints( bounds, variables, radius, candidates, maxSamples, random ) {

	const cellSize = radius / Math.sqrt( variables );
	const gridShape = new Array( variables );

	for ( let axis = 0; axis < variables; axis ++ ) {

		gridShape[ axis ] = Math.max( 1, Math.ceil( ( bounds.max[ axis ] - bounds.min[ axis ] ) / cellSize ) );

	}

	const points = [];
	const active = [];
	const grid = new Map();
	const first = randomPointInBounds( bounds, variables, random );

	points.push( first );
	active.push( 0 );
	grid.set( gridKey( first, bounds.min, cellSize, gridShape ), 0 );

	while ( active.length > 0 && points.length < maxSamples ) {

		const activeIndex = Math.floor( random() * active.length );
		const pointIndex = active[ activeIndex ];
		const point = points[ pointIndex ];
		let accepted = false;

		for ( let attempt = 0; attempt < candidates && points.length < maxSamples; attempt ++ ) {

			const candidate = randomAnnulusPoint( point, variables, radius, random );

			if ( !isInBounds( candidate, bounds, variables ) ) continue;
			if ( hasNearbyPoint( candidate, bounds.min, cellSize, gridShape, grid, points, radius, variables ) ) continue;

			points.push( candidate );
			active.push( points.length - 1 );
			grid.set( gridKey( candidate, bounds.min, cellSize, gridShape ), points.length - 1 );
			accepted = true;

		}

		if ( !accepted ) {

			active[ activeIndex ] = active[ active.length - 1 ];
			active.pop();

		}

	}

	return points;

}

function randomPointInBounds( bounds, variables, random ) {

	const point = new Array( variables );

	for ( let axis = 0; axis < variables; axis ++ ) {

		point[ axis ] = bounds.min[ axis ] + random() * ( bounds.max[ axis ] - bounds.min[ axis ] );

	}

	return point;

}

function randomAnnulusPoint( point, variables, radius, random ) {

	const direction = new Array( variables );
	let length = 0;

	while ( length === 0 ) {

		length = 0;

		for ( let axis = 0; axis < variables; axis ++ ) {

			const value = random() * 2 - 1;

			direction[ axis ] = value;
			length += value * value;

		}

		length = Math.sqrt( length );

	}

	const distance = radius * ( 1 + random() );
	const candidate = new Array( variables );

	for ( let axis = 0; axis < variables; axis ++ ) {

		candidate[ axis ] = point[ axis ] + direction[ axis ] / length * distance;

	}

	return candidate;

}

function hasNearbyPoint( candidate, min, cellSize, gridShape, grid, points, radius, variables ) {

	const base = gridCoordinates( candidate, min, cellSize, gridShape );
	const offsets = new Array( variables ).fill( -2 );
	const radiusSquared = radius * radius;

	while ( true ) {

		const coordinates = new Array( variables );
		let inside = true;

		for ( let axis = 0; axis < variables; axis ++ ) {

			const coordinate = base[ axis ] + offsets[ axis ];

			if ( coordinate < 0 || coordinate >= gridShape[ axis ] ) {

				inside = false;
				break;

			}

			coordinates[ axis ] = coordinate;

		}

		if ( inside ) {

			const pointIndex = grid.get( coordinates.join( ',' ) );

			if ( pointIndex !== undefined && distanceSquared( candidate, points[ pointIndex ], variables ) < radiusSquared ) {

				return true;

			}

		}

		let axis = 0;

		for ( ; axis < variables; axis ++ ) {

			offsets[ axis ] ++;

			if ( offsets[ axis ] <= 2 ) break;

			offsets[ axis ] = -2;

		}

		if ( axis === variables ) return false;

	}

}

function isInBounds( point, bounds, variables ) {

	for ( let axis = 0; axis < variables; axis ++ ) {

		if ( point[ axis ] < bounds.min[ axis ] || point[ axis ] > bounds.max[ axis ] ) return false;

	}

	return true;

}

function gridKey( point, min, cellSize, gridShape ) {

	return gridCoordinates( point, min, cellSize, gridShape ).join( ',' );

}

function gridCoordinates( point, min, cellSize, gridShape ) {

	const coordinates = new Array( point.length );

	for ( let axis = 0; axis < point.length; axis ++ ) {

		coordinates[ axis ] = Math.min(
			gridShape[ axis ] - 1,
			Math.max( 0, Math.floor( ( point[ axis ] - min[ axis ] ) / cellSize ) )
		);

	}

	return coordinates;

}

function distanceSquared( a, b, variables ) {

	let distance = 0;

	for ( let axis = 0; axis < variables; axis ++ ) {

		const delta = a[ axis ] - b[ axis ];

		distance += delta * delta;

	}

	return distance;

}

function estimatePoissonRadius( bounds, variables, count ) {

	if ( !Number.isInteger( count ) || count < 1 ) {

		throw new RangeError( 'poissonDisk requires radius or a positive integer count.' );

	}

	let volume = 1;

	for ( let axis = 0; axis < variables; axis ++ ) volume *= Math.max( 0, bounds.max[ axis ] - bounds.min[ axis ] );

	return ( volume / count ) ** ( 1 / variables ) * .55;

}

function normalizeGridOptions( interpolator, options ) {

	if ( !options || typeof options !== 'object' ) throw new TypeError( 'grid options must be an object.' );

	const variables = getVariables( interpolator );
	const start = normalizeVector( options.start, variables, 'start' );
	const end = normalizeVector( options.end, variables, 'end' );
	const shape = normalizeShape( options.shape ?? options.amount, variables );

	return { start, end, shape };

}

function createGridPositions( interpolator, start, end, shape ) {

	const variables = getVariables( interpolator );
	const sampleCount = shape.reduce( ( total, amount ) => total * amount, 1 );
	const positions = new ( getPositionType( interpolator ) )( sampleCount * variables );

	writeGridPositions( positions, 0, 0, sampleCount, variables, start, end, shape );

	return positions;

}

function writeGridPositions( positions, targetOffset, sampleOffset, count, variables, start, end, shape ) {

	for ( let local = 0; local < count; local ++ ) {

		const sample = sampleOffset + local;
		let stride = 1;

		for ( let axis = 0; axis < variables; axis ++ ) {

			const multiplier = Math.floor( sample / stride ) % shape[ axis ];
			const t = shape[ axis ] === 1 ? 0 : multiplier / ( shape[ axis ] - 1 );

			positions[ targetOffset + local * variables + axis ] = start[ axis ] + ( end[ axis ] - start[ axis ] ) * t;
			stride *= shape[ axis ];

		}

	}

}

function normalizeVector( value, variables, name ) {

	validateSamplePosition( value, variables, name );

	const output = new Array( variables );

	for ( let i = 0; i < variables; i ++ ) output[ i ] = typeof value === 'number' ? value : value[ i ];

	return output;

}

function normalizeShape( shape, variables ) {

	validateSamplePosition( shape, variables, 'shape' );

	const output = new Array( variables );

	for ( let i = 0; i < variables; i ++ ) {

		const value = typeof shape === 'number' ? shape : shape[ i ];

		if ( !Number.isInteger( value ) || value < 1 ) {

			throw new RangeError( 'shape values must be positive integers.' );

		}

		output[ i ] = value;

	}

	return output;

}

function normalizeBounds( interpolator, options ) {

	const variables = getVariables( interpolator );

	if ( options.min !== undefined || options.max !== undefined || options.start !== undefined || options.end !== undefined ) {

		return {
			min: normalizeVector( options.min ?? options.start, variables, 'min' ),
			max: normalizeVector( options.max ?? options.end, variables, 'max' )
		};

	}

	const bounds = inferBounds( interpolator, variables );

	return {
		min: bounds.map( bound => bound.min ),
		max: bounds.map( bound => bound.max )
	};

}

function inferBounds( interpolator, variables ) {

	if ( interpolator.index?.bounds ) return interpolator.index.bounds;
	if ( interpolator.cells?.length ) {

		const bounds = new Array( variables ).fill( 0 ).map( () => ({
			min: Infinity,
			max: -Infinity
		}) );

		for ( const cell of interpolator.cells ) {

			for ( let axis = 0; axis < variables; axis ++ ) {

				bounds[ axis ].min = Math.min( bounds[ axis ].min, cell.bounds[ axis ].min );
				bounds[ axis ].max = Math.max( bounds[ axis ].max, cell.bounds[ axis ].max );

			}

		}

		return bounds;

	}

	const positions = interpolator.positions;
	const bounds = new Array( variables ).fill( 0 ).map( () => ({
		min: Infinity,
		max: -Infinity
	}) );

	for ( let i = 0; i < positions.length; i += variables ) {

		for ( let axis = 0; axis < variables; axis ++ ) {

			bounds[ axis ].min = Math.min( bounds[ axis ].min, positions[ i + axis ] );
			bounds[ axis ].max = Math.max( bounds[ axis ].max, positions[ i + axis ] );

		}

	}

	return bounds;

}

function inferSliceAxes( variables, fixed = {} ) {

	const axes = [];

	for ( let axis = 0; axis < variables; axis ++ ) {

		if ( getFixedValue( fixed, axis ) === undefined ) axes.push( axis );

	}

	return axes;

}

function getFixedValue( fixed, axis ) {

	if ( Array.isArray( fixed ) || ArrayBuffer.isView( fixed ) ) return fixed[ axis ];

	return fixed[ axis ] ?? fixed[ String( axis ) ];

}

function evaluatePacked( interpolator, position ) {

	const output = new ( getValueType( interpolator ) )( interpolator.dimension );

	interpolator.evaluate( position, 0, output, 0 );

	return output;

}

function subdivideAdaptive( interpolator, start, end, startValue, endValue, depth, minDepth, maxDepth, tolerance, samples ) {

	const middle = ( start + end ) / 2;
	const middleValue = evaluatePacked( interpolator, middle );
	let error = 0;

	for ( let i = 0; i < interpolator.dimension; i ++ ) {

		const estimated = ( startValue[ i ] + endValue[ i ] ) / 2;

		error = Math.max( error, Math.abs( middleValue[ i ] - estimated ) );

	}

	if ( depth < minDepth || ( error > tolerance && depth < maxDepth ) ) {

		subdivideAdaptive( interpolator, start, middle, startValue, middleValue, depth + 1, minDepth, maxDepth, tolerance, samples );
		subdivideAdaptive( interpolator, middle, end, middleValue, endValue, depth + 1, minDepth, maxDepth, tolerance, samples );

	} else {

		samples.push({ position: start, value: startValue });

	}

}

function createRandom( seed ) {

	if ( seed === undefined ) return Math.random;

	let state = Number( seed ) >>> 0;

	return () => {

		state = ( state * 1664525 + 1013904223 ) >>> 0;

		return state / 4294967296;

	};

}

function shuffle( values, random ) {

	for ( let i = values.length - 1; i > 0; i -- ) {

		const j = Math.floor( random() * ( i + 1 ) );
		const value = values[ i ];

		values[ i ] = values[ j ];
		values[ j ] = value;

	}

}

function getVariables( interpolator ) {

	return interpolator.variables ?? interpolator.constructor.variables;

}

function getPositionType( interpolator ) {

	return interpolator.positions?.constructor || interpolator.values?.constructor || Float64Array;

}

function getValueType( interpolator ) {

	return interpolator.values?.constructor || Float64Array;

}
