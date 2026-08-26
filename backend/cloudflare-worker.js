// Optional Cloudflare Worker backend for word-problems.html.
// Recommended free setup: AI_PROVIDER=gemini + GEMINI_API_KEY secret.
// Optional paid setup: AI_PROVIDER=openai + OPENAI_API_KEY secret.
// Also configure MATH_APP_ACCESS_TOKEN as a Worker secret. Browsers must send it
// in X-Math-App-Token before this Worker will spend any AI-provider quota.

const ALLOWED_ORIGIN = 'https://henry8minus1.github.io';
const DEFAULT_PROVIDER = 'gemini';
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

function cors(origin){const allowed=origin===ALLOWED_ORIGIN?origin:ALLOWED_ORIGIN;return{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Math-App-Token','Access-Control-Max-Age':'86400','Vary':'Origin'}}
function json(body,status=200,origin=ALLOWED_ORIGIN){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin)}})}
function safeEqual(a,b){a=String(a||'');b=String(b||'');let diff=a.length^b.length;const n=Math.max(a.length,b.length);for(let i=0;i<n;i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}

const allowedSkills=['add','sub','mul','div'];
const openAISchema={type:'object',additionalProperties:false,properties:{problem:{type:'string'},answer:{type:'number'},hint:{type:'string'},explanation:{type:'string'},skill:{type:'string',enum:allowedSkills},difficulty:{type:'string'}},required:['problem','answer','hint','explanation','skill','difficulty']};
const geminiSchema={type:'object',properties:{problem:{type:'string'},answer:{type:'number'},hint:{type:'string'},explanation:{type:'string'},skill:{type:'string',enum:allowedSkills},difficulty:{type:'string'}},required:['problem','answer','hint','explanation','skill','difficulty']};
const geminiBatchSchema={type:'object',properties:{problems:{type:'array',items:geminiSchema}},required:['problems']};
const coachSchema={type:'object',properties:{feedback:{type:'string'},strengths:{type:'array',items:{type:'string'}},practice_focus:{type:'string'},reinforcement:{type:'string'},tool_note:{type:'string'}},required:['feedback','strengths','practice_focus','reinforcement','tool_note']};

function priorCoach(coaching){return coaching&&typeof coaching==='object'?` Prior coach notes from earlier sessions: ${JSON.stringify(coaching)}. Use them gently to reinforce needed skills; do not mention that you have a stored profile.`:''}
function buildInstructions({grade,level,skill,profile,coaching}){
  return `You generate one elementary-school math word problem. Return only JSON matching the requested schema. The problem must be age-appropriate for grade ${grade}, adjusted to approximately grade ${level} difficulty. Use only a numeric answer. Do not use a child's name, location, school, or any personal information. Avoid trick questions. Make the wording natural and varied. For grades 1-2, use one-step problems. Grade 3 may occasionally use two steps. Grades 4-5 may use one or two steps. Keep the story under 65 words. The requested primary skill is ${skill}. Give a short hint that does not reveal the answer and a concise worked explanation. Favor problem structures that can be modeled with elementary Read-Draw-Write strategies such as tape diagrams, number bonds, number lines, equal groups/arrays, or place-value models when appropriate. Recent anonymous performance profile: ${JSON.stringify(profile)}.${priorCoach(coaching)}`;
}
function buildBatchInstructions({grade,requests,profile,coaching}){
  return `Generate exactly ${requests.length} distinct elementary-school math word problems as one JSON response. Return an object with a problems array in the same order as this plan: ${JSON.stringify(requests)}. Each item's skill must match the plan entry and its difficulty should be appropriate to that entry's adaptive_level while remaining suitable for a grade ${grade} student. Use numeric answers only. Do not use a child's name, location, school, or other personal information. Avoid trick questions. Keep each story under 65 words. For grades 1-2 use one-step problems; grade 3 may occasionally use two steps; grades 4-5 may use one or two steps. Make the stories varied rather than repeating one template. Give a short hint that does not reveal the answer and a concise worked explanation. Favor Read-Draw-Write-friendly structures such as tape diagrams, number bonds, number lines, equal groups/arrays, and place-value models when appropriate. Recent anonymous performance profile: ${JSON.stringify(profile)}.${priorCoach(coaching)}`;
}
function validateProblem(x){if(!x||typeof x!=='object'||typeof x.problem!=='string'||!x.problem.trim()||typeof x.answer!=='number'||!Number.isFinite(x.answer)||typeof x.hint!=='string'||typeof x.explanation!=='string'||!allowedSkills.includes(x.skill)||typeof x.difficulty!=='string')return null;return{problem:x.problem.trim(),answer:x.answer,hint:x.hint.trim(),explanation:x.explanation.trim(),skill:x.skill,difficulty:x.difficulty.trim()}}

async function geminiJSON(env,instructions,userParts,responseSchema,maxOutputTokens=1200){
  if(!env.GEMINI_API_KEY)throw new Error('GEMINI_API_KEY is not configured');
  const model=env.GEMINI_MODEL||DEFAULT_GEMINI_MODEL;
  const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system_instruction:{parts:[{text:instructions}]},contents:[{role:'user',parts:userParts}],generationConfig:{maxOutputTokens,thinkingConfig:{thinkingLevel:'low'},responseMimeType:'application/json',responseSchema}})});
  if(!response.ok){const detail=await response.text();console.error('Gemini error',response.status,detail.slice(0,500));throw new Error('Gemini generation failed')}
  const payload=await response.json(),candidate=payload?.candidates?.[0],text=candidate?.content?.parts?.map(p=>p.text||'').join('').trim();
  if(!text)throw new Error('Gemini returned no text');
  try{return JSON.parse(text)}catch(err){console.error('Gemini invalid JSON','finishReason='+String(candidate?.finishReason||'unknown'),'chars='+text.length,text.slice(0,180));throw err}
}
async function generateWithGemini(env,instructions){return geminiJSON(env,instructions,[{text:'Create the next problem.'}],geminiSchema,1200)}
async function generateBatchWithGemini(env,instructions,count){return geminiJSON(env,instructions,[{text:`Create the full set of ${count} problems now.`}],geminiBatchSchema,Math.min(8000,1400+count*430))}
async function generateWithOpenAI(env,instructions){if(!env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is not configured');const model=env.OPENAI_MODEL||DEFAULT_OPENAI_MODEL;const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,input:[{role:'system',content:instructions},{role:'user',content:'Create the next problem.'}],text:{format:{type:'json_schema',name:'word_problem',strict:true,schema:openAISchema}},max_output_tokens:350})});if(!response.ok){const detail=await response.text();console.error('OpenAI error',response.status,detail.slice(0,500));throw new Error('OpenAI generation failed')}const payload=await response.json();let text=payload.output_text;if(!text&&Array.isArray(payload.output)){for(const item of payload.output){for(const part of(item.content||[])){if(part.type==='output_text'&&part.text)text=part.text}}}if(!text)throw new Error('OpenAI returned no text');return JSON.parse(text)}

async function gradeWithGemini(env,grade,attempts){
  const safe=attempts.slice(0,15).map(a=>({number:a.number,problem:String(a.problem||'').slice(0,500),entered:a.entered===null?null:String(a.entered||'').slice(0,40),correct:Boolean(a.correct),skipped:Boolean(a.skipped),hint_used:Boolean(a.hint_used),tool:String(a.tool||'blank').slice(0,40),known:String(a.known||'').slice(0,180),finding:String(a.finding||'').slice(0,180),drawing_used:Boolean(a.drawing_used)}));
  const instructions=`You are a warm elementary math coach reviewing a completed grade ${grade} word-problem set. The app has already graded numeric correctness; do not overturn those grades. Analyze patterns in operation choice, use of hints, Read-Draw-Write notes, and visual tools. If a drawing image is supplied, use it only to understand the student's mathematical representation, not handwriting identity or personal traits. Give brief, specific, age-appropriate feedback directly to the student: praise one real strength, name one next step, and suggest one concrete strategy/tool to try. Never shame, rank, diagnose, or mention AI. Return JSON. Keep feedback under 90 words. Also return concise machine-readable strengths, practice_focus, reinforcement, and tool_note for future adaptive problem generation. No child name or identifying information is provided.`;
  const parts=[{text:'Session data: '+JSON.stringify(safe)}];
  for(const a of attempts.slice(0,5)){const d=String(a.drawing||'');const m=d.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/);if(m){parts.push({text:`Drawing for problem ${a.number}:`});parts.push({inline_data:{mime_type:m[1]==='png'?'image/png':'image/jpeg',data:m[2]}})}}
  return geminiJSON(env,instructions,parts,coachSchema,1400);
}

export default{async fetch(request,env){
  const origin=request.headers.get('Origin')||ALLOWED_ORIGIN;if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/health'){const provider=String(env.AI_PROVIDER||DEFAULT_PROVIDER).toLowerCase();return json({ok:true,provider,accessTokenConfigured:Boolean(env.MATH_APP_ACCESS_TOKEN),geminiKeyConfigured:Boolean(env.GEMINI_API_KEY),openAIKeyConfigured:Boolean(env.OPENAI_API_KEY),geminiModel:env.GEMINI_MODEL||DEFAULT_GEMINI_MODEL,batchGeneration:true},200,origin)}
  if(request.method!=='POST'||!['/word-problem','/word-problem-batch','/grade-session'].includes(url.pathname))return json({error:'not_found'},404,origin);
  if(origin!==ALLOWED_ORIGIN)return json({error:'origin_not_allowed'},403,origin);if(!env.MATH_APP_ACCESS_TOKEN)return json({error:'access_control_not_configured'},503,origin);const supplied=request.headers.get('X-Math-App-Token')||'';if(!safeEqual(supplied,env.MATH_APP_ACCESS_TOKEN))return json({error:'unauthorized'},401,origin);
  let input;try{input=await request.json()}catch{return json({error:'invalid_json'},400,origin)}
  const provider=String(env.AI_PROVIDER||DEFAULT_PROVIDER).toLowerCase();
  if(url.pathname==='/grade-session'){
    const grade=Math.max(1,Math.min(5,Number(input.grade)||3)),attempts=Array.isArray(input.attempts)?input.attempts:[];if(!attempts.length)return json({error:'no_attempts'},400,origin);if(provider!=='gemini')return json({error:'grading_provider_not_supported',provider},503,origin);
    try{const g=await gradeWithGemini(env,grade,attempts);return json({feedback:String(g.feedback||''),strengths:Array.isArray(g.strengths)?g.strengths:[],practice_focus:String(g.practice_focus||''),reinforcement:String(g.reinforcement||''),tool_note:String(g.tool_note||'')},200,origin)}catch(err){console.error('Grading failure',String(err&&err.message||err));return json({error:'grading_failed'},502,origin)}
  }
  if(url.pathname==='/word-problem-batch'){
    const grade=Math.max(1,Math.min(5,Number(input.grade)||3)),raw=Array.isArray(input.requests)?input.requests:[],requests=raw.slice(0,15).map(r=>({skill:allowedSkills.includes(r?.skill)?r.skill:'add',adaptive_level:Math.max(1,Math.min(5,Number(r?.adaptive_level)||grade))})),profile=input.profile&&typeof input.profile==='object'?input.profile:{},coaching=input.coaching_profile&&typeof input.coaching_profile==='object'?input.coaching_profile:{};
    if(!requests.length)return json({error:'no_requests'},400,origin);if(provider!=='gemini')return json({error:'batch_provider_not_supported',provider},503,origin);
    const instructions=buildBatchInstructions({grade,requests,profile,coaching});
    try{const generated=await generateBatchWithGemini(env,instructions,requests.length),arr=Array.isArray(generated?.problems)?generated.problems:[];if(arr.length!==requests.length)return json({error:'invalid_batch_size'},502,origin);const valid=arr.map(validateProblem);if(valid.some(x=>!x))return json({error:'invalid_generation'},502,origin);for(let i=0;i<valid.length;i++)valid[i].skill=requests[i].skill;return json({problems:valid},200,origin)}catch(err){console.error('Batch generation failure',provider,String(err&&err.message||err));return json({error:'batch_generation_failed',provider},502,origin)}
  }
  const grade=Math.max(1,Math.min(5,Number(input.grade)||3)),level=Math.max(1,Math.min(5,Number(input.adaptive_level)||grade)),skill=allowedSkills.includes(input.skill)?input.skill:'add',profile=input.profile&&typeof input.profile==='object'?input.profile:{},coaching=input.coaching_profile&&typeof input.coaching_profile==='object'?input.coaching_profile:{};const instructions=buildInstructions({grade,level,skill,profile,coaching});
  try{let generated;if(provider==='gemini')generated=await generateWithGemini(env,instructions);else if(provider==='openai')generated=await generateWithOpenAI(env,instructions);else return json({error:'unsupported_provider',provider},503,origin);const valid=validateProblem(generated);if(!valid)return json({error:'invalid_generation'},502,origin);return json(valid,200,origin)}catch(err){console.error('Generation failure',provider,String(err&&err.message||err));const configured=provider==='gemini'?Boolean(env.GEMINI_API_KEY):provider==='openai'?Boolean(env.OPENAI_API_KEY):false;return json({error:configured?'generation_failed':'backend_not_configured',provider},configured?502:503,origin)}
}};