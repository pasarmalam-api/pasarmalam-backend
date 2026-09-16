# Seller Photo Listing Assistant

Canonical frontend: `landing-site-v2/seller/ai-assistant.html`.
Publish that seller directory to Tiiny and deploy the backend and main static site together.

Server environment:
- `OPENAI_API_KEY`: server-only OpenAI key; never put it in frontend files.
- `OPENAI_MODEL`: existing vision/structured-output model (default gpt-4o-mini).
- `OPENAI_SEARCH_MODEL`: Responses web-search model (default gpt-4.1-mini).

The authenticated seller endpoint `/api/seller/ai/listing` accepts `draft` or
`research`. Draft requests accept up to six compressed JPEG data URLs, within
the existing 2 MB request limit. Seller consent precedes transmission. Research
uses live web search and displays source links and a timestamp. Missing sources
produce no numeric recommendation. No demo fallback is used.

Calls are throttled per seller/action to one every 30 seconds per server process.
Set provider project spend limits before enabling for a large seller population;
the local throttle is not a distributed billing quota. Provider costs are incurred
on generation/search requests.

Drafts stay in tab session storage for up to an hour and are tied to the signed-in
session. Review listing uploads the selected photos to the existing Cloudinary
product folder, then fills the normal product form. Price and stock remain blank;
shop category still comes from the existing server-authoritative category flow.
Publishing requires the seller's explicit normal Publish Product action.

Tests: `python -m unittest test_seller_ai` and `node test_seller_ai_ui.cjs`.
Browser/provider responses in automated tests are mocked. Live OpenAI vision,
live price citations and production credentials require a separate smoke test.

API references:
- https://developers.openai.com/api/docs/guides/images-vision
- https://developers.openai.com/api/docs/guides/tools-web-search
