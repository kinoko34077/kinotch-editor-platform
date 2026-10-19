import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkLockedMetadata,checkLicenseEntry} from '../scripts/license-policy.mjs';

const original=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(original);
test('current locked packages meet exact-version license metadata policy',()=>{
  const result=checkLockedMetadata(original);
  assert.equal(result.entries,83);
  assert.equal(result.licenses['MPL-2.0'],12);
});
test('reject new GPL/AGPL and unknown license metadata, even when nonblank',()=>{
  for(const license of ['GPL-3.0-only','AGPL-3.0-only','What-Is-This']){
    assert.throws(()=>checkLicenseEntry('unexpected-dependency',{version:'1.0.0',license}),/Unapproved license/);
  }
});
test('MPL not allowed in runtime or outside pinned build toolchain',()=>{
  assert.throws(()=>checkLicenseEntry('lightningcss',{version:'1.0.0',license:'MPL-2.0',dev:false}),/Unapproved/);
  assert.throws(()=>checkLicenseEntry('malicious-css',{version:'1.0.0',license:'MPL-2.0',dev:true}),/Unapproved/);
  assert.equal(checkLicenseEntry('lightningcss',{version:'1.0.0',license:'MPL-2.0',dev:true}),'MPL-2.0');
});
test('missing license, unknown direct version and bad lock version fail',()=>{
  const bad=copy();bad.packages['node_modules/grapesjs'].license='';
  assert.throws(()=>checkLockedMetadata(bad),/Missing/);
  const badVersion=copy();badVersion.packages[''].dependencies.grapesjs='^0.23.6';
  assert.throws(()=>checkLockedMetadata(badVersion),/exact-version/);
  const badLock=copy();badLock.lockfileVersion=2;
  assert.throws(()=>checkLockedMetadata(badLock),/root/);
});
