import { Locator, Page, expect } from '@playwright/test';

/**
 * Left panel "Saved searches" (rail button "Search"): sections "Team Saved Searches" and "Personal Saved Searches",
 * each item has hover actions (favorites, move to group, rename, delete).
 */
export class SavedSearchesTree {
  readonly panel: Locator;
  readonly teamSection: Locator;
  readonly personalSection: Locator;

  constructor(readonly page: Page) {
    this.panel = page.locator('.tree').filter({ hasText: 'Team Saved Searches' });
    this.teamSection = this.section('Team Saved Searches');
    this.personalSection = this.section('Personal Saved Searches');
  }

  /** The rail button toggles the panel and Pics.io remembers the last opened panel across reloads: wait, then toggle only if needed. */
  async open() {
    const alreadyOpen = await this.panel
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (!alreadyOpen) await this.page.locator('#button-search').click();
    await expect(this.panel).toBeVisible();
  }

  /** Whole subtree of a section, used to assert where an item was placed. */
  private section(title: string): Locator {
    return this.page
      .locator('.PicsioTreeItem')
      .filter({ has: this.page.locator('.PicsioTreeItem__name', { hasText: new RegExp(`^${title}$`) }) })
      .first();
  }

  /** The leaf item row for a saved search by exact name. */
  item(name: string): TreeItem {
    return new TreeItem(this.page, name);
  }

  async namesIn(section: 'team' | 'personal'): Promise<string[]> {
    const root = section === 'team' ? this.teamSection : this.personalSection;
    return root.locator('.PicsioTreeItem__name').allInnerTexts();
  }
}

export class TreeItem {
  readonly name: Locator;
  readonly row: Locator;

  constructor(readonly page: Page, readonly text: string) {
    this.name = page.locator('.PicsioTreeItem__name', { hasText: new RegExp(`^${escapeRegExp(text)}$`) }).first();
    // The closest tree node around the name; for a leaf it holds the hover action buttons.
    this.row = this.name.locator('xpath=ancestor::*[contains(@class,"PicsioTreeItem") and not(contains(@class,"__"))][1]');
  }

  private action(testId: string): Locator {
    return this.row.locator(`[data-testid="${testId}"]`);
  }

  async open() {
    await this.name.click();
  }

  async rename(newName: string) {
    await this.name.hover();
    await this.action('savedSearchRename').click();
    // Rename is inline: the name turns into a focused text input prefilled with the current name.
    const input = this.page.locator('input:focus');
    await expect(input).toHaveValue(this.text);
    const renamed = this.page.waitForResponse((r) => /\/savedSearches\/[0-9a-f]+\/rename$/.test(r.url()));
    await input.fill(newName);
    await input.press('Enter');
    return renamed;
  }

  async delete() {
    await this.name.hover();
    await this.action('savedSearchDelete').click();
    const confirm = this.page.locator('.simpleDialogBox', { hasText: 'Delete saved search?' });
    await expect(confirm).toContainText(this.text);
    const deleted = this.page.waitForResponse((r) => /\/savedSearches\/[0-9a-f]+$/.test(r.url()) && r.request().method() === 'DELETE');
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    return deleted;
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
