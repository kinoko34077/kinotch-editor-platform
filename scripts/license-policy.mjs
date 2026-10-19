// M0 metadata allowlist — not legal compliance or vulnerability clearance.
const common=new Set(['MIT','Apache-2.0','BSD-3-Clause','ISC','0BSD']);
export function checkLicenseEntry(name, pkg){
  if(!pkg||typeof pkg.version!=='string'||!pkg.version||typeof pkg.license!=='string'||!pkg.license.trim())
    throw new Error('Missing version/license metadata: '+name);
  if(common.has(pkg.license))return pkg.license;
  // MPL binaries are only allowed in the existing build-only lightningcss toolchain.
  if(pkg.license==='MPL-2.0'&&pkg.dev===true&&
      /^lightningcss(?:-[a-z0-9-]+)?$/.test(name))
    return pkg.license;
  throw new Error('Unapproved license or distribution scope: '+name+' ('+pkg.license+')');
}
export function checkLockedMetadata(lock){
  if(!lock||lock.lockfileVersion!==3||lock.name!=='kinotch-editor-platform-m0')
    throw new Error('unexpected lockfile root');
  const root=lock.packages?.[''];
  if(!root?.dependencies||!root?.devDependencies)throw new Error('missing pinned direct dependencies');
  for(const [name,version] of Object.entries({...root.dependencies,...root.devDependencies})){
    if(!/^[0-9]+[.][0-9]+[.][0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(version))
      throw new Error('direct dependency not exact-version pinned: '+name);
  }
  const entries=Object.entries(lock.packages).filter(([key])=>key.startsWith('node_modules/'));
  if(!entries.length)throw new Error('empty lock dependency tree');
  const histogram={};
  for(const [key,value] of entries){
    const license=checkLicenseEntry(key.slice('node_modules/'.length),value);
    histogram[license]=(histogram[license]||0)+1;
  }
  return {lockVersion:lock.lockfileVersion,entries:entries.length,licenses:histogram};
}
