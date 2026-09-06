// Build the n8n rules bundle from the reviewed modules, using the repository's
// existing locked esbuild dependency. No application credentials or live I/O.
import {build} from '../auth/node_modules/esbuild/lib/main.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('./',import.meta.url);
const lock=JSON.parse(readFileSync(new URL('../auth/package-lock.json',import.meta.url),'utf8'));
if(lock.packages['node_modules/esbuild'].version!=='0.25.9')throw Error('Unexpected esbuild version');
const result=await build({entryPoints:[new URL('./persistence-domain.cjs',root).pathname],bundle:true,write:false,platform:'node',format:'iife',globalName:'MOLCommRules',target:'es2022',minify:true,legalComments:'none'});
const code=result.outputFiles[0].text+'\nreturn [{json:MOLCommRules.dispatch($input.first().json)}];\n';
new Function('$input','Date','Buffer',code);
writeFileSync(new URL('./runtime.bundle.js',root),code);
const metadata={compiler:'esbuild',compiler_version:'0.25.9',entry:'persistence-domain.cjs',runtime_sha256:createHash('sha256').update(code).digest('hex'),sources:{}};
for(const file of ['domain.cjs','api-domain.cjs','persistence-domain.cjs'])metadata.sources[file]=createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex');
writeFileSync(new URL('./runtime.bundle.metadata.json',root),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata));
