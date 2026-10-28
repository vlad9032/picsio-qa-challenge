import { Browser, chromium } from '@playwright/test';
import fs from 'fs';
import 'dotenv/config';

export const OWNER_AUTH = 'auth/user.json';
export const TEAMMATE_AUTH = 'auth/teammate.json';

/**
 * Logs in once per account with email + password and stores the session for the tests.
 * Google SSO is not automatable, so the trial accounts have a password set in "My account".
 * The teammate account is optional: without PICSIO_TEAMMATE_* the permission test is skipped.
 */
export default async function globalSetup() {
  const { PICSIO_EMAIL, PICSIO_PASS, PICSIO_API_KEY, PICSIO_TEAMMATE_EMAIL, PICSIO_TEAMMATE_PASS } = process.env;
  if (!PICSIO_EMAIL || !PICSIO_PASS || !PICSIO_API_KEY) {
    throw new Error('Set PICSIO_EMAIL, PICSIO_PASS and PICSIO_API_KEY in .env (see .env.example)');
  }
  fs.mkdirSync('auth', { recursive: true });

  const browser = await chromium.launch();
  await login(browser, PICSIO_EMAIL, PICSIO_PASS, OWNER_AUTH);
  if (PICSIO_TEAMMATE_EMAIL && PICSIO_TEAMMATE_PASS) {
    await login(browser, PICSIO_TEAMMATE_EMAIL, PICSIO_TEAMMATE_PASS, TEAMMATE_AUTH);
  } else if (fs.existsSync(TEAMMATE_AUTH)) {
    fs.unlinkSync(TEAMMATE_AUTH); // no stale session from a previous run
  }
  await browser.close();
}

async function login(browser: Browser, email: string, password: string, file: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://pics.io/login');
  // The cookie banner (CookieYes) loads asynchronously and covers the form. Accept it whenever it shows up,
  // so a click on the form is never intercepted; the consent cookie then lands in the stored session.
  await page.addLocatorHandler(page.locator('.cky-consent-container'), async (banner) => {
    await banner
      .getByRole('button', { name: /accept all/i })
      .click({ timeout: 2_000 })
      .catch(() => banner.evaluate((el) => el.remove()));
  });
  await page.getByLabel(/email/i).first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /^log in$/i }).last().click();
  // A wrong password keeps the form on /login with an inline error; a good one redirects to /search.
  await Promise.race([
    page.waitForURL(/\/search/, { timeout: 30_000 }),
    page.getByText('Login or password is invalid').waitFor({ timeout: 30_000 }).then(() => {
      throw new Error(`Pics.io login failed for ${email}: login or password is invalid`);
    }),
  ]);
  await context.storageState({ path: file });
  await context.close();
}
