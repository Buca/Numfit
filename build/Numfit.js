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
      const length2 = (degree + 1) ** variables;
      const type = this.values.constructor;
      this.coefficients = new type(dimension * length2).fill(0);
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
      const length2 = positions.length;
      for (let i = 0; i < length2; i += variables) {
        if (variables === 1 && typeof scale === "number" && typeof orgin === "number") {
          positions[i] += offset;
        } else {
          for (let j = 0; j < variables; j++) {
            positions[i + j] += offset[j];
          }
        }
      }
      return this;
    }
    scale(scale2, orgin2) {
      const variables = this.constructor.variables;
      const positions = this.positions;
      const length2 = positions.length;
      for (let i = 0; i < length2; i += variables) {
        if (variables === 1 && typeof scale2 === "number" && typeof orgin2 === "number") {
          const x4 = positions[i];
          positions[i] = (x4 - orgin2) * scale2 + orgin2;
        } else {
          for (let j = 0; j < variables; j++) {
            const x4 = positions[i + j];
            const s = scale2[j];
            const o = orgin2[j];
            positions[i + j] = (x4 - o) * s + o;
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
      if (dimension === 1 && outputNotProvided)
        return output[0];
      else
        return output;
    }
    step(start, end, size, handler) {
      const dimension = this.dimension;
      const variables = this.constructor.variables;
      let length2 = 0;
      for (let i = 0; i < variables; i++) {
        length2 += Math.floor(Math.abs(end[i] - start[i]) / size[i]);
      }
      length2 *= dimension;
      const input = new this.positions.constructor(variables);
      let output;
      if (handler)
        output = new this.values.constructor(dimension).fill(0);
      else
        output = new this.values.constructor(length2).fill(0);
      for (let i = 0; i < length2; i += dimension) {
        for (let j = 0; j < variables; j++) {
          const multiplier = Math.floor(i / variables);
          input[j] = start[j] + multiplier * size[j];
        }
        if (handler)
          handler(input, this.evaluate(input, 0, output, 0));
        else
          this.evaluate(input, 0, output, i);
      }
      return handler ? this : output;
    }
    segment(start, end, amount, handler) {
      const dimension = this.dimension;
      const variables = this.constructor.variables;
      let length2 = 0;
      for (let i = 0; i < variables; i++)
        length2 += amount[i];
      length2 *= dimension;
      const input = new this.positions.constructor(dimension);
      let output;
      if (handler)
        output = this.values.constructor(dimension).fill(0);
      else
        output = this.values.constructor(length2).fill(0);
      for (let i = 0; i < length2; i += dimension) {
        for (let d = 0; d < dimension; d++) {
          const size = (end[d] - start[d]) / amount[d];
          const multiplier = Math.floor(i / dimension);
          input[d] = start[d] + multiplier * size;
        }
        if (handler)
          handler(input, this.evaluate(input, 0, output, 0));
        else
          this.evaluate(input, 0, output, i);
      }
      return handler ? this : output;
    }
    map(positions, handler) {
      const variables = this.constructor.variables;
      const dimension = this.dimension;
      let input;
      let output;
      if (handler) {
        input = this.positions.constructor(variables);
        output = this.values.constructor(dimension);
      } else
        output = this.values.constructor(length).fill(0);
      for (let i = 0; i < positions.length; i += variables) {
        for (let j = 0; j < variables; j++) {
          input[j] = positions[i + j];
        }
        if (handler)
          handler(input, this.evaluate(input, 0, output, 0));
        else
          this.evaluate(input, i, output, i * dimension);
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
        const x4 = position[i];
        output[i + outputOffset] = c1 * x4 + c0;
      }
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
      const x02 = positions[0];
      const y02 = positions[1];
      const x12 = positions[2];
      const y12 = positions[3];
      const inv = 1 / ((x12 - x02) * (y12 - y02));
      let index = 0;
      for (let i = 0; i < dimension; i++) {
        let k = i;
        const v002 = values[k];
        const v012 = values[k += dimension];
        const v102 = values[k += dimension];
        const v112 = values[k += dimension];
        output[index++] = (x12 * y12 * v002 - x12 * y02 * v102 - x02 * y12 * v012 + x02 * y02 * v112) * inv;
        output[index++] = (-y12 * v002 + y02 * v102 + y12 * v012 - y02 * v112) * inv;
        output[index++] = (-x12 * v002 + x12 * v102 + x02 * v012 - x02 * v112) * inv;
        output[index++] = (v002 - v102 - v012 + v112) * inv;
      }
      return output;
    }
    static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
      if (!output)
        output = new values.constructor(dimension);
      const x4 = position[0];
      const y4 = position[1];
      const x02 = positions[0];
      const y02 = positions[1];
      const x12 = positions[2];
      const y12 = positions[3];
      const k0 = (x4 - x12) / (x02 - x12);
      const k1 = (x4 - x02) / (x12 - x02);
      const q0 = (y4 - y12) / (y02 - y12);
      const q1 = (y4 - y02) / (y12 - y02);
      let index = 0;
      for (let i = 0; i < dimension; i++) {
        const v002 = values[index++];
        const v102 = values[index++];
        const v012 = values[index++];
        const v112 = values[index++];
        const v0 = v002 * k0 + v102 * k1;
        const v1 = v012 * k0 + v112 * k1;
        output[outputOffset + i] = v0 * q0 + v1 * q1;
      }
      return output;
    }
    constructor(positions = new Float32Array(4), values = new Float32Array(4), dimension = 1) {
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
      const x4 = position[0];
      const y4 = position[1];
      const z = position[2];
      const x02 = positions[0];
      const y02 = positions[1];
      const z0 = positions[2];
      const x12 = positions[3];
      const y12 = positions[4];
      const z1 = positions[5];
      const dX0 = (x4 - x12) / (x02 - x12);
      const dX1 = (x4 - x02) / (x12 - x02);
      const dY0 = (y4 - y12) / (y02 - y12);
      const dY1 = (y4 - y02) / (y12 - y02);
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
        const v002 = v000 * dX0 + v100 * dX1;
        const v102 = v010 * dX0 + v110 * dX1;
        const v012 = v001 * dX0 + v101 * dX1;
        const v112 = v011 * dX0 + v111 * dX1;
        const v0 = v002 * dY0 + v102 * dY1;
        const v1 = v012 * dY0 + v112 * dY1;
        output[outputOffset + index2++] = v0 * dZ0 + v1 * dZ1;
      }
      return output;
    }
    static coefficients(positions, values, dimension = 1, position, output, outputOffset = 0) {
      if (!output)
        output = new values.constructor(dimension * 8);
      const x02 = positions[0];
      const y02 = positions[1];
      const z0 = positions[2];
      const x12 = positions[3];
      const y12 = positions[4];
      const z1 = positions[5];
      const inv = 1 / ((x12 - x02) * (y12 - y02) * (z1 - z0));
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
        const c000 = (-v000 * x12 * y12 * z1 + v001 * x12 * y12 * z0 + v010 * x12 * y02 * z1 - v011 * x12 * y02 * z0 + v100 * x02 * y12 * z1 - v101 * x02 * y12 * z0 - v110 * x02 * y02 * z1 + v111 * x02 * y02 * z0) * inv;
        const c100 = (v000 * y12 * z1 - v001 * y12 * z0 - v010 * y02 * z1 + v011 * y02 * z0 - v100 * y12 * z1 + v101 * y12 * z0 + v110 * y02 * z1 - v111 * y02 * z0) * inv;
        const c010 = (v000 * x12 * z1 - v001 * x12 * z0 - v010 * x12 * z1 + v011 * x12 * z0 - v100 * x02 * z1 + v101 * x02 * z0 + v110 * x02 * z1 - v111 * x02 * z0) * inv;
        const c110 = (-v000 * z1 + v001 * z0 + v010 * z1 - v011 * z0 + v100 * z1 - v101 * z0 - v110 * z1 + v111 * z0) * inv;
        const c001 = (v000 * x12 * y12 - v001 * x12 * y12 - v010 * x12 * y02 + v011 * x12 * y02 - v100 * x02 * y12 + v101 * x02 * y12 + v110 * x02 * y02 - v111 * x02 * y02) * inv;
        const c101 = (-v000 * y12 + v001 * y12 + v010 * y02 - v011 * y02 + v100 * y12 - v101 * y12 - v110 * y02 + v111 * y02) * inv;
        const c011 = (-v000 * x12 + v001 * x12 + v010 * x12 - v011 * x12 + v100 * x02 - v101 * x02 - v110 * x02 + v111 * x02) * inv;
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
      const x4 = position[inputOffset + 0];
      const y4 = position[inputOffset + 1];
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
        output[outputOffset + i] = -(c000 + c100 * x4 + c010 * y4 + c110 * x4 * y4 + (c001 + c101 * x4 + c011 * y4 + c111 * x4 * y4) * z);
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
      const x02 = positions[0];
      const x12 = positions[1];
      const x22 = positions[2];
      const r0 = 1 / ((x02 - x12) * (x02 - x22));
      const r1 = 1 / ((x12 - x02) * (x12 - x22));
      const r2 = 1 / ((x22 - x02) * (x22 - x12));
      for (let i = 0, j = 0, d = dimension; i < d; i++) {
        let k = i;
        const v0 = values[k] * r0;
        const v1 = values[k += d] * r1;
        const v2 = values[k += d] * r2;
        const c0 = v0 * x12 * x22 + v1 * x02 * x22 + v2 * x02 * x12;
        const c1 = -(v0 * (x12 + x22) + v1 * (x02 + x22) + v2 * (x02 + x12));
        const c2 = v0 + v1 + v2;
        output[outputOffset + j++] = c0;
        output[outputOffset + j++] = c1;
        output[outputOffset + j++] = c2;
      }
      return output;
    }
    static evaluate(x02, x12, x22, v0, v1, v2, x4) {
      const dX0 = x4 - x02;
      const dX1 = x4 - x12;
      const dX2 = x4 - x22;
      const dX01 = x02 - x12;
      const dX02 = x02 - x22;
      const dX12 = x12 - x22;
      return dX1 * dX2 / (dX01 * dX02) * v0 - dX0 * dX2 / (dX01 * dX12) * v1 + dX0 * dX1 / (dX01 * dX02) * v2;
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
    static evaluate(x02, y02, x12, y12, x22, y22, w00, w10, w20, w01, w11, w21, w02, w12, w22, x4, y4) {
      const dX0 = x4 - x02;
      const dX1 = x4 - x12;
      const dX2 = x4 - x22;
      const dX01 = x02 - x12;
      const dX02 = x02 - x22;
      const dX12 = x12 - x22;
      const k0 = dX1 * dX2 / (d01 * d02);
      const k1 = -(dX1 * dX2) / (d01 * d02);
      const k2 = dX1 * dX2 / (d01 * d02);
      const w0 = k0 * w00 - k1 * w10 + k2 * w20;
      const w1 = k0 * w01 - k1 * w11 + k2 * w21;
      const w2 = k0 * w02 - k1 * w12 + k2 * w22;
      const dY0 = y4 - y02;
      const dY1 = y4 - y12;
      const dY2 = y4 - y22;
      const dY01 = y02 - y12;
      const dY02 = y02 - y22;
      const dY12 = y12 - y22;
      return dY1 * dY2 / (dY01 * dY02) * w0 - dY0 * dY2 / (dY01 * dY12) * w1 + dY0 * dY1 / (dY01 * dY02) * w2;
    }
    static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
      if (!output)
        output = new values.constructor(dimension * 9);
      const x02 = positions[0];
      const y02 = positions[1];
      const x12 = positions[2];
      const y12 = positions[3];
      const x22 = positions[4];
      const y22 = positions[5];
      const x01 = x02 * x12;
      const x022 = x02 * x22;
      const x122 = x12 * x22;
      const y01 = y02 * y12;
      const y022 = y02 * y22;
      const y122 = y12 * y22;
      const qX0 = 1 / ((x02 - x12) * (x02 - x22));
      const qX1 = 1 / ((x12 - x02) * (x12 - x22));
      const qX2 = 1 / ((x22 - x02) * (x22 - x12));
      const qY0 = 1 / ((y02 - y12) * (y02 - y22));
      const qY1 = 1 / ((y12 - y02) * (y12 - y22));
      const qY2 = 1 / ((y22 - y02) * (y22 - y12));
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
        const v002 = v[k] * r00;
        const v012 = v[k += d] * r01;
        const v022 = v[k += d] * r02;
        const v102 = v[k += d] * r10;
        const v112 = v[k += d] * r11;
        const v122 = v[k += d] * r12;
        const v202 = v[k += d] * r20;
        const v212 = v[k += d] * r21;
        const v222 = v[k += d] * r22;
        const c00 = y122 * (v002 * x122 + v102 * x022 + v202 * x01) + y022 * (v012 * x122 + v112 * x022 + v212 * x01) + y01 * (v022 * x122 + v122 * x022 + v222 * x01);
        const c10 = -(y12 + y22) * (v002 * x122 - v102 * x022 - v202 * x01) - (y02 + y22) * (v012 * x122 - v112 * x022 - v212 * x01) - (y02 + y12) * (v022 * x122 - v122 * x022 - v222 * x01);
        const c01 = -(x12 + x22) * (v002 * y122 - v012 * y022 - v022 * y01) - (x02 + x22) * (v102 * y122 - v112 * y022 - v122 * y01) - (x02 + x12) * (v202 * y122 - v212 * y022 - v222 * y01);
        const c20 = v002 * y122 - v102 * y122 - v202 * y122 + v012 * y022 - v112 * y022 - v212 * y022 + v022 * y01 - v122 * y01 - v222 * y01;
        const c02 = v002 * x122 - v012 * x122 - v022 * x122 + v102 * x022 - v112 * x022 - v122 * x022 + v202 * x01 - v212 * x01 - v222 * x01;
        const c11 = (y12 + y22) * (v002 * (x12 + x22) + v102 * (x02 + x22) + v202 * (x02 + x12)) + (y02 + y22) * (v012 * (x12 + x22) + v112 * (x02 + x22) + v212 * (x02 + x12)) + (y02 + y12) * (v022 * (x12 + x22) + v122 * (x02 + x22) + v222 * (x02 + x12));
        const c21 = -(y12 + y22) * (v002 + v102 + v202) - (y02 + y22) * (v012 + v112 + v212) - (y02 + y12) * (v022 + v122 + v222);
        const c12 = -(x12 + x22) * (v002 + v012 + v022) - (x02 + x22) * (v102 + v112 + v122) - (x02 + x12) * (v202 + v212 + v222);
        const c22 = v002 + v102 + v202 + v012 + v112 + v212 + v022 + v122 + v222;
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
      const x02 = positions[0];
      const y02 = positions[1];
      const z0 = positions[2];
      const x12 = positions[3];
      const y12 = positions[4];
      const z1 = positions[5];
      const x22 = positions[6];
      const y22 = positions[7];
      const z2 = positions[8];
      const qX0 = 1 / ((x02 - x12) * (x02 - x22));
      const qX1 = 1 / ((x12 - x02) * (x12 - x22));
      const qX2 = 1 / ((x22 - x02) * (x22 - x12));
      const qY0 = 1 / ((y02 - y12) * (y02 - y22));
      const qY1 = 1 / ((y12 - y02) * (y12 - y22));
      const qY2 = 1 / ((y22 - y02) * (y22 - y12));
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
      hX[0] = x12 * x22;
      hX[1] = x02 * x22;
      hX[2] = x02 * x12;
      hX[3] = -(x12 + x22);
      hX[4] = -(x02 + x22);
      hX[5] = -(x02 + x12);
      hX[6] = 1;
      hX[7] = 1;
      hX[8] = 1;
      hY[0] = y12 * y22;
      hY[1] = y02 * y22;
      hY[2] = y02 * y12;
      hY[3] = -(y12 + y22);
      hY[4] = -(y02 + y22);
      hY[5] = -(y02 + y12);
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
          for (let y4 = 0, iY = 0; y4 < 3; y4++) {
            const hY0 = hY[iY++];
            const hY1 = hY[iY++];
            const hY2 = hY[iY++];
            for (let x4 = 0, iX = 0; x4 < 3; x4++) {
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
    static evaluate(x02, y02, z0, x12, y12, z1, x22, y22, z2, v000, v100, v200, v010, v110, v210, v020, v120, v220, v001, v101, v201, v011, v111, v211, v021, v121, v221, v002, v102, v202, v012, v112, v212, v022, v122, v222, x4, y4, z) {
      const rX0 = (x4 - x12) * (x4 - x22) / ((x02 - x12) * (x02 - x22));
      const rX1 = (x4 - x02) * (x4 - x22) / ((x12 - x02) * (x12 - x22));
      const rX2 = (x4 - x02) * (x4 - x12) / ((x22 - x02) * (x22 - x12));
      const v003 = v000 * rX0 + v100 * rX1 + v200 * rX2;
      const v103 = v010 * rX0 + v110 * rX1 + v210 * rX2;
      const v203 = v020 * rX0 + v120 * rX1 + v220 * rX2;
      const v013 = v001 * rX0 + v101 * rX1 + v201 * rX2;
      const v113 = v011 * rX0 + v111 * rX1 + v211 * rX2;
      const v213 = v021 * rX0 + v121 * rX1 + v221 * rX2;
      const v023 = v002 * rX0 + v102 * rX1 + v202 * rX2;
      const v123 = v012 * rX0 + v112 * rX1 + v212 * rX2;
      const v223 = v022 * rX0 + v122 * rX1 + v222 * rX2;
      const rY0 = (y4 - y12) * (y4 - y22) / ((y02 - y12) * (y02 - y22));
      const rY1 = (y4 - y02) * (y4 - y22) / ((y12 - y02) * (y12 - y22));
      const rY2 = (y4 - y02) * (y4 - y12) / ((y22 - y02) * (y22 - y12));
      const v0 = v003 * rY0 + v103 * rY1 + v203 * rY2;
      const v1 = v013 * rY0 + v113 * rY1 + v213 * rY2;
      const v2 = v023 * rY0 + v123 * rY1 + v223 * rY2;
      const rZ0 = (z - z1) * (z - z2) / ((z0 - z1) * (z0 - z2));
      const rZ1 = (z - z0) * (z - z2) / ((z1 - z0) * (z1 - z2));
      const rZ2 = (z - z0) * (z - z1) / ((z2 - z0) * (z2 - z1));
      return v0 * rZ0 + v1 * rZ1 + v2 * rZ2;
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
      const x02 = positions[0];
      const x12 = positions[1];
      const x22 = positions[2];
      const x32 = positions[3];
      const d012 = x02 - x12;
      const d022 = x02 - x22;
      const d03 = x02 - x32;
      const d12 = x12 - x22;
      const d13 = x12 - x32;
      const d23 = x22 - x32;
      let index = 0;
      for (let i = 0; i < dimension; i++) {
        const x4 = position[i];
        const v0 = values[i];
        const v1 = values[i + dimension];
        const v2 = values[i + 2 * dimension];
        const v3 = values[i + 3 * dimension];
        const d0 = x4 - x02;
        const d1 = x4 - x12;
        const d2 = x4 - x22;
        const d3 = x4 - x32;
        const h0 = d012 * d022 * d03;
        const h1 = d012 * d12 * d13;
        const h2 = d022 * d12 * d23;
        const h3 = d03 * d13 * d23;
        output[outputOffset + i] = v0 * (d1 * d2 * d3) / h0 - v1 * (d0 * d2 * d3) / h1 + v2 * (d0 * d1 * d3) / h2 - v3 * (d0 * d1 * d2) / h3;
      }
      return output;
    }
    static coefficients(positions, values, dimension = 1, output, outputOffset = 0) {
      if (!output)
        output = new values.constructor(4 * dimension);
      const x02 = positions[0];
      const x12 = positions[1];
      const x22 = positions[2];
      const x32 = positions[3];
      const x01 = x02 * x12;
      const x022 = x02 * x22;
      const x03 = x02 * x32;
      const x122 = x12 * x22;
      const x13 = x12 * x32;
      const x23 = x22 * x32;
      const x012 = x01 * x22;
      const x013 = x01 * x32;
      const x023 = x022 * x32;
      const x123 = x122 * x32;
      const k0 = 1 / (x02 ** 3 - (x01 + x022 + x03) * x02 + (x012 + x013 + x023) - x123);
      const k1 = 1 / (x12 ** 3 - (x01 + x122 + x13) * x12 + (x012 + x013 + x123) - x023);
      const k2 = 1 / (x22 ** 3 - (x022 + x122 + x23) * x22 + (x012 + x023 + x123) - x013);
      const k3 = 1 / (x32 ** 3 - (x03 + x13 + x23) * x32 + (x013 + x023 + x123) - x012);
      for (let i = 0, index = 0; i < dimension; i++) {
        const r0 = values[i] * k0;
        const r1 = values[i + dimension] * k1;
        const r2 = values[i + 2 * dimension] * k2;
        const r3 = values[i + 3 * dimension] * k3;
        const c0 = -(r0 * x123 + r1 * x023 + r2 * x013 + r3 * x012);
        const c1 = r0 * (x122 + x13 + x23) + r1 * (x022 + x03 + x23) + r2 * (x01 + x03 + x13) + r3 * (x01 + x022 + x122);
        const c2 = -(r0 * (x12 + x22 + x32) + r1 * (x02 + x22 + x32) + r2 * (x02 + x12 + x32) + r3 * (x02 + x12 + x22));
        const c3 = r0 + r1 + r2 + r3;
        output[outputOffset + index++] = c0;
        output[outputOffset + index++] = c1;
        output[outputOffset + index++] = c2;
        output[outputOffset + index++] = c3;
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
      const x02 = positions[0];
      const y02 = positions[1];
      const x12 = positions[2];
      const y12 = positions[3];
      const x22 = positions[4];
      const y22 = positions[5];
      const x32 = positions[6];
      const y32 = positions[7];
      const x01 = x02 * x12;
      const x022 = x02 * x22;
      const x03 = x02 * x32;
      const x122 = x12 * x22;
      const x13 = x12 * x32;
      const x23 = x22 * x32;
      const x012 = x01 * x22;
      const x013 = x01 * x32;
      const x023 = x022 * x32;
      const x123 = x122 * x32;
      const hX01 = x122 + x13 + x23;
      const hX11 = x022 + x03 + x23;
      const hX21 = x01 + x03 + x13;
      const hX31 = x01 + x022 + x122;
      const hX02 = x12 + x22 + x32;
      const hX12 = x02 + x22 + x32;
      const hX22 = x02 + x12 + x32;
      const hX32 = x02 + x12 + x22;
      const hX0 = [-x123, -x023, -x013, -x012];
      const hX1 = [hX01, hX11, hX21, hX31];
      const hX2 = [-hX02, -hX12, -hX22, -hX32];
      const hX3 = [1, 1, 1, 1];
      const dX01 = x02 - x12;
      const dX02 = x02 - x22;
      const dX03 = x02 - x32;
      const dX12 = x12 - x22;
      const dX13 = x12 - x32;
      const dX23 = x22 - x32;
      const y01 = y02 * y12;
      const y022 = y02 * y22;
      const y03 = y02 * y32;
      const y122 = y12 * y22;
      const y13 = y12 * y32;
      const y23 = y22 * y32;
      const y012 = y01 * y22;
      const y013 = y01 * y32;
      const y023 = y022 * y32;
      const y123 = y122 * y32;
      const dY01 = y02 - y12;
      const dY02 = y02 - y22;
      const dY03 = y02 - y32;
      const dY12 = y12 - y22;
      const dY13 = y12 - y32;
      const dY23 = y22 - y32;
      const q0 = 1 / (dX01 * dX02 * dX03);
      const q1 = -1 / (dX01 * dX12 * dX13);
      const q2 = 1 / (dX02 * dX12 * dX23);
      const q3 = -1 / (dX03 * dX13 * dX23);
      const p0 = 1 / (dY01 * dY02 * dY03);
      const p1 = -1 / (dY01 * dY12 * dY13);
      const p2 = 1 / (dY02 * dY12 * dY23);
      const p3 = -1 / (dY03 * dY13 * dY23);
      const hY01 = y122 + y13 + y23;
      const hY11 = y022 + y03 + y23;
      const hY21 = y01 + y03 + y13;
      const hY31 = y01 + y022 + y122;
      const hY02 = y12 + y22 + y32;
      const hY12 = y02 + y22 + y32;
      const hY22 = y02 + y12 + y32;
      const hY32 = y02 + y12 + y22;
      const hY0 = [-y123, -y023, -y013, -y012];
      const hY1 = [hY01, hY11, hY21, hY31];
      const hY2 = [-hY02, -hY12, -hY22, -hY32];
      const hY3 = hX3;
      const r = new Float32Array(16);
      for (let i = 0, index = 0; i < dimension; i++) {
        let k = i;
        const v002 = values[k];
        const v102 = values[k += dimension];
        const v202 = values[k += dimension];
        const v302 = values[k += dimension];
        const v012 = values[k += dimension];
        const v112 = values[k += dimension];
        const v212 = values[k += dimension];
        const v312 = values[k += dimension];
        const v022 = values[k += dimension];
        const v122 = values[k += dimension];
        const v222 = values[k += dimension];
        const v322 = values[k += dimension];
        const v032 = values[k += dimension];
        const v132 = values[k += dimension];
        const v232 = values[k += dimension];
        const v332 = values[k += dimension];
        r[0] = v002 * q0 * p0;
        r[1] = v102 * q1 * p0;
        r[2] = v202 * q2 * p0;
        r[3] = v302 * q3 * p0;
        r[4] = v012 * q0 * p1;
        r[5] = v112 * q1 * p1;
        r[6] = v212 * q2 * p1;
        r[7] = v312 * q3 * p1;
        r[8] = v022 * q0 * p2;
        r[9] = v122 * q1 * p2;
        r[10] = v222 * q2 * p2;
        r[11] = v322 * q3 * p2;
        r[12] = v032 * q0 * p3;
        r[13] = v132 * q1 * p3;
        r[14] = v232 * q2 * p3;
        r[15] = v332 * q3 * p3;
        output[outputOffset + index++] = g(hX0, r, hY0);
        output[outputOffset + index++] = g(hX1, r, hY0);
        output[outputOffset + index++] = g(hX2, r, hY0);
        output[outputOffset + index++] = g(hX3, r, hY0);
        output[outputOffset + index++] = g(hX0, r, hY1);
        output[outputOffset + index++] = g(hX1, r, hY1);
        output[outputOffset + index++] = g(hX2, r, hY1);
        output[outputOffset + index++] = g(hX3, r, hY1);
        output[outputOffset + index++] = g(hX0, r, hY2);
        output[outputOffset + index++] = g(hX1, r, hY2);
        output[outputOffset + index++] = g(hX2, r, hY2);
        output[outputOffset + index++] = g(hX3, r, hY2);
        output[outputOffset + index++] = g(hX0, r, hY3);
        output[outputOffset + index++] = g(hX1, r, hY3);
        output[outputOffset + index++] = g(hX2, r, hY3);
        output[outputOffset + index++] = g(hX3, r, hY3);
      }
      return output;
    }
    static evaluate(positions, values, dimension = 1, position, output, outputOffset = 0) {
      if (!output)
        output = new values.constructor(dimension);
      const dX0 = x - x0;
      const dX1 = x - x1;
      const dX2 = x - x2;
      const dX3 = x - x3;
      const dX01 = x0 - x1;
      const dX02 = x0 - x1;
      const dX03 = x0 - x2;
      const dX12 = x1 - x2;
      const dX13 = x1 - x3;
      const dX23 = x2 - x3;
      const dY0 = y - y0;
      const dY1 = y - y1;
      const dY2 = y - y2;
      const dY3 = y - y3;
      const dY01 = y0 - y1;
      const dY02 = y0 - y1;
      const dY03 = y0 - y2;
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
      const v0 = v00 * dX123 + v10 * dX023 + v20 * dX013 + v30 * dX012;
      const v1 = v01 * dX123 + v11 * dX023 + v21 * dX013 + v31 * dX012;
      const v2 = v02 * dX123 + v12 * dX023 + v22 * dX013 + v32 * dX012;
      const v3 = v03 * dX123 + v13 * dX023 + v23 * dX013 + v33 * dX012;
      return v0 * dY123 + v1 * dY023 + v2 * dY013 + v3 * dY012;
    }
    constructor(positions, values, dimension = 1) {
      super(positions, values, dimension);
    }
    evaluate(position, inputOffset = 0, output, outputOffset = 0) {
      const dimension = this.dimension;
      if (!output)
        output = new this.values.constructor(dimension);
      const x4 = position[0];
      const y4 = position[1];
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
        output[i] = c00 + c10 * x4 + c20 * x4 ** 2 + c30 * x4 ** 3 + (c01 + c11 * x4 + c21 * x4 ** 2 + c31 * x4 ** 3) * y4 + (c02 + c12 * x4 + c22 * x4 ** 2 + c32 * x4 ** 3) * y4 ** 2 + (c03 + c13 * x4 + c23 * x4 ** 2 + c33 * x4 ** 3) * y4 ** 3;
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
      const x02 = positions[0];
      const y02 = positions[1];
      const z0 = positions[2];
      const x12 = positions[3];
      const y12 = positions[4];
      const z1 = positions[5];
      const x22 = positions[6];
      const y22 = positions[7];
      const z2 = positions[8];
      const x32 = positions[9];
      const y32 = positions[10];
      const z3 = positions[11];
      const qX = new positions.constructor(4);
      const qY = new positions.constructor(4);
      const qZ = new positions.constructor(4);
      qX[0] = 1 / ((x02 - x12) * (x02 - x22) * (x02 - x32));
      qX[1] = 1 / ((x12 - x02) * (x12 - x22) * (x12 - x32));
      qX[2] = 1 / ((x22 - x02) * (x22 - x12) * (x22 - x32));
      qX[3] = 1 / ((x32 - x02) * (x32 - x12) * (x32 - x22));
      qY[0] = 1 / ((y02 - y12) * (y02 - y22) * (y02 - y32));
      qY[1] = 1 / ((y12 - y02) * (y12 - y22) * (y12 - y32));
      qY[2] = 1 / ((y22 - y02) * (y22 - y12) * (y22 - y32));
      qY[3] = 1 / ((y32 - y02) * (y32 - y12) * (y32 - y22));
      qZ[0] = 1 / ((z0 - z1) * (z0 - z2) * (z0 - z3));
      qZ[1] = 1 / ((z1 - z0) * (z1 - z2) * (z1 - z3));
      qZ[2] = 1 / ((z2 - z0) * (z2 - z1) * (z2 - z3));
      qZ[3] = 1 / ((z3 - z0) * (z3 - z1) * (z3 - z2));
      const x01 = x02 * x12;
      const x022 = x02 * x22;
      const x03 = x02 * x32;
      const x122 = x12 * x22;
      const x13 = x12 * x32;
      const x23 = x22 * x32;
      const y01 = y02 * y12;
      const y022 = y02 * y22;
      const y03 = y02 * y32;
      const y122 = y12 * y22;
      const y13 = y12 * y32;
      const y23 = y22 * y32;
      const z01 = z0 * z1;
      const z02 = z0 * z2;
      const z03 = z0 * z3;
      const z12 = z1 * z2;
      const z13 = z1 * z3;
      const z23 = z2 * z3;
      const hX = new Float32Array(16);
      const hY = new Float32Array(16);
      const hZ = new Float32Array(16);
      hX[0] = -x122 * x32;
      hX[1] = -x022 * x32;
      hX[2] = -x01 * x32;
      hX[3] = -x01 * x22;
      hX[4] = x122 + x13 + x23;
      hX[5] = x022 + x03 + x23;
      hX[6] = x01 + x03 + x13;
      hX[7] = x01 + x022 + x122;
      hX[8] = -(x12 + x22 + x32);
      hX[9] = -(x02 + x22 + x32);
      hX[10] = -(x02 + x12 + x32);
      hX[11] = -(x02 + x12 + x22);
      hX[12] = 1;
      hX[13] = 1;
      hX[14] = 1;
      hX[15] = 1;
      hY[0] = -y122 * y32;
      hY[1] = -y022 * y32;
      hY[2] = -y01 * y32;
      hY[3] = -y01 * y22;
      hY[4] = y122 + y13 + y23;
      hY[5] = y022 + y03 + y23;
      hY[6] = y01 + y03 + y13;
      hY[7] = y01 + y022 + y122;
      hY[8] = -(y12 + y22 + y32);
      hY[9] = -(y02 + y22 + y32);
      hY[10] = -(y02 + y12 + y32);
      hY[11] = -(y02 + y12 + y22);
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
      const x4 = position[0];
      const y4 = position[1];
      const z = position[2];
      const x02 = positions[0];
      const y02 = positions[1];
      const z0 = positions[2];
      const x12 = positions[3];
      const y12 = positions[4];
      const z1 = positions[5];
      const x22 = positions[6];
      const y22 = positions[7];
      const z2 = positions[8];
      const x32 = positions[9];
      const y32 = positions[10];
      const z3 = positions[11];
      const rX0 = (x4 - x12) * (x4 - x22) * (x4 - x32) / ((x02 - x12) * (x02 - x22) * (x02 - x32));
      const rX1 = (x4 - x02) * (x4 - x22) * (x4 - x32) / ((x12 - x02) * (x12 - x22) * (x12 - x32));
      const rX2 = (x4 - x02) * (x4 - x12) * (x4 - x32) / ((x22 - x02) * (x22 - x12) * (x22 - x32));
      const rX3 = (x4 - x02) * (x4 - x12) * (x4 - x22) / ((x32 - x02) * (x32 - x12) * (x32 - x22));
      const rY0 = (y4 - y12) * (y4 - y22) * (y4 - y32) / ((y02 - y12) * (y02 - y22) * (y02 - y32));
      const rY1 = (y4 - y02) * (y4 - y22) * (y4 - y32) / ((y12 - y02) * (y12 - y22) * (y12 - y32));
      const rY2 = (y4 - y02) * (y4 - y12) * (y4 - y32) / ((y22 - y02) * (y22 - y12) * (y22 - y32));
      const rY3 = (y4 - y02) * (y4 - y12) * (y4 - y22) / ((y32 - y02) * (y32 - y12) * (y32 - y22));
      const rZ0 = (z - z1) * (z - z2) * (z - z3) / ((z0 - z1) * (z0 - z2) * (z0 - z3));
      const rZ1 = (z - z0) * (z - z2) * (z - z3) / ((z1 - z0) * (z1 - z2) * (z1 - z3));
      const rZ2 = (z - z0) * (z - z1) * (z - z3) / ((z2 - z0) * (z2 - z1) * (z2 - z3));
      const rZ3 = (z - z0) * (z - z1) * (z - z2) / ((z3 - z0) * (z3 - z1) * (z3 - z2));
      for (let i = 0, index = 0; i < dimension; i++) {
        const v000 = values[index++];
        const v100 = values[index++];
        const v200 = values[index++];
        const v300 = values[index++];
        const v010 = values[index++];
        const v110 = values[index++];
        const v210 = values[index++];
        const v310 = values[index++];
        const v020 = values[index++];
        const v120 = values[index++];
        const v220 = values[index++];
        const v320 = values[index++];
        const v030 = values[index++];
        const v130 = values[index++];
        const v230 = values[index++];
        const v330 = values[index++];
        const v001 = values[index++];
        const v101 = values[index++];
        const v201 = values[index++];
        const v301 = values[index++];
        const v011 = values[index++];
        const v111 = values[index++];
        const v211 = values[index++];
        const v311 = values[index++];
        const v021 = values[index++];
        const v121 = values[index++];
        const v221 = values[index++];
        const v321 = values[index++];
        const v031 = values[index++];
        const v131 = values[index++];
        const v231 = values[index++];
        const v331 = values[index++];
        const v002 = values[index++];
        const v102 = values[index++];
        const v202 = values[index++];
        const v302 = values[index++];
        const v012 = values[index++];
        const v112 = values[index++];
        const v212 = values[index++];
        const v312 = values[index++];
        const v022 = values[index++];
        const v122 = values[index++];
        const v222 = values[index++];
        const v322 = values[index++];
        const v032 = values[index++];
        const v132 = values[index++];
        const v232 = values[index++];
        const v332 = values[index++];
        const v003 = values[index++];
        const v103 = values[index++];
        const v203 = values[index++];
        const v303 = values[index++];
        const v013 = values[index++];
        const v113 = values[index++];
        const v213 = values[index++];
        const v313 = values[index++];
        const v023 = values[index++];
        const v123 = values[index++];
        const v223 = values[index++];
        const v323 = values[index++];
        const v033 = values[index++];
        const v133 = values[index++];
        const v233 = values[index++];
        const v333 = values[index++];
        const v004 = v000 * rX0 + v100 * rX1 + v200 * rX2 + v300 * rX3;
        const v104 = v010 * rX0 + v110 * rX1 + v210 * rX2 + v310 * rX3;
        const v204 = v020 * rX0 + v120 * rX1 + v220 * rX2 + v320 * rX3;
        const v304 = v020 * rx0 + v130 * rX1 + v230 * rX2 + v330 * rX3;
        const v014 = v001 * rX0 + v101 * rX1 + v201 * rX2 + v301 * rX3;
        const v114 = v011 * rX0 + v111 * rX1 + v211 * rX2 + v311 * rX3;
        const v214 = v021 * rX0 + v121 * rX1 + v221 * rX2 + v321 * rX3;
        const v314 = v021 * rx0 + v131 * rX1 + v231 * rX2 + v331 * rX3;
        const v024 = v002 * rX0 + v102 * rX1 + v202 * rX2 + v302 * rX3;
        const v124 = v012 * rX0 + v112 * rX1 + v212 * rX2 + v312 * rX3;
        const v224 = v022 * rX0 + v122 * rX1 + v222 * rX2 + v322 * rX3;
        const v324 = v022 * rx0 + v132 * rX1 + v232 * rX2 + v332 * rX3;
        const v034 = v003 * rX0 + v103 * rX1 + v203 * rX2 + v303 * rX3;
        const v134 = v013 * rX0 + v113 * rX1 + v213 * rX2 + v313 * rX3;
        const v234 = v023 * rX0 + v123 * rX1 + v223 * rX2 + v323 * rX3;
        const v334 = v023 * rx0 + v133 * rX1 + v233 * rX2 + v333 * rX3;
        const v0 = v004 * rY0 + v104 * rY1 + v204 * rY2 + v304 * rY3;
        const v1 = v014 * rY0 + v114 * rY1 + v214 * rY2 + v314 * rY3;
        const v2 = v024 * rY0 + v124 * rY1 + v224 * rY2 + v324 * rY3;
        const v3 = v024 * rY0 + v124 * rY1 + v224 * rY2 + v334 * rY3;
        output[outputOffset + i] = v0 * rZ0 + v1 * rZ1 + v2 * rZ2 + v3 * rZ3;
      }
      return output;
    }
    constructor(positions, values, dimension) {
      super(positions, values, dimension);
    }
  };
  globalThis.Tricubic = Tricubic;
})();
