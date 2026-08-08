/**
 * Pure NPC race math — no Game / Three scene deps (safe for Node tests).
 */

/**
 * Resting stance — mirror player PhysicsVehicle + VisualVehicle on flat road:
 * chassis ≈ 1.08, wheel container Y ≈ -0.68, radius 0.4 → tire bottom ≈ 0.
 */
export const NPC_ROAD_Y = 0
export const NPC_WHEEL_RADIUS = 0.4
/** Match VisualVehicle resting: baseY(0) - suspensionLength (~0.68), capped ≤ -0.5 */
export const NPC_WHEEL_Y = -0.68
/** road + radius - wheelLocalY */
export const NPC_CHASSIS_Y = NPC_ROAD_Y + NPC_WHEEL_RADIUS - NPC_WHEEL_Y
export const LANE_HALF = 1.6

/** Target lap window (seconds) for ~770m player-recorded line. */
export const TARGET_LAP_SEC_MIN = 80
export const TARGET_LAP_SEC_MAX = 100
/** Slightly quicker pack — still inside 80–100s, not full blast. */
export const TARGET_LAP_SEC = 85

/** Average cruise for a given lap length / target seconds. */
export function cruiseForLap(lapLength, targetSec = TARGET_LAP_SEC)
{
    if(lapLength <= 0 || targetSec <= 0)
        return 8
    return clamp(lapLength / targetSec, 6, 12)
}

/**
 * Chassis Y that keeps tire bottoms on the road for a given wheel local Y.
 * Slight lift (clearance) avoids z-fight / mesh radius > physics radius.
 */
export function chassisYForRoad(wheelY = NPC_WHEEL_Y, radius = NPC_WHEEL_RADIUS, roadY = NPC_ROAD_Y, clearance = 0.06)
{
    return roadY + radius - wheelY + clearance
}

/**
 * Point-to-segment distance (XZ). Used to prove linear path stays on polyline.
 */
export function pointToSegmentDistance(px, pz, ax, az, bx, bz)
{
    const sx = bx - ax
    const sz = bz - az
    const lenSq = sx * sx + sz * sz
    if(lenSq < 1e-12)
        return Math.hypot(px - ax, pz - az)
    let t = ((px - ax) * sx + (pz - az) * sz) / lenSq
    t = clamp(t, 0, 1)
    return Math.hypot(px - (ax + sx * t), pz - (az + sz * t))
}

/**
 * Build linear densified path (same algorithm as RacingLine) for tests.
 */
export function buildLinearTrackPoints(waypoints, step = 0.35)
{
    if(waypoints.length < 2)
        return []
    const closed = [ ...waypoints ]
    if(
        closed[0].x !== closed[closed.length - 1].x
        || closed[0].z !== closed[closed.length - 1].z
    )
        closed.push({ ...closed[0] })

    const points = []
    for(let i = 0; i < closed.length - 1; i++)
    {
        const a = closed[i]
        const b = closed[i + 1]
        const dist = Math.hypot(b.x - a.x, b.z - a.z)
        const steps = Math.max(1, Math.ceil(dist / step))
        for(let s = 0; s < steps; s++)
        {
            const u = s / steps
            points.push({
                x: a.x + (b.x - a.x) * u,
                z: a.z + (b.z - a.z) * u,
            })
        }
    }
    points.push({ ...closed[closed.length - 1] })
    return points
}

/** Gate bar direction (across track) — same axis moving crates use. */
export function gateAxisFromCheckpoint(checkpoint)
{
    const gx = checkpoint.b.x - checkpoint.a.x
    const gz = checkpoint.b.y - checkpoint.a.y
    const len = Math.hypot(gx, gz) || 1
    return { x: gx / len, z: gz / len }
}

/** Oscillating crate position — shared by player physics + NPC prediction. */
export function obstaclePositionAt(basePosition, gateAxis, elapsedTime, osciliationOffset)
{
    const osc = Math.sin(elapsedTime * 1.25 + osciliationOffset) * 5
    return {
        x: basePosition.x + gateAxis.x * osc,
        y: basePosition.y,
        z: basePosition.z + gateAxis.z * osc,
    }
}

/**
 * Player driving lane = respawn points (on-road), not gate centers near rails.
 */
export function buildDrivingLaneWaypoints(checkpoints, startPosition)
{
    const waypoints = []
    if(startPosition?.position)
    {
        waypoints.push({
            x: startPosition.position.x,
            z: startPosition.position.z,
        })
    }

    for(const cp of checkpoints?.items ?? [])
    {
        waypoints.push({
            x: cp.respawnPosition.x,
            z: cp.respawnPosition.z,
        })
    }

    return waypoints
}

export function maxPolylineDeviation(points, waypoints)
{
    let maxD = 0
    const closed = [ ...waypoints ]
    if(
        closed[0].x !== closed[closed.length - 1].x
        || closed[0].z !== closed[closed.length - 1].z
    )
        closed.push({ ...closed[0] })

    for(const p of points)
    {
        let best = Infinity
        for(let i = 0; i < closed.length - 1; i++)
        {
            const a = closed[i]
            const b = closed[i + 1]
            best = Math.min(best, pointToSegmentDistance(p.x, p.z, a.x, a.z, b.x, b.z))
        }
        maxD = Math.max(maxD, best)
    }
    return maxD
}

