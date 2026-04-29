<p align="center">
  <img width="353" height="140" src="numfit-logo.png">
</p>

**Numfit** is a JavaScript library for numerical interpolation and extrapolation. It supports tensor-grid interpolation on intervals, rectangles, boxes, and hyperboxes; simplex interpolation on triangles, tetrahedra, and higher-dimensional simplexes; and piecewise meshes that can combine multiple interpolators into one surface or volume.

See [docs/API.md](docs/API.md) for a generated API index from the TypeScript declarations.

## Supported Algorithms and Classes

### Tensor-Grid Interpolation
These classes interpolate over structured grids: intervals in 1D, rectangles in 2D, boxes in 3D, and their higher-dimensional pattern. They support scalar and vector-valued outputs through the `dimension` constructor argument.

| Class | Order | Variables | Shape |
| --- | --- | --- | --- |
| `Linear` | Linear | 1 | Interval |
| `Bilinear` | Linear | 2 | Rectangle |
| `Trilinear` | Linear | 3 | Box |
| `Quadratic` | Quadratic | 1 | 1D three-point curve |
| `Biquadratic` | Quadratic | 2 | 2D quadratic grid |
| `Triquadratic` | Quadratic | 3 | 3D quadratic grid |
| `Cubic` | Cubic | 1 | 1D four-point curve |
| `Bicubic` | Cubic | 2 | 2D cubic grid |
| `Tricubic` | Cubic | 3 | 3D cubic grid |
| `Polynomial` | Arbitrary | 1 | 1D polynomial curve |
| `Multilinear` | Linear | N | N-dimensional hyperbox |
| `Multiquadratic` | Quadratic | N | N-dimensional quadratic tensor grid |
| `Multicubic` | Cubic | N | N-dimensional cubic tensor grid |
| `Multipolynomial` | Arbitrary | N | N-dimensional polynomial tensor grid |
| `CubicHermite` | Cubic | 1 | 1D curve with endpoint derivatives |
| `QuinticHermite` | Quintic | 1 | 1D curve with endpoint first and second derivatives |

All tensor-grid classes provide:

- `evaluate(position)`
- `map(positions)`
- `mapAsync(positions, options)` in Node and modern browsers
- `step(start, end, size, handler)`
- `segment(start, end, amount, handler)`
- `grid(options, handler)`
- `slice(options, handler)`
- `random(count, options, handler)`
- `latinHypercube(count, options, handler)`
- `poissonDisk(options, handler)`
- `adaptive(start, end, options)` for 1D interpolators
- `stream(options)` for chunked grid sampling
- static `evaluate(...)`
- static `coefficients(...)`

The fixed 1D/2D/3D classes use optimized coefficient evaluators. The `Multi*` and `Polynomial` classes use tensor-product Lagrange interpolation and are useful when you need arbitrary dimensionality or arbitrary polynomial degree. Their `mapAsync` methods can use the same Node and browser worker path for larger batches.

```javascript
import { Multipolynomial } from 'numfit';

const polynomial = new Multipolynomial(
	new Float64Array([ 0,0, 1,1, 2,2 ]),
	new Float64Array([
		0, 1, 4,
		1, 2, 5,
		4, 5, 8
	]),
	1,
	2,
	2
);

polynomial.evaluate([ .5, .5 ]);
```

### Simplex Interpolation
Simplex interpolation is for unstructured linear cells. Use it when your domain is made from triangles, tetrahedra, or generic N-dimensional simplexes rather than rectangles or boxes.

| Class | Variables | Shape |
| --- | --- | --- |
| `SimplexLinear` | Inferred or supplied | Generic N-dimensional simplex |
| `TriangleLinear` | 2 | Triangle |
| `TetrahedralLinear` | 3 | Tetrahedron |

Simplex classes provide:

- `evaluate(position)`
- `map(positions)`
- `mapAsync(positions)`
- `grid(options, handler)`
- `slice(options, handler)`
- `random(count, options, handler)`
- `latinHypercube(count, options, handler)`
- `poissonDisk(options, handler)`
- `adaptive(start, end, options)` for 1D simplexes
- `stream(options)`
- `contains(position)`
- `getWeights(position)`
- static `evaluate(...)`

