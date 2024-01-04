export default class Evaluator {

	static degree;
	static variables;

	constructor( 
	
		positions, values, dimension = 1
	
	) {

		this.positions = positions;
		this.values = values;
		this.dimension = dimension;
		
		const degree = this.constructor.degree;
		const variables = this.constructor.variables;
		const length = (degree + 1)**variables;
		const type = this.values.constructor;

		this.coefficients = new type( dimension*length ).fill( 0 );

		this.update();

	};

	update() {

		this.coefficients = this.constructor.coefficients(
			this.positions,
			this.values,
			this.dimension,
			this.coefficients
		);

		return this;

	};

	translate( offset ) {

		const variables = this.constructor.variables;
		const positions = this.positions;
		const length = positions.length;

		for ( let i = 0; i < length; i += variables ) {
			
			if ( variables === 1 && typeof scale === 'number' && typeof orgin === 'number' ) {

				positions[ i ] += offset;

			} else {				

				for ( let j = 0; j < variables; j ++ ) {

					positions[ i + j ] += offset[ j ];
				
				}

			}

		}

		return this;

	};

	scale( scale, orgin ) {

		const variables = this.constructor.variables;
		const positions = this.positions;
		const length = positions.length;

		for ( let i = 0; i < length; i += variables ) {

			if ( variables === 1 && typeof scale === 'number' && typeof orgin === 'number' ) {

				const x = positions[ i ];
				positions[ i ] = (x - orgin)*scale + orgin;

			} else {

				for ( let j = 0; j < variables; j ++ ) {

					const x = positions[ i + j ];
					const s = scale[ j ];
					const o = orgin[ j ];

					positions[ i + j ] = (x - o)*s + o;
				
				}

			}

		}

		return this;

	};

	evaluate(

		position, inputOffset = 0,
		output, outputOffset = 0
	
	) {

		const dimension = this.dimension;
		const degree = this.constructor.degree;
		const variables = this.constructor.variables;
		const d = degree + 1;

		const outputNotProvided = !output;

		if ( !output ) output = new this.values.constructor( dimension );

		const size = (degree + 1)**variables;

		for ( let i = 0; i < dimension; i ++ ) {

			output[ outputOffset + i ] = 0;

			for ( let j = 0; j < size; j ++ ) {

				const c = this.coefficients[ i*size + j ];
				let v = 1;

				for ( let k = 0; k < variables; k ++ ) {

					const exponent = Math.floor((j / d**k ) % d);

					if ( typeof position === 'number' ) {

						v *= position**exponent;

					} else {

						v *= position[ inputOffset + k ]**exponent;

					}

				}
				
				output[ outputOffset + i ] += c*v;

			}

		}

		if ( dimension === 1 && outputNotProvided ) return output[ 0 ];
		else return output;



	};

	step( 

		start, end, size, 
		handler 

	) {

		const dimension = this.dimension;
		const variables = this.constructor.variables;

		let length = 0;

		for ( let i = 0; i < variables; i ++ ) {

			length += Math.floor( Math.abs( end[ i ] - start[ i ] )/size[ i ] );

		}

		length *= dimension;

		const input = new this.positions.constructor( variables );
		let output;

		if ( handler ) output = new this.values.constructor( dimension ).fill( 0 );
		else output = new this.values.constructor( length ).fill( 0 );

		for ( let i = 0; i < length; i += dimension ) {

			for ( let j = 0; j < variables; j ++ ) {

				const multiplier = Math.floor( i/variables );
				
				input[ j ] = start[ j ] + multiplier*size[ j ];


			}

			if ( handler ) handler( input, this.evaluate( input, 0, output, 0 ) );
			else this.evaluate( input, 0, output, i )

		}

		return handler ? this : output;

	};

	segment( 

		start, end, amount, 
		handler 

	) {

		const dimension = this.dimension;
		const variables = this.constructor.variables;

		let length = 0;

		for ( let i = 0; i < variables; i ++ ) length += amount[ i ];

		length *= dimension;

		const input = new this.positions.constructor( dimension );
		let output;

		if ( handler ) output = this.values.constructor( dimension ).fill( 0 );
		else output = this.values.constructor( length ).fill( 0 );

		for ( let i = 0; i < length; i += dimension ) {

			for ( let d = 0; d < dimension; d ++ ) {

				const size = ( end[ d ] - start[ d ] ) / amount[ d ];
				const multiplier = Math.floor( i/dimension )

				input[ d ] = start[ d ] + multiplier*size;

			}

			if ( handler ) handler( input, this.evaluate( input, 0, output, 0 ) );
			else this.evaluate( input, 0, output, i );

		}

		return handler ? this : output;

	};

	map( 

		positions, 
		handler 

	) {

		const variables = this.constructor.variables;
		const dimension = this.dimension;

		let input;
		let output;

		if ( handler ) {

			input = this.positions.constructor( variables );
			output = this.values.constructor( dimension );

		}

		else output = this.values.constructor( length ).fill( 0 );

		for ( let i = 0; i < positions.length; i += variables ) {

			for ( let j = 0; j < variables; j ++ ) {
				input[ j ] = positions[ i + j ];
			}

			if ( handler ) handler( input, this.evaluate( input, 0, output, 0 ) );
			else this.evaluate( input, i, output, i*dimension );

		}

		return handler ? this : output;

	};

};