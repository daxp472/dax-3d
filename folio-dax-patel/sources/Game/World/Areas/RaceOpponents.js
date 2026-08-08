import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { NpcRaceCar } from './NpcRaceCar.js'
import { segmentCircleIntersection, smallestAngle } from '../../utilities/maths.js'
import {
    NPC_CHASSIS_Y,
    wrapArc,
    forwardDelta,
    advanceArc,
    computeSpeedTier,
    obstacleCapFromDistance,
    rankRacers,
} from './raceNpcMath.js'

export {
    NPC_CHASSIS_Y,
    LANE_HALF,
    wrapArc,
    forwardDelta,
    advanceArc,
    computeSpeedTier,
    obstacleCapFromDistance,
    rankRacers,
} from './raceNpcMath.js'

/** Two rivals — different paint + pace so the user gets real competition. */
const RIVAL_PROFILES = [
    {
        id: 'rivalCyan',
        label: 'Cyan',
        paintName: 'npcRivalCyan',
        colorFrom: '#3ecfff',
        colorTo: '#0066aa',
        gridOffset: 3.5,
        straightSpeed: 8.5,
        cruiseSpeed: 7.5,
        cornerSpeed: 4.8,
        obstacleSpeed: 3.2,
        maxSpeed: 9.5,
        accel: 4.0,
        brake: 10.0,
    },
    {
        id: 'rivalMagenta',
        label: 'Magenta',
        paintName: 'npcRivalMagenta',
        colorFrom: '#ff5ec4',
        colorTo: '#9b0066',
        gridOffset: 7,
        straightSpeed: 8.1,
        cruiseSpeed: 7.1,
        cornerSpeed: 4.6,
        obstacleSpeed: 3.1,
        maxSpeed: 9.1,
        accel: 3.6,
        brake: 9.5,
    },
]

/**
 * Full-lap path baked from areas.glb + road cuboid validation.
 * Every point is on drivable asphalt (same envelope as player physics).
 * Regenerate: npm run extract:circuit-track
 */
export class RacingLine
{
    constructor(checkpoints, startPosition)
    {
        this.points = []
        this.lengths = [ 0 ]
        this.tangents = []
        this.curvature = []
        this.total = 1
        this.waypoints = []
        this.source = 'dynamic'
        this.build(checkpoints, startPosition)
    }

    buildFromBaked(bakedTrack)
    {
        this.source = 'baked'
        this.waypoints = (bakedTrack.waypoints ?? []).map((p) => new THREE.Vector3(p.x, 0, p.z))

        this.points = bakedTrack.points.map((p) => new THREE.Vector3(p.x, 0, p.z))

        if(bakedTrack.lengths?.length === this.points.length)
        {
            this.lengths = [ ...bakedTrack.lengths ]
            this.total = Math.max(this.lengths[this.lengths.length - 1], 1)
        }
        else
        {
            this.lengths = [ 0 ]
            let total = 0
            for(let i = 1; i < this.points.length; i++)
            {
                total += this.points[i].distanceTo(this.points[i - 1])
                this.lengths.push(total)
            }
            this.total = Math.max(total, 1)
        }

        this.buildTangentsAndCurvature()
    }

    buildTangentsAndCurvature()
    {
        this.tangents = []
        this.curvature = []
        for(let i = 0; i < this.points.length; i++)
        {
            const i0 = Math.max(0, i - 1)
            const i1 = Math.min(this.points.length - 1, i + 1)
            const t = this.points[i1].clone().sub(this.points[i0])
            if(t.lengthSq() < 1e-8)
                t.set(1, 0, 0)
            else
                t.normalize()
            this.tangents.push(t)

            const look = 6
            const ip = Math.max(0, i - look)
            const inext = Math.min(this.points.length - 1, i + look)
            const tp = this.points[i].clone().sub(this.points[ip])
            const tn = this.points[inext].clone().sub(this.points[i])
            if(tp.lengthSq() < 1e-8 || tn.lengthSq() < 1e-8)
                this.curvature.push(0)
            else
            {
                tp.normalize()
                tn.normalize()
                this.curvature.push(THREE.MathUtils.clamp(1 - Math.abs(tp.dot(tn)), 0, 1))
            }
        }
    }

