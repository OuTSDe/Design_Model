# Design Engine · run notes (13 Nov 2026, overnight)

## Morning: one step
Double-click **Start Design Engine.cmd**. The engine reads `.engine/autorun.json` and queues the whole plan by itself (3 Codex jobs at a time):
1. Pinterest render references (3) + mood-board references (4) for all 13 styles → `Vocabulary/styles/<style>/render-ref`, `moodboard-ref`, `sources.json`.
2. **Residence 4202 · Anuraj Shetty → Living** (test room): Pinterest principal refs → research → Pinterest references → mood board → vendor products → blank view (Codex image generation) → render.
3. The other 13 rooms of 4202: Pinterest principal refs → research → Pinterest references → mood board → vendor products.
4. Brief and render values for all 13 styles, written by Codex from the references (originals kept as `brief.original.md`, `style.original.md`).
Around 100 Codex jobs; expect roughly 5–6 hours. Keep the window open. Watch the **Codex queue** on the Overview.

## 4202 · Anuraj Shetty: test set-up (replace freely)
Residence style Contemporary. Living, dining, passage: Maximal Traditional Minimal · powder: Rich Indian Traditional · kitchen, bath 2, bath 4: Modern · master bedroom: Contemporary · master bath, bath 3, bedroom 4: Minimalism · bedroom 2: Mid-Century Modern · bedroom 3 and balcony: Biophilic. A test brief is in the Brief tab.

## Problems found tonight, and what was done
| Problem | Fix |
|---|---|
| npm cannot install on the Google Drive H: disk (EBADF) | The launcher runs the app from `%LOCALAPPDATA%\AccordDesignEngine`; data stays in Drive (`DESIGN_MODEL`). |
| Codex CLI removed `--full-auto` | Uses `--sandbox workspace-write` with network on and live web search (`engine/config.json`). |
| Codex's Windows sandbox cannot start commands inside the Drive folder (`helper_unknown_error`) | Every job works in a scratch copy in `%TEMP%\AccordDesignEngine-work` and the engine copies new files back. |
| Closing the window left an old engine holding the ports | The launcher stops anything on ports 4317 and 5174 before it starts. |
| Closing the window mid-run lost the running jobs | Interrupted jobs are queued again on the next start; failed steps are retried once. |
| Restarting needed the screen | **Engine and Codex → Update and restart** copies the latest code from Drive and restarts. |
| Problems were invisible without the window | The window output is also written to `.engine/console.log`. |
| Google Drive sometimes reverts a file just after it is written | Every code change is written, re-read after 45 s and written again if Drive put the old version back. |
| A Codex job wrote straight into the Drive folder | Every prompt now ends with the rule to work only inside its folder. |

## Still open
- No real white model per room yet: the test uses a Codex-generated blank view. Exporting white views from Rhino per typology will make renders far more accurate.
- Pinterest images are for internal reference (sources are recorded); the mood boards and renders are what go to clients.
- The mood board editor (drag, swap, re-layout from `board-*.json`) and the node view for renders are the next build.
