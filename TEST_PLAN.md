# Test plan: Saved searches in Pics.io

Vladyslav Hryhorian · October 2026 · Pics.io trial team, web app in Chrome

## My workflow on this task

1. I read the task in the job post
2. Visited the website, registered, explored the features and check what a product is and who uses it
3. Selected the functionality for the test task (I initially considered the document editor, but it was too much work and had complex automation) and chose the recommended "saved search"
4. Ask Claude Code to explore the feature and draft a plan
5. Made adjustments, approved the plan
6. Asked for detailed test cases and Playwright autotests for the core scenarios
7. Ran smoke test of the feature by hand and went through the main functions myself
8. Check results of autotests and reproduced the bug that Claude found (SS-BUG-1)
9. Reviewed the structure of the autotests
10. Noted an improvement
11. Add some notes about document editor (bug+imp)
12. Ask to create report and git repository
13. Double-check completed work
14. Ask claude to make a nice test plan in Google docs
15. Answer the qualifying questions in the job post and sent the application.


As result - 12 cases on playwright - all pass (1 failed case - SS-bug-1- marker as pass bacause of expected failure, when it will be fixed we will detect and change case).

Bugs in the end of the document

The plan below was drafted by сlaude and approved by me:

## Plan in short

- **What:** saved searches. Save a search, open it later, team or personal, rename, delete.
- **Why:** search is where work with the data starts. Less work than the video player or the PDF editor. Easy to
  automate.
- **How:** functional flows, name validation, API, permissions, UI, browsers, performance and security. Details in
  section 3.
- **Core:** save and open, team vs personal, rename, delete, live search, name rules, permissions. **Secondary:**
  groups, broken search, re-save, search in the panel, other browsers.
- **Automate:** the core flows (save, open, rename, delete), team vs personal for a teammate, and the name rules. 12 Playwright tests. **Not automate:** the live search after upload (F7), the broken search after a collection is deleted (F8), drag-and-drop, visual checks.
- **Tools:** Chrome DevTools, curl, Playwright + TypeScript, Claude Code.
- **Metrics:** pass rate of core scenarios, bugs from users, run time, flaky tests.
- **Report:** a ticket per bug, a short note per release, decisions to the PM in writing.

## 1. What I test and why

**Saved searches.** A user runs a search, presses *Save this search*, gives it a name and opens it later from the
left panel. A saved search can be shared with the team or stay personal. It can be renamed, deleted, moved to a
group and marked as favourite. Pics.io also ships about 30 built-in team searches (*Video*, *Duplicates*,
*Created today*…).

Why this feature:
- An important feature: data access essentially begins with searching.
- Less work compared to a video player or PDF editor.
- Easily automated.

## 2. How the feature works

I explored it by hand and with short scripts that logged every request the web app sends.

| Action | Where in the UI | Request |
|---|---|---|
| Save a search | filter bar → *Save this search* → dialog *Create saved search*: name, *Save to* (group), *Share with my team* (on by default) | `POST /savedSearches` `{name, data: {collectionIds, text, …}, shared}` → 201 |
| See the list | left rail → *Search* icon → panel with *Team Saved Searches* and *Personal Saved Searches* | `GET /savedSearches` (`teamId` present = team search) |
| Open one | click the item: the saved query runs again, the URL gets the same parameters | `POST /images/search`, `POST /savedSearches/checkSearchValidity` → `{broken}` |
| Rename | hover → pencil → the name becomes an input → Enter | `PUT /savedSearches/:id/rename` |
| Delete | hover → trash → *Delete saved search?* → *Delete* | `DELETE /savedSearches/:id` |
| Group, favourite | hover → *Move to group*, *Add to favorites* | not covered in this plan |

Name rules I found: 1 to 50 characters, unique inside its group (letter case does not matter, built-in names count
too), HTML tags are rejected. The dialog checks "empty" and "duplicate" before submit. It does not check the length
(see SS-BUG-1).

## 3. What I cover and how

