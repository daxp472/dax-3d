/**
 * Race NPC tests — linear track (no rail bulge) + speed + snap-back guards.
 * Run: npm run test:race-npc
 */
import assert from 'node:assert/strict'
import {
    wrapArc,
    forwardDelta,
    advanceArc,
    computeSpeedTier,
    obstacleCapFromDistance,
    dodgeOffsetForObstacle,
    cruiseForLap,
    NPC_CHASSIS_Y,
    NPC_WHEEL_Y,
    LANE_HALF,
    tireBottomY,
    chassisYForRoad,
    signedLateralOffset,
    buildLinearTrackPoints,
    maxPolylineDeviation,
    buildDrivingLaneWaypoints,
    gateAxisFromCheckpoint,
    obstaclePositionAt,
    rankRacers,
} from '../sources/Game/World/Areas/raceNpcMath.js'

let passed = 0
let failed = 0

function test(name, fn)
{
    try
    {
        fn()
        passed++
        console.log(`  ✓ ${name}`)
    }
    catch(error)
    {
        failed++
        console.error(`  ✗ ${name}`)
        console.error(`    ${error.message}`)
    }
}

console.log('\nNPC rival — linear track / no rail bulge\n')

test('LINEAR path never leaves polyline (unlike Catmull bulge)', () =>
{
    // L-track: Catmull would cut outside; linear must stay on segments
    const waypoints = [
        { x: 0, z: 0 },
        { x: 30, z: 0 },
        { x: 30, z: 30 },
        { x: 0, z: 30 },
    ]
    const points = buildLinearTrackPoints(waypoints, 0.35)
    const maxD = maxPolylineDeviation(points, waypoints)
    assert.ok(maxD < 1e-6, `deviation ${maxD} must be ~0`)
})

test('corner sample stays at outer waypoint corridor (x≈30), not shortcut', () =>
{
    const waypoints = [
        { x: 0, z: 0 },
        { x: 30, z: 0 },
        { x: 30, z: 30 },
        { x: 0, z: 30 },
    ]
    const points = buildLinearTrackPoints(waypoints, 0.35)
    // Find nearest to (30, 15)
    let best = points[0]
    let bestD = Infinity
    for(const p of points)
    {
        const d = Math.hypot(p.x - 30, p.z - 15)
        if(d < bestD)
        {
            bestD = d
            best = p
        }
    }
    assert.ok(Math.abs(best.x - 30) < 0.01, `must stay on x=30 wall, got x=${best.x}`)
    // Shortcut (15,15) must be far from path
    let shortcutD = Infinity
    for(const p of points)
        shortcutD = Math.min(shortcutD, Math.hypot(p.x - 15, p.z - 15))
    assert.ok(shortcutD > 10, `shortcut should be far, got ${shortcutD}`)
})

test('LANE_HALF allows side grid + dodge', () =>
{
    assert.ok(LANE_HALF >= 1.2 && LANE_HALF <= 2.5)
})

test('no snap-back: 600 frames forward-only', () =>
{
    const total = 250
    let s = 5
    let prev = s
    for(let i = 0; i < 600; i++)
    {
        s = advanceArc(s, 5.5 / 60, total)
        assert.ok(forwardDelta(prev, s, total) >= 0, `rewind ${i}`)
        prev = s
    }
})

test('project-behind must not count as forward', () =>
{
    assert.equal(forwardDelta(40, 28, 100), 0)
})

test('driving lane uses respawn points not gate centers', () =>
{
    const checkpoints = {
        items: [
            {
                respawnPosition: { x: 10, y: 4, z: 5 },
                center: { x: 13, y: 5 },
            },
            {
                respawnPosition: { x: 20, y: 4, z: 15 },
                center: { x: 23, y: 15 },
            },
        ],
    }
    const start = { position: { x: 0, z: 0 } }
    const lane = buildDrivingLaneWaypoints(checkpoints, start)
    assert.equal(lane.length, 3)
    assert.equal(lane[1].x, 10)
    assert.equal(lane[1].z, 5)
})

test('obstacle oscillates on gate axis not world Z only', () =>
{
    const cp = {
        a: { x: 0, y: 0 },
        b: { x: 10, y: 0 },
    }
    const axis = gateAxisFromCheckpoint(cp)
    assert.ok(Math.abs(axis.x) > 0.99)

    const base = { x: 5, y: 1, z: 5 }
    const at0 = obstaclePositionAt(base, axis, 0, 0)
    assert.equal(at0.x, 5)
    assert.equal(at0.z, 5)

    const atPeak = obstaclePositionAt(base, axis, Math.PI * 0.5 / 1.25, 0)
    assert.ok(Math.abs(atPeak.x - 5) > 4)
})

