import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

/**
 * The Soft Stack — candy WIP pocket (Folio toy DNA).
 * Design: sealed cream playground at (420,0,420) — not doom hell.
 */
export class PocketDimension
{
    static ORIGIN = new THREE.Vector3(420, 0, 420)
    static HALF = 24
    static TITLE = 'The Soft Stack'

    constructor()
    {
        this.game = Game.getInstance()
        this.active = false
        this.group = new THREE.Group()
        this.group.name = 'softStack'
        this.group.visible = false
        this.group.position.copy(PocketDimension.ORIGIN)
        this.game.scene.add(this.group)

        this.physicsBodies = []
        this.knockables = []
        this.floaters = []
        this.spinners = []
        this._savedFloorVisible = true
        this._savedWaterVisible = true

        this.buildShell()
        this.buildSpawnPlaza()
        this.buildDuckShrine()
        this.buildModuleArcade()
        this.buildSoftPillars()
        this.buildStickyYard()
        this.buildLooseBits()
        this.buildShipGate()
        this.buildPhysicsShell()
        this.setInteract()
    }

    mat(hex, opts = {})
    {
        return new MeshDefaultMaterial({
            colorNode: color(hex),
            hasWater: false,
            hasFog: opts.hasFog ?? false,
            ...opts,
        })
    }

    w(x, y, z)
    {
        return {
            x: PocketDimension.ORIGIN.x + x,
            y: PocketDimension.ORIGIN.y + y,
            z: PocketDimension.ORIGIN.z + z,
        }
    }

    buildShell()
    {
        const R = PocketDimension.HALF + 14
        const H = 14

        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(50, 0.8, 50),
            this.mat('#fff6e8')
        )
        floor.position.set(0, -0.35, 0)
        this.group.add(floor)

