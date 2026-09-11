import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export function verifyPassword(password, encoded) {
  const parts = typeof encoded === 'string' ? encoded.split('$') : [];
  const valid = parts.length === 4 && parts[0] === 'pbkdf2-sha256' && parts[1] === '600000'
    && /^[0-9a-f]{32}$/.test(parts[2]) && /^[0-9a-f]{64}$/.test(parts[3]);
  const salt = valid ? parts[2] : '00000000000000000000000000000000';
  const expected = valid ? parts[3] : '0'.repeat(64);
  const actual = bytesToHex(pbkdf2(sha256, utf8ToBytes(password), hexToBytes(salt), {c: 600000, dkLen: 32}));
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return valid && difference === 0;
}
