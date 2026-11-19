import { expect, test } from '@playwright/test';

test('switches between Russian and English and preserves the selected language', async ({ page }) => {
  await page.goto('/');
  const language = page.getByRole('group', { name: 'Language / Язык' });
  await expect(language).toBeVisible();
  await language.getByRole('button', { name: 'RU', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Играть за одним устройством' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  expect(await page.evaluate(() => localStorage.getItem('aw.language'))).toBe('ru');

  await page.reload();
  await page.getByRole('button', { name: 'Играть за одним устройством' }).click();
  await expect(page.getByRole('heading', { name: 'Хакеры', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Завершить развёртывание' })).toBeVisible();
  await page.getByRole('button', { name: 'Как играть' }).click();
  await expect(page.getByRole('dialog', { name: 'Как играть' })).toBeVisible();
  await expect(page.getByText('Цель игры')).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть' }).click();

  const gameLanguage = page.locator('.topbar-actions .language-switcher');
  await expect(gameLanguage).toBeVisible();
  expect(await page.locator('.topbar-actions button').allTextContents()).toEqual(['?', 'EN', 'RU', 'Новая игра']);
  await gameLanguage.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hackers', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  await gameLanguage.getByRole('button', { name: 'RU', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Хакеры', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Новая игра' }).click();
  await language.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play hot-seat' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
