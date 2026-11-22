/** Isolated GrapesJS projection of validated M2 tree model.
 *  Deliberately no arbitrary HTML importer / consumer DOM write path.
 *  Only public GrapesJS Component.append/move/addStyle APIs are used.
 */
export function createGrapesTreeProjection(editor){
  if(!editor?.getWrapper||!editor.Canvas?.getBody)throw new TypeError('GrapesJS editor required');
  const wrapper=editor.getWrapper(),components=new Map();
  function render(model){
    if(!model?.nodes||!model?.children||!model?.effective)throw new TypeError('validated tree model required');
    const nodes=model.nodes;
    const seen=new Set();
    // Source state has been validated by createTreeModel. Still fail closed on
    // missing ID and unsafe projection-only CSS rather than silently ignoring.
    for(const item of nodes){
      if(seen.has(item.id)||!(/^[a-z][a-z0-9-]{0,60}$/).test(item.id))throw new TypeError('invalid projection id');
      seen.add(item.id);
      const px=model.effective(item.id,'spacing').value;
      if(typeof px!=='number'||!Number.isFinite(px)||px<0||px>500)
        throw new RangeError('spacing not displayable in prototype: '+item.id);
    }
    for(const item of nodes){
      if(components.has(item.id))continue;
      // Text lives in a dedicated safe span: setting container.textContent
      // would destroy real nested GrapesJS children on each render.
      const made=wrapper.append({
        tagName:'div',name:item.componentLabel,
        attributes:{'data-tree-node-id':item.id},
        draggable:false,resizable:false,removable:false,copyable:false,stylable:false,selectable:false,
        style:{display:'block',border:'1px solid #8dafaa',margin:'4px',minHeight:'25px',boxSizing:'border-box'},
        components:[{tagName:'span',attributes:{'data-tree-text-for':item.id},
          components:[{type:'textnode',content:item.renderedText}]}]
      });
      if(!made?.[0])throw new Error('GrapesJS failed to append '+item.id);
      components.set(item.id,made[0]);
    }
    // Keep the model as the only hierarchy authority. Each immediate sibling
    // is placed with public Component.move, preserving its nested subtree.
    const reconcile=(parentId,parentCmp)=>{
      const siblings=model.children(parentId);
      for(let index=0;index<siblings.length;index++){
        const node=siblings[index],cmp=components.get(node.id);
        if(!cmp)throw new Error('component missing '+node.id);
        const offset=parentId===null?0:1; // first child is the safe text span
        if(cmp.parent()!==parentCmp||parentCmp.components().indexOf(cmp)!==index+offset)
          cmp.move(parentCmp,{at:index+offset});
        reconcile(node.id,cmp);
      }
    };
    reconcile(null,wrapper);
    for(const item of nodes){
      const cmp=components.get(item.id);
      cmp.set('name',item.componentLabel);
      const eff=model.effective(item.id,'spacing');
      // All visible state must be owned by GrapesJS components, not by
      // transient iframe DOM. Component models are the serialization source.
      const span=cmp.components().at(0);
      if(!span||span.getAttributes()['data-tree-text-for']!==item.id)
        throw new Error('tree text component missing: '+item.id);
      const text=span.components().at(0);
      if(!text||!text.is('textnode'))
        throw new Error('tree literal text node missing: '+item.id);
      text.set('content',item.renderedText);
      cmp.addStyle({padding:eff.value+'px'});
      cmp.addAttributes({
        'data-tree-origin':eff.origin,
        'data-tree-source-id':eff.sourceId??''
      });
      if(!cmp.getEl())throw new Error('GrapesJS DOM missing after projection: '+item.id);
    }
    return {nodes:nodes.length,revision:model.revision};
  }
  return {render};
}
