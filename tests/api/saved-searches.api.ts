import { APIRequestContext, expect, request } from '@playwright/test';

/** Shape of a saved search as returned by GET /savedSearches (only the fields the tests use). */
export interface SavedSearch {
  _id: string;
  name: string;
  default?: boolean;
  /** present on team (shared) searches, absent on personal ones */
  teamId?: string;
  creatorId: string;
  data: Record<string, unknown> | null;
}

export const ROOT_COLLECTION_ID_RE = /^[0-9a-f]{24}$/;

/**
 * Thin client over the same REST endpoints the Pics.io web app uses.
 * Auth: the account's API key as a Bearer token (works for every endpoint the UI calls).
 * Used for test data setup and cleanup so UI tests stay short and independent.
 */
export class SavedSearchesApi {
  constructor(private readonly api: APIRequestContext) {}

  static async create(apiKey: string): Promise<SavedSearchesApi> {
    const ctx = await request.newContext({
      baseURL: 'https://pics.io',
      extraHTTPHeaders: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
    return new SavedSearchesApi(ctx);
  }

  async dispose() {
    await this.api.dispose();
  }

  /** The root collection ("My team library") id — every search in the tests is scoped to it. */
  async rootCollectionId(): Promise<string> {
    const res = await this.api.get('/collections/root');
    expect(res.ok(), 'GET /collections/root').toBeTruthy();
    const id = (await res.json())._id as string;
    expect(id).toMatch(ROOT_COLLECTION_ID_RE);
    return id;
  }

  async list(): Promise<SavedSearch[]> {
    const res = await this.api.get('/savedSearches');
    expect(res.ok(), 'GET /savedSearches').toBeTruthy();
    return (await res.json()).nodes as SavedSearch[];
  }

  async findByName(name: string): Promise<SavedSearch | undefined> {
    return (await this.list()).find((s) => s.name === name);
  }

  /** Raw create: returns the response so tests can assert on status and error body. */
  async createRaw(body: { name: string; data?: unknown; shared?: boolean }) {
    return this.api.post('/savedSearches', { data: body });
  }

  async create(name: string, text: string, shared = true): Promise<SavedSearch> {
    const collectionId = await this.rootCollectionId();
    const res = await this.createRaw({
      name,
      shared,
      data: { collectionIds: [collectionId], collectionIdsOperator: 'oneOf', text, searchSource: 'searchbar' },
    });
    expect(res.status(), `POST /savedSearches "${name}": ${await res.text()}`).toBe(201);
    return (await res.json()) as SavedSearch;
  }

  async delete(id: string) {
    const res = await this.api.delete(`/savedSearches/${id}`);
    expect(res.ok(), `DELETE /savedSearches/${id}`).toBeTruthy();
  }

  /** Removes every non-default saved search whose name starts with the prefix (test leftovers). */
  async deleteByPrefix(prefix: string): Promise<number> {
    const mine = (await this.list()).filter((s) => !s.default && s.name.startsWith(prefix));
    for (const s of mine) await this.delete(s._id);
    return mine.length;
  }
}
