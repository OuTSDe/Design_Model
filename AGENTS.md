# Design_Model · instructions for Codex and other agents


**If you were started by the Design Engine to run a job** (the prompt begins "You are the … of the Accord Design Engine" or tells you to work only inside the current folder), ignore this file and do just that job.
1. Read `BRAIN.md` first. It is the curated second brain: the rules, the CRM integration points, the design logic and the file map.
2. Then read `graphify-out/GRAPH_REPORT.md` (the god nodes and communities of the Accord CRM and this app) **before** searching or opening raw files.
   Use `graphify query "<question>"`, `graphify explain "<symbol>"` or `graphify path "A" "B"` (graph: `graphify-out/graph.json`) to find code, and open only the files it points to.
3. Paths in the graph start at `CRM_Application/…` (= `../CRM_Application`) or `Design_Model/…` (= this folder).
4. Build only inside `Design_Model`. Never edit `../CRM_Application` or `../Accord_Data` from here.
5. After changing code, refresh the graph with `graphify update <brain folder>` (see `graphify-out/README.md`), and update `BRAIN.md` when a rule, path or phase changes.
