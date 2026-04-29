import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = readFileSync( resolve( 'types/index.d.ts' ), 'utf8' );
const outputPath = resolve( 'docs/API.md' );
const sections = [
	[ 'Classes', collect( /export declare class\s+(\w+)/g ) ],
	[ 'Functions', collect( /export declare function\s+(\w+)/g ) ],
	[ 'Interfaces', collect( /export interface\s+(\w+)/g ) ],
	[ 'Types', collect( /export type\s+(\w+)/g ) ],
	[ 'Aliases', collectAliases() ]
];
const lines = [
	'# Numfit API Reference',
	'',
	'Generated from `types/index.d.ts`. The TypeScript declarations are the canonical public API surface.',
	''
];

for ( const [ title, items ] of sections ) {

	lines.push( `## ${ title }`, '' );

	for ( const item of items ) lines.push( `- \`${ item }\`` );

	lines.push( '' );

}

lines.push(
	'## Notes',
	'',
	'- Most interpolators expose `evaluate`, `map`, `mapAsync`, `grid`, `slice`, scattered samplers, `adaptive`, and `stream` where applicable.',
	'- Regression models expose diagnostics including `rss`, `tss`, `rmse`, `mae`, `aic`, `bic`, `leverage`, `studentizedResiduals`, `cooksDistance`, and `summary`.',
	'- See the README for narrative examples and option descriptions.',
	''
);

mkdirSync( dirname( outputPath ), { recursive: true } );
writeFileSync( outputPath, `${ lines.join( '\n' ) }\n` );

function collect( pattern ) {

	return [ ...source.matchAll( pattern ) ].map( match => match[ 1 ] ).sort();

}

function collectAliases() {

	return [ ...source.matchAll( /export \{ ([^}]+) \};/g ) ]
		.flatMap( match => match[ 1 ].split( ',' ) )
		.map( item => item.trim() )
		.filter( Boolean )
		.sort();

}
