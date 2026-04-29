// src/Validation.js
function isArrayLike(value) {
  return value && typeof value.length === "number";
}
function getTypeName(value) {
  return value?.constructor?.name || typeof value;
}
function validateDimension(dimension) {
  if (!Number.isInteger(dimension) || dimension < 1) {
    throw new TypeError("dimension must be a positive integer.");
  }
}
function validateArrayLike(value, name) {
  if (!isArrayLike(value)) {
    throw new TypeError(`${name} must be an array or typed array.`);
  }
}
function validateFiniteValues(values, name) {
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] !== "number" || !Number.isFinite(values[i])) {
      throw new TypeError(`${name} must contain only finite numbers. Invalid value at index ${i}.`);
    }
  }
}
function validateConstructorInput(type, positions, values, dimension) {
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  const degree = type.degree;
  const variables = type.variables;
  const pointsPerAxis = degree + 1;
  const expectedPositions = pointsPerAxis * variables;
  const expectedValues = pointsPerAxis ** variables * dimension;
  if (positions.length !== expectedPositions) {
    throw new RangeError(
      `${type.name} expects ${expectedPositions} position values, received ${positions.length} from ${getTypeName(positions)}.`
    );
  }
  if (values.length !== expectedValues) {
    throw new RangeError(
      `${type.name} expects ${expectedValues} values for dimension ${dimension}, received ${values.length} from ${getTypeName(values)}.`
    );
  }
  for (let variable = 0; variable < variables; variable++) {
    const seen = /* @__PURE__ */ new Set();
    for (let point = 0; point < pointsPerAxis; point++) {
      const value = positions[point * variables + variable];
      if (seen.has(value)) {
        throw new RangeError(`${type.name} positions must be unique on every axis. Duplicate ${value} on axis ${variable}.`);
      }
      seen.add(value);
    }
  }
}
function validateSamplePosition(position, variables, name = "position") {
  if (variables === 1 && typeof position === "number") {
    if (!Number.isFinite(position))
      throw new TypeError(`${name} must be finite.`);
    return;
  }
  validateArrayLike(position, name);
  if (position.length < variables) {
    throw new RangeError(`${name} must contain at least ${variables} values.`);
  }
  for (let i = 0; i < variables; i++) {
    if (typeof position[i] !== "number" || !Number.isFinite(position[i])) {
      throw new TypeError(`${name} must contain finite numbers. Invalid value at index ${i}.`);
    }
  }
}
function validateSamplePositions(positions, variables) {
  validateArrayLike(positions, "positions");
  validateFiniteValues(positions, "positions");
  if (positions.length % variables !== 0) {
    throw new RangeError(`positions length must be divisible by ${variables}.`);
  }
}
function validateStepInput(start, end, size, variables) {
  validateSamplePosition(start, variables, "start");
  validateSamplePosition(end, variables, "end");
  validateSamplePosition(size, variables, "size");
  for (let i = 0; i < variables; i++) {
    const value = typeof size === "number" ? size : size[i];
    if (value === 0)
      throw new RangeError("size values must be non-zero.");
  }
}
function validateSegmentInput(start, end, amount, variables) {
  validateSamplePosition(start, variables, "start");
  validateSamplePosition(end, variables, "end");
  validateSamplePosition(amount, variables, "amount");
  for (let i = 0; i < variables; i++) {
    const value = typeof amount === "number" ? amount : amount[i];
    if (!Number.isInteger(value) || value < 2) {
      throw new RangeError("amount values must be integers greater than or equal to 2.");
    }
  }
}

// src/Parallel.js
var NODE_WORKER_THREADS = ["node", "worker_threads"].join(":");
var NODE_OS = ["node", "os"].join(":");
var evaluatorIds = /* @__PURE__ */ new WeakMap();
var tensorPolynomialIds = /* @__PURE__ */ new WeakMap();
var DEFAULT_WORK_UNIT_THRESHOLD = 2e6;
var DEFAULT_MAX_AUTO_WORKERS = 4;
var workerThreads;
var nodeOs;
var nextEvaluatorId = 1;
var nextTensorPolynomialId = 1;
var nextTaskId = 1;
var pools = /* @__PURE__ */ new Map();
async function getWorkerThreads() {
  if (typeof process === "undefined" || !process.versions?.node)
    return null;
  if (workerThreads === void 0) {
    try {
      workerThreads = await import(NODE_WORKER_THREADS);
    } catch (error) {
      workerThreads = null;
    }
  }
  return workerThreads;
}
async function getWorkerConstructor() {
  const workerThreads3 = await getWorkerThreads();
  if (workerThreads3) {
    return {
      Worker: workerThreads3.Worker,
      type: "node"
    };
  }
  if (typeof Worker !== "undefined") {
    return {
      Worker,
      type: "browser"
    };
  }
  return null;
}
async function getNodeOs() {
  if (typeof process === "undefined" || !process.versions?.node)
    return null;
  if (nodeOs === void 0) {
    try {
      nodeOs = await import(NODE_OS);
    } catch (error) {
      nodeOs = null;
    }
  }
  return nodeOs;
}
async function getDefaultWorkerCount() {
  const os = await getNodeOs();
  const cpus = os?.availableParallelism?.() || globalThis.navigator?.hardwareConcurrency || 2;
  return Math.max(1, cpus - 1);
}
function getParallelPlan(evaluator, sampleCount, options = {}, maxWorkers = 1) {
  const degree = evaluator.constructor.degree;
  const variables = evaluator.constructor.variables;
  const dimension = evaluator.dimension;
  const coefficientCount = (degree + 1) ** variables;
  const workUnits = sampleCount * coefficientCount * dimension;
  const threshold = options.threshold ?? DEFAULT_WORK_UNIT_THRESHOLD;
  const usesExplicitThreshold = options.threshold !== void 0;
  const meetsThreshold = usesExplicitThreshold ? sampleCount >= threshold : workUnits >= threshold;
  if (!meetsThreshold) {
    return {
      workers: 1,
      workUnits,
      parallel: false
    };
  }
  if (options.workers !== void 0) {
    const workers2 = Math.min(Math.max(1, options.workers), sampleCount, maxWorkers);
    return {
      workers: workers2,
      workUnits,
      parallel: workers2 > 1
    };
  }
  const cappedMaxWorkers = Math.min(maxWorkers, DEFAULT_MAX_AUTO_WORKERS);
  const workers = Math.min(
    Math.max(2, Math.ceil(workUnits / DEFAULT_WORK_UNIT_THRESHOLD)),
    sampleCount,
    cappedMaxWorkers
  );
  return {
    workers,
    workUnits,
    parallel: workers > 1
  };
}
function getTensorPolynomialParallelPlan(polynomial, sampleCount, options = {}, maxWorkers = 1) {
  const pointsPerAxis = polynomial.degree + 1;
  const coefficientCount = pointsPerAxis ** polynomial.variables;
  const workUnits = sampleCount * coefficientCount * polynomial.variables * polynomial.dimension;
  const threshold = options.threshold ?? DEFAULT_WORK_UNIT_THRESHOLD;
  const usesExplicitThreshold = options.threshold !== void 0;
  const meetsThreshold = usesExplicitThreshold ? sampleCount >= threshold : workUnits >= threshold;
  if (!meetsThreshold) {
    return {
      workers: 1,
      workUnits,
      parallel: false
    };
  }
  if (options.workers !== void 0) {
    const workers2 = Math.min(Math.max(1, options.workers), sampleCount, maxWorkers);
    return {
      workers: workers2,
      workUnits,
      parallel: workers2 > 1
    };
  }
  const cappedMaxWorkers = Math.min(maxWorkers, DEFAULT_MAX_AUTO_WORKERS);
  const workers = Math.min(
    Math.max(2, Math.ceil(workUnits / DEFAULT_WORK_UNIT_THRESHOLD)),
    sampleCount,
    cappedMaxWorkers
  );
  return {
    workers,
    workUnits,
    parallel: workers > 1
  };
}
function getArraySlice(values, start, end) {
  if (typeof values.slice === "function")
    return values.slice(start, end);
  const output = new values.constructor(end - start);
  for (let i = start; i < end; i++) {
    output[i - start] = values[i];
  }
  return output;
}
function copyChunk(output, chunk, offset) {
  for (let i = 0; i < chunk.length; i++) {
    output[offset + i] = chunk[i];
  }
}
function isTypedArray(values) {
  return ArrayBuffer.isView(values) && !(values instanceof DataView);
}
function canShareOutput(evaluator) {
  return typeof SharedArrayBuffer !== "undefined" && isTypedArray(evaluator.values) && typeof evaluator.values.constructor.BYTES_PER_ELEMENT === "number";
}
function getTransferList(task) {
  if (!isTypedArray(task.positions))
    return void 0;
  if (typeof SharedArrayBuffer !== "undefined" && task.positions.buffer instanceof SharedArrayBuffer)
    return void 0;
  return [task.positions.buffer];
}
function getEvaluatorId(evaluator) {
  if (!evaluatorIds.has(evaluator)) {
    evaluatorIds.set(evaluator, nextEvaluatorId++);
  }
  return evaluatorIds.get(evaluator);
}
function getEvaluatorKey(evaluator) {
  return `${getEvaluatorId(evaluator)}:${evaluator._parallelVersion ?? 0}`;
}
function getTensorPolynomialId(polynomial) {
  if (!tensorPolynomialIds.has(polynomial)) {
    tensorPolynomialIds.set(polynomial, nextTensorPolynomialId++);
  }
  return tensorPolynomialIds.get(polynomial);
}
function getTensorPolynomialKey(polynomial) {
  return `tensor:${getTensorPolynomialId(polynomial)}:${polynomial._parallelVersion ?? 0}`;
}
function createEvaluatorConfig(evaluator, key) {
  return {
    key,
    type: "evaluator",
    coefficients: evaluator.coefficients,
    degree: evaluator.constructor.degree,
    variables: evaluator.constructor.variables,
    dimension: evaluator.dimension
  };
}
function createTensorPolynomialConfig(polynomial, key) {
  return {
    key,
    type: "tensor-polynomial",
    cache: false,
    positions: polynomial.positions,
    values: polynomial.values,
    degree: polynomial.degree,
    variables: polynomial.variables,
    dimension: polynomial.dimension
  };
}
var WorkerPool = class {
  constructor(workerConstructor, size, idleTimeout, workerUrl) {
    this.Worker = workerConstructor.Worker;
    this.workerType = workerConstructor.type;
    this.size = size;
    this.idleTimeout = idleTimeout;
    this.workerUrl = workerUrl;
    this.queue = [];
    this.workers = [];
    this.activeTasks = 0;
    this.idleTimer = null;
  }
  run(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.drain();
    });
  }
  drain() {
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
    while (this.queue.length > 0) {
      const worker = this.getIdleWorker();
      if (!worker)
        return;
      this.runOnWorker(worker, this.queue.shift());
    }
    this.scheduleIdleTermination();
  }
  getIdleWorker() {
    let worker = this.workers.find((item) => !item.busy);
    if (worker)
      return worker;
    if (this.workers.length >= this.size)
      return null;
    worker = this.createWorker();
    this.workers.push(worker);
    return worker;
  }
  createWorker() {
    const workerUrl = this.workerUrl || getWorkerUrl(this.workerType);
    if (!workerUrl)
      throw new Error("Unable to resolve worker URL.");
    const worker = new this.Worker(workerUrl, {
      type: "module"
    });
    const entry = {
      worker,
      busy: false,
      cache: /* @__PURE__ */ new Set(),
      current: null
    };
    if (typeof worker.on === "function") {
      worker.on("message", (message) => this.handleMessage(entry, message));
      worker.on("error", (error) => this.handleError(entry, error));
      worker.on("exit", (code) => this.handleExit(entry, code));
    } else {
      worker.addEventListener("message", (event) => this.handleMessage(entry, event.data));
      worker.addEventListener("error", (error) => this.handleError(entry, error));
      worker.addEventListener("messageerror", (error) => this.handleError(entry, error));
    }
    return entry;
  }
  runOnWorker(worker, job) {
    const message = { ...job.task };
    if (message.config?.cache !== false && worker.cache.has(message.config.key)) {
      delete message.config;
    } else if (message.config) {
      if (message.config.cache !== false)
        worker.cache.add(message.config.key);
    }
    worker.busy = true;
    worker.current = job;
    this.activeTasks++;
    worker.worker.postMessage(message, getTransferList(message));
  }
  handleMessage(worker, message) {
    const job = worker.current;
    worker.busy = false;
    worker.current = null;
    this.activeTasks--;
    if (!job)
      return;
    if (message.error)
      job.reject(new Error(message.error));
    else
      job.resolve(message);
    this.drain();
  }
  handleError(worker, error) {
    this.rejectCurrent(worker, error);
    this.removeWorker(worker);
    this.drain();
  }
  handleExit(worker, code) {
    if (code !== 0)
      this.rejectCurrent(worker, new Error(`Worker stopped with exit code ${code}.`));
    this.removeWorker(worker);
    this.drain();
  }
  rejectCurrent(worker, error) {
    if (worker.current) {
      worker.current.reject(error);
      worker.current = null;
      this.activeTasks--;
    }
    worker.busy = false;
  }
  removeWorker(worker) {
    const index = this.workers.indexOf(worker);
    if (index !== -1)
      this.workers.splice(index, 1);
  }
  scheduleIdleTermination() {
    if (this.activeTasks > 0 || this.queue.length > 0 || this.workers.length === 0)
      return;
    if (this.idleTimeout === Number.POSITIVE_INFINITY)
      return;
    this.idleTimer = setTimeout(() => this.terminate(), this.idleTimeout);
  }
  terminate() {
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
    for (const worker of this.workers) {
      worker.current?.reject(new Error("Worker pool terminated."));
      worker.worker.terminate();
    }
    this.workers.length = 0;
    this.queue.length = 0;
    this.activeTasks = 0;
  }
};
function getWorkerUrl(workerType) {
  if (workerType === "browser") {
    const baseUrl = globalThis.document?.currentScript?.src || import.meta.url;
    if (!baseUrl)
      return null;
    return new URL("./Numfit.worker.js", baseUrl);
  }
  return new URL("./ParallelWorker.js", import.meta.url);
}
function getPool(workerConstructor, workers, idleTimeout, workerUrl) {
  const key = `${workerConstructor.type}:${workers}:${idleTimeout}:${workerUrl || ""}`;
  let pool = pools.get(key);
  if (!pool) {
    pool = new WorkerPool(workerConstructor, workers, idleTimeout, workerUrl);
    pools.set(key, pool);
  }
  return pool;
}
async function mapInWorkers(evaluator, positions, options = {}) {
  const variables = evaluator.constructor.variables;
  const dimension = evaluator.dimension;
  validateSamplePositions(positions, variables);
  const sampleCount = positions.length / variables;
  const workerConstructor = await getWorkerConstructor();
  if (!workerConstructor)
    return evaluator.map(positions);
  const plan = getParallelPlan(
    evaluator,
    sampleCount,
    options,
    await getDefaultWorkerCount()
  );
  const workers = plan.workers;
  if (!plan.parallel)
    return evaluator.map(positions);
  const idleTimeout = options.idleTimeout ?? 1e3;
  const pool = getPool(workerConstructor, workers, idleTimeout, options.workerUrl);
  const chunkSize = Math.ceil(sampleCount / workers);
  const key = getEvaluatorKey(evaluator);
  const config = createEvaluatorConfig(evaluator, key);
  const tasks = [];
  const sharedOutput = canShareOutput(evaluator);
  const sharedOutputValues = sharedOutput ? new evaluator.values.constructor(
    new SharedArrayBuffer(
      sampleCount * dimension * evaluator.values.constructor.BYTES_PER_ELEMENT
    )
  ) : null;
  for (let i = 0; i < workers; i++) {
    const sampleStart = i * chunkSize;
    const sampleEnd = Math.min(sampleCount, sampleStart + chunkSize);
    if (sampleStart >= sampleEnd)
      continue;
    const positionStart = sampleStart * variables;
    const positionEnd = sampleEnd * variables;
    tasks.push(pool.run({
      id: nextTaskId++,
      key,
      config,
      positions: getArraySlice(positions, positionStart, positionEnd),
      outputBuffer: sharedOutput ? sharedOutputValues.buffer : void 0,
      outputOffset: sampleStart * dimension
    }));
  }
  const chunks = await Promise.all(tasks);
  if (sharedOutput)
    return sharedOutputValues;
  const output = new evaluator.values.constructor(sampleCount * dimension);
  for (const chunk of chunks) {
    copyChunk(output, chunk.values, chunk.outputOffset);
  }
  return output;
}
async function mapTensorPolynomialInWorkers(polynomial, positions, options = {}) {
  const variables = polynomial.variables;
  const dimension = polynomial.dimension;
  validateSamplePositions(positions, variables);
  if (options?.handler)
    return polynomial.map(positions, options.handler);
  const sampleCount = positions.length / variables;
  const workerConstructor = await getWorkerConstructor();
  if (!workerConstructor)
    return polynomial.map(positions);
  const plan = getTensorPolynomialParallelPlan(
    polynomial,
    sampleCount,
    options,
    await getDefaultWorkerCount()
  );
  const workers = plan.workers;
  if (!plan.parallel)
    return polynomial.map(positions);
  const idleTimeout = options.idleTimeout ?? 1e3;
  const pool = getPool(workerConstructor, workers, idleTimeout, options.workerUrl);
  const chunkSize = Math.ceil(sampleCount / workers);
  const key = getTensorPolynomialKey(polynomial);
  const config = createTensorPolynomialConfig(polynomial, key);
  const tasks = [];
  const sharedOutput = canShareOutput(polynomial);
  const sharedOutputValues = sharedOutput ? new polynomial.values.constructor(
    new SharedArrayBuffer(
      sampleCount * dimension * polynomial.values.constructor.BYTES_PER_ELEMENT
    )
  ) : null;
  for (let i = 0; i < workers; i++) {
    const sampleStart = i * chunkSize;
    const sampleEnd = Math.min(sampleCount, sampleStart + chunkSize);
    if (sampleStart >= sampleEnd)
      continue;
    const positionStart = sampleStart * variables;
    const positionEnd = sampleEnd * variables;
    tasks.push(pool.run({
      id: nextTaskId++,
      key,
      config,
      positions: getArraySlice(positions, positionStart, positionEnd),
      outputBuffer: sharedOutput ? sharedOutputValues.buffer : void 0,
      outputOffset: sampleStart * dimension
    }));
  }
  const chunks = await Promise.all(tasks);
  if (sharedOutput)
    return sharedOutputValues;
  const output = new polynomial.values.constructor(sampleCount * dimension);
  for (const chunk of chunks) {
    copyChunk(output, chunk.values, chunk.outputOffset);
  }
  return output;
}

// src/Samplers.js
var DEFAULT_ADAPTIVE_TOLERANCE = 1e-6;
var DEFAULT_ADAPTIVE_MAX_DEPTH = 16;
function gridSample(interpolator, options, handler) {
  const settings = normalizeGridOptions(interpolator, options);
  const positions = createGridPositions(interpolator, settings.start, settings.end, settings.shape);
  const values = interpolator.map(positions, handler);
  if (handler)
    return interpolator;
  return {
    positions,
    values,
    start: settings.start,
    end: settings.end,
    shape: settings.shape,
    variables: getVariables(interpolator),
    dimension: interpolator.dimension
  };
}
function sliceSample(interpolator, options, handler) {
  const variables = getVariables(interpolator);
  const axes = options?.axes || inferSliceAxes(variables, options?.fixed);
  const fixed = options?.fixed || {};
  if (axes.length < 1)
    throw new RangeError("slice axes must contain at least one axis.");
  for (const axis of axes) {
    if (!Number.isInteger(axis) || axis < 0 || axis >= variables) {
      throw new RangeError(`slice axis ${axis} is outside the interpolator variable range.`);
    }
  }
  const start = normalizeVector(options.start, axes.length, "start");
  const end = normalizeVector(options.end, axes.length, "end");
  const shape = normalizeShape(options.shape ?? options.amount, axes.length);
  const type = getPositionType(interpolator);
  const sampleCount = shape.reduce((total, amount) => total * amount, 1);
  const positions = new type(sampleCount * variables);
  const slicePosition = new type(variables);
  for (let axis = 0; axis < variables; axis++) {
    const value = getFixedValue(fixed, axis);
    if (value === void 0 && !axes.includes(axis)) {
      throw new RangeError(`slice requires a fixed value for axis ${axis}.`);
    }
    if (value !== void 0)
      slicePosition[axis] = value;
  }
  for (let sample = 0; sample < sampleCount; sample++) {
    let stride = 1;
    for (let i = 0; i < axes.length; i++) {
      const multiplier = Math.floor(sample / stride) % shape[i];
      const t = shape[i] === 1 ? 0 : multiplier / (shape[i] - 1);
      slicePosition[axes[i]] = start[i] + (end[i] - start[i]) * t;
      stride *= shape[i];
    }
    for (let axis = 0; axis < variables; axis++) {
      positions[sample * variables + axis] = slicePosition[axis];
    }
  }
  const values = interpolator.map(positions, handler);
  if (handler)
    return interpolator;
  return {
    positions,
    values,
    axes,
    fixed,
    start,
    end,
    shape,
    variables,
    dimension: interpolator.dimension
  };
}
function randomSample(interpolator, count, options = {}, handler) {
  return scatteredSample(interpolator, count, options, handler, false);
}
function latinHypercubeSample(interpolator, count, options = {}, handler) {
  return scatteredSample(interpolator, count, options, handler, true);
}
function poissonDiskSample(interpolator, options = {}, handler) {
  if (!options || typeof options !== "object")
    throw new TypeError("poissonDisk options must be an object.");
  const variables = getVariables(interpolator);
  const bounds = normalizeBounds(interpolator, options);
  const random = createRandom(options.seed);
  const radius = options.radius ?? estimatePoissonRadius(bounds, variables, options.count);
  const candidates = options.candidates ?? 30;
  const maxSamples = options.maxSamples ?? options.count ?? Infinity;
  if (typeof radius !== "number" || !Number.isFinite(radius) || radius <= 0) {
    throw new RangeError("poissonDisk radius must be a positive finite number.");
  }
  if (!Number.isInteger(candidates) || candidates < 1) {
    throw new RangeError("poissonDisk candidates must be a positive integer.");
  }
  if (maxSamples !== Infinity && (!Number.isInteger(maxSamples) || maxSamples < 1)) {
    throw new RangeError("poissonDisk count/maxSamples must be a positive integer.");
  }
  const points = generatePoissonPoints(bounds, variables, radius, candidates, maxSamples, random);
  const type = getPositionType(interpolator);
  const positions = new type(points.length * variables);
  for (let i = 0; i < points.length; i++) {
    for (let axis = 0; axis < variables; axis++)
      positions[i * variables + axis] = points[i][axis];
  }
  const values = interpolator.map(positions, handler);
  if (handler)
    return interpolator;
  return {
    positions,
    values,
    min: bounds.min,
    max: bounds.max,
    radius,
    variables,
    dimension: interpolator.dimension
  };
}
function adaptiveSample(interpolator, start, end, options = {}) {
  const variables = getVariables(interpolator);
  if (variables !== 1)
    throw new RangeError("adaptive sampling currently supports 1D interpolators only.");
  validateSamplePosition(start, 1, "start");
  validateSamplePosition(end, 1, "end");
  const tolerance = options.tolerance ?? DEFAULT_ADAPTIVE_TOLERANCE;
  const maxDepth = options.maxDepth ?? DEFAULT_ADAPTIVE_MAX_DEPTH;
  const minDepth = options.minDepth ?? 0;
  if (typeof tolerance !== "number" || !Number.isFinite(tolerance) || tolerance <= 0) {
    throw new RangeError("adaptive tolerance must be a positive finite number.");
  }
  if (!Number.isInteger(maxDepth) || maxDepth < 0) {
    throw new RangeError("adaptive maxDepth must be a non-negative integer.");
  }
  const samples = [];
  const a = Number(start);
  const b = Number(end);
  const va = evaluatePacked(interpolator, a);
  const vb = evaluatePacked(interpolator, b);
  subdivideAdaptive(interpolator, a, b, va, vb, 0, minDepth, maxDepth, tolerance, samples);
  samples.push({ position: b, value: vb });
  const type = getPositionType(interpolator);
  const valueType = getValueType(interpolator);
  const positions = new type(samples.length);
  const values = new valueType(samples.length * interpolator.dimension);
  for (let i = 0; i < samples.length; i++) {
    positions[i] = samples[i].position;
    for (let j = 0; j < interpolator.dimension; j++) {
      values[i * interpolator.dimension + j] = samples[i].value[j];
    }
  }
  return {
    positions,
    values,
    tolerance,
    variables,
    dimension: interpolator.dimension
  };
}
async function* streamSample(interpolator, options = {}) {
  const settings = normalizeGridOptions(interpolator, options);
  const variables = getVariables(interpolator);
  const chunkSize = options.chunkSize ?? 1024;
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("stream chunkSize must be a positive integer.");
  }
  const sampleCount = settings.shape.reduce((total, amount) => total * amount, 1);
  const type = getPositionType(interpolator);
  for (let offset = 0; offset < sampleCount; offset += chunkSize) {
    const count = Math.min(chunkSize, sampleCount - offset);
    const positions = new type(count * variables);
    writeGridPositions(positions, 0, offset, count, variables, settings.start, settings.end, settings.shape);
    yield {
      offset,
      positions,
      values: await interpolator.mapAsync(positions, options.mapOptions),
      shape: settings.shape,
      variables,
      dimension: interpolator.dimension
    };
  }
}
function scatteredSample(interpolator, count, options, handler, stratified) {
  if (!Number.isInteger(count) || count < 1)
    throw new RangeError("sample count must be a positive integer.");
  const variables = getVariables(interpolator);
  const bounds = normalizeBounds(interpolator, options);
  const type = getPositionType(interpolator);
  const positions = new type(count * variables);
  const random = createRandom(options.seed);
  if (stratified) {
    for (let axis = 0; axis < variables; axis++) {
      const values2 = [];
      for (let i = 0; i < count; i++)
        values2.push((i + random()) / count);
      shuffle(values2, random);
      for (let i = 0; i < count; i++) {
        positions[i * variables + axis] = bounds.min[axis] + values2[i] * (bounds.max[axis] - bounds.min[axis]);
      }
    }
  } else {
    for (let i = 0; i < count; i++) {
      for (let axis = 0; axis < variables; axis++) {
        positions[i * variables + axis] = bounds.min[axis] + random() * (bounds.max[axis] - bounds.min[axis]);
      }
    }
  }
  const values = interpolator.map(positions, handler);
  if (handler)
    return interpolator;
  return {
    positions,
    values,
    min: bounds.min,
    max: bounds.max,
    variables,
    dimension: interpolator.dimension
  };
}
function generatePoissonPoints(bounds, variables, radius, candidates, maxSamples, random) {
  const cellSize = radius / Math.sqrt(variables);
  const gridShape = new Array(variables);
  for (let axis = 0; axis < variables; axis++) {
    gridShape[axis] = Math.max(1, Math.ceil((bounds.max[axis] - bounds.min[axis]) / cellSize));
  }
  const points = [];
  const active = [];
  const grid = /* @__PURE__ */ new Map();
  const first = randomPointInBounds(bounds, variables, random);
  points.push(first);
  active.push(0);
  grid.set(gridKey(first, bounds.min, cellSize, gridShape), 0);
  while (active.length > 0 && points.length < maxSamples) {
    const activeIndex = Math.floor(random() * active.length);
    const pointIndex = active[activeIndex];
    const point = points[pointIndex];
    let accepted = false;
    for (let attempt = 0; attempt < candidates && points.length < maxSamples; attempt++) {
      const candidate = randomAnnulusPoint(point, variables, radius, random);
      if (!isInBounds(candidate, bounds, variables))
        continue;
      if (hasNearbyPoint(candidate, bounds.min, cellSize, gridShape, grid, points, radius, variables))
        continue;
      points.push(candidate);
      active.push(points.length - 1);
      grid.set(gridKey(candidate, bounds.min, cellSize, gridShape), points.length - 1);
      accepted = true;
    }
    if (!accepted) {
      active[activeIndex] = active[active.length - 1];
      active.pop();
    }
  }
  return points;
}
function randomPointInBounds(bounds, variables, random) {
  const point = new Array(variables);
  for (let axis = 0; axis < variables; axis++) {
    point[axis] = bounds.min[axis] + random() * (bounds.max[axis] - bounds.min[axis]);
  }
  return point;
}
function randomAnnulusPoint(point, variables, radius, random) {
  const direction = new Array(variables);
  let length = 0;
  while (length === 0) {
    length = 0;
    for (let axis = 0; axis < variables; axis++) {
      const value = random() * 2 - 1;
      direction[axis] = value;
      length += value * value;
    }
    length = Math.sqrt(length);
  }
  const distance = radius * (1 + random());
  const candidate = new Array(variables);
  for (let axis = 0; axis < variables; axis++) {
    candidate[axis] = point[axis] + direction[axis] / length * distance;
  }
  return candidate;
}
function hasNearbyPoint(candidate, min, cellSize, gridShape, grid, points, radius, variables) {
  const base = gridCoordinates(candidate, min, cellSize, gridShape);
  const offsets = new Array(variables).fill(-2);
  const radiusSquared = radius * radius;
  while (true) {
    const coordinates = new Array(variables);
    let inside = true;
    for (let axis2 = 0; axis2 < variables; axis2++) {
      const coordinate = base[axis2] + offsets[axis2];
      if (coordinate < 0 || coordinate >= gridShape[axis2]) {
        inside = false;
        break;
      }
      coordinates[axis2] = coordinate;
    }
    if (inside) {
      const pointIndex = grid.get(coordinates.join(","));
      if (pointIndex !== void 0 && distanceSquared(candidate, points[pointIndex], variables) < radiusSquared) {
        return true;
      }
    }
    let axis = 0;
    for (; axis < variables; axis++) {
      offsets[axis]++;
      if (offsets[axis] <= 2)
        break;
      offsets[axis] = -2;
    }
    if (axis === variables)
      return false;
  }
}
function isInBounds(point, bounds, variables) {
  for (let axis = 0; axis < variables; axis++) {
    if (point[axis] < bounds.min[axis] || point[axis] > bounds.max[axis])
      return false;
  }
  return true;
}
function gridKey(point, min, cellSize, gridShape) {
  return gridCoordinates(point, min, cellSize, gridShape).join(",");
}
function gridCoordinates(point, min, cellSize, gridShape) {
  const coordinates = new Array(point.length);
  for (let axis = 0; axis < point.length; axis++) {
    coordinates[axis] = Math.min(
      gridShape[axis] - 1,
      Math.max(0, Math.floor((point[axis] - min[axis]) / cellSize))
    );
  }
  return coordinates;
}
function distanceSquared(a, b, variables) {
  let distance = 0;
  for (let axis = 0; axis < variables; axis++) {
    const delta = a[axis] - b[axis];
    distance += delta * delta;
  }
  return distance;
}
function estimatePoissonRadius(bounds, variables, count) {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("poissonDisk requires radius or a positive integer count.");
  }
  let volume = 1;
  for (let axis = 0; axis < variables; axis++)
    volume *= Math.max(0, bounds.max[axis] - bounds.min[axis]);
  return (volume / count) ** (1 / variables) * 0.55;
}
function normalizeGridOptions(interpolator, options) {
  if (!options || typeof options !== "object")
    throw new TypeError("grid options must be an object.");
  const variables = getVariables(interpolator);
  const start = normalizeVector(options.start, variables, "start");
  const end = normalizeVector(options.end, variables, "end");
  const shape = normalizeShape(options.shape ?? options.amount, variables);
  return { start, end, shape };
}
function createGridPositions(interpolator, start, end, shape) {
  const variables = getVariables(interpolator);
  const sampleCount = shape.reduce((total, amount) => total * amount, 1);
  const positions = new (getPositionType(interpolator))(sampleCount * variables);
  writeGridPositions(positions, 0, 0, sampleCount, variables, start, end, shape);
  return positions;
}
function writeGridPositions(positions, targetOffset, sampleOffset, count, variables, start, end, shape) {
  for (let local = 0; local < count; local++) {
    const sample = sampleOffset + local;
    let stride = 1;
    for (let axis = 0; axis < variables; axis++) {
      const multiplier = Math.floor(sample / stride) % shape[axis];
      const t = shape[axis] === 1 ? 0 : multiplier / (shape[axis] - 1);
      positions[targetOffset + local * variables + axis] = start[axis] + (end[axis] - start[axis]) * t;
      stride *= shape[axis];
    }
  }
}
function normalizeVector(value, variables, name) {
  validateSamplePosition(value, variables, name);
  const output = new Array(variables);
  for (let i = 0; i < variables; i++)
    output[i] = typeof value === "number" ? value : value[i];
  return output;
}
function normalizeShape(shape, variables) {
  validateSamplePosition(shape, variables, "shape");
  const output = new Array(variables);
  for (let i = 0; i < variables; i++) {
    const value = typeof shape === "number" ? shape : shape[i];
    if (!Number.isInteger(value) || value < 1) {
      throw new RangeError("shape values must be positive integers.");
    }
    output[i] = value;
  }
  return output;
}
function normalizeBounds(interpolator, options) {
  const variables = getVariables(interpolator);
  if (options.min !== void 0 || options.max !== void 0 || options.start !== void 0 || options.end !== void 0) {
    return {
      min: normalizeVector(options.min ?? options.start, variables, "min"),
      max: normalizeVector(options.max ?? options.end, variables, "max")
    };
  }
  const bounds = inferBounds(interpolator, variables);
  return {
    min: bounds.map((bound) => bound.min),
    max: bounds.map((bound) => bound.max)
  };
}
function inferBounds(interpolator, variables) {
  if (interpolator.index?.bounds)
    return interpolator.index.bounds;
  if (interpolator.cells?.length) {
    const bounds2 = new Array(variables).fill(0).map(() => ({
      min: Infinity,
      max: -Infinity
    }));
    for (const cell of interpolator.cells) {
      for (let axis = 0; axis < variables; axis++) {
        bounds2[axis].min = Math.min(bounds2[axis].min, cell.bounds[axis].min);
        bounds2[axis].max = Math.max(bounds2[axis].max, cell.bounds[axis].max);
      }
    }
    return bounds2;
  }
  const positions = interpolator.positions;
  const bounds = new Array(variables).fill(0).map(() => ({
    min: Infinity,
    max: -Infinity
  }));
  for (let i = 0; i < positions.length; i += variables) {
    for (let axis = 0; axis < variables; axis++) {
      bounds[axis].min = Math.min(bounds[axis].min, positions[i + axis]);
      bounds[axis].max = Math.max(bounds[axis].max, positions[i + axis]);
    }
  }
  return bounds;
}
function inferSliceAxes(variables, fixed = {}) {
  const axes = [];
  for (let axis = 0; axis < variables; axis++) {
    if (getFixedValue(fixed, axis) === void 0)
      axes.push(axis);
  }
  return axes;
}
function getFixedValue(fixed, axis) {
  if (Array.isArray(fixed) || ArrayBuffer.isView(fixed))
    return fixed[axis];
  return fixed[axis] ?? fixed[String(axis)];
}
function evaluatePacked(interpolator, position) {
  const output = new (getValueType(interpolator))(interpolator.dimension);
  interpolator.evaluate(position, 0, output, 0);
  return output;
}
function subdivideAdaptive(interpolator, start, end, startValue, endValue, depth, minDepth, maxDepth, tolerance, samples) {
  const middle = (start + end) / 2;
  const middleValue = evaluatePacked(interpolator, middle);
  let error = 0;
  for (let i = 0; i < interpolator.dimension; i++) {
    const estimated = (startValue[i] + endValue[i]) / 2;
    error = Math.max(error, Math.abs(middleValue[i] - estimated));
  }
  if (depth < minDepth || error > tolerance && depth < maxDepth) {
    subdivideAdaptive(interpolator, start, middle, startValue, middleValue, depth + 1, minDepth, maxDepth, tolerance, samples);
    subdivideAdaptive(interpolator, middle, end, middleValue, endValue, depth + 1, minDepth, maxDepth, tolerance, samples);
  } else {
    samples.push({ position: start, value: startValue });
  }
}
function createRandom(seed) {
  if (seed === void 0)
    return Math.random;
  let state = Number(seed) >>> 0;
  return () => {
    state = state * 1664525 + 1013904223 >>> 0;
    return state / 4294967296;
  };
}
function shuffle(values, random) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const value = values[i];
    values[i] = values[j];
    values[j] = value;
  }
}
function getVariables(interpolator) {
  return interpolator.variables ?? interpolator.constructor.variables;
}
function getPositionType(interpolator) {
  return interpolator.positions?.constructor || interpolator.values?.constructor || Float64Array;
}
function getValueType(interpolator) {
  return interpolator.values?.constructor || Float64Array;
}

