import { Locator, Page, expect } from '@playwright/test';

/**
 * The catalog / search screen: top search bar, filter bar with "Save this search", and the asset grid.
 */
export class SearchPage {
  readonly searchBar: Locator;
  readonly counter: Locator;
  readonly saveThisSearchButton: Locator;
  readonly dialog: SaveSearchDialog;

  constructor(readonly page: Page) {
    this.searchBar = page.getByPlaceholder('Search all collections');
    // The visible "N assets" counter (a hidden duplicate exists in the DOM).
    this.counter = page.locator('.searchHeader-counter').locator('visible=true').first();
    // Filter bar has two icon buttons without text: "Add more filters" and "Save this search" (tooltips).
    this.saveThisSearchButton = page.locator('.searchFilters__iconBtn').last();
    this.dialog = new SaveSearchDialog(page);
  }

  async open() {
    // The catalog loads asynchronously and re-initialises the search bar while it does: wait for its first search
    // to finish and reach the counter before typing, otherwise the typed text can be wiped.
    const loaded = this.waitForSearchResponse();
    await this.page.goto('/search');
    await expect(this.searchBar).toBeVisible();
    await this.waitForCounter(await loaded);
  }

  /** Types a query in the top bar and waits until the server answered it and the counter shows the result. */
  async searchFor(text: string) {
    const done = this.waitForSearchResponse((body) => body?.text === text);
    await this.searchBar.fill(text);
    await expect(this.searchBar).toHaveValue(text);
    await this.searchBar.press('Enter');
    await this.waitForCounter(await done);
    await expect(this.page).toHaveURL(new RegExp(`text=${encodeURIComponent(text)}`));
  }

  /** Resolves with the server's `total` of the next successful POST /images/search whose request body matches. */
  private async waitForSearchResponse(match: (body: any) => boolean = () => true): Promise<number> {
    const res = await this.page.waitForResponse((r) => {
      if (!r.url().endsWith('/images/search') || r.request().method() !== 'POST' || !r.ok()) return false;
      try {
        return match(r.request().postDataJSON());
      } catch {
        return false;
      }
    });
    return (await res.json()).total as number;
  }

  /** The counter is the last thing updated after a search; waiting for it means the page has rendered the response. */
  private async waitForCounter(total: number) {
    await expect(this.counter).toHaveText(total === 0 ? 'No assets' : `${total} ${total === 1 ? 'asset' : 'assets'}`);
  }

  /** "N assets" counter inside the search bar. */
  async assetCount(): Promise<number> {
    // Rendered as "2\n   assets" inside .searchHeader-counter; a hidden duplicate exists, so take the visible one.
    const counter = this.counter;
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