### Piecewise Meshes
Meshes combine multiple interpolators into one piecewise interpolator. A mesh can mix any interpolator types as long as they share the same variable count and output dimension.

| Class | Purpose |
| --- | --- |
| `InterpolationMesh` | Piecewise wrapper for any mix of supported interpolators |
| `Mesh` | Alias for `InterpolationMesh` |
| `Spline` | Alias for `InterpolationMesh` when modeling piecewise curves |

Mesh cells can be plain interpolator instances or custom entries:

```javascript
{
	interpolator,
	contains: position => true,
	weight: position => 1
}
```

Meshes provide:

- `fromIntervals(options)`
- `fromTriangles(positions, values, indices, options)`
- `fromTetrahedra(positions, values, indices, options)`
- `fromSimplexes(positions, values, indices, options)`
- `add(cell)`
- `rebuildIndex()`
- `find(position)`
- `contains(position)`
- `evaluate(position)`
- `map(positions)`
- `mapAsync(positions)`
- `grid(options, handler)`
- `slice(options, handler)`
- `random(count, options, handler)`
- `latinHypercube(count, options, handler)`
- `poissonDisk(options, handler)`
- `adaptive(start, end, options)` for 1D meshes
- `stream(options)`

Overlap behavior:

- Default: first containing cell wins.
- Weighted mode: set `{ blending: 'weighted' }` and provide per-cell `weight(position)` functions.

For 1D splines, use the same general wrapper with interval interpolators:

```javascript
import { CubicHermite, Linear, Spline } from 'numfit';

const spline = Spline.fromIntervals({
	type: CubicHermite,
	positions: [ 0, 1, 2, 3 ],
	values: [ 0, 1, 0, 2 ],
	derivatives: 'finite-difference'
});

spline.evaluate( .5 );
spline.evaluate( 1.5 );
```

### Scattered-Data Interpolation
Scattered-data interpolators work from arbitrary sample points instead of structured grids or explicit mesh cells.

| Class | Alias | Purpose |
| --- | --- | --- |
| `InverseDistanceWeighting` | `IDW` | Weighted scattered interpolation by inverse distance |
| `RadialBasisFunction` | `RBF` | Global scattered interpolation with radial kernels |

`InverseDistanceWeighting` supports scalar and vector-valued outputs, exact sample hits, optional radius cutoffs, and optional nearest-neighbor limits. New scattered-data classes use object-style construction as the preferred API:

```javascript
import { InverseDistanceWeighting } from 'numfit';

const idw = new InverseDistanceWeighting({
	positions: new Float64Array([
		0, 0,
		1, 0,
		0, 1,
		1, 1
	]),
	values: new Float64Array([ 0, 10, 20, 30 ]),
	variables: 2,
	dimension: 1,
	power: 2,
	neighbors: 8,
	radius: Infinity,
	index: 'grid',
	resolution: 'auto',
	empty: 'throw'
});

idw.evaluate([ .25, .5 ]);
```

When `radius` excludes every source sample, `empty` controls the fallback:

```javascript
new InverseDistanceWeighting({ positions, values, variables: 2, radius: .1, empty: 'throw' });
new InverseDistanceWeighting({ positions, values, variables: 2, radius: .1, empty: 'nearest' });
new InverseDistanceWeighting({ positions, values, variables: 2, radius: .1, empty: 0 });
new InverseDistanceWeighting({ positions, values, variables: 2, dimension: 3, radius: .1, empty: [ 0, 0, 0 ] });
new InverseDistanceWeighting({ positions, values, variables: 2, radius: .1, empty: 'undefined' });
new InverseDistanceWeighting({ positions, values, variables: 2, radius: .1, empty: 'null' });
```

`empty: 'throw'` is the default. In packed outputs from `map`, `grid`, or other samplers, `undefined` and `null` fallbacks are represented as `NaN` because numeric typed arrays cannot store those values.

For larger scattered datasets, enable a uniform grid index:

```javascript
const idw = new InverseDistanceWeighting({
	positions,
	values,
	variables: 2,
	radius: .05,
	neighbors: 16,
	index: 'grid',
	resolution: 'auto'
});
```

