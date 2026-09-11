const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {pbkdf2Sync} = require('node:crypto');
const assert = require('node:assert/strict');
const source = readFileSync(join(__dirname,'../backend/v2/auth/password.bundle.js'),'utf8');
const verify = new Function(source+';return MolPassword.verifyPassword;')();
const salt = '00112233445566778899aabbccddeeff';
for(const password of ['test-vector', 'Zażółć gęślą jaźń 🔐', 'x'.repeat(200)]) {
  const expected = ['pbkdf2-sha256','600000',salt,pbkdf2Sync(password,Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex')].join('$');
  assert.equal(verify(password,expected),true);
  assert.equal(verify(password+'!',expected),false);
}
assert.equal(verify('test',null),false);
assert.equal(verify('test','pbkdf2-sha256$1$'+salt+'$'+'0'.repeat(64)),false);
assert.ok(!source.includes('Object.getPrototypeOf(this)'));
assert.ok(!source.includes('new this.constructor()'));
console.log('Password verifier PASS: independent Node PBKDF2 vectors, Unicode, long password, mismatches, invalid hashes.');
