/** M2 experimental UI adapter; never mount on consumer/privileged pages. */
export function mountTreeWorkbench(host,model,canNest){
  if(!host||!model)throw new TypeError('tree workbench host/model required');
  let active='section-a';
  host.replaceChildren();
  const tree=document.createElement('ul');tree.id='tree-navigator';
  const controls=document.createElement('div');controls.className='tree-properties';
  const makeInput=(field,title)=>{
    const label=document.createElement('label');label.textContent=title;
    const input=document.createElement('input');input.dataset.treeField=field;input.setAttribute('aria-label',title);
    if(field==='spacing'){input.type='number';input.step='1';}
    label.append(input);controls.append(label);
    return input;
  };
  const layer=makeInput('layerName','レイヤー名');
  const typeName=makeInput('componentLabel','表示タイプ名');
  const rendered=makeInput('renderedText','表示テキスト');
  const spacing=makeInput('spacing','余白（数値）');
  const source=document.createElement('output');source.dataset.treeSource='';source.setAttribute('aria-live','polite');controls.append(source);
  const parentLabel=document.createElement('label');parentLabel.textContent='移動先の親';
  const parent=document.createElement('select');parent.dataset.treeParent='';parentLabel.append(parent);controls.append(parentLabel);
  const reset=document.createElement('button');reset.type='button';reset.textContent='継承に戻す';reset.dataset.treeReset='';controls.append(reset);
  const undo=document.createElement('button');undo.type='button';undo.textContent='階層を元に戻す';undo.dataset.treeUndo='';controls.append(undo);
  const redo=document.createElement('button');redo.type='button';redo.textContent='階層をやり直す';redo.dataset.treeRedo='';controls.append(redo);
  const warning=document.createElement('output');warning.setAttribute('role','status');warning.dataset.treeStatus='';controls.append(warning);
  host.append(tree,controls);
  const commit=action=>{
    try{action();warning.textContent='';draw();}
    catch(error){warning.textContent='操作を適用できません: '+error.message;draw();}
  };
  function draw(){
    const nodes=model.nodes,selected=model.getNode(active);
    // Selection rebuilds the nested list. Preserve focused row for keyboard
    // activation instead of ejecting the user to document.body each time.
    const oldFocus=document.activeElement?.closest?.('[data-tree-select]')?.dataset.treeSelect;
    tree.replaceChildren();
    function branch(parentId,target){
      for(const node of model.children(parentId)){
        const li=document.createElement('li');li.dataset.treeId=node.id;
        const button=document.createElement('button');button.type='button';button.dataset.treeSelect=node.id;
        button.textContent=node.layerName;
        button.setAttribute('aria-pressed',String(node.id===active));
        button.title=node.typeId+' / '+node.id;
        button.addEventListener('click',()=>{active=node.id;draw();});
        button.addEventListener('keydown',e=>{
          if(e.key==='F2'){e.preventDefault();active=node.id;draw();layer.focus();layer.select();}
        });
        li.append(button);
        if(nodes.some(x=>x.parentId===node.id)){
          const nested=document.createElement('ul');
          branch(node.id,nested);li.append(nested);
        }
        target.append(li);
      }
    }
    branch(null,tree);
    if(oldFocus){
      const focused=[...tree.querySelectorAll('[data-tree-select]')].find(el=>el.dataset.treeSelect===oldFocus);
      focused?.focus({preventScroll:true});
    }
    layer.value=selected.layerName;
    typeName.value=selected.componentLabel;
    rendered.value=selected.renderedText;
    const effective=model.effective(active,'spacing');
    spacing.value=effective.value===undefined?'':String(effective.value);
    source.textContent='出所: '+effective.origin+(effective.sourceId?' / '+effective.sourceId:'');
    source.dataset.treeOrigin=effective.origin;
    source.dataset.treeSourceId=effective.sourceId||'';
    parent.replaceChildren();
    const all=nodes.filter(n=>canNest(selected,n,nodes));
    for(const node of all){
      const option=document.createElement('option');option.value=node.id;
      option.textContent=node.layerName+' ('+node.id+')';parent.append(option);
    }
    parent.value=selected.parentId??'';
    parent.disabled=selected.parentId===null||!all.length;
    layer.dataset.activeId=active;
    host.dataset.treeRevision=String(model.revision);
  }
  for(const input of [layer,typeName,rendered]){
    input.addEventListener('change',()=>commit(()=>model.rename(active,input.dataset.treeField,input.value)));
  }
  spacing.addEventListener('change',()=>commit(()=>{
    if(!spacing.value.trim()||!Number.isFinite(Number(spacing.value)))throw new TypeError('invalid number');
    model.setOverride(active,'spacing',Number(spacing.value));
  }));
  reset.addEventListener('click',()=>commit(()=>model.resetOverride(active,'spacing')));
  parent.addEventListener('change',()=>commit(()=>model.move(active,parent.value||null)));
  undo.addEventListener('click',()=>commit(()=>model.undo()));
  redo.addEventListener('click',()=>commit(()=>model.redo()));
  draw();
  return {get model(){return model;},select(id){model.getNode(id);active=id;draw();},destroy(){host.replaceChildren();}};
}
