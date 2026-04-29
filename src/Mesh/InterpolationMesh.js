import {
	validateArrayLike,
	validateDimension,
	validateFiniteValues,
	validateSamplePosition,
	validateSamplePositions
} from '../Validation.js';
import {
	SimplexLinear,
	TetrahedralLinear,
	TriangleLinear
} from '../Simplex/index.js';
import { mapMeshInWorkers } from '../MeshParallel.js';
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

export class InterpolationMesh {

	static fromIntervals( options = {} ) {

		const {
			type,
			positions,
			values,
			derivatives,
			secondDerivatives,
			dimension = 1,
			...meshOptions
		} = options;

		if ( typeof type !== 'function' ) throw new TypeError( 'fromIntervals requires an interpolator type.' );

		validateIntervalInput( positions, values, derivatives, dimension, type );
		validateSecondDerivativeInput( positions, values, secondDerivatives, dimension );

		const inferredDerivatives = isDerivativeMode( derivatives )
			? inferIntervalDerivatives( positions, values, dimension, derivatives )
			: derivatives;
		const inferredSecondDerivatives = isSecondDerivativeMode( secondDerivatives )
			? inferIntervalSecondDerivatives( positions, values, dimension, secondDerivatives )
			: secondDerivatives;

		const cells = [];
		const PositionType = positions.constructor;
		const ValueType = values.constructor;

		for ( let interval = 0; interval < positions.length - 1; interval ++ ) {

			const intervalPositions = new PositionType( 2 );
			const intervalValues = new ValueType( dimension * 2 );

			intervalPositions[ 0 ] = positions[ interval ];
			intervalPositions[ 1 ] = positions[ interval + 1 ];

			for ( let i = 0; i < dimension; i ++ ) {

				intervalValues[ i ] = values[ interval * dimension + i ];
				intervalValues[ dimension + i ] = values[ ( interval + 1 ) * dimension + i ];

			}

			if ( inferredDerivatives !== undefined ) {

				const DerivativeType = inferredDerivatives.constructor;
				const intervalDerivatives = new DerivativeType( dimension * 2 );

				for ( let i = 0; i < dimension; i ++ ) {

					intervalDerivatives[ i ] = inferredDerivatives[ interval * dimension + i ];
					intervalDerivatives[ dimension + i ] = inferredDerivatives[ ( interval + 1 ) * dimension + i ];

				}

				if ( inferredSecondDerivatives !== undefined ) {

					const SecondDerivativeType = inferredSecondDerivatives.constructor;
					const intervalSecondDerivatives = new SecondDerivativeType( dimension * 2 );

					for ( let i = 0; i < dimension; i ++ ) {

						intervalSecondDerivatives[ i ] = inferredSecondDerivatives[ interval * dimension + i ];
						intervalSecondDerivatives[ dimension + i ] = inferredSecondDerivatives[ ( interval + 1 ) * dimension + i ];

					}

					cells.push( new type(
						intervalPositions,
						intervalValues,
						intervalDerivatives,
						intervalSecondDerivatives,
						dimension
					) );

				} else {

					cells.push( new type(
						intervalPositions,
						intervalValues,
						intervalDerivatives,
						dimension
					) );

				}

			} else {

				cells.push( new type(
					intervalPositions,
					intervalValues,
					dimension
				) );

			}

		}

		return new this( cells, meshOptions );

	};

	static fromTriangles( positions, values, indices, options = {} ) {

		return this.fromSimplexes( positions, values, indices, {
			...options,
			cellSize: 3,
			variables: 2,
			type: TriangleLinear
		} );

	};

	static fromTetrahedra( positions, values, indices, options = {} ) {

		return this.fromSimplexes( positions, values, indices, {
			...options,
			cellSize: 4,
			variables: 3,
			type: TetrahedralLinear
		} );

	};

