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



const options = {
	responsive: true,
    maintainAspectRatio: false,
	layout: {
        padding: 0
    },
	plugins: {
		legend: {
			display: false
		}
	},
	scales: {
		x: {
			//type: 'linear',
			lineWidth: 10,
			position: 'bottom',
			display: true
		},
		y: {
			tickColor: 'rgb(255, 0, 0)',
			display: true,
			position: 'right'
		}
	}
};


const linearCTX = document.getElementById('linear-plot');

const linearData = {
	datasets: [{
		label: 'Samples',
		data: [[.2,.2],[.7,.7]],
		backgroundColor: 'rgb(111,111,111)',
		size: 10
	},{
		label: 'Linear Evaluation',
		data: [[0,0],[.1,.1],[.2,.2],[.3,.3],[.4,.4],[.5,.5],[.6,.6],[.7,.7],[.8,.8],[.9,.9],[1,1]],
		backgroundColor: '#3dedcd'
	}],
};

const linearConfig = {
	type: 'scatter',
	data: linearData,
	options: options
};


const linearChart = new Chart( linearCTX, linearConfig );


/*Generate cubic data*/

const cubicCTX = document.getElementById('cubic-plot');

const cubicData = {
	datasets: [{
		label: 'Samples',
		data: [[.2,.2],[.7,.7]],
		backgroundColor: 'rgb(111,111,111)',
		size: 10
	},{
		label: 'Linear Evaluation',
		data: [[0,0],[.1,.1],[.2,.2],[.3,.3],[.4,.4],[.5,.5],[.6,.6],[.7,.7],[.8,.8],[.9,.9],[1,1]],
		backgroundColor: '#3dedcd'
	}],
};

const cubicConfig = {
	type: 'scatter',
	data: cubicData,
	options: options
};

const cubicChart = new Chart( cubicCTX, cubicConfig );

/* Linear Regression */

const linearRegCTX = document.getElementById('linear-reg-plot');

const linearRegData = {
	datasets: [{
		label: 'Samples',
		data: [[.2,.2],[.7,.7]],
		backgroundColor: 'rgb(111,111,111)',
		size: 10
	},{
		label: 'Linear Evaluation',
		data: [[0,0],[.1,.1],[.2,.2],[.3,.3],[.4,.4],[.5,.5],[.6,.6],[.7,.7],[.8,.8],[.9,.9],[1,1]],
		backgroundColor: '#3dedcd'
	}],
};

const linearRegConfig = {
	type: 'scatter',
	data: linearRegData,
	options: options
};

const linearRegChart = new Chart( linearRegCTX, linearRegConfig );