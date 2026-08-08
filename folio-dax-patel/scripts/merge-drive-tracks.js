/**
 * Merge multiple F3 drive dumps into one racing line (world XZ).
 * Usage: node scripts/merge-drive-tracks.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const IN_DIR = path.join(ROOT, 'resources/track')
const OUT = path.join(ROOT, 'sources/data/playerRacingLine.json')

const PODIUM = { x: -13.671, z: 14.738 }
const STEP = 0.4

function loadDumps()
{
    const files = fs.readdirSync(IN_DIR)
        .filter((f) => /^dummy-track.*\.json$/i.test(f))
        .sort()

    return files.map((file) =>
    {
        const raw = JSON.parse(fs.readFileSync(path.join(IN_DIR, file), 'utf8'))
        return { file, points: stripTeleport(raw.points || []) }
    }).filter((d) => d.points.length > 50)
}

/** Drop finish-overlay teleport to podium. */
function stripTeleport(points)
{
    if(points.length < 2)
        return points

    const out = [ points[0] ]
    for(let i = 1; i < points.length; i++)
    {
        const d = Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)
        const toPodium = Math.hypot(points[i].x - PODIUM.x, points[i].z - PODIUM.z)
        if(d > 8 && toPodium < 1)
            break
        out.push(points[i])
    }
    return out
}

/**
 * Prefer first return near start after enough distance (one lap).
 * If never closes, keep full strip (still useful).
 */
function trimToLap(points)
{
    if(points.length < 10)
        return points

    const start = points[0]
    let traveled = 0
    let bestI = -1
    let bestD = Infinity

    for(let i = 1; i < points.length; i++)
    {
        traveled += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)
        if(traveled < 200)
            continue

        const d = Math.hypot(points[i].x - start.x, points[i].z - start.z)
        if(d < 6 && d < bestD)
        {
            bestD = d
            bestI = i
        }
        if(bestI > 0 && traveled > 400 && d < 4)
            break
    }

    if(bestI > 0)
        return points.slice(0, bestI + 1)
    return points
}

function arcTable(points)
{
    const lengths = [ 0 ]
    let total = 0
    for(let i = 1; i < points.length; i++)
    {
        total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)
        lengths.push(total)
    }
    return { lengths, total: Math.max(total, 1) }
}

function sample(points, lengths, total, s)
{
    s = ((s % total) + total) % total
    let i = 1
    while(i < lengths.length && lengths[i] < s)
        i++
    const i0 = i - 1
    const i1 = Math.min(i, points.length - 1)
    const span = Math.max(1e-6, lengths[i1] - lengths[i0])
    const u = (s - lengths[i0]) / span
    return {
        x: points[i0].x + (points[i1].x - points[i0].x) * u,
        z: points[i0].z + (points[i1].z - points[i0].z) * u,
    }
}

function resample(points, step = STEP)
{
    const { lengths, total } = arcTable(points)
    const out = []
    for(let s = 0; s < total; s += step)
        out.push(sample(points, lengths, total, s))
    out.push(sample(points, lengths, total, total))
    return { points: out, total }
}

function nearestIndex(points, p)
{
    let bestI = 0
    let bestD = Infinity
    for(let i = 0; i < points.length; i++)
    {
        const d = Math.hypot(points[i].x - p.x, points[i].z - p.z)
        if(d < bestD)
        {
            bestD = d
            bestI = i
        }
    }
    return { i: bestI, d: bestD }
}

/**
 * Average dumps onto the longest lap's arc, ignoring outliers > 10m.
 */
function merge(dumps)
{
    const laps = dumps
        .map((d) => ({ file: d.file, ...resample(trimToLap(d.points)) }))
        .sort((a, b) => b.total - a.total)

    const base = laps[0]
    const merged = []
    let usedPairs = 0
    let skipped = 0

    for(let i = 0; i < base.points.length; i++)
    {
        const samples = [ base.points[i] ]
        for(let j = 1; j < laps.length; j++)
        {
            const hit = nearestIndex(laps[j].points, base.points[i])
            if(hit.d <= 10)
            {
                samples.push(laps[j].points[hit.i])
                usedPairs++
            }
            else
            {
                skipped++
            }
        }

        const x = samples.reduce((s, p) => s + p.x, 0) / samples.length
        const z = samples.reduce((s, p) => s + p.z, 0) / samples.length
        merged.push({ x, z })
    }

    // Light 3-point smooth (keeps corners, kills jitter)
    const smooth = merged.map((p, i) =>
    {
        if(i === 0 || i === merged.length - 1)
            return p
        const a = merged[i - 1]
        const b = merged[i + 1]
        return {
            x: (a.x + p.x * 2 + b.x) / 4,
            z: (a.z + p.z * 2 + b.z) / 4,
        }
    })

    // Close loop to start if end is near
    const start = smooth[0]
    const end = smooth[smooth.length - 1]
    if(Math.hypot(end.x - start.x, end.z - start.z) < 12)
        smooth.push({ x: start.x, z: start.z })

    const final = resample(smooth, STEP)

    return {
        sources: laps.map((l) => ({ file: l.file, lapLength: Math.round(l.total * 10) / 10, samples: l.points.length })),
        usedPairs,
        skipped,
        total: final.total,
        points: final.points.map((p) => ({
            x: Math.round(p.x * 1000) / 1000,
            z: Math.round(p.z * 1000) / 1000,
        })),
    }
}

const dumps = loadDumps()
if(dumps.length < 1)
{
    console.error('No dummy-track*.json in resources/track/')
    process.exit(1)
}

const result = merge(dumps)
const payload = {
    generatedAt: new Date().toISOString(),
    source: 'merged-player-drive-records',
    coordinateSpace: 'world',
    minStep: STEP,
    pointCount: result.points.length,
    lapLength: Math.round(result.total * 10) / 10,
    sources: result.sources,
    mergeStats: { usedPairs: result.usedPairs, skippedOutliers: result.skipped },
    points: result.points,
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))

console.log('\nMerged player racing line')
console.log(`  Sources: ${dumps.map((d) => d.file).join(', ')}`)
for(const s of result.sources)
    console.log(`  - ${s.file}: ~${s.lapLength}m`)
console.log(`  Output points: ${result.points.length}`)
console.log(`  Lap length: ${payload.lapLength}m`)
console.log(`  Avg pairs used / outliers skipped: ${result.usedPairs} / ${result.skipped}`)
console.log(`  Written: ${OUT}\n`)

if(dumps.length < 3)
{
    console.log('Tip: 2 more clean laps (dummy-track2.json, dummy-track3.json) will tighten corners a lot.')
}