	static fromSimplexes( positions, values, indices, options = {} ) {

		const {
			cellSize,
			dimension = 1,
			type = undefined,
			variables = cellSize - 1,
			...meshOptions
		} = options;

		if ( !Number.isInteger( cellSize ) || cellSize < 2 ) {

			throw new RangeError( 'cellSize must be an integer greater than or equal to 2.' );

		}

		validateIndexedMeshInput( positions, values, indices, variables, dimension, cellSize );

		const CellType = type || SimplexLinear;
		const cells = [];

		for ( let i = 0; i < indices.length; i += cellSize ) {

			const cellPositions = new positions.constructor( cellSize * variables );
			const cellValues = new values.constructor( cellSize * dimension );

			for ( let vertex = 0; vertex < cellSize; vertex ++ ) {

				const source = indices[ i + vertex ];

				for ( let variable = 0; variable < variables; variable ++ ) {

					cellPositions[ vertex * variables + variable ] = positions[ source * variables + variable ];

				}

				for ( let component = 0; component < dimension; component ++ ) {

					cellValues[ vertex * dimension + component ] = values[ source * dimension + component ];

				}

			}

			cells.push( new CellType( cellPositions, cellValues, dimension, variables ) );

		}

		return new this( cells, meshOptions );

	};

	constructor( cells = [], options = {} ) {

		this.cells = [];
		this.variables = undefined;
		this.dimension = undefined;
		this.values = undefined;
		this.blending = options.blending || 'first';
		this.indexMode = options.index || 'none';
		this.resolution = options.resolution;
		this.index = null;

		for ( const cell of cells ) this.add( cell );

		this.rebuildIndex();

	};

	add( cell ) {

		const entry = createCellEntry( cell );
		const interpolator = entry.interpolator;
		const variables = getInterpolatorVariables( interpolator );
		const dimension = interpolator.dimension;

		if ( !Number.isInteger( variables ) || variables < 1 ) {

			throw new TypeError( 'Mesh interpolators must expose a positive variable count.' );

		}

		if ( !Number.isInteger( dimension ) || dimension < 1 ) {

			throw new TypeError( 'Mesh interpolators must expose a positive dimension.' );

		}

		if ( this.variables === undefined ) {

			this.variables = variables;
			this.dimension = dimension;
			this.values = interpolator.values;

		} else {

			if ( variables !== this.variables ) {

				throw new RangeError( `Mesh cell variables must match ${ this.variables }, received ${ variables }.` );

			}

			if ( dimension !== this.dimension ) {

				throw new RangeError( `Mesh cell dimension must match ${ this.dimension }, received ${ dimension }.` );

			}

		}

		this.cells.push( entry );
		this.index = null;

		return this;

	};

	rebuildIndex() {

		if ( this.cells.length === 0 ) return this;

		if ( this.indexMode === 'none' || this.indexMode === false ) {

			this.index = null;
			return this;

		}

		if ( this.indexMode !== 'grid' ) {

			throw new RangeError( `Unsupported mesh index mode "${ this.indexMode }".` );

		}

		this.index = createGridIndex( this.cells, this.variables, this.resolution );

		return this;

	};

	find( position ) {

		this.validateReady();
		validateSamplePosition( position, this.variables );

		for ( const cell of this.getCandidates( position ) ) {

			if ( cell.contains( position ) ) return cell;

		}

		return null;

	};

	getCandidates( position ) {

		if ( !this.index && this.indexMode === 'grid' ) this.rebuildIndex();
		if ( this.index ) return queryGridIndex( this.index, position );

		return this.cells;

	};

	contains( position ) {

		return this.find( position ) !== null;

	};

	evaluate(

		position, inputOffset = 0,
		output, outputOffset = 0

	) {

		this.validateReady();
		validateSamplePosition( position, this.variables );

		const cell = this.find( position );

		if ( !cell ) throw new RangeError( 'Position is outside the interpolation mesh.' );

		const outputNotProvided = !output;

		if ( !output ) output = new this.values.constructor( this.dimension );

		if ( this.blending === 'weighted' ) {

			this.evaluateWeighted( position, inputOffset, output, outputOffset );

		} else {

			cell.interpolator.evaluate( position, inputOffset, output, outputOffset );

		}

		if ( outputNotProvided && this.dimension === 1 ) return output[ outputOffset ];
		else return output;

	};

