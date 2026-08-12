import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { VoxelPatron, vibeMat } from './VoxelPatron.js'
import { makeDockPlank, makeDolphin, makeDuck, makeFenceRun, makeReedClump, makeSheep } from './ToyCritters.js'

/**
 * River / nadi shore — composed vignettes (not random scatter).
 * Pasture flock · dock fishing · picnic · quiet water life.
 */
export class RiverShore
{
    /** Pasture clear center — matches Terrain.riverClearCenter */
    static CLEAR = { x: -42, z: 80.5 }

    constructor()
    {
        this.game = Game.getInstance()
        this.group = new THREE.Group()
        this.group.name = 'riverShore'
        this.game.scene.add(this.group)

        this.floaters = []
        this.patrons = []
        this.sheepStates = []

        this.buildPastureFlock()
        this.buildDockScene()
        this.buildPicnicCorner()
        this.buildQuietWater()
        this.setInteract()
        this.clearRiverPad()
        this.game.ticker.wait(30, () => this.clearRiverPad())
        this.game.ticker.wait(120, () => this.clearRiverPad())

        this.group.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
                child.frustumCulled = false
            }
        })
    }

    /** Kill bushes / flowers / trees on the pasture so props read clean. */
    clearRiverPad()
    {
        const C = RiverShore.CLEAR
        const spots = [
            { x: C.x, z: C.z, r: 16 },
            { x: -52, z: 81, r: 7 },
            { x: -46, z: 84, r: 6 },
            { x: -34, z: 78.5, r: 6 },
        ]
        const world = this.game.world
        for(const s of spots)
        {
            const center = { x: s.x, z: s.z }
            world?.bushes?.foliage?.hideNear?.(center, s.r)
            world?.flowers?.hideNear?.(center, s.r)
            world?.birchTrees?.hideNear?.(center, s.r * 0.7)
            world?.oakTrees?.hideNear?.(center, s.r * 0.7)
            world?.cherryTrees?.hideNear?.(center, s.r * 0.7)
        }
    }

    /**
     * Vignette A — tight sheep flock + hay + shepherd + road fence.
     * One cluster, not a sheep highway.
     */
    buildPastureFlock()
    {
        const flock = [
            { x: -54.2, z: 80.8, yaw: 0.5, scale: 1.05, wool: '#f8f4ec' },
            { x: -52.6, z: 81.6, yaw: -0.9, scale: 0.95, wool: '#ebe4d8' },
            { x: -53.4, z: 79.6, yaw: 1.3, scale: 1.0, wool: '#f5f0e6' },
            { x: -51.2, z: 80.2, yaw: -0.2, scale: 0.9, wool: '#ffffff' },
        ]
        for(const s of flock)
            this.addSheep(s)

        this.buildHayBale(-55.2, 79.4)

        // Fence along road edge only (reads as boundary, not debris)
        this.group.add(makeFenceRun(-56.5, 82.2, -49.5, 81.6, 4))

        this.addPatron({
            name: 'shepherd',
            position: { x: -50.4, y: 0, z: 79.8 },
            yaw: -1.8,
            drink: 'chai',
            outfit: 'olive',
            phase: 0.3,
            pose: 'standing',
        })
    }

    /**
     * Vignette B — dock hero: fisher + reed clumps at water corners + duck raft.
     */
    buildDockScene()
    {
        const dockX = -46
        const dockZ = 84.2
        const dockYaw = 0.35

        const dock = makeDockPlank(dockX, dockZ, dockYaw, 4.0)
        this.group.add(dock)
        this.addFixedCollider(dockX, 0.25, dockZ, [ 2.0, 0.15, 0.55 ])

        // Fisher sits on dock deck (stool + rod from VoxelPatron)
        this.addPatron({
            name: 'dockFisher',
            position: { x: dockX + 0.15, y: 0.32, z: dockZ - 0.05 },
            yaw: dockYaw,
            drink: 'coffee',
            outfit: 'teal',
            phase: 2.6,
            pose: 'fishing',
        })

        // Reeds only at dock water corners — two clumps, not a dotted line
        this.group.add(makeReedClump(dockX - 2.4, dockZ + 1.6))
        this.group.add(makeReedClump(dockX + 2.2, dockZ + 1.3, '#456b4a'))

        // Duck raft just off the dock (tight triangle)
        const ducks = [
            { x: dockX - 1.2, z: dockZ + 2.0, body: '#ffe566', yaw: 0.4 },
            { x: dockX + 0.3, z: dockZ + 2.4, body: '#fff0a0', yaw: -0.6 },
            { x: dockX + 1.4, z: dockZ + 1.8, body: '#ffd700', yaw: 1.1 },
        ]
        for(const d of ducks)
            this.addDuck(d)

        this.buildWaterLily(dockX - 0.4, dockZ + 2.8)
        this.buildWaterLily(dockX + 1.8, dockZ + 2.5)
    }

    /**
     * Vignette C — picnic pad + one lounger + shore log. Leave space around it.
     */
    buildPicnicCorner()
    {
        const px = -34
        const pz = 78.3

        this.buildPicnicBlanket(px, pz)

        this.addPatron({
            name: 'riverPicnic',
            position: { x: px + 0.15, y: 0.14, z: pz - 0.15 },
            yaw: -1.2,
            drink: 'coffee',
            outfit: 'sand',
            phase: 1.8,
            pose: 'lounger',
        })

        // One curious sheep near picnic — not on the blanket
        this.addSheep({ x: px - 2.6, z: pz + 1.2, yaw: 0.8, scale: 0.92, wool: '#e8dfd0' })

        const bench = makeDockPlank(px + 3.2, pz + 0.8, 1.15, 2.2)
        this.group.add(bench)
        this.addFixedCollider(px + 3.2, 0.25, pz + 0.8, [ 1.2, 0.2, 0.55 ])
    }

    /**
     * Quiet nadi life — one dolphin pair + one far reed clump. No spam.
     */
    buildQuietWater()
    {
        const pod = [
            { x: -50, z: 87.2, yaw: 0.4, scale: 1.05, phase: 0 },
            { x: -47.2, z: 86.6, yaw: -0.25, scale: 0.92, phase: 1.4 },
        ]
        for(const d of pod)
        {
            const dolphin = makeDolphin({
                position: { x: d.x, y: -0.25, z: d.z },
                yaw: d.yaw,
                scale: d.scale,
            })
            this.group.add(dolphin)
            this.floaters.push({
                mesh: dolphin,
                baseX: d.x,
                baseY: -0.25,
                baseZ: d.z,
                phase: d.phase,
                amp: 0.08,
                drift: 0.28,
                leap: true,
            })
        }

        // Far west accent only — one clump + one sheep silhouette
        this.group.add(makeReedClump(-62, 85.5))
        this.addSheep({ x: -60.5, z: 83.2, yaw: -0.4, scale: 0.95, wool: '#f5f0e6' })
    }

    addSheep(s)
    {
        const sheep = makeSheep({
            position: { x: s.x, y: 0, z: s.z },
            yaw: s.yaw,
            scale: s.scale ?? 1,
            wool: s.wool,
        })
        this.group.add(sheep)
        this.sheepStates.push({
            group: sheep,
            rest: new THREE.Vector3(s.x, 0, s.z),
            restYaw: s.yaw ?? 0,
            stunVel: new THREE.Vector3(),
            stunTimer: 0,
            hitCooldown: 0,
        })
    }

    addDuck(d)
    {
        const duck = makeDuck({
            position: { x: d.x, y: -0.12, z: d.z },
            yaw: d.yaw ?? 0,
            body: d.body,
            scale: d.scale ?? 1,
        })
        this.group.add(duck)
        this.floaters.push({
            mesh: duck,
            baseX: d.x,
            baseY: -0.12,
            baseZ: d.z,
            phase: (d.x + d.z) * 0.07,
            amp: 0.04,
            drift: 0.08,
        })
    }

    addPatron(opts)
    {
        const patron = new VoxelPatron(opts)
        this.patrons.push(patron)
        this.group.add(patron.group)
    }

    buildPicnicBlanket(x, z)
    {
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.12, 1.8),
            vibeMat('#ff6b35', true)
        )
        platform.position.set(x, 0.06, z)
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.04, 0.35),
            vibeMat('#7b5cff', true)
        )
        stripe.position.set(x, 0.14, z + 0.4)
        const basket = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.28, 0.35),
            vibeMat('#8b6914', true)
        )
        basket.position.set(x - 0.8, 0.28, z - 0.3)
        this.group.add(platform, stripe, basket)
        this.addFixedCollider(x, 0.12, z, [ 1.25, 0.12, 0.95 ])
        this.addFixedCollider(x - 0.8, 0.28, z - 0.3, [ 0.22, 0.2, 0.22 ])
    }

    buildHayBale(x, z)
    {
        const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 10), vibeMat('#d4a017', true))
        bale.position.set(x, 0.35, z)
        bale.rotation.z = Math.PI / 2
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.72), vibeMat('#8b6914', true))
        strap.position.set(x, 0.35, z)
        this.group.add(bale, strap)
        this.addFixedCollider(x, 0.35, z, [ 0.35, 0.35, 0.35 ])
    }

    buildWaterLily(x, z)
    {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.03, 12), vibeMat('#2d6a4f', true))
        pad.position.set(x, -0.22, z)
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), vibeMat('#ff8fab', true))
        flower.position.set(x, -0.16, z)
        this.group.add(pad, flower)
        this.floaters.push({
            mesh: pad,
            baseX: x,
            baseY: -0.22,
            baseZ: z,
            phase: x * 0.1,
            amp: 0.02,
            child: flower,
            drift: 0.03,
        })
    }

    addFixedCollider(x, y, z, halfExtents)
    {
        this.game.objects.add(null, {
            type: 'fixed',
            friction: 0.45,
            restitution: 0.05,
            position: { x, y, z },
            colliders: [
                { shape: 'cuboid', parameters: halfExtents, position: { x: 0, y: 0, z: 0 }, category: 'object' },
            ],
        })
    }

    _tickSheepKnock(dt)
    {
        const vehicle = this.game.physicalVehicle
        if(!vehicle)
            return

        const car = vehicle.position
        const speed = Math.abs(vehicle.forwardSpeed ?? vehicle.speed ?? 0)

        for(const s of this.sheepStates)
        {
            if(s.hitCooldown > 0)
                s.hitCooldown -= dt

            if(s.stunTimer > 0)
            {
                s.stunTimer -= dt
                s.group.position.x += s.stunVel.x * dt
                s.group.position.y += s.stunVel.y * dt
                s.group.position.z += s.stunVel.z * dt
                s.stunVel.y -= 14 * dt
                s.group.rotation.x += dt * 7
                if(s.group.position.y < s.rest.y)
                {
                    s.group.position.y = s.rest.y
                    s.stunVel.y *= -0.25
                    s.stunVel.x *= 0.5
                    s.stunVel.z *= 0.5
                }
                if(s.stunTimer <= 0)
                {
                    s.group.position.copy(s.rest)
                    s.group.rotation.set(0, s.restYaw, 0)
                }
                continue
            }

            const dx = s.group.position.x - car.x
            const dz = s.group.position.z - car.z
            const dist = Math.hypot(dx, dz)
            if(dist > 1.8 || speed < 2.0 || s.hitCooldown > 0)
                continue

            const len = Math.hypot(dx, dz) || 1
            const force = THREE.MathUtils.clamp(speed * 0.32, 3.5, 11)
            s.stunVel.set((dx / len) * force, 4.5 + speed * 0.08, (dz / len) * force)
            s.stunTimer = 1.0 + Math.min(speed * 0.04, 0.7)
            s.hitCooldown = 2.0
        }
    }

    setInteract()
    {
        this.riverPoint = this.game.interactivePoints.create(
            new THREE.Vector3(-48, 1.5, 81),
            'River Bank',
            InteractivePoints.ALIGN_LEFT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.notifications.show(
                    `<div class="top"><div class="title">River Bank</div></div><div class="bottom"><div class="description">Sheep flock · dock fishing · picnic on the shore.</div></div>`,
                    'river-shore',
                    2.8,
                    null,
                    'river-shore'
                )
            },
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    update(elapsed)
    {
        const dt = this.game.ticker?.deltaScaled ?? 0.016
        this._tickSheepKnock(dt)

        for(const f of this.floaters)
        {
            const leap = f.leap ? Math.max(0, Math.sin(elapsed * 0.9 + f.phase)) * 0.35 : 0
            f.mesh.position.y = f.baseY + Math.sin(elapsed * 1.4 + f.phase) * f.amp + leap
            if(f.baseX != null)
            {
                f.mesh.position.x = f.baseX + Math.sin(elapsed * 0.7 + f.phase) * (f.drift ?? 0.1)
                f.mesh.position.z = f.baseZ + Math.cos(elapsed * 0.6 + f.phase) * (f.drift ?? 0.1) * 0.7
            }
            if(f.leap)
                f.mesh.rotation.z = Math.sin(elapsed * 1.1 + f.phase) * 0.15
            if(f.child)
                f.child.position.y = f.mesh.position.y + 0.06
        }

        const playerPos = this.game.player?.position ?? null
        for(const p of this.patrons)
            p.update(elapsed, playerPos)
    }
}
