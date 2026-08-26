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
      +--> Gemini API     OR
      +--> OpenAI API
```

The browser should know only the Worker URL. **Never put `GEMINI_API_KEY`, `OPENAI_API_KEY`, or any provider key in this repository, `word-problems.js`, browser localStorage, or the Parent / AI settings field.**

The frontend sends only an anonymous learning profile: grade, requested math skill, adaptive difficulty, and recent accuracy by skill. It does not send the student's name, school, location, handwriting, or full local history.

---

# Recommended option — Gemini free tier

The included `cloudflare-worker.js` now supports Gemini directly and defaults to Gemini when `AI_PROVIDER` is omitted.

## 1. Create a Gemini API key

1. Open Google AI Studio.
2. Open the API keys page.
3. Create or select a Google Cloud project.
4. Choose **Create API key**.
5. Copy the key and store it temporarily somewhere secure.

Do not paste this key into GitHub Pages or the repository.

## 2. Create a Cloudflare Worker

1. Sign in to Cloudflare.
2. Open **Workers & Pages**.
3. Choose **Create application → Worker**.
4. Name it something like `math-word-problems`.
5. Replace the starter code with the full contents of `backend/cloudflare-worker.js`.
6. Deploy the Worker.

## 3. Add the Gemini secret

In the Worker dashboard open **Settings → Variables and Secrets** and add:

```text
GEMINI_API_KEY
```

Set it as a **Secret**, not a normal plain-text variable, and paste the Gemini API key as the value.

Then add a normal text variable:

```text
AI_PROVIDER = gemini
```

This variable is not sensitive.

Optional model override:

```text
GEMINI_MODEL = gemini-2.5-flash
```

If `GEMINI_MODEL` is omitted, the Worker currently defaults to `gemini-2.5-flash`.

## 4. Connect the website

After deployment Cloudflare will give you a URL similar to:

```text
https://math-word-problems.<your-subdomain>.workers.dev
```

On the website open:

**Word Problems → Parent / AI settings**

Paste only the Worker base URL. The frontend calls:

```text
POST <base-url>/word-problem
```

## Gemini free tier

As of August 2026, Google documents a free tier for `gemini-2.5-flash` with free input and output tokens subject to rate limits. For family-scale word-problem generation this is likely enough to run at no API cost.

Important privacy tradeoff: Google's documentation says free-tier content may be used to improve Google products, while paid-tier usage has different data-use terms. This project minimizes that exposure by sending only anonymous grade/skill/performance data and never sending the student's name or other identifying information.

---

# Option B — OpenAI

The same Worker can use OpenAI without changing the website.

Add an encrypted Worker secret:

```text
OPENAI_API_KEY
```

Then set the normal variable:

```text
AI_PROVIDER = openai
```

Optional model override:

```text
OPENAI_MODEL = gpt-5.4-mini
```

If `OPENAI_MODEL` is omitted, the Worker defaults to `gpt-5.4-mini`.

A ChatGPT Plus/Pro subscription is separate from API billing; a ChatGPT subscription does not automatically provide API usage credits.

---

# Provider switching

The public website always calls the same Worker endpoint. The Worker decides which provider to use based on:

```text
AI_PROVIDER
```

Supported values today:

```text
gemini
openai
```

So switching providers is only a Cloudflare setting change; no GitHub Pages code needs to be changed.

---

# Free fallback

Even if Gemini reaches a quota limit, the Worker is down, or no AI backend is configured, `word-problems.html` still uses the built-in adaptive generator. That means the page is never dependent on a paid service or an internet connection.

---

# Safety, privacy, and cost controls

Because this endpoint is reachable from a public website:

- Restrict CORS to the GitHub Pages origin.
- Keep all provider API keys in Cloudflare Secrets.
- Add Cloudflare rate limiting or another request cap before broad public use.
- Keep prompts and output-token limits small.
- Do not forward student names or other identifying information.
- Log errors, but do not log student data.
- Keep the local generator as the fallback whenever the backend errors or reaches quota.

For this app, generating a small batch of problems ahead of time and caching them locally is preferable to calling the model on every screen transition. It lowers latency and API usage and makes temporary outages invisible to the student.
