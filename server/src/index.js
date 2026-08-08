import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import msgpack from 'msgpack-lite'
import { v4 as uuidv4 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.join(__dirname, '..', 'data', 'store.json')
const PORT = Number(process.env.PORT || 8787)
const MAX_WHISPERS = Number(process.env.MAX_WHISPERS || 30)
const MAX_CHARS = Number(process.env.MAX_WHISPER_CHARS || 30)

/** Lightweight blocklist — expand as needed */
const BLOCKED = [
  /\b(nazi|kill\s*yourself|kys)\b/i,
]

const defaultStore = () => ({
  whispers: [
    {
      id: uuidv4(),
      uuid: 'seed',
      message: 'Welcome to the Guest Wall',
      countrycode: '',
      x: 0, y: 0.15, z: 0,
      createdAt: Date.now(),
    },
    {
      id: uuidv4(),
      uuid: 'seed',
      message: 'Be kind. Leave light.',
      countrycode: '',
      x: 0.4, y: 0.15, z: 0.2,
      createdAt: Date.now(),
    },
  ],
  cookiesCount: 0,
  cataclysmCount: 0,
  cataclysmProgress: 0,
  cataclysmRunning: false,
  circuitLeaderboard: [],
  circuitResetTime: Date.now() + 1000 * 60 * 60 * 24 * 7,
  easterEggs: [],
})

function loadStore()
{
  try
  {
    if(fs.existsSync(DATA_PATH))
      return { ...defaultStore(), ...JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) }
  }
  catch(error)
  {
    console.warn('[store] failed to load, using defaults', error.message)
  }
  return defaultStore()
}

function saveStore()
{
  try
  {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2))
  }
  catch(error)
  {
    console.warn('[store] failed to save', error.message)
  }
}

let store = loadStore()
const clients = new Set()

function encode(data)
{
  return msgpack.encode(data)
}

function decode(buffer)
{
  return msgpack.decode(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer))
}

