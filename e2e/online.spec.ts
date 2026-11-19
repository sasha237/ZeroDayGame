import { test, expect, type Page } from '@playwright/test';

async function register(page: Page, email: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play online' }).click();
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Display name').fill(email.split('@')[0]);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game lobby' })).toBeVisible();
}

async function deploy(page: Page) {
  for (const space of ['E1', 'E3', 'E5', 'E7', 'E9']) {
    await page.getByRole('button', { name: new RegExp(`^${space},`) }).click();
  }
  await page.getByRole('button', { name: 'Complete deployment' }).click();
}

test('two clients, private Corporation view, reconnect, and facilitator observation', async ({ browser }) => {
  const stateContext = await browser.newContext();
  const insurgentContext = await browser.newContext();
  const state = await stateContext.newPage();
  const insurgent = await insurgentContext.newPage();
  const suffix = Date.now();
  await register(state, `state-${suffix}@example.com`);
  await register(insurgent, `insurgent-${suffix}@example.com`);

  await state.getByRole('button', { name: 'Create invite' }).click();
  await expect(state.locator('.invite-line strong')).toBeVisible();
  const code = (await state.locator('.invite-line strong').textContent())!;
  await insurgent.getByPlaceholder('INVITE CODE').fill(code);
  await insurgent.getByRole('button', { name: 'Join game' }).click();
  await expect(insurgent.locator('.board')).toBeVisible();
  await deploy(insurgent);
  await expect(state.locator('.insurgent-stack')).toHaveCount(0);

  await state.reload();
  await expect(state.locator('.board')).toBeVisible();
  await expect(state.locator('.insurgent-stack')).toHaveCount(0);

  const observerResponse = state.waitForResponse((response) => response.url().includes('/observer-link') && response.request().method() === 'POST');
  await state.getByRole('button', { name: 'Facilitator link' }).click();
  const { url } = await (await observerResponse).json();
  const observerUrl = new URL(url);
  const observer = await stateContext.newPage();
  await observer.goto(`http://127.0.0.1:4173${observerUrl.pathname}${observerUrl.hash}`);
  await expect(observer.getByText('Facilitator', { exact: true }).first()).toBeVisible();
  await expect(observer.locator('.insurgent-stack')).toHaveCount(5);

  await stateContext.close();
  await insurgentContext.close();
});
