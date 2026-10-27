# Test plan: Saved searches in Pics.io

Author: Vladyslav Hryhorian · October 2026 · Pics.io trial team "My team library" (web app, Chrome)

## 1. What I am testing and why

**Saved searches**: a user runs a search (text and/or filters), presses *Save this search*, names it, picks a
group and whether it is shared with the team, and later reopens it from the *Saved searches* panel. Items can be
renamed, deleted, moved to groups and added to favourites. Pics.io also ships ~30 built-in team searches
(*Video*, *Duplicates*, *Created today*…).

Why this feature:

- It is the daily entry point to the library for a team that has thousands of assets: a broken or wrong saved
  search silently hides assets from people. Risk is high, visibility is low.
- It touches four layers at once: the search engine (query is stored, not the result), the tree UI, a small REST
  API (`/savedSearches`) and team permissions (team vs personal). That is a good proxy for how the whole product
  behaves.
- It is small enough to cover end to end in a few days and to automate honestly, without waiting for media
  transcoding (the video player would spend most of its test time waiting on processing).

Out of scope: the video player, *Move to group* drag-and-drop ordering, Google Drive / S3 storage specifics,
mobile apps.

## 2. How the feature works (what I learned while exploring)

| Action | UI | API the UI calls |
|---|---|---|
| Save a search | filter bar → *Save this search* → dialog *Create saved search* (name, *Save to* tree, *Share with my team*, default on) | `POST /savedSearches` `{name, data:{collectionIds, text, …}, shared}` → 201 |
| List | left rail *Search* → panel with *Team Saved Searches* and *Personal Saved Searches* | `GET /savedSearches` (`teamId` present = team search) |
| Open | click the item; the stored query is re-run, the URL gets the same parameters | `POST /images/search`, `POST /savedSearches/checkSearchValidity` → `{broken}` |
| Rename | hover → pencil → inline input → Enter | `PUT /savedSearches/:id/rename` |
| Delete | hover → trash → confirm *Delete saved search?* | `DELETE /savedSearches/:id` |
| Group / favourite | hover → *Move to group*, *Add to favorites* | not covered here |

Name rules found: 1–50 characters after trimming, unique inside its location (case-insensitive, built-in names
count), HTML tags rejected. The dialog validates "empty" and "duplicate" before submit; it does **not** validate
length.

## 3. Test coverage by aspect

### 3.1 Functional (core)

| # | Scenario | Priority |
|---|---|---|
| F1 | Save a text search as a team search → it appears under *Team*, reopening it returns the same assets | Core |
| F2 | Save with *Share with my team* off → under *Personal*, not visible to a teammate | Core |
| F3 | Save a search with filters only (type = video, keyword, rating), no text → filters restored on open | Core |
| F4 | Save inside a group (*Save to* → group) → item nested; same name allowed in a different group | Secondary |
| F5 | Rename (valid, duplicate, empty, Esc cancels) | Core |
| F6 | Delete: confirm removes it; *Cancel* keeps it; built-in searches cannot be deleted | Core |
| F7 | A saved search is live: upload an asset that matches → it shows up; delete the asset → it disappears | Core |
| F8 | Search bound to a collection that is later deleted → `checkSearchValidity` reports `broken`, UI marks it | Secondary |
| F9 | Open a saved search, change the query, press *Save this search* again → new item, old one unchanged | Secondary |
| F10 | *Search in saved searches* box filters the panel by name | Secondary |

### 3.2 Validation and edge cases

| # | Scenario |
|---|---|
| V1 | Empty / whitespace-only name → *Ok* disabled |
| V2 | Duplicate name, any letter case, including a built-in name → inline message, *Ok* disabled |
| V3 | 50 characters accepted, 51 rejected; what the user sees (see SS-BUG-1) |
| V4 | Unicode and emoji names, leading/trailing spaces (trimmed?), name made only of HTML tags |
| V5 | Very long query text (2 000+ chars) and special characters (`"`, `*`, `:`) in the saved query |
| V6 | Same name as a personal search when saving a team search (different location → allowed?) |

### 3.3 API and networking

- Status codes and bodies for create (201 / 400 / 409), rename, delete, list; error `msg` is a raw Joi
  validation string (`child "body" fails because …`) — fine for developers, not for the UI.
- The API key (My account → API key) works as a Bearer token on the same endpoints the web app uses, so setup
  and cleanup in automation go through the API, not the UI.
- `data` is not validated server-side: `POST /savedSearches {name}` without `data` returns 201 and the item opens
  as "all assets" (low risk, API only).
- Behaviour on a dropped connection while saving (dialog state, duplicate submit on retry).

### 3.4 Permissions and team

