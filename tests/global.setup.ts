import { chromium } from '@playwright/test';
import fs from 'fs';
import 'dotenv/config';

const AUTH_FILE = 'auth/user.json';

/**
 * Logs in once with email + password and stores the session for all tests.
 * Google SSO is not automatable, so the trial account has a password set in "My account".
 */
export default async function globalSetup() {
  const { PICSIO_EMAIL, PICSIO_PASS, PICSIO_API_KEY } = process.env;
  if (!PICSIO_EMAIL || !PICSIO_PASS || !PICSIO_API_KEY) {
    throw new Error('Set PICSIO_EMAIL, PICSIO_PASS and PICSIO_API_KEY in .env (see .env.example)');
  }
  fs.mkdirSync('auth', { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://pics.io/login');
  const cookies = page.getByRole('button', { name: /accept all/i });
  if (await cookies.isVisible().catch(() => false)) await cookies.click();
  await page.getByLabel(/email/i).first().fill(PICSIO_EMAIL);
  await page.locator('input[type="password"]').fill(PICSIO_PASS);
  await page.getByRole('button', { name: /^log in$/i }).last().click();
  // A wrong password keeps the form on /login with an inline error; a good one redirects to /search.
  await Promise.race([
    page.waitForURL(/\/search/, { timeout: 30_000 }),
    page.getByText('Login or password is invalid').waitFor({ timeout: 30_000 }).then(() => {
      throw new Error('Pics.io login failed: login or password is invalid');
    }),
  ]);
  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}
