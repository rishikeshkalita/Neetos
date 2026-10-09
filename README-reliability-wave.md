# NEETOS reliability and AI mentor behavior

NEETOS is a lightweight, single-page NEET mentor with a server-side Gemini API handler and optional Supabase progress sync.

## AI planning behavior
- The app must not invent a daily checklist when no meaningful student context has been provided.
- The mentor should ask one concise onboarding question, retain information the student provides, and use it to plan daily classes, same-day topic revision, prior task outcomes, weak areas, and upcoming tests.
- The AI—not fixed intervals or a separate revision dashboard—decides which revisions belong in today's checklist.
- Old generic four-task template plans are removed if they can be identified as legacy uncompleted auto-generated tasks.
- Failed messages stay in the composer so they can be retried without retyping; transient error bubbles are excluded from the next AI context.

## AI service reliability
- Primary model is Gemini 3.8 Flash, with Gemini 3.6 Flash as a fallback.
- Uses the official API key header, avoids deprecated temperature/top-p/top-k options for Gemini 3.x, retries transient throttling/unavailable responses, and times out stalled provider requests.
- Error responses distinguish invalid API keys, quota/rate limits, provider overload, model availability, and provider network timeouts.
- See Google's current model/API guidance: https://ai.google.dev/gemini-api/docs/generate-content/latest-model and https://ai.google.dev/gemini-api/docs/deprecations/.

## Validation
Run the source-contract test with:
```sh
node tests/reliability-contract.test.cjs
```
Run the API handler regression tests with:
```sh
node tests/api-handler.test.cjs
```

Manual production smoke checks:
1. Open the deployed app with empty local data. Confirm no generic checklist appears and NEETOS asks for real study context.
2. Tell NEETOS class timings and today's topic. Confirm a specific, plausible checklist appears, including same-day revision if appropriate.
3. Simulate a Gemini 3.8 Flash 503. Confirm fallback to Gemini 3.6 returns a successful response without exposing secrets.
4. Turn on airplane mode during chat. Confirm the message remains in the composer; reconnect and retry once without duplicate chat turns.
5. Verify task completion and cloud sync persist across refresh and a second signed-in device.