// src/Evaluator.js
var Evaluator = class {
  static degree;
  static variables;
  static validateInput(positions, values, dimension = 1) {
    validateConstructorInput(this, positions, values, dimension);
  }
  constructor(positions, values, dimension = 1) {
    validateConstructorInput(this.constructor, positions, values, dimension);
    this.positions = positions;
    this.values = values;
    this.dimension = dimension;
    this._parallelVersion = 0;
    const degree = this.constructor.degree;
    const variables = this.constructor.variables;
    const length = (degree + 1) ** variables;
    const type = this.values.constructor;
    this.coefficients = new type(dimension * length).fill(0);
    this.update();
  }
  get variables() {
  }
  get degree() {
  }
  update() {
    validateConstructorInput(this.constructor, this.positions, this.values, this.dimension);
    this.coefficients = this.constructor.coefficients(
      this.positions,
      this.values,
      this.dimension,
      this.coefficients
    );
    this._parallelVersion++;
    return this;
  }
  translate(offset) {
    const variables = this.constructor.variables;
    const positions = this.positions;
    const length = positions.length;
    for (let i = 0; i < length; i += variables) {
      if (variables === 1 && typeof offset === "number") {
        positions[i] += offset;
      } else {
        for (let j = 0; j < variables; j++) {
          positions[i + j] += offset[j];
        }
      }
    }
    return this;
  }
  scale(scale, orgin) {
    const variables = this.constructor.variables;
    const positions = this.positions;
    const length = positions.length;
    for (let i = 0; i < length; i += variables) {
      if (variables === 1 && typeof scale === "number" && typeof orgin === "number") {
        const x = positions[i];
        positions[i] = (x - orgin) * scale + orgin;
      } else {
        for (let j = 0; j < variables; j++) {
          const x = positions[i + j];
          const s = scale[j];
          const o = orgin[j];
          positions[i + j] = (x - o) * s + o;
        }
      }
    }
    return this;
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    const dimension = this.dimension;
    const degree = this.constructor.degree;
    const variables = this.constructor.variables;
    const d = degree + 1;
    const outputNotProvided = !output;
    validateSamplePosition(position, variables);
    if (!output)
      output = new this.values.constructor(dimension);
    const size = (degree + 1) ** variables;
    for (let i = 0; i < dimension; i++) {
      output[outputOffset + i] = 0;
      for (let j = 0; j < size; j++) {
        const c = this.coefficients[i * size + j];
        let v = 1;
        for (let k = 0; k < variables; k++) {
          const exponent = Math.floor(j / d ** k % d);
          if (typeof position === "number") {
            v *= position ** exponent;
          } else {
            v *= position[inputOffset + k] ** exponent;
          }
        }
        output[outputOffset + i] += c * v;
      }
    }
    if (dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  /*
  	segment( start, end, amount, handler ) {
  
  		// Assume start, end and amount is a vector.
  
  		const dimension = this.dimension;
  		const variables = this.constructor.variables;
  
  		let length = 1;
  
  		for ( let i = 0; i < variables; i ++ ) length *= amount[ i ];
  		
  		length *= dimension;
  
  		const input = new start.constructor( variables );
  		let output;
  
  		if ( handler ) output = new this.values.constructor( dimension ).fill( 0 );
  		else output = new this.values.constructor( length ).fill( 0 );
  
  		for ( let i = 0; i < length; i += dimension ) {
  
  			let product = 1;
  
  			for ( let j = 0; j < variables; j ++ ) {
  				
  				const _start = typeof start === 'number' ? start : start[ j ];
  				const _end = typeof end === 'number' ? end : end[ j ];
  				const _amount = (typeof amount === 'number' ? amount : amount[ j ]);
  				
  				const size = (_end - _start)/_amount;
  				const multiplier = Math.floor( i / (dimension*product) ) % _amount;
  
  				input[ j ] = _start + multiplier*size;
  
  				product *= _amount;
  
  			}
  
  			if ( handler ) handler( variables > 1 ? input : input[ 0 ], this.evaluate( input, 0, output, 0 ) );
  			else this.evaluate( input, 0, output, i );
  
  		}
  
  		return handler ? this : output;
  
  	}
  */
  step(start, end, size, handler) {
    const dimension = this.dimension;
    const variables = this.constructor.variables;
    validateStepInput(start, end, size, variables);
    let sampleCount = 1;
    const amounts = new this.positions.constructor(variables);
    const sizes = new this.positions.constructor(variables);
    const starts = new this.positions.constructor(variables);
    for (let i = 0; i < variables; i++) {
      const _start = typeof start === "number" ? start : start[i];
      const _end = typeof end === "number" ? end : end[i];
      const _size = typeof size === "number" ? size : size[i];
      starts[i] = _start;
      sizes[i] = _size;
      amounts[i] = Math.floor(Math.abs(_end - _start) / _size) + 1;
      sampleCount *= amounts[i];
    }
    const input = new this.positions.constructor(variables);
    let output;
    if (handler)
      output = new this.values.constructor(dimension).fill(0);
    else
      output = new this.values.constructor(sampleCount * dimension).fill(0);
    for (let i = 0; i < sampleCount; i++) {
      let product = 1;
      for (let j = 0; j < variables; j++) {
        const multiplier = Math.floor(i / product) % amounts[j];
        input[j] = starts[j] + multiplier * sizes[j];
        product *= amounts[j];
      }
      if (handler)
        handler(variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
      else
        this.evaluate(input, 0, output, i * dimension);
    }
    return handler ? this : output;
  }
  segment(start, end, amount, handler) {
    const variables = this.constructor.variables;
    const size = new this.positions.constructor(variables);
    validateSegmentInput(start, end, amount, variables);
    for (let i = 0; i < variables; i++) {
      const _start = typeof start === "number" ? start : start[i];
      const _end = typeof end === "number" ? end : end[i];
      const _amount = typeof amount === "number" ? amount : amount[i];
      size[i] = (_end - _start) / (_amount - 1);
    }
    return this.step(start, end, size, handler);
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
  map(positions, handler) {
    const variables = this.constructor.variables;
    const dimension = this.dimension;
    validateSamplePositions(positions, variables);
    const sampleCount = positions.length / variables;
    const input = new this.positions.constructor(variables);
    let output;
    if (handler) {
      output = new this.values.constructor(dimension);
    } else
      output = new this.values.constructor(sampleCount * dimension).fill(0);
    for (let i = 0, index = 0; i < positions.length; i += variables, index++) {
      for (let j = 0; j < variables; j++) {
        input[j] = positions[i + j];
      }
      if (handler) {
        handler(variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
      } else
        this.evaluate(input, 0, output, index * dimension);
    }
    return handler ? this : output;
  }
  mapAsync(positions, options) {
    return mapInWorkers(this, positions, options);
  }
};

// src/Linear/Linear.js
var Linear = class extends Evaluator {
  static degree = 1;
  static variables = 1;
  static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(dimension * 2);
    const p0 = positions[0];
    const p1 = positions[1];
    const dX = p1 - p0;
    for (let i = 0, index = 0; i < dimension; i++) {
      const v0 = values[i];
      const v1 = values[i + dimension];
      const c1 = (v1 - v0) / dX;
      const c0 = v0 - p0 * c1;
      output[outputOffset + index++] = c0;
      output[outputOffset + index++] = c1;
    }
    return output;
  }
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    const outputNotDefined = !output;
    if (!output)
      output = new values.constructor(dimension);
    const p0 = positions[0];
    const p1 = positions[1];
    const dX = p1 - p0;
    let index = 0;
    for (let i = 0; i < dimension; i++) {
      const v0 = values[index++];
      const v1 = values[index++];
      const c1 = (v1 - v0) / dX;
      const c0 = v0 - p0 * c1;
      const x = typeof position === "number" ? position : position[0];
      output[outputOffset + i] = c1 * x + c0;
    }
    if (dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension);
  }
  /*evaluate( 
  
  		position, inputOffset = 0, 
  		output, outputOffset = 0 
  
  	) {
  
  		const d = this.dimension;
  		const coefficients = this.coefficients;
  
  		if ( !output ) output = new this.values.constructor( d );
  
  		const x = position[ inputOffset ];
  
  		for ( let i = 0, index = 0; i < d; i ++ ) {
  
  			const c0 = coefficients[ index ++ ];
  			const c1 = coefficients[ index ++ ];
  
  			output[ outputOffset + i ] = c0 + c1*x;
  
  		}
  
  		return output;
  
  	}*/
};
globalThis.Linear = Linear;

// src/Linear/Bilinear.js
var Bilinear = class extends Evaluator {
  static degree = 1;
  static variables = 2;
  static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = values.constructor(dimension * 4);
    const x0 = positions[0];
    const y0 = positions[1];
    const x1 = positions[2];
    const y1 = positions[3];
    const inv = 1 / ((x1 - x0) * (y1 - y0));
    const d = dimension;
    for (let i = 0, index = 0; i < dimension; i++) {
      let k = i;
      const v00 = values[k];
      const v01 = values[k += dimension];
      const v10 = values[k += dimension];
      const v11 = values[k += dimension];
      output[outputOffset + index++] = (x1 * y1 * v00 - x1 * y0 * v10 - x0 * y1 * v01 + x0 * y0 * v11) * inv;
      output[outputOffset + index++] = (-y1 * v00 + y0 * v10 + y1 * v01 - y0 * v11) * inv;
      output[outputOffset + index++] = (-x1 * v00 + x1 * v10 + x0 * v01 - x0 * v11) * inv;
      output[outputOffset + index++] = (v00 - v10 - v01 + v11) * inv;
    }
    return output;
  }
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(dimension);
    const x = position[0];
    const y = position[1];
    const x0 = positions[0];
    const y0 = positions[1];
    const x1 = positions[2];
    const y1 = positions[3];
    const k0 = (x - x1) / (x0 - x1);
    const k1 = (x - x0) / (x1 - x0);
    const q0 = (y - y1) / (y0 - y1);
    const q1 = (y - y0) / (y1 - y0);
    const d = dimension;
    for (let i = 0, index = 0; i < dimension; i++) {
      let k = i;
      const v00 = values[k];
      const v10 = values[k += d];
      const v01 = values[k += d];
      const v11 = values[k += d];
      const v0 = v00 * k0 + v10 * k1;
      const v1 = v01 * k0 + v11 * k1;
      output[outputOffset + i] = v0 * q0 + v1 * q1;
    }
    if (dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension);
  }
  /*
  	step( start, end, size, handler ) {
  
  		const variables = this.constructor.variables;
  		const dimension = this.dimension;
  
  		let length = 1;
  
  		length *= Math.floor( (end[0]-start[0])/size[0] );
  		length *= Math.floor( (end[1]-start[1])/size[1] );
  		length *= dimension;
  
  		const input = new this.positions.constructor( variables );
  		const output = new this.values.constructor( length)
  
  		for ( let y = start[1], j = 0; y <= end[1]; y += size[1] ) {
  			for ( let x = start[0]; x <= end[0]; x += size[0] ) {
  
  				input[0] = x;
  				input[1] = y;
  
  				this.evaluate( input, 0, output, j );
  
  				j += dimension;
  
  			}
  		}
  
  		return output;
  
  	};*/
  /*
  	segment( start, end, amount ) {
  
  		const variables = this.constructor.variables;
  		const dimension = this.dimension;
  
  		let length = 1;
  
  		length *= amount[0];
  		length *= amount[1];
  		length *= dimension;
  
  		const sizeX = (end[0] - start[0])/(amount[0]-1);
  		const sizeY = (end[1] - start[1])/(amount[1]-1);
  
  		const input = new this.positions.constructor( variables );
  		const output = new this.values.constructor( length)
  
  		for ( let y = start[1], j = 0; y <= end[1]; y += sizeY ) {
  			for ( let x = start[0]; x <= end[0]; x += sizeX ) {
  
  				input[0] = x;
  				input[1] = y;
  
  				this.evaluate( input, 0, output, j );
  
  				j += dimension;
  
  			}
  		}
  
  		return output;
  
  	};*/
  /*
  	evaluate( 
  
  		position, inputOffset = 0, 
  		output, outputOffset = 0 
  
  	) {
  
  		if ( !output ) output = new this.values.constructor( this.dimension );
  
  		const x = position[ inputOffset + 0 ];
  		const y = position[ inputOffset + 1 ];
  
  		for ( let i = 0; i < this.dimension; i ++ ) {
  
  			const c00 = this.coefficients[ 4*i + 0 ];
  			const c10 = this.coefficients[ 4*i + 1 ];
  			const c01 = this.coefficients[ 4*i + 2 ];
  			const c11 = this.coefficients[ 4*i + 3 ];
  
  			output[ outputOffset + i ] = c00 + c10*x + c01*y + c11*x*y;
  
  		}
  
  		return output;
  
  	};
  */
};
globalThis.Bilinear = Bilinear;

// src/Linear/Trilinear.js
var Trilinear = class extends Evaluator {
  static degree = 1;
  static variables = 3;
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = values.constructor(dimension);
    const x = position[0];
    const y = position[1];
    const z = position[2];
    const x0 = positions[0];
    const y0 = positions[1];
    const z0 = positions[2];
    const x1 = positions[3];
    const y1 = positions[4];
    const z1 = positions[5];
    const dX0 = (x - x1) / (x0 - x1);
    const dX1 = (x - x0) / (x1 - x0);
    const dY0 = (y - y1) / (y0 - y1);
    const dY1 = (y - y0) / (y1 - y0);
    const dZ0 = (z - z1) / (z0 - z1);
    const dZ1 = (z - z0) / (z1 - z0);
    let index = 0;
    for (let i = 0, index2 = 0; i < dimension; i++) {
      let k = i;
      const v000 = values[k];
      const v100 = values[k += dimension];
      const v010 = values[k += dimension];
      const v110 = values[k += dimension];
      const v001 = values[k += dimension];
      const v101 = values[k += dimension];
      const v011 = values[k += dimension];
      const v111 = values[k += dimension];
      const v00 = v000 * dX0 + v100 * dX1;
      const v10 = v010 * dX0 + v110 * dX1;
      const v01 = v001 * dX0 + v101 * dX1;
      const v11 = v011 * dX0 + v111 * dX1;
      const v0 = v00 * dY0 + v10 * dY1;
      const v1 = v01 * dY0 + v11 * dY1;
      output[outputOffset + index2++] = v0 * dZ0 + v1 * dZ1;
    }
    if (dimension === 1)
      return output[0];
    return output;
  }
  static coefficients(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(dimension * 8);
    const x0 = positions[0];
    const y0 = positions[1];
    const z0 = positions[2];
    const x1 = positions[3];
    const y1 = positions[4];
    const z1 = positions[5];
    const inv = 1 / ((x1 - x0) * (y1 - y0) * (z1 - z0));
    for (let i = 0, index = 0; i < dimension; i++) {
      let k = i;
      const v000 = values[k];
      const v100 = values[k += dimension];
      const v010 = values[k += dimension];
      const v110 = values[k += dimension];
      const v001 = values[k += dimension];
      const v101 = values[k += dimension];
      const v011 = values[k += dimension];
      const v111 = values[k += dimension];
      const c000 = (-v000 * x1 * y1 * z1 + v001 * x1 * y1 * z0 + v010 * x1 * y0 * z1 - v011 * x1 * y0 * z0 + v100 * x0 * y1 * z1 - v101 * x0 * y1 * z0 - v110 * x0 * y0 * z1 + v111 * x0 * y0 * z0) * inv;
      const c100 = (v000 * y1 * z1 - v001 * y1 * z0 - v010 * y0 * z1 + v011 * y0 * z0 - v100 * y1 * z1 + v101 * y1 * z0 + v110 * y0 * z1 - v111 * y0 * z0) * inv;
      const c010 = (v000 * x1 * z1 - v001 * x1 * z0 - v010 * x1 * z1 + v011 * x1 * z0 - v100 * x0 * z1 + v101 * x0 * z0 + v110 * x0 * z1 - v111 * x0 * z0) * inv;
      const c110 = (-v000 * z1 + v001 * z0 + v010 * z1 - v011 * z0 + v100 * z1 - v101 * z0 - v110 * z1 + v111 * z0) * inv;
      const c001 = (v000 * x1 * y1 - v001 * x1 * y1 - v010 * x1 * y0 + v011 * x1 * y0 - v100 * x0 * y1 + v101 * x0 * y1 + v110 * x0 * y0 - v111 * x0 * y0) * inv;
      const c101 = (-v000 * y1 + v001 * y1 + v010 * y0 - v011 * y0 + v100 * y1 - v101 * y1 - v110 * y0 + v111 * y0) * inv;
      const c011 = (-v000 * x1 + v001 * x1 + v010 * x1 - v011 * x1 + v100 * x0 - v101 * x0 - v110 * x0 + v111 * x0) * inv;
      const c111 = (v000 - v001 - v010 + v011 - v100 + v101 + v110 - v111) * inv;
      output[outputOffset + index++] = c000;
      output[outputOffset + index++] = c100;
      output[outputOffset + index++] = c010;
      output[outputOffset + index++] = c110;
      output[outputOffset + index++] = c001;
      output[outputOffset + index++] = c101;
      output[outputOffset + index++] = c011;
      output[outputOffset + index++] = c111;
    }
    return output;
  }
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension);
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    if (!output)
      output = new this.values.constructor(this.dimension);
    const x = position[inputOffset + 0];
    const y = position[inputOffset + 1];
    const z = position[inputOffset + 2];
    for (let i = 0; i < this.dimension; i++) {
      const c000 = this.coefficients[8 * i + 0];
      const c100 = this.coefficients[8 * i + 1];
      const c010 = this.coefficients[8 * i + 2];
      const c110 = this.coefficients[8 * i + 3];
      const c001 = this.coefficients[8 * i + 4];
      const c101 = this.coefficients[8 * i + 5];
      const c011 = this.coefficients[8 * i + 6];
      const c111 = this.coefficients[8 * i + 7];
      output[outputOffset + i] = -(c000 + c100 * x + c010 * y + c110 * x * y + (c001 + c101 * x + c011 * y + c111 * x * y) * z);
    }
    return output;
  }
};
globalThis.Trilinear = Trilinear;

// src/Quadratic/Quadratic.js
var Quadratic = class extends Evaluator {
  static degree = 2;
  static variables = 1;
  static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(3 * dimension);
    const x0 = positions[0];
    const x1 = positions[1];
    const x2 = positions[2];
    const r0 = 1 / ((x0 - x1) * (x0 - x2));
    const r1 = 1 / ((x1 - x0) * (x1 - x2));
    const r2 = 1 / ((x2 - x0) * (x2 - x1));
    const d = dimension;
    for (let i = 0, j = 0; i < d; i++) {
      let k = i;
      const v0 = values[k] * r0;
      const v1 = values[k += d] * r1;
      const v2 = values[k += d] * r2;
      const c0 = v0 * x1 * x2 + v1 * x0 * x2 + v2 * x0 * x1;
      const c1 = -(v0 * (x1 + x2) + v1 * (x0 + x2) + v2 * (x0 + x1));
      const c2 = v0 + v1 + v2;
      output[outputOffset + j++] = c0;
      output[outputOffset + j++] = c1;
      output[outputOffset + j++] = c2;
    }
    return output;
  }
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    output = !output ? new values.constructor(dimension) : output;
    const x = typeof position === "number" ? position : position[0];
    const x0 = positions[0];
    const x1 = positions[1];
    const x2 = positions[2];
    const dX0 = x - x0;
    const dX1 = x - x1;
    const dX2 = x - x2;
    const dX01 = 1 / (x0 - x1);
    const dX02 = 1 / (x0 - x2);
    const dX12 = 1 / (x1 - x2);
    const r0 = dX1 * dX2 * dX01 * dX02;
    const r1 = -dX0 * dX2 * dX01 * dX12;
    const r2 = dX0 * dX1 * dX01 * dX02;
    for (let i = 0; i < dimension; i++) {
      let k = i;
      const v0 = values[k];
      const v1 = values[k += dimension];
      const v2 = values[k += dimension];
      output[outputOffset + i] = r0 * v0 + r1 * v1 + r2 * v2;
    }
    if (dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension);
  }
};
globalThis.Quadratic = Quadratic;

