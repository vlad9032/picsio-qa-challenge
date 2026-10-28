# Report: Saved searches in Pics.io

Vladyslav Hryhorian · 28 October 2026

## Environment

- pics.io web app, Chrome 130, Windows 11, viewport 1440×900.
- Trial team "My team library" with the 3 default files (two onboarding PDFs and one image), roles *admin* and
  *guest*, one invited teammate.
- Automation: Playwright 1.64, TypeScript, Node 24, one worker.

## What was done

| Part | Where | Status |
|---|---|---|
| Test plan | [TEST_PLAN.md](TEST_PLAN.md) | done, approved |
| Test cases for the core scenarios | [TEST_CASES.md](TEST_CASES.md), 11 cases | done |
| Autotests | `tests/`, 11 tests | done, green |
| Smoke test by hand | TEST_CASES.md, column *Smoke by hand* | in progress |

## Results

**Automation:** 11 of 11 pass, run time about 2.5 minutes. One test (`a name longer than 50 characters…`) is marked
as an expected failure because of SS-BUG-1; it passes as "expected to fail" and will turn red when the bug is fixed.
After every test the API fixture removed all `QA-auto …` items; the team library has no leftovers.

**Smoke by hand (28.10.2026):**

| Case | Result |
|---|---|
| TC-05 duplicate name | PASS |
| TC-06 name > 50 characters | BUG reproduced (SS-BUG-1) |
| TC-01, 02, 03, 04, 07, 08, 09, 10 | pending |

## Findings

| Id | Severity | Short |
|---|---|---|
| SS-BUG-1 | Major | Name > 50 characters: dialog closes, no message, nothing saved. Server 400, UI shows nothing |
| SS-OBS-1 | Minor | `POST /savedSearches` without `data` is accepted. API only |
| SS-OBS-2 | Minor | Server validation messages are raw strings, not user text |
| SS-IMP-1 | Improvement | The *Save to* tree does not show existing searches, so a taken name is found only after typing |
| PDF-OBS-1 | Minor, third-party | *Edit* opens a PDF in the embedded Photopea editor. The text is converted with other fonts: lines wrap differently and some icons become `�`. Visible when you zoom in. Found by hand, outside the saved-searches scope |
| PDF-IMP-1 | Improvement | Pics.io warns that an edited PDF cannot be saved back (download and upload as a revision instead). After that, *File → Save* in the editor does nothing and says nothing. Better: repeat the message on *Save* or disable *Save* for PDF |

Details and evidence: TEST_PLAN.md, section 9, and the `evidence/` folder.

## Not covered yet, next steps

- Permissions with the second account (TC-10) and the automated version with a second `storageState`.
- Live search after upload (TC-09): manual only, needs indexing time.
- Firefox and Safari, narrow window, touch devices.
- Broken search after a collection is deleted (F8).