        const checkers = [
            [8, 8, '#7ec8ff'], [-8, 8, '#ff8fab'], [8, -8, '#ff8fab'], [-8, -8, '#7ec8ff'],
            [14, 0, '#7ec8ff'], [-14, 0, '#ff8fab'], [0, 10, '#7ec8ff'], [0, -10, '#ff8fab'],
        ]
        for(const [x, z, hex] of checkers)
        {
            const tile = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 2), this.mat(hex))
            tile.position.set(x, 0.05, z)
            this.group.add(tile)
        }

        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(R, R, H, 40, 1, true),
            this.mat('#0a1218')
        )
        wall.position.y = H * 0.5 - 0.3
        this.group.add(wall)

        const ceil = new THREE.Mesh(
            new THREE.SphereGeometry(R * 0.98, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
            this.mat('#0a1218')
        )
        ceil.position.y = 1.5
        ceil.rotation.x = Math.PI
        this.group.add(ceil)
    }

    buildSpawnPlaza()
    {
        const disc = new THREE.Mesh(
            new THREE.CylinderGeometry(4.5, 4.7, 0.2, 6),
            this.mat('#ffe066')
        )
        disc.position.set(0, 0.1, 14)
        this.group.add(disc)

        const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.18, 8, 6), this.mat('#ff6b35'))
        ring.rotation.x = Math.PI / 2
        ring.position.set(0, 0.25, 14)
        this.group.add(ring)
        this.spinners.push({ mesh: ring, speed: 0.35, axis: 'z' })

        const left = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), this.mat('#2ec4b6'))
        left.position.set(-3.5, 2, 14)
        const right = left.clone()
        right.position.x = 3.5
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 1), this.mat('#ff9f1c'))
        lintel.position.set(0, 4.4, 14)
        this.group.add(left, right, lintel)
        this.addFixedBody(this.w(-3.5, 2, 14), [ 0.5, 2, 0.5 ])
        this.addFixedBody(this.w(3.5, 2, 14), [ 0.5, 2, 0.5 ])
        this.addFixedBody(this.w(0, 4.4, 14), [ 4, 0.4, 0.5 ])
    }

    buildDuckShrine()
    {
        const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), this.mat('#ffe566'))
        body.position.set(0, 1.4, 0)
        const beak = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.7), this.mat('#ff9f1c'))
        beak.position.set(0, 1.5, 1.5)
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), this.mat('#1a1a1a'))
        eyeL.position.set(-0.45, 1.9, 0.9)
        const eyeR = eyeL.clone()
        eyeR.position.x = 0.45
        this.group.add(body, beak, eyeL, eyeR)
        this.addFixedBody(this.w(0, 1.4, 0), [ 1.3, 1.3, 1.3 ])

        const bitColors = [ '#7ec8ff', '#ff8fab', '#2ec4b6', '#7ec8ff', '#ff8fab', '#2ec4b6' ]
        for(let i = 0; i < 6; i++)
        {
            const bit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), this.mat(bitColors[i]))
            const a = (i / 6) * Math.PI * 2
            bit.position.set(Math.cos(a) * 4, 2.5 + (i % 3) * 0.6, Math.sin(a) * 4)
            this.group.add(bit)
            this.floaters.push({
                mesh: bit,
                baseY: bit.position.y,
                phase: i,
                amp: 0.25,
                orbit: { radius: 4, speed: 0.4 + i * 0.05, angle: a },
            })
        }
    }

    buildModuleArcade()
    {
        const cans = [
            { x: 10, z: -4, h: 2.2, hex: '#7ec8ff' },
            { x: 13, z: 0, h: 3.2, hex: '#ff8fab' },
            { x: 15, z: -6, h: 2.2, hex: '#2ec4b6' },
            { x: 11, z: 4, h: 4, hex: '#ff9f1c' },
            { x: 14, z: 6, h: 2.8, hex: '#ffe066' },
        ]
        for(const c of cans)
        {
            const mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(1.1, 1.1, c.h, 10),
                this.mat(c.hex)
            )
            mesh.position.set(c.x, c.h * 0.5, c.z)
            this.group.add(mesh)
            this.addFixedBody(this.w(c.x, c.h * 0.5, c.z), [ 1.05, c.h * 0.5, 1.05 ])
        }

        const rings = [
            { x: 12, y: 2.5, z: -2 },
            { x: 12, y: 3.5, z: 2 },
            { x: 12, y: 4.5, z: -5 },
        ]
        for(const r of rings)
        {
            const torus = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 8, 16), this.mat('#ff6b35'))
            torus.position.set(r.x, r.y, r.z)
            this.group.add(torus)
            this.spinners.push({ mesh: torus, speed: 0.55, axis: 'y' })
        }
    }

    buildSoftPillars()
    {
        const spots = [
            [16, 12], [-16, 12], [16, -12], [-16, -12], [0, 18], [0, -18],
        ]
        for(const [x, z] of spots)
        {
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.7, 0.9, 5, 8),
                this.mat('#c8f0e8')
            )
            pole.position.set(x, 2.5, z)
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10), this.mat('#ffe066'))
            cap.position.set(x, 5.2, z)
            this.group.add(pole, cap)
            this.addFixedBody(this.w(x, 2.5, z), [ 0.8, 2.5, 0.8 ])
        }
    }

    buildStickyYard()
    {
        const notes = [
            { x: -14, z: 4, sx: 0.9, sy: 0.15, sz: 0.7, hex: '#ff8fab' },
            { x: -12, z: 5, sx: 0.8, sy: 0.15, sz: 0.6, hex: '#7ec8ff' },
            { x: -10, z: 3, sx: 0.7, sy: 0.15, sz: 0.55, hex: '#ffe066' },
            { x: -13, z: 1, sx: 0.85, sy: 0.15, sz: 0.65, hex: '#2ec4b6' },
            { x: -11, z: -1, sx: 0.6, sy: 0.6, sz: 0.6, hex: '#ff9f1c' },
            { x: -15, z: -2, sx: 0.5, sy: 0.9, sz: 0.5, hex: '#ff6b35' },
            { x: -9, z: 6, sx: 1.0, sy: 0.4, sz: 0.7, hex: '#c8f0e8' },
        ]
        for(const n of notes)
            this.spawnKnockable(n)
    }

    buildLooseBits()
    {
        const bits = [
            { x: 4, z: 8, sx: 0.55, sy: 0.55, sz: 0.55, hex: '#7ec8ff' },
            { x: -4, z: -8, sx: 0.7, sy: 0.5, sz: 0.7, hex: '#ff8fab' },
            { x: 8, z: 5, sx: 0.45, sy: 0.8, sz: 0.45, hex: '#ffe066' },
            { x: 6, z: -7, sx: 0.9, sy: 0.35, sz: 0.9, hex: '#2ec4b6' },
            { x: -6, z: 9, sx: 0.65, sy: 0.65, sz: 0.65, hex: '#ff9f1c' },
        ]
        for(const b of bits)
            this.spawnKnockable(b)
    }

    spawnKnockable(s)
    {
        const world = this.w(s.x, s.sy, s.z)
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(s.sx * 2, s.sy * 2, s.sz * 2),
            this.mat(s.hex)
        )
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.visible = false
        mesh.position.set(world.x, world.y, world.z)
        mesh.userData.hellKnockable = true
        this.game.scene.add(mesh)

        const object = this.game.objects.add(
            {
                model: mesh,
                parent: this.game.scene,
                updateMaterials: false,
                castShadow: true,
                receiveShadow: true,
            },
            {
                type: 'dynamic',
                position: world,
                friction: 0.4,
                restitution: 0.28,
                linearDamping: 0.12,
                angularDamping: 0.22,
                sleeping: true,
                enabled: false,
                colliders: [
                    {
                        shape: 'cuboid',
                        parameters: [ s.sx, s.sy, s.sz ],
                        position: { x: 0, y: 0, z: 0 },
                        category: 'object',
                    },
                ],
            }
        )
        this.knockables.push({ object, mesh, local: { x: s.x, y: s.sy, z: s.z } })
        if(object?.physical?.body)
            this.physicsBodies.push(object.physical.body)
    }

    buildShipGate()
    {
        const left = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 1.2), this.mat('#2ec4b6'))
        left.position.set(-3.2, 2.75, -20)
        const right = left.clone()
        right.position.x = 3.2
        const beam = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 1.2), this.mat('#ff9f1c'))
        beam.position.set(0, 5.6, -20)
        const plaque = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 0.3), this.mat('#ffe066'))
        plaque.position.set(0, 3.2, -19.4)
        const portal = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.45, 28), this.mat('#7ec8ff'))
        portal.rotation.x = Math.PI / 2
        portal.position.set(0, 2.6, -20)
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.3, 28), this.mat('#ff8fab'))
        inner.rotation.x = Math.PI / 2
        inner.position.set(0, 2.6, -19.9)
        this.group.add(left, right, beam, plaque, portal, inner)
        this.exitPortalMesh = portal
        this.exitInner = inner
        this.addFixedBody(this.w(-3.2, 2.75, -20), [ 0.6, 2.75, 0.6 ])
        this.addFixedBody(this.w(3.2, 2.75, -20), [ 0.6, 2.75, 0.6 ])
        this.addFixedBody(this.w(0, 5.6, -20), [ 4, 0.5, 0.6 ])
    }

    buildPhysicsShell()
    {
        const H = PocketDimension.HALF
        const ox = PocketDimension.ORIGIN.x
        const oy = PocketDimension.ORIGIN.y
        const oz = PocketDimension.ORIGIN.z

        this.addFixedBody({ x: ox, y: oy - 0.4, z: oz }, [ H + 2, 0.4, H + 2 ], 'floor')

        const wallH = 6
        const walls = [
            { x: ox, y: oy + wallH * 0.5, z: oz + H + 0.5, p: [ H + 2, wallH * 0.5, 0.5 ] },
            { x: ox, y: oy + wallH * 0.5, z: oz - H - 0.5, p: [ H + 2, wallH * 0.5, 0.5 ] },
            { x: ox + H + 0.5, y: oy + wallH * 0.5, z: oz, p: [ 0.5, wallH * 0.5, H + 2 ] },
            { x: ox - H - 0.5, y: oy + wallH * 0.5, z: oz, p: [ 0.5, wallH * 0.5, H + 2 ] },
        ]
        for(const w of walls)
            this.addFixedBody({ x: w.x, y: w.y, z: w.z }, w.p)
    }

    addFixedBody(position, halfExtents, category = 'object')
    {
        const object = this.game.objects.add(
            null,
            {
                type: 'fixed',
                friction: 0.45,
                restitution: 0.05,
                position,
                enabled: false,
                colliders: [
                    {
                        shape: 'cuboid',
                        parameters: halfExtents,
                        position: { x: 0, y: 0, z: 0 },
                        category,
                    },
                ],
            }
        )
        const body = object?.physical?.body
        if(body)
        {
            body.setEnabled(false)
            this.physicsBodies.push(body)
        }
        return object
    }

    setInteract()
    {
        const worldExit = this.w(0, 2.8, -20)
        this.exitPoint = this.game.interactivePoints.create(
            new THREE.Vector3(worldExit.x, worldExit.y, worldExit.z),
            'Ship It',
            InteractivePoints.ALIGN_LEFT,
            InteractivePoints.STATE_HIDDEN,
            () => this.onExitRequest?.(),
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    enablePhysics(on)
    {
        for(const body of this.physicsBodies)
            body?.setEnabled(on)

        for(const k of this.knockables)
        {
            if(k.mesh)
                k.mesh.visible = on
            if(!on)
                continue
            const body = k.object?.physical?.body
            if(!body)
                continue
            const world = this.w(k.local.x, k.local.y, k.local.z)
            body.setTranslation(world, true)
            body.setLinvel({ x: 0, y: 0, z: 0 }, true)
            body.setAngvel({ x: 0, y: 0, z: 0 }, true)
            body.wakeUp?.()
            k.object.needsUpdate = true
        }
    }

    isolateWorld(on)
    {
        const floor = this.game.world?.floor
        if(floor?.mesh)
        {
            if(on)
            {
                this._savedFloorVisible = floor.mesh.visible
                floor.mesh.visible = false
            }
            else
            {
                floor.mesh.visible = this._savedFloorVisible
            }
        }
        if(floor?.physical?.body)
            floor.physical.body.setEnabled(!on)

        if(floor?.bedRock?.physical?.body)
        {
            floor.bedRock.enabled = false
            floor.bedRock.physical.body.setEnabled(false)
        }

        const water = this.game.world?.waterSurface
        if(water?.mesh)
        {
            if(on)
            {
                this._savedWaterVisible = water.mesh.visible
                water.mesh.visible = false
            }
            else if(typeof this._savedWaterVisible === 'boolean')
            {
                water.mesh.visible = this._savedWaterVisible
            }
        }
        if(water?.ice?.physical?.body)
            water.ice.physical.body.setEnabled(!on)
    }

    show()
    {
        this.active = true
        this.group.visible = true
        this.isolateWorld(true)
        this.enablePhysics(true)
        this.exitPoint?.show?.()
    }

    hide()
    {
        this.active = false
        this.group.visible = false
        this.enablePhysics(false)
        this.isolateWorld(false)
        this.exitPoint?.hide?.()
    }

    getSpawn()
    {
        return {
            position: new THREE.Vector3(
                PocketDimension.ORIGIN.x,
                PocketDimension.ORIGIN.y + 1.2,
                PocketDimension.ORIGIN.z + 12
            ),
            rotation: Math.PI,
        }
    }

    isNearExit(playerPos, radius = 3.8)
    {
        const exit = this.w(0, 1.5, -20)
        return playerPos.distanceTo(new THREE.Vector3(exit.x, exit.y, exit.z)) < radius
    }

    update(elapsed)
    {
        if(!this.active)
            return

        const floor = this.game.world?.floor
        if(floor?.mesh)
            floor.mesh.visible = false
        if(floor?.physical?.body)
            floor.physical.body.setEnabled(false)
        if(floor?.bedRock?.physical?.body)
        {
            floor.bedRock.enabled = false
            floor.bedRock.physical.body.setEnabled(false)
        }
        const water = this.game.world?.waterSurface
        if(water?.mesh)
            water.mesh.visible = false
        if(water?.ice?.physical?.body)
            water.ice.physical.body.setEnabled(false)

        for(const f of this.floaters)
        {
            if(f.orbit)
            {
                f.orbit.angle += f.orbit.speed * 0.016
                f.mesh.position.x = Math.cos(f.orbit.angle) * f.orbit.radius
                f.mesh.position.z = Math.sin(f.orbit.angle) * f.orbit.radius
            }
            f.mesh.position.y = f.baseY + Math.sin(elapsed * 1.8 + f.phase) * f.amp
        }
        for(const s of this.spinners)
        {
            if(s.axis === 'y')
                s.mesh.rotation.y += s.speed * 0.016
            else
                s.mesh.rotation.z += s.speed * 0.016
        }
        if(this.exitPortalMesh)
            this.exitPortalMesh.rotation.z = -elapsed * 1.1
        if(this.exitInner)
            this.exitInner.rotation.z = elapsed * 1.6
    }
}
