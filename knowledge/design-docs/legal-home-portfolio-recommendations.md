# Legal review — Home Portfolio Recommendations (2026-08-03)

## Trigger
Displays portfolio tips and sector candidates (financial analysis surface). Persists `portfolio_recommendation_state` (user_id + recommendation key + status).

## Assessment
- **Not AI-generated** — deterministic heuristics; no new OpenAI/third-party data sharing.
- **Disclaimer** — short on home card (`homeRecDisclaimerShort`); full on research page (`homeRecDisclaimerFull`) stating informational only / not personalized advice.
- **Data** — UX state similar to warren nudge date; no new marketing PII; GDPR legitimate interest for service delivery. Privacy Policy third-party table unchanged.
- **No consent / cookie / payments changes.**

## Required before ship
- [x] Visible financial disclaimer on card and research page
- [x] No claim of personalized regulated advice
- [ ] Optional follow-up: mention “portfolio tips” under product features in Privacy if we expand stored tip history beyond skip/acted keys

## Verdict
**Ship with disclaimers as implemented.** No Privacy/Terms edit required for MVP.