    build(checkpoints, startPosition)
    {
        const items = checkpoints?.items
        if(!items?.length)
            return

        const waypoints = []
        if(startPosition?.position)
            waypoints.push(new THREE.Vector3(startPosition.position.x, 0, startPosition.position.z))

        for(const cp of items)
            waypoints.push(new THREE.Vector3(cp.respawnPosition.x, 0, cp.respawnPosition.z))

        if(waypoints.length < 2)
            return

        waypoints.push(waypoints[0].clone())
        this.waypoints = waypoints

        // Linear densify: ~1 point per 0.35m along each segment — ZERO curve overshoot
        this.points = []
        for(let i = 0; i < waypoints.length - 1; i++)
        {
            const a = waypoints[i]
            const b = waypoints[i + 1]
            const dist = a.distanceTo(b)
            const steps = Math.max(1, Math.ceil(dist / 0.35))
            for(let s = 0; s < steps; s++)
                this.points.push(a.clone().lerp(b, s / steps))
        }
        this.points.push(waypoints[waypoints.length - 1].clone())

        this.lengths = [ 0 ]
        let total = 0
        for(let i = 1; i < this.points.length; i++)
        {
            total += this.points[i].distanceTo(this.points[i - 1])
            this.lengths.push(total)
        }
        this.total = Math.max(total, 1)

        this.buildTangentsAndCurvature()
    }

    wrap(s)
    {
        return wrapArc(s, this.total)
    }

    sample(s)
    {
        s = this.wrap(s)
        let i = 1
        while(i < this.lengths.length && this.lengths[i] < s)
            i++

        const i0 = Math.max(0, i - 1)
        const i1 = Math.min(this.points.length - 1, i)
        const span = Math.max(1e-4, this.lengths[i1] - this.lengths[i0])
        const u = (s - this.lengths[i0]) / span

        const position = this.points[i0].clone().lerp(this.points[i1], u)
        // Tangent = exact segment direction (no blended facing into walls)
        const tangent = this.points[i1].clone().sub(this.points[i0])
        if(tangent.lengthSq() < 1e-8)
            tangent.copy(this.tangents[i0])
        else
            tangent.normalize()

        return {
            position,
            tangent,
            curvature: THREE.MathUtils.lerp(this.curvature[i0], this.curvature[i1], u),
        }
    }

    project(x, z)
    {
        let bestI = 0
        let bestD2 = Infinity
        for(let i = 0; i < this.points.length; i++)
        {
            const p = this.points[i]
            const d2 = (p.x - x) ** 2 + (p.z - z) ** 2
            if(d2 < bestD2)
            {
                bestD2 = d2
                bestI = i
            }
        }
        return { s: this.lengths[bestI], lateral: Math.sqrt(bestD2) }
    }

    aheadCurvature(s, lookAhead = 14)
    {
        let maxC = 0
        for(let i = 0; i <= 14; i++)
        {
            const c = this.sample(s + (lookAhead * i) / 14).curvature
            if(c > maxC)
                maxC = c
        }
        return maxC
    }

    forwardDistanceFrom(s, x, z)
    {
        return forwardDelta(s, this.project(x, z).s, this.total)
    }

    /** Max distance of any sample from its parent polyline segment (must be ~0). */
    maxDeviationFromPolyline()
    {
        let maxD = 0
        for(const p of this.points)
        {
            let best = Infinity
            for(let i = 0; i < this.waypoints.length - 1; i++)
            {
                const a = this.waypoints[i]
                const b = this.waypoints[i + 1]
                const sx = b.x - a.x
                const sz = b.z - a.z
                const lenSq = sx * sx + sz * sz || 1
                let t = ((p.x - a.x) * sx + (p.z - a.z) * sz) / lenSq
                t = THREE.MathUtils.clamp(t, 0, 1)
                const cx = a.x + sx * t
                const cz = a.z + sz * t
                best = Math.min(best, Math.hypot(p.x - cx, p.z - cz))
            }
            maxD = Math.max(maxD, best)
        }
        return maxD
    }
}

/**
 * NPC pack follows baked circuitTrackPath.json — same coords + obstacles as player.
 */
export class RaceOpponents
{
    constructor(circuit)
    {
        this.game = Game.getInstance()
        this.circuit = circuit
        this.active = false
        this.playerPlace = 1
        this.group = new THREE.Group()
        this.group.name = 'raceOpponents'
        this.game.scene.add(this.group)

        this.line = new RacingLine(circuit.checkpoints, circuit.startPosition)
        this.rivals = []
        this._pos = new THREE.Vector3()
    }

