(() => {
  const canvas=document.getElementById('work-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const wrap=document.getElementById('work-wrap');
  const toggle=document.getElementById('work-toggle');
  const toolButtons=[...document.querySelectorAll('[data-math-tool]')];
  const clear=document.getElementById('work-clear');
  const undo=document.getElementById('work-undo');
  const known=document.getElementById('known-note');
  const unknown=document.getElementById('unknown-note');
  let strokes=[],current=null,background='blank';

  function size(){
    const r=canvas.getBoundingClientRect(),d=Math.max(1,window.devicePixelRatio||1);
    const w=Math.max(320,Math.round(r.width*d)),h=Math.max(260,Math.round(r.height*d));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;redraw();}
  }
  function pt(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)/r.width,y:(ev.clientY-r.top)/r.height}}
  function line(x1,y1,x2,y2,w=2){ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  function text(t,x,y,size=18){ctx.font=`700 ${size}px system-ui`;ctx.fillText(t,x,y)}
  function drawTemplate(){
    const w=canvas.width,h=canvas.height,s=Math.max(2,w/420*2);ctx.clearRect(0,0,w,h);ctx.strokeStyle='#9a948a';ctx.fillStyle='#69645e';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=s;
    if(background==='tape'){
      const x=w*.13,y=h*.32,bw=w*.74,bh=h*.18;ctx.strokeRect(x,y,bw,bh);line(x+bw*.5,y,x+bw*.5,y+bh,s);text('part',x+bw*.18,y+bh*.62,Math.round(w*.035));text('part',x+bw*.68,y+bh*.62,Math.round(w*.035));line(x,y+bh+h*.12,x+bw,y+bh+h*.12,s);line(x,y+bh+h*.09,x,y+bh+h*.15,s);line(x+bw,y+bh+h*.09,x+bw,y+bh+h*.15,s);text('whole / ?',x+bw*.36,y+bh+h*.2,Math.round(w*.035));
    } else if(background==='bond'){
      const cx=w*.5,top=h*.24,r=Math.min(w,h)*.10,left=w*.32,right=w*.68,bottom=h*.68;ctx.beginPath();ctx.arc(cx,top,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(left,bottom,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(right,bottom,r,0,Math.PI*2);ctx.stroke();line(cx-r*.35,top+r*.9,left+r*.35,bottom-r*.9,s);line(cx+r*.35,top+r*.9,right-r*.35,bottom-r*.9,s);text('whole',cx-r*.62,top+6,Math.round(w*.035));text('part',left-r*.45,bottom+6,Math.round(w*.035));text('part',right-r*.45,bottom+6,Math.round(w*.035));
    } else if(background==='numberline'){
      const y=h*.52,x1=w*.1,x2=w*.9;line(x1,y,x2,y,s*1.5);for(let i=0;i<=10;i++){const x=x1+(x2-x1)*i/10;line(x,y-h*.04,x,y+h*.04,s);if(i%2===0)text(String(i),x-w*.012,y+h*.12,Math.round(w*.028))}text('Use jumps to show your thinking',w*.23,h*.28,Math.round(w*.034));
    } else if(background==='groups'){
      const cols=4,rows=3;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const cx=w*(.2+c*.2),cy=h*(.25+r*.25),rr=Math.min(w,h)*.07;ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);ctx.stroke();}text('Draw equal groups or an array',w*.25,h*.1,Math.round(w*.034));
    } else if(background==='place'){
      const x=w*.12,y=h*.22,bw=w*.76,bh=h*.55;ctx.strokeRect(x,y,bw,bh);for(let i=1;i<3;i++)line(x+bw*i/3,y,x+bw*i/3,y+bh,s);line(x,y+bh*.22,x+bw,y+bh*.22,s);text('Hundreds',x+bw*.04,y+bh*.15,Math.round(w*.028));text('Tens',x+bw*.4,y+bh*.15,Math.round(w*.028));text('Ones',x+bw*.72,y+bh*.15,Math.round(w*.028));
    } else {
      ctx.fillStyle='#9a948a';text('Draw a picture or model here',w*.28,h*.12,Math.round(w*.032));
    }
  }
  function redraw(){drawTemplate();ctx.strokeStyle='#171717';ctx.lineWidth=Math.max(5,canvas.width*.008);ctx.lineCap='round';ctx.lineJoin='round';for(const st of strokes){if(st.length<1)continue;ctx.beginPath();ctx.moveTo(st[0].x*canvas.width,st[0].y*canvas.height);for(let i=1;i<st.length;i++)ctx.lineTo(st[i].x*canvas.width,st[i].y*canvas.height);ctx.stroke()}}
  canvas.addEventListener('pointerdown',ev=>{ev.preventDefault();canvas.setPointerCapture(ev.pointerId);current=[pt(ev)];strokes.push(current);redraw()});
  canvas.addEventListener('pointermove',ev=>{if(!current)return;current.push(pt(ev));redraw()});
  const end=()=>{current=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  toggle.addEventListener('click',()=>{const on=wrap.style.display!=='none';wrap.style.display=on?'none':'block';toggle.textContent=on?'Open problem-solving tools':'Hide problem-solving tools';if(!on)setTimeout(size,0)});
  toolButtons.forEach(b=>b.addEventListener('click',()=>{background=b.dataset.mathTool;toolButtons.forEach(x=>x.classList.toggle('on',x===b));redraw()}));
  clear.addEventListener('click',()=>{strokes=[];redraw()});undo.addEventListener('click',()=>{strokes.pop();redraw()});
  window.addEventListener('resize',()=>{if(wrap.style.display!=='none')size()});
  window.MathWordTools={reset(){strokes=[];background='blank';toolButtons.forEach(x=>x.classList.remove('on'));if(known)known.value='';if(unknown)unknown.value='';redraw()}};
  size();
})();