# Changelog

## 1.1.0 - 2026-04-29

- Added modern ESM/package export metadata and browser ESM builds.
- Added Node and browser worker-backed `mapAsync` paths.
- Added tensor-polynomial `Polynomial`, `Multipolynomial`, `Multilinear`, `Multiquadratic`, and `Multicubic`.
- Added simplex interpolation with `SimplexLinear`, `TriangleLinear`, and `TetrahedralLinear`.
- Added `InterpolationMesh`, `Mesh`, and `Spline` piecewise wrappers with interval, triangle, tetrahedron, and simplex construction helpers.
- Added grid, slice, random, Latin-hypercube, Poisson disk, adaptive, and chunked stream samplers.
- Added scattered-data interpolation with `InverseDistanceWeighting`/`IDW` and `RadialBasisFunction`/`RBF`.
- Added Hermite interpolation with `CubicHermite`, `Hermite`, and `QuinticHermite`.
- Added regression models: `PolynomialRegression`, `LinearRegression`, `RidgeRegression`, and `RANSACRegression`.
- Added weighted least squares, Huber/IRLS, normalization, cross-validation, model selection, and regression diagnostics.
- Added TypeScript declarations and type smoke tests.
- Added benchmark scripts for mapping, meshes, IDW, and regression.
