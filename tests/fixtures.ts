import { test as base, expect } from '@playwright/test';
import { SavedSearchesApi } from './api/saved-searches.api';
import { SavedSearchesTree } from './pages/saved-searches-tree.page';
import { SearchPage } from './pages/search.page';

/** Every name the tests create starts with this prefix, so cleanup never touches real data. */
export const NAME_PREFIX = 'QA-auto ';

type Fixtures = {
  api: SavedSearchesApi;
  /** Unique, human-readable name for this test run: "QA-auto <short id> <label>". */
  uniqueName: (label: string) => string;
  search: SearchPage;
  tree: SavedSearchesTree;
};

export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    const api = await SavedSearchesApi.create(process.env.PICSIO_API_KEY!);
    await use(api);
    await api.deleteByPrefix(NAME_PREFIX);
    await api.dispose();
  },
  uniqueName: async ({}, use) => {
    const runId = Date.now().toString(36).slice(-5);
    await use((label: string) => `${NAME_PREFIX}${runId} ${label}`);
  },
  search: async ({ page }, use) => {
    await use(new SearchPage(page));
  },
  tree: async ({ page }, use) => {
    await use(new SavedSearchesTree(page));
  },
});

export { expect };