	evaluateWeighted( position, inputOffset, output, outputOffset ) {

		const scratch = new this.values.constructor( this.dimension );
		let totalWeight = 0;

		for ( let i = 0; i < this.dimension; i ++ ) output[ outputOffset + i ] = 0;

		for ( const cell of this.getCandidates( position ) ) {

			if ( !cell.contains( position ) ) continue;

			const weight = cell.weight( position );

			if ( weight <= 0 ) continue;
			if ( !Number.isFinite( weight ) ) throw new RangeError( 'Mesh cell weights must be finite numbers.' );

			cell.interpolator.evaluate( position, inputOffset, scratch, 0 );

			for ( let i = 0; i < this.dimension; i ++ ) {

				output[ outputOffset + i ] += scratch[ i ] * weight;

			}

			totalWeight += weight;

		}

		if ( totalWeight <= 0 ) {

			throw new RangeError( 'Position is outside the weighted interpolation mesh.' );

		}

		for ( let i = 0; i < this.dimension; i ++ ) output[ outputOffset + i ] /= totalWeight;

	};

	map( positions, handler ) {

		this.validateReady();
		validateSamplePositions( positions, this.variables );

		const sampleCount = positions.length / this.variables;
		const input = new this.values.constructor( this.variables );
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

		if ( options?.handler ) return Promise.resolve( this.map( positions, options.handler ) );

		return mapMeshInWorkers( this, positions, options );

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

	validateReady() {

		if ( this.cells.length === 0 ) throw new RangeError( 'InterpolationMesh requires at least one cell.' );
		if ( this.blending !== 'first' && this.blending !== 'weighted' ) {

			throw new RangeError( `Unsupported mesh blending mode "${ this.blending }".` );

		}
		if ( this.indexMode !== 'none' && this.indexMode !== false && this.indexMode !== 'grid' ) {

			throw new RangeError( `Unsupported mesh index mode "${ this.indexMode }".` );

		}

	};

};

export const Mesh = InterpolationMesh;
export const Spline = InterpolationMesh;

function createCellEntry( cell ) {

	const interpolator = cell?.interpolator || cell;

	if ( !interpolator || typeof interpolator.evaluate !== 'function' ) {

		throw new TypeError( 'Mesh cells must be interpolators or objects with an interpolator.' );

	}

	const bounds = cell?.bounds || createBounds( interpolator );
	const hasCustomContains = cell?.interpolator && typeof cell.contains === 'function';
	const hasCustomWeight = cell?.interpolator && typeof cell.weight === 'function';
	const contains = hasCustomContains
		? cell.contains
		: typeof interpolator.contains === 'function'
			? position => interpolator.contains( position )
			: createHyperboxContains( bounds );
	const weight = hasCustomWeight
		? cell.weight
		: () => 1;

	return {
		...cell,
		interpolator,
		bounds,
		contains,
		hasCustomContains,
		hasCustomWeight,
		weight
	};

};

function getInterpolatorVariables( interpolator ) {

	if ( Number.isInteger( interpolator.variables ) ) return interpolator.variables;
	if ( Number.isInteger( interpolator.constructor?.variables ) ) return interpolator.constructor.variables;

	return undefined;

};

function validateIndexedMeshInput( positions, values, indices, variables, dimension, cellSize ) {

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateArrayLike( indices, 'indices' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );

	if ( !Number.isInteger( variables ) || variables < 1 ) {

		throw new RangeError( 'variables must be a positive integer.' );

	}

	if ( positions.length % variables !== 0 ) {

		throw new RangeError( `positions length must be divisible by ${ variables }.` );

	}

	const vertexCount = positions.length / variables;

	if ( values.length !== vertexCount * dimension ) {

		throw new RangeError( `values length must be ${ vertexCount * dimension } for ${ vertexCount } vertices and dimension ${ dimension }.` );

	}

	if ( indices.length % cellSize !== 0 ) {

		throw new RangeError( `indices length must be divisible by ${ cellSize }.` );

	}

	for ( let i = 0; i < indices.length; i ++ ) {

		const index = indices[ i ];

		if ( !Number.isInteger( index ) || index < 0 || index >= vertexCount ) {

			throw new RangeError( `indices must contain valid vertex indices. Invalid index ${ index } at ${ i }.` );

		}

	}

};

function validateIntervalInput( positions, values, derivatives, dimension, type ) {

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );

