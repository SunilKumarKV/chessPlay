import { test, expect, devices, type Page, type Response } from '@playwright/test';

const BASE_URL = (process.env.BASE_URL || 'https://getchessplay.vercel.app').replace(/\/$/, '');

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/play',
  '/play-ai',
  '/multiplayer',
  '/leaderboard',
  '/dashboard',
] as const;

const CRITICAL_CONSOLE_PATTERNS = [
  /\bUncaught\b/i,
  /\bTypeError\b/i,
  /\bReferenceError\b/i,
  /\bSyntaxError\b/i,
  /ChunkLoadError/i,
  /Failed to fetch dynamically imported module/i,
  /Loading chunk \d+ failed/i,
];

const IGNORED_CONSOLE_PATTERNS = [
  /favicon/i,
  /chrome-extension/i,
  /ResizeObserver loop/i,
  /Third-party cookie/i,
  /Google.*GSI/i,
];

const IGNORED_FAILED_URL_PATTERNS = [
  /googleapis\.com/i,
  /accounts\.google\.com/i,
  /gstatic\.com/i,
  /doubleclick\.net/i,
  /googletagmanager/i,
  /facebook\.com/i,
  /favicon\.ico/i,
  /\/api\/auth\/session/i,
  /\/api\/me/i,
  /sentry\.io/i,
];

type RouteDiagnostics = {
  path: string;
  consoleErrors: string[];
  failedRequests: string[];
  directStatus: number;
  usedSpaFallback: boolean;
};

function isCriticalAsset(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return /\.(js|css|mjs|wasm)(?:\?|$)/i.test(pathname) || pathname.startsWith('/assets/');
  } catch {
    return false;
  }
}

function isCriticalConsoleMessage(text: string): boolean {
  if (IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return CRITICAL_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
}

function shouldIgnoreFailedRequest(url: string, status: number): boolean {
  if (status < 400) return true;
  if (IGNORED_FAILED_URL_PATTERNS.some((pattern) => pattern.test(url))) return true;
  return false;
}

function attachDiagnostics(page: Page, bucket: RouteDiagnostics): void {
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isCriticalConsoleMessage(text)) {
      bucket.consoleErrors.push(text);
    }
  });

  page.on('pageerror', (error) => {
    bucket.consoleErrors.push(error.message);
  });

  page.on('response', (response: Response) => {
    const url = response.url();
    const status = response.status();
    if (!isCriticalAsset(url)) return;
    if (shouldIgnoreFailedRequest(url, status)) return;
    if (status >= 400) {
      bucket.failedRequests.push(`${status} ${url}`);
    }
  });
}

async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((targetPath) => {
    window.history.pushState({}, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(1200);
}

async function assertPageHealthy(page: Page, path: string, bucket: RouteDiagnostics): Promise<void> {
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.trim().length, `${path} rendered empty body`).toBeGreaterThan(20);
  expect(bodyText, `${path} should not be a Vercel 404 page`).not.toMatch(/NOT_FOUND/);

  const root = page.locator('#root');
  await expect(root).toBeVisible();
  const box = await root.boundingBox();
  expect(box?.height || 0, `${path} root has no visible height`).toBeGreaterThan(100);

  const backgroundOnly = await page.evaluate(() => {
    const rootEl = document.getElementById('root');
    if (!rootEl) return true;
    const text = (rootEl.textContent || '').replace(/\s+/g, '');
    const hasBoard = Boolean(rootEl.querySelector('.premium-board-square'));
    return text.length < 5 && !hasBoard;
  });
  expect(backgroundOnly, `${path} looks like a white screen`).toBe(false);

  expect(bucket.consoleErrors, `${path} critical console errors`).toEqual([]);
  expect(bucket.failedRequests, `${path} failed critical assets`).toEqual([]);
}

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await page.waitForTimeout(1500);
      }
    }
  }
  throw lastError;
}

async function visitRoute(page: Page, path: string): Promise<RouteDiagnostics> {
  const bucket: RouteDiagnostics = {
    path,
    consoleErrors: [],
    failedRequests: [],
    directStatus: 0,
    usedSpaFallback: false,
  };
  attachDiagnostics(page, bucket);

  let response = null;
  try {
    response = await gotoWithRetry(page, path);
  } catch {
    bucket.usedSpaFallback = true;
  }
  bucket.directStatus = response?.status() ?? (bucket.usedSpaFallback ? 404 : 0);

  const rootVisible = await page.locator('#root').isVisible().catch(() => false);
  if (bucket.usedSpaFallback || bucket.directStatus >= 400 || !rootVisible) {
    bucket.usedSpaFallback = true;
    await gotoWithRetry(page, '/');
    await page.waitForLoadState('load').catch(() => undefined);
    await spaNavigate(page, path);
    test.info().annotations.push({
      type: 'routing',
      description: `Direct ${path} HTTP ${bucket.directStatus}; used SPA fallback from /`,
    });
  }

  await page.waitForLoadState('load').catch(() => undefined);
  await page.waitForTimeout(800);

  return bucket;
}