Grid indexing accelerates finite-radius queries and nearest fallback lookup. Use `rebuildIndex()` after mutating source positions:

```javascript
idw.positions[ 0 ] = .25;
idw.rebuildIndex();
```

For consistency with older classes, positional construction is also supported:

```javascript
const idw = new InverseDistanceWeighting(
	positions,
	values,
	1,
	2,
	{ power: 2 }
);
```

`RadialBasisFunction` solves a dense interpolation system and evaluates a weighted radial kernel sum:

```javascript
import { RadialBasisFunction } from 'numfit';

const rbf = new RadialBasisFunction({
	positions,
	values,
	variables: 2,
	dimension: 1,
	kernel: 'gaussian',
	epsilon: 1,
	smoothing: 0
});

rbf.evaluate([ .25, .5 ]);
```

Supported RBF kernels:

- `gaussian`
- `multiquadric`
- `inverse-multiquadric`
- `linear`
- `cubic`
- `thin-plate`

The `linear`, `cubic`, and `thin-plate` kernels include a linear polynomial tail so their interpolation systems are well-posed. `smoothing` adds a non-negative diagonal term when exact interpolation is not desired.

### Regression
Regression classes fit approximate models to sampled data instead of requiring exact interpolation through every point.

| Class | Purpose |
| --- | --- |
| `PolynomialRegression` | Least-squares, weighted least-squares, and Huber/IRLS polynomial regression for 1D or N-dimensional inputs |
| `LinearRegression` | Convenience regression with `degree: 1` |
| `RidgeRegression` | Polynomial regression using the `regularization` option |
| `RANSACRegression` | Robust wrapper that fits a regression model from random inlier consensus |

```javascript
import { PolynomialRegression } from 'numfit';

const fit = new PolynomialRegression({
	positions: new Float64Array([ 0, 1, 2, 3 ]),
	values: new Float64Array([ 1, 3, 5, 7 ]),
	degree: 1,
	regularization: 0,
	weights: new Float64Array([ 1, 1, 1, 1 ])
});

fit.evaluate( 4 );
fit.residuals();
fit.mse();
fit.rmse();
fit.mae();
fit.r2();
fit.summary();
```

Multivariate polynomial regression uses total-degree polynomial terms:

```javascript
const surface = new PolynomialRegression({
	positions,
	values,
	variables: 2,
	degree: 2,
	dimension: 1,
	regularization: 1e-6,
	normalize: 'standard'
});
```

Use `normalize: 'standard'` to center and scale each input variable before fitting, or `normalize: 'minmax'` to map each variable by its observed range. Public `positions` and `evaluate()` inputs stay in the original coordinate system.

Use `weights` for weighted least squares. Each sample gets one non-negative weight; zero excludes the sample from the fit:

```javascript
const weighted = new PolynomialRegression({
	positions,
	values,
	degree: 2,
	weights
});
```

Use Huber regression when some samples may be outliers but you do not want to discard them entirely. Huber uses iteratively reweighted least squares, starting from the ordinary weighted fit:

```javascript
const robust = new PolynomialRegression({
	positions,
	values,
	degree: 2,
	robust: 'huber',
	delta: 1,
	maxIterations: 20,
	tolerance: 1e-6
});
```

`delta` is the residual size where Huber switches from squared loss to linear loss. `iterations` reports how many IRLS passes were used.

Use `RANSACRegression` when a dataset may contain bad samples that should be excluded from the final fit. It wraps `PolynomialRegression`, `LinearRegression`, or `RidgeRegression`, finds the largest inlier set, and optionally refits the final model on those inliers:

```javascript
const robust = new RANSACRegression({
	model: LinearRegression,
	positions,
	values,
	threshold: .5,
	iterations: 100,
	sampleSize: 2,
	refit: true,
	seed: 7
});

robust.evaluate( 4 );
robust.inliers;
robust.outliers;
robust.bestModel;
```

Use `crossValidateRegression` to compare model options with k-fold cross-validation. Array-valued options such as `degree`, `regularization`, `robust`, and `normalize` are expanded into a grid:

