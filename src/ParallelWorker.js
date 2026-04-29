const NODE_WORKER_THREADS = [ 'node', 'worker_threads' ].join( ':' );

const evaluators = new Map();
const port = await getWorkerPort();

port.onMessage( task => {

	try {

		if ( task.config ) evaluators.set( task.config.key, prepareConfig( task.config ) );

		const config = evaluators.get( task.key );

		if ( !config ) throw new Error( `Missing evaluator config "${ task.key }".` );

		const values = mapPositions( config, task.positions, task.outputBuffer, task.outputOffset );
		const response = {
			id: task.id,
			outputOffset: task.outputOffset,
			values
		};
		const transferList = values ? getTransferList( values ) : undefined;

		port.postMessage( response, transferList );

	} catch ( error ) {

		port.postMessage( {
			id: task.id,
			error: error.message || String( error )
		} );

	}

} );

async function getWorkerPort() {

	if (
		typeof self !== 'undefined'
		&& typeof self.addEventListener === 'function'
		&& typeof self.postMessage === 'function'
	) {

		return {
			onMessage( handler ) {

				self.addEventListener( 'message', event => handler( event.data ) );

			},
			postMessage( message, transferList ) {

				self.postMessage( message, transferList );

			}
		};

	}

	const { parentPort } = await import( NODE_WORKER_THREADS );

	return {
		onMessage( handler ) {

			parentPort.on( 'message', handler );

		},
		postMessage( message, transferList ) {

			parentPort.postMessage( message, transferList );

		}
	};

};

function mapPositions( config, positions, outputBuffer, outputOffset ) {

	const output = outputBuffer
		? new config.outputType( outputBuffer )
		: new config.outputType(
			positions.length / config.variables * config.dimension
		);
	const input = new positions.constructor( config.variables );
	const outputStart = outputBuffer ? outputOffset : 0;

	for ( let i = 0, index = 0; i < positions.length; i += config.variables, index ++ ) {

		for ( let j = 0; j < config.variables; j ++ ) {

			input[ j ] = positions[ i + j ];

		}

		evaluate( config, input, output, outputStart + index * config.dimension );

	}

	return outputBuffer ? null : output;

};

function getTransferList( values ) {

	if ( !ArrayBuffer.isView( values ) ) return undefined;
	if (
		typeof SharedArrayBuffer !== 'undefined'
		&& values.buffer instanceof SharedArrayBuffer
	) return undefined;

	return [ values.buffer ];

};

function prepareConfig( config ) {

	if ( config.type === 'tensor-polynomial' ) return prepareTensorPolynomialConfig( config );

	const size = (config.degree + 1) ** config.variables;

	return {
		...config,
		outputType: config.coefficients.constructor,
		size,
		evaluateKernel: createEvaluateKernel( config )
	};

};

function createEvaluateKernel( config ) {

	const d = config.degree + 1;
	const size = d ** config.variables;
	const positionVars = [];
	const terms = [];

	for ( let k = 0; k < config.variables; k ++ ) {

		positionVars.push( `const p${ k } = position[ ${ k } ];` );

	}

	for ( let j = 0; j < size; j ++ ) {

		const factors = [];

		for ( let k = 0; k < config.variables; k ++ ) {

			const exponent = Math.floor( (j / d ** k) % d );

			if ( exponent === 1 ) factors.push( `p${ k }` );
			else if ( exponent === 2 ) factors.push( `p${ k } * p${ k }` );
			else if ( exponent === 3 ) factors.push( `p${ k } * p${ k } * p${ k }` );
			else if ( exponent > 3 ) factors.push( `p${ k } ** ${ exponent }` );

		}

		const factor = factors.length > 0 ? factors.join( ' * ' ) : '1';

		terms.push( `coefficients[ base + ${ j } ] * ${ factor }` );

	}

	return new Function(
		'coefficients',
		'position',
		'output',
		'outputOffset',
		'dimension',
		'size',
		`${ positionVars.join( '\n' ) }
for ( let i = 0; i < dimension; i ++ ) {
	const base = i * size;
	output[ outputOffset + i ] = ${ terms.join( ' + ' ) };
}`
	);

};

function evaluate( config, position, output, outputOffset ) {

	if ( config.type === 'tensor-polynomial' ) {

		evaluateTensorPolynomial( config, position, output, outputOffset );

	} else {

		config.evaluateKernel(
			config.coefficients,
			position,
			output,
			outputOffset,
			config.dimension,
			config.size
		);

	}

};

function prepareTensorPolynomialConfig( config ) {

	return {
		...config,
		outputType: config.values.constructor,
		pointsPerAxis: config.degree + 1,
		sampleCount: (config.degree + 1) ** config.variables
	};

};

function evaluateTensorPolynomial( config, position, output, outputOffset ) {

	const weights = createAxisWeights( config, position );

	for ( let i = 0; i < config.dimension; i ++ ) output[ outputOffset + i ] = 0;

	for ( let sample = 0; sample < config.sampleCount; sample ++ ) {

		let weight = 1;
		let stride = 1;

		for ( let variable = 0; variable < config.variables; variable ++ ) {

			const point = Math.floor( sample / stride ) % config.pointsPerAxis;

			weight *= weights[ variable * config.pointsPerAxis + point ];
			stride *= config.pointsPerAxis;

		}

		for ( let i = 0; i < config.dimension; i ++ ) {

			output[ outputOffset + i ] += config.values[ sample * config.dimension + i ] * weight;

		}

	}

};

function createAxisWeights( config, position ) {

	const weights = new config.positions.constructor( config.variables * config.pointsPerAxis );

	for ( let variable = 0; variable < config.variables; variable ++ ) {

		const value = position[ variable ];

		for ( let point = 0; point < config.pointsPerAxis; point ++ ) {

			let weight = 1;
			const pointValue = config.positions[ point * config.variables + variable ];

			for ( let other = 0; other < config.pointsPerAxis; other ++ ) {

				if ( other === point ) continue;

				const otherValue = config.positions[ other * config.variables + variable ];

				weight *= (value - otherValue) / (pointValue - otherValue);

			}

			weights[ variable * config.pointsPerAxis + point ] = weight;

		}

	}

	return weights;

};
