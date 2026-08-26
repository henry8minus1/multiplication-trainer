(() => {
  const KEY='multiplication-trainer-v2',TEST_SECONDS=60,TEST_COUNT=20,DEFAULT_STUDENTS=['Luke','Blake','Leo','Brig'];
  const SKILLS={add:{name:'Addition',symbol:'+'},sub:{name:'Subtraction',symbol:'−'},mul:{name:'Multiplication',symbol:'×'},div:{name:'Division',symbol:'÷'}};
  const $=id=>document.getElementById(id),e={setup:$('setup'),live:$('live'),results:$('results'),student:$('student'),range:$('range'),skills:$('skills'),families:$('families'),start:$('start'),timer:$('timer'),qcount:$('qcount'),progress:$('test-progress'),question:$('question'),recognized:$('recognized'),clear:$('clear'),submit:$('submit-answer'),grade:$('grade-big'),gradeLabel:$('grade-label'),percent:$('percent'),answered:$('answered-stat'),time:$('time-stat'),review:$('review'),again:$('again')};
  function uid(){return'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function blank(name){return{id:uid(),name,mastery:{},history:[],testHistory:[]}}
  function load(){let x=null;try{x=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){}if(!x||!Array.isArray(x.students))x={students:[],activeStudent:null};for(const name of DEFAULT_STUDENTS)if(!x.students.some(s=>String(s.name).toLowerCase()===name.toLowerCase()))x.students.push(blank(name));for(const s of x.students){s.mastery=s.mastery||{};s.history=s.history||[];s.testHistory=s.testHistory||[]}return x}
  let data=load(),sid=data.activeStudent||data.students[0].id,skills=['mul'],families=[3],maxFact=5,questions=[],index=0,answers=[],startedAt=0,timerId=null,ended=false;
  const canvases=[...document.querySelectorAll('.digit-canvas')],drawings=canvases.map(()=>({strokes:[],current:null})),templates=[];
  function save(){data.activeStudent=sid;try{localStorage.setItem(KEY,JSON.stringify(data))}catch(_){}}
  function student(){return data.students.find(s=>s.id===sid)||data.students[0]}
  function renderStudents(){e.student.innerHTML='';for(const s of data.students){const o=document.createElement('option');o.value=s.id;o.textContent=s.name;e.student.appendChild(o)}e.student.value=sid}
  function renderPicks(){e.skills.innerHTML='';for(const sk of Object.keys(SKILLS)){const b=document.createElement('button');b.type='button';b.className='test-pick'+(skills.includes(sk)?' on':'');b.textContent=SKILLS[sk].symbol+' '+SKILLS[sk].name;b.addEventListener('click',()=>{if(skills.includes(sk)){if(skills.length===1)return;skills=skills.filter(x=>x!==sk)}else skills.push(sk);renderPicks()});e.skills.appendChild(b)}e.families.innerHTML='';for(let n=1;n<=12;n++){const b=document.createElement('button');b.type='button';b.className='test-pick'+(families.includes(n)?' on':'');b.textContent=n;b.addEventListener('click',()=>{if(families.includes(n)){if(families.length===1)return;families=families.filter(x=>x!==n)}else families=[...families,n].sort((a,b)=>a-b);renderPicks()});e.families.appendChild(b)}}
  function equation(sk,a,b){if(sk==='mul')return{text:a+' × '+b,answer:a*b};if(sk==='add')return{text:a+' + '+b,answer:a+b};if(sk==='sub')return{text:(a+b)+' − '+a,answer:b};return{text:(a*b)+' ÷ '+a,answer:b}}
  function makeQuestions(){const pool=[];for(const sk of skills)for(const a of families)for(let b=0;b<=maxFact;b++)pool.push({sk,a,b,...equation(sk,a,b)});shuffle(pool);const out=[];while(out.length<TEST_COUNT){for(const q of pool){out.push(q);if(out.length===TEST_COUNT)break}shuffle(pool)}return out}
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function fitCanvas(c){const r=c.getBoundingClientRect(),d=Math.max(1,window.devicePixelRatio||1),w=Math.max(80,Math.round(r.width*d)),h=Math.max(90,Math.round(r.height*d));if(c.width!==w||c.height!==h){c.width=w;c.height=h;redraw(Number(c.dataset.slot))}}
  function redraw(slot){const c=canvases[slot],ctx=c.getContext('2d'),d=drawings[slot];ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='#111';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(6,c.width*.045);for(const stroke of d.strokes){if(stroke.length<1)continue;ctx.beginPath();ctx.moveTo(stroke[0].x*c.width,stroke[0].y*c.height);for(let i=1;i<stroke.length;i++)ctx.lineTo(stroke[i].x*c.width,stroke[i].y*c.height);ctx.stroke()}}
  function point(ev,c){const r=c.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height))}}
  canvases.forEach((c,slot)=>{c.addEventListener('pointerdown',ev=>{ev.preventDefault();c.setPointerCapture(ev.pointerId);const st=[point(ev,c)];drawings[slot].strokes.push(st);drawings[slot].current=st;redraw(slot)});c.addEventListener('pointermove',ev=>{if(!drawings[slot].current)return;drawings[slot].current.push(point(ev,c));redraw(slot)});const end=()=>{drawings[slot].current=null;updateRecognized()};c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end)});
  function clearWriting(){for(const d of drawings){d.strokes=[];d.current=null}canvases.forEach((_,i)=>redraw(i));updateRecognized()}
  function normalizeStrokes(strokes){const pts=strokes.flat();if(!pts.length)return[];let minX=1,minY=1,maxX=0,maxY=0;for(const p of pts){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}const w=Math.max(.05,maxX-minX),h=Math.max(.05,maxY-minY),scale=.72/Math.max(w,h),ox=.5-(minX+maxX)*scale/2,oy=.5-(minY+maxY)*scale/2;return strokes.map(st=>st.map(p=>({x:p.x*scale+ox,y:p.y*scale+oy})))}
  function raster(strokes,size=24){const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.strokeStyle='#000';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=2.4;for(const st of normalizeStrokes(strokes)){if(!st.length)continue;ctx.beginPath();ctx.moveTo(st[0].x*size,st[0].y*size);for(let i=1;i<st.length;i++)ctx.lineTo(st[i].x*size,st[i].y*size);ctx.stroke()}const im=ctx.getImageData(0,0,size,size).data,out=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(im[(y*size+x)*4+3]>40)out.push([x,y]);return out}
  const P={
    0:[[[.5,.08],[.3,.1],[.16,.28],[.14,.54],[.2,.8],[.4,.92],[.62,.9],[.8,.72],[.85,.45],[.78,.2],[.62,.09],[.5,.08]]],
    1:[[[.34,.25],[.5,.1],[.52,.9]],[[.34,.9],[.7,.9]]],
    2:[[[.18,.27],[.32,.1],[.6,.09],[.8,.25],[.76,.42],[.58,.56],[.2,.88],[.82,.88]]],
    3:[[[.2,.2],[.38,.08],[.65,.1],[.8,.28],[.7,.45],[.52,.5],[.71,.55],[.82,.72],[.7,.9],[.4,.94],[.19,.82]]],
    4:[[[.7,.92],[.7,.08]],[[.72,.12],[.18,.64],[.86,.64]]],
    5:[[[.79,.1],[.27,.1],[.22,.46],[.56,.43],[.78,.56],[.8,.77],[.62,.92],[.35,.91],[.18,.79]]],
    6:[[[.72,.16],[.57,.08],[.35,.16],[.2,.39],[.19,.67],[.32,.88],[.56,.93],[.77,.8],[.78,.6],[.64,.47],[.4,.45],[.22,.57]]],
    7:[[[.18,.12],[.82,.12],[.62,.4],[.45,.67],[.38,.93]]],
    8:[[[.5,.49],[.29,.4],[.2,.24],[.3,.09],[.52,.08],[.72,.2],[.68,.38],[.5,.49],[.31,.57],[.21,.74],[.32,.92],[.56,.94],[.77,.8],[.7,.59],[.5,.49]]],
    9:[[[.76,.52],[.62,.12],[.4,.07],[.21,.22],[.21,.42],[.36,.55],[.6,.54],[.78,.4],[.76,.7],[.64,.9],[.42,.94],[.25,.84]]]
  };
  function buildTemplates(){
    for(const d of Object.keys(P))templates.push({digit:Number(d),ink:raster(P[d]),path:P[d]});
    const fonts=['Arial','Verdana','Georgia','Trebuchet MS','Comic Sans MS'];
    for(let digit=0;digit<=9;digit++)for(const font of fonts){const c=document.createElement('canvas');c.width=90;c.height=110;const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.font='88px '+font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(digit),45,56);const im=ctx.getImageData(0,0,c.width,c.height).data,pts=[];for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(im[(y*c.width+x)*4+3]>60)pts.push([Math.round(x/c.width*23),Math.round(y/c.height*23)]);if(pts.length)templates.push({digit,ink:pts,path:null})}
  }
  function dist(a,b){if(!a.length||!b.length)return 999;let s=0;for(const p of a){let best=999;for(const q of b){const dx=p[0]-q[0],dy=p[1]-q[1],v=dx*dx+dy*dy;if(v<best)best=v}s+=best}for(const p of b){let best=999;for(const q of a){const dx=p[0]-q[0],dy=p[1]-q[1],v=dx*dx+dy*dy;if(v<best)best=v}s+=best}return s/(a.length+b.length)}
  function resamplePath(strokes,count=48){
    const norm=normalizeStrokes(strokes),pts=[];
    for(const st of norm)for(const p of st)pts.push(p);
    if(!pts.length)return[];if(pts.length===1)return Array(count).fill(pts[0]);
    const lens=[0];let total=0;for(let i=1;i<pts.length;i++){total+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);lens.push(total)}
    if(total<.001)return Array(count).fill(pts[0]);
    const out=[];for(let k=0;k<count;k++){const target=total*k/(count-1);let i=1;while(i<lens.length&&lens[i]<target)i++;if(i>=lens.length){out.push(pts[pts.length-1]);continue}const prev=lens[i-1],seg=Math.max(.0001,lens[i]-prev),f=(target-prev)/seg;out.push({x:pts[i-1].x+(pts[i].x-pts[i-1].x)*f,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*f})}return out
  }
  function orderedDistance(a,b){const pa=resamplePath(a),pb=resamplePath(b);if(!pa.length||!pb.length)return 9;let direct=0,reverse=0;for(let i=0;i<pa.length;i++){direct+=Math.hypot(pa[i].x-pb[i].x,pa[i].y-pb[i].y);const j=pa.length-1-i;reverse+=Math.hypot(pa[i].x-pb[j].x,pa[i].y-pb[j].y)}return Math.min(direct,reverse)/pa.length}
  function recognize(strokes){
    if(!strokes.flat().length)return null;
    const ink=raster(strokes),scores=Array(10).fill(Infinity);
    for(const t of templates){
      let sc=dist(ink,t.ink)/18;
      if(t.path){sc+=orderedDistance(strokes,t.path)*7+Math.abs(strokes.length-t.path.length)*.12}
      else sc+=.42;
      if(sc<scores[t.digit])scores[t.digit]=sc;
    }
    let best=0;for(let d=1;d<=9;d++)if(scores[d]<scores[best])best=d;
    return best;
  }
  function readAnswer(){const digs=drawings.map(d=>recognize(d.strokes));let str='';for(const d of digs){if(d===null){if(str)break;continue}str+=d}return str===''?null:Number(str)}
  function updateRecognized(){const v=readAnswer();e.recognized.textContent='I read: '+(v===null?'—':v)}
  function showQuestion(){if(index>=TEST_COUNT){finish(false);return}e.question.textContent=questions[index].text;e.qcount.textContent='Question '+(index+1)+' of '+TEST_COUNT;e.progress.style.width=index/TEST_COUNT*100+'%';clearWriting()}
  function startTest(){maxFact=Number(e.range.value)||5;questions=makeQuestions();answers=[];index=0;ended=false;startedAt=Date.now();e.setup.style.display='none';e.results.style.display='none';e.live.style.display='block';canvases.forEach(fitCanvas);showQuestion();tick();timerId=setInterval(tick,200)}
  function tick(){if(ended)return;const elapsed=(Date.now()-startedAt)/1000,remain=Math.max(0,TEST_SECONDS-elapsed);e.timer.textContent='0:'+String(Math.ceil(remain)).padStart(2,'0');e.timer.classList.toggle('low',remain<=10);if(remain<=0)finish(true)}
  function submitAnswer(){if(ended)return;const v=readAnswer();if(v===null){e.recognized.textContent='Write an answer first.';return}answers.push({q:questions[index],read:v,correct:v===questions[index].answer});index++;showQuestion()}
  function finish(timedOut){if(ended)return;ended=true;if(timerId)clearInterval(timerId);timerId=null;const elapsed=Math.min(TEST_SECONDS,(Date.now()-startedAt)/1000);while(answers.length<TEST_COUNT){const q=questions[answers.length];answers.push({q,read:null,correct:false})}const correct=answers.filter(a=>a.correct).length,answered=answers.filter(a=>a.read!==null).length,pct=Math.round(correct/TEST_COUNT*100);e.live.style.display='none';e.results.style.display='block';e.grade.textContent=correct+'/'+TEST_COUNT;e.gradeLabel.textContent=pct>=90?'Excellent fluency!':pct>=75?'Strong work!':pct>=50?'Good effort — keep building.':'Keep practicing — speed will come.';e.percent.textContent=pct+'% correct';e.answered.textContent=answered+' answered';e.time.textContent=(timedOut?'60.0':elapsed.toFixed(1))+' sec';e.review.innerHTML='';for(const a of answers){const d=document.createElement('div');d.className='review-row';d.innerHTML='<div class="review-q">'+a.q.text+' = '+a.q.answer+'</div><div class="review-a">Read: '+(a.read===null?'blank':a.read)+'</div><div class="right '+(a.correct?'':'wrong-text')+'">'+(a.correct?'✓':'✕')+'</div>';e.review.appendChild(d)}const item={at:new Date().toISOString(),type:'test',skills:[...skills],skillsLabel:'60-second test · '+skills.map(sk=>SKILLS[sk].name).join(' + '),families:[...families],maxFact,questions:TEST_COUNT,answered,correct,percent:pct,seconds:timedOut?60:Number(elapsed.toFixed(1)),score:correct*5};student().testHistory.push(item);student().history.push(item);if(student().testHistory.length>100)student().testHistory=student().testHistory.slice(-100);if(student().history.length>160)student().history=student().history.slice(-160);save()}
  e.student.addEventListener('change',()=>{sid=e.student.value;save()});e.range.addEventListener('change',()=>{maxFact=Number(e.range.value)||5});e.start.addEventListener('click',startTest);e.clear.addEventListener('click',clearWriting);e.submit.addEventListener('click',submitAnswer);e.again.addEventListener('click',()=>{e.results.style.display='none';e.setup.style.display='block'});window.addEventListener('resize',()=>{if(e.live.style.display==='block')canvases.forEach(fitCanvas)});
  buildTemplates();renderStudents();renderPicks();save();
})();