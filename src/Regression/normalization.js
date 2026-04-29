export function validateNormalizationMode( normalize ) {

	const mode = typeof normalize === 'object' && normalize ? normalize.mode : normalize;

	if ( mode !== false && mode !== true && mode !== 'standard' && mode !== 'minmax' ) {

		throw new RangeError( "normalize must be false, true, 'standard', or 'minmax'." );

	}

}

export function createNormalization( positions, variables, normalize ) {

	const mode = typeof normalize === 'object' && normalize ? normalize.mode : normalize;

	if ( mode === false ) return null;

	const normalizedMode = mode === true ? 'standard' : mode;
	const sampleCount = positions.length / variables;
	const offsets = new Array( variables ).fill( 0 );
	const scales = new Array( variables ).fill( 1 );

	for ( let variable = 0; variable < variables; variable ++ ) {

		if ( normalizedMode === 'minmax' ) {

			let min = Infinity;
			let max = -Infinity;

			for ( let sample = 0; sample < sampleCount; sample ++ ) {

				const value = positions[ sample * variables + variable ];

				if ( value < min ) min = value;
				if ( value > max ) max = value;

			}

			offsets[ variable ] = min;
			scales[ variable ] = max === min ? 1 : max - min;

		} else {

			let mean = 0;

			for ( let sample = 0; sample < sampleCount; sample ++ ) mean += positions[ sample * variables + variable ];

			mean /= sampleCount;

			let variance = 0;

			for ( let sample = 0; sample < sampleCount; sample ++ ) {

				const delta = positions[ sample * variables + variable ] - mean;

				variance += delta * delta;

			}

			offsets[ variable ] = mean;
			scales[ variable ] = variance === 0 ? 1 : Math.sqrt( variance / sampleCount );

		}

	}

	return { mode: normalizedMode, offsets, scales };

}

export function applyNormalization( positions, variables, normalization ) {

	if ( !normalization ) return positions;

	const output = new positions.constructor( positions.length );

	for ( let i = 0; i < positions.length; i ++ ) {

		const variable = i % variables;

		output[ i ] = ( positions[ i ] - normalization.offsets[ variable ] ) / normalization.scales[ variable ];

	}

	return output;

}

export function normalizePosition( regression, position, inputOffset ) {

	if ( !regression.normalization && inputOffset === 0 ) return position;

	if ( regression.variables === 1 && typeof position === 'number' ) {

		if ( !regression.normalization ) return position;

		return ( position - regression.normalization.offsets[ 0 ] ) / regression.normalization.scales[ 0 ];

	}

	const output = new regression.positions.constructor( regression.variables );

	for ( let variable = 0; variable < regression.variables; variable ++ ) {

		let value = position[ inputOffset + variable ];

		if ( regression.normalization ) value = ( value - regression.normalization.offsets[ variable ] ) / regression.normalization.scales[ variable ];

		output[ variable ] = value;

	}

	return output;

}