	if ( positions.length < 2 ) throw new RangeError( 'fromIntervals requires at least two positions.' );
	if ( values.length !== positions.length * dimension ) {

		throw new RangeError( `fromIntervals expects ${ positions.length * dimension } values for dimension ${ dimension }, received ${ values.length }.` );

	}

	for ( let i = 1; i < positions.length; i ++ ) {

		if ( positions[ i ] <= positions[ i - 1 ] ) throw new RangeError( 'fromIntervals positions must be strictly increasing.' );

	}

	if ( isDerivativeMode( derivatives ) ) {

		validateDerivativeMode( derivatives );

		return;

	}

	if ( derivatives && typeof derivatives === 'object' && !ArrayBuffer.isView( derivatives ) && !Array.isArray( derivatives ) ) {

		throw new RangeError( 'Unsupported derivative inference mode object.' );

	}

	if ( derivatives !== undefined ) {

		validateArrayLike( derivatives, 'derivatives' );
		validateFiniteValues( derivatives, 'derivatives' );

		if ( derivatives.length !== positions.length * dimension ) {

			throw new RangeError( `fromIntervals expects ${ positions.length * dimension } derivatives for dimension ${ dimension }, received ${ derivatives.length }.` );

		}

	}

	if ( type.variables !== undefined && type.variables !== 1 ) {

		throw new RangeError( 'fromIntervals only supports 1D interpolator types.' );

	}

};

function validateSecondDerivativeInput( positions, values, secondDerivatives, dimension ) {

	if ( secondDerivatives === undefined ) return;

	if ( isSecondDerivativeMode( secondDerivatives ) ) {

		validateSecondDerivativeMode( secondDerivatives );
		return;

	}

	validateArrayLike( secondDerivatives, 'secondDerivatives' );
	validateFiniteValues( secondDerivatives, 'secondDerivatives' );

	if ( secondDerivatives.length !== positions.length * dimension ) {

		throw new RangeError( `fromIntervals expects ${ positions.length * dimension } secondDerivatives for dimension ${ dimension }, received ${ secondDerivatives.length }.` );

	}

}

function isSecondDerivativeMode( secondDerivatives ) {

	return typeof secondDerivatives === 'string';

}

function validateSecondDerivativeMode( secondDerivatives ) {

	if (
		secondDerivatives !== 'zero'
		&& secondDerivatives !== 'finite-difference'
	) {

		throw new RangeError( `Unsupported second derivative inference mode "${ secondDerivatives }".` );

	}

}

function isDerivativeMode( derivatives ) {

	return typeof derivatives === 'string'
		|| (
			derivatives
			&& typeof derivatives === 'object'
			&& !ArrayBuffer.isView( derivatives )
			&& !Array.isArray( derivatives )
			&& typeof derivatives.mode === 'string'
		);

}

function validateDerivativeMode( derivatives ) {

	const mode = getDerivativeModeName( derivatives );

	if (
		mode !== 'finite-difference'
		&& mode !== 'catmull-rom'
		&& mode !== 'zero'
		&& mode !== 'monotone'
		&& mode !== 'natural'
		&& mode !== 'clamped'
		&& mode !== 'cardinal'
		&& mode !== 'akima'
	) {

		throw new RangeError( `Unsupported derivative inference mode "${ mode }".` );

	}

	if ( mode === 'cardinal' ) {

		const tension = derivatives.tension ?? 0;

		if ( typeof tension !== 'number' || !Number.isFinite( tension ) ) {

			throw new RangeError( 'cardinal derivative tension must be a finite number.' );

		}

	}

}

function getDerivativeModeName( derivatives ) {

	return typeof derivatives === 'string' ? derivatives : derivatives.mode;

}

function inferIntervalDerivatives( positions, values, dimension, derivatives ) {

	const output = new values.constructor( values.length );
	const mode = getDerivativeModeName( derivatives );

	if ( mode === 'zero' ) return output.fill( 0 );
	if ( mode === 'natural' || mode === 'clamped' ) return inferCubicSplineDerivatives( positions, values, dimension, derivatives );

	for ( let point = 0; point < positions.length; point ++ ) {

		for ( let component = 0; component < dimension; component ++ ) {

			output[ point * dimension + component ] = inferDerivative(
				positions,
				values,
				dimension,
				point,
				component,
				derivatives
			);

		}

	}

	return output;

}

