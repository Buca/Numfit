<p align="center">
  <img width="353" height="140" src="numfit-logo.png">
</p>

**Numfit** is a versatile JavaScript library that excels at numerical interpolation and extrapolation, extending its prowess to solving the coefficients of polynomial equations. It currently boasts nine distinct classes tailored for interpolation and extrapolation tasks:
- Linear
- Bilinear
- Trilinear
- Quadratic
- Biquadratic
- Triquadratic
- Cubic
- Bicubic
- Tricubic

## Installation

### NodeJS Enviroment

#### Using NPM

#### Using Yarn

### Browser Enviroment
There's a couple ways to use **Numfit** in you browser based projects:
 
#### Using CDN (Recommended)

To harness the library without the complexities of local deployment, consider employing a Content Delivery Network (CDN). Simply incorporate the following script tag into your HTML document's `<head>` section:

```html
<script src="https://cdn.jsdelivr.net/gh/buca/numfit/build/Numfit.min.js"></script>
```

#### Using a Local Copy

Alternatively, you can opt for a local deployment of the library. Locate the `/build/` directory within this repository and download either the standard `Numfit.js` file or the minified version `Numfit.min.js`. Then, incorporate the downloaded file into your HTML document's `<head>` section using a `<script>` tag:

```html
<script src="my-directory/Numfit.min.js"></script>
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
Running the build and testing procedures is easy. First make sure you have ```npm``` installed. Secondly navigate to the root directory ```/``` in your CLI and run ```npm install --save-dev``` which will install two dependencies required in the build and testing phases, ```esbuild``` and ```vitest``` respectively.

### Building
To run the build procedure, you simply navigate to the root directory ```/``` in your CLI and run
```npm run build``` which will produce two files in the ```/build/``` directory: ```Numfit.js``` and ```Numfit.min.js```.

### Testing
To run the tests, you again navigate to the root directory ```/``` in your CLI and run
```npm run test``` which will produce the test results.

## Roadmap
Features that we are planning to support down the road are:
- [ ] More types of samplers. Currently supports ```step```, ```segment``` and ```map```.
- [ ] Polynomial
- [ ] Multilinear
- [ ] Multiquadratic
- [ ] Multicubic
- [ ] Multipolynomial
- [ ] Linear Regression
- [ ] Support for hermite interpolation (defining derivatives)
- [ ] Support for Inverse Distance Weighing