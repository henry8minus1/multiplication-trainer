(() => {
  const canvas=document.getElementById('work-canvas');
  const known=document.getElementById('known-note');
  const finding=document.getElementById('unknown-note');
  const toolButtons=[...document.querySelectorAll('[data-math-tool]')];
  if(!canvas)return;

  function selectedTool(){
    const b=toolButtons.find(x=>x.classList.contains('on'));
    return b?b.dataset.mathTool:'blank';
  }

  function snapshot(){
    const tool=selectedTool();
    const knownText=known?known.value.trim().slice(0,180):'';
    const findingText=finding?finding.value.trim().slice(0,180):'';
    let image=null, drawingUsed=false;
    try{
      const data=canvas.toDataURL('image/jpeg',.55);
      // A nearly empty white/template canvas still produces data, so only mark drawingUsed
      // when the student opened a nonblank model or supplied Read fields. This is metadata,
      // not handwriting recognition.
      drawingUsed=tool!=='blank';
      if(drawingUsed)image=data;
    }catch(_){}
    return {tool,known:knownText,finding:findingText,drawingUsed,used:drawingUsed||Boolean(knownText)||Boolean(findingText),image};
  }

  const existing=window.MathWordTools||{};
  window.MathWordTools={...existing,snapshot};
})();