# Support / Pricing Production Fix Report

## Scope
Implemented the Support / Pricing / Earnings flow only. Core chess rules, Play vs AI, Play Online move validation, Play vs Player, WiFi mode, Puzzles, Analysis, and admin game logic were not changed.

## Changed files
- `frontend/src/pages/billing/PricingPage.jsx`
- `frontend/src/pages/billing/BillingPage.jsx`
- `frontend/src/app/App.jsx`
- `frontend/src/features/dashboard/components/Sidebar.jsx`
- `backend/routes/billing.js`
- `backend/models/SupporterRequest.js`

## Implemented
1. `/support` route added alongside `/pricing`.
2. Logged-out users can view Support/Pricing safely.
3. Logged-out users are blocked from submitting payment requests with a clear sign-in message.
4. Free plan remains fully usable.
5. Core gameplay is not blocked behind payment.
6. Free and Supporter pricing cards added.
7. PayPal, UPI, and Bank transfer manual verification options added.
8. Screenshot upload hidden because no production storage flow is configured.
9. Payment form validates method, amount, reference ID, payment date, and PayPal payer email.
10. Duplicate submit is prevented with disabled loading state.
11. Copy buttons added for PayPal, UPI, and Bank details.
12. Safe fallback text added when payment details are missing.
13. Payment history shows pending, approved, rejected, and rejection reason.
14. Backend rate limit added for supporter request submissions.
15. Server-side method validation restricted to PayPal, UPI, and Bank.
16. Server-side amount/reference validation kept.
17. Payment submission audit log added.
18. Admin approve/reject flow remains protected by admin middleware.
19. Manual verification text and refund/contact messaging added.
20. Fake revenue, fake supporter count, fake offers, fake testimonials, and fake success states are avoided.
21. Mobile/tablet/desktop responsive pricing layout added.
22. FAQ and supporter roadmap added.
23. Sidebar now routes Support / Pricing to the new support route.
24. Billing page now has loading, retry, empty, rejected, and status states.

## Environment variables
Optional frontend display variables:
- `VITE_SUPPORT_EMAIL`
- `VITE_SUPPORT_PAYPAL_EMAIL`
- `VITE_SUPPORT_UPI_ID`
- `VITE_SUPPORT_BANK_LABEL`

Backend payment display variables already supported:
- `UPI_ID`
- `UPI_MERCHANT_NAME`
- `PAYPAL_EMAIL`
- `PAYPAL_CHECKOUT_URL`
- `BANK_ACCOUNT_NAME`
- `BANK_ACCOUNT_NUMBER`
- `BANK_IFSC`
- `BANK_NAME`
- `SUPPORT_EMAIL_TO`

## Tests passed
```bash
npm run lint
npm run build
npm --workspace backend test
npm run test:production
npm audit --audit-level=moderate --workspaces --include-workspace-root
```

## Manual QA checklist
- Open `/support` while logged out.
- Open `/pricing` while logged out.
- Confirm free plan is visible and playable features are not blocked.
- Confirm submit form asks user to sign in when logged out.
- Login and open `/support`.
- Copy UPI ID.
- Copy PayPal email.
- Copy Bank details.
- Submit invalid amount.
- Submit invalid short reference.
- Submit valid UPI request.
- Confirm duplicate pending request is blocked.
- Open `/billing`.
- Confirm request appears as pending.
- Admin approve request.
- Confirm user becomes supporter/no-ads.
- Admin reject request.
- Confirm rejection reason appears.
- Check mobile layout.
- Confirm no console errors from support/pricing page.

## Commit message
```bash
git commit -m "improve supporter pricing and manual payment flow"
```
