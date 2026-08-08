# Bruno 2.0 WebSocket server

Powers **Visitor Notes (whispers)**, cookies counter, altar count, and circuit leaderboard for the crew folios.

## Local run

```bash
cd server
npm install
npm run dev
```

Health: http://localhost:8787/health  
Socket: `ws://localhost:8787`

Then in `folio-dax-patel/.env` (and Samir later):

```env
VITE_SERVER_URL=ws://localhost:8787
VITE_WHISPERS_COUNT=30
```

Restart `npm run dev` in the folio folder after changing `.env`.

## Deploy (Railway / Render / Fly)

1. Deploy this `server/` folder as a Node service
2. Set `PORT` (platform usually provides it)
3. Optional: `MAX_WHISPERS=30`, `MAX_WHISPER_CHARS=30`
4. Use the public **WSS** URL in folio env, e.g. `VITE_SERVER_URL=wss://your-app.up.railway.app`

Persist `data/store.json` with a volume if you want notes to survive restarts.

## Protocol

Binary **MessagePack** WebSocket frames (same as the folio client).

- Client → `whispersInsert` `{ uuid, message, countryCode, x, y, z }`
- Server → `init` / `whispersInsert` / `whispersDelete`
- Also stubs: cookies, cataclysm, circuit leaderboard
