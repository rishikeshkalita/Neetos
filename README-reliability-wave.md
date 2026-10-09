# NEETOS reliability wave

This change set strengthens the existing single-user NEETOS app without replacing its architecture.

## Included
- Unknown task outcomes stay unknown when a day rolls over; only confirmed outcomes are marked complete.
- A deterministic revision queue is created when a syllabus topic is recorded as complete (1, 3, 7, 14, and 30 days).
- AI task payloads are validated before they are applied.
- Cloud loading merges local and cloud records instead of blindly replacing all local state.
- Export now includes the complete study record and an export timestamp.
- API request size/count checks and clearer limits for task planning.
- Service worker shell cache version bump and offline navigation/static-asset behavior.

## Deployment notes
- Existing Supabase schema is retained; no database migration is required by this change.
- The app still needs valid Vercel environment variables and the existing Supabase table/policies.
- Verify the configured Gemini model name is available to the project's API key before deployment.
- Test the branch deployment before merging into `main`.

## Manual regression checklist
1. Complete a task, reload, and verify completion remains.
2. Leave a task unchecked overnight; verify its archived outcome is `unknown`, not `missed`.
3. Mark a syllabus topic complete through chat; verify five review dates are created.
4. Mark a review done and reload; verify it stays completed.
5. Sign in on a device with local records and cloud records; verify neither set is silently discarded.
6. Turn off the network, check off a task, reload the app shell, then reconnect and confirm the change can be synced.
7. Send invalid/oversized AI context in a test environment and verify the API returns a clear 4xx response.
8. Export data and confirm profile, tasks, history, study records, and revisions are present.
