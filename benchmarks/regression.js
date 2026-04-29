import {
	LinearRegression,
	PolynomialRegression,
	RANSACRegression,
	RidgeRegression,
	crossValidateRegression
} from '../src/index.js';

const sampleCounts = parseList( process.env.NUMFIT_REGRESSION_SAMPLES, [ 1000, 10000 ] );
const degree = Number.parseInt( process.env.NUMFIT_REGRESSION_DEGREE || '3', 10 );
const iterations = Number.parseInt( process.env.NUMFIT_RANSAC_ITERATIONS || '50', 10 );

console.log( 'Numfit regression benchmark' );
console.log( `samples: ${ sampleCounts.join( ', ' ) }, degree: ${ degree }, ransac iterations: ${ iterations }` );
console.log( '' );

for ( const count of sampleCounts ) {

	const { positions, values } = createData( count );

	console.log( `Samples: ${ count }` );
	measure( 'PolynomialRegression fit', () => new PolynomialRegression({ positions, values, degree, normalize: 'standard' }) );
	measure( 'RidgeRegression fit', () => new RidgeRegression({ positions, values, degree, regularization: 1e-3, normalize: 'standard' }) );
	measure( 'LinearRegression fit', () => new LinearRegression({ positions, values, normalize: 'standard' }) );
	measure( 'Huber IRLS fit', () => new PolynomialRegression({ positions, values, degree: 1, robust: 'huber', delta: 1, normalize: 'standard' }) );
	measure( 'RANSAC fit', () => new RANSACRegression({
		model: LinearRegression,
		positions,
		values,
		threshold: 1,
		iterations,
		seed: 42,
		normalize: 'standard'
	}) );

	if ( count <= 2000 ) {

		measure( 'crossValidateRegression', () => crossValidateRegression({
			model: PolynomialRegression,
			positions,
			values,
			degree: [ 1, 2, 3 ],
			regularization: [ 0, 1e-3 ],
			normalize: [ false, 'standard' ],
			folds: 5,
			seed: 42
		}) );

	}

	console.log( '' );

}

function measure( label, fn ) {

	const start = performance.now();
	const result = fn();
	const elapsed = performance.now() - start;
	const score = typeof result?.rmse === 'function' ? ` rmse=${ result.rmse().toFixed( 6 ) }` : '';

	console.log( `${ label.padEnd( 28 ) } ${ elapsed.toFixed( 2 ).padStart( 10 ) } ms${ score }` );

}

function createData( count ) {

	const positions = new Float64Array( count );
	const values = new Float64Array( count );

	for ( let i = 0; i < count; i ++ ) {

		const x = -2 + 4 * i / ( count - 1 );
		const noise = Math.sin( i * 12.9898 ) * 0.05;

		positions[ i ] = x;
		values[ i ] = 1 + 2 * x - 0.5 * x * x + noise;

		if ( i % 97 === 0 ) values[ i ] += 4;

	}

	return { positions, values };

}

function parseList( value, fallback ) {

	if ( !value ) return fallback;

	return value.split( ',' ).map( item => Number.parseInt( item.trim(), 10 ) ).filter( value => Number.isInteger( value ) && value > 1 );

}
