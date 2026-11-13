# Accord Design Engine

OuTSDe's design engine for Accord (Yamuna Sky City, Mangaluru): from a client's design brief to a render of every room, with Codex CLI doing the research, references, mood boards and renders, and a vendor asset library with a fixed form per kind of product.

**Code only.** Client projects, the asset library, vendors and downloaded images live in Google Drive and are never committed (see `.gitignore`).

| | |
|---|---|
| `app/` | the UI (React + Vite) and the local engine (`app/engine`, Node) that runs Codex CLI |
| `app/README.md` | how to run it, the Codex jobs, and the GitHub set-up |
| `.github/workflows/` | `design-engine-ci.yml` (checks + engine test on every push) · `design-engine-pages.yml` (UI to GitHub Pages) |
| `BRAIN.md` | the short project memory: rules, CRM integration points, design logic, file map |
| `DESIGN_ENGINE_SPEC.md` | the spec |
| `Flowchart/` | the ACCORD design logic map |

**Running it.** On the design PC: double-click `Start Design Engine.cmd` (it runs the engine from a local copy and keeps all data in Drive). The GitHub Pages site is the same interface and talks to that engine at `http://localhost:4317`.

**Publishing.** Double-click `Publish to GitHub.cmd` in the Drive folder: it copies the code to a clean local repository, creates the GitHub repository and Pages the first time, and pushes.

Separate build: it joins the Accord CRM (`CRM_Application`) as part of Accord Design after approval.
