import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const port = Number.parseInt( process.env.NUMFIT_BROWSER_TEST_PORT || '4173', 10 );
const mimeTypes = new Map([
	[ '.html', 'text/html; charset=utf-8' ],
	[ '.js', 'text/javascript; charset=utf-8' ],
	[ '.mjs', 'text/javascript; charset=utf-8' ],
	[ '.json', 'application/json; charset=utf-8' ]
]);

const server = http.createServer( async ( request, response ) => {

	try {

		const url = new URL( request.url, `http://127.0.0.1:${ port }` );
		const requestPath = url.pathname === '/' ? '/tests/browser/smoke.html' : url.pathname;
		const requested = normalize( requestPath.replace( /^\/+/, '' ) );
		const filePath = join( root, requested );

		if ( !filePath.startsWith( root ) ) throw new Error( 'Invalid path.' );

		const body = await readFile( filePath );

		response.writeHead( 200, {
			'content-type': mimeTypes.get( extname( filePath ) ) || 'application/octet-stream'
		} );
		response.end( body );

	} catch ( error ) {

		response.writeHead( 404, {
			'content-type': 'text/plain; charset=utf-8'
		} );
		response.end( error.message || String( error ) );

	}

} );

await new Promise( resolve => server.listen( port, '127.0.0.1', resolve ) );

let browser;

try {

	browser = await chromium.launch();

	const page = await browser.newPage();
	const errors = [];

	page.on( 'console', message => {

		if ( message.type() === 'error' ) errors.push( message.text() );

	} );
	page.on( 'pageerror', error => errors.push( error.message || String( error ) ) );

	await page.goto( `http://127.0.0.1:${ port }/tests/browser/smoke.html` );
	await page.waitForFunction( () => globalThis.__numfitBrowserSmoke !== undefined );

	const result = await page.evaluate( () => globalThis.__numfitBrowserSmoke );

	if ( errors.length > 0 ) {

		throw new Error( `Browser console errors:\n${ errors.join( '\n' ) }` );

	}

	if ( !result?.ok ) {

		throw new Error( `Browser smoke test failed:\n${ JSON.stringify( result, null, 2 ) }` );

	}

	console.log( JSON.stringify( result, null, 2 ) );

} finally {

	if ( browser ) await browser.close();
	await new Promise( resolve => server.close( resolve ) );

}