async function refreshRoute(page: Page, path: string, bucket: RouteDiagnostics): Promise<void> {
  const refreshBucket: RouteDiagnostics = {
    path: `${path} (refresh)`,
    consoleErrors: [],
    failedRequests: [],
    directStatus: bucket.directStatus,
    usedSpaFallback: bucket.usedSpaFallback,
  };
  attachDiagnostics(page, refreshBucket);

  if (bucket.directStatus < 400 && !bucket.usedSpaFallback) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  } else {
    await gotoWithRetry(page, '/');
    await spaNavigate(page, path);
    test.info().annotations.push({
      type: 'routing',
      description: `Refresh on ${path} re-applied SPA fallback (direct deep link not served by host)`,
    });
  }

  await page.waitForLoadState('load').catch(() => undefined);
  await page.waitForTimeout(800);
  await assertPageHealthy(page, `${path} (refresh)`, refreshBucket);
}

async function startGuestSession(page: Page): Promise<void> {
  await visitRoute(page, '/');
  await expect(page.getByRole('button', { name: /Try Guest Mode/i })).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: /Try Guest Mode/i }).click();
  await expect(page.getByRole('button', { name: /Continue as Guest/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Continue as Guest/i }).click();
  await page.waitForFunction(
    () => window.location.pathname.replace(/\/$/, '') === '/play',
    { timeout: 45_000 },
  );
}

async function startGuestAiSession(page: Page): Promise<void> {
  await startGuestSession(page);
  await expect(page.getByRole('heading', { name: /^Play AI$/i, level: 1 })).toBeVisible({
    timeout: 120_000,
  });
  await page.waitForSelector('.premium-board-square', { timeout: 60_000, state: 'visible' });
}

async function clickBoardSquare(page: Page, row: number, col: number): Promise<void> {
  const squares = page.locator('.premium-board-square');
  await expect(squares).toHaveCount(64, { timeout: 30_000 });
  const index = row * 8 + col;
  await squares.nth(index).click();
}