// src/Quadratic/Biquadratic.js
var Biquadratic = class extends Evaluator {
  static degree = 2;
  static variables = 2;
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(dimension);
    const x = position[0];
    const y = position[1];
    const x0 = positions[0];
    const y0 = positions[1];
    const x1 = positions[2];
    const y1 = positions[3];
    const x2 = positions[4];
    const y2 = positions[5];
    const dX01 = x0 - x1;
    const dX02 = x0 - x2;
    const dX12 = x1 - x2;
    const dX0 = x - x0;
    const dX1 = x - x1;
    const dX2 = x - x2;
    const dY0 = y - y0;
    const dY1 = y - y1;
    const dY2 = y - y2;
    const dY01 = y0 - y1;
    const dY02 = y0 - y2;
    const dY12 = y1 - y2;
    const k0 = dX1 * dX2 / (dX01 * dX02);
    const k1 = -(dX0 * dX2) / (dX01 * dX12);
    const k2 = dX0 * dX1 / (dX02 * dX12);
    const q0 = dY1 * dY2 / (dY01 * dY02);
    const q1 = -(dY0 * dY2) / (dY01 * dY12);
    const q2 = dY0 * dY1 / (dY02 * dY12);
    for (let i = 0; i < dimension; i++) {
      let k = i;
      const v00 = values[k];
      const v10 = values[k += dimension];
      const v20 = values[k += dimension];
      const v01 = values[k += dimension];
      const v11 = values[k += dimension];
      const v21 = values[k += dimension];
      const v02 = values[k += dimension];
      const v12 = values[k += dimension];
      const v22 = values[k += dimension];
      const v0 = k0 * v00 + k1 * v10 + k2 * v20;
      const v1 = k0 * v01 + k1 * v11 + k2 * v21;
      const v2 = k0 * v02 + k1 * v12 + k2 * v22;
      output[outputOffset + i] = q0 * v0 + q1 * v1 + q2 * v2;
    }
    if (dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(dimension * 9);
    const x0 = positions[0];
    const y0 = positions[1];
    const x1 = positions[2];
    const y1 = positions[3];
    const x2 = positions[4];
    const y2 = positions[5];
    const x01 = x0 * x1;
    const x02 = x0 * x2;
    const x12 = x1 * x2;
    const y01 = y0 * y1;
    const y02 = y0 * y2;
    const y12 = y1 * y2;
    const qX0 = 1 / ((x0 - x1) * (x0 - x2));
    const qX1 = 1 / ((x1 - x0) * (x1 - x2));
    const qX2 = 1 / ((x2 - x0) * (x2 - x1));
    const qY0 = 1 / ((y0 - y1) * (y0 - y2));
    const qY1 = 1 / ((y1 - y0) * (y1 - y2));
    const qY2 = 1 / ((y2 - y0) * (y2 - y1));
    const r00 = qX0 * qY0;
    const r10 = qX1 * qY0;
    const r20 = qX2 * qY0;
    const r01 = qX0 * qY1;
    const r11 = qX1 * qY1;
    const r21 = qX2 * qY1;
    const r02 = qX0 * qY2;
    const r12 = qX1 * qY2;
    const r22 = qX2 * qY2;
    const d = dimension, v = values;
    for (let i = 0, j = 0; i < d; i++) {
      let k = i;
      const v00 = v[k] * r00;
      const v01 = v[k += d] * r01;
      const v02 = v[k += d] * r02;
      const v10 = v[k += d] * r10;
      const v11 = v[k += d] * r11;
      const v12 = v[k += d] * r12;
      const v20 = v[k += d] * r20;
      const v21 = v[k += d] * r21;
      const v22 = v[k += d] * r22;
      const c00 = y12 * (v00 * x12 + v10 * x02 + v20 * x01) + y02 * (v01 * x12 + v11 * x02 + v21 * x01) + y01 * (v02 * x12 + v12 * x02 + v22 * x01);
      const c10 = -(y1 + y2) * (v00 * x12 - v10 * x02 - v20 * x01) - (y0 + y2) * (v01 * x12 - v11 * x02 - v21 * x01) - (y0 + y1) * (v02 * x12 - v12 * x02 - v22 * x01);
      const c01 = -(x1 + x2) * (v00 * y12 - v01 * y02 - v02 * y01) - (x0 + x2) * (v10 * y12 - v11 * y02 - v12 * y01) - (x0 + x1) * (v20 * y12 - v21 * y02 - v22 * y01);
      const c20 = v00 * y12 - v10 * y12 - v20 * y12 + v01 * y02 - v11 * y02 - v21 * y02 + v02 * y01 - v12 * y01 - v22 * y01;
      const c02 = v00 * x12 - v01 * x12 - v02 * x12 + v10 * x02 - v11 * x02 - v12 * x02 + v20 * x01 - v21 * x01 - v22 * x01;
      const c11 = (y1 + y2) * (v00 * (x1 + x2) + v10 * (x0 + x2) + v20 * (x0 + x1)) + (y0 + y2) * (v01 * (x1 + x2) + v11 * (x0 + x2) + v21 * (x0 + x1)) + (y0 + y1) * (v02 * (x1 + x2) + v12 * (x0 + x2) + v22 * (x0 + x1));
      const c21 = -(y1 + y2) * (v00 + v10 + v20) - (y0 + y2) * (v01 + v11 + v21) - (y0 + y1) * (v02 + v12 + v22);
      const c12 = -(x1 + x2) * (v00 + v01 + v02) - (x0 + x2) * (v10 + v11 + v12) - (x0 + x1) * (v20 + v21 + v22);
      const c22 = v00 + v10 + v20 + v01 + v11 + v21 + v02 + v12 + v22;
      output[outputOffset + j++] = c00;
      output[outputOffset + j++] = c10;
      output[outputOffset + j++] = c20;
      output[outputOffset + j++] = c01;
      output[outputOffset + j++] = c11;
      output[outputOffset + j++] = c21;
      output[outputOffset + j++] = c02;
      output[outputOffset + j++] = c12;
      output[outputOffset + j++] = c22;
    }
    return output;
  }
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension);
  }
};
globalThis.Biquadratic = Biquadratic;

// src/Quadratic/Triquadratic.js
var Triquadratic = class extends Evaluator {
  static degree = 2;
  static variables = 3;
  static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(dimension * 27);
    const x0 = positions[0];
    const y0 = positions[1];
    const z0 = positions[2];
    const x1 = positions[3];
    const y1 = positions[4];
    const z1 = positions[5];
    const x2 = positions[6];
    const y2 = positions[7];
    const z2 = positions[8];
    const qX0 = 1 / ((x0 - x1) * (x0 - x2));
    const qX1 = 1 / ((x1 - x0) * (x1 - x2));
    const qX2 = 1 / ((x2 - x0) * (x2 - x1));
    const qY0 = 1 / ((y0 - y1) * (y0 - y2));
    const qY1 = 1 / ((y1 - y0) * (y1 - y2));
    const qY2 = 1 / ((y2 - y0) * (y2 - y1));
    const qZ0 = 1 / ((z0 - z1) * (z0 - z2));
    const qZ1 = 1 / ((z1 - z0) * (z1 - z2));
    const qZ2 = 1 / ((z2 - z0) * (z2 - z1));
    const r000 = qX0 * qY0 * qZ0;
    const r100 = qX1 * qY0 * qZ0;
    const r200 = qX2 * qY0 * qZ0;
    const r010 = qX0 * qY1 * qZ0;
    const r110 = qX1 * qY1 * qZ0;
    const r210 = qX2 * qY1 * qZ0;
    const r020 = qX0 * qY2 * qZ0;
    const r120 = qX1 * qY2 * qZ0;
    const r220 = qX2 * qY2 * qZ0;
    const r001 = qX0 * qY0 * qZ1;
    const r101 = qX1 * qY0 * qZ1;
    const r201 = qX2 * qY0 * qZ1;
    const r011 = qX0 * qY1 * qZ1;
    const r111 = qX1 * qY1 * qZ1;
    const r211 = qX2 * qY1 * qZ1;
    const r021 = qX0 * qY2 * qZ1;
    const r121 = qX1 * qY2 * qZ1;
    const r221 = qX2 * qY2 * qZ1;
    const r002 = qX0 * qY0 * qZ2;
    const r102 = qX1 * qY0 * qZ2;
    const r202 = qX2 * qY0 * qZ2;
    const r012 = qX0 * qY1 * qZ2;
    const r112 = qX1 * qY1 * qZ2;
    const r212 = qX2 * qY1 * qZ2;
    const r022 = qX0 * qY2 * qZ2;
    const r122 = qX1 * qY2 * qZ2;
    const r222 = qX2 * qY2 * qZ2;
    const hX = new Float32Array(9);
    const hY = new Float32Array(9);
    const hZ = new Float32Array(9);
    hX[0] = x1 * x2;
    hX[1] = x0 * x2;
    hX[2] = x0 * x1;
    hX[3] = -(x1 + x2);
    hX[4] = -(x0 + x2);
    hX[5] = -(x0 + x1);
    hX[6] = 1;
    hX[7] = 1;
    hX[8] = 1;
    hY[0] = y1 * y2;
    hY[1] = y0 * y2;
    hY[2] = y0 * y1;
    hY[3] = -(y1 + y2);
    hY[4] = -(y0 + y2);
    hY[5] = -(y0 + y1);
    hY[6] = 1;
    hY[7] = 1;
    hY[8] = 1;
    hZ[0] = z1 * z2;
    hZ[1] = z0 * z2;
    hZ[2] = z0 * z1;
    hZ[3] = -(z1 + z2);
    hZ[4] = -(z0 + z2);
    hZ[5] = -(z0 + z1);
    hZ[6] = 1;
    hZ[7] = 1;
    hZ[8] = 1;
    for (let d = 0, v = values, t = dimension, index = 0; d < t; d++) {
      let q = d;
      const v000 = values[q] * r000;
      const v100 = values[q += t] * r100;
      const v200 = values[q += t] * r200;
      const v010 = values[q += t] * r010;
      const v110 = values[q += t] * r110;
      const v210 = values[q += t] * r210;
      const v020 = values[q += t] * r020;
      const v120 = values[q += t] * r120;
      const v220 = values[q += t] * r220;
      const v001 = values[q += t] * r001;
      const v101 = values[q += t] * r101;
      const v201 = values[q += t] * r201;
      const v011 = values[q += t] * r011;
      const v111 = values[q += t] * r111;
      const v211 = values[q += t] * r211;
      const v021 = values[q += t] * r021;
      const v121 = values[q += t] * r121;
      const v221 = values[q += t] * r221;
      const v002 = values[q += t] * r002;
      const v102 = values[q += t] * r102;
      const v202 = values[q += t] * r202;
      const v012 = values[q += t] * r012;
      const v112 = values[q += t] * r112;
      const v212 = values[q += t] * r212;
      const v022 = values[q += t] * r022;
      const v122 = values[q += t] * r122;
      const v222 = values[q += t] * r222;
      for (let z = 0, iZ = 0; z < 3; z++) {
        const hZ0 = hZ[iZ++];
        const hZ1 = hZ[iZ++];
        const hZ2 = hZ[iZ++];
        for (let y = 0, iY = 0; y < 3; y++) {
          const hY0 = hY[iY++];
          const hY1 = hY[iY++];
          const hY2 = hY[iY++];
          for (let x = 0, iX = 0; x < 3; x++) {
            const hX0 = hX[iX++];
            const hX1 = hX[iX++];
            const hX2 = hX[iX++];
            output[outputOffset + index++] = hZ0 * (hY0 * (hX0 * v000 + hX1 * v100 + hX2 * v200) + hY1 * (hX0 * v010 + hX1 * v110 + hX2 * v210) + hY2 * (hX0 * v020 + hX1 * v120 + hX2 * v220)) + hZ1 * (hY0 * (hX0 * v001 + hX1 * v101 + hX2 * v201) + hY1 * (hX0 * v011 + hX1 * v111 + hX2 * v211) + hY2 * (hX0 * v021 + hX1 * v121 + hX2 * v221)) + hZ2 * (hY0 * (hX0 * v002 + hX1 * v102 + hX2 * v202) + hY1 * (hX0 * v012 + hX1 * v112 + hX2 * v212) + hY2 * (hX0 * v022 + hX1 * v122 + hX2 * v222));
          }
        }
      }
    }
    return output;
  }
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    output = !output ? new values.constructor(dimension) : output;
    const x = position[0];
    const y = position[1];
    const z = position[2];
    const x0 = positions[0];
    const y0 = positions[1];
    const z0 = positions[2];
    const x1 = positions[3];
    const y1 = positions[4];
    const z1 = positions[5];
    const x2 = positions[6];
    const y2 = positions[7];
    const z2 = positions[8];
    const rX0 = (x - x1) * (x - x2) / ((x0 - x1) * (x0 - x2));
    const rX1 = (x - x0) * (x - x2) / ((x1 - x0) * (x1 - x2));
    const rX2 = (x - x0) * (x - x1) / ((x2 - x0) * (x2 - x1));
    const rY0 = (y - y1) * (y - y2) / ((y0 - y1) * (y0 - y2));
    const rY1 = (y - y0) * (y - y2) / ((y1 - y0) * (y1 - y2));
    const rY2 = (y - y0) * (y - y1) / ((y2 - y0) * (y2 - y1));
    const rZ0 = (z - z1) * (z - z2) / ((z0 - z1) * (z0 - z2));
    const rZ1 = (z - z0) * (z - z2) / ((z1 - z0) * (z1 - z2));
    const rZ2 = (z - z0) * (z - z1) / ((z2 - z0) * (z2 - z1));
    const v = values;
    const d = dimension;
    for (let i = 0; i < d; i++) {
      let k = i;
      const v00 = v[k] * rX0 + v[k += d] * rX1 + v[k += d] * rX2;
      const v10 = v[k += d] * rX0 + v[k += d] * rX1 + v[k += d] * rX2;
      const v20 = v[k += d] * rX0 + v[k += d] * rX1 + v[k += d] * rX2;
      const v01 = v[k += d] * rX0 + v[k += d] * rX1 + v[k += d] * rX2;
      const v11 = v[k += d] * rX0 + v[k += d] * rX1 + v[k += d] * rX2;
      const v21 = v[k += d] * rX0 + v[k += d] * rX1 + v[k += d] * rX2;
      const v02 = v[k += d] * rX0 + v[k += d] * rX1 + v[k += d] * rX2;
      const v12 = v[k += d] * rX0 + v[k += d] * rX1 + v[k += d] * rX2;
      const v22 = v[k += d] * rX0 + v[k += d] * rX1 + v[k += d] * rX2;
      const v0 = v00 * rY0 + v10 * rY1 + v20 * rY2;
      const v1 = v01 * rY0 + v11 * rY1 + v21 * rY2;
      const v2 = v02 * rY0 + v12 * rY1 + v22 * rY2;
      output[outputOffset + i] = v0 * rZ0 + v1 * rZ1 + v2 * rZ2;
    }
    if (dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension);
  }
};
globalThis.Triquadratic = Triquadratic;

// src/Cubic/Cubic.js
var Cubic = class extends Evaluator {
  static degree = 3;
  static variables = 1;
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(dimension);
    const x = typeof position === "number" ? position : position[0];
    const x0 = positions[0];
    const x1 = positions[1];
    const x2 = positions[2];
    const x3 = positions[3];
    const d01 = x0 - x1;
    const d02 = x0 - x2;
    const d03 = x0 - x3;
    const d12 = x1 - x2;
    const d13 = x1 - x3;
    const d23 = x2 - x3;
    const d0 = x - x0;
    const d1 = x - x1;
    const d2 = x - x2;
    const d3 = x - x3;
    const r0 = d1 * d2 * d3 / (d01 * d02 * d03);
    const r1 = -d0 * d2 * d3 / (d01 * d12 * d13);
    const r2 = d0 * d1 * d3 / (d02 * d12 * d23);
    const r3 = -d0 * d1 * d2 / (d03 * d13 * d23);
    const d = dimension;
    for (let i = 0; i < d; i++) {
      let k = i;
      const v0 = values[k];
      const v1 = values[k += d];
      const v2 = values[k += d];
      const v3 = values[k += d];
      output[outputOffset + i] = v0 * r0 + v1 * r1 + v2 * r2 + v3 * r3;
    }
    if (d === 1)
      return output[outputOffset];
    else
      return output;
  }
  static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(4 * dimension);
    const x0 = positions[0];
    const x1 = positions[1];
    const x2 = positions[2];
    const x3 = positions[3];
    const x01 = x0 * x1;
    const x02 = x0 * x2;
    const x03 = x0 * x3;
    const x12 = x1 * x2;
    const x13 = x1 * x3;
    const x23 = x2 * x3;
    const x012 = x01 * x2;
    const x013 = x01 * x3;
    const x023 = x02 * x3;
    const x123 = x12 * x3;
    const k0 = 1 / (x0 ** 3 - (x01 + x02 + x03) * x0 + (x012 + x013 + x023) - x123);
    const k1 = 1 / (x1 ** 3 - (x01 + x12 + x13) * x1 + (x012 + x013 + x123) - x023);
    const k2 = 1 / (x2 ** 3 - (x02 + x12 + x23) * x2 + (x012 + x023 + x123) - x013);
    const k3 = 1 / (x3 ** 3 - (x03 + x13 + x23) * x3 + (x013 + x023 + x123) - x012);
    const d = dimension;
    for (let i = 0, j = 0; i < dimension; i++) {
      let k = i;
      const r0 = values[k] * k0;
      const r1 = values[k += d] * k1;
      const r2 = values[k += d] * k2;
      const r3 = values[k += d] * k3;
      const c0 = -(r0 * x123 + r1 * x023 + r2 * x013 + r3 * x012);
      const c1 = r0 * (x12 + x13 + x23) + r1 * (x02 + x03 + x23) + r2 * (x01 + x03 + x13) + r3 * (x01 + x02 + x12);
      const c2 = -(r0 * (x1 + x2 + x3) + r1 * (x0 + x2 + x3) + r2 * (x0 + x1 + x3) + r3 * (x0 + x1 + x2));
      const c3 = r0 + r1 + r2 + r3;
      output[outputOffset + j++] = c0;
      output[outputOffset + j++] = c1;
      output[outputOffset + j++] = c2;
      output[outputOffset + j++] = c3;
    }
    return output;
  }
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension);
  }
};
globalThis.Cubic = Cubic;

// src/Cubic/Bicubic.js
function g(hX, r, hY) {
  return (hX[0] * r[0] + hX[1] * r[1] + hX[2] * r[2] + hX[3] * r[3]) * hY[0] + (hX[0] * r[4] + hX[1] * r[5] + hX[2] * r[6] + hX[3] * r[7]) * hY[1] + (hX[0] * r[8] + hX[1] * r[9] + hX[2] * r[10] + hX[3] * r[11]) * hY[2] + (hX[0] * r[12] + hX[1] * r[13] + hX[2] * r[14] + hX[3] * r[15]) * hY[3];
}
var Bicubic = class extends Evaluator {
  static degree = 3;
  static variables = 2;
  static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(dimension * 16);
    const x0 = positions[0];
    const y0 = positions[1];
    const x1 = positions[2];
    const y1 = positions[3];
    const x2 = positions[4];
    const y2 = positions[5];
    const x3 = positions[6];
    const y3 = positions[7];
    const x01 = x0 * x1;
    const x02 = x0 * x2;
    const x03 = x0 * x3;
    const x12 = x1 * x2;
    const x13 = x1 * x3;
    const x23 = x2 * x3;
    const x012 = x01 * x2;
    const x013 = x01 * x3;
    const x023 = x02 * x3;
    const x123 = x12 * x3;
    const hX01 = x12 + x13 + x23;
    const hX11 = x02 + x03 + x23;
    const hX21 = x01 + x03 + x13;
    const hX31 = x01 + x02 + x12;
    const hX02 = x1 + x2 + x3;
    const hX12 = x0 + x2 + x3;
    const hX22 = x0 + x1 + x3;
    const hX32 = x0 + x1 + x2;
    const hX0 = [-x123, -x023, -x013, -x012];
    const hX1 = [hX01, hX11, hX21, hX31];
    const hX2 = [-hX02, -hX12, -hX22, -hX32];
    const hX3 = [1, 1, 1, 1];
    const dX01 = x0 - x1;
    const dX02 = x0 - x2;
    const dX03 = x0 - x3;
    const dX12 = x1 - x2;
    const dX13 = x1 - x3;
    const dX23 = x2 - x3;
    const y01 = y0 * y1;
    const y02 = y0 * y2;
    const y03 = y0 * y3;
    const y12 = y1 * y2;
    const y13 = y1 * y3;
    const y23 = y2 * y3;
    const y012 = y01 * y2;
    const y013 = y01 * y3;
    const y023 = y02 * y3;
    const y123 = y12 * y3;
    const dY01 = y0 - y1;
    const dY02 = y0 - y2;
    const dY03 = y0 - y3;
    const dY12 = y1 - y2;
    const dY13 = y1 - y3;
    const dY23 = y2 - y3;
    const q0 = 1 / (dX01 * dX02 * dX03);
    const q1 = -1 / (dX01 * dX12 * dX13);
    const q2 = 1 / (dX02 * dX12 * dX23);
    const q3 = -1 / (dX03 * dX13 * dX23);
    const p0 = 1 / (dY01 * dY02 * dY03);
    const p1 = -1 / (dY01 * dY12 * dY13);
    const p2 = 1 / (dY02 * dY12 * dY23);
    const p3 = -1 / (dY03 * dY13 * dY23);
    const hY01 = y12 + y13 + y23;
    const hY11 = y02 + y03 + y23;
    const hY21 = y01 + y03 + y13;
    const hY31 = y01 + y02 + y12;
    const hY02 = y1 + y2 + y3;
    const hY12 = y0 + y2 + y3;
    const hY22 = y0 + y1 + y3;
    const hY32 = y0 + y1 + y2;
    const hY0 = [-y123, -y023, -y013, -y012];
    const hY1 = [hY01, hY11, hY21, hY31];
    const hY2 = [-hY02, -hY12, -hY22, -hY32];
    const hY3 = hX3;
    const r = new Float32Array(16);
    const d = dimension;
    for (let i = 0, j = 0; i < d; i++) {
      let k = i;
      const v00 = values[k];
      const v10 = values[k += d];
      const v20 = values[k += d];
      const v30 = values[k += d];
      const v01 = values[k += d];
      const v11 = values[k += d];
      const v21 = values[k += d];
      const v31 = values[k += d];
      const v02 = values[k += d];
      const v12 = values[k += d];
      const v22 = values[k += d];
      const v32 = values[k += d];
      const v03 = values[k += d];
      const v13 = values[k += d];
      const v23 = values[k += d];
      const v33 = values[k += d];
      r[0] = v00 * q0 * p0;
      r[1] = v10 * q1 * p0;
      r[2] = v20 * q2 * p0;
      r[3] = v30 * q3 * p0;
      r[4] = v01 * q0 * p1;
      r[5] = v11 * q1 * p1;
      r[6] = v21 * q2 * p1;
      r[7] = v31 * q3 * p1;
      r[8] = v02 * q0 * p2;
      r[9] = v12 * q1 * p2;
      r[10] = v22 * q2 * p2;
      r[11] = v32 * q3 * p2;
      r[12] = v03 * q0 * p3;
      r[13] = v13 * q1 * p3;
      r[14] = v23 * q2 * p3;
      r[15] = v33 * q3 * p3;
      output[outputOffset + j++] = g(hX0, r, hY0);
      output[outputOffset + j++] = g(hX1, r, hY0);
      output[outputOffset + j++] = g(hX2, r, hY0);
      output[outputOffset + j++] = g(hX3, r, hY0);
      output[outputOffset + j++] = g(hX0, r, hY1);
      output[outputOffset + j++] = g(hX1, r, hY1);
      output[outputOffset + j++] = g(hX2, r, hY1);
      output[outputOffset + j++] = g(hX3, r, hY1);
      output[outputOffset + j++] = g(hX0, r, hY2);
      output[outputOffset + j++] = g(hX1, r, hY2);
      output[outputOffset + j++] = g(hX2, r, hY2);
      output[outputOffset + j++] = g(hX3, r, hY2);
      output[outputOffset + j++] = g(hX0, r, hY3);
      output[outputOffset + j++] = g(hX1, r, hY3);
      output[outputOffset + j++] = g(hX2, r, hY3);
      output[outputOffset + j++] = g(hX3, r, hY3);
    }
    return output;
  }
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(dimension);
    const x = position[0];
    const y = position[1];
    const x0 = positions[0];
    const y0 = positions[1];
    const x1 = positions[2];
    const y1 = positions[3];
    const x2 = positions[4];
    const y2 = positions[5];
    const x3 = positions[6];
    const y3 = positions[7];
    const dX0 = x - x0;
    const dX1 = x - x1;
    const dX2 = x - x2;
    const dX3 = x - x3;
    const dX01 = x0 - x1;
    const dX02 = x0 - x2;
    const dX03 = x0 - x3;
    const dX12 = x1 - x2;
    const dX13 = x1 - x3;
    const dX23 = x2 - x3;
    const dY0 = y - y0;
    const dY1 = y - y1;
    const dY2 = y - y2;
    const dY3 = y - y3;
    const dY01 = y0 - y1;
    const dY02 = y0 - y2;
    const dY03 = y0 - y3;
    const dY12 = y1 - y2;
    const dY13 = y1 - y3;
    const dY23 = y2 - y3;
    const dX123 = dX1 * dX2 * dX3 / (dX01 * dX02 * dX03);
    const dX023 = -dX0 * dX2 * dX3 / (dX01 * dX12 * dX13);
    const dX013 = dX0 * dX1 * dX3 / (dX02 * dX12 * dX23);
    const dX012 = -dX0 * dX1 * dX2 / (dX03 * dX13 * dX23);
    const dY123 = dY1 * dY2 * dY3 / (dY01 * dY02 * dY03);
    const dY023 = -dY0 * dY2 * dY3 / (dY01 * dY12 * dY13);
    const dY013 = dY0 * dY1 * dY3 / (dY02 * dY12 * dY23);
    const dY012 = -dY0 * dY1 * dY2 / (dY03 * dY13 * dY23);
    const d = dimension;
    for (let i = 0; i < d; i++) {
      let k = i;
      const v00 = values[k];
      const v10 = values[k += d];
      const v20 = values[k += d];
      const v30 = values[k += d];
      const v01 = values[k += d];
      const v11 = values[k += d];
      const v21 = values[k += d];
      const v31 = values[k += d];
      const v02 = values[k += d];
      const v12 = values[k += d];
      const v22 = values[k += d];
      const v32 = values[k += d];
      const v03 = values[k += d];
      const v13 = values[k += d];
      const v23 = values[k += d];
      const v33 = values[k += d];
      const v0 = v00 * dX123 + v10 * dX023 + v20 * dX013 + v30 * dX012;
      const v1 = v01 * dX123 + v11 * dX023 + v21 * dX013 + v31 * dX012;
      const v2 = v02 * dX123 + v12 * dX023 + v22 * dX013 + v32 * dX012;
      const v3 = v03 * dX123 + v13 * dX023 + v23 * dX013 + v33 * dX012;
      output[outputOffset + i] = v0 * dY123 + v1 * dY023 + v2 * dY013 + v3 * dY012;
    }
    if (d === 1)
      return output[outputOffset];
    else
      return output;
  }
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension);
  }
  /*evaluate(
  
  		position, inputOffset = 0,
  		output, outputOffset = 0
  
  	) {
  
  		const dimension = this.dimension;
  
  		if ( !output ) output = new this.values.constructor( dimension );
  
  		const x = position[ 0 ];
  		const y = position[ 1 ];
  
  		for ( let i = 0, index = 0; i < dimension; i ++ ) {
  
  			const c00 = this.coefficients[ index ++ ];
  			const c10 = this.coefficients[ index ++ ];
  			const c20 = this.coefficients[ index ++ ];
  			const c30 = this.coefficients[ index ++ ];
  
  			const c01 = this.coefficients[ index ++ ];
  			const c11 = this.coefficients[ index ++ ];
  			const c21 = this.coefficients[ index ++ ];
  			const c31 = this.coefficients[ index ++ ];
  			
  			const c02 = this.coefficients[ index ++ ];
  			const c12 = this.coefficients[ index ++ ];
  			const c22 = this.coefficients[ index ++ ];
  			const c32 = this.coefficients[ index ++ ];
  			
  			const c03 = this.coefficients[ index ++ ];
  			const c13 = this.coefficients[ index ++ ];
  			const c23 = this.coefficients[ index ++ ];
  			const c33 = this.coefficients[ index ++ ];
  			//   +      -         +         -
  			output[ i ] =
  				(c00 + c10*x + c20*x**2 + c30*x**3)			// +
  			+	(c01 + c11*x + c21*x**2 + c31*x**3)*y 		// -
  			+	(c02 + c12*x + c22*x**2 + c32*x**3)*y**2 	// +
  			+	(c03 + c13*x + c23*x**2 + c33*x**3)*y**3;	// -
  
  		}
  
  		return output;
  
  	}*/
};
globalThis.Bicubic = Bicubic;