function inferIntervalSecondDerivatives( positions, values, dimension, mode ) {

	const output = new values.constructor( values.length ).fill( 0 );

	if ( mode === 'zero' ) return output;

	for ( let point = 1; point < positions.length - 1; point ++ ) {

		const h0 = positions[ point ] - positions[ point - 1 ];
		const h1 = positions[ point + 1 ] - positions[ point ];

		for ( let component = 0; component < dimension; component ++ ) {

			const left = getSlope( positions, values, dimension, point - 1, point, component );
			const right = getSlope( positions, values, dimension, point, point + 1, component );

			output[ point * dimension + component ] = 2 * (right - left) / (h0 + h1);

		}

	}

	return output;

}

function inferDerivative( positions, values, dimension, point, component, derivatives ) {

	const last = positions.length - 1;
	const mode = getDerivativeModeName( derivatives );

	if ( point === 0 ) return getSlope( positions, values, dimension, 0, 1, component );
	if ( point === last ) return getSlope( positions, values, dimension, last - 1, last, component );

	if ( mode === 'finite-difference' ) {

		return getSlope( positions, values, dimension, point - 1, point + 1, component );

	}

	const left = getSlope( positions, values, dimension, point - 1, point, component );
	const right = getSlope( positions, values, dimension, point, point + 1, component );

	if ( mode === 'catmull-rom' ) return (left + right) / 2;
	if ( mode === 'cardinal' ) return (1 - (derivatives.tension ?? 0)) * getSlope( positions, values, dimension, point - 1, point + 1, component );
	if ( mode === 'monotone' ) return getMonotoneDerivative( positions, values, dimension, point, component, left, right );
	if ( mode === 'akima' ) return getAkimaDerivative( positions, values, dimension, point, component );

	return (left + right) / 2;

}

function getMonotoneDerivative( positions, values, dimension, point, component, left, right ) {

	if ( left === 0 || right === 0 || Math.sign( left ) !== Math.sign( right ) ) return 0;

	const h0 = positions[ point ] - positions[ point - 1 ];
	const h1 = positions[ point + 1 ] - positions[ point ];
	const w1 = 2 * h1 + h0;
	const w2 = h1 + 2 * h0;

	return (w1 + w2) / (w1 / left + w2 / right);

}

function getAkimaDerivative( positions, values, dimension, point, component ) {

	const slopes = getExtendedSlopes( positions, values, dimension, component );
	const index = point + 2;
	const leftWeight = Math.abs( slopes[ index + 1 ] - slopes[ index ] );
	const rightWeight = Math.abs( slopes[ index - 1 ] - slopes[ index - 2 ] );

	if ( leftWeight + rightWeight === 0 ) {

		return (slopes[ index - 1 ] + slopes[ index ]) / 2;

	}

	return (leftWeight * slopes[ index - 1 ] + rightWeight * slopes[ index ]) / (leftWeight + rightWeight);

}

function getExtendedSlopes( positions, values, dimension, component ) {

	const intervalCount = positions.length - 1;
	const slopes = new Array( intervalCount + 4 );

	for ( let i = 0; i < intervalCount; i ++ ) {

		slopes[ i + 2 ] = getSlope( positions, values, dimension, i, i + 1, component );

	}

	slopes[ 1 ] = 2 * slopes[ 2 ] - slopes[ 3 ];
	slopes[ 0 ] = 2 * slopes[ 1 ] - slopes[ 2 ];
	slopes[ intervalCount + 2 ] = 2 * slopes[ intervalCount + 1 ] - slopes[ intervalCount ];
	slopes[ intervalCount + 3 ] = 2 * slopes[ intervalCount + 2 ] - slopes[ intervalCount + 1 ];

	return slopes;

}

