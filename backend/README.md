# Optional AI word-problem backend

The GitHub Pages app works without a backend. `word-problems.html` uses a built-in adaptive generator when no backend is configured.

For fresh AI-generated problems, deploy `cloudflare-worker.js` as a Cloudflare Worker and set an encrypted Worker secret named `OPENAI_API_KEY`. **Do not put an OpenAI API key in the GitHub Pages JavaScript or repository.**

After deployment, open **Word Problems → Parent / AI settings** and paste the Worker base URL, for example `https://math-word-problems.example.workers.dev`. The browser calls `POST <base-url>/word-problem`.

The frontend sends only an anonymous learning profile: grade, requested math skill, adaptive difficulty, and recent accuracy by skill. It does not send the student's name, school, location, handwriting, or full local history.

The Worker is intentionally restricted to the site's GitHub Pages origin and asks the OpenAI Responses API for structured JSON. For a public deployment, consider adding Cloudflare rate limiting or another abuse-control layer before leaving the endpoint enabled long-term.
