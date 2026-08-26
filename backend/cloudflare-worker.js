// Optional Cloudflare Worker backend for word-problems.html.
// Configure an OPENAI_API_KEY secret in the Worker environment before deploying.
// This keeps the OpenAI key off the public GitHub Pages site.

const ALLOWED_ORIGIN = 'https://henry8minus1.github.io';
const MODEL = 'gpt-5.4-mini';

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(body, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json; charset=utf-8', ...cors(origin)},
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ALLOWED_ORIGIN;
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors(origin)});
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/word-problem') return json({error: 'not_found'}, 404, origin);
    if (origin !== ALLOWED_ORIGIN) return json({error: 'origin_not_allowed'}, 403, origin);
    if (!env.OPENAI_API_KEY) return json({error: 'backend_not_configured'}, 503, origin);

    let input;
    try { input = await request.json(); } catch { return json({error: 'invalid_json'}, 400, origin); }
    const grade = Math.max(1, Math.min(5, Number(input.grade) || 3));
    const level = Math.max(1, Math.min(5, Number(input.adaptive_level) || grade));
    const allowedSkills = ['add','sub','mul','div'];
    const skill = allowedSkills.includes(input.skill) ? input.skill : 'add';
    const profile = input.profile && typeof input.profile === 'object' ? input.profile : {};

    const instructions = `You generate one elementary-school math word problem. Return only data matching the supplied JSON schema. The problem must be age-appropriate for grade ${grade}, adjusted to approximately grade ${level} difficulty. Use only a numeric answer. Do not use a child's name, location, school, or any personal information. Avoid trick questions. Make the wording natural and varied. For grades 1-2, use one-step problems. Grade 3 may occasionally use two steps. Grades 4-5 may use one or two steps. Keep the story under 65 words. The requested primary skill is ${skill}. Give a short hint that does not reveal the answer and a concise worked explanation. Recent anonymous performance profile: ${JSON.stringify(profile)}.`;

    const schema = {
      type: 'object', additionalProperties: false,
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

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: MODEL,
        input: [{role: 'system', content: instructions}, {role: 'user', content: 'Create the next problem.'}],
        text: {format: {type: 'json_schema', name: 'word_problem', strict: true, schema}},
        max_output_tokens: 350,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error('OpenAI error', response.status, detail.slice(0, 500));
      return json({error: 'generation_failed'}, 502, origin);
    }
    const payload = await response.json();
    let text = payload.output_text;
    if (!text && Array.isArray(payload.output)) {
      for (const item of payload.output) for (const part of (item.content || [])) if (part.type === 'output_text' && part.text) text = part.text;
    }
    if (!text) return json({error: 'empty_generation'}, 502, origin);
    try { return json(JSON.parse(text), 200, origin); }
    catch { return json({error: 'invalid_generation'}, 502, origin); }
  }
};
