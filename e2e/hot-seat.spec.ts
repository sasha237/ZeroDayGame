import { test, expect } from '@playwright/test';

async function deploy(page: import('@playwright/test').Page) {
  for (const space of ['E1', 'E3', 'E5', 'E7', 'E9']) {
    await page.getByRole('button', { name: new RegExp(`^${space},`) }).click();
  }
  await page.getByRole('button', { name: 'Complete deployment' }).click();
}

async function passAndConfirm(page: import('@playwright/test').Page, side: 'Corporation' | 'Hackers') {
  await page.getByRole('button', { name: 'Pass / End turn' }).click();
  await page.getByRole('button', { name: `Begin ${side} turn` }).click();
}

test('hot-seat deployment, movement, propagation, handoff, and hidden Corporation view', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('ZERO DAY');
  await expect(page.getByRole('heading', { name: 'ZERO DAY', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play hot-seat' }).click();
  await expect(page.locator('.board-space')).toHaveCount(49);
  await expect(page.getByRole('button', { name: /^Data Core,/ })).toBeVisible();
  await deploy(page);
  await page.locator('.piece-list button').filter({ hasText: 'I1' }).click();
  await page.getByRole('button', { name: /^D1,/ }).click();
  await expect(page.locator('.board-space.legal')).toHaveCount(0);
  await expect(page.locator('.piece-list button.active')).toHaveCount(0);
  await page.locator('.piece-list button').filter({ hasText: 'I2' }).click();
  await page.getByRole('button', { name: /^D3,/ }).click();
  await passAndConfirm(page, 'Corporation');
  await expect(page.getByRole('heading', { name: 'Corporation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Purge/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Trace/ })).toBeVisible();
  await expect(page.locator('.insurgent-stack')).toHaveCount(0);
  await passAndConfirm(page, 'Hackers');
  await page.locator('.piece-list button').filter({ hasText: 'I1' }).click();
  await page.getByRole('button', { name: /^D2,/ }).click();
  await page.locator('.piece-list button').filter({ hasText: 'I2' }).click();
  await page.getByRole('button', { name: /^D2,/ }).click();
  await passAndConfirm(page, 'Corporation');
  await expect(page.locator('.insurgent-stack')).toHaveCount(1);
  await passAndConfirm(page, 'Hackers');
  await page.locator('.piece-list button').filter({ hasText: 'I1' }).click();
  await page.getByRole('button', { name: /^Propagate/ }).click();
  await expect(page.locator('.counter-grid')).toContainText('9');
  await expect(page.locator('.acting-title')).toContainText('1 actions remaining');
  await expect(page.locator('.piece-list button.active')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^D2,/ })).toHaveAttribute('aria-label', /3 Hacker pieces/);
});

test('moves between D11 and C12 in both directions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play hot-seat' }).click();
  await deploy(page);

  await page.locator('.piece-list button').filter({ hasText: 'I1' }).click();
  await page.getByRole('button', { name: /^D1,/ }).click();
  await page.locator('.piece-list button').filter({ hasText: 'I1' }).click();
  await page.getByRole('button', { name: /^D12,/ }).click();
  await passAndConfirm(page, 'Corporation');
  await passAndConfirm(page, 'Hackers');

  await page.locator('.piece-list button').filter({ hasText: 'I1' }).click();
  await page.getByRole('button', { name: /^D11,/ }).click();
  await page.locator('.piece-list button').filter({ hasText: 'I1' }).click();
  await expect(page.getByRole('button', { name: /^C12,/ })).toHaveClass(/legal/);
  await page.getByRole('button', { name: /^C12,/ }).click();
  await expect(page.getByRole('button', { name: /^C12,/ })).toHaveAttribute('aria-label', /1 Hacker piece/);
  await passAndConfirm(page, 'Corporation');
  await passAndConfirm(page, 'Hackers');

  await page.locator('.piece-list button').filter({ hasText: 'I1' }).click();
  await expect(page.getByRole('button', { name: /^D11,/ })).toHaveClass(/legal/);
  await page.getByRole('button', { name: /^D11,/ }).click();
  await expect(page.getByRole('button', { name: /^D11,/ })).toHaveAttribute('aria-label', /1 Hacker piece/);
});
