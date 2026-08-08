/**
 * Pure NPC race math — no Game / Three scene deps (safe for Node tests).
 */

export const NPC_CHASSIS_Y = 0.88
export const LANE_HALF = 0
export const NPC_WHEEL_Y = -0.38
export const NPC_WHEEL_RADIUS = 0.4

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
    if(bend < 0.08)
        target = straightSpeed
    else if(bend < 0.22)
        target = lerp(cruiseSpeed, cornerSpeed, (bend - 0.08) / 0.14)
    else
        target = lerp(cornerSpeed, obstacleSpeed, Math.min(1, (bend - 0.22) / 0.35))

    if(turnAhead > 0.45)
        target = Math.min(target, lerp(cornerSpeed, obstacleSpeed, Math.min(1, (turnAhead - 0.45) / 0.9)))

    if(obstacleAhead !== null && obstacleAhead !== undefined)
        target = Math.min(target, obstacleAhead)

    if(gap >= 2)
        target = Math.min(maxSpeed, target * 1.06)
    else if(gap <= -2)
        target *= 0.92

    return clamp(target, obstacleSpeed * 0.85, maxSpeed)
}

export function obstacleCapFromDistance(ahead, obstacleSpeed, cornerSpeed)
{
    if(ahead === null || ahead === Infinity)
        return null
    if(ahead < 0.5 || ahead > 16)
        return null
    if(ahead < 3.5)
        return obstacleSpeed
    if(ahead < 9)
        return lerp(obstacleSpeed, cornerSpeed, (ahead - 3.5) / 5.5)
    return null
}

/** Tire bottom world Y — must be near 0, not deep negative. */
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
