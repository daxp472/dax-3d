import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

/**
 * Hell Dimension — sealed arena far from the folio map.
 * Placed at ground Y (focusPoint tracks XZ at y=0) so the camera stays inside hell,
 * not on the race track under a sky spawn.
 */
export class PocketDimension
{
    /** Far from map (±100). Camera far=200 → main island never visible. */
    static ORIGIN = new THREE.Vector3(420, 0, 420)
    static HALF = 22

    constructor()
    {
        this.game = Game.getInstance()
        this.active = false
        this.group = new THREE.Group()
        this.group.name = 'hellDimension'
        this.group.visible = false
        this.group.position.copy(PocketDimension.ORIGIN)
        this.game.scene.add(this.group)

        this.physicsBodies = []
        this.knockables = []
        this.floaters = []
        this._savedFloorVisible = true
        this._savedWaterVisible = true
        this._savedBedRock = false

        this.buildArena()
        this.buildHellDecor()
        this.buildKnockables()
        this.buildExitGate()
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

    buildArena()
    {
        const H = PocketDimension.HALF
        const wallH = 12
        const thick = 1.4

        // Sealed black outer shell (camera can sit outside play walls)
        const shell = H + 14
        const shellH = 18
        const outerFloor = new THREE.Mesh(
            new THREE.BoxGeometry(shell * 2, 1.5, shell * 2),
            this.mat('#050000')
        )
        outerFloor.position.set(0, -0.75, 0)
        this.group.add(outerFloor)

        const outerWalls = [
            { x: 0, z: shell, sx: shell + 1, sz: thick },
            { x: 0, z: -shell, sx: shell + 1, sz: thick },
            { x: shell, z: 0, sx: thick, sz: shell + 1 },
            { x: -shell, z: 0, sx: thick, sz: shell + 1 },
        ]
        for(const w of outerWalls)
        {
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(w.sx * 2, shellH, w.sz * 2),
                this.mat('#080000')
            )
            wall.position.set(w.x, shellH * 0.5 - 0.5, w.z)
            this.group.add(wall)
        }
        const outerCeil = new THREE.Mesh(
            new THREE.BoxGeometry(shell * 2 + 4, 1.2, shell * 2 + 4),
            this.mat('#020000')
        )
        outerCeil.position.y = shellH - 0.4
        this.group.add(outerCeil)

        // Playable floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(H * 2 + 2, 0.8, H * 2 + 2),
            this.mat('#1a0505')
        )
        floor.position.set(0, -0.35, 0)
        this.group.add(floor)

        for(let i = 0; i < 10; i++)
        {
            const crack = new THREE.Mesh(
                new THREE.BoxGeometry(0.35 + Math.random(), 0.08, 4 + Math.random() * 6),
                this.mat('#ff3b1f')
            )
            crack.position.set((Math.random() - 0.5) * (H * 1.6), 0.06, (Math.random() - 0.5) * (H * 1.6))
            crack.rotation.y = Math.random() * Math.PI
            this.group.add(crack)
        }

