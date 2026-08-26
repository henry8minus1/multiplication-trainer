# Optional AI word-problem backend

The GitHub Pages app works **without any AI account or backend**. `word-problems.html` has a built-in adaptive problem generator and will automatically fall back to it whenever the AI backend is unavailable.

The optional backend exists only to make word problems more varied and adaptive. It should always run server-side so provider API keys never appear in the public GitHub Pages JavaScript.

## Recommended architecture

```text
Authorized family browser
      |
      | Worker URL + family access token
      | POST /word-problem
      v
Cloudflare Worker
      |
      +--> Gemini API     OR
      +--> OpenAI API
```

The public website does **not** contain the Worker URL or the family token. Each browser/device you authorize stores those values locally. Visitors without both values automatically use the built-in generator and cannot consume your AI quota.

The frontend sends only an anonymous learning profile: grade, requested math skill, adaptive difficulty, and recent accuracy by skill. It does not send the student's name, school, location, handwriting, or full local history.

---

# Recommended option — Gemini free tier

The included `cloudflare-worker.js` defaults to Gemini when `AI_PROVIDER` is omitted.

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

## 3. Add Cloudflare secrets and variables

In the Worker dashboard open **Settings → Variables and Secrets**.

Add this as a **Secret**:

```text
GEMINI_API_KEY
```

Paste the Gemini API key as its value.

Then create a second **Secret**:

```text
MATH_APP_ACCESS_TOKEN
```

Choose a long random value that you will enter once on each family browser. For example, generate 24–32 random characters with a password manager. Do not use a child's name or an easy household password.

The Worker rejects requests that do not include this exact token in the `X-Math-App-Token` request header. This means simply discovering the Worker URL is not enough to consume your Gemini quota.

Add this normal text variable:

```text
AI_PROVIDER = gemini
```

Optional model override:

```text
GEMINI_MODEL = gemini-2.5-flash
```

If `GEMINI_MODEL` is omitted, the Worker defaults to `gemini-2.5-flash`.

## 4. Authorize each family browser

After deployment Cloudflare will give you a URL similar to:

```text
https://math-word-problems.<your-subdomain>.workers.dev
```

On each device/browser you want to authorize, open:

**Word Problems → Parent / AI settings**

Enter both:

```text
AI backend URL: https://math-word-problems.<your-subdomain>.workers.dev
Family access token: <the exact MATH_APP_ACCESS_TOKEN value>
```

Choose **Save access**.

Those two values are stored only in that browser's local storage. They are not added to the repository and are not part of the site's general student-progress backup. A different browser/device will continue using the built-in problem generator until you authorize it separately.

### Security note about the family token

The family token is an access-control secret, but it is intentionally stored in browser local storage for convenience. Someone with access to that browser's developer tools or device storage could retrieve it. It is therefore much safer than exposing your Gemini key or making the Worker unrestricted, but it should not be treated like a high-security account credential.

If a device is lost or you think the token has leaked, replace `MATH_APP_ACCESS_TOKEN` in Cloudflare and enter the new token only on devices you still trust.

## Gemini free tier

Google offers a free Gemini Developer API tier for selected models subject to rate limits. For family-scale word-problem generation this may be enough to run at no API cost. Check Google's current pricing and rate-limit pages before relying on a particular quota.

Because free-tier provider terms can differ from paid-tier terms, keep payloads anonymous. This project deliberately sends grade/skill/performance information but not child names or other identifying details.

---

# Option B — OpenAI

The same Worker can use OpenAI without changing the website.

Add an encrypted Worker secret:

```text
OPENAI_API_KEY
```

Keep the same required family token secret:

```text
MATH_APP_ACCESS_TOKEN
```

Then set:

```text
AI_PROVIDER = openai
```

Optional model override:

```text
OPENAI_MODEL = gpt-5.4-mini
```

A ChatGPT subscription is separate from API billing.

---

# Provider switching

The public website always calls the same Worker endpoint. The Worker chooses the provider from:

```text
AI_PROVIDER
```

Supported values today:

```text
gemini
openai
```

Changing providers does not require changing the website or re-authorizing browsers as long as the Worker URL and `MATH_APP_ACCESS_TOKEN` stay the same.

---

# Free fallback

If Gemini reaches quota, the Worker is unavailable, a device is not authorized, or no AI backend is configured, `word-problems.html` uses the built-in adaptive generator. The learning tool therefore remains usable without an AI service or internet connection.

---

# Safety, privacy, and cost controls

The Worker currently has several layers of protection:

- CORS is restricted to the GitHub Pages origin.
- Every generation request must provide `MATH_APP_ACCESS_TOKEN`.
- Provider API keys stay in Cloudflare Secrets.
- No student names are sent to the backend.
- The browser falls back locally when authorization or generation fails.

For stronger protection, also consider a Cloudflare rate-limit rule for `/word-problem`, provider-side quota/budget alerts, and periodically rotating the family token.

Do not rely on CORS alone as an authorization mechanism. CORS controls browser behavior; the family token is what prevents an unauthenticated caller from using the Worker directly.