```javascript
const selected = crossValidateRegression({
	model: PolynomialRegression,
	positions,
	values,
	degree: [ 1, 2, 3 ],
	regularization: [ 0, 1e-6, 1e-3 ],
	normalize: [ false, 'standard' ],
	folds: 5,
	metric: 'mse',
	seed: 7
});

selected.bestModel;
selected.bestOptions;
selected.results;
```

Supported metrics are `mse`, `rmse`, `mae`, and `r2`.

Regression instances expose diagnostic helpers for inspecting a fit:

```javascript
fit.rss();     // residual sum of squares
fit.tss();     // total sum of squares
fit.mse();
fit.rmse();
fit.mae();
fit.r2();
fit.aic();
fit.bic();

const summary = fit.summary();
summary.coefficients;
summary.rmse;
```

For least-squares-style influence checks, use leverage, studentized residuals, and Cook's distance:

```javascript
fit.leverage();
fit.studentizedResiduals();
fit.cooksDistance();

const influence = fit.influence();
influence.leverage;
influence.cooksDistance;
```

These diagnostics respect weighted fits, ridge regularization, and input normalization. `RANSACRegression` delegates them to its final `bestModel`.

### Hermite Interpolation
Hermite interpolation uses values and derivatives. `CubicHermite` is a 1D cubic Hermite interpolator for one interval with first derivative constraints. `QuinticHermite` adds second derivative constraints.

```javascript
import { CubicHermite } from 'numfit';

const hermite = new CubicHermite({
	positions: new Float64Array([ 0, 1 ]),
	values: new Float64Array([ 0, 1 ]),
	derivatives: new Float64Array([ 0, 0 ])
});

hermite.evaluate( .5 );
hermite.derivative( .5 );
```

For second derivative constraints, use `QuinticHermite`:

```javascript
const quintic = new QuinticHermite({
	positions: [ 0, 1 ],
	values: [ 0, 1 ],
	derivatives: [ 1, 1 ],
	secondDerivatives: [ 0, 0 ]
});

quintic.evaluate( .5 );
quintic.derivative( .5 );
quintic.secondDerivative( .5 );
```

The alias `Hermite` points to `CubicHermite`. Positional construction is also supported:

```javascript
const hermite = new CubicHermite(
	[ 0, 1 ],
	[ 0, 1 ],
	[ 0, 0 ]
);
```

For piecewise Hermite curves, use the same general `Spline`/`InterpolationMesh` wrapper used by every other piecewise composition:

```javascript
import { CubicHermite, Spline } from 'numfit';

const spline = Spline.fromIntervals({
	type: CubicHermite,
	positions: [ 0, 1, 2, 3 ],
	values: [ 0, 1, 0, 2 ],
	derivatives: [ 1, 0, -1, 2 ]
});

spline.evaluate( 1.5 );
```

### Parallel and Browser Support
`mapAsync` can use worker threads in Node and module workers in modern browsers. Typed-array inputs use the fastest path: position chunks are transferred to workers, and typed-array outputs can be written into a shared output buffer.

## Installation

### NodeJS Enviroment

#### Using NPM

```bash
npm install numfit
```

```javascript
import { Linear } from 'numfit';
```

### Browser Enviroment
There's a couple ways to use **Numfit** in you browser based projects:
 
#### Using CDN (Recommended)

To harness the library without the complexities of local deployment, consider employing a Content Delivery Network (CDN). Simply incorporate the following script tag into your HTML document's `<head>` section:

```html
<script src="https://cdn.jsdelivr.net/gh/buca/numfit/build/Numfit.min.js"></script>
```

For modern browser projects, use the ESM build:

```html
<script type="module">
	import { Linear } from 'https://cdn.jsdelivr.net/gh/buca/numfit/build/Numfit.module.js';
</script>
```

Browser `mapAsync` uses a module worker when `Worker` is available. Keep `Numfit.worker.js` in the same directory as `Numfit.module.js`, or pass a custom worker URL:

```javascript
const values = await linear.mapAsync( positions, {
	workers: 4,
	workerUrl: new URL( './Numfit.worker.js', import.meta.url )
});
```

