(() => {
  // src/Evaluator.js
  var Evaluator = class {
    static degree;
    static variables;
    constructor(positions, values, dimension = 1) {
      this.positions = positions;
      this.values = values;
      this.dimension = dimension;
      const degree = this.constructor.degree;
      const variables = this.constructor.variables;
      const length = (degree + 1) ** variables;
      const type = this.values.constructor;
      this.coefficients = new type(dimension * length).fill(0);
      this.update();
    }
    update() {
      this.coefficients = this.constructor.coefficients(
        this.positions,
        this.values,
        this.dimension,
        this.coefficients
      );
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
    step(start, end, size, handler) {
      const dimension = this.dimension;
      const variables = this.constructor.variables;
      let length = 0;
      for (let i = 0; i < variables; i++) {
        const _start = typeof start === "number" ? start : start[i];
        const _end = typeof end === "number" ? end : end[i];
        const _size = typeof size === "number" ? size : size[i];
        length += Math.floor(Math.abs(_end - _start) / _size);
      }
      length *= dimension;
      const input = new this.positions.constructor(variables);
      let output;
      if (handler)
        output = new this.values.constructor(dimension).fill(0);
      else
        output = new this.values.constructor(length).fill(0);
      for (let i = 0; i <= length; i += dimension) {
        for (let j = 0; j < variables; j++) {
          const multiplier = Math.floor(i / variables);
          const _start = typeof start === "number" ? start : start[j];
          const _size = typeof start === "number" ? size : size[j];
          input[j] = _start + multiplier * _size;
        }
        if (handler)
          handler(variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
        else
          this.evaluate(input, 0, output, i);
      }
      return handler ? this : output;
    }
    segment(start, end, amount, handler) {
      const dimension = this.dimension;
      const variables = this.constructor.variables;
      let length = 0;
      if (typeof amount === "number")
        length += amount;
      else
        for (let i = 0; i < variables; i++)
          length += amount[i];
      length *= dimension;
      const input = new this.positions.constructor(dimension);
      let output;
      if (handler)
        output = this.values.constructor(dimension).fill(0);
      else
        output = this.values.constructor(length).fill(0);
      for (let i = 0; i < length; i += dimension) {
        for (let d = 0; d < dimension; d++) {
          const multiplier = Math.floor(i / dimension);
          const _start = typeof start === "number" ? start : start[d];
          const _end = typeof end === "number" ? end : end[d];
          const _amount = typeof amount === "number" ? amount : amount[d];
          const size = (_end - _start) / _amount;
          input[d] = _start + multiplier * size;
        }
        if (handler)
          handler(variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
        else
          this.evaluate(input, 0, output, i);
      }
      return handler ? this : output;
    }
    map(positions, handler) {
      const variables = this.constructor.variables;
      const dimension = this.dimension;
      const length = dimension * positions.length;
      const input = new this.positions.constructor(variables);
      let output;
      if (handler) {
        output = new this.values.constructor(dimension);
      } else
        output = new this.values.constructor(length).fill(0);
      for (let i = 0, index = 0; i < positions.length; i += variables) {
        for (let j = 0; j < variables; j++) {
          input[j] = positions[i + j];
        }
        if (handler) {
          handler(variables > 1 ? input : input[0], this.evaluate(input, 0, output, 0));
        } else
          this.evaluate(input, 0, output, i);
      }
      return handler ? this : output;
    }
  };

  // src/Linear/Linear.js
  var Linear = class extends Evaluator {
    static degree = 1;
    static variables = 1;
    static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
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
    evaluate(position, inputOffset = 0, output, outputOffset = 0) {
      const dimension = this.dimension;
      if (!output)
        output = new this.values.constructor(dimension);
      const x = position[0];
      const y = position[1];
      for (let i = 0, index = 0; i < dimension; i++) {
        const c00 = this.coefficients[index++];
        const c10 = this.coefficients[index++];
        const c20 = this.coefficients[index++];
        const c30 = this.coefficients[index++];
        const c01 = this.coefficients[index++];
        const c11 = this.coefficients[index++];
        const c21 = this.coefficients[index++];
        const c31 = this.coefficients[index++];
        const c02 = this.coefficients[index++];
        const c12 = this.coefficients[index++];
        const c22 = this.coefficients[index++];
        const c32 = this.coefficients[index++];
        const c03 = this.coefficients[index++];
        const c13 = this.coefficients[index++];
        const c23 = this.coefficients[index++];
        const c33 = this.coefficients[index++];
        output[i] = c00 + c10 * x + c20 * x ** 2 + c30 * x ** 3 + (c01 + c11 * x + c21 * x ** 2 + c31 * x ** 3) * y + (c02 + c12 * x + c22 * x ** 2 + c32 * x ** 3) * y ** 2 + (c03 + c13 * x + c23 * x ** 2 + c33 * x ** 3) * y ** 3;
      }
      return output;
    }
  };
  globalThis.Bicubic = Bicubic;

  // src/Cubic/Tricubic.js
  var Tricubic = class extends Evaluator {
    static degree = 3;
    static variables = 3;
    static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
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
})();