        const walls = [
            { x: 0, z: H + thick * 0.5, sx: H + 2, sz: thick },
            { x: 0, z: -(H + thick * 0.5), sx: H + 2, sz: thick },
            { x: H + thick * 0.5, z: 0, sx: thick, sz: H + 2 },
            { x: -(H + thick * 0.5), z: 0, sx: thick, sz: H + 2 },
        ]
        for(const w of walls)
        {
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(w.sx * 2, wallH, w.sz * 2),
                this.mat('#0d0202')
            )
            wall.position.set(w.x, wallH * 0.5 - 0.2, w.z)
            this.group.add(wall)
        }

        const disc = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.2, 0.2, 5), this.mat('#3a0a0a'))
        disc.position.y = 0.08
        this.group.add(disc)
        const ring = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.15, 8, 5), this.mat('#ff544d'))
        ring.rotation.x = Math.PI / 2
        ring.position.y = 0.22
        this.group.add(ring)
        this.centerRing = ring
    }

    buildHellDecor()
    {
        for(const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10], [0, 16], [0, -16]])
        {
            const ob = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6, 1.4), this.mat('#2b0a0a'))
            ob.position.set(x, 3, z)
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 4), this.mat('#ff3b1f'))
            tip.position.set(x, 6.8, z)
            this.group.add(ob, tip)
        }

        for(let i = 0; i < 22; i++)
        {
            const ember = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), this.mat('#ffb703'))
            ember.position.set(
                (Math.random() - 0.5) * 36,
                1 + Math.random() * 7,
                (Math.random() - 0.5) * 36
            )
            this.group.add(ember)
            this.floaters.push({
                mesh: ember,
                baseY: ember.position.y,
                phase: Math.random() * 10,
                amp: 0.4,
            })
        }
    }

    /**
     * Knockable crates — world-space meshes so Objects physics→visual sync is correct.
     */
    buildKnockables()
    {
        const specs = [
            { x: -6, z: 4, sx: 0.7, sy: 0.7, sz: 0.7, hex: '#8b1e1e' },
            { x: -4.5, z: 5.2, sx: 0.55, sy: 0.55, sz: 0.55, hex: '#5c0a0a' },
            { x: 7, z: -3, sx: 0.8, sy: 1.1, sz: 0.8, hex: '#3d1515' },
            { x: 5.5, z: -4.2, sx: 0.6, sy: 0.6, sz: 0.6, hex: '#ff544d' },
            { x: -8, z: -5, sx: 1.0, sy: 0.5, sz: 1.0, hex: '#2a1010' },
            { x: 3, z: 8, sx: 0.65, sy: 0.9, sz: 0.65, hex: '#6b1d1d' },
            { x: -2, z: -8, sx: 0.9, sy: 0.7, sz: 0.9, hex: '#4a0f0f' },
            { x: 9, z: 6, sx: 0.5, sy: 1.3, sz: 0.5, hex: '#240606' },
            { x: -9, z: 2, sx: 1.1, sy: 0.45, sz: 0.7, hex: '#c1121f' },
            { x: 1, z: 3, sx: 0.75, sy: 0.75, sz: 0.75, hex: '#780000' },
            { x: 4, z: 1, sx: 0.45, sy: 0.9, sz: 0.45, hex: '#ff6b35' },
            { x: -5, z: -2, sx: 0.85, sy: 0.55, sz: 0.85, hex: '#3d1515' },
        ]

        for(const s of specs)
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
                    friction: 0.45,
                    restitution: 0.22,
                    linearDamping: 0.12,
                    angularDamping: 0.28,
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
    }

    buildExitGate()
    {
        const gate = new THREE.Group()
        gate.position.set(0, 0, -18)
        const left = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 1), this.mat('#ffb703'))
        left.position.set(-3, 2.5, 0)
        const right = left.clone()
        right.position.x = 3
        const top = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 1), this.mat('#ff544d'))
        top.position.set(0, 5.2, 0)
        const portal = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.4, 24), this.mat('#7b5cff'))
        portal.rotation.x = Math.PI / 2
        portal.position.set(0, 2.4, 0)
        gate.add(left, right, top, portal)
        this.group.add(gate)
        this.exitGate = gate
        this.exitPortalMesh = portal
    }

    buildPhysicsShell()
    {
        const H = PocketDimension.HALF
        const wallH = 7
        const oy = PocketDimension.ORIGIN.y
        const ox = PocketDimension.ORIGIN.x
        const oz = PocketDimension.ORIGIN.z

        this.addFixedBody(
            { x: ox, y: oy - 0.4, z: oz },
            [ H + 1, 0.4, H + 1 ],
            'floor'
        )

        const walls = [
            { x: ox, y: oy + wallH * 0.5, z: oz + H + 0.5, p: [ H + 1, wallH * 0.5, 0.5 ] },
            { x: ox, y: oy + wallH * 0.5, z: oz - H - 0.5, p: [ H + 1, wallH * 0.5, 0.5 ] },
            { x: ox + H + 0.5, y: oy + wallH * 0.5, z: oz, p: [ 0.5, wallH * 0.5, H + 1 ] },
            { x: ox - H - 0.5, y: oy + wallH * 0.5, z: oz, p: [ 0.5, wallH * 0.5, H + 1 ] },
        ]

        for(const w of walls)
            this.addFixedBody({ x: w.x, y: w.y, z: w.z }, w.p)

        for(const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10], [0, 16], [0, -16]])
            this.addFixedBody(this.w(x, 3, z), [ 0.7, 3, 0.7 ])
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
        const worldExit = this.w(0, 2.8, -18)
        this.exitPoint = this.game.interactivePoints.create(
            new THREE.Vector3(worldExit.x, worldExit.y, worldExit.z),
            'Escape Hell',
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

    /** Hide folio terrain/water under the hell arena. */
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
            if(on)
            {
                this._savedBedRock = floor.bedRock.enabled
                floor.bedRock.enabled = false
                floor.bedRock.physical.body.setEnabled(false)
            }
            else
            {
                floor.bedRock.enabled = false
            }
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
                PocketDimension.ORIGIN.y + 1.35,
                PocketDimension.ORIGIN.z + 10
            ),
            rotation: Math.PI,
        }
    }

    isNearExit(playerPos, radius = 3.8)
    {
        const exit = this.w(0, 1.5, -18)
        return playerPos.distanceTo(new THREE.Vector3(exit.x, exit.y, exit.z)) < radius
    }

    update(elapsed)
    {
        if(!this.active)
            return

        // Floor.update may re-enable bedrock outside the island — keep hell isolated
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
            f.mesh.position.y = f.baseY + Math.sin(elapsed * 1.6 + f.phase) * f.amp
            f.mesh.rotation.y += 0.02
        }
        if(this.centerRing)
            this.centerRing.rotation.z = elapsed * 0.4
        if(this.exitPortalMesh)
            this.exitPortalMesh.rotation.z = -elapsed * 1.5
    }
}