// src/Cubic/Tricubic.js
var Tricubic = class extends Evaluator {
  static degree = 3;
  static variables = 3;
  static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    if (!output)
      output = new values.constructor(64);
    const x0 = positions[0];
    const y0 = positions[1];
    const z0 = positions[2];
    const x1 = positions[3];
    const y1 = positions[4];
    const z1 = positions[5];
    const x2 = positions[6];
    const y2 = positions[7];
    const z2 = positions[8];
    const x3 = positions[9];
    const y3 = positions[10];
    const z3 = positions[11];
    const qX = new positions.constructor(4);
    const qY = new positions.constructor(4);
    const qZ = new positions.constructor(4);
    qX[0] = 1 / ((x0 - x1) * (x0 - x2) * (x0 - x3));
    qX[1] = 1 / ((x1 - x0) * (x1 - x2) * (x1 - x3));
    qX[2] = 1 / ((x2 - x0) * (x2 - x1) * (x2 - x3));
    qX[3] = 1 / ((x3 - x0) * (x3 - x1) * (x3 - x2));
    qY[0] = 1 / ((y0 - y1) * (y0 - y2) * (y0 - y3));
    qY[1] = 1 / ((y1 - y0) * (y1 - y2) * (y1 - y3));
    qY[2] = 1 / ((y2 - y0) * (y2 - y1) * (y2 - y3));
    qY[3] = 1 / ((y3 - y0) * (y3 - y1) * (y3 - y2));
    qZ[0] = 1 / ((z0 - z1) * (z0 - z2) * (z0 - z3));
    qZ[1] = 1 / ((z1 - z0) * (z1 - z2) * (z1 - z3));
    qZ[2] = 1 / ((z2 - z0) * (z2 - z1) * (z2 - z3));
    qZ[3] = 1 / ((z3 - z0) * (z3 - z1) * (z3 - z2));
    const x01 = x0 * x1;
    const x02 = x0 * x2;
    const x03 = x0 * x3;
    const x12 = x1 * x2;
    const x13 = x1 * x3;
    const x23 = x2 * x3;
    const y01 = y0 * y1;
    const y02 = y0 * y2;
    const y03 = y0 * y3;
    const y12 = y1 * y2;
    const y13 = y1 * y3;
    const y23 = y2 * y3;
    const z01 = z0 * z1;
    const z02 = z0 * z2;
    const z03 = z0 * z3;
    const z12 = z1 * z2;
    const z13 = z1 * z3;
    const z23 = z2 * z3;
    const hX = new Float32Array(16);
    const hY = new Float32Array(16);
    const hZ = new Float32Array(16);
    hX[0] = -x12 * x3;
    hX[1] = -x02 * x3;
    hX[2] = -x01 * x3;
    hX[3] = -x01 * x2;
    hX[4] = x12 + x13 + x23;
    hX[5] = x02 + x03 + x23;
    hX[6] = x01 + x03 + x13;
    hX[7] = x01 + x02 + x12;
    hX[8] = -(x1 + x2 + x3);
    hX[9] = -(x0 + x2 + x3);
    hX[10] = -(x0 + x1 + x3);
    hX[11] = -(x0 + x1 + x2);
    hX[12] = 1;
    hX[13] = 1;
    hX[14] = 1;
    hX[15] = 1;
    hY[0] = -y12 * y3;
    hY[1] = -y02 * y3;
    hY[2] = -y01 * y3;
    hY[3] = -y01 * y2;
    hY[4] = y12 + y13 + y23;
    hY[5] = y02 + y03 + y23;
    hY[6] = y01 + y03 + y13;
    hY[7] = y01 + y02 + y12;
    hY[8] = -(y1 + y2 + y3);
    hY[9] = -(y0 + y2 + y3);
    hY[10] = -(y0 + y1 + y3);
    hY[11] = -(y0 + y1 + y2);
    hY[12] = 1;
    hY[13] = 1;
    hY[14] = 1;
    hY[15] = 1;
    hZ[0] = -z12 * z3;
    hZ[1] = -z02 * z3;
    hZ[2] = -z01 * z3;
    hZ[3] = -z01 * z2;
    hZ[4] = z12 + z13 + z23;
    hZ[5] = z02 + z03 + z23;
    hZ[6] = z01 + z03 + z13;
    hZ[7] = z01 + z02 + z12;
    hZ[8] = -(z1 + z2 + z3);
    hZ[9] = -(z0 + z2 + z3);
    hZ[10] = -(z0 + z1 + z3);
    hZ[11] = -(z0 + z1 + z2);
    hZ[12] = 1;
    hZ[13] = 1;
    hZ[14] = 1;
    hZ[15] = 1;
    const r000 = qX[0] * qY[0] * qZ[0];
    const r100 = qX[1] * qY[0] * qZ[0];
    const r200 = qX[2] * qY[0] * qZ[0];
    const r300 = qX[3] * qY[0] * qZ[0];
    const r010 = qX[0] * qY[1] * qZ[0];
    const r110 = qX[1] * qY[1] * qZ[0];
    const r210 = qX[2] * qY[1] * qZ[0];
    const r310 = qX[3] * qY[1] * qZ[0];
    const r020 = qX[0] * qY[2] * qZ[0];
    const r120 = qX[1] * qY[2] * qZ[0];
    const r220 = qX[2] * qY[2] * qZ[0];
    const r320 = qX[3] * qY[2] * qZ[0];
    const r030 = qX[0] * qY[3] * qZ[0];
    const r130 = qX[1] * qY[3] * qZ[0];
    const r230 = qX[2] * qY[3] * qZ[0];
    const r330 = qX[3] * qY[3] * qZ[0];
    const r001 = qX[0] * qY[0] * qZ[1];
    const r101 = qX[1] * qY[0] * qZ[1];
    const r201 = qX[2] * qY[0] * qZ[1];
    const r301 = qX[3] * qY[0] * qZ[1];
    const r011 = qX[0] * qY[1] * qZ[1];
    const r111 = qX[1] * qY[1] * qZ[1];
    const r211 = qX[2] * qY[1] * qZ[1];
    const r311 = qX[3] * qY[1] * qZ[1];
    const r021 = qX[0] * qY[2] * qZ[1];
    const r121 = qX[1] * qY[2] * qZ[1];
    const r221 = qX[2] * qY[2] * qZ[1];
    const r321 = qX[3] * qY[2] * qZ[1];
    const r031 = qX[0] * qY[3] * qZ[1];
    const r131 = qX[1] * qY[3] * qZ[1];
    const r231 = qX[2] * qY[3] * qZ[1];
    const r331 = qX[3] * qY[3] * qZ[1];
    const r002 = qX[0] * qY[0] * qZ[2];
    const r102 = qX[1] * qY[0] * qZ[2];
    const r202 = qX[2] * qY[0] * qZ[2];
    const r302 = qX[3] * qY[0] * qZ[2];
    const r012 = qX[0] * qY[1] * qZ[2];
    const r112 = qX[1] * qY[1] * qZ[2];
    const r212 = qX[2] * qY[1] * qZ[2];
    const r312 = qX[3] * qY[1] * qZ[2];
    const r022 = qX[0] * qY[2] * qZ[2];
    const r122 = qX[1] * qY[2] * qZ[2];
    const r222 = qX[2] * qY[2] * qZ[2];
    const r322 = qX[3] * qY[2] * qZ[2];
    const r032 = qX[0] * qY[3] * qZ[2];
    const r132 = qX[1] * qY[3] * qZ[2];
    const r232 = qX[2] * qY[3] * qZ[2];
    const r332 = qX[3] * qY[3] * qZ[2];
    const r003 = qX[0] * qY[0] * qZ[3];
    const r103 = qX[1] * qY[0] * qZ[3];
    const r203 = qX[2] * qY[0] * qZ[3];
    const r303 = qX[3] * qY[0] * qZ[3];
    const r013 = qX[0] * qY[1] * qZ[3];
    const r113 = qX[1] * qY[1] * qZ[3];
    const r213 = qX[2] * qY[1] * qZ[3];
    const r313 = qX[3] * qY[1] * qZ[3];
    const r023 = qX[0] * qY[2] * qZ[3];
    const r123 = qX[1] * qY[2] * qZ[3];
    const r223 = qX[2] * qY[2] * qZ[3];
    const r323 = qX[3] * qY[2] * qZ[3];
    const r033 = qX[0] * qY[3] * qZ[3];
    const r133 = qX[1] * qY[3] * qZ[3];
    const r233 = qX[2] * qY[3] * qZ[3];
    const r333 = qX[3] * qY[3] * qZ[3];
    for (let i = 0, d = dimension, v = values; i < d; i++) {
      let k = i;
      const v000 = v[k] * r000;
      const v100 = v[k += d] * r100;
      const v200 = v[k += d] * r200;
      const v300 = v[k += d] * r300;
      const v010 = v[k += d] * r010;
      const v110 = v[k += d] * r110;
      const v210 = v[k += d] * r210;
      const v310 = v[k += d] * r310;
      const v020 = v[k += d] * r020;
      const v120 = v[k += d] * r120;
      const v220 = v[k += d] * r220;
      const v320 = v[k += d] * r320;
      const v030 = v[k += d] * r030;
      const v130 = v[k += d] * r130;
      const v230 = v[k += d] * r230;
      const v330 = v[k += d] * r330;
      const v001 = v[k += d] * r001;
      const v101 = v[k += d] * r101;
      const v201 = v[k += d] * r201;
      const v301 = v[k += d] * r301;
      const v011 = v[k += d] * r011;
      const v111 = v[k += d] * r111;
      const v211 = v[k += d] * r211;
      const v311 = v[k += d] * r311;
      const v021 = v[k += d] * r021;
      const v121 = v[k += d] * r121;
      const v221 = v[k += d] * r221;
      const v321 = v[k += d] * r321;
      const v031 = v[k += d] * r031;
      const v131 = v[k += d] * r131;
      const v231 = v[k += d] * r231;
      const v331 = v[k += d] * r331;
      const v002 = v[k += d] * r002;
      const v102 = v[k += d] * r102;
      const v202 = v[k += d] * r202;
      const v302 = v[k += d] * r302;
      const v012 = v[k += d] * r012;
      const v112 = v[k += d] * r112;
      const v212 = v[k += d] * r212;
      const v312 = v[k += d] * r312;
      const v022 = v[k += d] * r022;
      const v122 = v[k += d] * r122;
      const v222 = v[k += d] * r222;
      const v322 = v[k += d] * r322;
      const v032 = v[k += d] * r032;
      const v132 = v[k += d] * r132;
      const v232 = v[k += d] * r232;
      const v332 = v[k += d] * r332;
      const v003 = v[k += d] * r003;
      const v103 = v[k += d] * r103;
      const v203 = v[k += d] * r203;
      const v303 = v[k += d] * r303;
      const v013 = v[k += d] * r013;
      const v113 = v[k += d] * r113;
      const v213 = v[k += d] * r213;
      const v313 = v[k += d] * r313;
      const v023 = v[k += d] * r023;
      const v123 = v[k += d] * r123;
      const v223 = v[k += d] * r223;
      const v323 = v[k += d] * r323;
      const v033 = v[k += d] * r033;
      const v133 = v[k += d] * r133;
      const v233 = v[k += d] * r233;
      const v333 = v[k += d] * r333;
      for (let j = 0, indexZ = 0, index = 0; j < 4; j++) {
        const hZ0 = hZ[indexZ++];
        const hZ1 = hZ[indexZ++];
        const hZ2 = hZ[indexZ++];
        const hZ3 = hZ[indexZ++];
        for (let q = 0, indexY = 0; q < 4; q++) {
          const hY0 = hY[indexY++];
          const hY1 = hY[indexY++];
          const hY2 = hY[indexY++];
          const hY3 = hY[indexY++];
          for (let l = 0, indexX = 0; l < 4; l++) {
            const hX0 = hX[indexX++];
            const hX1 = hX[indexX++];
            const hX2 = hX[indexX++];
            const hX3 = hX[indexX++];
            output[outputOffset + 64 * i + index++] = hZ0 * (hY0 * (hX0 * v000 + hX1 * v100 + hX2 * v200 + hX3 * v300) + hY1 * (hX0 * v010 + hX1 * v110 + hX2 * v210 + hX3 * v310) + hY2 * (hX0 * v020 + hX1 * v120 + hX2 * v220 + hX3 * v320) + hY3 * (hX0 * v030 + hX1 * v130 + hX2 * v230 + hX3 * v330)) + hZ1 * (hY0 * (hX0 * v001 + hX1 * v101 + hX2 * v201 + hX3 * v301) + hY1 * (hX0 * v011 + hX1 * v111 + hX2 * v211 + hX3 * v311) + hY2 * (hX0 * v021 + hX1 * v121 + hX2 * v221 + hX3 * v321) + hY3 * (hX0 * v031 + hX1 * v131 + hX2 * v231 + hX3 * v331)) + hZ2 * (hY0 * (hX0 * v002 + hX1 * v102 + hX2 * v202 + hX3 * v302) + hY1 * (hX0 * v012 + hX1 * v112 + hX2 * v212 + hX3 * v312) + hY2 * (hX0 * v022 + hX1 * v122 + hX2 * v222 + hX3 * v322) + hY3 * (hX0 * v032 + hX1 * v132 + hX2 * v232 + hX3 * v332)) + hZ3 * (hY0 * (hX0 * v003 + hX1 * v103 + hX2 * v203 + hX3 * v303) + hY1 * (hX0 * v013 + hX1 * v113 + hX2 * v213 + hX3 * v313) + hY2 * (hX0 * v023 + hX1 * v123 + hX2 * v223 + hX3 * v323) + hY3 * (hX0 * v033 + hX1 * v133 + hX2 * v233 + hX3 * v333));
          }
        }
      }
    }
    return output;
  }
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
    this.validateInput(positions, values, dimension);
    output = !output ? new values.constructor(dimension) : output;
    const x = position[0];
    const y = position[1];
    const z = position[2];
    const x0 = positions[0];
    const y0 = positions[1];
    const z0 = positions[2];
    const x1 = positions[3];
    const y1 = positions[4];
    const z1 = positions[5];
    const x2 = positions[6];
    const y2 = positions[7];
    const z2 = positions[8];
    const x3 = positions[9];
    const y3 = positions[10];
    const z3 = positions[11];
    const rX0 = (x - x1) * (x - x2) * (x - x3) / ((x0 - x1) * (x0 - x2) * (x0 - x3));
    const rX1 = (x - x0) * (x - x2) * (x - x3) / ((x1 - x0) * (x1 - x2) * (x1 - x3));
    const rX2 = (x - x0) * (x - x1) * (x - x3) / ((x2 - x0) * (x2 - x1) * (x2 - x3));
    const rX3 = (x - x0) * (x - x1) * (x - x2) / ((x3 - x0) * (x3 - x1) * (x3 - x2));
    const rY0 = (y - y1) * (y - y2) * (y - y3) / ((y0 - y1) * (y0 - y2) * (y0 - y3));
    const rY1 = (y - y0) * (y - y2) * (y - y3) / ((y1 - y0) * (y1 - y2) * (y1 - y3));
    const rY2 = (y - y0) * (y - y1) * (y - y3) / ((y2 - y0) * (y2 - y1) * (y2 - y3));
    const rY3 = (y - y0) * (y - y1) * (y - y2) / ((y3 - y0) * (y3 - y1) * (y3 - y2));
    const rZ0 = (z - z1) * (z - z2) * (z - z3) / ((z0 - z1) * (z0 - z2) * (z0 - z3));
    const rZ1 = (z - z0) * (z - z2) * (z - z3) / ((z1 - z0) * (z1 - z2) * (z1 - z3));
    const rZ2 = (z - z0) * (z - z1) * (z - z3) / ((z2 - z0) * (z2 - z1) * (z2 - z3));
    const rZ3 = (z - z0) * (z - z1) * (z - z2) / ((z3 - z0) * (z3 - z1) * (z3 - z2));
    const d = dimension;
    for (let i = 0; i < d; i++) {
      let k = i;
      const v000 = values[k];
      const v100 = values[k += d];
      const v200 = values[k += d];
      const v300 = values[k += d];
      const v010 = values[k += d];
      const v110 = values[k += d];
      const v210 = values[k += d];
      const v310 = values[k += d];
      const v020 = values[k += d];
      const v120 = values[k += d];
      const v220 = values[k += d];
      const v320 = values[k += d];
      const v030 = values[k += d];
      const v130 = values[k += d];
      const v230 = values[k += d];
      const v330 = values[k += d];
      const v001 = values[k += d];
      const v101 = values[k += d];
      const v201 = values[k += d];
      const v301 = values[k += d];
      const v011 = values[k += d];
      const v111 = values[k += d];
      const v211 = values[k += d];
      const v311 = values[k += d];
      const v021 = values[k += d];
      const v121 = values[k += d];
      const v221 = values[k += d];
      const v321 = values[k += d];
      const v031 = values[k += d];
      const v131 = values[k += d];
      const v231 = values[k += d];
      const v331 = values[k += d];
      const v002 = values[k += d];
      const v102 = values[k += d];
      const v202 = values[k += d];
      const v302 = values[k += d];
      const v012 = values[k += d];
      const v112 = values[k += d];
      const v212 = values[k += d];
      const v312 = values[k += d];
      const v022 = values[k += d];
      const v122 = values[k += d];
      const v222 = values[k += d];
      const v322 = values[k += d];
      const v032 = values[k += d];
      const v132 = values[k += d];
      const v232 = values[k += d];
      const v332 = values[k += d];
      const v003 = values[k += d];
      const v103 = values[k += d];
      const v203 = values[k += d];
      const v303 = values[k += d];
      const v013 = values[k += d];
      const v113 = values[k += d];
      const v213 = values[k += d];
      const v313 = values[k += d];
      const v023 = values[k += d];
      const v123 = values[k += d];
      const v223 = values[k += d];
      const v323 = values[k += d];
      const v033 = values[k += d];
      const v133 = values[k += d];
      const v233 = values[k += d];
      const v333 = values[k += d];
      const v00 = v000 * rX0 + v100 * rX1 + v200 * rX2 + v300 * rX3;
      const v10 = v010 * rX0 + v110 * rX1 + v210 * rX2 + v310 * rX3;
      const v20 = v020 * rX0 + v120 * rX1 + v220 * rX2 + v320 * rX3;
      const v30 = v030 * rX0 + v130 * rX1 + v230 * rX2 + v330 * rX3;
      const v01 = v001 * rX0 + v101 * rX1 + v201 * rX2 + v301 * rX3;
      const v11 = v011 * rX0 + v111 * rX1 + v211 * rX2 + v311 * rX3;
      const v21 = v021 * rX0 + v121 * rX1 + v221 * rX2 + v321 * rX3;
      const v31 = v031 * rX0 + v131 * rX1 + v231 * rX2 + v331 * rX3;
      const v02 = v002 * rX0 + v102 * rX1 + v202 * rX2 + v302 * rX3;
      const v12 = v012 * rX0 + v112 * rX1 + v212 * rX2 + v312 * rX3;
      const v22 = v022 * rX0 + v122 * rX1 + v222 * rX2 + v322 * rX3;
      const v32 = v032 * rX0 + v132 * rX1 + v232 * rX2 + v332 * rX3;
      const v03 = v003 * rX0 + v103 * rX1 + v203 * rX2 + v303 * rX3;
      const v13 = v013 * rX0 + v113 * rX1 + v213 * rX2 + v313 * rX3;
      const v23 = v023 * rX0 + v123 * rX1 + v223 * rX2 + v323 * rX3;
      const v33 = v033 * rX0 + v133 * rX1 + v233 * rX2 + v333 * rX3;
      const v0 = v00 * rY0 + v10 * rY1 + v20 * rY2 + v30 * rY3;
      const v1 = v01 * rY0 + v11 * rY1 + v21 * rY2 + v31 * rY3;
      const v2 = v02 * rY0 + v12 * rY1 + v22 * rY2 + v32 * rY3;
      const v3 = v03 * rY0 + v13 * rY1 + v23 * rY2 + v33 * rY3;
      output[outputOffset + i] = v0 * rZ0 + v1 * rZ1 + v2 * rZ2 + v3 * rZ3;
    }
    if (dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  constructor(positions, values, dimension) {
    super(positions, values, dimension);
  }
};
globalThis.Tricubic = Tricubic;

// src/Simplex/SimplexLinear.js
var EPSILON = 1e-12;
var SimplexLinear = class {
  static inferVariables(positions) {
    validateArrayLike(positions, "positions");
    const variables = (Math.sqrt(1 + 4 * positions.length) - 1) / 2;
    if (!Number.isInteger(variables) || variables < 1) {
      throw new RangeError(
        `SimplexLinear positions length must be n * (n + 1), received ${positions.length}.`
      );
    }
    return variables;
  }
  static validateInput(positions, values, dimension = 1, variables = this.inferVariables(positions)) {
    validateDimension(dimension);
    validateArrayLike(positions, "positions");
    validateArrayLike(values, "values");
    validateFiniteValues(positions, "positions");
    validateFiniteValues(values, "values");
    const expectedPositions = variables * (variables + 1);
    const expectedValues = (variables + 1) * dimension;
    if (positions.length !== expectedPositions) {
      throw new RangeError(
        `SimplexLinear expects ${expectedPositions} position values for ${variables} variables, received ${positions.length}.`
      );
    }
    if (values.length !== expectedValues) {
      throw new RangeError(
        `SimplexLinear expects ${expectedValues} values for dimension ${dimension}, received ${values.length}.`
      );
    }
  }
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0, variables = this.inferVariables(positions)) {
    const simplex = new this(positions, values, dimension, variables);
    return simplex.evaluate(position, 0, output, outputOffset);
  }
  constructor(positions, values, dimension = 1, variables = this.constructor.inferVariables(positions)) {
    this.constructor.validateInput(positions, values, dimension, variables);
    this.positions = positions;
    this.values = values;
    this.dimension = dimension;
    this.variables = variables;
    this.transform = invertSimplexTransform(positions, variables);
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    validateSamplePosition(position, this.variables);
    const outputNotProvided = !output;
    if (!output)
      output = new this.values.constructor(this.dimension);
    const weights = this.getWeights(position, inputOffset);
    for (let i = 0; i < this.dimension; i++) {
      let value = weights[0] * this.values[i];
      for (let vertex = 1; vertex <= this.variables; vertex++) {
        value += weights[vertex] * this.values[vertex * this.dimension + i];
      }
      output[outputOffset + i] = value;
    }
    if (outputNotProvided && this.dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  getWeights(position, inputOffset = 0, output = new this.positions.constructor(this.variables + 1)) {
    const variables = this.variables;
    let sum = 0;
    for (let edge = 0; edge < variables; edge++) {
      let weight = 0;
      for (let variable = 0; variable < variables; variable++) {
        const p0 = this.positions[variable];
        const p = typeof position === "number" ? position : position[inputOffset + variable];
        weight += this.transform[edge * variables + variable] * (p - p0);
      }
      output[edge + 1] = weight;
      sum += weight;
    }
    output[0] = 1 - sum;
    return output;
  }
  contains(position, epsilon = EPSILON) {
    const weights = this.getWeights(position);
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] < -epsilon || weights[i] > 1 + epsilon)
        return false;
    }
    return true;
  }
  map(positions, handler) {
    validateSamplePositions(positions, this.variables);
    const sampleCount = positions.length / this.variables;
    const input = new this.positions.constructor(this.variables);
    let output;
    if (handler)
      output = new this.values.constructor(this.dimension);
    else
      output = new this.values.constructor(sampleCount * this.dimension);
    for (let i = 0, index = 0; i < positions.length; i += this.variables, index++) {
      for (let j = 0; j < this.variables; j++)
        input[j] = positions[i + j];
      if (handler) {
        handler(this.variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
      } else {
        this.evaluate(input, 0, output, index * this.dimension);
      }
    }
    return handler ? this : output;
  }
  mapAsync(positions, options) {
    return Promise.resolve(this.map(positions, options?.handler));
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
};
var TriangleLinear = class extends SimplexLinear {
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension, 2);
  }
};
var TetrahedralLinear = class extends SimplexLinear {
  constructor(positions, values, dimension = 1) {
    super(positions, values, dimension, 3);
  }
};
function invertSimplexTransform(positions, variables) {
  const width = variables * 2;
  const matrix = new Array(variables * width).fill(0);
  for (let row = 0; row < variables; row++) {
    for (let column = 0; column < variables; column++) {
      matrix[row * width + column] = positions[(column + 1) * variables + row] - positions[row];
    }
    matrix[row * width + variables + row] = 1;
  }
  for (let column = 0; column < variables; column++) {
    let pivotRow = column;
    let pivotSize = Math.abs(matrix[pivotRow * width + column]);
    for (let row = column + 1; row < variables; row++) {
      const size = Math.abs(matrix[row * width + column]);
      if (size > pivotSize) {
        pivotRow = row;
        pivotSize = size;
      }
    }
    if (pivotSize <= EPSILON) {
      throw new RangeError("SimplexLinear positions must form a non-degenerate simplex.");
    }
    if (pivotRow !== column) {
      for (let i = 0; i < width; i++) {
        const a = column * width + i;
        const b = pivotRow * width + i;
        const value = matrix[a];
        matrix[a] = matrix[b];
        matrix[b] = value;
      }
    }
    const pivot = matrix[column * width + column];
    for (let i = 0; i < width; i++)
      matrix[column * width + i] /= pivot;
    for (let row = 0; row < variables; row++) {
      if (row === column)
        continue;
      const factor = matrix[row * width + column];
      for (let i = 0; i < width; i++) {
        matrix[row * width + i] -= factor * matrix[column * width + i];
      }
    }
  }
  const output = new positions.constructor(variables * variables);
  for (let row = 0; row < variables; row++) {
    for (let column = 0; column < variables; column++) {
      output[row * variables + column] = matrix[row * width + variables + column];
    }
  }
  return output;
}
globalThis.SimplexLinear = SimplexLinear;
globalThis.TriangleLinear = TriangleLinear;
globalThis.TetrahedralLinear = TetrahedralLinear;

// src/MeshParallel.js
var NODE_WORKER_THREADS2 = ["node", "worker_threads"].join(":");
var NODE_OS2 = ["node", "os"].join(":");
var DEFAULT_WORK_UNIT_THRESHOLD2 = 5e4;
var DEFAULT_MAX_AUTO_WORKERS2 = 4;
var workerThreads2;
var nodeOs2;
var nextMeshId = 1;
var nextTaskId2 = 1;
var meshIds = /* @__PURE__ */ new WeakMap();
var pools2 = /* @__PURE__ */ new Map();
async function getWorkerThreads2() {
  if (typeof process === "undefined" || !process.versions?.node)
    return null;
  if (workerThreads2 === void 0) {
    try {
      workerThreads2 = await import(NODE_WORKER_THREADS2);
    } catch (error) {
      workerThreads2 = null;
    }
  }
  return workerThreads2;
}
async function getWorkerConstructor2() {
  const workerThreads3 = await getWorkerThreads2();
  if (workerThreads3)
    return { Worker: workerThreads3.Worker, type: "node" };
  if (typeof Worker !== "undefined")
    return { Worker, type: "browser" };
  return null;
}
async function getNodeOs2() {
  if (typeof process === "undefined" || !process.versions?.node)
    return null;
  if (nodeOs2 === void 0) {
    try {
      nodeOs2 = await import(NODE_OS2);
    } catch (error) {
      nodeOs2 = null;
    }
  }
  return nodeOs2;
}
async function getDefaultWorkerCount2() {
  const os = await getNodeOs2();
  const cpus = os?.availableParallelism?.() || globalThis.navigator?.hardwareConcurrency || 2;
  return Math.max(1, cpus - 1);
}
function getMeshId(mesh) {
  if (!meshIds.has(mesh))
    meshIds.set(mesh, nextMeshId++);
  return meshIds.get(mesh);
}
function getMeshKey(mesh) {
  return `${getMeshId(mesh)}:${mesh.cells.length}:${mesh.indexMode}:${mesh.resolution || "auto"}:${mesh.blending}`;
}
function getParallelPlan2(mesh, sampleCount, options = {}, maxWorkers = 1) {
  const workUnits = sampleCount * Math.max(1, mesh.cells.length);
  const threshold = options.threshold ?? DEFAULT_WORK_UNIT_THRESHOLD2;
  const usesExplicitThreshold = options.threshold !== void 0;
  const meetsThreshold = usesExplicitThreshold ? sampleCount >= threshold : workUnits >= threshold;
  if (!meetsThreshold)
    return { workers: 1, workUnits, parallel: false };
  if (options.workers !== void 0) {
    const workers2 = Math.min(Math.max(1, options.workers), sampleCount, maxWorkers);
    return { workers: workers2, workUnits, parallel: workers2 > 1 };
  }
  const cappedMaxWorkers = Math.min(maxWorkers, DEFAULT_MAX_AUTO_WORKERS2);
  const workers = Math.min(
    Math.max(2, Math.ceil(workUnits / DEFAULT_WORK_UNIT_THRESHOLD2)),
    sampleCount,
    cappedMaxWorkers
  );
  return { workers, workUnits, parallel: workers > 1 };
}
function getArraySlice2(values, start, end) {
  if (typeof values.slice === "function")
    return values.slice(start, end);
  const output = new values.constructor(end - start);
  for (let i = start; i < end; i++)
    output[i - start] = values[i];
  return output;
}
function copyChunk2(output, chunk, offset) {
  for (let i = 0; i < chunk.length; i++)
    output[offset + i] = chunk[i];
}
function isTypedArray2(values) {
  return ArrayBuffer.isView(values) && !(values instanceof DataView);
}
function getTransferList2(task) {
  if (!isTypedArray2(task.positions))
    return void 0;
  if (typeof SharedArrayBuffer !== "undefined" && task.positions.buffer instanceof SharedArrayBuffer)
    return void 0;
  return [task.positions.buffer];
}
function serializeMesh(mesh, key) {
  const cells = mesh.cells.map((cell) => serializeCell(cell));
  if (!cells.every(Boolean))
    return null;
  return {
    blending: mesh.blending,
    cells,
    dimension: mesh.dimension,
    index: mesh.indexMode,
    key,
    resolution: mesh.resolution,
    variables: mesh.variables
  };
}
function serializeCell(cell) {
  if (cell.hasCustomContains || cell.hasCustomWeight)
    return null;
  const interpolator = cell.interpolator;
  const name = interpolator.constructor?.name;
  if (name !== "SimplexLinear" && name !== "TriangleLinear" && name !== "TetrahedralLinear")
    return null;
  return {
    bounds: cell.bounds,
    dimension: interpolator.dimension,
    positions: interpolator.positions,
    type: name,
    values: interpolator.values,
    variables: interpolator.variables
  };
}
var WorkerPool2 = class {
  constructor(workerConstructor, size, idleTimeout, workerUrl) {
    this.Worker = workerConstructor.Worker;
    this.workerType = workerConstructor.type;
    this.size = size;
    this.idleTimeout = idleTimeout;
    this.workerUrl = workerUrl;
    this.queue = [];
    this.workers = [];
    this.activeTasks = 0;
    this.idleTimer = null;
  }
  run(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.drain();
    });
  }
  drain() {
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
    while (this.queue.length > 0) {
      const worker = this.getIdleWorker();
      if (!worker)
        return;
      this.runOnWorker(worker, this.queue.shift());
    }
    this.scheduleIdleTermination();
  }
  getIdleWorker() {
    let worker = this.workers.find((item) => !item.busy);
    if (worker)
      return worker;
    if (this.workers.length >= this.size)
      return null;
    worker = this.createWorker();
    this.workers.push(worker);
    return worker;
  }
  createWorker() {
    const workerUrl = this.workerUrl || getWorkerUrl2(this.workerType);
    if (!workerUrl)
      throw new Error("Unable to resolve mesh worker URL.");
    const worker = new this.Worker(workerUrl, { type: "module" });
    const entry = {
      worker,
      busy: false,
      cache: /* @__PURE__ */ new Set(),
      current: null
    };
    if (typeof worker.on === "function") {
      worker.on("message", (message) => this.handleMessage(entry, message));
      worker.on("error", (error) => this.handleError(entry, error));
      worker.on("exit", (code) => this.handleExit(entry, code));
    } else {
      worker.addEventListener("message", (event) => this.handleMessage(entry, event.data));
      worker.addEventListener("error", (error) => this.handleError(entry, error));
      worker.addEventListener("messageerror", (error) => this.handleError(entry, error));
    }
    return entry;
  }
  runOnWorker(worker, job) {
    const message = { ...job.task };
    if (message.config && worker.cache.has(message.config.key)) {
      delete message.config;
    } else if (message.config) {
      worker.cache.add(message.config.key);
    }
    worker.busy = true;
    worker.current = job;
    this.activeTasks++;
    worker.worker.postMessage(message, getTransferList2(message));
  }
  handleMessage(worker, message) {
    const job = worker.current;
    worker.busy = false;
    worker.current = null;
    this.activeTasks--;
    if (!job)
      return;
    if (message.error)
      job.reject(new Error(message.error));
    else
      job.resolve(message);
    this.drain();
  }
  handleError(worker, error) {
    this.rejectCurrent(worker, error);
    this.removeWorker(worker);
    this.drain();
  }
  handleExit(worker, code) {
    if (code !== 0)
      this.rejectCurrent(worker, new Error(`Mesh worker stopped with exit code ${code}.`));
    this.removeWorker(worker);
    this.drain();
  }
  rejectCurrent(worker, error) {
    if (worker.current) {
      worker.current.reject(error);
      worker.current = null;
      this.activeTasks--;
    }
    worker.busy = false;
  }
  removeWorker(worker) {
    const index = this.workers.indexOf(worker);
    if (index !== -1)
      this.workers.splice(index, 1);
  }
  scheduleIdleTermination() {
    if (this.activeTasks > 0 || this.queue.length > 0 || this.workers.length === 0)
      return;
    if (this.idleTimeout === Number.POSITIVE_INFINITY)
      return;
    this.idleTimer = setTimeout(() => this.terminate(), this.idleTimeout);
  }
  terminate() {
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
    for (const worker of this.workers) {
      worker.current?.reject(new Error("Mesh worker pool terminated."));
      worker.worker.terminate();
    }
    this.workers.length = 0;
    this.queue.length = 0;
    this.activeTasks = 0;
  }
};
function getWorkerUrl2(workerType) {
  if (workerType === "browser") {
    const baseUrl = globalThis.document?.currentScript?.src || import.meta.url;
    if (!baseUrl)
      return null;
    return new URL("./Numfit.mesh.worker.js", baseUrl);
  }
  return new URL("./MeshWorker.js", import.meta.url);
}
function getPool2(workerConstructor, workers, idleTimeout, workerUrl) {
  const key = `${workerConstructor.type}:mesh:${workers}:${idleTimeout}:${workerUrl || ""}`;
  let pool = pools2.get(key);
  if (!pool) {
    pool = new WorkerPool2(workerConstructor, workers, idleTimeout, workerUrl);
    pools2.set(key, pool);
  }
  return pool;
}
async function mapMeshInWorkers(mesh, positions, options = {}) {
  validateSamplePositions(positions, mesh.variables);
  const sampleCount = positions.length / mesh.variables;
  const workerConstructor = await getWorkerConstructor2();
  if (!workerConstructor)
    return mesh.map(positions);
  const plan = getParallelPlan2(mesh, sampleCount, options, await getDefaultWorkerCount2());
  const workers = plan.workers;
  if (!plan.parallel)
    return mesh.map(positions);
  const key = getMeshKey(mesh);
  const config = serializeMesh(mesh, key);
  if (!config)
    return mesh.map(positions);
  const idleTimeout = options.idleTimeout ?? 1e3;
  const pool = getPool2(workerConstructor, workers, idleTimeout, options.meshWorkerUrl);
  const chunkSize = Math.ceil(sampleCount / workers);
  const tasks = [];
  for (let i = 0; i < workers; i++) {
    const sampleStart = i * chunkSize;
    const sampleEnd = Math.min(sampleCount, sampleStart + chunkSize);
    if (sampleStart >= sampleEnd)
      continue;
    const positionStart = sampleStart * mesh.variables;
    const positionEnd = sampleEnd * mesh.variables;
    tasks.push(pool.run({
      id: nextTaskId2++,
      key,
      config,
      positions: getArraySlice2(positions, positionStart, positionEnd),
      outputOffset: sampleStart * mesh.dimension
    }));
  }
  const chunks = await Promise.all(tasks);
  const output = new mesh.values.constructor(sampleCount * mesh.dimension);
  for (const chunk of chunks)
    copyChunk2(output, chunk.values, chunk.outputOffset);
  return output;
}

