const nav = document.querySelector('#sidebar nav');

const DOMParserSupport = (function () {
	
	if ( !window.DOMParser ) return false;
	
	const parser = new DOMParser();
	
	try { parser.parseFromString('x', 'text/html'); }
	catch ( error ) { return false; }
	
	return true;

})();

function stringToHTML( str ) {

	if ( DOMParserSupport ) {
		
		const parser = new DOMParser();
		const doc = parser.parseFromString(str, 'text/html');
		
		return doc.body;
	
	}

	// Fallback:
	const doc = document.createElement('body');
	doc.innerHTML = str;
	return doc;

};

async function getHTMLFromURL( url ) {

	let response;
	let html;

	try {
	    
	    response = await fetch( url );
	    let status = response.ok;

	    if ( !status ) response = await fetch('not-found.html');

	    const text = await response.text();
		html = stringToHTML( text ).querySelector('#content');

		if ( !status ) html.querySelector('#file-name').append( url );
		
	} catch ( e ) {
	    
		response = await fetch('not-found.html');

		const text = await response.text();
		html = stringToHTML( text ).querySelector('#content');

		html.querySelector('#file-name').append( url );

	};

	return html;

};

function getHash() {

	return location.hash.substring( 1 );

};

async function initHash() {

	const href = getHash();

	if ( href !== '' ) await retrieveAndDisplayPage( href );

	addEventListener( "hashchange", () => {

		const href = getHash();

		if ( href !== '' ) retrieveAndDisplayPage( href );

	});

};

async function init() {

	if ( window.location.hash === '' ) {

		window.location.hash = '?';
		window.location.hash = '';

	}

	await retrieveAndDisplayList();
	initSearch();

	await initHash();
	initScrollToTopButton();

	initScrollRestoration();
};

async function retrieveAndDisplayList() {

	const list = await ( await fetch('list.json') ).json();

	const hash = getHash();

	for ( const section of list ) {

		const sectionElement = document.createElement('div');
		const sectionNameElement = document.createElement('h4');
		const sectionListElement = document.createElement('ul');

		sectionElement.classList.add('entries');

		sectionNameElement.append( section.name );
		sectionElement.append( sectionNameElement, sectionListElement );

		for ( const { name, href } of section.list ) {

			const itemElement = document.createElement('li');
			const linkElement = document.createElement('a');

			linkElement.href = '#' + href;
			linkElement.target = "content";
			linkElement.append( name );

			if( hash === href ) linkElement.classList.add('selected');

			linkElement.addEventListener( 'click', async ( e ) => {

				e.preventDefault();
				//await retrieveAndDisplayPage( href );
				window.location.hash = href;

				if ( window.scrollY > 100 ) scrollToTop();

				const selected = document.querySelector('#sidebar nav .selected');
				if ( selected ) selected.classList.remove('selected');

				linkElement.classList.add('selected');

			} );

			itemElement.append( linkElement );
			sectionListElement.append( itemElement );

		}

		nav.append( sectionElement );

	}

};

async function retrieveAndDisplayPage( href ) {

	let element = await getHTMLFromURL( href );
	
	document
		.getElementById('content')
		.replaceWith( element );

};

function filterListByValue( value ) {

	const entries = document.querySelectorAll('#sidebar .entries');

	for ( const entry of entries ) {

		const links = entry.querySelectorAll('li');

		entry.classList.remove('hidden');

		let hideEntry = true;

		for ( const link of links ) {

			link.classList.remove('hidden');

			if ( !link.textContent.toLowerCase().includes( value.toLowerCase() ) ) {
				link.classList.add('hidden');
			}

			else hideEntry = false;

		}

		if ( hideEntry ) entry.classList.add('hidden');

	}

};

function getSearchQuery() {

	return window.location.search.substring( 8 );

};

function initSearch() {

	const search = document.getElementById('sidebar-search');

	const searchQuery = getSearchQuery();
	search.value = searchQuery;
	filterListByValue( searchQuery );


	search.addEventListener('input', ( event ) => {

		const value = search.value;
		const hash = getHash();
		
		window.history.replaceState( null, null, `?search=${value}#${hash}` );

		filterListByValue( value );

	});

};

function scrollToTop() {

	window.scrollTo({
	
		top: 0,
		behavior: "smooth"
	
	});

};

function initScrollToTopButton() {

	const button = document.createElement('div');
	button.id = 'scroll-to-top-button';
	button.append('^')
	button.classList.add('hidden');
	button.addEventListener('click', () => { scrollToTop() } );

	document.body.append( button );

	if ( window.scrollY > 100 ) showScrollToTopButton();
	else hideScrollToTopButton();

	document.addEventListener('scroll', ( event ) => {

		if ( window.scrollY > 100 ) showScrollToTopButton();
		else hideScrollToTopButton();

	});

};

function showScrollToTopButton() {

	document.querySelector('#scroll-to-top-button')
		.classList.remove('hidden');

};

function hideScrollToTopButton() {

	document.querySelector('#scroll-to-top-button')
		.classList.add('hidden');

};

function initScrollRestoration() {

	// If current href is the same as the last href,
	// then scroll to the last y scroll position.
	// Otherwise update last page to current one and reset the y-scroll

	const lastHash = localStorage.getItem('numfit-last-page');
	const currentHash = getHash();

	if ( lastHash === currentHash ) {

		const scrollY = localStorage.getItem('numfit-scroll-y');
		window.scrollTo( 0, scrollY );

	} else {

		localStorage.setItem('numfit-last-page', currentHash );
		localStorage.setItem('numfit-scroll-y', window.scrollY );

	}

	document.addEventListener('scroll', ( event ) => {

		localStorage.setItem('numfit-scroll-y', window.scrollY );

	});

	addEventListener( "hashchange", () => {

		const lastHash = localStorage.getItem('numfit-last-page');
		const currentHash = getHash();

		if ( lastHash === currentHash ) {

			const scrollY = localStorage.getItem('numfit-scroll-y');
			window.scrollTo( 0, scrollY );

		} else {

			localStorage.setItem('numfit-last-page', currentHash );
			localStorage.setItem('numfit-scroll-y', window.scrollY );

		}

	});

};

init();