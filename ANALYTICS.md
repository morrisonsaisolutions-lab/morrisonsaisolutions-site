# Website analytics

GitHub Pages publishes the HTML at the repository root. Source for the self-hosted PostHog bundle is scripts/analytics.js; install with npm ci, copy .env.example to .env, supply the project public token and host, then run npm run build:analytics. The generated browser bundle contains the public ingestion token by design; never put a personal API key here. npm test checks consent, opt-out, expiry and event filtering.

The consent panel does not initialize PostHog or load Metricool until analytics is allowed. The footer reopens preferences. Rejecting after accepting stops PostHog and reloads the page to unload Metricool. DNT and GPC override consent. Consent preferences expire after 180 days.

Tracked events: $pageview and checkout_clicked. Checkout clicks are not purchases. PostHog EU project 345646 is used. Autocapture, named person profiles, session recording, surveys, performance/exception capture and feature flags are disabled. PostHog event properties are allowlisted and URLs omit queries and fragments. Do not enable product conversation or memory collection as website analytics.

The _headers policy applies to hosts that support it; GitHub Pages does not use this file. It retains scoped origins for an eventual compatible host.

The external source builder outside this repository must preserve the analytics script/style includes, consent footer button and updated privacy section before any future regeneration. Rebuilding from old source and uploading it would remove this integration.

Docs consulted: https://posthog.com/docs/libraries/js ; https://posthog.com/docs/libraries/js/config ; https://posthog.com/docs/libraries/js/persistence .
