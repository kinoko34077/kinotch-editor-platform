/** M2 pure semantic tree contract. This is NOT a production DOM importer. */
const ID=/^[a-z][a-z0-9-]{0,60}$/;
const own=(o,key)=>Object.prototype.hasOwnProperty.call(o,key);
const clone=value=>structuredClone(value);
const plain=o=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
const keys=o=>Object.keys(o).sort().join(',');
const label=(v,max=256)=>typeof v==='string'&&v.length<=max;
function registryCheck(registry){
  if(!plain(registry)||!plain(registry.types)||!plain(registry.properties)||!plain(registry.globalDefaults))
    throw new TypeError('invalid tree registry');
  if(!Array.isArray(registry.rootTypes)||registry.rootTypes.length===0||
     registry.rootTypes.some(t=>!own(registry.types,t))||
     typeof registry.allowMultipleRoots!=='boolean')
    throw new TypeError('invalid root policy');
  for(const [id,type] of Object.entries(registry.types)){
    if(!ID.test(id)||!plain(type)||!Array.isArray(type.allowedChildren)||!plain(type.defaults||{}))
      throw new TypeError('invalid component type');
    if(type.allowedChildren.some(child=>!own(registry.types,child)))
      throw new TypeError('unknown child type');
  }
  for(const [key,rule] of Object.entries(registry.properties)){
    if(!ID.test(key)||!plain(rule)||!['number','string','boolean'].includes(rule.type)||
      typeof rule.inheritable!=='boolean'||(rule.types&&!Array.isArray(rule.types)))
      throw new TypeError('invalid property rule');
    if(rule.types?.some(t=>!own(registry.types,t)))throw new TypeError('unknown property type');
  }
  function propertyValue(typeId,key,val){
    const rule=registry.properties[key];
    if(!rule||(rule.types&&!rule.types.includes(typeId))||
      typeof val!==rule.type||(rule.type==='number'&&!Number.isFinite(val))||
      (rule.type==='string'&&val.length>1024))
      throw new TypeError('incompatible property: '+key);
  }
  for(const [id,type] of Object.entries(registry.types)){
    for(const [key,val] of Object.entries(type.defaults||{}))propertyValue(id,key,val);
  }
  for(const [key,val] of Object.entries(registry.globalDefaults)){
    const rule=registry.properties[key];
    if(!rule||typeof val!==rule.type||(rule.type==='number'&&!Number.isFinite(val)))
      throw new TypeError('invalid global default: '+key);
  }
  return propertyValue;
}
function fixedRegistry(source){
  const snap=clone(source);
  registryCheck(snap);
  const seen=new WeakSet();
  function freeze(o){
    if(!o||typeof o!=='object'||seen.has(o))return o;
    seen.add(o);
    for(const value of Object.values(o))freeze(value);
    return Object.freeze(o);
  }
  return freeze(snap);
}
function validate(nodes,registry,propertyValue){
  if(!Array.isArray(nodes)||!nodes.length||nodes.length>3000)throw new TypeError('invalid tree node count');
  const byId=new Map();
  for(const node of nodes){
    if(!plain(node)||keys(node)!=='componentLabel,id,layerName,local,parentId,renderedText,typeId'||
       typeof node.id!=='string'||!ID.test(node.id)||byId.has(node.id)||
       !own(registry.types,node.typeId)||typeof node.typeId!=='string'||
       !(node.parentId===null||typeof node.parentId==='string')||
       !label(node.componentLabel)||!label(node.layerName)||
       !label(node.renderedText,20000)||!plain(node.local))
      throw new TypeError('invalid tree node');
    for(const [prop,val] of Object.entries(node.local))propertyValue(node.typeId,prop,val);
    byId.set(node.id,node);
  }
  const roots=nodes.filter(n=>n.parentId===null);
  if(!roots.length||(!registry.allowMultipleRoots&&roots.length!==1)||
     roots.some(n=>!registry.rootTypes.includes(n.typeId)))
    throw new TypeError('invalid document roots');
  if(JSON.stringify({schema:'editor-tree-m2.v1',revision:0,nodes}).length>2000000)
    throw new RangeError('tree snapshot too large');
  for(const node of nodes){
    if(node.parentId===null)continue;
    const parent=byId.get(node.parentId);
    if(!parent||!registry.types[parent.typeId].allowedChildren.includes(node.typeId))
      throw new TypeError('invalid parent or container');
    const seen=new Set([node.id]);
    let p=parent;
    let depth=0;
    while(p){
      if(++depth>64)throw new RangeError('tree depth out of range');
      if(seen.has(p.id))throw new TypeError('tree cycle');
      seen.add(p.id);
      p=p.parentId===null?null:byId.get(p.parentId);
    }
  }
}
export function parseTreeSnapshotJSON(source,registry){
  if(typeof source!=='string'||source.length>2000000)throw new TypeError('invalid snapshot size');
  const parsed=JSON.parse(source);
  if(!plain(parsed)||keys(parsed)!=='nodes,revision,schema'||
     parsed.schema!=='editor-tree-m2.v1'||!Number.isSafeInteger(parsed.revision)||
     parsed.revision<0)throw new TypeError('invalid tree snapshot');
  registry=fixedRegistry(registry);
  const propertyValue=registryCheck(registry);
  validate(parsed.nodes,registry,propertyValue);
  return clone(parsed);
}
export function createTreeModel(initial,registry){
  registry=fixedRegistry(registry);
  const propertyValue=registryCheck(registry);
  validate(initial,registry,propertyValue);
  let current=clone(initial),revision=0;
  const undo=[],redo=[];
  const lookup=(nodes,id)=>nodes.find(n=>n.id===id);
  const requireNode=(nodes,id)=>{
    const found=lookup(nodes,id);
    if(!found)throw new TypeError('unknown element: '+id);
    return found;
  };
  function apply(action){
    const draft=clone(current);
    action(draft);
    validate(draft,registry,propertyValue);
    if(JSON.stringify(draft)===JSON.stringify(current))return false;
    undo.push(clone(current));
    if(undo.length>50)undo.shift();
    redo.length=0;current=draft;revision++;return true;
  }
  function step(from,to){
    if(!from.length)return false;
    to.push(clone(current));if(to.length>50)to.shift();
    current=from.pop();revision++;return true;
  }
  function lineage(id){
    const target=requireNode(current,id),ancestors=[];
    let next=target.parentId;
    while(next!==null){
      const parent=requireNode(current,next);
      ancestors.push(parent);next=parent.parentId;
    }
    return ancestors;
  }
  function effective(id,field){
    const node=requireNode(current,id),rule=registry.properties[field];
    if(!own(registry.properties,field)||!rule||(rule.types&&!rule.types.includes(node.typeId)))
      throw new TypeError('unsupported field');
    if(own(node.local,field))return {value:node.local[field],origin:'local',sourceId:node.id};
    if(rule.inheritable){
      for(const ancestor of lineage(id)){
        if((!rule.types||rule.types.includes(ancestor.typeId))&&own(ancestor.local,field))
          return {value:ancestor.local[field],origin:'ancestor',sourceId:ancestor.id};
      }
    }
    const defaults=registry.types[node.typeId].defaults||{};
    if(own(defaults,field))return {value:defaults[field],origin:'type',sourceId:node.typeId};
    if(own(registry.globalDefaults,field))return {value:registry.globalDefaults[field],origin:'global',sourceId:null};
    return {value:undefined,origin:'unset',sourceId:null};
  }
  function move(id,parentId,beforeId=null){
    return apply(nodes=>{
      const node=requireNode(nodes,id);
      if(parentId===null){
        if(!registry.rootTypes.includes(node.typeId)||(!registry.allowMultipleRoots&&node.parentId!==null))
          throw new TypeError('invalid root move');
        if(node.parentId===null&&beforeId===null)return;
      }
      if(parentId!==null){
        const parent=requireNode(nodes,parentId);
        if(!registry.types[parent.typeId].allowedChildren.includes(node.typeId))
          throw new TypeError('invalid drop container');
      }
      if(beforeId!==null){
        const before=requireNode(nodes,beforeId);
        if(before.id===id||before.parentId!==parentId)throw new TypeError('invalid insertion sibling');
      }
      node.parentId=parentId;
      const at=nodes.findIndex(n=>n.id===id);
      const [moving]=nodes.splice(at,1);
      const index=beforeId===null?nodes.length:nodes.findIndex(n=>n.id===beforeId);
      nodes.splice(index,0,moving);
    });
  }
  function rename(id,field,text){
    if(!['componentLabel','layerName','renderedText'].includes(field)||
       !label(text,field==='renderedText'?20000:256))
      throw new TypeError('invalid rename');
    return apply(nodes=>{requireNode(nodes,id)[field]=text;});
  }
  function setOverride(id,field,value){
    return apply(nodes=>{
      const n=requireNode(nodes,id);
      propertyValue(n.typeId,field,value);
      n.local[field]=value;
    });
  }
  function resetOverride(id,field){
    return apply(nodes=>{
      const n=requireNode(nodes,id);
      if(!own(registry.properties,field))throw new TypeError('unknown field');
      delete n.local[field];
    });
  }
  return {
    get revision(){return revision;},
    get nodes(){return clone(current);},
    getNode(id){return clone(requireNode(current,id));},
    children(parentId){return clone(current.filter(n=>n.parentId===parentId));},
    effective,rename,setOverride,resetOverride,move,
    undo:()=>step(undo,redo),redo:()=>step(redo,undo),
    exportJSON(){return JSON.stringify({schema:'editor-tree-m2.v1',revision,nodes:current});}
  };
}
