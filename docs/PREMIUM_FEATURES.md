# Premium Features

## Entitlement Keys

- `noAds`
- `premiumSounds`
- `premiumThemes`
- `premiumPuzzleFilters`
- `advancedAnalysis`
- `unlimitedAnalysis`
- `advancedEngineDepth`
- `advancedStats`
- `unlimitedGameReview`
- `customBoards`
- `tournaments`
- `earlyAccess`

## Frontend Locked Behavior

Locked UI should:

- Show the feature as available in the roadmap.
- Open `UpgradeModal` with the relevant feature name.
- Keep the current page usable if the user closes the modal.
- Avoid claiming payment or plan activation without backend confirmation.

## Upgrade Modal

The modal explains plan benefits, supports logged-out users, and routes to `/pricing`. It stores the selected plan in session storage for safe preselection.

## Plan Badge

`PlanBadge` reads `/api/me/entitlements` when a user session exists. If the endpoint fails, it falls back to the user object, then to Free.
