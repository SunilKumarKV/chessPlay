# Safety Notes

- No secrets should be committed or exposed in frontend code.
- Payment UI never claims live activation unless backend verification confirms it.
- Payment success/failure pages are informational and do not mutate subscription state.
- Admin pages depend on protected backend routes and show access errors safely.
- Premium UI falls back to Free if entitlement APIs fail.
- Feedback, pricing, puzzles, referrals, and legal pages handle empty or unavailable APIs without crashing.
- Legal pages and footer links are present for privacy, terms, refunds, cookies, and contact.
