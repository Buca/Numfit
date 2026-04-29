export type NumericArray = number[] | Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array;

export type Position = number | ArrayLike<number>;

export interface WorkerMapOptions {
	workers?: number;
	threshold?: number;
	idleTimeout?: number;
	workerUrl?: string | URL;
	meshWorkerUrl?: string | URL;
	handler?: ( position: number | NumericArray, value: number | NumericArray ) => void;
}

export interface GridOptions {
	start: Position;
	end: Position;
	shape?: number | ArrayLike<number>;
	amount?: number | ArrayLike<number>;
}

export interface GridSample<TPositions extends NumericArray = NumericArray, TValues extends NumericArray = NumericArray> {
	positions: TPositions;
	values: TValues;
	start: number[];
	end: number[];
	shape: number[];
	variables: number;
	dimension: number;
}

export interface SliceOptions {
	axes?: number[];
	fixed?: ArrayLike<number> | Record<number | string, number>;
	start: Position;
	end: Position;
	shape?: number | ArrayLike<number>;
	amount?: number | ArrayLike<number>;
}

export interface SliceSample<TPositions extends NumericArray = NumericArray, TValues extends NumericArray = NumericArray> extends GridSample<TPositions, TValues> {
	axes: number[];
	fixed: ArrayLike<number> | Record<number | string, number>;
}

export interface RandomOptions {
	min?: Position;
	max?: Position;
	start?: Position;
	end?: Position;
	seed?: number;
}

export interface ScatteredSample<TPositions extends NumericArray = NumericArray, TValues extends NumericArray = NumericArray> {
	positions: TPositions;
	values: TValues;
	min: number[];
	max: number[];
	variables: number;
	dimension: number;
}

export interface PoissonDiskOptions extends RandomOptions {
	radius?: number;
	count?: number;
	maxSamples?: number;
	candidates?: number;
}

export interface PoissonDiskSample<TPositions extends NumericArray = NumericArray, TValues extends NumericArray = NumericArray> extends ScatteredSample<TPositions, TValues> {
	radius: number;
}

export interface AdaptiveOptions {
	tolerance?: number;
	minDepth?: number;
	maxDepth?: number;
}

export interface StreamOptions extends GridOptions {
	chunkSize?: number;
	mapOptions?: WorkerMapOptions;
}

export interface StreamChunk<TPositions extends NumericArray = NumericArray, TValues extends NumericArray = NumericArray> {
	offset: number;
	positions: TPositions;
	values: TValues;
	shape: number[];
	variables: number;
	dimension: number;
}

export interface SamplerSurface<TValues extends NumericArray = NumericArray> {
	map( positions: ArrayLike<number> ): TValues;
	map( positions: ArrayLike<number>, handler: ( position: number | NumericArray, value: number | TValues ) => void ): SamplerSurface<TValues>;
	mapAsync( positions: ArrayLike<number>, options?: WorkerMapOptions ): Promise<TValues>;
	grid( options: GridOptions ): GridSample<NumericArray, TValues>;
	grid( options: GridOptions, handler: ( position: number | NumericArray, value: number | TValues ) => void ): SamplerSurface<TValues>;
	slice( options: SliceOptions ): SliceSample<NumericArray, TValues>;
	slice( options: SliceOptions, handler: ( position: number | NumericArray, value: number | TValues ) => void ): SamplerSurface<TValues>;
	random( count: number, options?: RandomOptions ): ScatteredSample<NumericArray, TValues>;
	random( count: number, options: RandomOptions | undefined, handler: ( position: number | NumericArray, value: number | TValues ) => void ): SamplerSurface<TValues>;
	latinHypercube( count: number, options?: RandomOptions ): ScatteredSample<NumericArray, TValues>;
	latinHypercube( count: number, options: RandomOptions | undefined, handler: ( position: number | NumericArray, value: number | TValues ) => void ): SamplerSurface<TValues>;
	poissonDisk( options?: PoissonDiskOptions ): PoissonDiskSample<NumericArray, TValues>;
	poissonDisk( options: PoissonDiskOptions | undefined, handler: ( position: number | NumericArray, value: number | TValues ) => void ): SamplerSurface<TValues>;
	adaptive( start: number, end: number, options?: AdaptiveOptions ): GridSample<NumericArray, TValues>;
	stream( options: StreamOptions ): AsyncGenerator<StreamChunk<NumericArray, TValues>>;
}

