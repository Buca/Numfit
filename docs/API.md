# Numfit API Reference

Generated from `types/index.d.ts`. The TypeScript declarations are the canonical public API surface.

## Classes

- `Bicubic`
- `Bilinear`
- `Biquadratic`
- `Cubic`
- `CubicHermite`
- `Evaluator`
- `InterpolationMesh`
- `InverseDistanceWeighting`
- `Linear`
- `LinearRegression`
- `Multicubic`
- `Multilinear`
- `Multipolynomial`
- `Multiquadratic`
- `Polynomial`
- `PolynomialRegression`
- `Quadratic`
- `QuinticHermite`
- `RANSACRegression`
- `RadialBasisFunction`
- `RidgeRegression`
- `SimplexLinear`
- `TensorPolynomial`
- `TetrahedralLinear`
- `TriangleLinear`
- `Tricubic`
- `Trilinear`
- `Triquadratic`

## Functions

- `crossValidateRegression`

## Interfaces

- `AdaptiveOptions`
- `CrossValidationResult`
- `GridOptions`
- `GridSample`
- `IntervalOptions`
- `InverseDistanceWeightingOptions`
- `MeshCell`
- `MeshOptions`
- `PoissonDiskOptions`
- `PoissonDiskSample`
- `PolynomialRegressionOptions`
- `RANSACRegressionOptions`
- `RadialBasisFunctionOptions`
- `RandomOptions`
- `RegressionInfluence`
- `RegressionSummary`
- `SamplerSurface`
- `ScatteredSample`
- `SliceOptions`
- `SliceSample`
- `StreamChunk`
- `StreamOptions`
- `WorkerMapOptions`

## Types

- `CrossValidationOptions`
- `DerivativeMode`
- `IDWEmptyMode`
- `MeshIndexMode`
- `NumericArray`
- `Position`
- `RBFKernel`
- `RegressionMetric`
- `SecondDerivativeMode`

## Aliases

- `CubicHermite as Hermite`
- `InterpolationMesh as Mesh`
- `InterpolationMesh as Spline`
- `InverseDistanceWeighting as IDW`
- `RadialBasisFunction as RBF`

## Notes

- Most interpolators expose `evaluate`, `map`, `mapAsync`, `grid`, `slice`, scattered samplers, `adaptive`, and `stream` where applicable.
- Regression models expose diagnostics including `rss`, `tss`, `rmse`, `mae`, `aic`, `bic`, `leverage`, `studentizedResiduals`, `cooksDistance`, and `summary`.
- See the README for narrative examples and option descriptions.

