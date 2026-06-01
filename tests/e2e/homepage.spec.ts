import { test, expect } from '@playwright/test';

test('homepage loads with ChessPlay branding', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await expect(page).toHaveTitle(/ChessPlay/i);
  await expect(page.getByText(/ChessPlay/i).first()).toBeVisible();
});

test('mobile homepage does not crash', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173');

  await expect(page).toHaveTitle(/ChessPlay/i);
});