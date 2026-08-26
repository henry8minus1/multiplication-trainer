# Optional AI word-problem backend

The GitHub Pages app works **without any AI account or backend**. `word-problems.html` has a built-in adaptive problem generator and will automatically fall back to it whenever the AI backend is unavailable.

The optional backend exists only to make word problems more varied and adaptive. It should always run server-side so API keys never appear in the public GitHub Pages JavaScript.

## Recommended architecture

```text
GitHub Pages app
      |
      | POST /word-problem
      v
Cloudflare Worker
      |
      +--> OpenAI API     OR
      +--> Anthropic API  OR
      +--> another provider
```

The browser should know only the Worker URL. **Never put `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or any other provider key in this repository, `word-problems.js`, browser localStorage, or the Parent / AI settings field.**

The frontend sends only an anonymous learning profile: grade, requested math skill, adaptive difficulty, and recent accuracy by skill. It does not send the student's name, school, location, handwriting, or full local history.

---

# Option A — OpenAI

The included `cloudflare-worker.js` is currently configured for OpenAI and uses the Responses API.

## 1. Create an OpenAI API account and key

1. Go to the OpenAI developer platform.
2. Create or select a Project.
3. Open the API keys page and create a new secret key.
4. Copy the key once and store it securely.
5. Configure API billing / credits for that Project if required.

A ChatGPT Plus/Pro subscription is separate from API billing; a ChatGPT subscription does not automatically provide API usage credits.

## 2. Create a Cloudflare Worker

You can use either the Cloudflare dashboard or Wrangler CLI.

### Dashboard route

1. Sign in to Cloudflare.
2. Open **Workers & Pages**.
3. Choose **Create application → Worker**.
4. Give it a name such as `math-word-problems`.
5. Replace the starter code with the contents of `backend/cloudflare-worker.js`.
6. Deploy once.

### Wrangler route

```bash
npm install -g wrangler
wrangler login
wrangler init math-word-problems
```

Replace the generated Worker code with `cloudflare-worker.js`, then deploy:

```bash
wrangler deploy
```

## 3. Add the OpenAI key as a Worker secret

With Wrangler:

```bash
wrangler secret put OPENAI_API_KEY
```

Paste the key when prompted.

Or in the Cloudflare dashboard open the Worker and add an encrypted secret named:

```text
OPENAI_API_KEY
```

Do **not** add the key as a plain-text JavaScript variable.

## 4. Connect the website

After deployment Cloudflare will give you a URL similar to:

```text
https://math-word-problems.<your-subdomain>.workers.dev
```

On the website open:

**Word Problems → Parent / AI settings**

Paste only the Worker base URL. The browser calls:

```text
POST <base-url>/word-problem
```

## OpenAI model choice

The current Worker uses `gpt-5.4-mini`. For this task, a smaller model is usually sufficient because the request is short, structured, and narrowly constrained. `gpt-5.4-nano` is an even cheaper option if its problem quality is acceptable.

As of August 2026, OpenAI lists standard API pricing for `gpt-5.4-mini` at roughly $0.75 per million input tokens and $4.50 per million output tokens, and `gpt-5.4-nano` at roughly $0.20 input / $1.25 output per million tokens. Check current OpenAI pricing before relying on these numbers because model pricing can change.

For a family-sized math app, cost should generally be very small if requests are short and you generate problems in small batches rather than sending large histories.

---

# Option B — Claude / Anthropic

Claude can also be used for the same backend pattern. The API key must still live only in the Worker.

## 1. Create an Anthropic API key

1. Sign in to the Claude / Anthropic developer console.
2. Open **Settings → API keys**.
3. Create a key for this project.
4. Choose an expiration appropriate for a long-running Worker, or plan to rotate the key periodically.
5. Copy the key and store it securely.
6. Enable API billing / credits as required by the Anthropic Console.

Anthropic's regular Claude web subscription and Claude API billing are separate products; having Claude Pro/Max does not mean the API is free.

## 2. Add the Claude key to Cloudflare

With Wrangler:

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Or add an encrypted Worker secret named:

```text
ANTHROPIC_API_KEY
```

A direct Claude HTTP request uses the Anthropic Messages API and sends the key in the `x-api-key` header together with the required `anthropic-version` header.

## 3. Recommended Claude model

For generating short elementary word problems, start with:

```text
claude-haiku-4-5
```

Haiku is the best fit here because this task needs good language variety and instruction-following but not deep agentic reasoning. Anthropic's May 2026 list price for Claude Haiku 4.5 was $1 per million input tokens and $5 per million output tokens. Check the current Anthropic pricing page before relying on that number.

A Sonnet-class model can be used if you prefer the writing quality, but it is unnecessary for most of these requests and costs more.

## 4. Worker implementation note

The repository's current `cloudflare-worker.js` is the OpenAI implementation. To use Claude, the Worker should keep the same `/word-problem` request/response contract but replace the OpenAI call with Anthropic's `POST /v1/messages` API and parse the returned JSON text into the same object shape:

```json
{
  "problem": "...",
  "answer": 12,
  "hint": "...",
  "explanation": "...",
  "skill": "mul",
  "difficulty": "grade-3"
}
```

Keeping this contract identical means the GitHub Pages frontend does not need to know which model provider is behind the Worker.

---

# Is there a free option?

Yes — there are **three useful zero-cost paths**, with different tradeoffs.

## 1. Built-in generator — completely free and private

This is the safest default. No account, API key, network request, or cloud service is required. It already adapts using local student performance and keeps working offline.

Use AI only as an enhancement for variety rather than making the app dependent on it.

## 2. Google Gemini API free tier

Google currently offers a Gemini Developer API free tier for selected models, including free input and output tokens subject to rate limits. For a small family math app this can be a very practical zero-cost AI backend.

A good low-cost/free-tier candidate is a Flash or Flash-Lite model. The exact models and free quotas change, so check the Gemini API pricing and rate-limit pages before choosing one.

Important privacy tradeoff: Google's free tier documentation says free-tier content may be used to improve Google products, while paid-tier usage has different data-use terms. Because this app involves children, keep the payload anonymous exactly as this project already does and do not send names or other identifying details.

## 3. Cloudflare Worker free tier

Cloudflare Workers themselves have a free allowance suitable for very small personal projects. The AI provider is the part that may charge, so pairing a free Worker with Gemini's free API tier can make the whole AI path effectively free at family usage levels.

---

# Recommended setup for this project

For now I would use this order:

1. **Built-in adaptive generator** as the guaranteed fallback.
2. **Gemini free tier** if you want truly free fresh AI-generated problems.
3. **OpenAI `gpt-5.4-nano` or `gpt-5.4-mini`** if you want predictable structured-output behavior and very low paid usage.
4. **Claude Haiku 4.5** if you prefer Claude's language style.

The backend should eventually support a provider setting such as `openai`, `anthropic`, or `gemini`, with each API key stored as an encrypted Cloudflare Worker secret. Then changing providers would not require touching the public website.

---

# Safety, privacy, and cost controls

Because this endpoint is reachable from a public website, do not rely only on the fact that the API key is hidden. Before leaving it enabled long-term:

- Restrict CORS to the GitHub Pages origin.
- Add Cloudflare rate limiting or another request cap.
- Set provider-side spend limits / budget alerts when available.
- Keep prompts and output token limits small.
- Do not forward student names or other identifying information.
- Log errors, but do not log student data.
- Keep the local generator as the fallback whenever the backend errors or reaches quota.

For this app, generating a small batch of problems ahead of time and caching them locally is preferable to calling the model on every screen transition. It lowers cost, reduces latency, and makes temporary API outages invisible to the student.