    /** Call whenever vehicle template becomes available. */
    spawnOnce()
    {
        if(this.rivals.length >= RIVAL_PROFILES.length)
            return this.rivals.length

        if(!this.game.world?.vehicleChassisTemplate
            && !this.game.world?.visualVehicle?.parts?.chassis)
        {
            return this.rivals.length
        }

        for(const profile of RIVAL_PROFILES)
        {
            if(this.rivals.some((rival) => rival.id === profile.id))
                continue

            const visual = new NpcRaceCar({
                id: profile.id,
                paintName: profile.paintName,
                colorFrom: profile.colorFrom,
                colorTo: profile.colorTo,
            })
            const root = visual.getRoot()
            if(!visual.ready || !root)
            {
                console.warn(`[RaceOpponents] failed to build ${profile.id}`)
                continue
            }

            root.frustumCulled = false
            root.visible = true
            this.game.scene.add(root)

            this.rivals.push({
                id: profile.id,
                label: profile.label,
                visual,
                profile,
                s: 0,
                reachedCount: 0,
                speed: 0,
                yaw: 0,
                steer: 0,
                finished: false,
                finishTime: null,
                straightSpeed: profile.straightSpeed,
                cruiseSpeed: profile.cruiseSpeed,
                cornerSpeed: profile.cornerSpeed,
                obstacleSpeed: profile.obstacleSpeed,
                maxSpeed: profile.maxSpeed,
                accel: profile.accel,
                brake: profile.brake,
                gridOffset: profile.gridOffset,
            })
        }

        if(this.rivals.length)
            console.info(`[RaceOpponents] ${this.rivals.length} rival(s) on grid`)

        return this.rivals.length
    }

    get rival()
    {
        return this.rivals[0] ?? null
    }

    get cars()
    {
        return this.rivals
    }

    getTargetCheckpoint(rival)
    {
        const cps = this.circuit.checkpoints
        if(!cps?.items?.length || !rival)
            return null
        return cps.items[rival.reachedCount % (cps.count + 1)]
    }

    /** Same oscillating crates the player hits (gate-axis path from CircuitArea). */
    getObstaclePositions()
    {
        const items = this.circuit.obstacles?.items
        if(!items?.length)
            return []

        const t = this.circuit.timer?.elapsedTime ?? this.game.ticker.elapsed
        return items.map((obs) => this.circuit.getObstaclePosition(obs, t))
    }

    obstacleSpeedCap(s, rival)
    {
        let minAhead = Infinity
        for(const p of this.getObstaclePositions())
        {
            const ahead = this.line.forwardDistanceFrom(s, p.x, p.z)
            if(ahead <= 0)
                continue
            if(this.line.project(p.x, p.z).lateral > 3.5)
                continue
            minAhead = Math.min(minAhead, ahead)
        }
        if(minAhead === Infinity)
            return null
        return obstacleCapFromDistance(minAhead, rival.obstacleSpeed, rival.cornerSpeed)
    }

    hide()
    {
        for(const rival of this.rivals)
            rival.visual.setVisible(false)
    }

    show()
    {
        for(const rival of this.rivals)
            rival.visual.setVisible(true)
    }

    placeFromS(s, out = this._pos)
    {
        const sample = this.line.sample(s)
        out.copy(sample.position)
        out.y = this.circuit.startPosition?.position?.y ?? NPC_CHASSIS_Y
        return sample
    }

    resetToGrid()
    {
        this.spawnOnce()

        if(!this.rivals.length || !this.line.points.length)
        {
            console.warn('[RaceOpponents] resetToGrid: no rivals on track')
            return
        }

        this.active = false
        this.playerPlace = 1

        const start = this.circuit.startPosition
        const proj = this.line.project(start.position.x, start.position.z)
        const pos = new THREE.Vector3()

        for(const rival of this.rivals)
        {
            rival.reachedCount = 0
            rival.speed = 0
            rival.steer = 0
            rival.finished = false
            rival.finishTime = null
            rival.s = this.line.wrap(proj.s - rival.gridOffset)

            const sample = this.placeFromS(rival.s, pos)
            rival.yaw = NpcRaceCar.yawFromDirection(sample.tangent.x, sample.tangent.z)
            rival.visual.updateVisual(pos, rival.yaw, 0, 0, 1)
        }

        this.show()
    }

    start()
    {
        this.active = true
        for(const rival of this.rivals)
            rival.speed = 0
    }

    stop()
    {
        this.active = false
    }

