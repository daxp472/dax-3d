import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'
import {
    hellMat,
    makeAshField,
    makeBonePile,
    makeDragScene,
    makeFloatingLava,
    makeHellDragon,
    makeHellGate,
    makeLavaPool,
    makeThroneOfHell,
    makeTorturePillar,
} from './HellProps.js'

/**
 * Inferno pocket — lava, demons, dragon, throne of the King of Hell.
 * Sealed arena at (420, 0, 420). Ground Y = 0; camera focus Y stays 0 in parent space.
 */
export class PocketDimension
{
    static ORIGIN = new THREE.Vector3(420, 0, 420)
    static HALF = 24
    static TITLE = 'Inferno'

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
        this.lavaMeshes = []
        this.dragScenes = []
        this.torturePosts = []
        this.ashField = null
        this.dragon = null
        this.throne = null
        this._savedFloorVisible = true
        this._savedWaterVisible = true

        this.buildShell()
        this.buildLavaRivers()
        this.buildAshAndEmbers()
        this.buildThroneCourt()
        this.buildTortureRing()
        this.buildDragParades()
        this.buildDragon()
        this.buildExitGate()
        this.buildPhysicsShell()
        this.setInteract()

        this.group.traverse((c) =>
        {
            if(c.isMesh)
            {
                c.castShadow = true
                c.receiveShadow = true
                c.frustumCulled = false
            }
        })
    }

    mat(hex, opts = {})
    {
        return new MeshDefaultMaterial({
            colorNode: color(hex),
            hasWater: false,
            hasFog: opts.hasFog ?? false,
            hasReveal: false,
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
        const H = 18

        // Cracked obsidian floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(52, 0.9, 52),
            hellMat('#1a0808')
        )
        floor.position.set(0, -0.4, 0)
        this.group.add(floor)

        // Lava cracks in floor (flush decals)
        const crackSpots = [
            [0, 0, 4, 1.8], [-8, 6, 3, 1.2], [10, -5, 2.5, 1], [-12, -8, 3.5, 1.4],
            [6, 12, 2, 0.9], [-5, -14, 2.8, 1.1], [14, 8, 2.2, 1],
        ]
        for(const [x, z, r] of crackSpots)
        {
            const crack = new THREE.Mesh(
                new THREE.CylinderGeometry(r, r * 1.05, 0.04, 14),
                hellMat('#ff3300', { emissive: true })
            )
            crack.position.set(x, 0.02, z)
            this.group.add(crack)
            this.lavaMeshes.push({ mesh: crack, phase: x + z })
        }

        // Jagged rock walls
        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(R, R * 1.05, H, 32, 1, true),
            hellMat('#120404')
        )
        wall.position.y = H * 0.5 - 0.5
        this.group.add(wall)

        // Red-hot rim
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(R * 0.99, 0.45, 8, 40),
            hellMat('#ff2200', { emissive: true })
        )
        rim.rotation.x = Math.PI / 2
        rim.position.y = 0.1
        this.group.add(rim)

        // Smoky hell ceiling dome
        const ceil = new THREE.Mesh(
            new THREE.SphereGeometry(R * 0.97, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
            hellMat('#0d0202')
        )
        ceil.position.y = 2
        ceil.rotation.x = Math.PI
        this.group.add(ceil)

        // Hanging rock spikes
        for(let i = 0; i < 14; i++)
        {
            const a = (i / 14) * Math.PI * 2
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.5 + (i % 3), 5), hellMat('#2a1010'))
            spike.position.set(Math.cos(a) * 15, 12 + (i % 4), Math.sin(a) * 15)
            spike.rotation.x = Math.PI
            spike.rotation.z = Math.sin(a) * 0.3
            this.group.add(spike)
        }

        // Spawn bridge over lava moat
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 8), hellMat('#2a1515'))
        bridge.position.set(0, 0.12, 16)
        this.group.add(bridge)
        this.addFixedBody(this.w(0, 0.2, 16), [ 2.5, 0.2, 4 ])
    }

    buildLavaRivers()
    {
        const pools = [
            { x: -10, z: 4, r: 4.5 },
            { x: 12, z: -6, r: 3.8 },
            { x: -6, z: -12, r: 3.2 },
            { x: 8, z: 10, r: 2.8 },
            { x: 0, z: -18, r: 5 },
        ]
        for(const p of pools)
        {
            const pool = makeLavaPool(p.x, p.z, p.r)
            this.group.add(pool)
            if(pool.userData.lavaPulse)
                this.lavaMeshes.push(pool.userData.lavaPulse)
        }

        const floats = [
            { x: -8, y: 2.2, z: 6, s: 1.1 },
            { x: 5, y: 3.5, z: -4, s: 0.85 },
            { x: -3, y: 2.8, z: -10, s: 1.0 },
            { x: 11, y: 4.2, z: 8, s: 0.7 },
            { x: -14, y: 3.0, z: -2, s: 0.9 },
        ]
        for(const f of floats)
        {
            const chunk = makeFloatingLava(f.x, f.y, f.z, f.s)
            this.group.add(chunk)
            if(chunk.userData.float)
                this.floaters.push(chunk.userData.float)
        }
    }

    buildAshAndEmbers()
    {
        this.ashField = makeAshField(180, 24, 16)
        this.group.add(this.ashField)
    }

    buildThroneCourt()
    {
        this.throne = makeThroneOfHell()
        this.throne.position.set(0, 0, -16)
        this.group.add(this.throne)
        this.addFixedBody(this.w(0, 0.6, -16), [ 5, 0.6, 4 ])
        this.addFixedBody(this.w(0, 3, -16), [ 2.5, 3, 1 ])

        this.group.add(makeBonePile(-6, -12, 0.4))
        this.group.add(makeBonePile(7, -13, -0.3))
        this.group.add(makeBonePile(-4, -18, 0.8))
    }

    buildTortureRing()
    {
        const spots = [
            [-16, 4], [16, 2], [-14, -6], [15, -8], [-8, 14], [10, 12],
        ]
        for(const [x, z] of spots)
        {
            const pillar = makeTorturePillar(x, z)
            this.group.add(pillar)
            if(pillar.userData.torture)
                this.torturePosts.push(pillar.userData.torture)
            this.addFixedBody(this.w(x, 1.75, z), [ 0.3, 1.75, 0.3 ])
        }
    }

    buildDragParades()
    {
        const parades = [
            { x: -6, z: 8, yaw: 0.6 },
            { x: 8, z: 4, yaw: -1.2 },
            { x: -10, z: -2, yaw: 2.1 },
            { x: 5, z: -10, yaw: -0.4 },
        ]
        for(const p of parades)
        {
            const scene = makeDragScene(p.x, p.z, p.yaw)
            this.group.add(scene)
            if(scene.userData.drag)
                this.dragScenes.push(scene.userData.drag)
        }
    }

    buildDragon()
    {
        this.dragon = makeHellDragon()
        this.group.add(this.dragon)
    }

    buildExitGate()
    {
        const gate = makeHellGate()
        gate.position.set(0, 0, 20)
        this.group.add(gate)
        this.exitPortalMesh = gate.userData.exitPortal?.outer
        this.exitInner = gate.userData.exitPortal?.inner
        this.addFixedBody(this.w(-3.5, 3, 20), [ 0.7, 3, 0.7 ])
        this.addFixedBody(this.w(3.5, 3, 20), [ 0.7, 3, 0.7 ])
        this.addFixedBody(this.w(0, 6.2, 20), [ 4.5, 0.6, 0.8 ])
    }

    buildPhysicsShell()
    {
        const H = PocketDimension.HALF
        const ox = PocketDimension.ORIGIN.x
        const oy = PocketDimension.ORIGIN.y
        const oz = PocketDimension.ORIGIN.z

        this.addFixedBody({ x: ox, y: oy - 0.4, z: oz }, [ H + 2, 0.4, H + 2 ], 'floor')

        const wallH = 8
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
        const worldExit = this.w(0, 3.5, 20)
        this.exitPoint = this.game.interactivePoints.create(
            new THREE.Vector3(worldExit.x, worldExit.y, worldExit.z),
            'Escape',
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
                PocketDimension.ORIGIN.z + 14
            ),
            rotation: Math.PI,
        }
    }

    isNearExit(playerPos, radius = 3.8)
    {
        const exit = this.w(0, 1.5, 20)
        return playerPos.distanceTo(new THREE.Vector3(exit.x, exit.y, exit.z)) < radius
    }

    _tickAsh(elapsed)
    {
        if(!this.ashField?.userData?.ash)
            return
        const { speeds, spread, height } = this.ashField.userData.ash
        const pos = this.ashField.geometry.attributes.position
        for(let i = 0; i < speeds.length; i++)
        {
            let y = pos.getY(i) + speeds[i] * 0.012
            if(y > height)
                y = Math.random() * 2
            pos.setY(i, y)
            pos.setX(i, pos.getX(i) + Math.sin(elapsed * 0.5 + i) * 0.008)
        }
        pos.needsUpdate = true
    }

    _tickDragon(elapsed)
    {
        if(!this.dragon?.userData?.dragon)
            return
        const d = this.dragon.userData.dragon
        d.angle += d.orbitSpeed * 0.016
        this.dragon.position.set(
            Math.cos(d.angle) * d.orbitRadius,
            d.orbitY + Math.sin(elapsed * 0.8) * 1.2,
            Math.sin(d.angle) * d.orbitRadius * 0.65 - 4
        )
        this.dragon.rotation.y = -d.angle + Math.PI * 0.5
        d.wingL.rotation.z = 0.3 + Math.sin(elapsed * 3.5) * 0.55
        d.wingR.rotation.z = -0.3 - Math.sin(elapsed * 3.5) * 0.55
        if(d.fireGroup)
        {
            d.fireGroup.rotation.y = Math.sin(elapsed * 4) * 0.15
            for(let i = 0; i < d.fireGroup.children.length; i++)
            {
                const ember = d.fireGroup.children[i]
                ember.position.x = 0.2 + i * 0.35 + Math.sin(elapsed * 6 + i) * 0.1
                ember.scale.setScalar(0.8 + Math.sin(elapsed * 8 + i) * 0.35)
            }
        }
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

        for(const l of this.lavaMeshes)
        {
            if(!l.mesh)
                continue
            const pulse = 0.85 + Math.sin(elapsed * 2.2 + l.phase) * 0.15
            l.mesh.scale.set(pulse, 1, pulse)
        }

        for(const f of this.floaters)
        {
            if(!f.mesh)
                continue
            f.mesh.position.y = f.baseY + Math.sin(elapsed * 1.4 + f.phase) * f.amp
            f.mesh.position.x += Math.sin(elapsed * 0.6 + f.phase) * f.drift * 0.004
        }

        for(const d of this.dragScenes)
        {
            d.demon.position.x = Math.sin(elapsed * 0.4 + d.phase) * 0.15
            d.victim.position.z = 0.6 + Math.sin(elapsed * 0.4 + d.phase) * 0.25
            d.victim.rotation.z = Math.sin(elapsed * 1.2 + d.phase) * 0.12
        }

        for(const t of this.torturePosts)
            t.victim.rotation.y = Math.sin(elapsed * 0.8 + t.phase) * 0.2

        if(this.throne?.userData?.throneFlames)
        {
            for(const flame of this.throne.userData.throneFlames)
            {
                flame.scale.y = 0.8 + Math.sin(elapsed * 5) * 0.35
                flame.rotation.y = elapsed * 2
            }
        }

        this._tickAsh(elapsed)
        this._tickDragon(elapsed)

        if(this.exitPortalMesh)
            this.exitPortalMesh.rotation.z = -elapsed * 1.4
        if(this.exitInner)
            this.exitInner.rotation.z = elapsed * 2.2
    }
}
