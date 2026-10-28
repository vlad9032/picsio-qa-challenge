# Test cases: Saved searches (core scenarios)

Steps for the core scenarios from [TEST_PLAN.md](TEST_PLAN.md). Each case says whether it is automated and what
the manual smoke run showed. Environment: pics.io web app, Chrome, trial team with 3 files, 28 October 2026.

Setup for all cases: log in, open *My team library*, type `guide` in the top search bar, press Enter. The bar shows
**2 assets**.

---

### TC-01 · Save a team search and open it (F1)

Automated: `saved-searches.spec.ts › a search from the search bar is saved as a team search…`
Smoke by hand: pending

1. In the filter bar press *Save this search*.
2. Name: `Guide docs`. Leave *Share with my team* on. Press *Ok*.
3. Open the left rail → *Search* icon.
4. Scroll *Team Saved Searches* to the end.
5. Click `Guide docs`.

Expected: after step 2 a toast *"Guide docs" added to "Saved searches"*; after step 4 the item is under *Team*, not
under *Personal*; after step 5 the search bar shows `guide` and **2 assets** again.

---

### TC-02 · Save a personal search (F2)

Automated: `saved-searches.spec.ts › with "Share with my team" unchecked…`
Smoke by hand: pending

1. Press *Save this search*.
2. Name: `My personal guide`. Uncheck *Share with my team*. Press *Ok*.
3. Open the *Search* panel.

Expected: the item is under *Personal Saved Searches* and not under *Team*. A teammate does not see it (see TC-10).

---

### TC-03 · Save a search with filters only (F3)

Automated: no (secondary for automation, core for manual)
Smoke by hand: pending

1. Clear the search bar.
2. In the filter bar choose *Type* → *PDF*.
3. Press *Save this search*, name `PDF only`, *Ok*.
4. Clear the filters. Open the *Search* panel, click `PDF only`.

Expected: the *Type = PDF* filter is back and the same files are shown.

---

### TC-04 · Empty name (V1)

Automated: `saved-searches.spec.ts › Ok stays disabled for an empty or whitespace-only name`
Smoke by hand: pending

1. Press *Save this search*.
2. Leave the name empty. Look at *Ok*.
3. Type three spaces. Look at *Ok*.
4. Type `x`. Look at *Ok*.

Expected: *Ok* is grey after steps 2 and 3, active after step 4.

---

### TC-05 · Duplicate name (V2)

Automated: `saved-searches.spec.ts › a duplicate name (any letter case) is rejected…`
Smoke by hand: **PASS** (28.10.2026, screenshot of the dialog)

1. Press *Save this search*.
2. Type the name of an existing search, for example `Guide docs` or the built-in `Video`.
3. Try the same name in another letter case: `GUIDE DOCS`.

Expected: red text *A saved search with this name already exists in this location. Please choose another name.*
and *Ok* is grey, in all cases.

---

### TC-06 · Name longer than 50 characters (V3) — SS-BUG-1

Automated: `saved-searches.spec.ts › a name longer than 50 characters…` (marked `test.fail`)
Smoke by hand: **BUG reproduced** (28.10.2026)

1. Open DevTools → Network.
2. Press *Save this search*.
3. Paste `Long name to check the fifty character limit in Pics` (52 characters). Press *Ok*.
4. Open the *Search* panel and look for the item.

Expected: the dialog stays open with a message like *Name is too long (max 50)*, or the field does not accept more
than 50 characters.
Actual: the dialog closes, no message, the item is not created. Network shows `POST /savedSearches` → **400**
`"name" length must be less than or equal to 50 characters long`.

---

### TC-07 · Rename from the tree (F5)

Automated: `saved-searches.spec.ts › rename from the tree updates the item…`
Smoke by hand: pending

1. Open the *Search* panel. Hover `Guide docs`.
2. Press the pencil (*Rename saved search*).
3. Add ` renamed` to the name, press Enter.
4. Press the pencil again, type a name that already exists, press Enter.
5. Press the pencil again, clear the name, press Esc.

Expected: step 3 — the item shows the new name, the old one is gone; step 4 — the rename is refused with a message;
step 5 — the name stays as it was.

---

### TC-08 · Delete from the tree (F6)

Automated: `saved-searches.spec.ts › delete asks for confirmation and removes the search…`
Smoke by hand: pending

1. Hover `Guide docs renamed`. Press the trash (*Delete saved search*).
2. In *Delete saved search?* press *Cancel*.
3. Repeat step 1, press *Delete*.
4. Hover the built-in search `Video`.

Expected: step 2 — the item stays; step 3 — the item is gone from the panel and after a page reload; step 4 — no
trash icon on a built-in search.

---

### TC-09 · A saved search is live (F7)

Automated: no (needs upload and indexing)
Smoke by hand: pending

1. Open the saved search `Guide docs`. Note the number of files.
2. Upload a new file with `guide` in its name. Wait until it is indexed.
3. Open `Guide docs` again.
4. Delete the uploaded file. Open `Guide docs` again.

Expected: step 3 — the number of files is one more; step 4 — back to the original number.

---

### TC-10 · Team vs personal for a teammate (permissions)

Automated: not yet (second account)
Smoke by hand: pending (invite sent to the second account)

1. Log in as the teammate (role *guest*).
2. Open the *Search* panel.

Expected: `Guide docs` (team) is visible; `My personal guide` of the owner is not visible. A guest cannot rename or
delete a team search made by the owner unless the role allows it.

---

### TC-11 · API name rules (V3, V4)

Automated: `saved-searches.api.spec.ts` (4 tests)
Smoke by hand: not needed

`POST /savedSearches` with the API key as Bearer:

| Name | Expected |
|---|---|
| 50 characters | 201 |
| 51 characters | 400, `less than or equal to 50 characters` |
| empty, spaces only | 400, `"name" is not allowed to be empty` |
| `<img src=x onerror=alert(1)>` | 400, `contains HTML tags` |
| a name that already exists in the same place | 409, `SavedSearchDuplicateAtLocationApiError` |
