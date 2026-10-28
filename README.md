# Pics.io test challenge — Saved searches

Test plan + Playwright (TypeScript) suite for the **Saved searches** feature of [Pics.io](https://pics.io).

- **Test plan:** [TEST_PLAN.md](TEST_PLAN.md) — what I chose, why, what I cover by aspect, what I automate and what
  I deliberately leave manual, metrics, and the defects found while exploring.
- **Suite:** `tests/` — 11 tests, ~3 minutes, serial on one trial account.

## What is tested and why

The feature is the daily entry point to a large library: a user saves a search (text + filters), reopens it from
the *Saved searches* panel, renames and deletes it, and shares it with the team or keeps it personal. The suite
covers the journeys that must never break and the name rules the dialog relies on:

| File | Tests |
|---|---|
| `tests/saved-searches.spec.ts` | create a team search and reopen it (same query, same asset count); create a personal search; name validation in the dialog (empty, duplicate incl. built-ins, >50 characters — documented defect); rename and delete from the tree |
| `tests/saved-searches.api.spec.ts` | server rules through the REST API: 50/51 characters, empty/HTML names, duplicate → 409, create → list → delete |

Every mutation is checked on three levels: what the user sees, the request/response the UI sent, and the state the
API returns afterwards. Each test creates its own `QA-auto <run id> …` item and an API fixture deletes all
`QA-auto` leftovers after every test, so a crashed run leaves nothing behind.

One test is marked `test.fail()` on purpose: names longer than 50 characters fail silently (server 400, dialog
closes, no message). The test asserts the expected behaviour; it will start failing — and get its annotation
removed — the day the UI is fixed. See SS-BUG-1 in the plan.

## Structure

```
playwright.config.ts          baseURL, storageState, serial run, traces on failure
tests/global.setup.ts         logs in once (email + password) and stores the session in auth/user.json
tests/fixtures.ts             api client, unique names, page objects, cleanup
tests/api/saved-searches.api.ts   REST client (Bearer API key): list / create / delete / createRaw
tests/pages/search.page.ts    search bar, "Save this search", the "Create saved search" dialog
tests/pages/saved-searches-tree.page.ts   left panel: sections, item, rename, delete
tests/*.spec.ts               the tests
```

## How to run locally

Requirements: Node 20+, a Pics.io account with a **password** set (Google SSO cannot be driven by the tests) and its
**API key** (*My account → API key*).

```bash
npm install
npx playwright install chromium
cp .env.example .env        # fill PICSIO_EMAIL, PICSIO_PASS, PICSIO_API_KEY
npm test                    # headless
npm run test:headed         # watch it
npm run report              # HTML report with traces of failed tests
```

Notes:

- The account must have at least one asset whose name or content matches `guide` (the default trial library
  does: two onboarding PDFs). Other tests do not depend on library content.
- The suite runs serially (`workers: 1`): one account, one shared tree. Names are unique per run, so parallel
  runs on separate accounts are safe.
- Built-in saved searches (*Video*, *Duplicates*…) are never touched; cleanup only removes `QA-auto …` items.

## AI tools used

I work with Claude Code (Anthropic) as a pair: I decide what to test and why, the agent does the legwork, I check
the result. In this challenge it helped in three places:

1. **Exploration.** I asked it to write short headless Playwright scripts that log in, save / rename / delete a
   search and print every `/savedSearches` request and response. That gave me the API, the name rules, the
   `data-testid`s of the tree actions and the silent >50-character failure in about an hour. Then I repeated the
   main flows by hand in the UI.
2. **First version of the code.** From my list of checks it wrote the page objects, fixtures and tests, and fixed
   the three locators that failed on the first run (the counter is rendered as `"2\n assets"`, the panel toggle
   remembers its state). I reviewed every file and run the suite myself.
3. **Review of the plan** for gaps against the feature (groups, favourites, broken searches).

Every finding in `TEST_PLAN.md` was reproduced by hand in the real UI before it was written down.
