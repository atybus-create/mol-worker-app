import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const result = await build({entryPoints:[fileURLToPath(new URL('./password-entry.js',import.meta.url))],bundle:true,platform:'browser',format:'esm',treeShaking:false,target:'es2022',write:false});
let source = result.outputFiles[0].text;
// n8n blocks reflective prototypes. Use explicit allocations for this SHA256-only
// verifier; hashing, HMAC, PBKDF2, state copying and iteration counts are unchanged.
for (const [before,after] of [
  ['to ||= Object.create(Object.getPrototypeOf(this), {});','to ||= new _HMAC(sha256, new Uint8Array());'],
  ['to ||= new this.constructor();','to ||= new _SHA256();'],
]) {
  if(source.split(before).length!==2)throw new Error('Unexpected noble bundle: review compatibility adapter');
  source=source.replace(before,after);
}
writeFileSync(new URL('./password.bundle.js',import.meta.url),source);
