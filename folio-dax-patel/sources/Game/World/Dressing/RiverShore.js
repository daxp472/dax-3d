import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { VoxelPatron, vibeMat } from './VoxelPatron.js'
import { makeDockPlank, makeDolphin, makeDuck, makeFencePost, makeFishingRod, makeReed, makeSheep } from './ToyCritters.js'

/**
 * River / nadi shore north of beach — sheep, dolphins, fishing, grazing life.
 */
export class RiverShore
{
    constructor()
    {
        this.game = Game.getInstance()
        this.group = new THREE.Group()
        this.group.name = 'riverShore'
        this.game.scene.add(this.group)

        this.floaters = []
        this.patrons = []
        this.sheepStates = []

        this.buildNorthBank()
        this.buildChannelFinger()
        this.buildFarWestPatch()
        this.buildDolphinPod()
        this.setInteract()

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

    buildNorthBank()
    {
        const sheepSpots = [
            { x: -58, z: 83, yaw: 0.4, scale: 1.05, wool: '#f8f4ec' },
            { x: -52, z: 81, yaw: -0.8, scale: 0.95, wool: '#ebe4d8' },
            { x: -48, z: 79, yaw: 1.2, scale: 1.1, wool: '#f5f0e6' },
            { x: -42, z: 80, yaw: -0.3, scale: 0.9, wool: '#ffffff' },
            { x: -38, z: 82, yaw: 0.9, scale: 1.0, wool: '#e8dfd0' },
            { x: -32, z: 79, yaw: -1.1, scale: 0.85, wool: '#f5f0e6' },
            { x: -22, z: 78, yaw: 0.5, scale: 1.0, wool: '#f8f4ec' },
            { x: -14, z: 76, yaw: -0.6, scale: 0.92, wool: '#ebe4d8' },
            { x: -6, z: 75, yaw: 1.4, scale: 1.05, wool: '#f5f0e6' },
            { x: 2, z: 77, yaw: -0.2, scale: 0.88, wool: '#ffffff' },
            { x: 8, z: 80, yaw: 0.7, scale: 1.0, wool: '#e8dfd0' },
        ]
        for(const s of sheepSpots)
            this.addSheep(s)

        const reedLine = [ -60, -56, -50, -44, -36, -30, -24, -18, -12, -4, 4, 10 ]
        for(let i = 0; i < reedLine.length; i++)
        {
            const x = reedLine[i]
            const z = 84.5 + (i % 3) * 0.4
            const h = 1.0 + (i % 4) * 0.25
            this.group.add(makeReed(x, z, h))
            if(i % 2 === 0)
                this.group.add(makeReed(x + 0.6, z + 0.3, h * 0.85))
        }

        for(let i = 0; i < 5; i++)
            this.group.add(makeFencePost(-55 + i * 3.2, 82.5, 0.15))

        const dock = makeDockPlank(-46, 84, 0.35, 4.2)
        this.group.add(dock)
        this.addFixedCollider(-46, 0.25, 84, [ 2.1, 0.15, 0.55 ])

        const ducks = [
            { x: -58, z: 85.5, body: '#ffe566' },
            { x: -54, z: 86, body: '#fff0a0' },
            { x: -46, z: 84.8, body: '#ffe566' },
            { x: -36, z: 83.5, body: '#ffd700' },
            { x: -26, z: 84, body: '#ffe566' },
            { x: -16, z: 82, body: '#fff0a0' },
            { x: -6, z: 81, body: '#ffe566' },
            { x: 4, z: 83, body: '#ffd700' },
        ]
        for(const d of ducks)
            this.addDuck(d)

        // Standing shepherd on pasture
        this.addPatron({
            name: 'shepherd',
            position: { x: -50, y: 0.72, z: 80.5 },
            yaw: 0.9,
            drink: 'chai',
            outfit: 'olive',
            phase: 0.3,
            pose: 'standing',
        })

        // Picnic — lounger pose on blanket
        this.addPatron({
            name: 'riverPicnic',
            position: { x: -34, y: 0.38, z: 78.2 },
            yaw: -1.4,
            drink: 'coffee',
            outfit: 'sand',
            phase: 1.8,
            pose: 'lounger',
        })

        // Fisher on log dock
        this.addPatron({
            name: 'dockFisher',
            position: { x: -45.5, y: 0.42, z: 83.2 },
            yaw: 0.35,
            drink: 'coffee',
            outfit: 'teal',
            phase: 2.6,
            pose: 'fishing',
        })
        const rodDock = makeFishingRod(0.35)
        rodDock.position.set(-45.5, 0.42, 83.2)
        this.group.add(rodDock)

        this.buildPicnicBlanket(-34, 78.5)
        this.buildHayBale(-54, 80)
        this.buildHayBale(-40, 81.5)
        this.buildWaterLily(-48, 85.2)
        this.buildWaterLily(-28, 83.8)
        this.buildWaterLily(-8, 82.5)

        // Shore bench log
        const bench = makeDockPlank(-38, 79.5, 1.1, 2.4)
        this.group.add(bench)
    }

    buildChannelFinger()
    {
        const sheep = [
            { x: -18, z: 55, yaw: 0.6, scale: 0.95 },
            { x: -12, z: 57, yaw: -0.4, scale: 1.0 },
            { x: -4, z: 54, yaw: 1.1, scale: 0.9 },
        ]
        for(const s of sheep)
            this.addSheep(s)

        const reedXs = [ -20, -14, -8, -2, 4 ]
        for(let i = 0; i < reedXs.length; i++)
            this.group.add(makeReed(reedXs[i], 58.5, 0.9 + (i % 3) * 0.15))

        for(const d of [
            { x: -14, z: 56.5 },
            { x: -8, z: 57.2 },
            { x: 2, z: 55.5 },
        ])
            this.addDuck(d)

        this.addPatron({
            name: 'channelAngler',
            position: { x: -15.5, y: 0.4, z: 52.8 },
            yaw: 1.55,
            drink: 'coffee',
            outfit: 'cocoa',
            phase: 0.9,
            pose: 'fishing',
        })
        const rodChannel = makeFishingRod(1.55)
        rodChannel.position.set(-15.5, 0.4, 52.8)
        this.group.add(rodChannel)
    }

    buildFarWestPatch()
    {
        this.addSheep({ x: -66, z: 85, yaw: -0.5, scale: 1.0, wool: '#f5f0e6' })
        this.addSheep({ x: -62, z: 83, yaw: 0.8, scale: 0.92, wool: '#ebe4d8' })
        this.addDuck({ x: -64, z: 86.5, body: '#ffe566' })
        this.group.add(makeReed(-68, 86, 1.3))
        this.group.add(makeReed(-65, 85.5, 1.1))
    }

    buildDolphinPod()
    {
        const pod = [
            { x: -52, z: 87, yaw: 0.3, scale: 1.1, phase: 0 },
            { x: -48, z: 86.2, yaw: -0.2, scale: 0.95, phase: 1.2 },
            { x: -30, z: 85, yaw: 0.5, scale: 1.0, phase: 2.4 },
            { x: -8, z: 83.5, yaw: -0.4, scale: 0.9, phase: 0.8 },
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
                drift: 0.35,
                leap: true,
            })
        }
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
            drift: 0.12,
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
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 1.8), vibeMat('#ff6b35', true))
        blanket.position.set(x, 0.04, z)
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.35), vibeMat('#7b5cff', true))
        stripe.position.set(x, 0.06, z + 0.4)
        const basket = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.35), vibeMat('#8b6914', true))
        basket.position.set(x - 0.8, 0.18, z - 0.3)
        this.group.add(blanket, stripe, basket)
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
            drift: 0.04,
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
                    `<div class="top"><div class="title">River Bank</div></div><div class="bottom"><div class="description">Sheep · fishing on the log dock · dolphins in the nadi.</div></div>`,
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
