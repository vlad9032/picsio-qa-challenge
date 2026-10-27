import { Locator, Page, expect } from '@playwright/test';

/**
 * The catalog / search screen: top search bar, filter bar with "Save this search", and the asset grid.
 */
export class SearchPage {
  readonly searchBar: Locator;
  readonly saveThisSearchButton: Locator;
  readonly dialog: SaveSearchDialog;

  constructor(readonly page: Page) {
    this.searchBar = page.getByPlaceholder('Search all collections');
    // Filter bar has two icon buttons without text: "Add more filters" and "Save this search" (tooltips).
    this.saveThisSearchButton = page.locator('.searchFilters__iconBtn').last();
    this.dialog = new SaveSearchDialog(page);
  }

  async open() {
    await this.page.goto('/search');
    await expect(this.searchBar).toBeVisible();
  }

  /** Types a query in the top bar and waits for the search request to finish. */
  async searchFor(text: string) {
    const done = this.page.waitForResponse((r) => r.url().endsWith('/images/search') && r.request().method() === 'POST');
    await this.searchBar.fill(text);
    await this.searchBar.press('Enter');
    await done;
    await expect(this.page).toHaveURL(new RegExp(`text=${encodeURIComponent(text)}`));
  }

  /** "N assets" counter inside the search bar. */
  async assetCount(): Promise<number> {
    // Rendered as "2\n   assets" inside .searchHeader-counter; a hidden duplicate exists, so take the visible one.
    const counter = this.page.locator('.searchHeader-counter').locator('visible=true').first();
    await expect(counter).toHaveText(/\d+\s*assets?/);
    return Number((await counter.innerText()).match(/\d+/)![0]);
  }

  async openSaveDialog() {
    await this.saveThisSearchButton.click();
    await expect(this.dialog.root).toBeVisible();
  }
}

/** "Create saved search" dialog. */
export class SaveSearchDialog {
  readonly root: Locator;
  readonly name: Locator;
  readonly ok: Locator;
  readonly cancel: Locator;
  readonly shareWithTeam: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('.simpleDialogBox', { hasText: 'Create saved search' });
    this.name = this.root.getByPlaceholder('Please enter the name');
    this.ok = this.root.getByRole('button', { name: 'Ok', exact: true });
    this.cancel = this.root.getByRole('button', { name: 'Cancel', exact: true });
    this.shareWithTeam = this.root.getByText('Share with my team');
    this.error = this.root.getByText(/already exists/i);
  }

  async isSharedChecked(): Promise<boolean> {
    const box = this.shareWithTeam.locator('xpath=ancestor::*[contains(@class,"UICheckbox")][1]');
    return (await box.getAttribute('class'))!.includes('UICheckbox--checked');
  }

  /** Fills the name, optionally unchecks "Share with my team", submits and waits for the API answer. */
  async submit(name: string, opts: { shared?: boolean } = {}) {
    await this.name.fill(name);
    if (opts.shared === false && (await this.isSharedChecked())) await this.shareWithTeam.click();
    const created = this.page.waitForResponse((r) => r.url().endsWith('/savedSearches') && r.request().method() === 'POST');
    await this.ok.click();
    return created;
  }
}
