// Fail-closed metadata policy for isolated M0 research dependencies only.
import fs from 'node:fs';
import {checkLockedMetadata} from './license-policy.mjs';
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
console.log('M0_LOCK_LICENSE_METADATA_PASS '+JSON.stringify(checkLockedMetadata(lock)));
