# Bug reports and observations

Environment for all items: pics.io web app, Chrome 130, Windows 11, trial team "My team library" (admin role),
27–28 October 2026. Ids match TEST_PLAN.md section 9 and REPORT.md.

---

## SS-BUG-1 · A saved search with a name longer than 50 characters is silently not created

**Severity:** Major · **Type:** Bug · **Area:** Saved searches, dialog *Create saved search*

**Steps:**
1. Log in, open *My team library*.
2. Type `guide` in the top search bar, press Enter (2 assets found).
3. In the filter bar press *Save this search*.
4. In the *Name* field paste a 52-character name: `Long name to check the fifty character limit in Pics`.
5. Press *Ok*.
6. Open the left rail → *Search* icon and look for the item in *Team Saved Searches*.

**Actual result:** the dialog closes as if the search was saved. No toast, no error. The item is not in the panel.
In DevTools → Network the request `POST /savedSearches` returns **400**
`"name" length must be less than or equal to 50 characters long`. The *Name* field accepts up to 20 000
characters (`maxlength=20000`).

**Expected result:** either the field does not accept more than 50 characters, or the dialog stays open and shows
a message such as *Name is too long (max 50 characters)*. Nothing is lost silently.

**Evidence:** reproduced by hand twice. Screenshots: `evidence/saved-search-long-name.png` (52 characters typed,
*Ok* enabled) and `evidence/saved-search-long-name-after-ok.png` (after *Ok*: no dialog, no message, no toast).
Autotest `tests/saved-searches.spec.ts › a name longer than 50 characters…` (marked `test.fail`; it attaches the
400 response body and a screenshot to the HTML report). API check `tests/saved-searches.api.spec.ts › 50
characters are accepted, 51 are rejected`.

---

## SS-OBS-1 · The API accepts a saved search without search criteria

**Severity:** Minor · **Type:** Observation (API only) · **Area:** `POST /savedSearches`

**Steps:**
1. Take the API key from *My account*.
2. Send `POST https://pics.io/savedSearches` with header `Authorization: Bearer <key>` and body
   `{"name": "No criteria", "shared": false}` (no `data`).
3. Open the left rail → *Search* icon → *Personal Saved Searches* → click *No criteria*.

**Actual result:** the server answers **201** and stores the item with `"data": null`. In the UI the item opens as
the whole library ("3 assets"), that is, a search that matches everything.

**Expected result:** the server answers 400: `data` with at least one criterion is required. The UI never shows
a saved search with no criteria.

**Evidence:** curl, see TEST_PLAN.md section 3.3. Not reproducible from the UI (the dialog always sends `data`).

---

## SS-OBS-2 · Validation errors come back as raw validator strings

**Severity:** Minor · **Type:** Observation (API) · **Area:** `POST /savedSearches` error bodies

**Steps:**
1. Send `POST /savedSearches` with the API key and an empty name: `{"name": "", "shared": false}`.
2. Send the same with a 51-character name.

**Actual result:** 400 with bodies like
`child "body" fails because [child "name" fails because ["name" is not allowed to be empty]]` and
`… ["name" length must be less than or equal to 50 characters long]`. These are internal validator messages.

**Expected result:** a short, user-readable message (`Name is required`, `Name is too long (max 50)`) and an error
code, so the web app can show the text to the user without rewording it. Today the dialog shows nothing
(SS-BUG-1), partly because the server text is not meant for users.

**Evidence:** `tests/saved-searches.api.spec.ts › empty, whitespace-only and HTML names are rejected with 400`.

---

## SS-IMP-1 · The *Save to* tree does not show the searches that already exist

**Severity:** Improvement · **Type:** UX · **Area:** dialog *Create saved search*

**Steps:**
1. Make sure a saved search named `Guide docs` already exists under *Team Saved Searches*.
2. Search for `guide`, press *Save this search*.
3. Look at the *Save to* tree in the dialog.
4. Type `Guide docs` as the name.

**Actual result:** the tree shows only groups (*Team Saved Searches*, *Restricted*, *Office documents*…), not the
saved searches inside them. The user finds out that the name is taken only after typing it, from the red text
*A saved search with this name already exists in this location*.

**Expected result:** the tree shows the existing searches under each group (for example in grey, not selectable),
so the user sees which names are taken and where, and can pick a free name or a different group at once.

**Evidence:** `evidence/saved-search-duplicate-name.png`. Found by hand.

---

## PDF-OBS-1 · A PDF opened in the editor is shown with other fonts and broken glyphs

**Severity:** Minor · **Type:** Observation, third-party (Photopea) · **Area:** *Edit* on a PDF asset

**Steps:**
1. Open the preview of the PDF *Pics.io Internal Team Onboarding Guide.pdf* (the default onboarding file).
2. In the left rail press *Edit* (pencil). The embedded Photopea editor opens.
3. Press *Ok* in the PDF warning.
4. Zoom in on page 1 (Ctrl and `+` or the zoom tool).

**Actual result:** the text is re-rendered with substituted fonts: lines wrap in other places than in the preview,
spacing changes, some icons and bullets are shown as `�`. The document looks damaged compared with the preview.

**Expected result:** the page in the editor looks the same as in the preview (same fonts and line breaks), or the
editor tells the user that fonts were substituted.

**Evidence:** found by hand, reproduced twice. The cause is the PDF import in Photopea, not Pics.io code, but the
user sees it inside Pics.io.

---

## PDF-IMP-1 · After editing a PDF, *File → Save* does nothing and says nothing

**Severity:** Improvement (UX) · **Type:** Improvement · **Area:** *Edit* on a PDF asset, saving

**Steps:**
1. Open the preview of any PDF, press *Edit*.
2. In the warning *Editor won't be able to save your modified PDF file back to Pics.io…* tick
   *Do not show this warning about PDF again* and press *Ok*.
3. Change something on the page (for example draw a line with the brush).
4. Press *File → Save* in the editor.
5. Reload the page and open the preview of the PDF again.

**Actual result:** *File → Save* gives no message and no confirmation. After the reload the PDF has no new revision,
the change is gone. The warning from step 2 is shown once per browser (flag `editorDontShowAlertForExtensions` in
localStorage); in an incognito window it appears again. A user who ticked the checkbox once will keep losing
edits without any hint.

**Expected result:** for a PDF the editor either disables *File → Save* and offers *Download* instead, or shows the
same message again on *Save*: *This PDF cannot be saved back to Pics.io. Download it and upload as a new
revision.* The warning should not be the only place where the user learns this.

**Evidence:** found by hand, reproduced in a normal and in an incognito window.
