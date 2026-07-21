import { expect, test } from '@playwright/test';

test('shows the bookshelf and explicit project links', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Ivan Saprykin — Web/Mobile Developer');
  await expect(
    page.getByRole('heading', { name: /Ivan Saprykin/ })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open' })).toHaveCount(2);
  await expect(
    page.getByRole('link', { name: 'Open' }).first()
  ).toHaveAttribute('target', '_blank');
});

test('exposes a health endpoint', async ({ request }) => {
  const response = await request.get('/healthz');
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toBe('ok');
});
