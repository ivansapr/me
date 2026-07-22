import { expect, test } from '@playwright/test';

test('shows the bookshelf and explicit project links', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Ivan Saprykin — Web/Mobile Developer');
  await expect(
    page.getByRole('heading', { name: /Ivan Saprykin/ })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open' })).toHaveCount(3);
  await expect(
    page.getByRole('link', { name: 'Open' }).first()
  ).toHaveAttribute('target', '_blank');
});

test('lets visitors care for the Fitness Tracker bodybuilder', async ({
  page
}) => {
  await page.goto('/');

  const fitnessCard = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Fitness Tracker' })
  });
  await expect(
    fitnessCard.getByRole('progressbar', { name: 'Fullness' })
  ).toBeVisible();
  await expect(
    fitnessCard.getByRole('progressbar', { name: 'Energy' })
  ).toBeVisible();
  await expect(
    fitnessCard.getByRole('progressbar', { name: 'Strength' })
  ).toBeVisible();

  await fitnessCard.getByRole('button', { name: 'Exercise' }).click();
  await expect(
    fitnessCard.getByRole('status', { name: 'Bodybuilder status' })
  ).toHaveText('Working out');
  await expect(fitnessCard.getByRole('button', { name: 'Eat' })).toBeDisabled();
});

test('exposes a health endpoint', async ({ request }) => {
  const response = await request.get('/healthz');
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toBe('ok');
});
