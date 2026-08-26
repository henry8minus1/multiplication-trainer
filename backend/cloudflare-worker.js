// Optional Cloudflare Worker backend for word-problems.html.
// Recommended free setup: AI_PROVIDER=gemini + GEMINI_API_KEY secret.
// Optional paid setup: AI_PROVIDER=openai + OPENAI_API_KEY secret.
// Also configure MATH_APP_ACCESS_TOKEN as a Worker secret. Browsers must send it
// in X-Math-App-Token before this Worker will spend any AI-provider quota.

const ALLOWED_ORIGIN = 'https://henry8minus1.github.io';
const DEFAULT_PROVIDER = 'gemini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Math-App-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(body, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json; charset=utf-8', ...cors(origin)},
  });
}

function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

const allowedSkills = ['add','sub','mul','div'];

// OpenAI accepts full JSON Schema here, including additionalProperties.
const openAISchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    problem: {type: 'string'},
    answer: {type: 'number'},
    hint: {type: 'string'},
    explanation: {type: 'string'},
    skill: {type: 'string', enum: allowedSkills},
    difficulty: {type: 'string'},
  },
  required: ['problem','answer','hint','explanation','skill','difficulty'],
};

// Gemini's responseSchema supports a JSON-Schema-like subset. Do not send
// additionalProperties, which Gemini rejects as an unknown field.
const geminiSchema = {
  type: 'object',
  properties: {
    problem: {type: 'string'},
    answer: {type: 'number'},
    hint: {type: 'string'},
    explanation: {type: 'string'},
    skill: {type: 'string', enum: allowedSkills},
    difficulty: {type: 'string'},
  },
  required: ['problem','answer','hint','explanation','skill','difficulty'],
};

function buildInstructions({grade, level, skill, profile}) {
  return `You generate one elementary-school math word problem. Return only JSON matching the requested schema. The problem must be age-appropriate for grade ${grade}, adjusted to approximately grade ${level} difficulty. Use only a numeric answer. Do not use a child's name, location, school, or any personal information. Avoid trick questions. Make the wording natural and varied. For grades 1-2, use one-step problems. Grade 3 may occasionally use two steps. Grades 4-5 may use one or two steps. Keep the story under 65 words. The requested primary skill is ${skill}. Give a short hint that does not reveal the answer and a concise worked explanation. Favor problem structures that can be modeled with elementary Read-Draw-Write strategies such as tape diagrams, number bonds, number lines, equal groups/arrays, or place-value models when appropriate. Recent anonymous performance profile: ${JSON.stringify(profile)}.`;
}

function validateProblem(x) {
  if (!x || typeof x !== 'object') return null;
  if (typeof x.problem !== 'string' || !x.problem.trim()) return null;
  if (typeof x.answer !== 'number' || !Number.isFinite(x.answer)) return null;
  if (typeof x.hint !== 'string' || typeof x.explanation !== 'string') return null;
  if (!allowedSkills.includes(x.skill)) return null;
  if (typeof x.difficulty !== 'string') return null;
  return {problem:x.problem.trim(),answer:x.answer,hint:x.hint.trim(),explanation:x.explanation.trim(),skill:x.skill,difficulty:x.difficulty.trim()};
}

async function generateWithGemini(env, instructions) {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, {
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({system_instruction:{parts:[{text:instructions}]},contents:[{role:'user',parts:[{text:'Create the next problem.'}]}],generationConfig:{temperature:0.9,maxOutputTokens:350,responseMimeType:'application/json',responseSchema:geminiSchema}}),
  });
  if (!response.ok) { const detail=await response.text(); console.error('Gemini error',response.status,detail.slice(0,500)); throw new Error('Gemini generation failed'); }
  const payload=await response.json();
  const text=payload?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
  if(!text) throw new Error('Gemini returned no text');
  return JSON.parse(text);
}

async function generateWithOpenAI(env, instructions) {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const model=env.OPENAI_MODEL||DEFAULT_OPENAI_MODEL;
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,input:[{role:'system',content:instructions},{role:'user',content:'Create the next problem.'}],text:{format:{type:'json_schema',name:'word_problem',strict:true,schema:openAISchema}},max_output_tokens:350})});
  if(!response.ok){const detail=await response.text();console.error('OpenAI error',response.status,detail.slice(0,500));throw new Error('OpenAI generation failed');}
  const payload=await response.json();let text=payload.output_text;
  if(!text&&Array.isArray(payload.output)){for(const item of payload.output){for(const part of(item.content||[])){if(part.type==='output_text'&&part.text)text=part.text;}}}
  if(!text)throw new Error('OpenAI returned no text');
  return JSON.parse(text);
}

export default {
  async fetch(request, env) {
    const origin=request.headers.get('Origin')||ALLOWED_ORIGIN;
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
    const url=new URL(request.url);

    if(request.method==='GET'&&url.pathname==='/health') {
      const provider=String(env.AI_PROVIDER||DEFAULT_PROVIDER).toLowerCase();
      return json({
        ok:true,
        provider,
        accessTokenConfigured:Boolean(env.MATH_APP_ACCESS_TOKEN),
        geminiKeyConfigured:Boolean(env.GEMINI_API_KEY),
        openAIKeyConfigured:Boolean(env.OPENAI_API_KEY),
        geminiModel:env.GEMINI_MODEL||DEFAULT_GEMINI_MODEL,
      },200,origin);
    }

    if(request.method!=='POST'||url.pathname!=='/word-problem')return json({error:'not_found'},404,origin);
    if(origin!==ALLOWED_ORIGIN)return json({error:'origin_not_allowed'},403,origin);
    if(!env.MATH_APP_ACCESS_TOKEN)return json({error:'access_control_not_configured'},503,origin);
    const supplied=request.headers.get('X-Math-App-Token')||'';
    if(!safeEqual(supplied,env.MATH_APP_ACCESS_TOKEN))return json({error:'unauthorized'},401,origin);

    let input;try{input=await request.json();}catch{return json({error:'invalid_json'},400,origin);}
    const grade=Math.max(1,Math.min(5,Number(input.grade)||3));
    const level=Math.max(1,Math.min(5,Number(input.adaptive_level)||grade));
    const skill=allowedSkills.includes(input.skill)?input.skill:'add';
    const profile=input.profile&&typeof input.profile==='object'?input.profile:{};
    const instructions=buildInstructions({grade,level,skill,profile});
    const provider=String(env.AI_PROVIDER||DEFAULT_PROVIDER).toLowerCase();

    try{
      let generated;
      if(provider==='gemini')generated=await generateWithGemini(env,instructions);
      else if(provider==='openai')generated=await generateWithOpenAI(env,instructions);
      else return json({error:'unsupported_provider',provider},503,origin);
      const valid=validateProblem(generated);
      if(!valid)return json({error:'invalid_generation'},502,origin);
      return json(valid,200,origin);
    }catch(err){
      console.error('Generation failure',provider,String(err&&err.message||err));
      const configured=provider==='gemini'?Boolean(env.GEMINI_API_KEY):provider==='openai'?Boolean(env.OPENAI_API_KEY):false;
      return json({error:configured?'generation_failed':'backend_not_configured',provider},configured?502:503,origin);
    }
  }
};