test('speed: cruise aims ~85s lap, obstacles cut hard', () =>
{
    const cruise = cruiseForLap(773, 85)
    assert.ok(cruise > 8 && cruise < 10)

    const base = {
        turnAhead: 0,
        gap: 0,
        straightSpeed: cruise * 1.15,
        cruiseSpeed: cruise,
        cornerSpeed: cruise * 0.72,
        obstacleSpeed: cruise * 0.38,
        maxSpeed: cruise * 1.28,
    }
    const straight = computeSpeedTier({ ...base, bend: 0.02, obstacleAhead: null })
    const obs = computeSpeedTier({ ...base, bend: 0.02, obstacleAhead: cruise * 0.2 })
    assert.ok(straight >= cruise)
    assert.ok(obs < cruise * 0.5)
})

test('obstacleCap + dodge', () =>
{
    assert.equal(obstacleCapFromDistance(null, 3, 6), null)
    assert.ok(obstacleCapFromDistance(2, 3, 6) < 3)
    const dodge = dodgeOffsetForObstacle({ ahead: 6, lateral: 0.2 })
    assert.ok(Math.abs(dodge) > 0.2)
    assert.equal(dodgeOffsetForObstacle({ ahead: 30, lateral: 0 }), 0)
})

test('tires on road', () =>
{
    const restingChassis = chassisYForRoad()
    const b = tireBottomY(restingChassis, NPC_WHEEL_Y)
    assert.ok(b > -0.02 && b < 0.2, `tire bottom ${b} should sit on road`)
    assert.ok(NPC_CHASSIS_Y >= 1.0 && NPC_CHASSIS_Y <= 1.2, `chassis ${NPC_CHASSIS_Y}`)
    assert.ok(NPC_WHEEL_Y <= -0.5 && NPC_WHEEL_Y >= -0.85, `wheelY ${NPC_WHEEL_Y}`)
})

test('signed lateral + dodge picks opposite side', () =>
{
    // Point to the right of +X tangent → positive lateral
    assert.ok(signedLateralOffset(0, 0, 0, 2, 1, 0) > 0)
    assert.ok(signedLateralOffset(0, 0, 0, -2, 1, 0) < 0)

    const rightCrate = dodgeOffsetForObstacle({ ahead: 6, lateral: 0.3 })
    const leftCrate = dodgeOffsetForObstacle({ ahead: 6, lateral: -0.3 })
    assert.ok(rightCrate < 0, 'dodge left when crate on right')
    assert.ok(leftCrate > 0, 'dodge right when crate on left')
    assert.notEqual(Math.sign(rightCrate), Math.sign(leftCrate))
})

test('wrapArc', () =>
{
    assert.equal(wrapArc(-1, 10), 9)
})

test('rankRacers: 3-way standings player vs 2 rivals', () =>
{
    const { playerPlace } = rankRacers(
        { reachedCount: 3, s: 250, finished: false },
        [
            { id: 'a', reachedCount: 4, s: 80, finished: false },
            { id: 'b', reachedCount: 3, s: 200, finished: false },
        ]
    )
    assert.equal(playerPlace, 2)

    const win = rankRacers(
        { reachedCount: 10, s: 900, finished: true, finishTime: 45 },
        [
            { id: 'a', reachedCount: 10, s: 900, finished: true, finishTime: 50 },
            { id: 'b', reachedCount: 8, s: 700, finished: false },
        ]
    )
    assert.equal(win.playerPlace, 1)
})

test('rankRacers: player last when both rivals ahead', () =>
{
    const { playerPlace } = rankRacers(
        { reachedCount: 2, s: 50, finished: false },
        [
            { id: 'a', reachedCount: 5, s: 300, finished: false },
            { id: 'b', reachedCount: 4, s: 250, finished: false },
        ]
    )
    assert.equal(playerPlace, 3)
})

test('merged player racing line is dense world path', async () =>
{
    const fs = await import('node:fs')
    const path = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const jsonPath = path.join(__dirname, '../sources/data/playerRacingLine.json')
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

    assert.ok(data.points.length > 200, 'need dense merged lap')
    assert.equal(data.coordinateSpace, 'world')
    assert.ok(data.lapLength > 400, 'lap should be hundreds of meters')
    assert.ok(data.sources?.length >= 4, 'merged from 4 dumps')
})

test('baked circuit track path exists and is on-road validated', async () =>
{
    const fs = await import('node:fs')
    const path = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const jsonPath = path.join(__dirname, '../sources/data/circuitTrackPath.json')
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

    assert.ok(data.points.length > 100, 'need dense lap path')
    assert.equal(data.stats.offRoadRemaining, 0, 'all points must be on road')
    assert.ok(data.stats.lapLength > 500, 'lap should be hundreds of meters')
    assert.ok(data.checkpoints.length >= 8, 'full checkpoint set')
})

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed ? 1 : 0)
