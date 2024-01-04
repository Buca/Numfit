


const nav = document.querySelector('#sidebar nav');

async function retrieveAndDisplayList() {

	const list = await ( await fetch('list.json') ).json();

	for ( const section of list ) {

		const sectionElement = document.createElement('div');
		const sectionNameElement = document.create('h4');
		const sectionListElement = document.createElement('ul');

		sectionName.append( section.name );
		sectionElement.append( sectionNameElement, sectionListElement );

		for ( const { name, href } of section.list ) {

			const itemElement = document.createElement('li');
			const linkElement = document.createElement('a');

			linkElement.href = href;
			linkElement.target = "content";
			linkElement.append( name );

			linkElement.addEventListener( 'click', () => {

				history.pushState( { name, href }, '', href );


			} );

			itemElement.append( linkElement );
			sectionListElement.append( itemElement );

		}

		nav.append( sectionElement );

	}

};

function URLHandler() {

	// Search and page

}