### 3.1 Functional

| # | Scenario | Priority |
|---|---|---|
| F1 | Save a text search as a team search. It appears under *Team*. Open it: same query, same files | Core |
| F2 | Save with *Share with my team* off. It appears under *Personal*. A teammate does not see it | Core |
| F3 | Save a search with filters only (type = video, keyword, rating) and no text. Open it: the filters are back | Core |
| F4 | Save into a group. The item is nested. The same name is allowed in another group | Secondary |
| F5 | Rename: valid name, duplicate, empty, Esc cancels | Core |
| F6 | Delete: *Delete* removes it, *Cancel* keeps it. Built-in searches cannot be deleted | Core |
| F7 | A saved search is live. Upload a file that matches: it shows up. Delete the file: it is gone | Core |
| F8 | The search points to a collection. Delete the collection. `checkSearchValidity` says `broken` and the UI marks it | Secondary |
| F9 | Open a saved search, change the query, save again. A new item appears, the old one does not change | Secondary |
| F10 | *Search in saved searches* box filters the panel by name | Secondary |

### 3.2 Validation and edge cases

| # | Scenario |
|---|---|
| V1 | Empty name or spaces only: *Ok* is disabled |
| V2 | Duplicate name in any letter case, including a built-in name: message under the field, *Ok* is disabled |
| V3 | 50 characters are accepted, 51 are not. What does the user see? (SS-BUG-1: nothing) |
| V4 | Unicode and emoji in the name. Spaces at the start and end (trimmed?). A name made only of HTML tags |
| V5 | Very long query text (2 000+ characters). Special characters in the query: `"`, `*`, `:` |
| V6 | A personal search and a team search with the same name: different place, so it should be allowed |

### 3.3 API and network

- Status codes and bodies: create 201 / 400 / 409, rename, delete, list.
- Error messages from the server are raw validation strings (`child "body" fails because …`). Fine for
  developers, not for users (SS-OBS-2).
- The API key from *My account* works as a Bearer token on the same endpoints the web app uses. So test setup and
  cleanup go through the API, not through the UI.
- `data` is not checked by the server: `POST /savedSearches {name}` without `data` returns 201, and the item opens
  as "all files" (SS-OBS-1, low risk, API only).
- What happens when the connection drops while saving: dialog state, double submit on retry.

### 3.4 Permissions and team

- A teammate with the *guest* role sees team searches and does not see my personal ones.
- Can a guest create a team search? Check the UI and a direct API call with the guest's key.
- Delete or rename a team search made by someone else. What does the other user see without reload: live update
  or an old tree?

### 3.5 UI and UX

- Long names in the tree: cut with "…"? Tooltip with the full name? 100+ items: scroll and speed of the panel.
- Keyboard: Enter and Esc in the dialog and in the inline rename. Focus goes back to the tree after rename.
- The toast *"X" added to "Saved searches"* and the dialog closing only after the server says 2xx.

### 3.6 Browsers and devices

- Chrome first, then Firefox and Safari on macOS.
- The tree and the dialog at 1280 px and in a narrow window where the left panel collapses.
- Touch screens: the item actions appear on hover. On a tablet there is no hover. Are they reachable?

### 3.7 Performance and security

- Open a saved search on a big library. Time to first result should be the same as typing the query by hand: it is
  the same `/images/search` call.
- Take the id of another user's personal search. `GET`, `PUT`, `DELETE /savedSearches/:id` must be refused.
- The server rejects HTML in names. The tree and the toast must still show names as text, never as markup.

## 4. Priorities

Core: F1, F2, F3, F5, F6, F7, V1, V2, V3 and the permission checks. They run on every release.
Secondary: F4, F8, F9, F10, V4–V6, UI/UX, other browsers, performance. They run when this area changes.

How I decide: first, can the user lose files or see someone else's? Second, how often is the flow used? Third,
how cheap is the check?

## 5. What I automate and why

Automated in this repository (Playwright, TypeScript):

