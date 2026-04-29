function isArrayLike( value ) {

	return value && typeof value.length === 'number';

};

function getTypeName( value ) {

	return value?.constructor?.name || typeof value;

};

export function validateDimension( dimension ) {

	if ( !Number.isInteger( dimension ) || dimension < 1 ) {

		throw new TypeError( 'dimension must be a positive integer.' );

	}

};

export function validateArrayLike( value, name ) {

	if ( !isArrayLike( value ) ) {

		throw new TypeError( `${ name } must be an array or typed array.` );

	}

};

export function validateFiniteValues( values, name ) {

	for ( let i = 0; i < values.length; i ++ ) {

		if ( typeof values[ i ] !== 'number' || !Number.isFinite( values[ i ] ) ) {

			throw new TypeError( `${ name } must contain only finite numbers. Invalid value at index ${ i }.` );

		}

	}

};

export function validateConstructorInput( type, positions, values, dimension ) {

	validateDimension( dimension );
	validateArrayLike( positions, 'positions' );
	validateArrayLike( values, 'values' );
	validateFiniteValues( positions, 'positions' );
	validateFiniteValues( values, 'values' );

	const degree = type.degree;
	const variables = type.variables;
	const pointsPerAxis = degree + 1;
	const expectedPositions = pointsPerAxis * variables;
	const expectedValues = (pointsPerAxis ** variables) * dimension;

	if ( positions.length !== expectedPositions ) {

		throw new RangeError(
			`${ type.name } expects ${ expectedPositions } position values, received ${ positions.length } from ${ getTypeName( positions ) }.` 
		);

	}

	if ( values.length !== expectedValues ) {

		throw new RangeError(
			`${ type.name } expects ${ expectedValues } values for dimension ${ dimension }, received ${ values.length } from ${ getTypeName( values ) }.` 
		);

	}

	for ( let variable = 0; variable < variables; variable ++ ) {

		const seen = new Set();

		for ( let point = 0; point < pointsPerAxis; point ++ ) {

			const value = positions[ point * variables + variable ];

			if ( seen.has( value ) ) {

				throw new RangeError( `${ type.name } positions must be unique on every axis. Duplicate ${ value } on axis ${ variable }.` );

			}

			seen.add( value );

		}

	}

};

export function validateSamplePosition( position, variables, name = 'position' ) {

	if ( variables === 1 && typeof position === 'number' ) {

		if ( !Number.isFinite( position ) ) throw new TypeError( `${ name } must be finite.` );
		return;

	}

	validateArrayLike( position, name );

	if ( position.length < variables ) {

		throw new RangeError( `${ name } must contain at least ${ variables } values.` );

	}

	for ( let i = 0; i < variables; i ++ ) {

		if ( typeof position[ i ] !== 'number' || !Number.isFinite( position[ i ] ) ) {

			throw new TypeError( `${ name } must contain finite numbers. Invalid value at index ${ i }.` );

		}

	}

};

export function validateSamplePositions( positions, variables ) {

	validateArrayLike( positions, 'positions' );
	validateFiniteValues( positions, 'positions' );

	if ( positions.length % variables !== 0 ) {

		throw new RangeError( `positions length must be divisible by ${ variables }.` );

	}

};

export function validateStepInput( start, end, size, variables ) {

	validateSamplePosition( start, variables, 'start' );
	validateSamplePosition( end, variables, 'end' );
	validateSamplePosition( size, variables, 'size' );

	for ( let i = 0; i < variables; i ++ ) {

		const value = typeof size === 'number' ? size : size[ i ];

		if ( value === 0 ) throw new RangeError( 'size values must be non-zero.' );

	}

};

export function validateSegmentInput( start, end, amount, variables ) {

	validateSamplePosition( start, variables, 'start' );
	validateSamplePosition( end, variables, 'end' );
	validateSamplePosition( amount, variables, 'amount' );

	for ( let i = 0; i < variables; i ++ ) {

		const value = typeof amount === 'number' ? amount : amount[ i ];

		if ( !Number.isInteger( value ) || value < 2 ) {

			throw new RangeError( 'amount values must be integers greater than or equal to 2.' );

		}

	}

};