test.describe('ChessPlay production smoke', () => {
  test.describe.configure({ mode: 'serial' });

  for (const path of PUBLIC_ROUTES) {
    test(`route ${path} loads, refreshes, and stays healthy`, async ({ page }) => {
      const bucket = await visitRoute(page, path);
      await assertPageHealthy(page, path, bucket);

      if (path === '/login') {
        await page.getByRole('button', { name: /Log in/i }).first().click();
        await expect(page.getByText(/Sign in to ChessPlay/i)).toBeVisible();
      }
      if (path === '/register') {
        await page.getByRole('button', { name: /Create account/i }).first().click();
        await expect(page.getByText(/Create your ChessPlay account/i)).toBeVisible();
      }

      await refreshRoute(page, path, bucket);
    });
  }

  test('protected /dashboard logged out shows auth guard without crash', async ({ page }) => {
    const bucket = await visitRoute(page, '/dashboard');
    await assertPageHealthy(page, '/dashboard', bucket);

    const showsAuthGuard = await page
      .getByText(/Sign in to ChessPlay|Try Guest Mode|Create your ChessPlay account/i)
      .first()
      .isVisible()
      .catch(() => false);
    const showsLanding = await page.getByText(/ChessPlay brings practice/i).isVisible().catch(() => false);
    expect(showsAuthGuard || showsLanding, '/dashboard should show landing or auth guard').toBeTruthy();
  });

  test('Play vs AI: guest session, Stockfish asset, legal move, AI reply if possible', async ({ page }) => {
    const bucket: RouteDiagnostics = {
      path: '/play (guest AI)',
      consoleErrors: [],
      failedRequests: [],
      directStatus: 0,
      usedSpaFallback: false,
    };
    attachDiagnostics(page, bucket);

    const stockfishResponse = page.waitForResponse(
      (response) => /stockfish|stockfish-worker/i.test(response.url()) && response.status() < 400,
      { timeout: 120_000 },
    );

    await startGuestAiSession(page);

    const stockfish = await stockfishResponse;
    expect(stockfish.url(), 'Stockfish worker asset should load').toMatch(/stockfish|stockfish-worker/i);

    await clickBoardSquare(page, 6, 4);
    await page.waitForTimeout(400);
    await clickBoardSquare(page, 4, 4);

    const aiResponded = await page
      .waitForFunction(
        () => {
          const body = document.body.innerText;
          const hasSecondMove = body.match(/\b1\./) && body.match(/\b1\.\s*\S+\s+\S+/);
          const notThinking = !/AI thinking/i.test(body);
          return Boolean(hasSecondMove) && notThinking;
        },
        { timeout: 90_000 },
      )
      .then(() => true)
      .catch(() => false);

    test.info().annotations.push({
      type: 'ai-response',
      description: aiResponded
        ? 'AI replied after first legal move'
        : 'AI reply not confirmed within timeout (engine may be slow/unavailable)',
    });

    expect(bucket.consoleErrors, 'Play vs AI critical console errors').toEqual([]);
    expect(bucket.failedRequests, 'Play vs AI failed critical assets').toEqual([]);
  });

  test('Multiplayer: guest sees graceful login guard and socket does not crash page', async ({ page }) => {
    const bucket: RouteDiagnostics = {
      path: '/play/online (guest)',
      consoleErrors: [],
      failedRequests: [],
      directStatus: 0,
      usedSpaFallback: false,
    };
    attachDiagnostics(page, bucket);

    await startGuestSession(page);

    const socketAttempt = page
      .waitForEvent('request', {
        predicate: (request) => /socket\.io|chessplay.*onrender|wss?:\/\//i.test(request.url()),
        timeout: 20_000,
      })
      .then((request) => request.url())
      .catch(() => null);

    await spaNavigate(page, '/play/online');

    await expect(page.getByText(/Login to unlock real-time multiplayer rooms/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: /Feature Coming Soon/i })).toBeVisible();

    const socketUrl = await socketAttempt;
    test.info().annotations.push({
      type: 'socket',
      description: socketUrl
        ? `Socket request observed: ${socketUrl}`
        : 'No socket request observed (guest guard may block before connect)',
    });

    await assertPageHealthy(page, '/play/online', bucket);
  });

  test('Multiplayer alias /multiplayer renders without crash', async ({ page }) => {
    const bucket = await visitRoute(page, '/multiplayer');
    await assertPageHealthy(page, '/multiplayer', bucket);
  });

  test('Mobile iPhone 12: home and AI routes fit viewport', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();
    const bucket: RouteDiagnostics = {
      path: 'mobile /',
      consoleErrors: [],
      failedRequests: [],
      directStatus: 0,
      usedSpaFallback: false,
    };
    attachDiagnostics(page, bucket);

    await visitRoute(page, '/');
    const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(homeOverflow, 'home horizontal overflow').toBe(false);
    await assertPageHealthy(page, 'mobile /', bucket);

    await startGuestAiSession(page);
    const aiOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(aiOverflow, 'AI route horizontal overflow').toBe(false);

    await expect(page.locator('.premium-board-square').first()).toBeVisible();
    const viewport = page.viewportSize();
    const boardBox = await page.locator('.premium-board-square').first().boundingBox();
    if (viewport && boardBox) {
      expect(boardBox.x + boardBox.width, 'board should fit within viewport width').toBeLessThanOrEqual(
        viewport.width + 2,
      );
    }

    await context.close();
  });

  test('Security headers on live deployment', async ({ request }) => {
    const response = await request.get(BASE_URL);
    expect(response.status()).toBeLessThan(500);

    const headers = response.headers();
    expect(headers['x-content-type-options']?.toLowerCase()).toBe('nosniff');
    expect(headers['x-frame-options']?.toUpperCase()).toBe('DENY');
    expect(headers['strict-transport-security']).toMatch(/max-age=/i);
    expect(headers['cross-origin-opener-policy']).toBeTruthy();
    expect(headers['cross-origin-embedder-policy']).toBeTruthy();
  });

  test('direct deep links should serve the SPA shell (not Vercel 404)', async ({ request }) => {
    const failures: string[] = [];
    for (const path of PUBLIC_ROUTES) {
      if (path === '/') continue;
      const response = await request.get(`${BASE_URL}${path}`);
      if (response.status() >= 400) {
        failures.push(`${path} -> HTTP ${response.status()}`);
      }
    }
    test.info().annotations.push({
      type: 'deep-link-status',
      description: failures.length
        ? `Deep links missing SPA rewrite: ${failures.join(', ')}`
        : 'All deep links return SPA shell',
    });
    expect(
      failures,
      'Deploy vercel.json rewrites so deep links return index.html (release blocker for shareable URLs)',
    ).toEqual([]);
  });
});
