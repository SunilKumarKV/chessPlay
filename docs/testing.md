# Quality Assurance & Automated Testing Guide

## Purpose
This document provides detailed instructions on writing, configuring, and executing the ChessPlay test suite, including unit, integration, and E2E browser tests.

## Navigation
[README](../README.md) • [TESTING.md](../TESTING.md) • [architecture.md](architecture.md) • [STYLE_GUIDE.md](../STYLE_GUIDE.md)

---

## Testing Architecture

We organize our testing environment across three separate scopes:

```txt
.
├── backend/tests/          # Vitest routes and service validation
├── frontend/src/tests/     # Vitest component layout checks
├── tests/                  # Playwright E2E browser scripts
│   ├── fixtures/           # Database seeds and user profile states
│   └── production-smoke/   # Release verification checks
└── playwright.config.ts    # E2E test runner configurations
```

---

## Test Execution Details

### 1. Vitest Unit Test Framework
We use **Vitest** for fast local validation. To run tests in backend or frontend:
- **Backend Unit Logic**: Tests verification algorithms, cryptographies, and user session lifecycles.
- **Frontend Component Logic**: Tests badges, modal closures, and hooks state updates under simulated user clicks (JSDom).

### 2. Playwright E2E Testing
E2E tests simulate authentic browser actions on the ChessPlay client:
- Spins up mock databases.
- Launches headless chromium, firefox, and webkit engines.
- Executes matchmaking cycles between two simulated users.
- Validates the game board UI for legal and illegal drag interactions.

---

## Examples

### 1. Mocking Database Services in Vitest
```typescript
import { vi, describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma';

// Mock the Prisma Client query actions
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

describe('User Database Service', () => {
  it('should retrieve a user by email', async () => {
    const mockUser = { id: 'usr_1', email: 'test@chessplay.xyz', rating: 1200 };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const user = await prisma.user.findUnique({ where: { email: 'test@chessplay.xyz' } });
    expect(user).toEqual(mockUser);
  });
});
```

### 2. Playwright E2E Lobbies Join Test
```typescript
import { test, expect } from '@playwright/test';

test('Player can join matchmaking queue', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'test_user');
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await page.click('button#join-lobby-btn');
  await expect(page.locator('#queue-status')).toContainText('Searching for opponent');
});
```

---

## Notes
- > [!IMPORTANT]
  > E2E test suites mock the payment verification gateway layer to allow complete checkout checking without generating live Razorpay API calls.
- > [!WARNING]
  > Avoid database mutations inside unit test scripts. Always stub network calls and db services to keep tests decoupled and performant.

---

## Best Practices
- **Write Deterministic Tests**: Ensure test scripts do not rely on local timing configurations or public API endpoints.
- **Assert Core Functionality First**: Verify that authentication systems function correctly before running complex matchmaking integration steps.
- **Keep Coverage High**: Ensure new controllers and UI components are checked with at least one matching test case.

---

## References
- [QA Testing Overview Guide](../TESTING.md)
- [Playwright Config File](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/playwright.config.ts)
- [Monorepo Script Checklist](../package.json)
