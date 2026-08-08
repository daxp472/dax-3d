# Bruno 2.0 — Crew Folios

Interactive WebGPU / Three.js portfolios built as an upgraded spiritual successor to Bruno Simon’s folio — **not a claim on Bruno’s work**, but our own branded builds with new gameplay systems (Letter Builder caretaker, social props, content, and more).

| Folder | Who | Run |
|---|---|---|
| [`folio-dax-patel/`](./folio-dax-patel) | **Dax Patel** | `cd folio-dax-patel && npm install && npm run dev` |
| [`folio-samir-singh/`](./folio-samir-singh) | **Samir Singh** | `cd folio-samir-singh && npm install && npm run dev` |

## Live links

**Dax**
- Site: https://dax-patel.in
- GitHub: https://github.com/daxp472
- LinkedIn: https://www.linkedin.com/in/dax-cg/

**Samir**
- Site: https://samirsir-portfolio.vercel.app
- LinkedIn: https://www.linkedin.com/in/kshatriya-samir-singh/

## Contributors

This is a **crew project**. Contributions and credits:

| Name | Role |
|---|---|
| **Dax Patel** | Creator / Dax folio lead |
| **Samir Singh** | Creator / Samir folio lead |
| **Friends & collaborators** | Features, feedback, shipping |
| **Cursor Agent** | Pair-programming co-pilot on systems & polish |

Want to contribute? Open a PR against this repo. Keep each folio’s identity intact (`folio-dax-patel` vs `folio-samir-singh`).

## License & credit (important)

See [`LICENSE`](./LICENSE).

**Short version:**
- You **can** clone, study, remix, and build add-ons.
- You **must** keep attribution (this project + Bruno Simon as the original folio inspiration).
- You **must not** pretend you alone created this project or strip credits and claim it as your original portfolio engine.

Inspired by [Bruno Simon — folio-2025](https://github.com/brunosimon/folio-2025). Bruno owns his original work; we own our modifications, branding, and new systems.

## Dev notes

- Each folio is a **separate Vite app** with its own `package.json`.
- **Whispers / Guest Wall backend** lives in [`server/`](./server) — run it before testing multiplayer notes:

```bash
cd server && npm install && npm run dev
# then in folio-dax-patel/.env
# VITE_SERVER_URL=ws://localhost:8787
cd folio-dax-patel && npm run dev
```

- Copy `.env` from `.env.example` inside the folio folder if needed.
- Prefer `npm install --force` if peer dependency noise appears (Three / WebGPU toolchain).
- Deploy `server/` to Railway/Render/Fly and set `VITE_SERVER_URL=wss://your-host` for production.