// src/Mesh/InterpolationMesh.js
var EPSILON2 = 1e-12;
var InterpolationMesh = class {
  static fromIntervals(options = {}) {
    const {
      type,
      positions,
      values,
      derivatives,
      secondDerivatives,
      dimension = 1,
      ...meshOptions
    } = options;
    if (typeof type !== "function")
      throw new TypeError("fromIntervals requires an interpolator type.");
    validateIntervalInput(positions, values, derivatives, dimension, type);
    validateSecondDerivativeInput(positions, values, secondDerivatives, dimension);
    const inferredDerivatives = isDerivativeMode(derivatives) ? inferIntervalDerivatives(positions, values, dimension, derivatives) : derivatives;
    const inferredSecondDerivatives = isSecondDerivativeMode(secondDerivatives) ? inferIntervalSecondDerivatives(positions, values, dimension, secondDerivatives) : secondDerivatives;
    const cells = [];
    const PositionType = positions.constructor;
    const ValueType = values.constructor;
    for (let interval = 0; interval < positions.length - 1; interval++) {
      const intervalPositions = new PositionType(2);
      const intervalValues = new ValueType(dimension * 2);
      intervalPositions[0] = positions[interval];
      intervalPositions[1] = positions[interval + 1];
      for (let i = 0; i < dimension; i++) {
        intervalValues[i] = values[interval * dimension + i];
        intervalValues[dimension + i] = values[(interval + 1) * dimension + i];
      }
      if (inferredDerivatives !== void 0) {
        const DerivativeType = inferredDerivatives.constructor;
        const intervalDerivatives = new DerivativeType(dimension * 2);
        for (let i = 0; i < dimension; i++) {
          intervalDerivatives[i] = inferredDerivatives[interval * dimension + i];
          intervalDerivatives[dimension + i] = inferredDerivatives[(interval + 1) * dimension + i];
        }
        if (inferredSecondDerivatives !== void 0) {
          const SecondDerivativeType = inferredSecondDerivatives.constructor;
          const intervalSecondDerivatives = new SecondDerivativeType(dimension * 2);
          for (let i = 0; i < dimension; i++) {
            intervalSecondDerivatives[i] = inferredSecondDerivatives[interval * dimension + i];
            intervalSecondDerivatives[dimension + i] = inferredSecondDerivatives[(interval + 1) * dimension + i];
          }
          cells.push(new type(
            intervalPositions,
            intervalValues,
            intervalDerivatives,
            intervalSecondDerivatives,
            dimension
          ));
        } else {
          cells.push(new type(
            intervalPositions,
            intervalValues,
            intervalDerivatives,
            dimension
          ));
        }
      } else {
        cells.push(new type(
          intervalPositions,
          intervalValues,
          dimension
        ));
      }
    }
    return new this(cells, meshOptions);
  }
  static fromTriangles(positions, values, indices, options = {}) {
    return this.fromSimplexes(positions, values, indices, {
      ...options,
      cellSize: 3,
      variables: 2,
      type: TriangleLinear
    });
  }
  static fromTetrahedra(positions, values, indices, options = {}) {
    return this.fromSimplexes(positions, values, indices, {
      ...options,
      cellSize: 4,
      variables: 3,
      type: TetrahedralLinear
    });
  }
  static fromSimplexes(positions, values, indices, options = {}) {
    const {
      cellSize,
      dimension = 1,
      type = void 0,
      variables = cellSize - 1,
      ...meshOptions
    } = options;
    if (!Number.isInteger(cellSize) || cellSize < 2) {
      throw new RangeError("cellSize must be an integer greater than or equal to 2.");
    }
    validateIndexedMeshInput(positions, values, indices, variables, dimension, cellSize);
    const CellType = type || SimplexLinear;
    const cells = [];
    for (let i = 0; i < indices.length; i += cellSize) {
      const cellPositions = new positions.constructor(cellSize * variables);
      const cellValues = new values.constructor(cellSize * dimension);
      for (let vertex = 0; vertex < cellSize; vertex++) {
        const source = indices[i + vertex];
        for (let variable = 0; variable < variables; variable++) {
          cellPositions[vertex * variables + variable] = positions[source * variables + variable];
        }
        for (let component = 0; component < dimension; component++) {
          cellValues[vertex * dimension + component] = values[source * dimension + component];
        }
      }
      cells.push(new CellType(cellPositions, cellValues, dimension, variables));
    }
    return new this(cells, meshOptions);
  }
  constructor(cells = [], options = {}) {
    this.cells = [];
    this.variables = void 0;
    this.dimension = void 0;
    this.values = void 0;
    this.blending = options.blending || "first";
    this.indexMode = options.index || "none";
    this.resolution = options.resolution;
    this.index = null;
    for (const cell of cells)
      this.add(cell);
    this.rebuildIndex();
  }
  add(cell) {
    const entry = createCellEntry(cell);
    const interpolator = entry.interpolator;
    const variables = getInterpolatorVariables(interpolator);
    const dimension = interpolator.dimension;
    if (!Number.isInteger(variables) || variables < 1) {
      throw new TypeError("Mesh interpolators must expose a positive variable count.");
    }
    if (!Number.isInteger(dimension) || dimension < 1) {
      throw new TypeError("Mesh interpolators must expose a positive dimension.");
    }
    if (this.variables === void 0) {
      this.variables = variables;
      this.dimension = dimension;
      this.values = interpolator.values;
    } else {
      if (variables !== this.variables) {
        throw new RangeError(`Mesh cell variables must match ${this.variables}, received ${variables}.`);
      }
      if (dimension !== this.dimension) {
        throw new RangeError(`Mesh cell dimension must match ${this.dimension}, received ${dimension}.`);
      }
    }
    this.cells.push(entry);
    this.index = null;
    return this;
  }
  rebuildIndex() {
    if (this.cells.length === 0)
      return this;
    if (this.indexMode === "none" || this.indexMode === false) {
      this.index = null;
      return this;
    }
    if (this.indexMode !== "grid") {
      throw new RangeError(`Unsupported mesh index mode "${this.indexMode}".`);
    }
    this.index = createGridIndex(this.cells, this.variables, this.resolution);
    return this;
  }
  find(position) {
    this.validateReady();
    validateSamplePosition(position, this.variables);
    for (const cell of this.getCandidates(position)) {
      if (cell.contains(position))
        return cell;
    }
    return null;
  }
  getCandidates(position) {
    if (!this.index && this.indexMode === "grid")
      this.rebuildIndex();
    if (this.index)
      return queryGridIndex(this.index, position);
    return this.cells;
  }
  contains(position) {
    return this.find(position) !== null;
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    this.validateReady();
    validateSamplePosition(position, this.variables);
    const cell = this.find(position);
    if (!cell)
      throw new RangeError("Position is outside the interpolation mesh.");
    const outputNotProvided = !output;
    if (!output)
      output = new this.values.constructor(this.dimension);
    if (this.blending === "weighted") {
      this.evaluateWeighted(position, inputOffset, output, outputOffset);
    } else {
      cell.interpolator.evaluate(position, inputOffset, output, outputOffset);
    }
    if (outputNotProvided && this.dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  evaluateWeighted(position, inputOffset, output, outputOffset) {
    const scratch = new this.values.constructor(this.dimension);
    let totalWeight = 0;
    for (let i = 0; i < this.dimension; i++)
      output[outputOffset + i] = 0;
    for (const cell of this.getCandidates(position)) {
      if (!cell.contains(position))
        continue;
      const weight = cell.weight(position);
      if (weight <= 0)
        continue;
      if (!Number.isFinite(weight))
        throw new RangeError("Mesh cell weights must be finite numbers.");
      cell.interpolator.evaluate(position, inputOffset, scratch, 0);
      for (let i = 0; i < this.dimension; i++) {
        output[outputOffset + i] += scratch[i] * weight;
      }
      totalWeight += weight;
    }
    if (totalWeight <= 0) {
      throw new RangeError("Position is outside the weighted interpolation mesh.");
    }
    for (let i = 0; i < this.dimension; i++)
      output[outputOffset + i] /= totalWeight;
  }
  map(positions, handler) {
    this.validateReady();
    validateSamplePositions(positions, this.variables);
    const sampleCount = positions.length / this.variables;
    const input = new this.values.constructor(this.variables);
    let output;
    if (handler)
      output = new this.values.constructor(this.dimension);
    else
      output = new this.values.constructor(sampleCount * this.dimension);
    for (let i = 0, index = 0; i < positions.length; i += this.variables, index++) {
      for (let j = 0; j < this.variables; j++)
        input[j] = positions[i + j];
      if (handler) {
        handler(this.variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
      } else {
        this.evaluate(input, 0, output, index * this.dimension);
      }
    }
    return handler ? this : output;
  }
  mapAsync(positions, options) {
    if (options?.handler)
      return Promise.resolve(this.map(positions, options.handler));
    return mapMeshInWorkers(this, positions, options);
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
  validateReady() {
    if (this.cells.length === 0)
      throw new RangeError("InterpolationMesh requires at least one cell.");
    if (this.blending !== "first" && this.blending !== "weighted") {
      throw new RangeError(`Unsupported mesh blending mode "${this.blending}".`);
    }
    if (this.indexMode !== "none" && this.indexMode !== false && this.indexMode !== "grid") {
      throw new RangeError(`Unsupported mesh index mode "${this.indexMode}".`);
    }
  }
};
var Mesh = InterpolationMesh;
var Spline = InterpolationMesh;
function createCellEntry(cell) {
  const interpolator = cell?.interpolator || cell;
  if (!interpolator || typeof interpolator.evaluate !== "function") {
    throw new TypeError("Mesh cells must be interpolators or objects with an interpolator.");
  }
  const bounds = cell?.bounds || createBounds(interpolator);
  const hasCustomContains = cell?.interpolator && typeof cell.contains === "function";
  const hasCustomWeight = cell?.interpolator && typeof cell.weight === "function";
  const contains = hasCustomContains ? cell.contains : typeof interpolator.contains === "function" ? (position) => interpolator.contains(position) : createHyperboxContains(bounds);
  const weight = hasCustomWeight ? cell.weight : () => 1;
  return {
    ...cell,
    interpolator,
    bounds,
    contains,
    hasCustomContains,
    hasCustomWeight,
    weight
  };
}
function getInterpolatorVariables(interpolator) {
  if (Number.isInteger(interpolator.variables))
    return interpolator.variables;
  if (Number.isInteger(interpolator.constructor?.variables))
    return interpolator.constructor.variables;
  return void 0;
}
function validateIndexedMeshInput(positions, values, indices, variables, dimension, cellSize) {
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateArrayLike(indices, "indices");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  if (!Number.isInteger(variables) || variables < 1) {
    throw new RangeError("variables must be a positive integer.");
  }
  if (positions.length % variables !== 0) {
    throw new RangeError(`positions length must be divisible by ${variables}.`);
  }
  const vertexCount = positions.length / variables;
  if (values.length !== vertexCount * dimension) {
    throw new RangeError(`values length must be ${vertexCount * dimension} for ${vertexCount} vertices and dimension ${dimension}.`);
  }
  if (indices.length % cellSize !== 0) {
    throw new RangeError(`indices length must be divisible by ${cellSize}.`);
  }
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    if (!Number.isInteger(index) || index < 0 || index >= vertexCount) {
      throw new RangeError(`indices must contain valid vertex indices. Invalid index ${index} at ${i}.`);
    }
  }
}
function validateIntervalInput(positions, values, derivatives, dimension, type) {
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  if (positions.length < 2)
    throw new RangeError("fromIntervals requires at least two positions.");
  if (values.length !== positions.length * dimension) {
    throw new RangeError(`fromIntervals expects ${positions.length * dimension} values for dimension ${dimension}, received ${values.length}.`);
  }
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1])
      throw new RangeError("fromIntervals positions must be strictly increasing.");
  }
  if (isDerivativeMode(derivatives)) {
    validateDerivativeMode(derivatives);
    return;
  }
  if (derivatives && typeof derivatives === "object" && !ArrayBuffer.isView(derivatives) && !Array.isArray(derivatives)) {
    throw new RangeError("Unsupported derivative inference mode object.");
  }
  if (derivatives !== void 0) {
    validateArrayLike(derivatives, "derivatives");
    validateFiniteValues(derivatives, "derivatives");
    if (derivatives.length !== positions.length * dimension) {
      throw new RangeError(`fromIntervals expects ${positions.length * dimension} derivatives for dimension ${dimension}, received ${derivatives.length}.`);
    }
  }
  if (type.variables !== void 0 && type.variables !== 1) {
    throw new RangeError("fromIntervals only supports 1D interpolator types.");
  }
}
function validateSecondDerivativeInput(positions, values, secondDerivatives, dimension) {
  if (secondDerivatives === void 0)
    return;
  if (isSecondDerivativeMode(secondDerivatives)) {
    validateSecondDerivativeMode(secondDerivatives);
    return;
  }
  validateArrayLike(secondDerivatives, "secondDerivatives");
  validateFiniteValues(secondDerivatives, "secondDerivatives");
  if (secondDerivatives.length !== positions.length * dimension) {
    throw new RangeError(`fromIntervals expects ${positions.length * dimension} secondDerivatives for dimension ${dimension}, received ${secondDerivatives.length}.`);
  }
}
function isSecondDerivativeMode(secondDerivatives) {
  return typeof secondDerivatives === "string";
}
function validateSecondDerivativeMode(secondDerivatives) {
  if (secondDerivatives !== "zero" && secondDerivatives !== "finite-difference") {
    throw new RangeError(`Unsupported second derivative inference mode "${secondDerivatives}".`);
  }
}
function isDerivativeMode(derivatives) {
  return typeof derivatives === "string" || derivatives && typeof derivatives === "object" && !ArrayBuffer.isView(derivatives) && !Array.isArray(derivatives) && typeof derivatives.mode === "string";
}
function validateDerivativeMode(derivatives) {
  const mode = getDerivativeModeName(derivatives);
  if (mode !== "finite-difference" && mode !== "catmull-rom" && mode !== "zero" && mode !== "monotone" && mode !== "natural" && mode !== "clamped" && mode !== "cardinal" && mode !== "akima") {
    throw new RangeError(`Unsupported derivative inference mode "${mode}".`);
  }
  if (mode === "cardinal") {
    const tension = derivatives.tension ?? 0;
    if (typeof tension !== "number" || !Number.isFinite(tension)) {
      throw new RangeError("cardinal derivative tension must be a finite number.");
    }
  }
}
function getDerivativeModeName(derivatives) {
  return typeof derivatives === "string" ? derivatives : derivatives.mode;
}
function inferIntervalDerivatives(positions, values, dimension, derivatives) {
  const output = new values.constructor(values.length);
  const mode = getDerivativeModeName(derivatives);
  if (mode === "zero")
    return output.fill(0);
  if (mode === "natural" || mode === "clamped")
    return inferCubicSplineDerivatives(positions, values, dimension, derivatives);
  for (let point = 0; point < positions.length; point++) {
    for (let component = 0; component < dimension; component++) {
      output[point * dimension + component] = inferDerivative(
        positions,
        values,
        dimension,
        point,
        component,
        derivatives
      );
    }
  }
  return output;
}
function inferIntervalSecondDerivatives(positions, values, dimension, mode) {
  const output = new values.constructor(values.length).fill(0);
  if (mode === "zero")
    return output;
  for (let point = 1; point < positions.length - 1; point++) {
    const h0 = positions[point] - positions[point - 1];
    const h1 = positions[point + 1] - positions[point];
    for (let component = 0; component < dimension; component++) {
      const left = getSlope(positions, values, dimension, point - 1, point, component);
      const right = getSlope(positions, values, dimension, point, point + 1, component);
      output[point * dimension + component] = 2 * (right - left) / (h0 + h1);
    }
  }
  return output;
}
function inferDerivative(positions, values, dimension, point, component, derivatives) {
  const last = positions.length - 1;
  const mode = getDerivativeModeName(derivatives);
  if (point === 0)
    return getSlope(positions, values, dimension, 0, 1, component);
  if (point === last)
    return getSlope(positions, values, dimension, last - 1, last, component);
  if (mode === "finite-difference") {
    return getSlope(positions, values, dimension, point - 1, point + 1, component);
  }
  const left = getSlope(positions, values, dimension, point - 1, point, component);
  const right = getSlope(positions, values, dimension, point, point + 1, component);
  if (mode === "catmull-rom")
    return (left + right) / 2;
  if (mode === "cardinal")
    return (1 - (derivatives.tension ?? 0)) * getSlope(positions, values, dimension, point - 1, point + 1, component);
  if (mode === "monotone")
    return getMonotoneDerivative(positions, values, dimension, point, component, left, right);
  if (mode === "akima")
    return getAkimaDerivative(positions, values, dimension, point, component);
  return (left + right) / 2;
}
function getMonotoneDerivative(positions, values, dimension, point, component, left, right) {
  if (left === 0 || right === 0 || Math.sign(left) !== Math.sign(right))
    return 0;
  const h0 = positions[point] - positions[point - 1];
  const h1 = positions[point + 1] - positions[point];
  const w1 = 2 * h1 + h0;
  const w2 = h1 + 2 * h0;
  return (w1 + w2) / (w1 / left + w2 / right);
}
function getAkimaDerivative(positions, values, dimension, point, component) {
  const slopes = getExtendedSlopes(positions, values, dimension, component);
  const index = point + 2;
  const leftWeight = Math.abs(slopes[index + 1] - slopes[index]);
  const rightWeight = Math.abs(slopes[index - 1] - slopes[index - 2]);
  if (leftWeight + rightWeight === 0) {
    return (slopes[index - 1] + slopes[index]) / 2;
  }
  return (leftWeight * slopes[index - 1] + rightWeight * slopes[index]) / (leftWeight + rightWeight);
}
function getExtendedSlopes(positions, values, dimension, component) {
  const intervalCount = positions.length - 1;
  const slopes = new Array(intervalCount + 4);
  for (let i = 0; i < intervalCount; i++) {
    slopes[i + 2] = getSlope(positions, values, dimension, i, i + 1, component);
  }
  slopes[1] = 2 * slopes[2] - slopes[3];
  slopes[0] = 2 * slopes[1] - slopes[2];
  slopes[intervalCount + 2] = 2 * slopes[intervalCount + 1] - slopes[intervalCount];
  slopes[intervalCount + 3] = 2 * slopes[intervalCount + 2] - slopes[intervalCount + 1];
  return slopes;
}
function inferCubicSplineDerivatives(positions, values, dimension, derivatives) {
  const mode = getDerivativeModeName(derivatives);
  const pointCount = positions.length;
  const output = new values.constructor(values.length);
  for (let component = 0; component < dimension; component++) {
    const lower = new Array(pointCount).fill(0);
    const diagonal = new Array(pointCount).fill(0);
    const upper = new Array(pointCount).fill(0);
    const rhs = new Array(pointCount).fill(0);
    if (mode === "clamped") {
      diagonal[0] = 1;
      rhs[0] = getEndpointDerivative(derivatives.start, component, dimension, getSlope(positions, values, dimension, 0, 1, component));
      diagonal[pointCount - 1] = 1;
      rhs[pointCount - 1] = getEndpointDerivative(derivatives.end, component, dimension, getSlope(positions, values, dimension, pointCount - 2, pointCount - 1, component));
    } else {
      const h = positions[1] - positions[0];
      diagonal[0] = 2;
      upper[0] = 1;
      rhs[0] = 3 * getSlope(positions, values, dimension, 0, 1, component);
      lower[pointCount - 1] = 1;
      diagonal[pointCount - 1] = 2;
      rhs[pointCount - 1] = 3 * getSlope(positions, values, dimension, pointCount - 2, pointCount - 1, component);
    }
    for (let i = 1; i < pointCount - 1; i++) {
      const h0 = positions[i] - positions[i - 1];
      const h1 = positions[i + 1] - positions[i];
      const left = getSlope(positions, values, dimension, i - 1, i, component);
      const right = getSlope(positions, values, dimension, i, i + 1, component);
      lower[i] = h1;
      diagonal[i] = 2 * (h0 + h1);
      upper[i] = h0;
      rhs[i] = 3 * (h1 * left + h0 * right);
    }
    const solved = solveTridiagonal(lower, diagonal, upper, rhs);
    for (let i = 0; i < pointCount; i++)
      output[i * dimension + component] = solved[i];
  }
  return output;
}
function getEndpointDerivative(value, component, dimension, fallback) {
  if (value === void 0)
    return fallback;
  if (typeof value === "number")
    return value;
  if (Array.isArray(value) || ArrayBuffer.isView(value))
    return value[component];
  return fallback;
}
function solveTridiagonal(lower, diagonal, upper, rhs) {
  const count = diagonal.length;
  const c = new Array(count).fill(0);
  const d = new Array(count).fill(0);
  const output = new Array(count).fill(0);
  c[0] = upper[0] / diagonal[0];
  d[0] = rhs[0] / diagonal[0];
  for (let i = 1; i < count; i++) {
    const denominator = diagonal[i] - lower[i] * c[i - 1];
    c[i] = i === count - 1 ? 0 : upper[i] / denominator;
    d[i] = (rhs[i] - lower[i] * d[i - 1]) / denominator;
  }
  output[count - 1] = d[count - 1];
  for (let i = count - 2; i >= 0; i--)
    output[i] = d[i] - c[i] * output[i + 1];
  return output;
}
function getSlope(positions, values, dimension, start, end, component) {
  return (values[end * dimension + component] - values[start * dimension + component]) / (positions[end] - positions[start]);
}
function createBounds(interpolator) {
  if (!interpolator.positions) {
    throw new TypeError("Mesh cells must expose positions or custom bounds.");
  }
  const variables = getInterpolatorVariables(interpolator);
  const bounds = new Array(variables);
  for (let variable = 0; variable < variables; variable++) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = variable; i < interpolator.positions.length; i += variables) {
      const value = interpolator.positions[i];
      if (value < min)
        min = value;
      if (value > max)
        max = value;
    }
    bounds[variable] = { min, max };
  }
  return bounds;
}
function createHyperboxContains(bounds) {
  return (position) => {
    for (let variable = 0; variable < bounds.length; variable++) {
      const value = typeof position === "number" ? position : position[variable];
      const { min, max } = bounds[variable];
      if (value < min - EPSILON2 || value > max + EPSILON2)
        return false;
    }
    return true;
  };
}
function createGridIndex(cells, variables, resolution) {
  const bounds = getMeshBounds(cells, variables);
  const size = normalizeResolution(resolution, variables, cells.length);
  const buckets = /* @__PURE__ */ new Map();
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const min = getBucketCoordinates(bounds, size, cell.bounds, "min");
    const max = getBucketCoordinates(bounds, size, cell.bounds, "max");
    const coordinate = min.slice();
    while (true) {
      const key = coordinate.join(",");
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = [];
        buckets.set(key, bucket);
      }
      bucket.push(i);
      let axis = 0;
      for (; axis < variables; axis++) {
        if (coordinate[axis] < max[axis]) {
          coordinate[axis]++;
          for (let reset = 0; reset < axis; reset++)
            coordinate[reset] = min[reset];
          break;
        }
      }
      if (axis === variables)
        break;
    }
  }
  return {
    bounds,
    buckets,
    cells,
    resolution: size,
    variables
  };
}
function queryGridIndex(index, position) {
  const coordinate = getPositionBucketCoordinates(index.bounds, index.resolution, position);
  if (!coordinate)
    return [];
  const bucket = index.buckets.get(coordinate.join(","));
  if (!bucket)
    return [];
  return bucket.map((cellIndex) => index.cells[cellIndex]);
}
function getMeshBounds(cells, variables) {
  const bounds = new Array(variables);
  for (let variable = 0; variable < variables; variable++) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const cell of cells) {
      if (cell.bounds[variable].min < min)
        min = cell.bounds[variable].min;
      if (cell.bounds[variable].max > max)
        max = cell.bounds[variable].max;
    }
    bounds[variable] = { min, max };
  }
  return bounds;
}
function normalizeResolution(resolution, variables, cellCount) {
  if (resolution === void 0 || resolution === "auto")
    return getAutoResolution(variables, cellCount);
  if (Number.isInteger(resolution) && resolution > 0)
    return new Array(variables).fill(resolution);
  if (resolution.length !== variables) {
    throw new RangeError(`Mesh grid resolution must contain ${variables} values.`);
  }
  return Array.from(resolution, (value) => {
    if (!Number.isInteger(value) || value < 1)
      throw new RangeError("Mesh grid resolution values must be positive integers.");
    return value;
  });
}
function getAutoResolution(variables, cellCount) {
  const cellsPerAxis = cellCount ** (1 / variables);
  const scale = variables === 1 ? 2 : variables === 2 ? 1.5 : 0.75;
  const resolution = clamp(Math.round(cellsPerAxis * scale), 4, 128);
  return new Array(variables).fill(resolution);
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function getBucketCoordinates(meshBounds, resolution, cellBounds, key) {
  const coordinate = new Array(meshBounds.length);
  for (let i = 0; i < meshBounds.length; i++) {
    coordinate[i] = getBucketCoordinate(meshBounds[i], resolution[i], cellBounds[i][key]);
  }
  return coordinate;
}
function getPositionBucketCoordinates(meshBounds, resolution, position) {
  const coordinate = new Array(meshBounds.length);
  for (let i = 0; i < meshBounds.length; i++) {
    const value = typeof position === "number" ? position : position[i];
    const { min, max } = meshBounds[i];
    if (value < min - EPSILON2 || value > max + EPSILON2)
      return null;
    coordinate[i] = getBucketCoordinate(meshBounds[i], resolution[i], value);
  }
  return coordinate;
}
function getBucketCoordinate(bounds, resolution, value) {
  const { min, max } = bounds;
  if (max === min)
    return 0;
  const normalized = (value - min) / (max - min);
  return Math.min(resolution - 1, Math.max(0, Math.floor(normalized * resolution)));
}
globalThis.InterpolationMesh = InterpolationMesh;
globalThis.Mesh = Mesh;

// src/Polynomial/TensorPolynomial.js
var TensorPolynomial = class {
  constructor(positions, values, dimension = 1, degree = this.constructor.degree, variables = this.constructor.variables) {
    if (!Number.isInteger(degree) || degree < 1) {
      throw new RangeError("degree must be a positive integer.");
    }
    if (!Number.isInteger(variables) || variables < 1) {
      throw new RangeError("variables must be a positive integer.");
    }
    validateTensorInput(positions, values, dimension, degree, variables, this.constructor.name);
    this.positions = positions;
    this.values = values;
    this.dimension = dimension;
    this.degree = degree;
    this.variables = variables;
    this._parallelVersion = 0;
  }
  static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0, degree = this.degree, variables = this.variables) {
    const polynomial = new this(positions, values, dimension, degree, variables);
    return polynomial.evaluate(position, 0, output, outputOffset);
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    validateSamplePosition(position, this.variables);
    const outputNotProvided = !output;
    if (!output)
      output = new this.values.constructor(this.dimension);
    const pointsPerAxis = this.degree + 1;
    const sampleCount = pointsPerAxis ** this.variables;
    const weights = createAxisWeights(this.positions, position, inputOffset, this.degree, this.variables);
    for (let i = 0; i < this.dimension; i++)
      output[outputOffset + i] = 0;
    for (let sample = 0; sample < sampleCount; sample++) {
      let weight = 1;
      let stride = 1;
      for (let variable = 0; variable < this.variables; variable++) {
        const point = Math.floor(sample / stride) % pointsPerAxis;
        weight *= weights[variable * pointsPerAxis + point];
        stride *= pointsPerAxis;
      }
      for (let i = 0; i < this.dimension; i++) {
        output[outputOffset + i] += this.values[sample * this.dimension + i] * weight;
      }
    }
    if (outputNotProvided && this.dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  map(positions, handler) {
    validateSamplePositions(positions, this.variables);
    const sampleCount = positions.length / this.variables;
    const input = new this.positions.constructor(this.variables);
    let output;
    if (handler)
      output = new this.values.constructor(this.dimension);
    else
      output = new this.values.constructor(sampleCount * this.dimension);
    for (let i = 0, index = 0; i < positions.length; i += this.variables, index++) {
      for (let j = 0; j < this.variables; j++)
        input[j] = positions[i + j];
      if (handler) {
        handler(this.variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
      } else {
        this.evaluate(input, 0, output, index * this.dimension);
      }
    }
    return handler ? this : output;
  }
  mapAsync(positions, options) {
    return mapTensorPolynomialInWorkers(this, positions, options);
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
};
var Polynomial = class extends TensorPolynomial {
  static variables = 1;
  constructor(positions, values, dimension = 1, degree = positions.length - 1) {
    super(positions, values, dimension, degree, 1);
  }
};
var Multipolynomial = class extends TensorPolynomial {
  constructor(positions, values, dimension = 1, degree, variables) {
    super(
      positions,
      values,
      dimension,
      degree ?? inferDegree(positions, variables ?? inferVariables(positions, values, dimension)),
      variables ?? inferVariables(positions, values, dimension)
    );
  }
};
var Multilinear = class extends TensorPolynomial {
  static degree = 1;
  constructor(positions, values, dimension = 1, variables = inferVariablesForDegree(positions, 1)) {
    super(positions, values, dimension, 1, variables);
  }
};
var Multiquadratic = class extends TensorPolynomial {
  static degree = 2;
  constructor(positions, values, dimension = 1, variables = inferVariablesForDegree(positions, 2)) {
    super(positions, values, dimension, 2, variables);
  }
};
var Multicubic = class extends TensorPolynomial {
  static degree = 3;
  constructor(positions, values, dimension = 1, variables = inferVariablesForDegree(positions, 3)) {
    super(positions, values, dimension, 3, variables);
  }
};
function validateTensorInput(positions, values, dimension, degree, variables, name) {
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  const pointsPerAxis = degree + 1;
  const expectedPositions = pointsPerAxis * variables;
  const expectedValues = pointsPerAxis ** variables * dimension;
  if (positions.length !== expectedPositions) {
    throw new RangeError(`${name} expects ${expectedPositions} position values, received ${positions.length}.`);
  }
  if (values.length !== expectedValues) {
    throw new RangeError(`${name} expects ${expectedValues} values for dimension ${dimension}, received ${values.length}.`);
  }
  for (let variable = 0; variable < variables; variable++) {
    const seen = /* @__PURE__ */ new Set();
    for (let point = 0; point < pointsPerAxis; point++) {
      const value = positions[point * variables + variable];
      if (seen.has(value)) {
        throw new RangeError(`${name} positions must be unique on every axis. Duplicate ${value} on axis ${variable}.`);
      }
      seen.add(value);
    }
  }
}
function createAxisWeights(positions, position, inputOffset, degree, variables) {
  const pointsPerAxis = degree + 1;
  const weights = new positions.constructor(variables * pointsPerAxis);
  for (let variable = 0; variable < variables; variable++) {
    const value = typeof position === "number" ? position : position[inputOffset + variable];
    for (let point = 0; point < pointsPerAxis; point++) {
      let weight = 1;
      const pointValue = positions[point * variables + variable];
      for (let other = 0; other < pointsPerAxis; other++) {
        if (other === point)
          continue;
        const otherValue = positions[other * variables + variable];
        weight *= (value - otherValue) / (pointValue - otherValue);
      }
      weights[variable * pointsPerAxis + point] = weight;
    }
  }
  return weights;
}
function inferVariablesForDegree(positions, degree) {
  validateArrayLike(positions, "positions");
  const variables = positions.length / (degree + 1);
  if (!Number.isInteger(variables) || variables < 1) {
    throw new RangeError(`positions length must be divisible by ${degree + 1}.`);
  }
  return variables;
}
function inferVariables(positions, values, dimension) {
  validateArrayLike(values, "values");
  validateDimension(dimension);
  for (let variables = 1; variables <= positions.length; variables++) {
    if (positions.length % variables !== 0)
      continue;
    const pointsPerAxis = positions.length / variables;
    const samples = values.length / dimension;
    if (Number.isInteger(pointsPerAxis) && samples === pointsPerAxis ** variables)
      return variables;
  }
  throw new RangeError("Unable to infer variables from positions and values.");
}
function inferDegree(positions, variables) {
  return positions.length / variables - 1;
}
globalThis.TensorPolynomial = TensorPolynomial;
globalThis.Polynomial = Polynomial;
globalThis.Multipolynomial = Multipolynomial;
globalThis.Multilinear = Multilinear;
globalThis.Multiquadratic = Multiquadratic;
globalThis.Multicubic = Multicubic;

// src/Scattered/InverseDistanceWeighting.js
var EPSILON3 = 1e-12;
var InverseDistanceWeighting = class {
  constructor(positionsOrOptions, values, dimension = 1, variables, options = {}) {
    const config = normalizeConstructorArguments(positionsOrOptions, values, dimension, variables, options);
    validateInput(config.positions, config.values, config.dimension, config.variables);
    validateOptions(config);
    this.positions = config.positions;
    this.values = config.values;
    this.dimension = config.dimension;
    this.variables = config.variables;
    this.power = config.power;
    this.radius = config.radius;
    this.neighbors = config.neighbors;
    this.epsilon = config.epsilon;
    this.empty = normalizeEmptyMode(config.empty, this.dimension, this.values.constructor);
    this.indexMode = config.index;
    this.resolution = config.resolution;
    this.index = null;
    this.rebuildIndex();
  }
  static evaluate(positionsOrOptions, valuesOrPosition, dimension = 1, variables, options = {}, position, output, outputOffset = 0) {
    if (isOptionsObject(positionsOrOptions)) {
      const interpolator2 = new this(positionsOrOptions);
      return interpolator2.evaluate(valuesOrPosition, 0, dimension, variables ?? 0);
    }
    const interpolator = new this(positionsOrOptions, valuesOrPosition, dimension, variables, options);
    return interpolator.evaluate(position, 0, output, outputOffset);
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    validateSamplePosition(position, this.variables);
    const outputNotProvided = !output;
    if (!output)
      output = new this.values.constructor(this.dimension);
    const exactIndex = this.findExactSample(position, inputOffset);
    if (exactIndex !== -1) {
      for (let i = 0; i < this.dimension; i++) {
        output[outputOffset + i] = this.values[exactIndex * this.dimension + i];
      }
      if (outputNotProvided && this.dimension === 1)
        return output[outputOffset];
      else
        return output;
    }
    const samples = this.collectSamples(position, inputOffset);
    if (samples.length === 0) {
      const value = this.evaluateEmpty(position, inputOffset, output, outputOffset);
      if (outputNotProvided && this.dimension === 1)
        return value;
      else
        return output;
    }
    for (let i = 0; i < this.dimension; i++)
      output[outputOffset + i] = 0;
    let totalWeight = 0;
    for (const sample of samples) {
      const weight = 1 / sample.distance ** this.power;
      totalWeight += weight;
      for (let i = 0; i < this.dimension; i++) {
        output[outputOffset + i] += this.values[sample.index * this.dimension + i] * weight;
      }
    }
    for (let i = 0; i < this.dimension; i++)
      output[outputOffset + i] /= totalWeight;
    if (outputNotProvided && this.dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  evaluateEmpty(position, inputOffset, output, outputOffset) {
    if (this.empty.mode === "throw")
      throw new RangeError("Position has no IDW samples within the configured radius.");
    if (this.empty.mode === "nearest") {
      const sample = this.findNearestSample(position, inputOffset);
      for (let i = 0; i < this.dimension; i++) {
        output[outputOffset + i] = this.values[sample * this.dimension + i];
      }
      return this.dimension === 1 ? output[outputOffset] : output;
    }
    if (this.empty.mode === "undefined") {
      for (let i = 0; i < this.dimension; i++)
        output[outputOffset + i] = Number.NaN;
      return void 0;
    }
    if (this.empty.mode === "null") {
      for (let i = 0; i < this.dimension; i++)
        output[outputOffset + i] = Number.NaN;
      return null;
    }
    for (let i = 0; i < this.dimension; i++)
      output[outputOffset + i] = this.empty.value[i];
    return this.dimension === 1 ? output[outputOffset] : output;
  }
  findExactSample(position, inputOffset) {
    const sampleCount = this.positions.length / this.variables;
    const epsilonSquared = this.epsilon * this.epsilon;
    for (let sample = 0; sample < sampleCount; sample++) {
      if (this.distanceSquared(position, inputOffset, sample) <= epsilonSquared)
        return sample;
    }
    return -1;
  }
  collectSamples(position, inputOffset) {
    if (this.index)
      return collectIndexedSamples(this, position, inputOffset);
    const sampleCount = this.positions.length / this.variables;
    const radiusSquared = this.radius === Infinity ? Infinity : this.radius * this.radius;
    const samples = [];
    for (let sample = 0; sample < sampleCount; sample++) {
      const distanceSquared2 = this.distanceSquared(position, inputOffset, sample);
      if (distanceSquared2 > radiusSquared)
        continue;
      samples.push({
        index: sample,
        distance: Math.sqrt(distanceSquared2)
      });
    }
    if (this.neighbors !== Infinity && samples.length > this.neighbors) {
      samples.sort((a, b) => a.distance - b.distance);
      samples.length = this.neighbors;
    }
    return samples;
  }
  findNearestSample(position, inputOffset) {
    if (this.index)
      return findNearestIndexedSample(this, position, inputOffset);
    return this.findNearestSampleLinear(position, inputOffset);
  }
  findNearestSampleLinear(position, inputOffset) {
    const sampleCount = this.positions.length / this.variables;
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let sample = 0; sample < sampleCount; sample++) {
      const distance = this.distanceSquared(position, inputOffset, sample);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = sample;
      }
    }
    return bestIndex;
  }
  rebuildIndex() {
    if (this.indexMode === "none" || this.indexMode === false) {
      this.index = null;
      return this;
    }
    if (this.indexMode !== "grid") {
      throw new RangeError(`Unsupported IDW index mode "${this.indexMode}".`);
    }
    this.index = createGridIndex2(this.positions, this.variables, this.resolution);
    return this;
  }
  distanceSquared(position, inputOffset, sample) {
    let distance = 0;
    for (let variable = 0; variable < this.variables; variable++) {
      const value = typeof position === "number" ? position : position[inputOffset + variable];
      const delta = value - this.positions[sample * this.variables + variable];
      distance += delta * delta;
    }
    return distance;
  }
  map(positions, handler) {
    validateSamplePositions(positions, this.variables);
    const sampleCount = positions.length / this.variables;
    const input = new this.positions.constructor(this.variables);
    let output;
    if (handler)
      output = new this.values.constructor(this.dimension);
    else
      output = new this.values.constructor(sampleCount * this.dimension);
    for (let i = 0, index = 0; i < positions.length; i += this.variables, index++) {
      for (let j = 0; j < this.variables; j++)
        input[j] = positions[i + j];
      if (handler) {
        handler(this.variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
      } else {
        this.evaluate(input, 0, output, index * this.dimension);
      }
    }
    return handler ? this : output;
  }
  mapAsync(positions, options) {
    return Promise.resolve(this.map(positions, options?.handler));
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
};
var IDW = InverseDistanceWeighting;
function normalizeConstructorArguments(positionsOrOptions, values, dimension, variables, options) {
  if (isOptionsObject(positionsOrOptions)) {
    return {
      positions: positionsOrOptions.positions,
      values: positionsOrOptions.values,
      dimension: positionsOrOptions.dimension ?? 1,
      variables: positionsOrOptions.variables ?? inferVariables2(positionsOrOptions.positions, positionsOrOptions.values, positionsOrOptions.dimension ?? 1),
      power: positionsOrOptions.power ?? 2,
      radius: positionsOrOptions.radius ?? Infinity,
      neighbors: positionsOrOptions.neighbors ?? Infinity,
      epsilon: positionsOrOptions.epsilon ?? EPSILON3,
      empty: positionsOrOptions.empty ?? "throw",
      index: positionsOrOptions.index ?? "none",
      resolution: positionsOrOptions.resolution
    };
  }
  return {
    positions: positionsOrOptions,
    values,
    dimension,
    variables: variables ?? inferVariables2(positionsOrOptions, values, dimension),
    power: options.power ?? 2,
    radius: options.radius ?? Infinity,
    neighbors: options.neighbors ?? Infinity,
    epsilon: options.epsilon ?? EPSILON3,
    empty: options.empty ?? "throw",
    index: options.index ?? "none",
    resolution: options.resolution
  };
}
function isOptionsObject(value) {
  return value && typeof value === "object" && !ArrayBuffer.isView(value) && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, "positions");
}
function validateInput(positions, values, dimension, variables) {
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  if (!Number.isInteger(variables) || variables < 1) {
    throw new RangeError("variables must be a positive integer.");
  }
  if (positions.length % variables !== 0) {
    throw new RangeError(`positions length must be divisible by ${variables}.`);
  }
  const sampleCount = positions.length / variables;
  if (sampleCount < 1)
    throw new RangeError("InverseDistanceWeighting requires at least one sample.");
  if (values.length !== sampleCount * dimension) {
    throw new RangeError(
      `InverseDistanceWeighting expects ${sampleCount * dimension} values for dimension ${dimension}, received ${values.length}.`
    );
  }
}
function validateOptions(options) {
  if (typeof options.power !== "number" || !Number.isFinite(options.power) || options.power <= 0) {
    throw new RangeError("power must be a positive finite number.");
  }
  if (options.radius !== Infinity && (typeof options.radius !== "number" || !Number.isFinite(options.radius) || options.radius <= 0)) {
    throw new RangeError("radius must be a positive finite number or Infinity.");
  }
  if (options.neighbors !== Infinity && (!Number.isInteger(options.neighbors) || options.neighbors < 1)) {
    throw new RangeError("neighbors must be a positive integer or Infinity.");
  }
  if (typeof options.epsilon !== "number" || !Number.isFinite(options.epsilon) || options.epsilon < 0) {
    throw new RangeError("epsilon must be a non-negative finite number.");
  }
  if (options.index !== "none" && options.index !== false && options.index !== "grid") {
    throw new RangeError(`Unsupported IDW index mode "${options.index}".`);
  }
}
function createGridIndex2(positions, variables, resolution) {
  const bounds = getPointBounds(positions, variables);
  const size = normalizeResolution2(resolution, variables, positions.length / variables);
  const buckets = /* @__PURE__ */ new Map();
  const sampleCount = positions.length / variables;
  for (let sample = 0; sample < sampleCount; sample++) {
    const coordinate = getSampleBucketCoordinates(bounds, size, positions, sample, variables);
    const key = coordinate.join(",");
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(sample);
  }
  return {
    bounds,
    buckets,
    resolution: size,
    variables
  };
}
function collectIndexedSamples(idw, position, inputOffset) {
  const candidates = idw.radius === Infinity ? collectAllIndexedCandidates(idw.index) : collectRadiusCandidates(idw.index, position, inputOffset, idw.radius);
  const radiusSquared = idw.radius === Infinity ? Infinity : idw.radius * idw.radius;
  const samples = [];
  for (const sample of candidates) {
    const distanceSquared2 = idw.distanceSquared(position, inputOffset, sample);
    if (distanceSquared2 > radiusSquared)
      continue;
    samples.push({
      index: sample,
      distance: Math.sqrt(distanceSquared2)
    });
  }
  if (idw.neighbors !== Infinity && samples.length > idw.neighbors) {
    samples.sort((a, b) => a.distance - b.distance);
    samples.length = idw.neighbors;
  }
  return samples;
}
function findNearestIndexedSample(idw, position, inputOffset) {
  const point = getPositionVector(position, inputOffset, idw.variables);
  const coordinate = getPositionBucketCoordinates2(idw.index.bounds, idw.index.resolution, point);
  if (!coordinate)
    return idw.findNearestSampleLinear(position, inputOffset);
  let bestIndex = -1;
  let bestDistance = Infinity;
  const maxRadius = Math.max(...idw.index.resolution);
  const visited = /* @__PURE__ */ new Set();
  for (let radius = 0; radius <= maxRadius; radius++) {
    forEachCoordinateInRadius(coordinate, radius, idw.index.resolution, (candidateCoordinate) => {
      const key = candidateCoordinate.join(",");
      if (visited.has(key))
        return;
      visited.add(key);
      const bucket = idw.index.buckets.get(key);
      if (!bucket)
        return;
      for (const sample of bucket) {
        const distance = idw.distanceSquared(position, inputOffset, sample);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = sample;
        }
      }
    });
    if (bestIndex !== -1 && radiusShellMinimumDistance(idw.index, point, coordinate, radius + 1) > bestDistance) {
      return bestIndex;
    }
  }
  return bestIndex === -1 ? 0 : bestIndex;
}
function collectRadiusCandidates(index, position, inputOffset, radius) {
  const point = getPositionVector(position, inputOffset, index.variables);
  const min = point.map((value) => value - radius);
  const max = point.map((value) => value + radius);
  const minCoordinate = getBoundsBucketCoordinates(index.bounds, index.resolution, min, "min");
  const maxCoordinate = getBoundsBucketCoordinates(index.bounds, index.resolution, max, "max");
  const candidates = [];
  if (!minCoordinate || !maxCoordinate)
    return candidates;
  const coordinate = minCoordinate.slice();
  while (true) {
    const bucket = index.buckets.get(coordinate.join(","));
    if (bucket)
      candidates.push(...bucket);
    let axis = 0;
    for (; axis < index.variables; axis++) {
      if (coordinate[axis] < maxCoordinate[axis]) {
        coordinate[axis]++;
        for (let reset = 0; reset < axis; reset++)
          coordinate[reset] = minCoordinate[reset];
        break;
      }
    }
    if (axis === index.variables)
      break;
  }
  return candidates;
}
function collectAllIndexedCandidates(index) {
  const candidates = [];
  for (const bucket of index.buckets.values())
    candidates.push(...bucket);
  return candidates;
}
function getPointBounds(positions, variables) {
  const bounds = new Array(variables);
  for (let variable = 0; variable < variables; variable++) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = variable; i < positions.length; i += variables) {
      if (positions[i] < min)
        min = positions[i];
      if (positions[i] > max)
        max = positions[i];
    }
    if (min === max) {
      min -= 0.5;
      max += 0.5;
    }
    bounds[variable] = { min, max };
  }
  return bounds;
}
function normalizeResolution2(resolution, variables, sampleCount) {
  if (resolution === void 0 || resolution === "auto") {
    const perAxis = Math.max(1, Math.ceil(sampleCount ** (1 / variables)));
    return new Array(variables).fill(perAxis);
  }
  if (typeof resolution === "number") {
    if (!Number.isInteger(resolution) || resolution < 1)
      throw new RangeError("resolution must be a positive integer.");
    return new Array(variables).fill(resolution);
  }
  validateArrayLike(resolution, "resolution");
  if (resolution.length !== variables)
    throw new RangeError(`resolution must contain ${variables} values.`);
  const output = new Array(variables);
  for (let i = 0; i < variables; i++) {
    const value = resolution[i];
    if (!Number.isInteger(value) || value < 1)
      throw new RangeError("resolution values must be positive integers.");
    output[i] = value;
  }
  return output;
}
function getSampleBucketCoordinates(bounds, resolution, positions, sample, variables) {
  const coordinate = new Array(variables);
  for (let variable = 0; variable < variables; variable++) {
    coordinate[variable] = getAxisBucketCoordinate(
      bounds[variable],
      resolution[variable],
      positions[sample * variables + variable]
    );
  }
  return coordinate;
}
function getPositionBucketCoordinates2(bounds, resolution, position) {
  const coordinate = new Array(bounds.length);
  for (let variable = 0; variable < bounds.length; variable++) {
    const value = position[variable];
    if (value < bounds[variable].min || value > bounds[variable].max)
      return null;
    coordinate[variable] = getAxisBucketCoordinate(bounds[variable], resolution[variable], value);
  }
  return coordinate;
}
function getBoundsBucketCoordinates(bounds, resolution, values, side) {
  const coordinate = new Array(bounds.length);
  for (let variable = 0; variable < bounds.length; variable++) {
    const clamped = Math.min(bounds[variable].max, Math.max(bounds[variable].min, values[variable]));
    if (values[variable] < bounds[variable].min && side === "max")
      return null;
    if (values[variable] > bounds[variable].max && side === "min")
      return null;
    coordinate[variable] = getAxisBucketCoordinate(bounds[variable], resolution[variable], clamped);
  }
  return coordinate;
}
function getAxisBucketCoordinate(bound, resolution, value) {
  const ratio = (value - bound.min) / (bound.max - bound.min);
  return Math.min(resolution - 1, Math.max(0, Math.floor(ratio * resolution)));
}
function getPositionVector(position, inputOffset, variables) {
  if (typeof position === "number")
    return [position];
  const output = new Array(variables);
  for (let variable = 0; variable < variables; variable++)
    output[variable] = position[inputOffset + variable];
  return output;
}
function forEachCoordinateInRadius(center, radius, resolution, callback) {
  const variables = center.length;
  const min = new Array(variables);
  const max = new Array(variables);
  const coordinate = new Array(variables);
  for (let axis = 0; axis < variables; axis++) {
    min[axis] = Math.max(0, center[axis] - radius);
    max[axis] = Math.min(resolution[axis] - 1, center[axis] + radius);
    coordinate[axis] = min[axis];
  }
  while (true) {
    let onShell = radius === 0;
    for (let axis2 = 0; axis2 < variables; axis2++) {
      if (Math.abs(coordinate[axis2] - center[axis2]) === radius) {
        onShell = true;
        break;
      }
    }
    if (onShell)
      callback(coordinate.slice());
    let axis = 0;
    for (; axis < variables; axis++) {
      if (coordinate[axis] < max[axis]) {
        coordinate[axis]++;
        for (let reset = 0; reset < axis; reset++)
          coordinate[reset] = min[reset];
        break;
      }
    }
    if (axis === variables)
      break;
  }
}
function radiusShellMinimumDistance(index, point, center, radius) {
  let distance = 0;
  for (let axis = 0; axis < index.variables; axis++) {
    const lowerIndex = center[axis] - radius;
    const upperIndex = center[axis] + radius;
    const bound = index.bounds[axis];
    const cellSize = (bound.max - bound.min) / index.resolution[axis];
    let axisDistance = 0;
    if (lowerIndex >= 0) {
      const upperEdge = bound.min + (lowerIndex + 1) * cellSize;
      if (upperEdge < point[axis])
        axisDistance = point[axis] - upperEdge;
    }
    if (upperIndex < index.resolution[axis]) {
      const lowerEdge = bound.min + upperIndex * cellSize;
      if (lowerEdge > point[axis])
        axisDistance = Math.min(
          axisDistance || Infinity,
          lowerEdge - point[axis]
        );
    }
    distance += axisDistance * axisDistance;
  }
  return distance;
}
function normalizeEmptyMode(empty, dimension, Type) {
  if (empty === "throw" || empty === void 0)
    return { mode: "throw" };
  if (empty === "nearest")
    return { mode: "nearest" };
  if (empty === "undefined")
    return { mode: "undefined" };
  if (empty === "null")
    return { mode: "null" };
  if (typeof empty === "number") {
    if (!Number.isFinite(empty))
      throw new RangeError("empty fallback values must be finite numbers.");
    return {
      mode: "constant",
      value: new Type(dimension).fill(empty)
    };
  }
  if (Array.isArray(empty) || ArrayBuffer.isView(empty)) {
    validateArrayLike(empty, "empty");
    validateFiniteValues(empty, "empty");
    if (empty.length !== dimension) {
      throw new RangeError(`empty fallback array must contain ${dimension} values.`);
    }
    const value = new Type(dimension);
    for (let i = 0; i < dimension; i++)
      value[i] = empty[i];
    return {
      mode: "constant",
      value
    };
  }
  throw new RangeError('empty must be "throw", "nearest", "undefined", "null", a number, or an array-like fallback.');
}
function inferVariables2(positions, values, dimension) {
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateDimension(dimension);
  const sampleCount = values.length / dimension;
  if (!Number.isInteger(sampleCount) || sampleCount < 1) {
    throw new RangeError("Unable to infer variables from positions and values.");
  }
  const variables = positions.length / sampleCount;
  if (!Number.isInteger(variables) || variables < 1) {
    throw new RangeError("Unable to infer variables from positions and values.");
  }
  return variables;
}

// src/Scattered/RadialBasisFunction.js
var DEFAULT_KERNEL = "gaussian";
var DEFAULT_EPSILON = 1;
var RadialBasisFunction = class {
  constructor(positionsOrOptions, values, dimension = 1, variables, options = {}) {
    const config = normalizeConstructorArguments2(positionsOrOptions, values, dimension, variables, options);
    validateInput2(config.positions, config.values, config.dimension, config.variables);
    validateOptions2(config);
    this.positions = config.positions;
    this.values = config.values;
    this.dimension = config.dimension;
    this.variables = config.variables;
    this.kernel = config.kernel;
    this.epsilon = config.epsilon;
    this.smoothing = config.smoothing;
    const solution = solveWeights(this);
    this.weights = solution.weights;
    this.polynomial = solution.polynomial;
  }
  static evaluate(positionsOrOptions, valuesOrPosition, dimension = 1, variables, options = {}, position, output, outputOffset = 0) {
    if (isOptionsObject2(positionsOrOptions)) {
      const interpolator2 = new this(positionsOrOptions);
      return interpolator2.evaluate(valuesOrPosition, 0, dimension, variables ?? 0);
    }
    const interpolator = new this(positionsOrOptions, valuesOrPosition, dimension, variables, options);
    return interpolator.evaluate(position, 0, output, outputOffset);
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    validateSamplePosition(position, this.variables);
    const outputNotProvided = !output;
    if (!output)
      output = new this.values.constructor(this.dimension);
    const sampleCount = this.positions.length / this.variables;
    for (let i = 0; i < this.dimension; i++)
      output[outputOffset + i] = 0;
    for (let sample = 0; sample < sampleCount; sample++) {
      const value = evaluateKernel(this.kernel, this.getDistance(position, inputOffset, sample), this.epsilon);
      for (let component = 0; component < this.dimension; component++) {
        output[outputOffset + component] += this.weights[sample * this.dimension + component] * value;
      }
    }
    if (this.polynomial) {
      for (let component = 0; component < this.dimension; component++) {
        let value = this.polynomial[component * (this.variables + 1)];
        for (let variable = 0; variable < this.variables; variable++) {
          value += this.polynomial[component * (this.variables + 1) + variable + 1] * (typeof position === "number" ? position : position[inputOffset + variable]);
        }
        output[outputOffset + component] += value;
      }
    }
    if (outputNotProvided && this.dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  getDistance(position, inputOffset, sample) {
    let distance = 0;
    for (let variable = 0; variable < this.variables; variable++) {
      const value = typeof position === "number" ? position : position[inputOffset + variable];
      const delta = value - this.positions[sample * this.variables + variable];
      distance += delta * delta;
    }
    return Math.sqrt(distance);
  }
  map(positions, handler) {
    validateSamplePositions(positions, this.variables);
    const sampleCount = positions.length / this.variables;
    const input = new this.positions.constructor(this.variables);
    let output;
    if (handler)
      output = new this.values.constructor(this.dimension);
    else
      output = new this.values.constructor(sampleCount * this.dimension);
    for (let i = 0, index = 0; i < positions.length; i += this.variables, index++) {
      for (let j = 0; j < this.variables; j++)
        input[j] = positions[i + j];
      if (handler)
        handler(this.variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
      else
        this.evaluate(input, 0, output, index * this.dimension);
    }
    return handler ? this : output;
  }
  mapAsync(positions, options) {
    return Promise.resolve(this.map(positions, options?.handler));
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
};
var RBF = RadialBasisFunction;
function normalizeConstructorArguments2(positionsOrOptions, values, dimension, variables, options) {
  if (isOptionsObject2(positionsOrOptions)) {
    return {
      positions: positionsOrOptions.positions,
      values: positionsOrOptions.values,
      dimension: positionsOrOptions.dimension ?? 1,
      variables: positionsOrOptions.variables ?? inferVariables3(positionsOrOptions.positions, positionsOrOptions.values, positionsOrOptions.dimension ?? 1),
      kernel: positionsOrOptions.kernel ?? DEFAULT_KERNEL,
      epsilon: positionsOrOptions.epsilon ?? DEFAULT_EPSILON,
      smoothing: positionsOrOptions.smoothing ?? 0
    };
  }
  return {
    positions: positionsOrOptions,
    values,
    dimension,
    variables: variables ?? inferVariables3(positionsOrOptions, values, dimension),
    kernel: options.kernel ?? DEFAULT_KERNEL,
    epsilon: options.epsilon ?? DEFAULT_EPSILON,
    smoothing: options.smoothing ?? 0
  };
}
function isOptionsObject2(value) {
  return value && typeof value === "object" && !ArrayBuffer.isView(value) && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, "positions");
}
function validateInput2(positions, values, dimension, variables) {
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  if (!Number.isInteger(variables) || variables < 1)
    throw new RangeError("variables must be a positive integer.");
  if (positions.length % variables !== 0)
    throw new RangeError(`positions length must be divisible by ${variables}.`);
  const sampleCount = positions.length / variables;
  if (sampleCount < 1)
    throw new RangeError("RadialBasisFunction requires at least one sample.");
  if (values.length !== sampleCount * dimension) {
    throw new RangeError(`RadialBasisFunction expects ${sampleCount * dimension} values for dimension ${dimension}, received ${values.length}.`);
  }
}
function validateOptions2(options) {
  if (!isSupportedKernel(options.kernel))
    throw new RangeError(`Unsupported RBF kernel "${options.kernel}".`);
  if (typeof options.epsilon !== "number" || !Number.isFinite(options.epsilon) || options.epsilon <= 0) {
    throw new RangeError("epsilon must be a positive finite number.");
  }
  if (typeof options.smoothing !== "number" || !Number.isFinite(options.smoothing) || options.smoothing < 0) {
    throw new RangeError("smoothing must be a non-negative finite number.");
  }
}
function isSupportedKernel(kernel) {
  return kernel === "gaussian" || kernel === "multiquadric" || kernel === "inverse-multiquadric" || kernel === "linear" || kernel === "cubic" || kernel === "thin-plate";
}
function evaluateKernel(kernel, radius, epsilon) {
  const scaled = epsilon * radius;
  if (kernel === "gaussian")
    return Math.exp(-(scaled * scaled));
  if (kernel === "multiquadric")
    return Math.sqrt(1 + scaled * scaled);
  if (kernel === "inverse-multiquadric")
    return 1 / Math.sqrt(1 + scaled * scaled);
  if (kernel === "linear")
    return radius;
  if (kernel === "cubic")
    return radius * radius * radius;
  if (radius === 0)
    return 0;
  return radius * radius * Math.log(radius);
}
function solveWeights(rbf) {
  const sampleCount = rbf.positions.length / rbf.variables;
  const polynomialSize = needsPolynomialTail(rbf.kernel) ? rbf.variables + 1 : 0;
  const matrix = createKernelMatrix(rbf, sampleCount, polynomialSize);
  const rhs = new Array(sampleCount + polynomialSize).fill(0);
  const weights = new rbf.values.constructor(sampleCount * rbf.dimension);
  const polynomial = polynomialSize > 0 ? new rbf.values.constructor(polynomialSize * rbf.dimension) : null;
  for (let component = 0; component < rbf.dimension; component++) {
    for (let sample = 0; sample < sampleCount; sample++)
      rhs[sample] = rbf.values[sample * rbf.dimension + component];
    const solved = solveLinearSystem(matrix, rhs);
    for (let sample = 0; sample < sampleCount; sample++)
      weights[sample * rbf.dimension + component] = solved[sample];
    for (let term = 0; term < polynomialSize; term++)
      polynomial[component * polynomialSize + term] = solved[sampleCount + term];
  }
  return { weights, polynomial };
}
function createKernelMatrix(rbf, sampleCount, polynomialSize) {
  const size = sampleCount + polynomialSize;
  const matrix = new Array(size);
  for (let row = 0; row < size; row++)
    matrix[row] = new Array(size).fill(0);
  for (let row = 0; row < sampleCount; row++) {
    for (let column = 0; column < sampleCount; column++) {
      const distance = getSampleDistance(rbf.positions, rbf.variables, row, column);
      matrix[row][column] = evaluateKernel(rbf.kernel, distance, rbf.epsilon);
    }
    matrix[row][row] += rbf.smoothing;
  }
  if (polynomialSize > 0) {
    for (let sample = 0; sample < sampleCount; sample++) {
      matrix[sample][sampleCount] = 1;
      matrix[sampleCount][sample] = 1;
      for (let variable = 0; variable < rbf.variables; variable++) {
        const value = rbf.positions[sample * rbf.variables + variable];
        const term = sampleCount + variable + 1;
        matrix[sample][term] = value;
        matrix[term][sample] = value;
      }
    }
  }
  return matrix;
}
function needsPolynomialTail(kernel) {
  return kernel === "linear" || kernel === "cubic" || kernel === "thin-plate";
}
function solveLinearSystem(matrix, rhs) {
  const size = matrix.length;
  const a = matrix.map((row) => row.slice());
  const b = rhs.slice();
  for (let column = 0; column < size; column++) {
    let pivot = column;
    let pivotValue = Math.abs(a[column][column]);
    for (let row = column + 1; row < size; row++) {
      const value = Math.abs(a[row][column]);
      if (value > pivotValue) {
        pivot = row;
        pivotValue = value;
      }
    }
    if (pivotValue === 0)
      throw new RangeError("RBF interpolation matrix is singular.");
    if (pivot !== column) {
      const row = a[column];
      a[column] = a[pivot];
      a[pivot] = row;
      const value = b[column];
      b[column] = b[pivot];
      b[pivot] = value;
    }
    for (let row = column + 1; row < size; row++) {
      const factor = a[row][column] / a[column][column];
      if (factor === 0)
        continue;
      a[row][column] = 0;
      for (let item = column + 1; item < size; item++)
        a[row][item] -= factor * a[column][item];
      b[row] -= factor * b[column];
    }
  }
  const output = new Array(size);
  for (let row = size - 1; row >= 0; row--) {
    let value = b[row];
    for (let column = row + 1; column < size; column++)
      value -= a[row][column] * output[column];
    output[row] = value / a[row][row];
  }
  return output;
}
function getSampleDistance(positions, variables, a, b) {
  let distance = 0;
  for (let variable = 0; variable < variables; variable++) {
    const delta = positions[a * variables + variable] - positions[b * variables + variable];
    distance += delta * delta;
  }
  return Math.sqrt(distance);
}
function inferVariables3(positions, values, dimension) {
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateDimension(dimension);
  const sampleCount = values.length / dimension;
  if (!Number.isInteger(sampleCount) || sampleCount < 1)
    throw new RangeError("Unable to infer variables from positions and values.");
  const variables = positions.length / sampleCount;
  if (!Number.isInteger(variables) || variables < 1)
    throw new RangeError("Unable to infer variables from positions and values.");
  return variables;
}
globalThis.RadialBasisFunction = RadialBasisFunction;
globalThis.RBF = RBF;

// src/Hermite/CubicHermite.js
var CubicHermite = class {
  static degree = 3;
  static variables = 1;
  constructor(positionsOrOptions, values, derivatives, dimension = 1) {
    const config = normalizeConstructorArguments3(positionsOrOptions, values, derivatives, dimension);
    validateInput3(config.positions, config.values, config.derivatives, config.dimension);
    this.positions = config.positions;
    this.values = config.values;
    this.derivatives = config.derivatives;
    this.dimension = config.dimension;
  }
  static evaluate(positionsOrOptions, valuesOrPosition, derivatives, dimension = 1, position, output, outputOffset = 0) {
    if (isOptionsObject3(positionsOrOptions)) {
      const hermite2 = new this(positionsOrOptions);
      return hermite2.evaluate(valuesOrPosition, 0, derivatives, dimension ?? 0);
    }
    const hermite = new this(positionsOrOptions, valuesOrPosition, derivatives, dimension);
    return hermite.evaluate(position, 0, output, outputOffset);
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    validateSamplePosition(position, 1);
    const outputNotProvided = !output;
    if (!output)
      output = new this.values.constructor(this.dimension);
    const x = typeof position === "number" ? position : position[inputOffset];
    const x0 = this.positions[0];
    const x1 = this.positions[1];
    const dx = x1 - x0;
    const t = (x - x0) / dx;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    for (let i = 0; i < this.dimension; i++) {
      const y0 = this.values[i];
      const y1 = this.values[this.dimension + i];
      const m0 = this.derivatives[i];
      const m1 = this.derivatives[this.dimension + i];
      output[outputOffset + i] = h00 * y0 + h10 * dx * m0 + h01 * y1 + h11 * dx * m1;
    }
    if (outputNotProvided && this.dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  derivative(position, inputOffset = 0, output, outputOffset = 0) {
    validateSamplePosition(position, 1);
    const outputNotProvided = !output;
    if (!output)
      output = new this.values.constructor(this.dimension);
    const x = typeof position === "number" ? position : position[inputOffset];
    const x0 = this.positions[0];
    const x1 = this.positions[1];
    const dx = x1 - x0;
    const t = (x - x0) / dx;
    const t2 = t * t;
    const dh00 = 6 * t2 - 6 * t;
    const dh10 = 3 * t2 - 4 * t + 1;
    const dh01 = -6 * t2 + 6 * t;
    const dh11 = 3 * t2 - 2 * t;
    for (let i = 0; i < this.dimension; i++) {
      const y0 = this.values[i];
      const y1 = this.values[this.dimension + i];
      const m0 = this.derivatives[i];
      const m1 = this.derivatives[this.dimension + i];
      output[outputOffset + i] = (dh00 * y0 + dh10 * dx * m0 + dh01 * y1 + dh11 * dx * m1) / dx;
    }
    if (outputNotProvided && this.dimension === 1)
      return output[outputOffset];
    else
      return output;
  }
  map(positions, handler) {
    validateSamplePositions(positions, 1);
    const sampleCount = positions.length;
    let output;
    if (handler)
      output = new this.values.constructor(this.dimension);
    else
      output = new this.values.constructor(sampleCount * this.dimension);
    for (let i = 0; i < positions.length; i++) {
      if (handler) {
        handler(positions[i], this.evaluate(positions[i], 0, output, 0));
      } else {
        this.evaluate(positions[i], 0, output, i * this.dimension);
      }
    }
    return handler ? this : output;
  }
  mapAsync(positions, options) {
    return Promise.resolve(this.map(positions, options?.handler));
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
};
var Hermite = CubicHermite;
function normalizeConstructorArguments3(positionsOrOptions, values, derivatives, dimension) {
  if (isOptionsObject3(positionsOrOptions)) {
    return {
      positions: positionsOrOptions.positions,
      values: positionsOrOptions.values,
      derivatives: positionsOrOptions.derivatives,
      dimension: positionsOrOptions.dimension ?? 1
    };
  }
  return {
    positions: positionsOrOptions,
    values,
    derivatives,
    dimension
  };
}
function isOptionsObject3(value) {
  return value && typeof value === "object" && !ArrayBuffer.isView(value) && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, "positions");
}
function validateInput3(positions, values, derivatives, dimension) {
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateArrayLike(derivatives, "derivatives");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  validateFiniteValues(derivatives, "derivatives");
  if (positions.length !== 2)
    throw new RangeError("CubicHermite expects exactly two positions.");
  if (positions[0] === positions[1])
    throw new RangeError("CubicHermite positions must be unique.");
  if (values.length !== dimension * 2) {
    throw new RangeError(`CubicHermite expects ${dimension * 2} values for dimension ${dimension}, received ${values.length}.`);
  }
  if (derivatives.length !== dimension * 2) {
    throw new RangeError(`CubicHermite expects ${dimension * 2} derivatives for dimension ${dimension}, received ${derivatives.length}.`);
  }
}
globalThis.CubicHermite = CubicHermite;
globalThis.Hermite = Hermite;

// src/Hermite/QuinticHermite.js
var QuinticHermite = class {
  static degree = 5;
  static variables = 1;
  static secondDerivatives = true;
  constructor(positionsOrOptions, values, derivatives, secondDerivatives, dimension = 1) {
    const config = normalizeConstructorArguments4(positionsOrOptions, values, derivatives, secondDerivatives, dimension);
    validateInput4(config.positions, config.values, config.derivatives, config.secondDerivatives, config.dimension);
    this.positions = config.positions;
    this.values = config.values;
    this.derivatives = config.derivatives;
    this.secondDerivatives = config.secondDerivatives;
    this.dimension = config.dimension;
  }
  static evaluate(positionsOrOptions, valuesOrPosition, derivatives, secondDerivatives, dimension = 1, position, output, outputOffset = 0) {
    if (isOptionsObject4(positionsOrOptions)) {
      const hermite2 = new this(positionsOrOptions);
      return hermite2.evaluate(valuesOrPosition, 0, derivatives, secondDerivatives ?? 0);
    }
    const hermite = new this(positionsOrOptions, valuesOrPosition, derivatives, secondDerivatives, dimension);
    return hermite.evaluate(position, 0, output, outputOffset);
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    return evaluateQuintic(this, position, inputOffset, output, outputOffset, 0);
  }
  derivative(position, inputOffset = 0, output, outputOffset = 0) {
    return evaluateQuintic(this, position, inputOffset, output, outputOffset, 1);
  }
  secondDerivative(position, inputOffset = 0, output, outputOffset = 0) {
    return evaluateQuintic(this, position, inputOffset, output, outputOffset, 2);
  }
  map(positions, handler) {
    validateSamplePositions(positions, 1);
    const sampleCount = positions.length;
    let output;
    if (handler)
      output = new this.values.constructor(this.dimension);
    else
      output = new this.values.constructor(sampleCount * this.dimension);
    for (let i = 0; i < positions.length; i++) {
      if (handler)
        handler(positions[i], this.evaluate(positions[i], 0, output, 0));
      else
        this.evaluate(positions[i], 0, output, i * this.dimension);
    }
    return handler ? this : output;
  }
  mapAsync(positions, options) {
    return Promise.resolve(this.map(positions, options?.handler));
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
};
function evaluateQuintic(hermite, position, inputOffset, output, outputOffset, order) {
  validateSamplePosition(position, 1);
  const outputNotProvided = !output;
  if (!output)
    output = new hermite.values.constructor(hermite.dimension);
  const x = typeof position === "number" ? position : position[inputOffset];
  const x0 = hermite.positions[0];
  const x1 = hermite.positions[1];
  const h = x1 - x0;
  const t = (x - x0) / h;
  const basis = getBasis(t, h, order);
  for (let i = 0; i < hermite.dimension; i++) {
    const y0 = hermite.values[i];
    const y1 = hermite.values[hermite.dimension + i];
    const m0 = hermite.derivatives[i];
    const m1 = hermite.derivatives[hermite.dimension + i];
    const a0 = hermite.secondDerivatives[i];
    const a1 = hermite.secondDerivatives[hermite.dimension + i];
    output[outputOffset + i] = basis[0] * y0 + basis[1] * h * m0 + basis[2] * h * h * a0 + basis[3] * y1 + basis[4] * h * m1 + basis[5] * h * h * a1;
  }
  if (outputNotProvided && hermite.dimension === 1)
    return output[outputOffset];
  else
    return output;
}
function getBasis(t, h, order) {
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  if (order === 0)
    return [
      1 - 10 * t3 + 15 * t4 - 6 * t5,
      t - 6 * t3 + 8 * t4 - 3 * t5,
      0.5 * (t2 - 3 * t3 + 3 * t4 - t5),
      10 * t3 - 15 * t4 + 6 * t5,
      -4 * t3 + 7 * t4 - 3 * t5,
      0.5 * (t3 - 2 * t4 + t5)
    ];
  if (order === 1)
    return [
      (-30 * t2 + 60 * t3 - 30 * t4) / h,
      1 - 18 * t2 + 32 * t3 - 15 * t4,
      h * (0.5 * (2 * t - 9 * t2 + 12 * t3 - 5 * t4)),
      (30 * t2 - 60 * t3 + 30 * t4) / h,
      -12 * t2 + 28 * t3 - 15 * t4,
      h * (0.5 * (3 * t2 - 8 * t3 + 5 * t4))
    ];
  return [
    (-60 * t + 180 * t2 - 120 * t3) / (h * h),
    (-36 * t + 96 * t2 - 60 * t3) / h,
    1 - 9 * t + 18 * t2 - 10 * t3,
    (60 * t - 180 * t2 + 120 * t3) / (h * h),
    (-24 * t + 84 * t2 - 60 * t3) / h,
    3 * t - 12 * t2 + 10 * t3
  ];
}
function normalizeConstructorArguments4(positionsOrOptions, values, derivatives, secondDerivatives, dimension) {
  if (isOptionsObject4(positionsOrOptions)) {
    return {
      positions: positionsOrOptions.positions,
      values: positionsOrOptions.values,
      derivatives: positionsOrOptions.derivatives,
      secondDerivatives: positionsOrOptions.secondDerivatives,
      dimension: positionsOrOptions.dimension ?? 1
    };
  }
  return {
    positions: positionsOrOptions,
    values,
    derivatives,
    secondDerivatives,
    dimension
  };
}
function isOptionsObject4(value) {
  return value && typeof value === "object" && !ArrayBuffer.isView(value) && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, "positions");
}
function validateInput4(positions, values, derivatives, secondDerivatives, dimension) {
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateArrayLike(derivatives, "derivatives");
  validateArrayLike(secondDerivatives, "secondDerivatives");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  validateFiniteValues(derivatives, "derivatives");
  validateFiniteValues(secondDerivatives, "secondDerivatives");
  if (positions.length !== 2)
    throw new RangeError("QuinticHermite expects exactly two positions.");
  if (positions[0] === positions[1])
    throw new RangeError("QuinticHermite positions must be unique.");
  if (values.length !== dimension * 2)
    throw new RangeError(`QuinticHermite expects ${dimension * 2} values for dimension ${dimension}, received ${values.length}.`);
  if (derivatives.length !== dimension * 2)
    throw new RangeError(`QuinticHermite expects ${dimension * 2} derivatives for dimension ${dimension}, received ${derivatives.length}.`);
  if (secondDerivatives.length !== dimension * 2)
    throw new RangeError(`QuinticHermite expects ${dimension * 2} secondDerivatives for dimension ${dimension}, received ${secondDerivatives.length}.`);
}
globalThis.QuinticHermite = QuinticHermite;

// src/Regression/normalization.js
function validateNormalizationMode(normalize) {
  const mode = typeof normalize === "object" && normalize ? normalize.mode : normalize;
  if (mode !== false && mode !== true && mode !== "standard" && mode !== "minmax") {
    throw new RangeError("normalize must be false, true, 'standard', or 'minmax'.");
  }
}
function createNormalization(positions, variables, normalize) {
  const mode = typeof normalize === "object" && normalize ? normalize.mode : normalize;
  if (mode === false)
    return null;
  const normalizedMode = mode === true ? "standard" : mode;
  const sampleCount = positions.length / variables;
  const offsets = new Array(variables).fill(0);
  const scales = new Array(variables).fill(1);
  for (let variable = 0; variable < variables; variable++) {
    if (normalizedMode === "minmax") {
      let min = Infinity;
      let max = -Infinity;
      for (let sample = 0; sample < sampleCount; sample++) {
        const value = positions[sample * variables + variable];
        if (value < min)
          min = value;
        if (value > max)
          max = value;
      }
      offsets[variable] = min;
      scales[variable] = max === min ? 1 : max - min;
    } else {
      let mean = 0;
      for (let sample = 0; sample < sampleCount; sample++)
        mean += positions[sample * variables + variable];
      mean /= sampleCount;
      let variance = 0;
      for (let sample = 0; sample < sampleCount; sample++) {
        const delta = positions[sample * variables + variable] - mean;
        variance += delta * delta;
      }
      offsets[variable] = mean;
      scales[variable] = variance === 0 ? 1 : Math.sqrt(variance / sampleCount);
    }
  }
  return { mode: normalizedMode, offsets, scales };
}
function applyNormalization(positions, variables, normalization) {
  if (!normalization)
    return positions;
  const output = new positions.constructor(positions.length);
  for (let i = 0; i < positions.length; i++) {
    const variable = i % variables;
    output[i] = (positions[i] - normalization.offsets[variable]) / normalization.scales[variable];
  }
  return output;
}
function normalizePosition(regression, position, inputOffset) {
  if (!regression.normalization && inputOffset === 0)
    return position;
  if (regression.variables === 1 && typeof position === "number") {
    if (!regression.normalization)
      return position;
    return (position - regression.normalization.offsets[0]) / regression.normalization.scales[0];
  }
  const output = new regression.positions.constructor(regression.variables);
  for (let variable = 0; variable < regression.variables; variable++) {
    let value = position[inputOffset + variable];
    if (regression.normalization)
      value = (value - regression.normalization.offsets[variable]) / regression.normalization.scales[variable];
    output[variable] = value;
  }
  return output;
}

// src/Regression/utils.js
function validateWeights(weights, sampleCount) {
  validateArrayLike(weights, "weights");
  validateFiniteValues(weights, "weights");
  if (weights.length !== sampleCount)
    throw new RangeError(`weights length must be ${sampleCount}.`);
  let positive = false;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] < 0)
      throw new RangeError("weights must be non-negative.");
    if (weights[i] > 0)
      positive = true;
  }
  if (!positive)
    throw new RangeError("weights must include at least one positive value.");
}
function createBaseWeights(weights, sampleCount) {
  if (weights === void 0)
    return new Array(sampleCount).fill(1);
  const output = new Array(sampleCount);
  for (let i = 0; i < sampleCount; i++)
    output[i] = weights[i];
  return output;
}
function copySamples(source, indices, stride) {
  const output = new source.constructor(indices.length * stride);
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    for (let item = 0; item < stride; item++)
      output[i * stride + item] = source[index * stride + item];
  }
  return output;
}
function copySampleWeights(source, indices) {
  const output = new source.constructor(indices.length);
  for (let i = 0; i < indices.length; i++)
    output[i] = source[indices[i]];
  return output;
}
function createIndexArray(indices) {
  const output = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++)
    output[i] = indices[i];
  return output;
}
function createRandom2(seed) {
  let state = Math.floor(Math.abs(seed)) >>> 0;
  if (state === 0)
    state = 1;
  return () => {
    state = 1664525 * state + 1013904223 >>> 0;
    return state / 4294967296;
  };
}

// src/Regression/linearAlgebra.js
function createExponents(variables, degree) {
  const output = [];
  collectExponents(variables, degree, 0, [], output);
  return output;
}
function evaluateBasis(position, inputOffset, exponents, variables) {
  let value = 1;
  for (let variable = 0; variable < variables; variable++) {
    const x = typeof position === "number" ? position : position[inputOffset + variable];
    value *= x ** exponents[variable];
  }
  return value;
}
function solveLinearSystem2(matrix, rhs) {
  const size = matrix.length;
  const a = matrix.map((row) => row.slice());
  const b = rhs.slice();
  for (let column = 0; column < size; column++) {
    let pivot = column;
    let pivotValue = Math.abs(a[column][column]);
    for (let row = column + 1; row < size; row++) {
      const value = Math.abs(a[row][column]);
      if (value > pivotValue) {
        pivot = row;
        pivotValue = value;
      }
    }
    if (pivotValue === 0)
      throw new RangeError("Regression normal equation matrix is singular.");
    if (pivot !== column) {
      const row = a[column];
      a[column] = a[pivot];
      a[pivot] = row;
      const value = b[column];
      b[column] = b[pivot];
      b[pivot] = value;
    }
    for (let row = column + 1; row < size; row++) {
      const factor = a[row][column] / a[column][column];
      if (factor === 0)
        continue;
      a[row][column] = 0;
      for (let item = column + 1; item < size; item++)
        a[row][item] -= factor * a[column][item];
      b[row] -= factor * b[column];
    }
  }
  const output = new Array(size);
  for (let row = size - 1; row >= 0; row--) {
    let value = b[row];
    for (let column = row + 1; column < size; column++)
      value -= a[row][column] * output[column];
    output[row] = value / a[row][row];
  }
  return output;
}
function collectExponents(variables, remaining, index, current, output) {
  if (index === variables) {
    output.push(current.slice());
    return;
  }
  for (let exponent = 0; exponent <= remaining; exponent++) {
    current[index] = exponent;
    collectExponents(variables, remaining - exponent, index + 1, current, output);
  }
}

// src/Regression/diagnostics.js
function residualSumOfSquares(regression, positions = regression.positions, values = regression.values) {
  const residuals = regression.residuals(positions, values);
  let total = 0;
  for (let i = 0; i < residuals.length; i++)
    total += residuals[i] * residuals[i];
  return total;
}
function totalSumOfSquares(regression, positions = regression.positions, values = regression.values) {
  validateSamplePositions(positions, regression.variables);
  validateArrayLike(values, "values");
  validateFiniteValues(values, "values");
  const sampleCount = positions.length / regression.variables;
  const means = new Array(regression.dimension).fill(0);
  let total = 0;
  if (values.length !== sampleCount * regression.dimension)
    throw new RangeError(`values length must be ${sampleCount * regression.dimension}.`);
  for (let sample = 0; sample < sampleCount; sample++) {
    for (let component = 0; component < regression.dimension; component++) {
      means[component] += values[sample * regression.dimension + component];
    }
  }
  for (let component = 0; component < regression.dimension; component++)
    means[component] /= sampleCount;
  for (let sample = 0; sample < sampleCount; sample++) {
    for (let component = 0; component < regression.dimension; component++) {
      const centered = values[sample * regression.dimension + component] - means[component];
      total += centered * centered;
    }
  }
  return total;
}
function meanAbsoluteError(regression, positions = regression.positions, values = regression.values) {
  const residuals = regression.residuals(positions, values);
  let total = 0;
  for (let i = 0; i < residuals.length; i++)
    total += Math.abs(residuals[i]);
  return total / residuals.length;
}
function informationCriterion(rss, observations, parameters, penalty) {
  if (rss === 0)
    return Number.NEGATIVE_INFINITY;
  return observations * Math.log(rss / observations) + penalty * parameters;
}
function computeLeverage(regression, positions = regression.positions) {
  validateSamplePositions(positions, regression.variables);
  const sampleCount = positions.length / regression.variables;
  const fitPositions = positions === regression.positions ? regression.fitPositions : applyNormalization(positions, regression.variables, regression.normalization);
  const termCount = regression.exponents.length;
  const matrix = createNormalMatrix(regression, regression.fitPositions, regression.positions.length / regression.variables);
  const output = new regression.values.constructor(sampleCount);
  for (let sample = 0; sample < sampleCount; sample++) {
    const basis = regression.exponents.map((exponent) => evaluateBasis(
      fitPositions,
      sample * regression.variables,
      exponent,
      regression.variables
    ));
    const solved = solveLinearSystem2(matrix, basis);
    const weight = fitPositions === regression.fitPositions && regression.weights ? regression.weights[sample] : 1;
    let leverage = 0;
    for (let i = 0; i < termCount; i++)
      leverage += basis[i] * solved[i];
    output[sample] = Math.max(0, Math.min(1, weight * leverage));
  }
  return output;
}
function computeStudentizedResiduals(regression, positions = regression.positions, values = regression.values) {
  validateSamplePositions(positions, regression.variables);
  validateArrayLike(values, "values");
  validateFiniteValues(values, "values");
  const sampleCount = positions.length / regression.variables;
  const residuals = regression.residuals(positions, values);
  const leverage = regression.leverage(positions);
  const output = new regression.values.constructor(residuals.length);
  const degrees = Math.max(1, values.length - regression.coefficients.length);
  const variance = regression.rss(positions, values) / degrees;
  const scale = variance <= 0 ? 0 : Math.sqrt(variance);
  if (values.length !== sampleCount * regression.dimension)
    throw new RangeError(`values length must be ${sampleCount * regression.dimension}.`);
  for (let sample = 0; sample < sampleCount; sample++) {
    const denominator = scale * Math.sqrt(Math.max(Number.EPSILON, 1 - leverage[sample]));
    for (let component = 0; component < regression.dimension; component++) {
      const index = sample * regression.dimension + component;
      output[index] = denominator === 0 ? 0 : residuals[index] / denominator;
    }
  }
  return output;
}
function computeCooksDistance(regression, positions = regression.positions, values = regression.values) {
  validateSamplePositions(positions, regression.variables);
  validateArrayLike(values, "values");
  validateFiniteValues(values, "values");
  const sampleCount = positions.length / regression.variables;
  const residuals = regression.residuals(positions, values);
  const leverage = regression.leverage(positions);
  const output = new regression.values.constructor(sampleCount);
  const parameterCount = Math.max(1, regression.exponents.length);
  const degrees = Math.max(1, values.length - regression.coefficients.length);
  const variance = regression.rss(positions, values) / degrees;
  if (values.length !== sampleCount * regression.dimension)
    throw new RangeError(`values length must be ${sampleCount * regression.dimension}.`);
  for (let sample = 0; sample < sampleCount; sample++) {
    let residualSquared = 0;
    for (let component = 0; component < regression.dimension; component++) {
      const residual = residuals[sample * regression.dimension + component];
      residualSquared += residual * residual;
    }
    const oneMinusH = Math.max(Number.EPSILON, 1 - leverage[sample]);
    output[sample] = variance === 0 ? 0 : residualSquared * leverage[sample] / (parameterCount * variance * oneMinusH * oneMinusH);
  }
  return output;
}
function influence(regression, positions = regression.positions, values = regression.values) {
  return {
    leverage: regression.leverage(positions),
    studentizedResiduals: regression.studentizedResiduals(positions, values),
    cooksDistance: regression.cooksDistance(positions, values)
  };
}
function createNormalMatrix(regression, positions, sampleCount) {
  const termCount = regression.exponents.length;
  const matrix = new Array(termCount).fill(0).map(() => new Array(termCount).fill(0));
  const weights = createBaseWeights(regression.weights, sampleCount);
  for (let sample = 0; sample < sampleCount; sample++) {
    const basis = regression.exponents.map((exponent) => evaluateBasis(
      positions,
      sample * regression.variables,
      exponent,
      regression.variables
    ));
    const weight = weights[sample];
    for (let row = 0; row < termCount; row++) {
      for (let column = 0; column < termCount; column++) {
        matrix[row][column] += weight * basis[row] * basis[column];
      }
    }
  }
  for (let i = 0; i < termCount; i++)
    matrix[i][i] += regression.regularization;
  return matrix;
}

// src/Regression/PolynomialRegression.js
var PolynomialRegression = class {
  constructor(options = {}) {
    const {
      positions,
      values,
      dimension = 1,
      variables = 1,
      degree = 1,
      regularization = 0,
      weights,
      robust = false,
      delta = 1,
      maxIterations = 20,
      tolerance = 1e-6,
      normalize = false
    } = options;
    validateInput5(positions, values, dimension, variables, degree, regularization, weights, robust, delta, maxIterations, tolerance, normalize);
    this.positions = positions;
    this.values = values;
    this.dimension = dimension;
    this.variables = variables;
    this.degree = degree;
    this.regularization = regularization;
    this.weights = weights;
    this.robust = robust;
    this.delta = delta;
    this.maxIterations = maxIterations;
    this.tolerance = tolerance;
    this.normalize = normalize;
    this.normalization = createNormalization(positions, variables, normalize);
    this.fitPositions = applyNormalization(positions, variables, this.normalization);
    this.exponents = createExponents(variables, degree);
    this.iterations = 0;
    this.coefficients = solveCoefficients(this);
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    validateSamplePosition(position, this.variables);
    const outputNotProvided = !output;
    if (!output)
      output = new this.values.constructor(this.dimension);
    const normalized = normalizePosition(this, position, inputOffset);
    for (let component = 0; component < this.dimension; component++)
      output[outputOffset + component] = 0;
    for (let term = 0; term < this.exponents.length; term++) {
      const basis = evaluateBasis(normalized, 0, this.exponents[term], this.variables);
      for (let component = 0; component < this.dimension; component++)
        output[outputOffset + component] += this.coefficients[component * this.exponents.length + term] * basis;
    }
    if (outputNotProvided && this.dimension === 1)
      return output[outputOffset];
    return output;
  }
  predict(position, inputOffset = 0, output, outputOffset = 0) {
    return this.evaluate(position, inputOffset, output, outputOffset);
  }
  map(positions, handler) {
    validateSamplePositions(positions, this.variables);
    const sampleCount = positions.length / this.variables;
    const input = new this.positions.constructor(this.variables);
    let output;
    if (handler)
      output = new this.values.constructor(this.dimension);
    else
      output = new this.values.constructor(sampleCount * this.dimension);
    for (let i = 0, index = 0; i < positions.length; i += this.variables, index++) {
      for (let j = 0; j < this.variables; j++)
        input[j] = positions[i + j];
      if (handler)
        handler(this.variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
      else
        this.evaluate(input, 0, output, index * this.dimension);
    }
    return handler ? this : output;
  }
  mapAsync(positions, options) {
    return Promise.resolve(this.map(positions, options?.handler));
  }
  residuals(positions = this.positions, values = this.values) {
    validateSamplePositions(positions, this.variables);
    validateArrayLike(values, "values");
    validateFiniteValues(values, "values");
    const predicted = this.map(positions);
    const output = new this.values.constructor(predicted.length);
    if (values.length !== predicted.length)
      throw new RangeError(`values length must be ${predicted.length}.`);
    for (let i = 0; i < predicted.length; i++)
      output[i] = values[i] - predicted[i];
    return output;
  }
  mse(positions = this.positions, values = this.values) {
    return this.rss(positions, values) / values.length;
  }
  rmse(positions = this.positions, values = this.values) {
    return Math.sqrt(this.mse(positions, values));
  }
  mae(positions = this.positions, values = this.values) {
    return meanAbsoluteError(this, positions, values);
  }
  rss(positions = this.positions, values = this.values) {
    return residualSumOfSquares(this, positions, values);
  }
  tss(positions = this.positions, values = this.values) {
    return totalSumOfSquares(this, positions, values);
  }
  aic(positions = this.positions, values = this.values) {
    return informationCriterion(this.rss(positions, values), values.length, this.coefficients.length, 2);
  }
  bic(positions = this.positions, values = this.values) {
    return informationCriterion(this.rss(positions, values), values.length, this.coefficients.length, Math.log(values.length));
  }
  leverage(positions = this.positions) {
    return computeLeverage(this, positions);
  }
  studentizedResiduals(positions = this.positions, values = this.values) {
    return computeStudentizedResiduals(this, positions, values);
  }
  cooksDistance(positions = this.positions, values = this.values) {
    return computeCooksDistance(this, positions, values);
  }
  r2(positions = this.positions, values = this.values) {
    const residualSum = this.rss(positions, values);
    const totalSum = this.tss(positions, values);
    return totalSum === 0 ? 1 : 1 - residualSum / totalSum;
  }
  score(positions = this.positions, values = this.values) {
    return this.r2(positions, values);
  }
  summary(positions = this.positions, values = this.values) {
    return {
      model: this.constructor.name,
      samples: positions.length / this.variables,
      variables: this.variables,
      dimension: this.dimension,
      degree: this.degree,
      regularization: this.regularization,
      robust: this.robust,
      normalize: this.normalize,
      iterations: this.iterations,
      coefficients: Array.from(this.coefficients),
      rss: this.rss(positions, values),
      tss: this.tss(positions, values),
      mse: this.mse(positions, values),
      rmse: this.rmse(positions, values),
      mae: this.mae(positions, values),
      r2: this.r2(positions, values),
      aic: this.aic(positions, values),
      bic: this.bic(positions, values)
    };
  }
  influence(positions = this.positions, values = this.values) {
    return influence(this, positions, values);
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
};
var LinearRegression = class extends PolynomialRegression {
  constructor(options = {}) {
    super({
      ...options,
      degree: 1
    });
  }
};
var RidgeRegression = class extends PolynomialRegression {
};
function validateInput5(positions, values, dimension, variables, degree, regularization, weights, robust, delta, maxIterations, tolerance, normalize) {
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  if (!Number.isInteger(variables) || variables < 1)
    throw new RangeError("variables must be a positive integer.");
  if (!Number.isInteger(degree) || degree < 0)
    throw new RangeError("degree must be a non-negative integer.");
  if (typeof regularization !== "number" || !Number.isFinite(regularization) || regularization < 0)
    throw new RangeError("regularization must be a non-negative finite number.");
  if (positions.length % variables !== 0)
    throw new RangeError(`positions length must be divisible by ${variables}.`);
  const sampleCount = positions.length / variables;
  if (sampleCount < 1)
    throw new RangeError("PolynomialRegression requires at least one sample.");
  if (values.length !== sampleCount * dimension)
    throw new RangeError(`PolynomialRegression expects ${sampleCount * dimension} values for dimension ${dimension}, received ${values.length}.`);
  if (weights !== void 0)
    validateWeights(weights, sampleCount);
  if (robust !== false && robust !== "huber")
    throw new RangeError("robust must be false or 'huber'.");
  if (typeof delta !== "number" || !Number.isFinite(delta) || delta <= 0)
    throw new RangeError("delta must be a positive finite number.");
  if (!Number.isInteger(maxIterations) || maxIterations < 1)
    throw new RangeError("maxIterations must be a positive integer.");
  if (typeof tolerance !== "number" || !Number.isFinite(tolerance) || tolerance < 0)
    throw new RangeError("tolerance must be a non-negative finite number.");
  validateNormalizationMode(normalize);
}
function solveCoefficients(regression) {
  const sampleCount = regression.positions.length / regression.variables;
  const baseWeights = createBaseWeights(regression.weights, sampleCount);
  if (regression.robust === "huber")
    return solveHuberCoefficients(regression, baseWeights);
  regression.iterations = 1;
  return solveWeightedCoefficients(regression, baseWeights);
}
function solveHuberCoefficients(regression, baseWeights) {
  const sampleCount = regression.positions.length / regression.variables;
  const weights = baseWeights.slice();
  let coefficients = solveWeightedCoefficients(regression, weights);
  let previous = coefficients;
  for (let iteration = 0; iteration < regression.maxIterations; iteration++) {
    for (let sample = 0; sample < sampleCount; sample++) {
      const residual = sampleResidualNorm(regression, previous, sample);
      const huberWeight = residual <= regression.delta ? 1 : regression.delta / residual;
      weights[sample] = baseWeights[sample] * huberWeight;
    }
    coefficients = solveWeightedCoefficients(regression, weights);
    regression.iterations = iteration + 1;
    if (coefficientDelta(previous, coefficients) <= regression.tolerance)
      return coefficients;
    previous = coefficients;
  }
  return coefficients;
}
function solveWeightedCoefficients(regression, weights) {
  const sampleCount = regression.positions.length / regression.variables;
  const termCount = regression.exponents.length;
  const matrix = new Array(termCount).fill(0).map(() => new Array(termCount).fill(0));
  const rhs = new Array(termCount).fill(0);
  const coefficients = new regression.values.constructor(termCount * regression.dimension).fill(0);
  for (let sample = 0; sample < sampleCount; sample++) {
    const basis = regression.exponents.map((exponent) => evaluateBasis(
      regression.fitPositions,
      sample * regression.variables,
      exponent,
      regression.variables
    ));
    const weight = weights[sample];
    for (let row = 0; row < termCount; row++) {
      for (let column = 0; column < termCount; column++)
        matrix[row][column] += weight * basis[row] * basis[column];
    }
    for (let component = 0; component < regression.dimension; component++) {
      const value = regression.values[sample * regression.dimension + component];
      for (let row = 0; row < termCount; row++)
        coefficients[component * termCount + row] += weight * basis[row] * value;
    }
  }
  for (let i = 0; i < termCount; i++)
    matrix[i][i] += regression.regularization;
  for (let component = 0; component < regression.dimension; component++) {
    for (let i = 0; i < termCount; i++)
      rhs[i] = coefficients[component * termCount + i];
    const solved = solveLinearSystem2(matrix, rhs);
    for (let i = 0; i < termCount; i++)
      coefficients[component * termCount + i] = solved[i];
  }
  return coefficients;
}
function sampleResidualNorm(regression, coefficients, sample) {
  const termCount = regression.exponents.length;
  let sum = 0;
  for (let component = 0; component < regression.dimension; component++) {
    let predicted = 0;
    for (let term = 0; term < termCount; term++) {
      const basis = evaluateBasis(
        regression.fitPositions,
        sample * regression.variables,
        regression.exponents[term],
        regression.variables
      );
      predicted += coefficients[component * termCount + term] * basis;
    }
    const residual = regression.values[sample * regression.dimension + component] - predicted;
    sum += residual * residual;
  }
  return Math.sqrt(sum);
}
function coefficientDelta(a, b) {
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    const scale = Math.max(1, Math.abs(a[i]), Math.abs(b[i]));
    const delta = Math.abs(a[i] - b[i]) / scale;
    if (delta > max)
      max = delta;
  }
  return max;
}
globalThis.PolynomialRegression = PolynomialRegression;
globalThis.LinearRegression = LinearRegression;
globalThis.RidgeRegression = RidgeRegression;

// src/Regression/RANSACRegression.js
var RANSACRegression = class {
  constructor(options = {}) {
    const {
      model = PolynomialRegression,
      positions,
      values,
      dimension = 1,
      variables = 1,
      threshold = 1,
      iterations = 100,
      sampleSize,
      minInliers,
      refit = true,
      seed = 123456789,
      ...modelOptions
    } = options;
    validateRANSACInput(model, positions, values, dimension, variables, threshold, iterations, sampleSize, minInliers, seed);
    this.modelType = model;
    this.positions = positions;
    this.values = values;
    this.dimension = dimension;
    this.variables = variables;
    this.threshold = threshold;
    this.iterations = iterations;
    this.seed = seed;
    this.refit = refit !== false;
    this.modelOptions = {
      ...modelOptions,
      positions,
      values,
      dimension,
      variables
    };
    this.sampleSize = sampleSize ?? getMinimumSampleSize(model, this.modelOptions, variables);
    this.minInliers = minInliers ?? this.sampleSize;
    const sampleCount = positions.length / variables;
    const fit = fitRANSAC(this, sampleCount);
    this.bestModel = fit.model;
    this.inlierMask = fit.inlierMask;
    this.inliers = createIndexArray(fit.inliers);
    this.outliers = createIndexArray(fit.outliers);
    this.bestError = fit.error;
    this.coefficients = this.bestModel.coefficients;
  }
  evaluate(position, inputOffset = 0, output, outputOffset = 0) {
    return this.bestModel.evaluate(position, inputOffset, output, outputOffset);
  }
  predict(position, inputOffset = 0, output, outputOffset = 0) {
    return this.evaluate(position, inputOffset, output, outputOffset);
  }
  map(positions, handler) {
    return this.bestModel.map(positions, handler);
  }
  mapAsync(positions, options) {
    return this.bestModel.mapAsync(positions, options);
  }
  residuals(positions = this.positions, values = this.values) {
    return this.bestModel.residuals(positions, values);
  }
  mse(positions = this.positions, values = this.values) {
    return this.bestModel.mse(positions, values);
  }
  rmse(positions = this.positions, values = this.values) {
    return this.bestModel.rmse(positions, values);
  }
  mae(positions = this.positions, values = this.values) {
    return this.bestModel.mae(positions, values);
  }
  rss(positions = this.positions, values = this.values) {
    return this.bestModel.rss(positions, values);
  }
  tss(positions = this.positions, values = this.values) {
    return this.bestModel.tss(positions, values);
  }
  aic(positions = this.positions, values = this.values) {
    return this.bestModel.aic(positions, values);
  }
  bic(positions = this.positions, values = this.values) {
    return this.bestModel.bic(positions, values);
  }
  leverage(positions = this.positions) {
    return this.bestModel.leverage(positions);
  }
  studentizedResiduals(positions = this.positions, values = this.values) {
    return this.bestModel.studentizedResiduals(positions, values);
  }
  cooksDistance(positions = this.positions, values = this.values) {
    return this.bestModel.cooksDistance(positions, values);
  }
  r2(positions = this.positions, values = this.values) {
    return this.bestModel.r2(positions, values);
  }
  score(positions = this.positions, values = this.values) {
    return this.bestModel.score(positions, values);
  }
  influence(positions = this.positions, values = this.values) {
    return this.bestModel.influence(positions, values);
  }
  summary(positions = this.positions, values = this.values) {
    const summary = this.bestModel.summary(positions, values);
    return {
      ...summary,
      model: this.constructor.name,
      baseModel: this.bestModel.constructor.name,
      inliers: this.inliers.length,
      outliers: this.outliers.length,
      bestError: this.bestError
    };
  }
  grid(options, handler) {
    return gridSample(this, options, handler);
  }
  slice(options, handler) {
    return sliceSample(this, options, handler);
  }
  random(count, options, handler) {
    return randomSample(this, count, options, handler);
  }
  latinHypercube(count, options, handler) {
    return latinHypercubeSample(this, count, options, handler);
  }
  poissonDisk(options, handler) {
    return poissonDiskSample(this, options, handler);
  }
  adaptive(start, end, options) {
    return adaptiveSample(this, start, end, options);
  }
  stream(options) {
    return streamSample(this, options);
  }
};
function validateRANSACInput(model, positions, values, dimension, variables, threshold, iterations, sampleSize, minInliers, seed) {
  if (typeof model !== "function")
    throw new TypeError("model must be a regression constructor.");
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  if (!Number.isInteger(variables) || variables < 1)
    throw new RangeError("variables must be a positive integer.");
  if (positions.length % variables !== 0)
    throw new RangeError(`positions length must be divisible by ${variables}.`);
  const sampleCount = positions.length / variables;
  if (sampleCount < 1)
    throw new RangeError("RANSACRegression requires at least one sample.");
  if (values.length !== sampleCount * dimension)
    throw new RangeError(`RANSACRegression expects ${sampleCount * dimension} values for dimension ${dimension}, received ${values.length}.`);
  if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < 0)
    throw new RangeError("threshold must be a non-negative finite number.");
  if (!Number.isInteger(iterations) || iterations < 1)
    throw new RangeError("iterations must be a positive integer.");
  if (sampleSize !== void 0 && (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > sampleCount))
    throw new RangeError(`sampleSize must be an integer from 1 to ${sampleCount}.`);
  if (minInliers !== void 0 && (!Number.isInteger(minInliers) || minInliers < 1 || minInliers > sampleCount))
    throw new RangeError(`minInliers must be an integer from 1 to ${sampleCount}.`);
  if (typeof seed !== "number" || !Number.isFinite(seed))
    throw new RangeError("seed must be a finite number.");
}
function fitRANSAC(regression, sampleCount) {
  if (regression.sampleSize > sampleCount)
    throw new RangeError(`sampleSize must be at most ${sampleCount}.`);
  if (regression.minInliers > sampleCount)
    throw new RangeError(`minInliers must be at most ${sampleCount}.`);
  let random = createRandom2(regression.seed);
  let best = null;
  for (let iteration = 0; iteration < regression.iterations; iteration++) {
    const sampleIndices = drawSample(sampleCount, regression.sampleSize, random);
    let candidate;
    try {
      candidate = createModelFromIndices(regression, sampleIndices);
    } catch (error) {
      if (error instanceof RangeError)
        continue;
      throw error;
    }
    const scored = scoreRANSACModel(regression, candidate, sampleCount);
    if (scored.inliers.length < regression.minInliers)
      continue;
    if (!best || scored.inliers.length > best.inliers.length || scored.inliers.length === best.inliers.length && scored.error < best.error)
      best = scored;
  }
  if (!best)
    throw new RangeError("RANSACRegression could not find a model with enough inliers.");
  if (regression.refit && best.inliers.length >= regression.sampleSize) {
    try {
      best.model = createModelFromIndices(regression, best.inliers);
      best = {
        ...scoreRANSACModel(regression, best.model, sampleCount),
        model: best.model
      };
    } catch (error) {
      if (!(error instanceof RangeError))
        throw error;
    }
  }
  return best;
}
function getMinimumSampleSize(model, options, variables) {
  const degree = model === LinearRegression ? 1 : options.degree ?? 1;
  return createExponents(variables, degree).length;
}
function createModelFromIndices(regression, indices) {
  const positions = copySamples(regression.positions, indices, regression.variables);
  const values = copySamples(regression.values, indices, regression.dimension);
  const weights = regression.modelOptions.weights ? copySampleWeights(regression.modelOptions.weights, indices) : void 0;
  const options = {
    ...regression.modelOptions,
    positions,
    values,
    dimension: regression.dimension,
    variables: regression.variables
  };
  if (weights)
    options.weights = weights;
  return new regression.modelType(options);
}
function scoreRANSACModel(regression, model, sampleCount) {
  const inliers = [];
  const outliers = [];
  const inlierMask = new Array(sampleCount).fill(false);
  let error = 0;
  for (let sample = 0; sample < sampleCount; sample++) {
    const residual = modelResidualNorm(regression, model, sample);
    if (residual <= regression.threshold) {
      inliers.push(sample);
      inlierMask[sample] = true;
      error += residual * residual;
    } else {
      outliers.push(sample);
    }
  }
  return { model, inliers, outliers, inlierMask, error };
}
function modelResidualNorm(regression, model, sample) {
  const output = regression.dimension === 1 ? void 0 : new regression.values.constructor(regression.dimension);
  const prediction = model.evaluate(
    regression.variables === 1 ? regression.positions[sample] : regression.positions,
    sample * regression.variables,
    output,
    0
  );
  let sum = 0;
  for (let component = 0; component < regression.dimension; component++) {
    const predicted = regression.dimension === 1 ? prediction : prediction[component];
    const residual = regression.values[sample * regression.dimension + component] - predicted;
    sum += residual * residual;
  }
  return Math.sqrt(sum);
}
function drawSample(sampleCount, size, random) {
  const indices = new Array(sampleCount);
  for (let i = 0; i < sampleCount; i++)
    indices[i] = i;
  for (let i = 0; i < size; i++) {
    const selected = i + Math.floor(random() * (sampleCount - i));
    const value = indices[i];
    indices[i] = indices[selected];
    indices[selected] = value;
  }
  return indices.slice(0, size);
}
globalThis.RANSACRegression = RANSACRegression;

// src/Regression/crossValidateRegression.js
function crossValidateRegression(options = {}) {
  const {
    model = PolynomialRegression,
    positions,
    values,
    dimension = 1,
    variables = 1,
    folds = 5,
    metric = "mse",
    seed = 123456789,
    shuffle: shuffle2 = true,
    ...modelOptions
  } = options;
  validateCrossValidationInput(model, positions, values, dimension, variables, folds, metric, seed);
  const sampleCount = positions.length / variables;
  const candidates = expandOptionGrid(modelOptions);
  const foldIndices = createFolds(sampleCount, folds, seed, shuffle2);
  const results = [];
  let best = null;
  for (const candidate of candidates) {
    const scores = [];
    for (const fold of foldIndices) {
      const trainIndices = [];
      const testIndices = fold;
      const testSet = new Set(testIndices);
      for (let sample = 0; sample < sampleCount; sample++) {
        if (!testSet.has(sample))
          trainIndices.push(sample);
      }
      const train = createSubset(positions, values, variables, dimension, trainIndices, candidate.weights);
      const test = createSubset(positions, values, variables, dimension, testIndices);
      const fitted = new model({
        ...candidate,
        positions: train.positions,
        values: train.values,
        weights: train.weights,
        variables,
        dimension
      });
      scores.push(scoreModel(fitted, test.positions, test.values, metric));
    }
    const mean = meanValue(scores);
    const std = standardDeviation(scores, mean);
    const result = { options: candidate, scores, mean, std };
    results.push(result);
    if (!best || isBetterScore(mean, best.mean, metric))
      best = result;
  }
  const bestModel = new model({
    ...best.options,
    positions,
    values,
    variables,
    dimension
  });
  return {
    bestModel,
    bestOptions: best.options,
    bestScore: best.mean,
    metric,
    folds,
    results
  };
}
function validateCrossValidationInput(model, positions, values, dimension, variables, folds, metric, seed) {
  if (typeof model !== "function")
    throw new TypeError("model must be a regression constructor.");
  validateDimension(dimension);
  validateArrayLike(positions, "positions");
  validateArrayLike(values, "values");
  validateFiniteValues(positions, "positions");
  validateFiniteValues(values, "values");
  if (!Number.isInteger(variables) || variables < 1)
    throw new RangeError("variables must be a positive integer.");
  if (positions.length % variables !== 0)
    throw new RangeError(`positions length must be divisible by ${variables}.`);
  const sampleCount = positions.length / variables;
  if (sampleCount < 2)
    throw new RangeError("crossValidateRegression requires at least two samples.");
  if (values.length !== sampleCount * dimension)
    throw new RangeError(`crossValidateRegression expects ${sampleCount * dimension} values for dimension ${dimension}, received ${values.length}.`);
  if (!Number.isInteger(folds) || folds < 2 || folds > sampleCount)
    throw new RangeError(`folds must be an integer from 2 to ${sampleCount}.`);
  if (metric !== "mse" && metric !== "rmse" && metric !== "mae" && metric !== "r2")
    throw new RangeError("metric must be 'mse', 'rmse', 'mae', or 'r2'.");
  if (typeof seed !== "number" || !Number.isFinite(seed))
    throw new RangeError("seed must be a finite number.");
}
function expandOptionGrid(options) {
  const entries = Object.entries(options);
  let candidates = [{}];
  for (const [key, value] of entries) {
    const values = isGridOption(key, value) ? value : [value];
    const next = [];
    for (const candidate of candidates) {
      for (const item of values)
        next.push({ ...candidate, [key]: item });
    }
    candidates = next;
  }
  return candidates;
}
function isGridOption(key, value) {
  if (key === "positions" || key === "values" || key === "weights")
    return false;
  return Array.isArray(value);
}
function createFolds(sampleCount, foldCount, seed, shuffle2) {
  const indices = new Array(sampleCount);
  for (let i = 0; i < sampleCount; i++)
    indices[i] = i;
  if (shuffle2) {
    const random = createRandom2(seed);
    for (let i = sampleCount - 1; i > 0; i--) {
      const selected = Math.floor(random() * (i + 1));
      const value = indices[i];
      indices[i] = indices[selected];
      indices[selected] = value;
    }
  }
  const folds = [];
  for (let fold = 0; fold < foldCount; fold++) {
    const start = Math.floor(fold * sampleCount / foldCount);
    const end = Math.floor((fold + 1) * sampleCount / foldCount);
    folds.push(indices.slice(start, end));
  }
  return folds;
}
function createSubset(positions, values, variables, dimension, indices, weights) {
  return {
    positions: copySamples(positions, indices, variables),
    values: copySamples(values, indices, dimension),
    weights: weights ? copySampleWeights(weights, indices) : void 0
  };
}
function scoreModel(model, positions, values, metric) {
  if (metric === "mse")
    return model.mse(positions, values);
  if (metric === "rmse")
    return Math.sqrt(model.mse(positions, values));
  if (metric === "r2")
    return model.r2(positions, values);
  const residuals = model.residuals(positions, values);
  let total = 0;
  for (let i = 0; i < residuals.length; i++)
    total += Math.abs(residuals[i]);
  return total / residuals.length;
}
function meanValue(values) {
  let total = 0;
  for (let i = 0; i < values.length; i++)
    total += values[i];
  return total / values.length;
}
function standardDeviation(values, mean) {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    const delta = values[i] - mean;
    total += delta * delta;
  }
  return Math.sqrt(total / values.length);
}
function isBetterScore(score, best, metric) {
  if (metric === "r2")
    return score > best;
  return score < best;
}
globalThis.crossValidateRegression = crossValidateRegression;
export {
  Bicubic,
  Bilinear,
  Biquadratic,
  Cubic,
  CubicHermite,
  Hermite,
  IDW,
  InterpolationMesh,
  InverseDistanceWeighting,
  Linear,
  LinearRegression,
  Mesh,
  Multicubic,
  Multilinear,
  Multipolynomial,
  Multiquadratic,
  Polynomial,
  PolynomialRegression,
  Quadratic,
  QuinticHermite,
  RANSACRegression,
  RBF,
  RadialBasisFunction,
  RidgeRegression,
  SimplexLinear,
  Spline,
  TensorPolynomial,
  TetrahedralLinear,
  TriangleLinear,
  Tricubic,
  Trilinear,
  Triquadratic,
  crossValidateRegression
};
