import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { placeHellMinion, makeInfernoGateway } from './HellAssets.js'
import {
    HELL,
    hellMat,
    makeAshField,
    makeBasaltCluster,
    makeHeatCrack,
    makeHellDragon,
    makeLavaBed,
    makePurpleShroom,
    makeScorchedTree,
    makeStonePath,
    makeStoneStairs,
    makeVolcanoTemple,
} from './HellProps.js'

/**
 * Inferno — stone roads over visible lava. Entry SOUTH, exit NORTH (interact only).
 * Full physics floor so the car never falls through to main world.
 */
export class PocketDimension
{
    static ORIGIN = new THREE.Vector3(420, 0, 420)
    static HALF = 24
    static TITLE = 'Inferno'
  static ENTRY_Z = 16
  static EXIT_Z = -20

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
        this.mixers = []
        this.ashField = null
        this.dragon = null
        this.temple = null
        this.entryGate = null
        this.exitGate = null
        this._savedFloorVisible = true
        this._savedWaterVisible = true

        this.buildArena()
        this.buildPathNetwork()
        this.buildGateways()
        this.buildTempleCourt()
        this.buildLavaDecor()
        this.buildGltfDenizens()
        this.buildDragon()
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

    addPath(x, z, length, width, yaw = 0)
    {
        const path = makeStonePath(x, z, length, width, yaw)
        this.group.add(path)
        const h = path.userData.pathCollider?.deckH ?? 0.55
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

        // Lava sea — sits BELOW roads so orange glow is visible in gaps
        const lava = makeLavaBed(50, 50)
        lava.position.y = -0.05
        this.group.add(lava)
        if(lava.userData.lavaPulse)
            this.lavaMeshes.push(...lava.userData.lavaPulse)

        // Lava channels visible beside main spine
        for(const [x, z, w, d] of [
            [-6, 2, 3, 28], [6, 2, 3, 28], [-14, -8, 8, 4], [14, 2, 6, 4],
        ])
        {
            const channel = new THREE.Mesh(
                new THREE.BoxGeometry(w, 0.08, d),
                hellMat(HELL.lavaMid, { glow: true, fog: false })
            )
            channel.position.set(x, -0.12, z)
            this.group.add(channel)
            this.lavaMeshes.push({ mesh: channel, phase: x + z })
        }

        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(R, R * 1.03, 16, 28, 1, true),
            hellMat(HELL.stoneEdge)
        )
        wall.position.y = 6
        this.group.add(wall)

        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(R * 0.99, 0.3, 6, 36),
            hellMat(HELL.lavaDark, { glow: true, fog: false })
        )
        rim.rotation.x = Math.PI / 2
        rim.position.y = -0.02
        this.group.add(rim)
        this.lavaMeshes.push({ mesh: rim, phase: 0.3 })

        const ceil = new THREE.Mesh(
            new THREE.SphereGeometry(R * 0.96, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
            hellMat('#1a1520')
        )
        ceil.position.y = 3
        ceil.rotation.x = Math.PI
        this.group.add(ceil)

        this.ashField = makeAshField(70, 22, 12)
        this.group.add(this.ashField)
    }

    /**
     * Road layout (top-down):
     *   N [EXIT GATE] ← spine ← [ENTRY GATE] S
     *         ↖ west bridge → temple
     */
    buildPathNetwork()
    {
        // Entry landing (south — where you arrive from main world)
        this.addPath(0, PocketDimension.ENTRY_Z, 7, 6, 0)

        // Main spine north
        this.addPath(0, -1, 4.5, 32, Math.PI / 2)

        // Junction
        this.addPath(0, -2, 8, 8, 0)

        // West bridge → temple platform
        this.addPath(-7.5, -6, 11, 3.6, 0)
        this.addPath(-14, -11, 8.5, 7.5, 0)

        const stairs = makeStoneStairs(-10.5, -7.5, 4, 3.6, 0, 0.36)
        this.group.add(stairs)
        this.addFixedBody(this.w(-10.5, 0.72, -9.1), [ 1.8, 0.72, 1.8 ])

        // East branch
        this.addPath(7.5, 1, 10, 3.4, 0)
        this.addPath(14, 1, 6, 5.5, Math.PI / 2)

        // Exit platform (north — far from entry)
        this.addPath(0, PocketDimension.EXIT_Z, 7, 6, 0)

        // Heat cracks on spine
        for(const [x, z, yaw] of [
            [0, 10, Math.PI / 2], [0, 2, Math.PI / 2], [0, -8, Math.PI / 2], [-5, -6, 0.2],
        ])
        {
            const crack = makeHeatCrack(x, z, 1.6, yaw)
            this.group.add(crack)
            if(crack.userData.lavaPulse)
                this.lavaMeshes.push(crack.userData.lavaPulse)
        }

        // Path marker posts (readable like main-world lanterns)
        for(const [x, z] of [
            [3.2, 12], [-3.2, 6], [3.2, -2], [-3.2, -10], [3.2, -16],
        ])
        {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 6), hellMat(HELL.iron))
            post.position.set(x, 1.3, z)
            const lamp = new THREE.Mesh(
                new THREE.SphereGeometry(0.22, 8, 6),
                hellMat(HELL.lavaBright, { glow: true, fog: false })
            )
            lamp.position.set(x, 2.65, z)
            this.group.add(post, lamp)
        }
    }

    buildGateways()
    {
        // SOUTH — entry from main world (visual only, no exit here)
        this.entryGate = makeInfernoGateway({ name: 'infernoEntry', label: 'Inferno' })
        this.entryGate.position.set(0, 0, PocketDimension.ENTRY_Z + 2)
        this.group.add(this.entryGate)
        this.addFixedBody(this.w(0, 0.3, PocketDimension.ENTRY_Z + 2), [ 3.5, 0.3, 2.5 ])

        // NORTH — exit back to main world (interact only)
        this.exitGate = makeInfernoGateway({ name: 'infernoExit', label: 'Escape' })
        this.exitGate.position.set(0, 0, PocketDimension.EXIT_Z)
        this.group.add(this.exitGate)
        this.exitPortalMesh = this.exitGate.userData.gateway?.portal
        this.exitInner = this.exitGate.userData.gateway?.portalInner
        this.addFixedBody(this.w(0, 0.3, PocketDimension.EXIT_Z), [ 3.5, 0.3, 2.5 ])
        this.addFixedBody(this.w(-2.8, 3, PocketDimension.EXIT_Z), [ 0.45, 3, 0.45 ])
        this.addFixedBody(this.w(2.8, 3, PocketDimension.EXIT_Z), [ 0.45, 3, 0.45 ])
    }

    buildTempleCourt()
    {
        this.temple = makeVolcanoTemple()
        this.temple.position.set(-14, 0.55, -13)
        this.temple.rotation.y = Math.PI * 0.08
        this.group.add(this.temple)
        this.addFixedBody(this.w(-14, 4, -13), [ 4.5, 4, 3.5 ])
    }

    buildLavaDecor()
    {
        for(const [x, z] of [
            [-11, 9], [11, 8], [-13, 3], [12, -7], [-9, -15], [10, -13], [-17, -2], [17, -3],
        ])
            this.group.add(makeBasaltCluster(x, z, 4 + (Math.abs(x) % 3)))

        for(const [x, z] of [ [-10, 7 ], [13, 5 ], [-15, -6 ] ])
            this.group.add(makePurpleShroom(x, z))

        for(const [x, z, s] of [
            [-3, 11, 0.9], [3, 8, 1], [-3.2, 0, 0.85], [3, -6, 1], [-16, -10, 1.1], [15, 2, 0.95],
        ])
            this.group.add(makeScorchedTree(x, z, s))
    }

    buildGltfDenizens()
    {
        const guard = this.game.resources?.hellMinionGuard
        const king = this.game.resources?.hellMinionKing
        const flyer = this.game.resources?.hellMinionFlyer

        if(guard)
        {
            const spots = [
                { x: 2, z: 10, yaw: -2.2, s: 0.55 },
                { x: -2, z: 4, yaw: 0.6, s: 0.5 },
                { x: 12, z: 2, yaw: -1.4, s: 0.52 },
                { x: -11, z: -8, yaw: 0.3, s: 0.5 },
            ]
            for(const p of spots)
            {
                const placed = placeHellMinion(guard, { x: p.x, z: p.z, yaw: p.yaw, scale: p.s, y: 0.55 })
                this.group.add(placed.group)
                if(placed.mixer)
                    this.mixers.push(placed.mixer)
            }
        }

        if(king)
        {
            const placed = placeHellMinion(king, { x: -14, z: -11, yaw: Math.PI * 0.1, scale: 1.1, y: 0.55 })
            this.group.add(placed.group)
            if(placed.mixer)
                this.mixers.push(placed.mixer)
        }

        if(flyer)
        {
            const placed = placeHellMinion(flyer, { x: 5, z: -12, yaw: -0.8, scale: 0.65, y: 0.55 })
            this.group.add(placed.group)
            if(placed.mixer)
                this.mixers.push(placed.mixer)
        }
    }

    buildDragon()
    {
        this.dragon = makeHellDragon()
        this.group.add(this.dragon)
    }

    buildPhysicsShell()
    {
        const H = PocketDimension.HALF
        const ox = PocketDimension.ORIGIN.x
        const oy = PocketDimension.ORIGIN.y
        const oz = PocketDimension.ORIGIN.z

        // FULL arena floor — car never falls through to main world
        this.addFixedBody({ x: ox, y: oy + 0.28, z: oz }, [ H + 1, 0.28, H + 1 ], 'floor')

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
            friction: 0.55,
            restitution: 0.02,
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
        const worldExit = this.w(0, 3.8, PocketDimension.EXIT_Z)
        this.exitPoint = this.game.interactivePoints.create(
            new THREE.Vector3(worldExit.x, worldExit.y, worldExit.z),
            'Escape Inferno',
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
                PocketDimension.ORIGIN.y + 1.4,
                PocketDimension.ORIGIN.z + PocketDimension.ENTRY_Z
            ),
            rotation: Math.PI,
        }
    }

    isNearExit(playerPos, radius = 4)
    {
        const exit = this.w(0, 1.5, PocketDimension.EXIT_Z)
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

        const dt = this.game.ticker?.deltaScaled ?? 0.016

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
            const pulse = 0.92 + Math.sin(elapsed * 1.8 + (l.phase ?? 0)) * 0.08
            l.mesh.scale.set(pulse, 1, pulse)
        }

        if(this.temple?.userData?.sigil)
            this.temple.userData.sigil.rotation.z = elapsed * 0.4

        for(const mixer of this.mixers)
            mixer.update(dt)

        this._tickAsh(elapsed)
        this._tickDragon(elapsed)

        if(this.exitPortalMesh)
            this.exitPortalMesh.rotation.z = -elapsed * 1.2
        if(this.exitInner)
            this.exitInner.rotation.z = elapsed * 1.8
        if(this.entryGate?.userData?.gateway?.portal)
            this.entryGate.userData.gateway.portal.rotation.z = elapsed * 0.6
    }
}