Mesh `mapAsync` uses a separate module worker for serializable built-in simplex meshes. Keep `Numfit.mesh.worker.js` in the same directory as `Numfit.module.js`, or pass a custom mesh worker URL:

```javascript
const values = await mesh.mapAsync( positions, {
	workers: 4,
	meshWorkerUrl: new URL( './Numfit.mesh.worker.js', import.meta.url )
});
```

#### Using a Local Copy

Alternatively, you can opt for a local deployment of the library. Locate the `/build/` directory within this repository and download either the standard `Numfit.js` file or the minified version `Numfit.min.js`. Then, incorporate the downloaded file into your HTML document's `<head>` section using a `<script>` tag:

```html
<script src="my-directory/Numfit.min.js"></script>
```

Or import the local ESM build:

```javascript
import { Linear } from './my-directory/Numfit.module.js';
```

Replace `my-directory` with the actual path to the downloaded file.

## Basic Usage
```javascript
const positions = [ 0, 1 ];
const values = [ 0, 0, 0, 255, 255, 255 ];
const dimension = 3;
const linear = new Linear( positions, values, dimension );

linear.evaluate(  0 );
linear.evaluate( .5 ); 
linear.evaluate(  1 );
```

### Parallel Mapping
For larger batches in NodeJS, `mapAsync` can split `map` evaluation across worker threads:

```javascript
const linear = new Linear( [ 0, 1 ], [ 0, 10 ] );
const values = await linear.mapAsync(
	[ 0, .25, .5, .75, 1 ],
	{ workers: 2, threshold: 0 }
);
```

By default, `mapAsync` estimates the amount of work from the sample count and interpolation complexity. Small or inexpensive batches fall back to the normal synchronous `map` implementation; larger batches use the worker pool. The pool size is capped by `node:os.availableParallelism() - 1`, and auto mode currently uses at most four workers. You can still force worker usage with `{ threshold: 0, workers: 2 }`, up to the available worker limit.

Typed-array inputs and values use the fastest worker path. Position chunks are transferred to workers, and typed-array outputs are written into a shared output buffer so the main thread does not need to copy result chunks back together.

### Samplers
`step` and `segment` remain the low-level structured samplers. `grid` wraps that idea with plotting-friendly metadata:

```javascript
const sampled = bilinear.grid({
	start: [ 0, 0 ],
	end: [ 1, 1 ],
	shape: [ 128, 128 ]
});

sampled.positions;
sampled.values;
sampled.shape;
```

Use `slice` to sample a lower-dimensional cut through a higher-dimensional interpolator:

```javascript
const zHalf = tricubic.slice({
	axes: [ 0, 1 ],
	fixed: { 2: .5 },
	start: [ 0, 0 ],
	end: [ 1, 1 ],
	shape: [ 128, 128 ]
});
```

For scattered sampling, use `random`, `latinHypercube`, or `poissonDisk`. They accept explicit bounds, or infer bounds from the interpolator:

```javascript
const random = mesh.random( 1000, {
	min: [ 0, 0 ],
	max: [ 1, 1 ],
	seed: 123
});

const stratified = mesh.latinHypercube( 1000, {
	min: [ 0, 0 ],
	max: [ 1, 1 ],
	seed: 123
});

const even = mesh.poissonDisk({
	min: [ 0, 0 ],
	max: [ 1, 1 ],
	radius: .05,
	seed: 123
});
```

`poissonDisk` can also estimate a radius from a target count. The result may contain fewer points than the requested count when the inferred radius fills the domain first:

```javascript
const even = mesh.poissonDisk({
	min: [ 0, 0 ],
	max: [ 1, 1 ],
	count: 1000,
	seed: 123
});
```

For 1D curves, `adaptive` recursively adds samples where midpoint error is above a tolerance:

```javascript
const curve = cubic.adaptive( 0, 1, {
	tolerance: 1e-4,
	maxDepth: 16
});
```

For very large grids, `stream` yields chunks without allocating the full grid at once:

```javascript
for await ( const chunk of tricubic.stream({
	start: [ 0, 0, 0 ],
	end: [ 1, 1, 1 ],
	shape: [ 256, 256, 128 ],
	chunkSize: 4096
}) ) {
	chunk.positions;
	chunk.values;
}
```