function inferCubicSplineDerivatives( positions, values, dimension, derivatives ) {

	const mode = getDerivativeModeName( derivatives );
	const pointCount = positions.length;
	const output = new values.constructor( values.length );

	for ( let component = 0; component < dimension; component ++ ) {

		const lower = new Array( pointCount ).fill( 0 );
		const diagonal = new Array( pointCount ).fill( 0 );
		const upper = new Array( pointCount ).fill( 0 );
		const rhs = new Array( pointCount ).fill( 0 );

		if ( mode === 'clamped' ) {

			diagonal[ 0 ] = 1;
			rhs[ 0 ] = getEndpointDerivative( derivatives.start, component, dimension, getSlope( positions, values, dimension, 0, 1, component ) );
			diagonal[ pointCount - 1 ] = 1;
			rhs[ pointCount - 1 ] = getEndpointDerivative( derivatives.end, component, dimension, getSlope( positions, values, dimension, pointCount - 2, pointCount - 1, component ) );

		} else {

			const h = positions[ 1 ] - positions[ 0 ];

			diagonal[ 0 ] = 2;
			upper[ 0 ] = 1;
			rhs[ 0 ] = 3 * getSlope( positions, values, dimension, 0, 1, component );
			lower[ pointCount - 1 ] = 1;
			diagonal[ pointCount - 1 ] = 2;
			rhs[ pointCount - 1 ] = 3 * getSlope( positions, values, dimension, pointCount - 2, pointCount - 1, component );

		}

		for ( let i = 1; i < pointCount - 1; i ++ ) {

			const h0 = positions[ i ] - positions[ i - 1 ];
			const h1 = positions[ i + 1 ] - positions[ i ];
			const left = getSlope( positions, values, dimension, i - 1, i, component );
			const right = getSlope( positions, values, dimension, i, i + 1, component );

			lower[ i ] = h1;
			diagonal[ i ] = 2 * (h0 + h1);
			upper[ i ] = h0;
			rhs[ i ] = 3 * (h1 * left + h0 * right);

		}

		const solved = solveTridiagonal( lower, diagonal, upper, rhs );

		for ( let i = 0; i < pointCount; i ++ ) output[ i * dimension + component ] = solved[ i ];

	}

	return output;

}

function getEndpointDerivative( value, component, dimension, fallback ) {

	if ( value === undefined ) return fallback;
	if ( typeof value === 'number' ) return value;
	if ( Array.isArray( value ) || ArrayBuffer.isView( value ) ) return value[ component ];

	return fallback;

}

function solveTridiagonal( lower, diagonal, upper, rhs ) {

	const count = diagonal.length;
	const c = new Array( count ).fill( 0 );
	const d = new Array( count ).fill( 0 );
	const output = new Array( count ).fill( 0 );

	c[ 0 ] = upper[ 0 ] / diagonal[ 0 ];
	d[ 0 ] = rhs[ 0 ] / diagonal[ 0 ];

	for ( let i = 1; i < count; i ++ ) {

		const denominator = diagonal[ i ] - lower[ i ] * c[ i - 1 ];

		c[ i ] = i === count - 1 ? 0 : upper[ i ] / denominator;
		d[ i ] = (rhs[ i ] - lower[ i ] * d[ i - 1 ]) / denominator;

	}

	output[ count - 1 ] = d[ count - 1 ];

	for ( let i = count - 2; i >= 0; i -- ) output[ i ] = d[ i ] - c[ i ] * output[ i + 1 ];

	return output;

}

function getSlope( positions, values, dimension, start, end, component ) {

	return (
		values[ end * dimension + component ] - values[ start * dimension + component ]
	) / (
		positions[ end ] - positions[ start ]
	);

}

function createBounds( interpolator ) {

	if ( !interpolator.positions ) {

		throw new TypeError( 'Mesh cells must expose positions or custom bounds.' );

	}

	const variables = getInterpolatorVariables( interpolator );
	const bounds = new Array( variables );

	for ( let variable = 0; variable < variables; variable ++ ) {

		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;

		for ( let i = variable; i < interpolator.positions.length; i += variables ) {

			const value = interpolator.positions[ i ];

			if ( value < min ) min = value;
			if ( value > max ) max = value;

		}

		bounds[ variable ] = { min, max };

	}

	return bounds;

};

