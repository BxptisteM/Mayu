# AI Summarization and Budgeting

## OpenRouter integration

`src/ai/openrouter.client.ts` calls `https://openrouter.ai/api/v1/chat/completions` with a non-streaming, low-temperature request and validates the response through Zod. The response must include token usage and cost for a request to be considered complete.

`article_summary`: produce a concise, neutral paragraph in the guild language, using the article **title and description** only. The prompt requests 40–80 words; implementation additionally rejects responses outside 25–120 words and Discord size constraints. The summary and its language are persisted for reuse.

`markdown_summary`: synthesize selected articles into one Markdown briefing containing introduction, sections, conclusion and cited source links; source links are appended independently of model output. Output is delivered by DM and only validated for basic Markdown shape/length. This operation requests 3,072 output tokens; set `OPENROUTER_MAX_OUTPUT_TOKENS=3072` or higher to enable it. The source default of 2,048 rejects this request before contacting OpenRouter. Article summaries request 1,024 output tokens.

## Budget control

`src/ai/reservation.service.ts` uses a PostgreSQL advisory transaction lock to reserve estimated maximum cost before sending a request. `ai_reservations` tracks `reserved`, `completed` and `uncertain`; `ai_usages` stores charged cost and token counts. Monthly spending windows use **UTC month boundaries**.

Defaults include `OPENROUTER_MODEL=openrouter/free`, `OPENROUTER_MONTHLY_BUDGET_USD=0.9`, `OPENROUTER_MAX_OUTPUT_TOKENS=2048`, `OPENROUTER_MAX_INPUT_TOKENS=8192`, `OPENROUTER_TIMEOUT_MS=30000` and `OPENROUTER_MAX_CONCURRENT_REQUESTS=2`. Paid models are rejected unless `OPENROUTER_ALLOW_PAID_MODELS=true` and valid input/output price estimates are supplied. Model price settings are operator-provided estimates, not a dynamic provider tariff.

The concurrency limit rejects excess requests immediately; there is no queue or automatic retry. With all nine scheduled categories launched together, some RSS summaries can fail when the two default AI slots are occupied.

A request with an ambiguous outcome is marked **uncertain** and its budget reservation is retained conservatively. Stale active reservations are also marked uncertain. A provider-reported charge higher than reserved is logged; the existing code records the actual usage and does not retroactively refuse it.

## Threat model

Prompt text explicitly treats article content as untrusted input. Never place API keys in user-visible messages, prompts or logs. Keep model pricing and limits configured to prevent accidental cost overruns. Generated content is a convenience summary, **not verified journalism**; readers should follow the linked source.
