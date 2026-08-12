import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'
import {
    HELL,
    hellMat,
    makeAshField,
    makeBasaltCluster,
    makeDragScene,
    makeHeatCrack,
    makeHellDragon,
    makeHellGate,
    makeImp,
    makeLavaBed,
    makePurpleShroom,
    makeScorchedTree,
    makeStoneBridge,
    makeStonePath,
    makeStoneStairs,
    makeVolcanoTemple,
} from './HellProps.js'

/**
 * Inferno — cute-fantasy-volcano layout.
 * Grey stone roads over orange lava. Temple north-west, spawn south.
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
        this.lavaMeshes = []
        this.dragScenes = []
        this.ashField = null
        this.dragon = null
        this.temple = null
        this._savedFloorVisible = true
        this._savedWaterVisible = true

        this.buildArena()
        this.buildPathNetwork()
        this.buildTempleCourt()
        this.buildLavaDecor()
        this.buildPathLife()
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

    w(x, y, z)
    {
        return {
            x: PocketDimension.ORIGIN.x + x,
            y: PocketDimension.ORIGIN.y + y,
            z: PocketDimension.ORIGIN.z + z,
        }
    }

    /** Add raised stone path + Rapier collider. */
    addPath(x, z, length, width, yaw = 0)
    {
        const path = yaw === 0
            ? makeStonePath(x, z, length, width, yaw)
            : makeStoneBridge(x, z, length, width, yaw)
        this.group.add(path)

        const h = path.userData.pathCollider?.deckH ?? 0.38
        const cos = Math.abs(Math.cos(yaw))
        const sin = Math.abs(Math.sin(yaw))
        const hx = (length * cos + width * sin) * 0.5
        const hz = (length * sin + width * cos) * 0.5
        this.addFixedBody(this.w(x, h * 0.5, z), [ hx, h * 0.5, hz ])
        return path
    }

    buildArena()
    {
        const R = PocketDimension.HALF + 12

        // Lava sea (orange/yellow — not flat red)
        const lava = makeLavaBed(48, 48)
        lava.position.y = 0
        this.group.add(lava)
        if(lava.userData.lavaPulse)
            this.lavaMeshes.push(...lava.userData.lavaPulse)

        // Volcanic rim wall
        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(R, R * 1.03, 16, 28, 1, true),
            hellMat(HELL.stoneEdge)
        )
        wall.position.y = 6
        this.group.add(wall)

        const rimGlow = new THREE.Mesh(
            new THREE.TorusGeometry(R * 0.99, 0.25, 6, 36),
            hellMat(HELL.lavaDark, { glow: true, fog: false })
        )
        rimGlow.rotation.x = Math.PI / 2
        rimGlow.position.y = 0.05
        this.group.add(rimGlow)
        this.lavaMeshes.push({ mesh: rimGlow, phase: 0.5 })

        // Smoky dome ceiling
        const ceil = new THREE.Mesh(
            new THREE.SphereGeometry(R * 0.96, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
            hellMat('#1a1520')
        )
        ceil.position.y = 3
        ceil.rotation.x = Math.PI
        this.group.add(ceil)

        this.ashField = makeAshField(90, 22, 14)
        this.group.add(this.ashField)
    }

    /**
     * Path network (reference layout):
     *   [Temple NW] ←bridge← junction ← spine → [Spawn S] → [Exit gate]
     *                      ↓
     *                 east bridge → overlook
     */
    buildPathNetwork()
    {
        // South spawn landing
        this.addPath(0, 15, 6, 5.5, 0)

        // Main spine (drive north toward temple)
        this.addPath(0, -1, 4.2, 30, Math.PI / 2)

        // Junction plaza
        this.addPath(0, -2, 7, 7, 0)

        // West bridge → temple island
        this.addPath(-7.5, -6, 11, 3.4, 0)
        this.addPath(-14, -11, 8, 7, 0)

        // Temple approach stairs
        const stairs = makeStoneStairs(-10.5, -7.5, 4, 3.4, 0, 0.32)
        this.group.add(stairs)
        this.addFixedBody(this.w(-10.5, 0.64, -9.1), [ 1.7, 0.64, 1.8 ])

        // East bridge + overlook platform
        this.addPath(7.5, 1, 10, 3.2, 0)
        this.addPath(14, 1, 6, 5.5, Math.PI / 2)

        // Heat cracks on spine (glow under tiles)
        for(const [x, z, yaw] of [
            [0, 10, 0], [0, 4, Math.PI / 2], [0, -6, Math.PI / 2], [-5, -6, 0.3], [6, 1, -0.2],
        ])
        {
            const crack = makeHeatCrack(x, z, 1.4, yaw)
            this.group.add(crack)
            if(crack.userData.lavaPulse)
                this.lavaMeshes.push(crack.userData.lavaPulse)
        }
    }

    buildTempleCourt()
    {
        this.temple = makeVolcanoTemple()
        this.temple.position.set(-14, 0.38, -13)
        this.temple.rotation.y = Math.PI * 0.08
        this.group.add(this.temple)
        this.addFixedBody(this.w(-14, 4, -13), [ 4.5, 4, 3.5 ])
    }

    buildLavaDecor()
    {
        // Basalt + shrooms only IN lava (off the roads)
        const basaltSpots = [
            [-11, 9], [11, 8], [-13, 3], [12, -7], [-9, -15], [10, -13], [-17, -2], [17, -3], [-8, 14], [9, 15],
        ]
        for(const [x, z] of basaltSpots)
            this.group.add(makeBasaltCluster(x, z, 4 + (Math.abs(x) % 3)))

        const shrooms = [ [-10, 7 ], [13, 5 ], [-15, -6 ], [11, -11 ] ]
        for(const [x, z] of shrooms)
            this.group.add(makePurpleShroom(x, z))
    }

    buildPathLife()
    {
        // Trees along path edges only
        const trees = [
            [-2.6, 11, 0.9], [2.6, 10, 1], [-2.8, 3, 0.85], [2.8, -4, 1.05],
            [-3.2, -9, 0.95], [3, -11, 0.8], [-16, -10, 1.1], [-12, -15, 0.9], [15, 2, 1],
        ]
        for(const [x, z, s] of trees)
            this.group.add(makeScorchedTree(x, z, s))

        // Imps guarding the roads (reference red minions)
        const imps = [
            { x: 0, z: 12, yaw: Math.PI },
            { x: -2.5, z: -1, yaw: 0.8 },
            { x: 2.5, z: -3, yaw: -0.6 },
            { x: -12, z: -9, yaw: 0.2 },
            { x: 13, z: 2, yaw: -1.4 },
        ]
        for(const imp of imps)
        {
            const m = makeImp({ scale: 1, yaw: imp.yaw })
            m.position.set(imp.x, 0.38, imp.z)
            this.group.add(m)
        }

        // Two drag scenes on side platforms only
        for(const p of [
            { x: 14, z: 3, yaw: -1.2 },
            { x: -11, z: -5, yaw: 0.5 },
        ])
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
        this.addFixedBody(this.w(0, 0.2, 20), [ 3, 0.2, 2.5 ])
        this.addFixedBody(this.w(-2.2, 2.6, 20), [ 0.45, 2.25, 0.45 ])
        this.addFixedBody(this.w(2.2, 2.6, 20), [ 0.45, 2.25, 0.45 ])
    }

    buildPhysicsShell()
    {
        const H = PocketDimension.HALF
        const ox = PocketDimension.ORIGIN.x
        const oy = PocketDimension.ORIGIN.y
        const oz = PocketDimension.ORIGIN.z
        const wallH = 7
        const walls = [
            { x: ox, y: oy + wallH * 0.5, z: oz + H + 0.5, p: [ H + 2, wallH * 0.5, 0.5 ] },
            { x: ox, y: oy + wallH * 0.5, z: oz - H - 0.5, p: [ H + 2, wallH * 0.5, 0.5 ] },
            { x: ox + H + 0.5, y: oy + wallH * 0.5, z: oz, p: [ 0.5, wallH * 0.5, H + 2 ] },
            { x: ox - H - 0.5, y: oy + wallH * 0.5, z: oz, p: [ 0.5, wallH * 0.5, H + 2 ] },
        ]
        for(const wall of walls)
            this.addFixedBody({ x: wall.x, y: wall.y, z: wall.z }, wall.p)
    }

    addFixedBody(position, halfExtents, category = 'object')
    {
        const object = this.game.objects.add(null, {
            type: 'fixed',
            friction: 0.5,
            restitution: 0.05,
            position,
            enabled: false,
            colliders: [
                { shape: 'cuboid', parameters: halfExtents, position: { x: 0, y: 0, z: 0 }, category },
            ],
        })
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
        const { speeds, height } = this.ashField.userData.ash
        const pos = this.ashField.geometry.attributes.position
        for(let i = 0; i < speeds.length; i++)
        {
            let y = pos.getY(i) + speeds[i] * 0.01
            if(y > height)
                y = Math.random() * 2
            pos.setY(i, y)
            pos.setX(i, pos.getX(i) + Math.sin(elapsed * 0.4 + i) * 0.006)
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
            d.orbitY + Math.sin(elapsed * 0.7) * 1,
            Math.sin(d.angle) * d.orbitRadius * 0.6 - 2
        )
        this.dragon.rotation.y = -d.angle + Math.PI * 0.5
        d.wingL.rotation.z = 0.25 + Math.sin(elapsed * 3.2) * 0.5
        d.wingR.rotation.z = -0.25 - Math.sin(elapsed * 3.2) * 0.5
        if(d.fireGroup)
        {
            for(let i = 0; i < d.fireGroup.children.length; i++)
            {
                const ember = d.fireGroup.children[i]
                ember.position.x = 0.15 + i * 0.3 + Math.sin(elapsed * 5 + i) * 0.08
                ember.scale.setScalar(0.75 + Math.sin(elapsed * 7 + i) * 0.3)
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
            const pulse = 0.9 + Math.sin(elapsed * 1.8 + (l.phase ?? 0)) * 0.1
            l.mesh.scale.set(pulse, 1, pulse)
        }

        if(this.temple?.userData?.sigil)
            this.temple.userData.sigil.rotation.z = elapsed * 0.4

        for(const d of this.dragScenes)
        {
            d.imp.position.x = Math.sin(elapsed * 0.35 + d.phase) * 0.12
            d.victim.position.z = 0.5 + Math.sin(elapsed * 0.35 + d.phase) * 0.2
        }

        this._tickAsh(elapsed)
        this._tickDragon(elapsed)

        if(this.exitPortalMesh)
            this.exitPortalMesh.rotation.z = -elapsed * 1.2
        if(this.exitInner)
            this.exitInner.rotation.z = elapsed * 1.8
    }
}
