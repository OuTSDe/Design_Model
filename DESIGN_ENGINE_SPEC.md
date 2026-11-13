# Accord Design Engine: spec v0.1 (12 Nov 2026)

**OuTSDe · for review before anything is built**

What happens after **Start project** in Accord Design: from the client's design brief to a final render for every room, through reference images, an asset library, vendor products, mood boards and Codex CLI.

---

## 1. Boundaries

- Everything is built in `H:\My Drive\Accord_CRM_Application\Design_Model`. Nothing in `CRM_Application` is changed.
- It reads Accord data (clients, residences, experience sessions) **read-only**. It writes only inside `Design_Model`.
- Once it works and you approve, it is merged into the main CRM as part of Accord Design (section 11).
- All data stays in the OuTSDe Drive, the same as the CRM.

## 2. Look

It uses the same look as Accord Design, so the merge changes nothing visually.

- **Shared design tokens.** These are copied from `CRM_Application/source/src/styles.css`:
  - Poppins for text, Space Mono for labels;
  - the dark ground `#0C0A0A` and the light theme `#F5F1EC`;
  - the burgundy accent `#8E2236` / `#7A1C2E`;
  - the Accord Design module colour `#8DAE78`.
- **Same layout:**
  - the 248 px side panel that collapses;
  - the 64 px top bar with crumbs;
  - cards, `mod-card` tiles, Seg tabs and dashed "worked out" fields;
  - light and dark mode.
- **Same stack** as the CRM: React and Vite. Components are written so they can drop into `source/src/modules/` later.

## 3. How it runs

```
Browser (Design Engine UI, React)  ⇄  Local engine server (Node, localhost:4317)  →  Codex CLI, rembg, file system
                                              ↓ reads
                         Accord_Data/Exports/Accord Database.xlsx (read-only, v1)
```

- **Why a local server.** A web page cannot run Codex CLI. The engine server runs on your PC and does four things:
  1. starts `codex exec` jobs;
  2. removes backgrounds;
  3. downloads reference images;
  4. reads and writes the library folder.
- **Start it with one command:** `npm run engine` in `Design_Model/app`. The UI opens at `http://localhost:5174`.
- **Accord data, v1.** It reads the nightly Excel export: clients, units and accordSessions only, with no money columns. After the merge, it uses the live store.
- **Job queue.** Every Codex task is a job with:
  - a status (queued, running, done, failed);
  - its prompt, inputs and outputs;
  - a log.
  
  Any job can be re-run.

## 4. Folder layout

```
Design_Model/
  Flowchart/                     (existing: design logic map)
  Meeting_Log/                   (existing)
  app/                           the UI and engine server source
  Vocabulary/                    the design brain, shared by all projects
    styles/<style-id>/
      brief.md                   what this style means to OuTSDe (your words)
      style.md                   render values: light quality, colour temperature, framing, focus, what to avoid
      render-ref/                1–3 images the render must follow for light and frame
      moodboard-ref/             example mood boards, so it learns the layout
    styles.json                  the ten styles, sub-styles, Category 1 / Category 2
  Library/                       asset database, grows with every project
    assets/<asset-id>/
      original.jpg   cutout.png   asset.json    (tags, scores, source, vendor link)
    index.json
  Vendors/<vendor-id>/
    vendor.json
    products/<product-id>/       front.jpg axo.jpg material.jpg reflection.jpg … product.json
  Projects/<flat> <client>/      e.g. "2706 H S Sachindra"
    project.json                 brief, rooms, chosen styles, status
    rooms/<room-id>/
      principal/                 your 2 main references
      expanded/                  references found from them
      moodboard/                 board.json (layers) + board.png
      blank/                     the white volume view
      renders/                   r001.png … with the inputs used for each
    jobs/                        job log
```

## 5. The flow, room by room

**Step 0 · Start project.** Pick the client (from the "Ready for design" list). The project opens with the base context:
- client, residence, type, floor and area from Accord;
- the experience session: persona, palette, the five axes (warmth, density, India-root, formality, object dominance) and register;
- the rooms of that typology. A 2 BHK starts with living, dining, kitchen, master bedroom, bedroom 2, bathrooms, passage and balcony, following Step 3 of the logic map. Rooms can be added or removed.

**Step 1 · Brief and styles.**
- One overall style for the residence, and a style for each room. For example, living is Rich Indian Traditional and the bedrooms are Contemporary.
- Each style pulls its `brief.md` and `style.md` from Vocabulary. You can add project notes.

**Step 2 · Principal references.** You drop 2 wide shots per room. They can be uploaded, pasted, or given as a Pinterest pin or board link.

**Step 3 · Reference expansion.**
- For each principal image, Codex first lists what the room needs in detail. For a kitchen, that is corner detail, storage compartments, countertop marble, splashback, handles, lighting and so on.
- It then searches for similar images for each item, matching colour theme and style. Pinterest board links you paste are pulled as well.
- Every result comes back as a card with its source. You keep or reject it. Kept images go to `Library/` and to the room's `expanded/`.

**Step 4 · Cutouts and tags.** Every kept image or product goes through these steps:
1. **Background removal:** rembg locally, fast and free.
2. **Clean-up where needed:** Codex image generation, for a better angle, higher resolution or a clean product shot. The result stays without a background.
3. **Tagging:** element type, room, dominant colours (hex), material, ornamentation level (1–5), and a score from 0 to 1 for each of the ten styles.

