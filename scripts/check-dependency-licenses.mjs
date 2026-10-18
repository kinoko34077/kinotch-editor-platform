// M0 read-only metadata gate: not a legal acceptance or vulnerability audit.
import fs from 'node:fs';
const lock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
if(lock.lockfileVersion!==3||lock.name!=='kinotch-editor-platform-m0')throw new Error('unexpected lockfile root');
const root=lock.packages?.[''];
if(!root?.dependencies||!root?.devDependencies)throw new Error('missing pinned direct dependencies');
for(const [name,version] of Object.entries({...root.dependencies,...root.devDependencies})){
  if(!/^[0-9]+[.][0-9]+[.][0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(version))
    throw new Error('direct dependency not exact-version pinned: '+name);
}
const entries=Object.entries(lock.packages).filter(([name])=>name.startsWith('node_modules/'));
if(!entries.length)throw new Error('empty lock dependency tree');
const histogram={};
for(const [name,pkg] of entries){
  if(typeof pkg.version!=='string'||typeof pkg.license!=='string'||!pkg.license.trim())throw new Error('missing package version/license metadata: '+name);
  histogram[pkg.license]=(histogram[pkg.license]||0)+1;
}
console.log('M0_LOCK_LICENSE_METADATA_PASS '+JSON.stringify({lockVersion:lock.lockfileVersion,entries:entries.length,licenses:histogram}));
