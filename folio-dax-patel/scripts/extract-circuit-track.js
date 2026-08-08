/**
 * Extract full circuit lap from areas.glb:
 * - Start + checkpoint respawn lane (player driving line)
 * - Road cuboid midpoints between gates (no corner cuts)
 * - Snap + validate every sample is on drivable asphalt
 *
 * Run: npm run extract:circuit-track
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { buildLinearTrackPoints } from '../sources/Game/World/Areas/raceNpcMath.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const GLB = path.join(ROOT, 'static/areas/areas.glb')
const OUT = path.join(ROOT, 'sources/data/circuitTrackPath.json')

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

function findNode(root, name)
{
    for(const n of root.listNodes())
        if(n.getName() === name)
            return n
    return null
}

function localPos(node)
{
    const t = node.getTranslation()
    return { x: t[0], y: t[1], z: t[2] }
}

function rotY(node)
{
    const q = node.getRotation()
    return Math.atan2(
        2 * (q[3] * q[1] + q[0] * q[2]),
        1 - 2 * (q[1] * q[1] + q[2] * q[2])
    )
}

function worldPos(node)
{
    const m = node.getWorldMatrix()
    return { x: m[12], y: m[13], z: m[14] }
}

function distAlong(a, b, p)
{
    const sx = b.x - a.x
    const sz = b.z - a.z
    const len2 = sx * sx + sz * sz || 1
    let t = ((p.x - a.x) * sx + (p.z - a.z) * sz) / len2
    t = Math.max(0, Math.min(1, t))
    return {
        t,
        d: Math.hypot(p.x - (a.x + sx * t), p.z - (a.z + sz * t)),
        along: t * Math.sqrt(len2),
    }
}

async function main()
{
    const doc = await io.read(GLB)
    const root = doc.getRoot()

    const circuitNode = findNode(root, 'circuit')
    const circuitWorld = circuitNode ? worldPos(circuitNode) : { x: 0, y: 0, z: 0 }

    const startLocal = localPos(findNode(root, 'refStart'))

    const checkpoints = []
    for(const node of root.listNodes())
    {
        if(!/^refCheckpoints\./.test(node.getName()))
            continue

        const pos = localPos(node)
        const rot = rotY(node)
        const scale = node.getScale()[0] * 0.5

        checkpoints.push({
            name: node.getName(),
            gate: { x: pos.x, z: pos.z },
            rotation: rot,
            scale,
            respawn: {
                x: pos.x + 3 * Math.sin(rot),
                z: pos.z + 3 * Math.cos(rot),
            },
        })
    }
    checkpoints.sort((a, b) => a.name.localeCompare(b.name))

    const roadNode = findNode(root, 'refRoadPhysicalFixed')
    const cuboids = roadNode.listChildren()
        .filter((c) => /^cuboid/i.test(c.getName()))
        .map((c) =>
        {
            const p = localPos(c)
            const s = c.getScale()
            return {
                name: c.getName(),
                x: p.x,
                z: p.z,
                hx: s[0] * 0.5,
                hz: s[2] * 0.5,
            }
        })

    const ROAD_INSET = 1.2

    function inRoad(x, z)
    {
        for(const b of cuboids)
        {
            if(
                x >= b.x - b.hx + ROAD_INSET
                && x <= b.x + b.hx - ROAD_INSET
                && z >= b.z - b.hz + ROAD_INSET
                && z <= b.z + b.hz - ROAD_INSET
            )
                return true
        }
        return false
    }

    function snapToRoad(x, z)
    {
        let best = null
        let bestD = Infinity
        for(const b of cuboids)
        {
            const minX = b.x - b.hx + ROAD_INSET
            const maxX = b.x + b.hx - ROAD_INSET
            const minZ = b.z - b.hz + ROAD_INSET
            const maxZ = b.z + b.hz - ROAD_INSET
            if(maxX <= minX || maxZ <= minZ)
                continue

            const cx = Math.max(minX, Math.min(x, maxX))
            const cz = Math.max(minZ, Math.min(z, maxZ))
            const d = Math.hypot(x - cx, z - cz)
            if(d < bestD)
            {
                bestD = d
                best = { x: cx, z: cz }
            }
        }
        return best || { x, z }
    }

    // Rich waypoints: start → cuboids between gates → respawn at each gate → loop
    const metaWaypoints = [ { x: startLocal.x, z: startLocal.z, type: 'start' } ]
    const gateNodes = [
        { x: startLocal.x, z: startLocal.z },
        ...checkpoints.map((c) => c.gate),
        { x: startLocal.x, z: startLocal.z },
    ]

    for(let i = 0; i < gateNodes.length - 1; i++)
    {
        const a = gateNodes[i]
        const b = gateNodes[i + 1]

        const mids = cuboids
            .map((c) => ({ ...c, ...distAlong(a, b, c) }))
            .filter((c) => c.t > 0.05 && c.t < 0.95 && c.d < Math.max(c.hx, c.hz) + 2)
            .sort((p, q) => p.along - q.along)

        for(const m of mids)
            metaWaypoints.push({ x: m.x, z: m.z, type: 'roadCuboid' })

        if(i < checkpoints.length)
        {
            metaWaypoints.push({
                x: checkpoints[i].respawn.x,
                z: checkpoints[i].respawn.z,
                type: 'respawn',
                checkpoint: checkpoints[i].name,
            })
        }
    }

    const lane = metaWaypoints.map((p) => ({ x: p.x, z: p.z }))
    lane.push({ x: startLocal.x, z: startLocal.z })

    const raw = buildLinearTrackPoints(lane, 0.35)
    const points = []
    let snappedCount = 0

    for(const p of raw)
    {
        let x = p.x
        let z = p.z
        if(!inRoad(x, z))
        {
            const s = snapToRoad(x, z)
            x = s.x
            z = s.z
            snappedCount++
        }
        points.push({ x, z })
    }

    // Drop consecutive duplicates after snap
    const deduped = [ points[0] ]
    for(let i = 1; i < points.length; i++)
    {
        const prev = deduped[deduped.length - 1]
        if(Math.hypot(points[i].x - prev.x, points[i].z - prev.z) > 0.001)
            deduped.push(points[i])
    }

    const offRoad = deduped.filter((p) => !inRoad(p.x, p.z)).length

    // Arc lengths for runtime
    const lengths = [ 0 ]
    let total = 0
    for(let i = 1; i < deduped.length; i++)
    {
        total += Math.hypot(deduped[i].x - deduped[i - 1].x, deduped[i].z - deduped[i - 1].z)
        lengths.push(total)
    }

    const payload = {
        generatedAt: new Date().toISOString(),
        source: 'static/areas/areas.glb',
        coordinateSpace: 'circuit-local',
        circuitWorldOffset: circuitWorld,
        stats: {
            checkpointCount: checkpoints.length,
            roadCuboidCount: cuboids.length,
            waypointCount: metaWaypoints.length,
            pointCount: deduped.length,
            lapLength: round(total),
            snappedCount,
            offRoadRemaining: offRoad,
        },
        checkpoints: checkpoints.map((c) => ({
            name: c.name,
            gate: c.gate,
            respawn: c.respawn,
            rotation: c.rotation,
        })),
        waypoints: metaWaypoints,
        points: deduped,
        lengths: lengths.map((v) => Math.round(v * 100) / 100),
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))

    console.log('\nCircuit track extracted')
    console.log(`  Points: ${deduped.length}`)
    console.log(`  Lap length: ${round(total)}m`)
    console.log(`  Snapped to road: ${snappedCount}`)
    console.log(`  Off-road remaining: ${offRoad}`)
    console.log(`  Written: ${OUT}\n`)

    if(offRoad > 0)
    {
        console.error('ERROR: path still has off-road points')
        process.exit(1)
    }
}

function round(v)
{
    return Math.round(v * 10000) / 10000
}

main().catch((err) =>
{
    console.error(err)
    process.exit(1)
})
