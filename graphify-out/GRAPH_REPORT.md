# Graph Report - brain  (2026-11-12)

## Corpus Check
- 134 files · ~190,186 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 1334 nodes · 5533 edges · 51 communities (44 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Button
- useStore
- HR.jsx
- help/ui.jsx
- ref_react
- Parking.jsx
- vid.js
- perms.js
- Inventory.jsx
- Code.gs.js
- math
- source/package.json
- Accord CRM · change instructions (7 Nov 2026, revision 2)
- now_
- app/package.json
- doPost
- source/src/components/Layout.jsx
- store.jsx
- ops.js
- sheet_
- read_
- server.mjs
- Accord
- buildJob
- Accord · backend
- Accord Design Engine: spec v0.1 (12 Nov 2026)
- setup
- drafts.js
- Cleanup.jsx
- totp.js
- patch-experience.mjs
- Accord changes, 12 Nov 2026 (e): no duplicate users
- Reports.jsx
- seed.mjs
- Accord changes, 12 November: Accord People (HRMS) and the knowledge base
- kyc.js
- Accord changes, 10 November: the Help centre
- Accord changes, 12 November (b): shared read cache and delta pulls
- geo.js
- Login.jsx
- experience-bridge.js
- runJob
- scripts
- Accord Design Engine (OuTSDe)
- theme.js

## God Nodes (most connected - your core abstractions)
1. `useStore()` - 176 edges
2. `Button()` - 146 edges
3. `d()` - 116 edges
4. `today()` - 108 edges
5. `Card()` - 103 edges
6. `Page()` - 101 edges
7. `Badge()` - 95 edges
8. `Main()` - 76 edges
9. `useCrm()` - 73 edges
10. `Modal()` - 69 edges

## Surprising Connections (you probably didn't know these)
- `6B. Alternate sign-in: e-mailed codes` --references--> `login_()`  [INFERRED]
  CRM_Application/ACCORD_CHANGES_2026-11-07.md → CRM_Application/backend/Code.gs.js
- `Audit and backup` --references--> `nightlyBackup()`  [INFERRED]
  CRM_Application/BACKEND.md → CRM_Application/backend/Code.gs.js
- `Sales and Design` --references--> `unitNo()`  [INFERRED]
  CRM_Application/BACKEND.md → CRM_Application/source/src/components/Tower.jsx
- `Model` --references--> `deriveCrm()`  [INFERRED]
  CRM_Application/ACCORD_CHANGES_2026-11-07.md → CRM_Application/source/src/lib/calc.js
- `4. Go-back button and saved drafts` --references--> `useDraft()`  [INFERRED]
  CRM_Application/ACCORD_CHANGES_2026-11-07.md → CRM_Application/source/src/lib/drafts.js

## Import Cycles
- 2-file cycle: `CRM_Application/source/src/lib/calc.js -> CRM_Application/source/src/lib/store.jsx -> CRM_Application/source/src/lib/calc.js`

## Communities (51 total, 7 thin omitted)

### Community 0 - "Button"
Cohesion: 0.05
Nodes (163): App(), G(), Gate(), Main(), BulkLog(), NEXT, row(), DataTable() (+155 more)

### Community 1 - "useStore"
Cohesion: 0.05
Nodes (141): 1.4 Code steps, Front end, Safe rollout for section 3, MiniCalendar(), Bar(), Card(), Grid(), Locked() (+133 more)

### Community 2 - "HR.jsx"
Cohesion: 0.07
Nodes (91): Steps the app enforces (rewrite `CancelBooking` in `BookingChanges.jsx` as a stepper), Empty(), Field(), Input(), Select(), accessGrade(), ASSET_TYPES, audienceText() (+83 more)

### Community 3 - "help/ui.jsx"
Cohesion: 0.07
Nodes (60): emit(), findOne(), findTarget(), helpGo(), HelpGuide(), label(), norm(), pathOf() (+52 more)

### Community 4 - "ref_react"
Cohesion: 0.13
Nodes (41): api, roomUrl(), ImageDrop(), Layout(), NAV, Badge(), Button(), Card() (+33 more)

### Community 5 - "Parking.jsx"
Cohesion: 0.09
Nodes (53): DocHeader(), BOOKED, fitPages(), PAGE_H, useFitPages(), applyPlan(), bandShort(), bandsOf() (+45 more)

### Community 6 - "vid.js"
Cohesion: 0.07
Nodes (18): { chromium }, fs, login(), open(), prepare(), fs, S, { execFileSync } (+10 more)

### Community 7 - "perms.js"
Cohesion: 0.08
Nodes (38): FileList(), useFileViewer(), when(), CLIENT_FOLDER, clientFolder(), clientRoot(), CORRESPONDENCE, COST_SHEETS (+30 more)

### Community 8 - "Inventory.jsx"
Cohesion: 0.13
Nodes (34): ElevationDiagram(), UnitPlan(), experienceUrl(), FloorPlan(), floorsOf(), ordinal(), plateOf(), plateRange() (+26 more)

### Community 9 - "Code.gs.js"
Cohesion: 0.11
Nodes (37): Files, 5 Nov additions, b32dec_(), b32enc_(), bankView_(), consultantView_(), delta_(), doGet() (+29 more)

### Community 10 - "math"
Cohesion: 0.13
Nodes (7): grp(), segs_of(), deboor(), sample(), simplify(), pid(), axis()

### Community 11 - "source/package.json"
Cohesion: 0.09
Nodes (28): author, dependencies, qrcode-generator@^1.4.4, react@18.3.1, react-dom@18.3.1, react-router-dom@6.26.2, description, devDependencies (+20 more)

### Community 12 - "Accord CRM · change instructions (7 Nov 2026, revision 2)"
Cohesion: 0.08
Nodes (25): 1.1 Problems in the draft to fix before it becomes the template, 1.2 Letter structure (what the template prints), 1.3 Settings to add (`settings.company` and `settings.demandLetter`), 1. Demand letter, built from the proposed draft, 2. Editable payment logs: apply straight away, notify admins, 3. Construction-linked payments, interest, and cancellation (RERA procedure), 3A. The rules Accord must follow (Karnataka), 3B. Per-client schedule synced to construction (+17 more)

### Community 13 - "now_"
Cohesion: 0.15
Nodes (26): 0. Quick audit: what exists today, 5. Notification opens the exact client or lead, Backend (`Code.gs`), afterSave_(), can_(), changes_(), checkDevice_(), closeEarlierFollowUps_() (+18 more)

### Community 14 - "app/package.json"
Cohesion: 0.10
Nodes (25): dependencies, express@^4.21.2, multer@^2.0.2, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.28.0, xlsx@^0.18.5, description (+17 more)

### Community 15 - "doPost"
Cohesion: 0.21
Nodes (25): approveDevice_(), audit_(), auth_(), changePassword_(), clientForm_(), dedupeUsers_(), doPost(), enrolConfirm_() (+17 more)

### Community 16 - "source/src/components/Layout.jsx"
Cohesion: 0.14
Nodes (21): ADMIN, Avatar(), Bell(), ChangePassword(), hm(), Layout(), NAV, PEOPLE (+13 more)

### Community 17 - "store.jsx"
Cohesion: 0.17
Nodes (21): deviceId(), deviceKind(), deviceLabel(), hashPassword(), newSalt(), ROUNDS, strongEnough(), buildSeed() (+13 more)

### Community 18 - "ops.js"
Cohesion: 0.08
Nodes (18): BOQ, BROCHURE, CARE_TIERS, DESIGNATION_OF, EXTRA_USERS, FEEDBACK_QUESTIONS, INTERESTS, PACKAGES (+10 more)

### Community 19 - "sheet_"
Cohesion: 0.19
Nodes (21): Accord changes, 12 November: speed and sync, Done on 12 Nov, 03:00 to 03:05, Not changed, worth knowing, Second pass: data consolidation and ID clashes, What changed, What was wrong, archiveAudit(), bigPut_() (+13 more)

### Community 20 - "read_"
Cohesion: 0.13
Nodes (22): apply_(), authMode_(), bigGet_(), brandHtml_(), clock_(), emailCode_(), fileAllowed_(), geoCheck_() (+14 more)

### Community 21 - "server.mjs"
Cohesion: 0.10
Nodes (14): accordCache, APP, CFG, DIR, DIST, EXPORT, HERE, JOBS (+6 more)

### Community 22 - "Accord"
Cohesion: 0.11
Nodes (20): installTriggers(), shareDocuments(), Files (1 Nov: everything in the OuTSDe Drive), 1. Set up the Google side (once, about 20 minutes, signed in as research@outsd-e.com), 2. Publish on GitHub (once), 3. First sign-in and the data (admin, once), 4. What changed from the 30 October meeting, 5. Sales and Design, linked (31 October) (+12 more)

### Community 23 - "buildJob"
Cohesion: 0.16
Nodes (19): buildJob(), ensure(), fileUrl(), fill(), flatStyles(), hydrate(), images(), inside() (+11 more)

### Community 24 - "Accord · backend"
Cohesion: 0.13
Nodes (14): Accord · backend, Audit and backup, Data, Extra access (4 Nov), Lead inbox (2 Nov), Limits to know, Notifications from the server (2 Nov), Sales and Design (+6 more)

### Community 25 - "Accord Design Engine: spec v0.1 (12 Nov 2026)"
Cohesion: 0.15
Nodes (12): 10. Build order, 11. Merging later (after your approval), 1. Boundaries, 2. Look, 3. How it runs, 4. Folder layout, 5. The flow, room by room, 6. Tagging and style scores (+4 more)

### Community 26 - "setup"
Cohesion: 0.23
Nodes (12): clean_(), exportNow_(), exportXlsx_(), folder_(), kycSafe_(), logoFromData_(), moveLogoToDrive(), publishLogo_() (+4 more)

### Community 27 - "drafts.js"
Cohesion: 0.45
Nodes (11): Drafts(), clearAllDrafts(), clearDraft(), draftTime(), K(), listDrafts(), ping(), readDraft() (+3 more)

### Community 28 - "Cleanup.jsx"
Cohesion: 0.25
Nodes (7): CLEANUP_COLLS, DEMO_KEY, emailJunk(), phoneJunk(), testReasons(), LABEL, nameOf()

### Community 29 - "totp.js"
Cohesion: 0.27
Nodes (9): b32dec(), b32enc(), RFC-6238, newSecret(), otpUri(), qrSvg(), totpAt(), totpCheck() (+1 more)

### Community 30 - "patch-experience.mjs"
Cohesion: 0.20
Nodes (6): cfg, url, bridge, edits, html, [src, out]

### Community 31 - "Accord changes, 12 Nov 2026 (e): no duplicate users"
Cohesion: 0.20
Nodes (9): Accord changes, 12 Nov 2026 (e): no duplicate users, Delete a user (12 Nov), Files changed, Preventing new duplicates, Removing duplicates, Restored, Sign-in with a duplicated username (3.8.5), The duplicate warning (+1 more)

### Community 32 - "Reports.jsx"
Cohesion: 0.36
Nodes (9): daySums(), localDate(), BarChart(), count(), DayChart(), hm(), inRange(), pct() (+1 more)

### Community 33 - "seed.mjs"
Cohesion: 0.25
Nodes (8): BASE, briefFor(), MOODY, NOTES, R(), roomsFor(), styleMdFor(), STYLES

### Community 34 - "Accord changes, 12 November: Accord People (HRMS) and the knowledge base"
Cohesion: 0.29
Nodes (6): Accord changes, 12 November: Accord People (HRMS) and the knowledge base, Go-live, in order (about 20 minutes), Not done, worth knowing, The knowledge base (33 documents, all starting "In review"), What is in it, Who sees what (enforced on the server, not only hidden on screen)

### Community 35 - "kyc.js"
Cohesion: 0.43
Nodes (6): AADHAAR_RE, checkCard(), loadTesseract(), nameMatch(), PAN_RE, readCard()

### Community 36 - "Accord changes, 10 November: the Help centre"
Cohesion: 0.33
Nodes (5): Accord changes, 10 November: the Help centre, Files, Keeping it right, Small fixes found while testing, What people see

### Community 37 - "Accord changes, 12 November (b): shared read cache and delta pulls"
Cohesion: 0.33
Nodes (5): Accord changes, 12 November (b): shared read cache and delta pulls, Checked and left alone, Measured on a copy (fake sheet and cache), What changed, Why

### Community 38 - "geo.js"
Cohesion: 0.53
Nodes (5): useWatchers(), geoCheck(), getLocation(), haversine(), km()

### Community 39 - "Login.jsx"
Cohesion: 0.40
Nodes (5): TEMP_PASSWORD, CREDITS, Login(), readTrust(), RIGHTS

### Community 40 - "experience-bridge.js"
Cohesion: 0.53
Nodes (4): b64(), get(), put(), save()

### Community 41 - "runJob"
Cohesion: 0.53
Nodes (6): finish(), now(), pump(), quote(), runJob(), saveJobs()

### Community 42 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, engine, start, ui

### Community 43 - "Accord Design Engine (OuTSDe)"
Cohesion: 0.33
Nodes (5): Accord Design Engine (OuTSDe), Code map, Codex jobs (engine/prompts), Run it (on the design PC), What it reads and writes

## Knowledge Gaps
- **2 isolated node(s):** `RFC-6238`, `RFC-6238`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 310 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `0. Quick audit: what exists today` connect `now_` to `Button`, `useStore`, `Accord CRM · change instructions (7 Nov 2026, revision 2)`, `doPost`, `read_`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **What connects `RFC-6238`, `RFC-6238` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.050702672912648114 - nodes in this community are weakly interconnected._
- **Why does `useStore()` connect `useStore` to `Button`, `Reports.jsx`, `HR.jsx`, `help/ui.jsx`, `Parking.jsx`, `perms.js`, `Inventory.jsx`, `Login.jsx`, `source/src/components/Layout.jsx`, `store.jsx`, `Cleanup.jsx`, `totp.js`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `useStore` be split into smaller, more focused modules?**
  _Cohesion score 0.05377731194065952 - nodes in this community are weakly interconnected._
- **Why does `Construction()` connect `useStore` to `Inventory.jsx`, `Button`, `HR.jsx`, `now_`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `HR.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06501157163896487 - nodes in this community are weakly interconnected._