- Teammate with the *guest* role: sees team searches, cannot see the owner's personal ones; can/cannot create
  team searches (role permission) — check both the UI and a direct API call.
- Deleting a team search made by someone else; renaming it; what the other user sees without reload
  (real-time update vs stale tree).

### 3.5 UI / UX

- Long names in the tree (ellipsis, tooltip with the full name), 100+ items (scroll, performance of the panel).
- Keyboard: Enter / Esc in the dialog and in inline rename; focus returns to the tree after rename.
- Toast *"X" added to "Saved searches"* and the dialog closing only after a 2xx.

### 3.6 Cross-browser / device

- Chrome (primary), Firefox, Safari on macOS; the tree and the dialog at 1280 px and at a narrow window where
  the left panel collapses. Mobile-adapted layout: hover actions have no hover on touch — are they reachable?

### 3.7 Performance and security

- Opening a saved search on a large library: time to first result vs the same query typed by hand (should be
  equal: it is the same `/images/search` call).
- A personal search id of another user: `GET/PUT/DELETE /savedSearches/:id` must be refused (IDOR check).
- HTML in names is rejected by the server; check the tree and the toast render names as text, not markup.

## 4. Priorities

Core (every release, automated where marked): F1, F2, F5, F6, F7, V1, V2, V3, permissions.
Secondary (on change in the area, manual): F3, F4, F8, F9, F10, V4–V6, UI/UX, cross-browser, performance.

## 5. What is worth automating and why

Automated in this repository (Playwright, TypeScript):

- **F1, F2** — the two user journeys that must always work; they also verify the stored request body and the
  server state through the API, so a UI test fails for the right reason.
- **V1, V2, V3** — cheap, deterministic, and V3 documents a real defect as an expected failure (`test.fail`)
  so the suite turns red the day it is fixed and the annotation can be removed.
- **F5, F6** — rename and delete from the tree: short flows with clear network evidence (`PUT …/rename`,
  `DELETE …`).
- **API rules** — 50/51 characters, empty/HTML names, duplicate 409, create→list→delete round trip. These are the
  rules the dialog depends on; they run in seconds and catch backend regressions even when the UI hides them.

Deliberately not automated: F7 (needs uploads + indexing wait: slow and flaky), F8 (destroys collections),
groups/favourites/drag-and-drop (low value, high maintenance), cross-browser visuals (manual + screenshots),
permissions (second account; automated later with a second `storageState` once the invite is confirmed).

Design choices: unique `QA-auto <run id> …` names and an API cleanup fixture after every test, so a crashed run
never leaves garbage in the team; page objects for the search bar, the dialog and the tree; every mutation is
asserted on three levels — UI, request/response, API list.

## 6. Tools

- Manual: Chrome DevTools (Network for the `/savedSearches` calls), the API key with curl for backend rules.
- Automation: Playwright 1.64 + TypeScript, `dotenv`, HTML report and traces on failure.
- AI: Claude Code — used to explore the feature quickly (headless scripts that logged in, saved, renamed, deleted a
  search and captured every request), to draft the first version of the page objects, and to review selectors.
  Every finding above was checked by hand in the real UI before it went into this plan.

## 7. Metrics and benchmarks

- Core scenarios pass rate per release (target 100 %, red build blocks the release of the search area).
- Escaped defects in saved searches per quarter (target 0 Critical/Major).
- Automated suite runtime (now ~3 min for 11 tests, serial; keep under 5 min).
- Flakiness: reruns needed per 20 runs (target 0; any flaky test is fixed or quarantined within a sprint).
- Time to open a saved search on a 10k-asset library ≤ the same query typed manually (+10 %).

## 8. How I communicate results

- Bugs: one ticket per defect with steps, request/response, screenshot or trace; severity by user impact.
- Per release: a short note in the team channel — what was covered, what is red, what was skipped and why; the
  HTML report link for the automated part.
- Risks that need a decision (e.g. "silent failure on long names is shipped for a year, do we fix the UI or raise
  the server limit?") go to the product manager in writing, with options.

## 9. Findings from this exploration

| Id | Severity | Finding | Evidence |
|---|---|---|---|
| SS-BUG-1 | Major | Name longer than 50 characters: the dialog closes, no message, nothing is saved. The input has `maxlength=20000`, the server answers 400 `"name" length must be less than or equal to 50 characters long`. | `tests/saved-searches.spec.ts` (expected failure), screenshot in the report |
| SS-OBS-1 | Minor | `POST /savedSearches` without `data` is accepted (201); the item then opens as "all assets". API only. | `curl` in section 3.3 |
| SS-OBS-2 | Minor | Validation errors are raw Joi strings; a UI that starts showing server errors would show `child "body" fails because …` to users. | API tests |
