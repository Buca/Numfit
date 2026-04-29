import {
	Linear,
	LinearRegression,
	PolynomialRegression,
	RANSACRegression,
	crossValidateRegression
} from 'numfit';

const linear = new Linear(
	new Float64Array([ 0, 1 ]),
	new Float64Array([ 0, 10 ])
);

assertClose( linear.evaluate( .5 ), 5, 'Linear root import evaluate' );

const regression = new PolynomialRegression({
	positions: new Float64Array([ 0, 1, 2, 3 ]),
	values: new Float64Array([ 1, 3, 5, 7 ]),
	degree: 1,
	normalize: 'standard'
});

assertClose( regression.evaluate( 4 ), 9, 'PolynomialRegression root import evaluate' );
assertClose( regression.rmse(), 0, 'PolynomialRegression diagnostics' );

const ransac = new RANSACRegression({
	model: LinearRegression,
	positions: new Float64Array([ 0, 1, 2, 3, 4 ]),
	values: new Float64Array([ 1, 3, 100, 7, 9 ]),
	threshold: .5,
	iterations: 50,
	seed: 5
});

if ( ransac.outliers.length !== 1 ) throw new Error( `Expected one RANSAC outlier, received ${ ransac.outliers.length }.` );

const selected = crossValidateRegression({
	model: PolynomialRegression,
	positions: new Float64Array([ -2, -1, 0, 1, 2, 3 ]),
	values: new Float64Array([ 4, 1, 0, 1, 4, 9 ]),
	degree: [ 1, 2 ],
	folds: 3,
	seed: 7,
	normalize: true
});

if ( selected.bestOptions.degree !== 2 ) throw new Error( `Expected cross-validation to select degree 2, received ${ selected.bestOptions.degree }.` );

console.log( JSON.stringify({
	ok: true,
	linear: linear.evaluate( .5 ),
	regression: regression.evaluate( 4 ),
	ransacOutliers: ransac.outliers.length,
	crossValidationDegree: selected.bestOptions.degree
}, null, 2 ) );

function assertClose( actual, expected, label, tolerance = 1e-9 ) {

	if ( Math.abs( actual - expected ) > tolerance ) throw new Error( `${ label } expected ${ expected }, received ${ actual }.` );

}
