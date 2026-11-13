# Accord Design Engine (OuTSDe)

The design flow after **Start project**: brief → principal references → what each room needs → blank view → mood board → Codex render.
This is a separate build next to the CRM. It joins Accord Design after approval (see `../DESIGN_ENGINE_SPEC.md`).

## Run it (on the design PC)

Needs Node 20 or later and Codex CLI (`npm i -g @openai/codex`, then `codex login`).

**Double-click `Design_Model\Start Design Engine.cmd`.** That's all.

- npm cannot install packages on the Google Drive H: disk (EBADF errors). So the launcher copies `app` to
  `%LOCALAPPDATA%\AccordDesignEngine` and runs it from there. The first start installs the packages (about a minute).
- Every project, image, render and the vocabulary are still saved here in `Design_Model` (the launcher passes `DESIGN_MODEL`).
- Each start copies the latest code across, so updates made in `Design_Model\app` arrive on the next start.
- The UI opens at http://localhost:5174 and the engine runs on :4317. Close the window to stop it.

Do not run `npm install` inside `Design_Model\app` on H:. If a half-made `node_modules` folder is there from an earlier try, delete it.

## What it reads and writes

| | |
|---|---|
| Reads (never changes) | `Accord_Data/Exports/Accord Database.xlsx`: clients, residences and Accord experience sessions. No money or contact details are passed on. |
| Writes | Only inside `Design_Model`: `Projects/`, `Vocabulary/`, `Library/`, `Vendors/`, `.engine/` (job log). |
| Deletes | Nothing. Removing an image moves it to the room's `_removed/` folder. |

## Codex jobs (engine/prompts)

| Job | Uses | Writes |
|---|---|---|
| `ping` | – | (answer only) |
| `analyse-reference` | the room's principal references, style brief, notes | `needs.json` in the room folder |
| `render-room` | blank view, mood board (or the references), style.md, render reference, notes | `renders/rNNN.png` |
| `free` | your prompt | whatever the prompt asks |

Each job runs `codex exec --skip-git-repo-check --sandbox workspace-write -i <image> … -` with the prompt on stdin, in the room's folder.
The flags are in `engine/config.json`. If your Codex version differs, change them there; nothing else needs to change.

## Code map

- `engine/server.mjs`: the local server (Accord export, projects, images, vocabulary, the Codex job queue).
- `engine/seed.mjs`: the starting styles and the rooms for each typology.
- `src/`: the UI. `accord-base.css` is copied from the CRM so it looks the same. `components/ui.jsx` uses the same class names as the CRM's kit.
- `../graphify-out/`: the knowledge graph of this app and the CRM. Read `GRAPH_REPORT.md` before searching files.

## GitHub (separate repository for the Design Engine)

Make `Design_Model` the root of the repository (it already has `.gitignore` and `.github/workflows`).
`.gitignore` keeps Projects, Library, Vendors, the run state and downloaded images out of GitHub: client and vendor data stay in Drive.

| Workflow | When | What |
|---|---|---|
| `design-engine-ci.yml` | every push / pull request touching `app/` | install, check the engine code, run the engine smoke test (`npm test`), build the UI, keep it as an artifact |
| `design-engine-pages.yml` | push to `main` touching the UI, or by hand | builds the UI for GitHub Pages and publishes it |

The Pages site is only the interface: it talks to the engine on the design PC at `http://localhost:4317`, so the engine must be running (`Start Design Engine.cmd`).
One-time set-up:
1. On GitHub: Settings → Pages → Source: **GitHub Actions**.
2. On the design PC: add the Pages address (origin only, e.g. `https://outsde.github.io`) to `allowedOrigins` in `app/engine/config.json`, then **Update and restart** the engine. Other websites are refused.
3. Use Chrome or Edge for the Pages site (they allow a public page to reach the engine on this PC; the engine answers the Private Network Access check).

## One laptop as the team's server

Run Codex and the data on ONE laptop, and let everyone else use it from theirs.

1. On the server laptop (Codex CLI installed and signed in, Google Drive for desktop syncing this folder): double-click **`Start Design Server.cmd`** instead of `Start Design Engine.cmd`. Keep it plugged in and the window open (the launcher turns sleep off on mains power). If Windows asks, allow Node.js on **Private networks**.
2. The window shows the **Team address** (e.g. `http://192.168.1.20:4317`) and the **Access key**. Both are also on the Engine and Codex page of that laptop.
3. On the other laptops (same Wi-Fi or office network): open the Team address in a browser, enter the access key once. Everything is there: Space vocabulary, projects, asset library, vendors, Codex jobs. Codex runs on the server laptop.
4. The key is kept in `Design_Model/.engine/access-key.txt`. For a new key, delete that file and restart; everyone enters the new key once.

**From outside the office, or from the GitHub page:** a public https page (GitHub Pages) is not allowed to call a plain `http://192.168…` address. Use [Tailscale](https://tailscale.com) (free for small teams, private to your team):
install it on the server laptop and on each team laptop, sign in with the same account, then on the server run `tailscale serve --bg 4317`.
It prints an https address like `https://design-server.tail1234.ts.net`. On the GitHub page (or anywhere), Connect → Engine address: that https address, Access key: the key.
