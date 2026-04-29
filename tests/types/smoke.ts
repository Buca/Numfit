import {
	Bilinear,
	CubicHermite,
	IDW,
	InverseDistanceWeighting,
	Linear,
	LinearRegression,
	Mesh,
	Multilinear,
	PolynomialRegression,
	QuinticHermite,
	RBF,
	RadialBasisFunction,
	RANSACRegression,
	RidgeRegression,
	Spline,
	TriangleLinear,
	crossValidateRegression
} from "numfit";

const linear = new Linear(
	new Float64Array([ 0, 1 ]),
	new Float64Array([ 0, 10 ])
);
const scalar: number | Float64Array = linear.evaluate(.5) as number | Float64Array;
const mapped = linear.map(new Float64Array([ 0, .5, 1 ]));
const grid = linear.grid({ start: 0, end: 1, shape: 3 });
grid.values[ 0 ] = 0;

const bilinear = new Bilinear(
	new Float64Array([ 0, 0, 1, 0, 0, 1, 1, 1 ]),
	new Float64Array([ 0, 10, 20, 30 ])
);
bilinear.evaluate([ .25, .75 ]);

const multilinear = new Multilinear(
	new Float64Array([ 0, 0, 1, 0, 0, 1, 1, 1 ]),
	new Float64Array([ 0, 10, 20, 30 ]),
	1,
	2
);
multilinear.poissonDisk({ radius: .25, count: 8 });

const triangle = new TriangleLinear(
	new Float64Array([ 0, 0, 1, 0, 0, 1 ]),
	new Float64Array([ 0, 10, 20 ])
);
triangle.contains([ .2, .2 ]);
triangle.getWeights([ .2, .2 ]);

const hermite = new CubicHermite({
	positions: new Float64Array([ 0, 1 ]),
	values: new Float64Array([ 0, 1 ]),
	derivatives: new Float64Array([ 1, 0 ])
});
hermite.derivative(.5);

const quintic = new QuinticHermite({
	positions: new Float64Array([ 0, 1 ]),
	values: new Float64Array([ 0, 1 ]),
	derivatives: new Float64Array([ 1, 0 ]),
	secondDerivatives: new Float64Array([ 0, 0 ])
});
quintic.secondDerivative(.5);

const spline = Spline.fromIntervals({
	type: CubicHermite,
	positions: new Float64Array([ 0, 1, 2 ]),
	values: new Float64Array([ 0, 1, 0 ]),
	derivatives: { mode: "cardinal", tension: .5 },
	index: "grid",
	resolution: 4
});
spline.evaluate(.5);

const quinticSpline = Mesh.fromIntervals({
	type: QuinticHermite,
	positions: new Float64Array([ 0, 1, 2 ]),
	values: new Float64Array([ 0, 1, 0 ]),
	derivatives: "finite-difference",
	secondDerivatives: "zero"
});
quinticSpline.evaluate(1.5);

const idw = new InverseDistanceWeighting({
	positions: new Float64Array([ 0, 0, 1, 0, 0, 1 ]),
	values: new Float64Array([ 0, 10, 20 ]),
	variables: 2,
	power: 2,
	radius: 2,
	neighbors: 2,
	empty: "nearest",
	index: "grid"
});
idw.evaluate([ .25, .25 ]);

const idwAlias = new IDW({
	positions: new Float64Array([ 0, 1 ]),
	values: new Float64Array([ 0, 1 ]),
	empty: 0
});
idwAlias.evaluate(.5);

const rbf = new RadialBasisFunction({
	positions: new Float64Array([ 0, 1, 2 ]),
	values: new Float64Array([ 0, 1, 0 ]),
	kernel: "thin-plate",
	smoothing: .001
});
rbf.evaluate(.75);

const rbfAlias = new RBF(
	new Float64Array([ 0, 1 ]),
	new Float64Array([ 0, 1 ]),
	1,
	1,
	{ kernel: "gaussian", epsilon: 1 }
);
rbfAlias.evaluate(.5);

const regression = new PolynomialRegression({
	positions: new Float64Array([ 0, 1, 2 ]),
	values: new Float64Array([ 1, 3, 5 ]),
	degree: 1,
	weights: new Float64Array([ 1, 1, .5 ]),
	robust: "huber",
	delta: 1,
	maxIterations: 10,
	tolerance: 1e-6,
	normalize: "standard"
});
regression.predict(.5);
regression.residuals();
regression.mse();
regression.rmse();
regression.mae();
regression.rss();
regression.tss();
regression.aic();
regression.bic();
regression.leverage();
regression.studentizedResiduals();
regression.cooksDistance();
regression.r2();
regression.summary().coefficients[ 0 ].toFixed();
regression.influence().cooksDistance[ 0 ].toFixed();
regression.iterations.toFixed();
regression.normalization?.offsets[ 0 ].toFixed();

new LinearRegression({
	positions: new Float64Array([ 0, 1, 2 ]),
	values: new Float64Array([ 1, 3, 5 ])
}).score();

new RidgeRegression({
	positions: new Float64Array([ 0, 1, 2 ]),
	values: new Float64Array([ 1, 3, 5 ]),
	regularization: .1
}).score();

const ransac = new RANSACRegression({
	model: LinearRegression,
	positions: new Float64Array([ 0, 1, 2, 3 ]),
	values: new Float64Array([ 1, 3, 100, 7 ]),
	threshold: .5,
	iterations: 50,
	sampleSize: 2,
	minInliers: 3,
	refit: true,
	seed: 5
});
ransac.bestModel.score();
ransac.inliers.length.toFixed();
ransac.outliers.length.toFixed();
ransac.summary().bestError?.toFixed();
ransac.influence().leverage[ 0 ].toFixed();

const cv = crossValidateRegression({
	model: PolynomialRegression,
	positions: new Float64Array([ 0, 1, 2, 3 ]),
	values: new Float64Array([ 0, 1, 4, 9 ]),
	degree: [ 1, 2 ],
	regularization: [ 0, .01 ],
	normalize: [ false, "standard" ],
	folds: 2,
	metric: "mse",
	seed: 1
});
cv.bestModel.evaluate(4);
cv.results[ 0 ].std.toFixed();

async function asyncSamplerSmoke() {
	await linear.mapAsync(new Float64Array([ 0, 1 ]));

	for await (const chunk of linear.stream({ start: 0, end: 1, shape: 3 })) {
		chunk.values[ 0 ] = scalar as number;
	}
}

void mapped;
void asyncSamplerSmoke;