function sanitizeMessage(raw)
{
  let text = String(raw ?? '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS)

  if(!text)
    return null

  for(const re of BLOCKED)
  {
    if(re.test(text))
      return null
  }

  return text
}

function publicWhispers()
{
  return store.whispers.map(({ id, message, countrycode, x, y, z }) => ({
    id,
    message,
    countrycode: countrycode || '',
    x: Number(x) || 0,
    y: Number(y) || 0,
    z: Number(z) || 0,
  }))
}

/** Client CircuitArea expects [tag, countrycode, durationMs] tuples */
function publicCircuitLeaderboard()
{
  return store.circuitLeaderboard.map((e) => [
    e.tag,
    e.countrycode || '',
    e.duration,
  ])
}

function initPayload()
{
  return {
    type: 'init',
    whispers: publicWhispers(),
    cookiesCount: store.cookiesCount,
    cataclysmCount: store.cataclysmCount,
    cataclysmProgress: store.cataclysmProgress,
    cataclysmRunning: store.cataclysmRunning,
    circuitLeaderboard: publicCircuitLeaderboard(),
    circuitResetTime: store.circuitResetTime,
    easterEggs: store.easterEggs,
  }
}

function broadcast(data, except = null)
{
  const packet = encode(data)
  for(const client of clients)
  {
    if(client !== except && client.readyState === 1)
      client.send(packet)
  }
}

function handleWhispersInsert(ws, msg)
{
  const message = sanitizeMessage(msg.message)
  if(!message || !msg.uuid)
    return

  const countrycode = String(msg.countryCode || msg.countrycode || '').slice(0, 8)
  const x = Number(msg.x) || 0
  const y = Number(msg.y) || 0
  const z = Number(msg.z) || 0

  // One whisper per visitor uuid — replace previous
  const previous = store.whispers.filter((w) => w.uuid === msg.uuid)
  if(previous.length)
  {
    store.whispers = store.whispers.filter((w) => w.uuid !== msg.uuid)
    broadcast({
      type: 'whispersDelete',
      whispers: previous.map(({ id }) => ({ id })),
    })
  }

  const whisper = {
    id: uuidv4(),
    uuid: msg.uuid,
    message,
    countrycode,
    x, y, z,
    createdAt: Date.now(),
  }

  store.whispers.unshift(whisper)

  // FIFO cap
  const overflow = store.whispers.slice(MAX_WHISPERS)
  store.whispers = store.whispers.slice(0, MAX_WHISPERS)
  if(overflow.length)
  {
    broadcast({
      type: 'whispersDelete',
      whispers: overflow.map(({ id }) => ({ id })),
    })
  }

  saveStore()
  broadcast({
    type: 'whispersInsert',
    whispers: [ {
      id: whisper.id,
      message: whisper.message,
      countrycode: whisper.countrycode,
      x: whisper.x,
      y: whisper.y,
      z: whisper.z,
    } ],
  })

  console.log(`[whisper] "${whisper.message}" @ (${x.toFixed(1)}, ${z.toFixed(1)})`)
}

function handleCookiesInsert(msg)
{
  const amount = Math.max(0, Math.min(1000, Number(msg.amount) || 0))
  if(!amount)
    return
  store.cookiesCount += amount
  saveStore()
  broadcast({ type: 'cookiesUpdate', cookiesCount: store.cookiesCount })
}

function handleCataclysmInsert()
{
  store.cataclysmCount += 1
  store.cataclysmProgress = Math.min(1, store.cataclysmProgress + 0.002)
  saveStore()
  broadcast({
    type: 'cataclysmUpdate',
    cataclysmCount: store.cataclysmCount,
    cataclysmProgress: store.cataclysmProgress,
    cataclysmRunning: store.cataclysmRunning,
  })
}

function handleCircuitInsert(msg)
{
  if(!msg.uuid || !msg.tag || typeof msg.duration !== 'number')
    return

  const entry = {
    id: uuidv4(),
    uuid: msg.uuid,
    tag: String(msg.tag).slice(0, 3).toUpperCase(),
    countrycode: String(msg.countryCode || msg.countrycode || '').slice(0, 8),
    duration: Math.max(0, Math.round(msg.duration)),
    checkpointTimings: Array.isArray(msg.checkpointTimings) ? msg.checkpointTimings : [],
    createdAt: Date.now(),
  }

  // Keep best time per uuid
  store.circuitLeaderboard = store.circuitLeaderboard.filter((e) => e.uuid !== msg.uuid)
  store.circuitLeaderboard.push(entry)
  store.circuitLeaderboard.sort((a, b) => a.duration - b.duration)
  store.circuitLeaderboard = store.circuitLeaderboard.slice(0, 50)
  saveStore()
  broadcast({ type: 'circuitUpdate', circuitLeaderboard: publicCircuitLeaderboard() })
}

function onMessage(ws, raw)
{
  let msg
  try
  {
    msg = decode(raw)
  }
  catch
  {
    return
  }

  if(!msg || typeof msg.type !== 'string')
    return

  switch(msg.type)
  {
    case 'whispersInsert':
      handleWhispersInsert(ws, msg)
      break
    case 'cookiesInsert':
      handleCookiesInsert(msg)
      break
    case 'cataclysmInsert':
      handleCataclysmInsert()
      break
    case 'circuitInsert':
      handleCircuitInsert(msg)
      break
    default:
      break
  }
}

const server = http.createServer((req, res) =>
{
  if(req.url === '/health')
  {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      ok: true,
      whispers: store.whispers.length,
      clients: clients.size,
    }))
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Bruno 2.0 WebSocket server — connect via ws://')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) =>
{
  clients.add(ws)
  ws.send(encode(initPayload()))
  console.log(`[ws] connected (${clients.size} online)`)

  ws.on('message', (data) => onMessage(ws, data))
  ws.on('close', () =>
  {
    clients.delete(ws)
    console.log(`[ws] disconnected (${clients.size} online)`)
  })
  ws.on('error', () => clients.delete(ws))
})

server.listen(PORT, () =>
{
  console.log(`Bruno 2.0 server listening on ws://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Set folio .env → VITE_SERVER_URL=ws://localhost:${PORT}`)
})