function createHyperboxContains( bounds ) {

	return position => {

		for ( let variable = 0; variable < bounds.length; variable ++ ) {

			const value = typeof position === 'number' ? position : position[ variable ];
			const { min, max } = bounds[ variable ];

			if ( value < min - EPSILON || value > max + EPSILON ) return false;

		}

		return true;

	};

};

function createGridIndex( cells, variables, resolution ) {

	const bounds = getMeshBounds( cells, variables );
	const size = normalizeResolution( resolution, variables, cells.length );
	const buckets = new Map();

	for ( let i = 0; i < cells.length; i ++ ) {

		const cell = cells[ i ];
		const min = getBucketCoordinates( bounds, size, cell.bounds, 'min' );
		const max = getBucketCoordinates( bounds, size, cell.bounds, 'max' );
		const coordinate = min.slice();

		while ( true ) {

			const key = coordinate.join( ',' );
			let bucket = buckets.get( key );

			if ( !bucket ) {

				bucket = [];
				buckets.set( key, bucket );

			}

			bucket.push( i );

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

	return {
		bounds,
		buckets,
		cells,
		resolution: size,
		variables
	};

};

function queryGridIndex( index, position ) {

	const coordinate = getPositionBucketCoordinates( index.bounds, index.resolution, position );

	if ( !coordinate ) return [];

	const bucket = index.buckets.get( coordinate.join( ',' ) );

	if ( !bucket ) return [];

	return bucket.map( cellIndex => index.cells[ cellIndex ] );

};

function getMeshBounds( cells, variables ) {

	const bounds = new Array( variables );

	for ( let variable = 0; variable < variables; variable ++ ) {

		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;

		for ( const cell of cells ) {

			if ( cell.bounds[ variable ].min < min ) min = cell.bounds[ variable ].min;
			if ( cell.bounds[ variable ].max > max ) max = cell.bounds[ variable ].max;

		}

		bounds[ variable ] = { min, max };

	}

	return bounds;

};

function normalizeResolution( resolution, variables, cellCount ) {

	if ( resolution === undefined || resolution === 'auto' ) return getAutoResolution( variables, cellCount );
	if ( Number.isInteger( resolution ) && resolution > 0 ) return new Array( variables ).fill( resolution );

	if ( resolution.length !== variables ) {

		throw new RangeError( `Mesh grid resolution must contain ${ variables } values.` );

	}

	return Array.from( resolution, value => {

		if ( !Number.isInteger( value ) || value < 1 ) throw new RangeError( 'Mesh grid resolution values must be positive integers.' );

		return value;

	} );

};

function getAutoResolution( variables, cellCount ) {

	const cellsPerAxis = cellCount ** (1 / variables );
	const scale = variables === 1 ? 2 : variables === 2 ? 1.5 : .75;
	const resolution = clamp( Math.round( cellsPerAxis * scale ), 4, 128 );

	return new Array( variables ).fill( resolution );

};

function clamp( value, min, max ) {

	return Math.min( max, Math.max( min, value ) );

};

function getBucketCoordinates( meshBounds, resolution, cellBounds, key ) {

	const coordinate = new Array( meshBounds.length );

	for ( let i = 0; i < meshBounds.length; i ++ ) {

		coordinate[ i ] = getBucketCoordinate( meshBounds[ i ], resolution[ i ], cellBounds[ i ][ key ] );

	}

	return coordinate;

};

function getPositionBucketCoordinates( meshBounds, resolution, position ) {

	const coordinate = new Array( meshBounds.length );

	for ( let i = 0; i < meshBounds.length; i ++ ) {

		const value = typeof position === 'number' ? position : position[ i ];
		const { min, max } = meshBounds[ i ];

		if ( value < min - EPSILON || value > max + EPSILON ) return null;

		coordinate[ i ] = getBucketCoordinate( meshBounds[ i ], resolution[ i ], value );

	}

	return coordinate;

};

function getBucketCoordinate( bounds, resolution, value ) {

	const { min, max } = bounds;

	if ( max === min ) return 0;

	const normalized = (value - min) / (max - min);

	return Math.min( resolution - 1, Math.max( 0, Math.floor( normalized * resolution ) ) );

};

globalThis.InterpolationMesh = InterpolationMesh;
globalThis.Mesh = Mesh;