### Simplex Interpolation
For unstructured linear interpolation, Numfit also supports simplexes: line segments in 1D, triangles in 2D, tetrahedra in 3D, and higher-dimensional simplexes.

```javascript
import { TriangleLinear } from 'numfit';

const triangle = new TriangleLinear(
	new Float64Array([
		0, 0,
		1, 0,
		0, 1
	]),
	new Float64Array([ 10, 20, 30 ])
);

triangle.evaluate([ .25, .25 ]); // 17.5
triangle.contains([ .25, .25 ]); // true
```

Use `SimplexLinear` directly for generic N-dimensional simplexes, or `TriangleLinear` and `TetrahedralLinear` for the common 2D and 3D cases.

### Interpolation Meshes
`InterpolationMesh` is a piecewise wrapper that can combine any mix of interpolators with the same input variable count and output dimension. Simplex interpolators use their barycentric `contains` checks; grid interpolators use inferred hyperbox bounds. Earlier cells win when regions overlap.

```javascript
import { Bilinear, InterpolationMesh, TriangleLinear } from 'numfit';

const mesh = new InterpolationMesh([
	new TriangleLinear(
		new Float64Array([ 0,0, 1,0, 0,1 ]),
		new Float64Array([ 0, 10, 20 ])
	),
	new Bilinear(
		new Float64Array([ 1,0, 2,1 ]),
		new Float64Array([ 100, 200, 300, 400 ])
	)
]);

mesh.evaluate([ .25, .25 ]);
mesh.evaluate([ 1.5, .5 ]);
```

For indexed triangle or tetrahedron data, build cells directly from shared vertex buffers:

```javascript
const mesh = InterpolationMesh.fromTriangles(
	new Float64Array([
		0, 0,
		1, 0,
		0, 1,
		1, 1
	]),
	new Float64Array([ 0, 10, 20, 30 ]),
	new Uint16Array([ 0, 1, 2, 1, 3, 2 ]),
	{
		index: 'grid',
		resolution: [ 32, 32 ]
	}
);
```

Use `fromTetrahedra` for 3D tetrahedral meshes, or `fromSimplexes` with `{ cellSize, variables }` for generic simplex meshes.

For 1D piecewise curves, `fromIntervals` builds interval cells from shared point arrays:

```javascript
const linearSpline = Spline.fromIntervals({
	type: Linear,
	positions: [ 0, 1, 2, 3 ],
	values: [ 0, 1, 0, 2 ]
});

const hermiteSpline = Spline.fromIntervals({
	type: CubicHermite,
	positions: [ 0, 1, 2, 3 ],
	values: [ 0, 1, 0, 2 ],
	derivatives: [ 1, 0, -1, 2 ]
});
```

For Hermite intervals, `derivatives` can be an explicit array or an inference mode:

```javascript
Spline.fromIntervals({ type: CubicHermite, positions, values, derivatives: 'finite-difference' });
Spline.fromIntervals({ type: CubicHermite, positions, values, derivatives: 'catmull-rom' });
Spline.fromIntervals({ type: CubicHermite, positions, values, derivatives: 'zero' });
Spline.fromIntervals({ type: CubicHermite, positions, values, derivatives: 'monotone' });
Spline.fromIntervals({ type: CubicHermite, positions, values, derivatives: 'natural' });
Spline.fromIntervals({ type: CubicHermite, positions, values, derivatives: 'akima' });
Spline.fromIntervals({ type: CubicHermite, positions, values, derivatives: { mode: 'cardinal', tension: .5 } });
Spline.fromIntervals({ type: CubicHermite, positions, values, derivatives: { mode: 'clamped', start: 0, end: 0 } });
```

`monotone` is useful for shape-preserving curves, `natural` solves a global natural cubic derivative system, `akima` is useful for uneven or noisy data, `cardinal` adds tension control, and `clamped` lets you specify endpoint derivatives while inferring interior derivatives.

`QuinticHermite` intervals also accept `secondDerivatives`:

