import {
	validateArrayLike,
	validateFiniteValues
} from '../Validation.js';

export function validateWeights( weights, sampleCount ) {

	validateArrayLike( weights, 'weights' );
	validateFiniteValues( weights, 'weights' );

	if ( weights.length !== sampleCount ) throw new RangeError( `weights length must be ${ sampleCount }.` );

	let positive = false;

	for ( let i = 0; i < weights.length; i ++ ) {

		if ( weights[ i ] < 0 ) throw new RangeError( 'weights must be non-negative.' );
		if ( weights[ i ] > 0 ) positive = true;

	}

	if ( !positive ) throw new RangeError( 'weights must include at least one positive value.' );

}

export function createBaseWeights( weights, sampleCount ) {

	if ( weights === undefined ) return new Array( sampleCount ).fill( 1 );

	const output = new Array( sampleCount );

	for ( let i = 0; i < sampleCount; i ++ ) output[ i ] = weights[ i ];

	return output;

}

export function copySamples( source, indices, stride ) {

	const output = new source.constructor( indices.length * stride );

	for ( let i = 0; i < indices.length; i ++ ) {

		const index = indices[ i ];

		for ( let item = 0; item < stride; item ++ ) output[ i * stride + item ] = source[ index * stride + item ];

	}

	return output;

}

export function copySampleWeights( source, indices ) {

	const output = new source.constructor( indices.length );

	for ( let i = 0; i < indices.length; i ++ ) output[ i ] = source[ indices[ i ] ];

	return output;

}

export function createIndexArray( indices ) {

	const output = new Uint32Array( indices.length );

	for ( let i = 0; i < indices.length; i ++ ) output[ i ] = indices[ i ];

	return output;

}

export function createRandom( seed ) {

	let state = Math.floor( Math.abs( seed ) ) >>> 0;

	if ( state === 0 ) state = 1;

	return () => {

		state = ( 1664525 * state + 1013904223 ) >>> 0;

		return state / 0x100000000;

	};

}