export function wrapArc(s, total)
{
    if(total <= 0)
        return 0
    return ((s % total) + total) % total
}

/** Forward-only delta on a loop. Huge wraps treated as non-forward (wrong nearest). */
export function forwardDelta(fromS, toS, total)
{
    let d = toS - fromS
    if(d < 0)
        d += total
    if(d > total * 0.5)
        return 0
    return d
}

export function advanceArc(s, step, total)
{
    return wrapArc(s + Math.max(0, step), total)
}

export function lerp(a, b, t)
{
    return a + (b - a) * Math.min(1, Math.max(0, t))
}

export function clamp(v, min, max)
{
    return Math.max(min, Math.min(max, v))
}

export function computeSpeedTier({
    bend,
    turnAhead,
    obstacleAhead,
    gap,
    straightSpeed,
    cruiseSpeed,
    cornerSpeed,
    obstacleSpeed,
    maxSpeed,
})
{
    let target
    if(bend < 0.06)
        target = straightSpeed
    else if(bend < 0.18)
        target = lerp(cruiseSpeed, cornerSpeed, (bend - 0.06) / 0.12)
    else
        target = lerp(cornerSpeed, obstacleSpeed, Math.min(1, (bend - 0.18) / 0.4))

    // Earlier turn-in brake so pack doesn't plow corners
    if(turnAhead > 0.35)
        target = Math.min(target, lerp(cruiseSpeed, cornerSpeed, Math.min(1, (turnAhead - 0.35) / 0.7)))
    if(turnAhead > 0.7)
        target = Math.min(target, lerp(cornerSpeed, obstacleSpeed, Math.min(1, (turnAhead - 0.7) / 0.6)))

    if(obstacleAhead !== null && obstacleAhead !== undefined)
        target = Math.min(target, obstacleAhead)

    if(gap >= 2)
        target = Math.min(maxSpeed, target * 1.05)
    else if(gap <= -2)
        target *= 0.9

    return clamp(target, obstacleSpeed * 0.8, maxSpeed)
}

export function obstacleCapFromDistance(ahead, obstacleSpeed, cornerSpeed)
{
    if(ahead === null || ahead === Infinity)
        return null
    if(ahead < 0.4 || ahead > 24)
        return null
    if(ahead < 3.5)
        return obstacleSpeed * 0.5
    if(ahead < 8)
        return lerp(obstacleSpeed * 0.5, obstacleSpeed, (ahead - 3.5) / 4.5)
    if(ahead < 16)
        return lerp(obstacleSpeed, cornerSpeed, (ahead - 8) / 8)
    return null
}

/**
 * Signed lateral dodge when a crate sits on the racing line ahead.
 * `lateral` must be signed (path-right positive). Returns lane offset meters.
 */
export function dodgeOffsetForObstacle({ ahead, lateral, look = 18, maxDodge = 1.45 })
{
    if(ahead === null || ahead === undefined || ahead <= 0 || ahead > look)
        return 0

    const absLat = Math.abs(lateral)
    // Far off the line already — no dodge needed
    if(absLat > 3.0)
        return 0
    // Clear of crate width — keep current lane
    if(absLat > 1.25)
        return 0

    const urgency = clamp(1 - ahead / look, 0, 1)
    // Soften when already slightly off-center
    const need = clamp(1 - absLat / 1.25, 0.25, 1)
    const side = lateral >= 0 ? -1 : 1 // opposite side of crate
    return side * maxDodge * urgency * need
}

/**
 * 2D cross (tx,tz) × (dx,dz) — positive = point is to the right of tangent.
 */
export function signedLateralOffset(px, pz, ox, oz, tx, tz)
{
    return tx * (oz - pz) - tz * (ox - px)
}

/** Tire bottom world Y — must be near road (small positive), not deep negative. */
export function tireBottomY(chassisY = NPC_CHASSIS_Y, wheelY = NPC_WHEEL_Y, radius = NPC_WHEEL_RADIUS)
{
    return chassisY + wheelY - radius
}

/**
 * Rank player + NPC rivals for live/finish standings.
 * Finished racers sort by time; running racers by checkpoints then arc progress.
 */
export function rankRacers(player, rivals = [])
{
    const entries = [
        { key: 'player', ...player },
        ...rivals.map((rival) => ({ key: rival.id, ...rival })),
    ]

    entries.sort((a, b) =>
    {
        if(a.finished && b.finished)
            return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity)
        if(a.finished)
            return -1
        if(b.finished)
            return 1
        if(a.reachedCount !== b.reachedCount)
            return b.reachedCount - a.reachedCount
        return (b.s ?? 0) - (a.s ?? 0)
    })

    return {
        order: entries.map((entry) => entry.key),
        playerPlace: Math.max(1, entries.findIndex((entry) => entry.key === 'player') + 1),
    }
}