    updateRival(rival, delta)
    {
        const dt = Math.min(Math.max(delta, 0), 1 / 30)
        const cps = this.circuit.checkpoints
        const pos = new THREE.Vector3()
        const sBefore = rival.s

        const gate = this.getTargetCheckpoint(rival)
        if(gate)
        {
            this.placeFromS(rival.s, pos)
            const hits = segmentCircleIntersection(
                gate.a.x, gate.a.y,
                gate.b.x, gate.b.y,
                pos.x, pos.z,
                cps.checkRadius
            )
            if(hits.length)
            {
                rival.reachedCount++
                if(rival.reachedCount >= cps.count + 2)
                {
                    rival.finished = true
                    rival.finishTime = this.circuit.timer.elapsedTime
                    rival.speed = 0
                }
            }
        }

        if(rival.finished)
        {
            this.placeFromS(rival.s, pos)
            rival.visual.updateVisual(pos, rival.yaw, 0, 0, dt)
            return
        }

        const bend = this.line.aheadCurvature(rival.s, 18)
        const nowT = this.line.sample(rival.s).tangent
        const lookT = this.line.sample(rival.s + 10).tangent
        const turnAhead = Math.abs(smallestAngle(
            NpcRaceCar.yawFromDirection(nowT.x, nowT.z),
            NpcRaceCar.yawFromDirection(lookT.x, lookT.z)
        ))

        const targetSpeed = computeSpeedTier({
            bend,
            turnAhead,
            obstacleAhead: this.obstacleSpeedCap(rival.s, rival),
            gap: cps.reachedCount - rival.reachedCount,
            straightSpeed: rival.straightSpeed,
            cruiseSpeed: rival.cruiseSpeed,
            cornerSpeed: rival.cornerSpeed,
            obstacleSpeed: rival.obstacleSpeed,
            maxSpeed: rival.maxSpeed,
        })

        if(rival.speed < targetSpeed)
            rival.speed = Math.min(targetSpeed, rival.speed + rival.accel * dt)
        else
            rival.speed = Math.max(targetSpeed, rival.speed - rival.brake * dt)

        const step = Math.min(rival.speed * dt, rival.maxSpeed * dt)
        rival.s = advanceArc(rival.s, step, this.line.total)

        if(step > 0.001 && forwardDelta(sBefore, rival.s, this.line.total) === 0)
            rival.s = advanceArc(sBefore, Math.max(step, 0.02), this.line.total)

        const sample = this.placeFromS(rival.s, pos)
        const desiredYaw = NpcRaceCar.yawFromDirection(sample.tangent.x, sample.tangent.z)
        rival.yaw += smallestAngle(rival.yaw, desiredYaw) * Math.min(1, dt * 8)
        rival.steer = THREE.MathUtils.clamp(smallestAngle(rival.yaw, desiredYaw), -0.4, 0.4)

        rival.visual.updateVisual(pos, rival.yaw, rival.speed, rival.steer, dt)
    }

    update(delta)
    {
        if(!this.active || !this.rivals.length || !this.line.points.length)
            return

        for(const rival of this.rivals)
            this.updateRival(rival, delta)
    }

    getPlayerProgress()
    {
        const cps = this.circuit.checkpoints
        const player = this.game.player
        const proj = this.line.project(player.position.x, player.position.z)
        return {
            reachedCount: cps.reachedCount,
            s: proj.s,
            finished: false,
            finishTime: null,
        }
    }

    updatePlaces(playerFinished = false)
    {
        if(!this.rivals.length)
        {
            this.playerPlace = 1
            return
        }

        const player = this.getPlayerProgress()
        if(playerFinished)
        {
            player.finished = true
            player.finishTime = this.circuit.timer.elapsedTime
        }

        const rivals = this.rivals.map((rival) => ({
            id: rival.id,
            reachedCount: rival.reachedCount,
            s: rival.s,
            finished: rival.finished,
            finishTime: rival.finishTime,
        }))

        this.playerPlace = rankRacers(player, rivals).playerPlace
    }

    onPlayerFinished()
    {
        this.stop()
        this.updatePlaces(true)
        return this.playerPlace
    }

    placeLabel(place = this.playerPlace)
    {
        const v = place % 100
        const suffix = (v >= 11 && v <= 13) ? 'th' : ([ 'th', 'st', 'nd', 'rd' ][v % 10] || 'th')
        return `${place}${suffix}`
    }

    resultMessage(place = this.playerPlace)
    {
        const total = this.rivals.length + 1
        if(place === 1)
            return 'P1 against the pack'
        if(place === total)
            return `Last of ${total} — beat both rivals next lap`
        return `P${place} of ${total} — push for the win`
    }

    destroy()
    {
        this.stop()
        for(const rival of this.rivals)
        {
            rival.visual.destroy()
        }
        this.rivals = []
        this.group.removeFromParent()
    }
}
