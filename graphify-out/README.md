# graphify-out · the code knowledge graph

Built 12 Nov 2026 with graphify 0.9.107 (`graphify update`, code and docs, no LLM). It covers:
- `CRM_Application/…`: the Accord CRM source, backend (`Code.gs` read as JS), tools and change notes. The built site and the experience bundle are left out.
- `Design_Model/…`: this Design Engine.

| File | Use |
|---|---|
| `GRAPH_REPORT.md` | Read first: god nodes, communities, surprising links. |
| `graph.json` | For `graphify query / explain / path --graph graphify-out/graph.json`. |
| `graph.html` | Open in a browser to explore the graph. |

**Refresh.** Ask Claude to "update the brain". It re-copies both code folders into a clean corpus (no node_modules, no client data) and runs `graphify update`.
To do it yourself: `pip install graphifyy`, copy the two source folders into an empty folder with the same layout, and run `graphify update .` there.