```javascript
Spline.fromIntervals({
	type: QuinticHermite,
	positions,
	values,
	derivatives: 'finite-difference',
	secondDerivatives: 'finite-difference'
});

Spline.fromIntervals({
	type: QuinticHermite,
	positions,
	values,
	derivatives: 'finite-difference',
	secondDerivatives: 'zero'
});
```

For larger meshes, enable a uniform grid index to avoid checking every cell on each lookup:

```javascript
const mesh = new InterpolationMesh(cells, {
	index: 'grid',
	resolution: 'auto'
});
```

When `index: 'grid'` is enabled, omitted resolution values use the same auto heuristic. You can still pass a fixed number for every axis, or an array for per-axis control:

```javascript
new InterpolationMesh(cells, { index: 'grid', resolution: 32 });
new InterpolationMesh(cells, { index: 'grid', resolution: [ 64, 32 ] });
```

Grid indexing uses each cell's bounds. Built-in interpolators infer bounds from their positions. Custom cells can provide bounds explicitly:

```javascript
mesh.add({
	interpolator,
	bounds: [
		{ min: 0, max: 1 },
		{ min: 0, max: 1 }
	],
	contains: position => position[ 0 ] >= 0 && position[ 1 ] >= 0
});
```

For custom regions, pass `{ interpolator, contains }` cells:

```javascript
mesh.add({
	interpolator,
	contains: position => position[ 0 ] >= 0 && position[ 1 ] >= 0
});
```

By default, the first containing cell wins. For intentional overlaps, enable weighted blending and provide per-cell weights:

```javascript
const mesh = new InterpolationMesh([
	{
		interpolator: left,
		contains: position => position >= 0 && position <= 1,
		weight: position => 1 - position
	},
	{
		interpolator: right,
		contains: position => position >= 0 && position <= 1,
		weight: position => position
	}
], {
	blending: 'weighted'
});
```

For serializable built-in simplex meshes, `mapAsync` can evaluate larger batches in worker threads or browser module workers:

```javascript
const values = await mesh.mapAsync( positions, {
	workers: 4,
	threshold: 0
});
```

Custom mesh cells with user-defined `contains` or `weight` functions fall back to synchronous mapping because those functions cannot be serialized into workers.

```javascript
const positions = [ 0,0, 1,1, 2,2, 3,3 ];
const values = [ 
	0,0,0, 255,0,0, 0,255,0, 0,0,255,
	255,0,0, 0,255,0, 0,0,255, 0,0,0, 
	0,255,0, 0,0,255, 0,0,0, 255,0,0,
	0,0,255, 0,0,0, 255,0,0, 0,255,0
];
const dimension = 3;
const bicubic = new Bicubic( positions, values, dimension );

bicubic.step( [0,0], [1,1], [.1,.1] ( position, value ) => {
	// Do something with positions and the values.
});
```

## Building and Testing

### Setup
Running the build and testing procedures is easy. First make sure you have ```npm``` installed. Then navigate to the root directory ```/``` in your CLI and run:

```bash
npm install
```

This installs the development dependencies used for building, unit tests, benchmarks, and optional browser smoke tests.

### Building
To run the build procedure, you simply navigate to the root directory ```/``` in your CLI and run
```npm run build``` which will produce five files in the ```/build/``` directory: ```Numfit.js```, ```Numfit.min.js```, ```Numfit.module.js```, ```Numfit.worker.js```, and ```Numfit.mesh.worker.js```.

### Testing
To run the tests, you again navigate to the root directory ```/``` in your CLI and run
```npm run test``` which will produce the test results.

To verify the shipped TypeScript declarations, run:

```bash
npm run test:types
```

To verify browser worker support, install the Playwright Chromium browser once and run the browser smoke test:

```bash
npm run test:browser:install
npm run test:browser
```

The browser test builds the browser artifacts, serves the project locally, opens Chromium, and verifies that `mapAsync` matches synchronous `map` output with `maxDiff: 0`.

### Benchmarking
To compare synchronous mapping with worker-thread mapping, run:

```bash
npm run benchmark
```

You can tune the run with environment variables:

```bash
NUMFIT_BENCH_SIZES=10000,100000 NUMFIT_BENCH_WORKERS=2,4 npm run benchmark
```

