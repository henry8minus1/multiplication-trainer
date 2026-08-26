(() => {
  const API_KEY='math-mastery-word-problem-api',TOKEN_KEY='math-mastery-word-problem-token',COACH_KEY='math-mastery-word-problem-coaching-v1';
  const $=id=>document.getElementById(id);
  const attempts=[];
  let hintUsed=false,grading=false,lastGradedCount=0;

  function loadCoach(){try{return JSON.parse(localStorage.getItem(COACH_KEY)||'{}')||{}}catch(_){return{}}}
  function saveCoach(x){try{localStorage.setItem(COACH_KEY,JSON.stringify(x))}catch(_){}}
  function sid(){return $('student')?.value||'default'}
  function grade(){return Number($('grade')?.value)||3}
  function api(){return{url:(localStorage.getItem(API_KEY)||'').trim(),token:(localStorage.getItem(TOKEN_KEY)||'').trim()}}

  // Add the most recent coach summary to future generation requests so Gemini can
  // reinforce the student's needs without sending a name or other identity data.
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    try{
      const url=typeof input==='string'?input:String(input?.url||'');
      if(url.endsWith('/word-problem')&&init?.method==='POST'&&typeof init.body==='string'){
        const body=JSON.parse(init.body),history=loadCoach(),profile=history[sid()];
        if(profile)body.coaching_profile={strengths:profile.strengths||[],practice_focus:profile.practice_focus||'',reinforcement:profile.reinforcement||'',tool_note:profile.tool_note||''};
        init={...init,body:JSON.stringify(body)};
      }
    }catch(_){}
    return nativeFetch(input,init);
  };

  function toolSnapshot(){
    if(window.MathWordTools?.snapshot)return window.MathWordTools.snapshot();
    const tool=[...document.querySelectorAll('[data-math-tool]')].find(x=>x.classList.contains('on'))?.dataset.mathTool||'blank';
    return{tool,known:$('known-note')?.value.trim().slice(0,180)||'',finding:$('unknown-note')?.value.trim().slice(0,180)||'',drawingUsed:tool!=='blank',used:tool!=='blank'};
  }

  function capture(skipped=false){
    const problem=$('problem')?.textContent.trim();
    if(!problem||problem==='Loading…')return;
    const feedback=$('feedback')?.textContent||'';
    const entered=skipped?null:($('answer')?.value.trim()||null);
    const correct=!skipped&&feedback.startsWith('✅');
    const work=toolSnapshot();
    attempts.push({problem,entered,correct,skipped,hintUsed,work});
    hintUsed=false;
  }

  $('hint')?.addEventListener('click',()=>{hintUsed=true});
  $('check')?.addEventListener('click',()=>capture(false));
  $('skip')?.addEventListener('click',()=>capture(true));
  $('start')?.addEventListener('click',()=>{attempts.length=0;hintUsed=false;lastGradedCount=0;const box=$('ai-coach');if(box)box.style.display='none'});
  $('again')?.addEventListener('click',()=>{attempts.length=0;hintUsed=false;lastGradedCount=0});

  async function requestGrade(){
    const {url,token}=api();
    if(!url||!token||grading||!attempts.length||attempts.length===lastGradedCount)return;
    grading=true;lastGradedCount=attempts.length;
    const box=$('ai-coach'),text=$('ai-coach-text');
    if(box)box.style.display='block';if(text)text.textContent='Looking over how you solved the problems…';
    try{
      const compact=attempts.map((a,i)=>({number:i+1,problem:a.problem,entered:a.entered,correct:a.correct,skipped:a.skipped,hint_used:a.hintUsed,tool:a.work?.tool||'blank',known:a.work?.known||'',finding:a.work?.finding||'',drawing_used:Boolean(a.work?.drawingUsed),drawing:a.work?.image||null}));
      const r=await nativeFetch(url.replace(/\/$/,'')+'/grade-session',{method:'POST',headers:{'Content-Type':'application/json','X-Math-App-Token':token},body:JSON.stringify({grade:grade(),attempts:compact})});
      if(!r.ok)throw new Error('coach '+r.status);
      const g=await r.json();
      const feedback=String(g.feedback||'Nice work. Keep using a model when a story feels tricky.');
      if(text)text.textContent=feedback;
      const h=loadCoach();h[sid()]={at:new Date().toISOString(),strengths:Array.isArray(g.strengths)?g.strengths.slice(0,4):[],practice_focus:String(g.practice_focus||''),reinforcement:String(g.reinforcement||''),tool_note:String(g.tool_note||''),feedback};saveCoach(h);
    }catch(_){
      if(box)box.style.display='none';
    }finally{grading=false}
  }

  const results=$('results');
  if(results)new MutationObserver(()=>{if(results.style.display==='block')setTimeout(requestGrade,50)}).observe(results,{attributes:true,attributeFilter:['style']});
})();