export declare class Evaluator<TValues extends NumericArray = NumericArray> implements SamplerSurface<TValues> {
	static degree: number;
	static variables: number;
	positions: NumericArray;
	values: TValues;
	coefficients: TValues;
	dimension: number;
	constructor( positions: NumericArray, values: TValues, dimension?: number );
	evaluate( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	update(): this;
	translate( offset: Position ): this;
	scale( scale: Position, origin: Position ): this;
	step( start: Position, end: Position, size: Position, handler?: ( position: number | NumericArray, value: number | TValues ) => void ): TValues | this;
	segment( start: Position, end: Position, amount: Position, handler?: ( position: number | NumericArray, value: number | TValues ) => void ): TValues | this;
	map: SamplerSurface<TValues>["map"];
	mapAsync: SamplerSurface<TValues>["mapAsync"];
	grid: SamplerSurface<TValues>["grid"];
	slice: SamplerSurface<TValues>["slice"];
	random: SamplerSurface<TValues>["random"];
	latinHypercube: SamplerSurface<TValues>["latinHypercube"];
	poissonDisk: SamplerSurface<TValues>["poissonDisk"];
	adaptive: SamplerSurface<TValues>["adaptive"];
	stream: SamplerSurface<TValues>["stream"];
}

export declare class Linear<TValues extends NumericArray = NumericArray> extends Evaluator<TValues> {}
export declare class Bilinear<TValues extends NumericArray = NumericArray> extends Evaluator<TValues> {}
export declare class Trilinear<TValues extends NumericArray = NumericArray> extends Evaluator<TValues> {}
export declare class Quadratic<TValues extends NumericArray = NumericArray> extends Evaluator<TValues> {}
export declare class Biquadratic<TValues extends NumericArray = NumericArray> extends Evaluator<TValues> {}
export declare class Triquadratic<TValues extends NumericArray = NumericArray> extends Evaluator<TValues> {}
export declare class Cubic<TValues extends NumericArray = NumericArray> extends Evaluator<TValues> {}
export declare class Bicubic<TValues extends NumericArray = NumericArray> extends Evaluator<TValues> {}
export declare class Tricubic<TValues extends NumericArray = NumericArray> extends Evaluator<TValues> {}

export declare class TensorPolynomial<TValues extends NumericArray = NumericArray> implements SamplerSurface<TValues> {
	positions: NumericArray;
	values: TValues;
	dimension: number;
	degree: number;
	variables: number;
	constructor( positions: NumericArray, values: TValues, dimension?: number, degree?: number, variables?: number );
	evaluate( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	map: SamplerSurface<TValues>["map"];
	mapAsync: SamplerSurface<TValues>["mapAsync"];
	grid: SamplerSurface<TValues>["grid"];
	slice: SamplerSurface<TValues>["slice"];
	random: SamplerSurface<TValues>["random"];
	latinHypercube: SamplerSurface<TValues>["latinHypercube"];
	poissonDisk: SamplerSurface<TValues>["poissonDisk"];
	adaptive: SamplerSurface<TValues>["adaptive"];
	stream: SamplerSurface<TValues>["stream"];
}

export declare class Polynomial<TValues extends NumericArray = NumericArray> extends TensorPolynomial<TValues> {}
export declare class Multipolynomial<TValues extends NumericArray = NumericArray> extends TensorPolynomial<TValues> {}
export declare class Multilinear<TValues extends NumericArray = NumericArray> extends TensorPolynomial<TValues> {}
export declare class Multiquadratic<TValues extends NumericArray = NumericArray> extends TensorPolynomial<TValues> {}
export declare class Multicubic<TValues extends NumericArray = NumericArray> extends TensorPolynomial<TValues> {}

export declare class SimplexLinear<TValues extends NumericArray = NumericArray> implements SamplerSurface<TValues> {
	positions: NumericArray;
	values: TValues;
	dimension: number;
	variables: number;
	constructor( positions: NumericArray, values: TValues, dimension?: number, variables?: number );
	evaluate( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	getWeights( position: Position, inputOffset?: number, output?: NumericArray ): NumericArray;
	contains( position: Position, epsilon?: number ): boolean;
	map: SamplerSurface<TValues>["map"];
	mapAsync: SamplerSurface<TValues>["mapAsync"];
	grid: SamplerSurface<TValues>["grid"];
	slice: SamplerSurface<TValues>["slice"];
	random: SamplerSurface<TValues>["random"];
	latinHypercube: SamplerSurface<TValues>["latinHypercube"];
	poissonDisk: SamplerSurface<TValues>["poissonDisk"];
	adaptive: SamplerSurface<TValues>["adaptive"];
	stream: SamplerSurface<TValues>["stream"];
}

export declare class TriangleLinear<TValues extends NumericArray = NumericArray> extends SimplexLinear<TValues> {}
export declare class TetrahedralLinear<TValues extends NumericArray = NumericArray> extends SimplexLinear<TValues> {}

export interface MeshCell<T = SamplerSurface> {
	interpolator: T;
	bounds?: Array<{ min: number; max: number }>;
	contains?: ( position: Position ) => boolean;
	weight?: ( position: Position ) => number;
}

export type MeshIndexMode = "none" | "grid" | false;

export interface MeshOptions {
	blending?: "first" | "weighted";
	index?: MeshIndexMode;
	resolution?: "auto" | number | number[];
}

export type DerivativeMode = "finite-difference" | "catmull-rom" | "zero" | "monotone" | "natural" | "akima" | { mode: "cardinal"; tension?: number } | { mode: "clamped"; start?: number | ArrayLike<number>; end?: number | ArrayLike<number> };
export type SecondDerivativeMode = "zero" | "finite-difference";

export interface IntervalOptions<TType = new (...args: any[]) => any> extends MeshOptions {
	type: TType;
	positions: NumericArray;
	values: NumericArray;
	derivatives?: NumericArray | DerivativeMode;
	secondDerivatives?: NumericArray | SecondDerivativeMode;
	dimension?: number;
}

export declare class InterpolationMesh<TValues extends NumericArray = NumericArray> implements SamplerSurface<TValues> {
	cells: MeshCell[];
	variables: number;
	dimension: number;
	values: TValues;
	constructor( cells?: Array<SamplerSurface | MeshCell>, options?: MeshOptions );
	static fromIntervals<T extends typeof InterpolationMesh = typeof InterpolationMesh>( this: T, options: IntervalOptions ): InstanceType<T>;
	static fromTriangles<T extends typeof InterpolationMesh = typeof InterpolationMesh>( this: T, positions: NumericArray, values: NumericArray, indices: ArrayLike<number>, options?: MeshOptions & { dimension?: number } ): InstanceType<T>;
	static fromTetrahedra<T extends typeof InterpolationMesh = typeof InterpolationMesh>( this: T, positions: NumericArray, values: NumericArray, indices: ArrayLike<number>, options?: MeshOptions & { dimension?: number } ): InstanceType<T>;
	static fromSimplexes<T extends typeof InterpolationMesh = typeof InterpolationMesh>( this: T, positions: NumericArray, values: NumericArray, indices: ArrayLike<number>, options?: MeshOptions & { cellSize: number; variables?: number; dimension?: number; type?: new (...args: any[]) => any } ): InstanceType<T>;
	add( cell: SamplerSurface | MeshCell ): this;
	rebuildIndex(): this;
	find( position: Position ): MeshCell | null;
	contains( position: Position ): boolean;
	evaluate( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	map: SamplerSurface<TValues>["map"];
	mapAsync: SamplerSurface<TValues>["mapAsync"];
	grid: SamplerSurface<TValues>["grid"];
	slice: SamplerSurface<TValues>["slice"];
	random: SamplerSurface<TValues>["random"];
	latinHypercube: SamplerSurface<TValues>["latinHypercube"];
	poissonDisk: SamplerSurface<TValues>["poissonDisk"];
	adaptive: SamplerSurface<TValues>["adaptive"];
	stream: SamplerSurface<TValues>["stream"];
}

export { InterpolationMesh as Mesh, InterpolationMesh as Spline };

export declare class CubicHermite<TValues extends NumericArray = NumericArray> implements SamplerSurface<TValues> {
	positions: NumericArray;
	values: TValues;
	derivatives: TValues;
	dimension: number;
	constructor( options: { positions: NumericArray; values: TValues; derivatives: TValues; dimension?: number } );
	constructor( positions: NumericArray, values: TValues, derivatives: TValues, dimension?: number );
	evaluate( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	derivative( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	map: SamplerSurface<TValues>["map"];
	mapAsync: SamplerSurface<TValues>["mapAsync"];
	grid: SamplerSurface<TValues>["grid"];
	slice: SamplerSurface<TValues>["slice"];
	random: SamplerSurface<TValues>["random"];
	latinHypercube: SamplerSurface<TValues>["latinHypercube"];
	poissonDisk: SamplerSurface<TValues>["poissonDisk"];
	adaptive: SamplerSurface<TValues>["adaptive"];
	stream: SamplerSurface<TValues>["stream"];
}

export { CubicHermite as Hermite };

export declare class QuinticHermite<TValues extends NumericArray = NumericArray> extends CubicHermite<TValues> {
	secondDerivatives: TValues;
	constructor( options: { positions: NumericArray; values: TValues; derivatives: TValues; secondDerivatives: TValues; dimension?: number } );
	constructor( positions: NumericArray, values: TValues, derivatives: TValues, secondDerivatives: TValues, dimension?: number );
	secondDerivative( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
}

export type IDWEmptyMode = "throw" | "nearest" | "undefined" | "null" | number | ArrayLike<number>;

export interface InverseDistanceWeightingOptions {
	positions: NumericArray;
	values: NumericArray;
	variables?: number;
	dimension?: number;
	power?: number;
	radius?: number;
	neighbors?: number;
	epsilon?: number;
	empty?: IDWEmptyMode;
	index?: MeshIndexMode;
	resolution?: "auto" | number | number[];
}

export declare class InverseDistanceWeighting<TValues extends NumericArray = NumericArray> implements SamplerSurface<TValues> {
	constructor( options: InverseDistanceWeightingOptions );
	constructor( positions: NumericArray, values: TValues, dimension?: number, variables?: number, options?: Omit<InverseDistanceWeightingOptions, "positions" | "values" | "dimension" | "variables"> );
	evaluate( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues | undefined | null;
	map: SamplerSurface<TValues>["map"];
	mapAsync: SamplerSurface<TValues>["mapAsync"];
	grid: SamplerSurface<TValues>["grid"];
	slice: SamplerSurface<TValues>["slice"];
	random: SamplerSurface<TValues>["random"];
	latinHypercube: SamplerSurface<TValues>["latinHypercube"];
	poissonDisk: SamplerSurface<TValues>["poissonDisk"];
	adaptive: SamplerSurface<TValues>["adaptive"];
	stream: SamplerSurface<TValues>["stream"];
}

export { InverseDistanceWeighting as IDW };

export type RBFKernel = "gaussian" | "multiquadric" | "inverse-multiquadric" | "linear" | "cubic" | "thin-plate";

export interface RadialBasisFunctionOptions {
	positions: NumericArray;
	values: NumericArray;
	variables?: number;
	dimension?: number;
	kernel?: RBFKernel;
	epsilon?: number;
	smoothing?: number;
}

export declare class RadialBasisFunction<TValues extends NumericArray = NumericArray> implements SamplerSurface<TValues> {
	constructor( options: RadialBasisFunctionOptions );
	constructor( positions: NumericArray, values: TValues, dimension?: number, variables?: number, options?: Omit<RadialBasisFunctionOptions, "positions" | "values" | "dimension" | "variables"> );
	evaluate( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	map: SamplerSurface<TValues>["map"];
	mapAsync: SamplerSurface<TValues>["mapAsync"];
	grid: SamplerSurface<TValues>["grid"];
	slice: SamplerSurface<TValues>["slice"];
	random: SamplerSurface<TValues>["random"];
	latinHypercube: SamplerSurface<TValues>["latinHypercube"];
	poissonDisk: SamplerSurface<TValues>["poissonDisk"];
	adaptive: SamplerSurface<TValues>["adaptive"];
	stream: SamplerSurface<TValues>["stream"];
}

export { RadialBasisFunction as RBF };

export interface PolynomialRegressionOptions {
	positions: NumericArray;
	values: NumericArray;
	variables?: number;
	dimension?: number;
	degree?: number;
	regularization?: number;
	weights?: NumericArray;
	robust?: false | "huber";
	delta?: number;
	maxIterations?: number;
	tolerance?: number;
	normalize?: boolean | "standard" | "minmax" | { mode: "standard" | "minmax" };
}

export interface RANSACRegressionOptions<TModel extends new ( options: any ) => PolynomialRegression = typeof PolynomialRegression> extends PolynomialRegressionOptions {
	model?: TModel;
	threshold?: number;
	iterations?: number;
	sampleSize?: number;
	minInliers?: number;
	refit?: boolean;
	seed?: number;
}

export type RegressionMetric = "mse" | "rmse" | "mae" | "r2";

export interface CrossValidationResult<TModel extends PolynomialRegression = PolynomialRegression> {
	bestModel: TModel;
	bestOptions: Record<string, unknown>;
	bestScore: number;
	metric: RegressionMetric;
	folds: number;
	results: Array<{
		options: Record<string, unknown>;
		scores: number[];
		mean: number;
		std: number;
	}>;
}

export interface RegressionSummary {
	model: string;
	baseModel?: string;
	samples: number;
	variables: number;
	dimension: number;
	degree: number;
	regularization: number;
	robust: false | "huber";
	normalize: PolynomialRegressionOptions["normalize"];
	iterations: number;
	coefficients: number[];
	rss: number;
	tss: number;
	mse: number;
	rmse: number;
	mae: number;
	r2: number;
	aic: number;
	bic: number;
	inliers?: number;
	outliers?: number;
	bestError?: number;
}

export interface RegressionInfluence<TValues extends NumericArray = NumericArray> {
	leverage: TValues;
	studentizedResiduals: TValues;
	cooksDistance: TValues;
}

export type CrossValidationOptions<TModel extends new ( options: any ) => PolynomialRegression = typeof PolynomialRegression> =
	Partial<Omit<PolynomialRegressionOptions, "positions" | "values" | "degree" | "regularization" | "robust" | "normalize">> & {
		model?: TModel;
		positions: NumericArray;
		values: NumericArray;
		degree?: number | number[];
		regularization?: number | number[];
		robust?: false | "huber" | Array<false | "huber">;
		normalize?: PolynomialRegressionOptions["normalize"] | Array<PolynomialRegressionOptions["normalize"]>;
		folds?: number;
		metric?: RegressionMetric;
		seed?: number;
		shuffle?: boolean;
	};

export declare class PolynomialRegression<TValues extends NumericArray = NumericArray> implements SamplerSurface<TValues> {
	positions: NumericArray;
	values: TValues;
	coefficients: TValues;
	variables: number;
	dimension: number;
	degree: number;
	regularization: number;
	weights?: NumericArray;
	robust: false | "huber";
	delta: number;
	maxIterations: number;
	tolerance: number;
	normalize: PolynomialRegressionOptions["normalize"];
	normalization: null | { mode: "standard" | "minmax"; offsets: number[]; scales: number[] };
	fitPositions: NumericArray;
	iterations: number;
	constructor( options: PolynomialRegressionOptions );
	evaluate( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	predict( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	residuals( positions?: ArrayLike<number>, values?: ArrayLike<number> ): TValues;
	mse( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	rmse( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	mae( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	rss( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	tss( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	aic( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	bic( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	leverage( positions?: ArrayLike<number> ): TValues;
	studentizedResiduals( positions?: ArrayLike<number>, values?: ArrayLike<number> ): TValues;
	cooksDistance( positions?: ArrayLike<number>, values?: ArrayLike<number> ): TValues;
	r2( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	score( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	summary( positions?: ArrayLike<number>, values?: ArrayLike<number> ): RegressionSummary;
	influence( positions?: ArrayLike<number>, values?: ArrayLike<number> ): RegressionInfluence<TValues>;
	map: SamplerSurface<TValues>["map"];
	mapAsync: SamplerSurface<TValues>["mapAsync"];
	grid: SamplerSurface<TValues>["grid"];
	slice: SamplerSurface<TValues>["slice"];
	random: SamplerSurface<TValues>["random"];
	latinHypercube: SamplerSurface<TValues>["latinHypercube"];
	poissonDisk: SamplerSurface<TValues>["poissonDisk"];
	adaptive: SamplerSurface<TValues>["adaptive"];
	stream: SamplerSurface<TValues>["stream"];
}

export declare function crossValidateRegression<TModel extends PolynomialRegression = PolynomialRegression>( options: CrossValidationOptions<new ( options: any ) => TModel> ): CrossValidationResult<TModel>;

export declare class LinearRegression<TValues extends NumericArray = NumericArray> extends PolynomialRegression<TValues> {}
export declare class RidgeRegression<TValues extends NumericArray = NumericArray> extends PolynomialRegression<TValues> {}

export declare class RANSACRegression<TValues extends NumericArray = NumericArray, TModel extends PolynomialRegression<TValues> = PolynomialRegression<TValues>> implements SamplerSurface<TValues> {
	modelType: new ( options: any ) => TModel;
	positions: NumericArray;
	values: TValues;
	variables: number;
	dimension: number;
	threshold: number;
	iterations: number;
	sampleSize: number;
	minInliers: number;
	seed: number;
	refit: boolean;
	modelOptions: Record<string, unknown>;
	bestModel: TModel;
	inlierMask: boolean[];
	inliers: Uint32Array;
	outliers: Uint32Array;
	bestError: number;
	coefficients: TValues;
	constructor( options: RANSACRegressionOptions<new ( options: any ) => TModel> );
	evaluate( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	predict( position: Position, inputOffset?: number, output?: TValues, outputOffset?: number ): number | TValues;
	residuals( positions?: ArrayLike<number>, values?: ArrayLike<number> ): TValues;
	mse( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	rmse( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	mae( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	rss( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	tss( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	aic( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	bic( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	leverage( positions?: ArrayLike<number> ): TValues;
	studentizedResiduals( positions?: ArrayLike<number>, values?: ArrayLike<number> ): TValues;
	cooksDistance( positions?: ArrayLike<number>, values?: ArrayLike<number> ): TValues;
	r2( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	score( positions?: ArrayLike<number>, values?: ArrayLike<number> ): number;
	summary( positions?: ArrayLike<number>, values?: ArrayLike<number> ): RegressionSummary;
	influence( positions?: ArrayLike<number>, values?: ArrayLike<number> ): RegressionInfluence<TValues>;
	map: SamplerSurface<TValues>["map"];
	mapAsync: SamplerSurface<TValues>["mapAsync"];
	grid: SamplerSurface<TValues>["grid"];
	slice: SamplerSurface<TValues>["slice"];
	random: SamplerSurface<TValues>["random"];
	latinHypercube: SamplerSurface<TValues>["latinHypercube"];
	poissonDisk: SamplerSurface<TValues>["poissonDisk"];
	adaptive: SamplerSurface<TValues>["adaptive"];
	stream: SamplerSurface<TValues>["stream"];
}
