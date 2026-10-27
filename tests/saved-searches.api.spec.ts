import { test, expect } from './fixtures';

/**
 * Server-side rules for saved search names, checked straight against the REST API.
 * These are the rules the dialog relies on; checking them here is cheap and catches backend regressions
 * even when the UI hides them (see SS-BUG-1 in TEST_PLAN.md).
 */
test.describe('Saved searches API: name rules', () => {
  test('50 characters are accepted, 51 are rejected with 400', async ({ api, uniqueName }) => {
    const base = uniqueName('');
    const fifty = base + 'a'.repeat(50 - base.length);
    expect(fifty).toHaveLength(50);

    const ok = await api.create(fifty, 'guide');
    expect(ok.name).toBe(fifty);

    const tooLong = await api.createRaw({ name: fifty + 'b', data: ok.data, shared: false });
    expect(tooLong.status()).toBe(400);
    expect(await tooLong.text()).toContain('less than or equal to 50 characters');
  });

  test('empty, whitespace-only and HTML names are rejected with 400', async ({ api }) => {
    const cases: Array<[string, RegExp]> = [
      ['', /"name" is not allowed to be empty/],
      ['   ', /"name" is not allowed to be empty/],
      ['<b></b>', /contains HTML tags|not allowed to be empty/],
      ['<img src=x onerror=alert(1)>', /contains HTML tags|not allowed to be empty/],
    ];
    for (const [name, message] of cases) {
      const res = await api.createRaw({ name, shared: false });
      expect(res.status(), `name ${JSON.stringify(name)}`).toBe(400);
      expect((await res.json()).msg, `name ${JSON.stringify(name)}`).toMatch(message);
    }
  });

  test('a duplicate name in the same location answers 409 with a dedicated subcode', async ({ api, uniqueName }) => {
    const name = uniqueName('dup api');
    const first = await api.create(name, 'guide', false);

    const dup = await api.createRaw({ name, data: first.data, shared: false });
    expect(dup.status()).toBe(409);
    expect(await dup.json()).toMatchObject({ success: false, subcode: 'SavedSearchDuplicateAtLocationApiError' });
  });

  test('a created search is returned by the list with its query and is gone after delete', async ({ api, uniqueName }) => {
    const name = uniqueName('roundtrip');
    const created = await api.create(name, 'roundtrip-query', true);

    const listed = await api.findByName(name);
    expect(listed).toMatchObject({ _id: created._id, teamId: expect.any(String), data: { text: 'roundtrip-query' } });

    await api.delete(created._id);
    expect(await api.findByName(name)).toBeUndefined();
  });
});
