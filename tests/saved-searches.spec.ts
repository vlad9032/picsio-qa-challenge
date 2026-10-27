import { test, expect } from './fixtures';

/**
 * Saved searches — UI flows a user actually goes through.
 * Scope decisions are explained in TEST_PLAN.md ("What is worth automating").
 * Each test creates its own uniquely named search; the `api` fixture removes all "QA-auto …" leftovers after each test.
 */
test.describe('Saved searches: create', () => {
  test('a search from the search bar is saved as a team search and listed under "Team Saved Searches"', async ({ page, search, tree, api, uniqueName }) => {
    const name = uniqueName('team guide');
    await search.open();
    await search.searchFor('guide');
    const expectedCount = await search.assetCount();

    await search.openSaveDialog();
    expect(await search.dialog.isSharedChecked(), '"Share with my team" is on by default').toBe(true);
    const res = await search.dialog.submit(name);

    expect(res.status()).toBe(201);
    expect(res.request().postDataJSON()).toMatchObject({ name, shared: true, data: { text: 'guide' } });
    await expect(search.dialog.root).toBeHidden();
    await expect(page.getByText(`"${name}" added to "Saved searches"`)).toBeVisible();

    await tree.open();
    expect(await tree.namesIn('team')).toContain(name);
    expect(await tree.namesIn('personal')).not.toContain(name);

    // The stored search is a real one: it is listed by the API as a team search with the same query.
    const stored = await api.findByName(name);
    expect(stored).toMatchObject({ teamId: expect.any(String), data: { text: 'guide' } });

    // Opening it from the tree restores the query and returns the same result set.
    await page.goto('/search');
    await tree.open();
    await tree.item(name).open();
    await expect(page).toHaveURL(/text=guide/);
    expect(await search.assetCount()).toBe(expectedCount);
  });

  test('with "Share with my team" unchecked the search is personal and is not shared with the team', async ({ search, tree, api, uniqueName }) => {
    const name = uniqueName('personal guide');
    await search.open();
    await search.searchFor('guide');
    await search.openSaveDialog();

    const res = await search.dialog.submit(name, { shared: false });
    expect(res.status()).toBe(201);
    expect(res.request().postDataJSON()).toMatchObject({ shared: false });

    await tree.open();
    expect(await tree.namesIn('personal')).toContain(name);
    expect(await tree.namesIn('team')).not.toContain(name);
    expect((await api.findByName(name))?.teamId, 'personal search has no teamId').toBeUndefined();
  });
});

test.describe('Saved searches: name validation in the dialog', () => {
  test('Ok stays disabled for an empty or whitespace-only name', async ({ search }) => {
    await search.open();
    await search.searchFor('guide');
    await search.openSaveDialog();
    await expect(search.dialog.ok).toBeDisabled();
    await search.dialog.name.fill('   ');
    await expect(search.dialog.ok).toBeDisabled();
    await search.dialog.name.fill('x');
    await expect(search.dialog.ok).toBeEnabled();
  });

  test('a duplicate name (any letter case) is rejected before submit with a message', async ({ search, api, uniqueName }) => {
    const existing = uniqueName('Dup Name');
    await api.create(existing, 'guide');

    await search.open();
    await search.searchFor('guide');
    await search.openSaveDialog();
    await search.dialog.name.fill(existing.toUpperCase());
    await expect(search.dialog.error).toHaveText(/A saved search with this name already exists in this location/);
    await expect(search.dialog.ok).toBeDisabled();

    // a built-in default search counts as well
    await search.dialog.name.fill('Video');
    await expect(search.dialog.ok).toBeDisabled();
  });

  test('a name longer than 50 characters is rejected by the server, and the user must see it', async ({ page, search, api, uniqueName }) => {
    // KNOWN DEFECT (see TEST_PLAN.md, SS-BUG-1): the dialog has no length limit (maxlength=20000), the server answers
    // 400 "name length must be less than or equal to 50", the dialog closes and nothing tells the user. Expected
    // behaviour asserted here; the test is marked as expected-to-fail until the UI shows the error or caps the input.
    test.fail(true, 'SS-BUG-1: silent failure on names > 50 chars');
    const name = uniqueName('x'.repeat(50)); // prefix + id + 50 chars → well over the limit
    await search.open();
    await search.searchFor('guide');
    await search.openSaveDialog();
    const res = await search.dialog.submit(name);
    expect(res.status()).toBe(400);
    await expect(page.getByText(/50 characters|too long/i)).toBeVisible();
    expect(await api.findByName(name)).toBeUndefined();
  });
});

test.describe('Saved searches: manage from the tree', () => {
  test('rename from the tree updates the item in place and on the server', async ({ tree, api, uniqueName, page }) => {
    const before = uniqueName('rename me');
    const after = uniqueName('renamed');
    await api.create(before, 'guide');

    await page.goto('/search');
    await tree.open();
    const res = await tree.item(before).rename(after);
    expect(res.ok()).toBeTruthy();
    expect(res.request().postDataJSON()).toEqual({ name: after });

    await expect(tree.item(after).name).toBeVisible();
    await expect(tree.item(before).name).toHaveCount(0);
    expect(await api.findByName(after)).toBeDefined();
    expect(await api.findByName(before)).toBeUndefined();
  });

  test('delete asks for confirmation and removes the search from the tree and the server', async ({ tree, api, uniqueName, page }) => {
    const name = uniqueName('delete me');
    const created = await api.create(name, 'guide');

    await page.goto('/search');
    await tree.open();
    const res = await tree.item(name).delete();
    expect(res.url()).toContain(created._id);
    expect(await res.json()).toEqual({ deleted: true });

    await expect(tree.item(name).name).toHaveCount(0);
    expect(await api.findByName(name)).toBeUndefined();
  });
});
