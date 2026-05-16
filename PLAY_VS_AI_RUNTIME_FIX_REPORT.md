# Play vs AI Runtime Fix Report

## Scope

Runtime bug fix only. No new features, no UI redesign, no API response changes, no socket event changes.

## Issues Fixed

1. Play vs AI replied too quickly, especially on Easy mode.
2. AI difficulty felt unchanged because the Play vs AI page used depth/skill only and allowed Stockfish to answer immediately when search completed.
3. Production CSP blocked jsDelivr Ant Design stylesheet/source-map requests seen in the browser console.
4. COEP `require-corp` was too strict for some third-party Google image resources, causing `ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep`.

## Files Changed

- `frontend/src/features/chess/constants/aiLevels.js`
- `frontend/src/features/chess/pages/ChessPage.jsx`
- `vercel.json`
- `frontend/vercel.json`

## Notes

- AI levels now include explicit `movetime` and `moveDelay` values.
- Easy mode now uses lower Stockfish skill/depth and a calmer delay before applying the move.
- CSP now allows `https://cdn.jsdelivr.net` for stylesheet/source-map console noise.
- COEP changed from `require-corp` to `credentialless` to reduce third-party image blocking while keeping safer cross-origin behavior.
