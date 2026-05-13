# ChessPlay v1.2.1 — SaaS Supporter Release

## Implemented

1. Manual UPI supporter flow for free-hosted production deployments.
2. Supporter Monthly, Supporter Yearly, and future Pro plan structure.
3. Premium/supporter fields on User model.
4. SupporterRequest MongoDB model with unique UTR validation.
5. User billing API: `/api/billing/me`.
6. Public plans API: `/api/billing/plans`.
7. Payment request API: `/api/billing/upi-request`.
8. Admin supporter request API: `/api/billing/admin/requests`.
9. Admin approval/rejection APIs.
10. Admin manual user plan update API.
11. Pricing/support page with UPI copy and UPI app deep link.
12. Billing status page with recent payment requests.
13. Admin supporter approval page.
14. Reusable PlanBadge, SupporterBadge, BillingStatus, PremiumFeatureGate, and AdSlot components.
15. No-ads logic for premium/supporter users.
16. Dashboard UI updated with v1.2.1 plan badge and supporter monetization card.
17. Sidebar/topbar navigation updated for pricing and billing.
18. API client supports `VITE_API_URL` while keeping `VITE_BACKEND_URL` fallback.
19. Backend env example updated for UPI/admin setup.
20. Version bumped to v1.2.1.

## Security Notes

- Supporter access is never auto-enabled from a screenshot or UTR alone.
- Admin approval is required.
- UPI ID, UTR, amount, URL, and notes are validated/sanitized.
- Duplicate UTR/reference numbers are blocked.
- Billing APIs use existing HttpOnly cookie auth.
- Admin APIs require `isAdmin` or an email listed in `ADMIN_EMAILS`.

## Required Env

```env
UPI_ID=your-upi-id@bank
UPI_MERCHANT_NAME=ChessPlay
ADMIN_EMAILS=your-email@gmail.com
```

