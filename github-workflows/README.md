# Move these into .github/workflows

These two GitHub Actions workflows belong in `Design_Model/.github/workflows/` (Claude cannot write into `.github` on this PC).
Move both `.yml` files there before the first push, then delete this folder.

- `design-engine-ci.yml`: checks on every push: install, engine code check, engine smoke test, UI build.
- `design-engine-pages.yml`: publishes the UI to GitHub Pages (Settings → Pages → Source: GitHub Actions).