**Step 5 · Mood boards.**
- **Overall mood board.** You give it, or it is composed from the room boards.
- **Room mood board.** Cutouts are placed on a canvas following the `moodboard-ref` examples. They carry the room's theme background and are drawn from assets that score high for that room's style.
- Fully editable: move, scale, swap, delete, add text and swatches. Saved as layers (`board.json`) and as an image.

**Step 6 · Blank view.** The plain white volume of the room, with no furniture, from a fixed camera. See section 9 for where it comes from.

**Step 7 · Render.** These inputs go to Codex CLI together:
- the blank view;
- the collage or mood board;
- the style's `style.md` and render reference;
- the brief and room notes.

Codex returns the render. Each render keeps a record of exactly which inputs made it.

**Step 8 · Iterate (node view).** Each room has a node graph:

```
[Blank view] ─┐
[Mood board] ─┼─→ [Prompt] → [Codex render] → [Output] → [Edit / re-run]
[Style.md]   ─┤
[Render ref] ─┘
```

- Change a node (another mood board, a different light value, a note such as "warmer marble") and re-run from that point.
- Renders sit side by side to compare. The chosen one becomes the room's render in the Accord project. On merge, it goes into the existing Rooms → Renders tab.

## 6. Tagging and style scores

The ten Accord styles from the logic map, in two categories:

| Category 2 (shared pool) | Category 1 |
|---|---|
| Minimalism, Contemporary, Mid-Century Modern, Modern | Maximalism (Rich Indian Traditional, Antique Eclectic, Maximal Traditional Minimal), Maximal Minimalism, Biophilic, Farm House, Industrial, Traditional |

- **Shared pool.** An asset that scores well in one Category 2 style is offered to all four. Furniture, rugs and light fixtures are reused across them.
- **Crossovers.** Any asset can score in more than one style. An ornamented chair can be both Traditional and Industrial. The score decides where it is offered, not a single fixed label.
- **Experience link.** Assets also carry the five experience axes, so a client's quiz answers rank assets directly.
- **Fixed lists.** Element types follow the vendor categories already in the CRM: Stone, Tiles, Lighting, Furniture, Fabrics and wallcoverings, and so on.

## 7. Vendors and products

- **Seed vendor.** You enter one vendor that matches your taste. Codex researches similar vendors (same materials, same taste) as candidates. Each candidate is reviewed before it is added.
- **Required set per product category.** This is the list given to the vendor data person. Example for furniture:
  - front view, axonometric view, material close-up, reflection or finish shot;
  - dimensions, material spec, price band, lead time.
  
  Each category has its own list, editable in Settings.
- **Products are completed** with the regenerated clean, background-free images (step 4), so every product becomes a tagged library asset.
- **On merge**, vendors map onto the CRM's existing vendor directory and quotes.

## 8. Codex jobs

| Job | Input | Output |
|---|---|---|
| `analyse-reference` | principal image + room + style | list of detail needs and search terms |
| `search-references` | search terms + palette | image links with sources |
| `clean-product` | vendor photo(s) | clean, background-free product image |
| `tag-asset` | cutout | asset.json tags and scores |
| `compose-moodboard` | room assets + moodboard-ref | first layout of board.json |
| `render-room` | blank + board + style.md + render-ref + notes | render image |
| `find-vendors` | seed vendor + categories | candidate vendors |

All jobs run through `codex exec` with images attached. The prompt for each job is a template file, so you can tune it.

## 9. Needed from you

1. **Codex image generation.** Phase 0 checks that Codex CLI on your PC can generate and edit images. If it can't, Codex runs the OpenAI Images API with your key instead.
2. **Blank room volumes.** There is no interior white model yet. The WhiteModel folder has the exterior only. Options:
   - (a) export one white view per room from Rhino or SketchUp per typology;
   - (b) generate them from the typical floor DWG;
   - (c) upload a site photo or a plain render per room.
   
   v1 accepts uploads, so this does not block the build.
3. **Style briefs.** A few lines and 2–3 reference images per style for `brief.md` and `render-ref/`, starting with the styles you use first. Placeholders from the logic map go in until then.
4. **Mood-board references:** 3–5 examples of how an OuTSDe mood board should look.
5. **Seed vendor:** one vendor and the image list per product category.
6. **Sachindra's session.** The 11 Nov export shows his experience stopped at "01 · Residence", with no persona or palette. If it was finished after that, the next export has it. If not, his brief starts from the style you choose.

## 10. Build order

1. **Phase 0.** Scaffold the app and engine server with the Accord look. Confirm the Codex CLI job works on your PC.
2. **Phase 1.** Start project from the export, plus rooms, styles, principal references and Vocabulary.
3. **Phase 2.** Reference expansion, cutouts, tagging and the Library.
4. **Phase 3.** Mood board editor.
5. **Phase 4.** Blank view, render job and node view.
6. **Phase 5.** Vendors, products and the required image sets.

Each phase is shown to you working before the next one starts.

## 11. Merging later (after your approval)

1. The UI modules move into `CRM_Application/source/src/modules/design-engine/`, with menu items under Design.
2. Projects link to the existing `projects` and `rooms` collections. Renders fill Rooms → Renders.
3. The engine server stays a local helper on the design PC, which the site calls only when it is running. Hosted options can come later.
4. Library and Vendors stay in Drive. Their index can move to Sheet tabs if the team needs them on other devices.
