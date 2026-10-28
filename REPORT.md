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
| Autotests | `tests/`, 12 tests | done, green |
| Smoke test by hand | TEST_CASES.md, column *Smoke by hand* | in progress |

## Results

**Automation:** 12 of 12 pass, run time about 2 minutes. One test (`a name longer than 50 characters…`) is marked
as an expected failure because of SS-BUG-1; it passes as "expected to fail" and will turn red when the bug is fixed.
The permission test (TC-10) runs with the invited teammate's own login. After every test the API fixture removed
all `QA-auto …` items; the team library has no leftovers.

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

Details and evidence: TEST_PLAN.md, section 9, and the `evidence/` folder.

### Found by hand outside the scope: PDF editor

While exploring the product I also tried *Edit* on a PDF (the built-in editor is the embedded Photopea). Not
automated, no Playwright evidence: these are manual observations, reproduced twice.

| Id | Severity | Finding | How to see it |
|---|---|---|---|
| PDF-OBS-1 | Minor, third-party | After *Edit* on a PDF the text is re-rendered with other fonts: lines wrap differently and some icons turn into `�`. Clear when you zoom in. The cause is the PDF import in Photopea, not Pics.io, but the user sees a "damaged" document. | Preview a PDF → *Edit* → zoom in on a page |
| PDF-IMP-1 | Improvement | An edited PDF cannot be saved back. Pics.io shows a warning about it when the editor opens, but the warning has a *Do not show again* checkbox, and after that *File → Save* in the editor does nothing and says nothing. A user who ticked the checkbox once loses the edit silently, and the editor itself still offers *Save* as if it worked. Better: repeat the message on *Save*, or disable *Save* for PDF and show *Download* instead. | *Edit* a PDF → change something → *File → Save* → reload: no new revision, no message. The warning is per browser (`editorDontShowAlertForExtensions` in localStorage): it shows in an incognito window and not in a browser where the checkbox was ticked once |

## Not covered yet, next steps

- Permissions with the second account (TC-10) and the automated version with a second `storageState`.
- Live search after upload (TC-09): manual only, needs indexing time.
- Firefox and Safari, narrow window, touch devices.
- Broken search after a collection is deleted (F8).
