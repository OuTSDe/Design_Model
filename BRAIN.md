# Second brain · Accord Design Engine (read this first)

Short, curated memory for any assistant working here (Claude, Codex). Read this, then `graphify-out/GRAPH_REPORT.md`, and only then open files.
Updated 12 Nov 2026.

## The two codebases
| | Where | What |
|---|---|---|
| Accord CRM (live) | `../CRM_Application` | React/Vite site on GitHub Pages + Google Apps Script backend (`backend/Code.gs`, sheet "Accord Database", one tab per collection). **Do not edit from here.** |
| Design Engine (this) | `./app` | Separate build. Run with `Start Design Engine.cmd` (copies app to %LOCALAPPDATA%\\AccordDesignEngine, because npm fails on the Drive H: disk; data stays here via DESIGN_MODEL). React/Vite UI (:5174) + local Node engine (:4317) that runs Codex CLI. Merges into the CRM only after Sanath approves. |

## Rules agreed with Sanath
- Build only inside `Design_Model`. Read Accord data read-only. Never remove or overwrite existing work without being asked.
- The look must match Accord Design: `app/src/accord-base.css` is copied from CRM `styles.css` (Poppins, Space Mono, burgundy accent, Design colour `--m-accord #8DAE78`). Same class names as the CRM's `components/ui.jsx`.
- The image engine is **Codex CLI** (`codex exec … -i img -`). Prompts are in `app/engine/prompts/*.md`.
- All data stays in the OuTSDe Drive. Nothing is deleted: removed images go to the room's `_removed/` folder.

## Where Design plugs into the CRM (for the merge)
- `source/src/modules/accord/Accord.jsx`: `Projects()` shows "Ready for design" with **Start project** (buyers with an experience session and no project). `ProjectDetail` tabs: Design (Rooms: renders, finishes, notes), BOQ, Summary, Client and residence, Brief.
- `source/src/lib/designLink.js`: `sessionsFor`, `projectsFor`, `bookingFacts` (CRM facts without money), `bookingOptions`, `briefRows`.
- Collections (Code.gs `COLLECTIONS`): `projects`, `rooms` (renders[], finishes[], notes), `packages`, `boq`, `vendors`, `quotes`, `samples`, `trips`, `stops`, `accordSessions`. On 11 Nov all of the design tabs were empty.
- `accordSessions` fields: id, startedAt, buyer, unitRef (YSC-2706), recordId (YSC-C-…), residence, persona, palette, register, coherence, configId, total, screen, by, unit, floor, updatedAt.
- Vendor categories: `modules/vendors/Vendors.jsx` `CATEGORIES` (Stone, Tiles, Hardware, Sanitary & CP, Veneers & doors, Fabrics & wallcoverings, Lighting, Furniture, Paint & finishes, Glass & mirrors, Appliances…).

## The Accord experience (the questionnaire)
- Bundle: `CRM_Application/experience-src/accord-experience.dist.html`, bridged by `tools/experience-bridge.js`.
- Five persona questions score HOST, SEEKER and SETTLER. Five image pairs score the axes warmth, density, indiaRoot, formality and objectDom. Together they resolve to the nearest of 9 palettes.
- Palettes: seeker-p01 White Walls (ready), host-p02 Tobacco & Dusk (ready), settler-p02 Teak & Monsoon (direction). The other six are roadmap: Stone & Shadow, Noir & Amber, Grey Plaster & Living Art, Grand & Indian, Mud & Linen, Dusk & Gather.
- Each palette option carries brand, tier (COMPOSED, PROVENANCE, ATELIER), lead time, swatch and warmth/texture/pattern scores, per room (Living Room, Dining, Kitchen, Master Bedroom).

## Design logic (Flowchart/ACCORD Design Logic Map.html)
- **Process:** Study → Vision board → Reference images per space (Primary: living, bedrooms · Secondary: dining, kitchen, bathrooms · Transitional: passage, balcony).
- **Category 2** (shared furniture pool): Minimalism, Contemporary, Mid-Century Modern, Modern. **Category 1:** Maximalism (Rich Indian Traditional, Antique Eclectic, Maximal Traditional Minimal), Maximal Minimalism, Biophilic, Farm House, Industrial, Traditional.
- **Focus:** sense of arrival, sequence of spaces, depth; "controlled yet free"; Indian maximalist renders get no daylight (moody, glittering).

## Design Engine map (app/)
- `engine/server.mjs`:
  - `readAccord()` reads `Accord_Data/Exports/Accord Database.xlsx` (row 2 = keys, `_extra` JSON merged; no money or contact fields).
  - `buildJob()` and `runJob()` make up the Codex queue.
  - `fetchImage()` takes an image, Pinterest pin or og:image link.
  - Projects live in `Projects/<flat> <client>/rooms/<room>/{principal,expanded,blank,moodboard,renders}`.
- `engine/seed.mjs`: the styles, `brief.md` and `style.md` templates, `roomsFor(type)`.
- `src/pages/Project.jsx`: rooms, references, `needs.json` table, blank view, mood board, Render with Codex, JobRow.
- Built (13 Nov, engine 0.3.0): Codex pipeline per room = find-principal (Pinterest) → research-room → find-references (Pinterest) → compose-moodboard → vendor-research → make-blank → render-room; style-references + style-brief for the vocabulary; Library and Vendors pages; autorun.json, resume, retry, Update and restart, console.log. See RUN_NOTES.md.
- Next: mood board editor (board-*.json layers), node view for renders, real white models from Rhino.

## GitHub
- Repo root = Design_Model. Workflows: .github/workflows/design-engine-ci.yml (check + smoke test) and design-engine-pages.yml (UI to Pages, VITE_ENGINE_URL=http://localhost:4317). Engine CORS only for config.allowedOrigins. Data folders are gitignored.

## Open items
- Google Drive for desktop sometimes reverts a file just after it is written: always write, re-read after ~45 s, write again if needed.
- Sachindra (2706, YSC-C-012, 2 BHK, floor 27 F6): his experience session stopped at "01 · Residence", so there is no persona yet.
- No interior blank volumes exist (WhiteModel has only the exterior). For now the blank views are uploaded.
- Style briefs, render references and mood-board references are still to be supplied by Sanath (placeholders are in `Vocabulary/`).
- Check that Codex image generation works on Sanath's PC (Engine page → Test Codex, then a real render).