- **F1, F2.** The two flows that must always work. The tests check the UI, the request body and the server state
  through the API, so a failure points at the real cause.
- **V1, V2, V3.** Cheap and stable. V3 is a real defect, so the test is marked as an expected failure
  (`test.fail`). The day the bug is fixed the suite turns red and the mark is removed.
- **F5, F6.** Rename and delete from the tree. Short flows with clear network evidence (`PUT …/rename`,
  `DELETE …`).
- **API name rules.** 50/51 characters, empty and HTML names, duplicate → 409, create → list → delete. The dialog
  depends on these rules. They run in seconds and catch backend changes even when the UI hides them.
- **Team vs personal for a teammate.** A second browser session with the invited teammate's own login: the team
  search is in their tree, my personal search is not.

Not automated on purpose:

- F7 needs uploads and indexing. Slow and flaky.
- F8 (a saved search whose collection was deleted) needs a throwaway collection and a check of how the UI marks a
  broken search. Possible, but secondary; I keep the suite small.
- Groups, favourites, drag-and-drop. Low value, high maintenance.
- Other browsers and layout. Manual with screenshots.
- Role rules (what a *guest* may rename or delete). Needs a guest account and a role matrix first.

Design: every test creates its own `QA-auto <run id> …` item. An API fixture deletes all `QA-auto` items after
each test, so a crashed run leaves nothing behind. Page objects for the search bar, the dialog and the tree. Every
change is checked on three levels: UI, request/response, API list.

## 6. Tools

- Manual: Chrome DevTools (Network tab for `/savedSearches`), curl with the API key for backend rules.
- Automation: Playwright 1.64 + TypeScript, `dotenv`, HTML report, traces on failure.
- AI: Claude Code. It wrote the exploration scripts (log in, save, rename, delete, print every request), the test
  cases, the first version of the autotests and the draft of the report. I chose the feature, approved the plan,
  ran the smoke test by hand, reproduced the bug and reviewed the code. Details in README.

## 7. Metrics

- Pass rate of core scenarios per release. Target 100 %. A red build blocks the release of the search area.
- Bugs in saved searches found by users per quarter. Target 0 Critical/Major.
- Suite run time. Now about 3 minutes for 12 tests. Keep it under 5.
- Flaky tests: reruns needed per 20 runs. Target 0. A flaky test is fixed or quarantined within a sprint.
- Time to open a saved search on a 10 000-file library: not slower than the same query typed by hand (+10 %).

## 8. How I report

- Bugs: one ticket per defect. Steps, request and response, screenshot or trace. Severity by user impact.
- Each release: a short note in the team channel. What was covered, what is red, what was skipped and why. Link to
  the HTML report for the automated part.
- Questions that need a decision go to the product manager in writing, with options. Example: "names over 50
  characters fail silently. Do we fix the dialog or raise the server limit?"

## 9. What I found

Full bug reports with steps, actual and expected result: [BUGS.md](BUGS.md).

| Id | Severity | Finding | Evidence |
|---|---|---|---|
| SS-BUG-1 | Major | A name longer than 50 characters: the dialog closes, no message, nothing is saved. The input allows 20 000 characters, the server answers 400 `"name" length must be less than or equal to 50 characters long`. | `tests/saved-searches.spec.ts` (expected failure), screenshot in the report. Reproduced by hand |
| SS-OBS-1 | Minor | `POST /savedSearches` without `data` is accepted (201). The item then opens as "all files". API only. | curl, section 3.3 |
| SS-OBS-2 | Minor | Validation errors are raw strings from the validator. If the UI ever shows server errors, users will read `child "body" fails because …`. | API tests |
| SS-IMP-1 | Improvement | The *Save to* tree in the dialog shows only groups, not the searches already saved in them. So you learn that a name is taken only after you type it. Showing the existing searches in grey under each group would help pick a free name. | Found while saving a search by hand, `evidence/saved-search-duplicate-name.png` |
