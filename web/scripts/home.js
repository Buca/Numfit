const observer = new IntersectionObserver( ( list ) => {

	for ( const example of list ) {

		if ( example.isIntersecting ) example.target.classList.remove('blur');

		else example.target.classList.add('blur');

	}

}, {

  root: null,//document.getElementById('examples'),
  rootMargin: "0px",
  threshold: .4,

});

observer.observe( document.getElementById('linear-example') );
observer.observe( document.getElementById('cubic-example') );
observer.observe( document.getElementById('linear-reg-example') );

function plot2D( context, width, height, data ) {

	const image = new ImageData( width, height );

	console.log( data.length, image.data.length, image.data.length - data.length );

	for ( let x = 0, j = 0; x < width; x ++ ) {
	for ( let y = 0; y < height; y ++ ) {

		image.data[ j ] = data[ j ++ ];
		image.data[ j ] = data[ j ++ ];
		image.data[ j ] = data[ j ++ ];
		image.data[ j ] = data[ j ++ ];

	}
	}

	context.putImageData( image, 0, 0 );

};

function createPlot2D({ canvas, type, positions, values, dimension }) {

	const context = canvas.getContext('2d');
	const parent = canvas.parentElement;
	const evaluator = new type( positions, values, dimension );
	const degree = type.degree;
	const start = [ 0, 0 ];
	const end = [ 0, 0 ];
	const segments = [ 0, 0 ];

	const observer = new ResizeObserver( () => {

		let width = parent.clientWidth;
		let height = parent.clientHeight;

		const computedStyle = getComputedStyle( parent );

		height -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
		width -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);

		canvas.width = width;
		canvas.height = height;

		const _width = positions[ positions.length - 2 ] - positions[ 0 ];
		const _height = positions[ positions.length - 1 ] - positions[ 1 ];

		const centerX = 0.5*_width + positions[ 0 ];
		const centerY = 0.5*_height + positions[ 1 ];

		segments[ 0 ] = width;
		segments[ 1 ] = height;
		start[ 0 ] = centerX - .5*_width;
		start[ 1 ] = centerY - .5*_height;
		end[ 0 ] = centerX + .5*_width;
		end[ 1 ] = centerY + .5*_height;

		const data = evaluator.segment( start, end, segments );



		plot2D( context, width, height, data );
	
	});

	observer.observe( parent );

};

createPlot2D({
	canvas: document.getElementById('bilinear-plot'), 
	type: Bilinear,
	positions: [
		0, 0,
		1, 1
	],
	values: [
		255,0,0,255,	0,0,255,255,
		0,255,0,255,	255,255,0,255
	],
	dimension: 4
});

createPlot2D({
	canvas: document.getElementById('biquadratic-plot'), 
	type: Biquadratic,
	positions: [
		0, 0,
		1, 1,
		2, 2
	],
	values: [
		255,0,0,255,		0,0,255,255,		0,255,0,255,
		0,255,0,255,		255,0,0,255,		255,0,255,255,
		255,255,0,255,	255,0,255,255,	0,0,255,255
	],
	dimension: 4
});

createPlot2D({
	canvas: document.getElementById('bicubic-plot'), 
	type: Bicubic,
	positions: [
		0, 0,
		1, 1,
		2, 2,
		3, 3
	],
	values: [
		255,0,0,255,		0,0,255,255,		0,255,0,255,		0,255,0,255,
		0,255,0,255,		255,0,0,255,		255,0,255,255,	255,0,0,255,
		255,255,0,255,	255,0,255,255,	0,0,255,255,		0,0,255,255,
		255,0,0,255,		0,0,255,255,		0,255,0,255,		0,255,0,255
	],
	dimension: 4
});