`NUMFIT_BENCH_WORKERS` accepts a comma-separated list of worker counts. Counts larger than `node:os.availableParallelism() - 1` are ignored by the benchmark and clamped by `mapAsync`. The benchmark includes fixed 1D/2D/3D evaluators and tensor-polynomial variants such as `Multicubic` and `Multipolynomial`.

To compare linear mesh lookup with grid-indexed and worker-backed mesh lookup, run:

```bash
npm run benchmark:mesh
```

You can tune the mesh benchmark with environment variables:

```bash
NUMFIT_MESH_CELLS=200,2000 NUMFIT_MESH_SAMPLES=1000,10000 NUMFIT_MESH_RESOLUTION=auto,16,32 NUMFIT_MESH_WORKERS=2,4 npm run benchmark:mesh
```

The mesh benchmark generates indexed triangle grids, validates indexed and worker-backed results against linear lookup, and reports speedups for each grid resolution and worker count.

To compare linear IDW lookup with grid-indexed IDW lookup, run:

```bash
npm run benchmark:idw
```

You can tune the IDW benchmark with environment variables:

```bash
NUMFIT_IDW_SOURCES=1000,10000 NUMFIT_IDW_QUERIES=1000,10000 NUMFIT_IDW_RADIUS=.08 NUMFIT_IDW_NEIGHBORS=16 npm run benchmark:idw
```

To compare regression fit costs, run:

```bash
npm run benchmark:regression
```

You can tune the regression benchmark with environment variables:

```bash
NUMFIT_REGRESSION_SAMPLES=1000,10000 NUMFIT_REGRESSION_DEGREE=3 NUMFIT_RANSAC_ITERATIONS=50 npm run benchmark:regression
```

## Roadmap
Recently completed:
- [x] Modern ESM imports and browser ESM build
- [x] Node worker-thread `mapAsync`
- [x] Browser module-worker `mapAsync`
- [x] Transfer/shared-buffer worker fast path for typed arrays
- [x] Worker acceleration for polynomial multi-variants
- [x] Validation for constructor, evaluation, and sampling inputs
- [x] Benchmark suite with correctness checks
- [x] Browser worker smoke test
- [x] Polynomial
- [x] Multilinear
- [x] Multiquadratic
- [x] Multicubic
- [x] Multipolynomial
- [x] Simplex interpolation with `SimplexLinear`, `TriangleLinear`, and `TetrahedralLinear`
- [x] Piecewise interpolation meshes with mixed interpolator support
- [x] Optional weighted blending for overlapping mesh cells
- [x] Uniform-grid spatial acceleration for large meshes
- [x] Mesh construction from triangle/tetrahedron index buffers
- [x] Mesh benchmark suite for linear scan vs grid-indexed lookup
- [x] Adaptive mesh index resolution heuristics
- [x] Worker acceleration for serializable `InterpolationMesh` simplex meshes
- [x] Plotting-friendly `grid` sampler
- [x] Lower-dimensional `slice` sampler
- [x] Random and Latin-hypercube scattered samplers
- [x] Poisson disk scattered sampler
- [x] 1D adaptive sampler
- [x] Chunked async `stream` sampler
- [x] Inverse distance weighting for scattered data
- [x] Uniform-grid spatial acceleration for IDW
- [x] IDW benchmark suite for linear scan vs grid-indexed lookup
- [x] Radial basis function interpolation for scattered data
- [x] Polynomial, linear, and ridge regression
- [x] Regression metrics: residuals, MSE, and R-squared
- [x] Weighted least-squares regression
- [x] Huber robust regression with IRLS
- [x] RANSAC regression wrapper
- [x] Regression input normalization
- [x] Cross-validation and model selection helpers
- [x] Cubic Hermite interpolation with endpoint derivative constraints
- [x] Quintic Hermite interpolation with endpoint first and second derivative constraints
- [x] Unified `Spline` alias for `InterpolationMesh`
- [x] `Spline.fromIntervals` for 1D piecewise curves
- [x] TypeScript declarations and type smoke test

Planned:
- [ ] Regression diagnostics and confidence intervals
