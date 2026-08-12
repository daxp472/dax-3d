import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { vibeMat } from './VoxelPatron.js'

/**
 * Beach club at (−27.4, 74.3).
 * CENTER stays clear sand (map TP + drive lane). Props sit on a ring.
 * Rule: solid props get Rapier fixed colliders; flush decals do not.
 */
export class BowlingBeach
{
    static ORIGIN = { x: -27.398, z: 74.268 }
    /** Clear sand pad for map teleport — south of lounge gear (land side). */
    static SPAWN = { x: -27.4, z: 70.6, rotation: 0 }

    constructor()
    {
        this.game = Game.getInstance()
        this.group = new THREE.Group()
        this.group.name = 'bowlingBeach'
        this.game.scene.add(this.group)

        this.floaters = []
        const O = BowlingBeach.ORIGIN

        // —— West lounge (off-center) ——
        this.buildUmbrella({ x: O.x - 4.2, z: O.z + 1.6, yaw: 0.35, canopy: '#ff6b35', pole: '#f4f0e6' })
        this.buildLounger({ x: O.x - 4.0, z: O.z + 2.5, yaw: 0.35 })
        this.buildTowelDecal({ x: O.x - 5.4, z: O.z + 2.2, yaw: 0.25 })
        this.buildFlipFlops({ x: O.x - 3.4, z: O.z + 2.8 })

        // —— East lounge (off-center) ——
        this.buildUmbrella({ x: O.x + 4.4, z: O.z + 1.2, yaw: -0.55, canopy: '#7b5cff', pole: '#f4f0e6' })
        this.buildLounger({ x: O.x + 4.2, z: O.z + 2.2, yaw: -0.5 })
        this.buildBeachBall({ x: O.x + 5.2, z: O.z + 2.6 })
        this.buildSurfboard({ x: O.x + 5.8, z: O.z + 0.4, yaw: 1.05 })

        // —— Service / edge props (never on SPAWN) ——
        this.buildChaiCooler({ x: O.x + 5.5, z: O.z - 1.2 })
        this.buildSandcastle({ x: O.x - 1.2, z: O.z + 4.0 })
        this.buildDriftWood({ x: O.x + 1.8, z: O.z + 3.6 })
        this.buildPalmStub({ x: O.x + 7.2, z: O.z - 2.0 })
        this.buildPalmStub({ x: O.x - 7.0, z: O.z + 2.4 })

        this.setSign(O.x + 6.0, O.z - 2.4)
        this.setInteract(O.x + 6.0, O.z - 2.4)

        this.clearBeachCenter(O.x, O.z, 14)
        this.clearBeachCenter(-30.351, 79.58, 8)
        this.game.ticker?.wait?.(30, () =>
        {
            this.clearBeachCenter(O.x, O.z, 14)
            this.clearBeachCenter(-30.351, 79.58, 8)
        })
        this.game.ticker?.wait?.(120, () =>
        {
            this.clearBeachCenter(O.x, O.z, 14)
            this.clearBeachCenter(-30.351, 79.58, 8)
        })

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

    addFixedCollider(x, y, z, halfExtents)
    {
        this.game.objects.add(null, {
            type: 'fixed',
            friction: 0.5,
            restitution: 0.05,
            position: { x, y, z },
            colliders: [
                {
                    shape: 'cuboid',
                    parameters: halfExtents,
                    position: { x: 0, y: 0, z: 0 },
                    category: 'object',
                },
            ],
        })
    }

    clearBeachCenter(cx, cz, radius = 14)
    {
        const center = { x: cx, z: cz }
        this.game.world?.bushes?.foliage?.hideNear?.(center, radius)
        this.game.world?.flowers?.hideNear?.(center, radius)
        this.game.world?.birchTrees?.hideNear?.(center, radius)
        this.game.world?.oakTrees?.hideNear?.(center, radius)
        this.game.world?.cherryTrees?.hideNear?.(center, radius)
    }

    buildUmbrella({ x, z, yaw, canopy, pole })
    {
        const g = new THREE.Group()
        g.position.set(x, 0, z)
        g.rotation.y = yaw
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 8), vibeMat(pole, true))
        stick.position.y = 1.2
        const top = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.55, 10), vibeMat(canopy, true))
        top.position.y = 2.35
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 6, 16), vibeMat('#ffffff', true))
        ring.rotation.x = Math.PI / 2
        ring.position.y = 2.15
        g.add(stick, top, ring)
        this.group.add(g)
        this.addFixedCollider(x, 1.1, z, [ 0.12, 1.1, 0.12 ])
    }

    buildLounger({ x, z, yaw })
    {
        const g = new THREE.Group()
        g.position.set(x, 0, z)
        g.rotation.y = yaw
        const wood = vibeMat('#d4a574', true)
        const cloth = vibeMat('#ff8fab', true)
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 1.7), wood)
        base.position.y = 0.2
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 1.1), cloth)
        seat.position.set(0, 0.28, 0.15)
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.08), cloth)
        back.position.set(0, 0.55, -0.55)
        back.rotation.x = -0.45
        g.add(base, seat, back)
        this.group.add(g)
        this.addFixedCollider(x, 0.35, z, [ 0.55, 0.35, 0.95 ])
    }

    buildChaiCooler({ x, z })
    {
        const g = new THREE.Group()
        g.position.set(x, 0, z)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.55), vibeMat('#2ec4b6', true))
        body.position.y = 0.28
        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.58), vibeMat('#ffffff', true))
        lid.position.y = 0.58
        const label = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.02), vibeMat('#ffb703', true))
        label.position.set(0, 0.32, 0.28)
        for(let i = 0; i < 3; i++)
        {
            const bottle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6),
                vibeMat(i === 1 ? '#c45c26' : '#7b5cff', true)
            )
            bottle.position.set(-0.2 + i * 0.2, 0.72, 0)
            g.add(bottle)
        }
        g.add(body, lid, label)
        this.group.add(g)
        this.addFixedCollider(x, 0.35, z, [ 0.48, 0.35, 0.32 ])
    }

    buildTowelDecal({ x, z, yaw })
    {
        const g = new THREE.Group()
        g.position.set(x, 0.002, z)
        g.rotation.y = yaw
        const towel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.004, 1.6), vibeMat('#5b4dff', true))
        for(let i = 0; i < 3; i++)
        {
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 0.005, 0.12),
                vibeMat(i % 2 ? '#ff6b35' : '#ffffff', true)
            )
            stripe.position.z = -0.5 + i * 0.35
            g.add(stripe)
        }
        g.add(towel)
        this.group.add(g)
    }

    buildSurfboard({ x, z, yaw })
    {
        const g = new THREE.Group()
        g.position.set(x, 0, z)
        g.rotation.y = yaw
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.8, 0.08), vibeMat('#9b5de5', true))
        board.position.y = 0.9
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.09), vibeMat('#00f5d4', true))
        stripe.position.y = 0.9
        g.add(board, stripe)
        this.group.add(g)
        this.addFixedCollider(x, 0.9, z, [ 0.3, 0.9, 0.2 ])
    }

    buildSandcastle({ x, z })
    {
        const g = new THREE.Group()
        g.position.set(x, 0, z)
        const sand = vibeMat('#e9c46a', true)
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 8), sand)
        base.position.y = 0.18
        const keep = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.45), sand)
        keep.position.y = 0.55
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.45, 8), sand)
        tower.position.set(0.28, 0.7, 0.2)
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 5), vibeMat('#ffffff', true))
        pole.position.set(0, 1.05, 0)
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.02), vibeMat('#ff006e', true))
        flag.position.set(0.12, 1.18, 0)
        g.add(base, keep, tower, pole, flag)
        this.group.add(g)
        this.addFixedCollider(x, 0.4, z, [ 0.55, 0.4, 0.55 ])
    }

    buildBeachBall({ x, z })
    {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), vibeMat('#ff006e', true))
        ball.position.set(x, 0.28, z)
        this.group.add(ball)
        this.floaters.push({ mesh: ball, baseY: 0.28, phase: Math.random() * 6, amp: 0.06, spin: 0.4 })
        this.addFixedCollider(x, 0.28, z, [ 0.28, 0.28, 0.28 ])
    }

    buildFlipFlops({ x, z })
    {
        const g = new THREE.Group()
        g.position.set(x, 0.002, z)
        const mat = vibeMat('#00bbf9', true)
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.004, 0.5), mat)
        a.rotation.y = 0.2
        const b = a.clone()
        b.position.x = 0.28
        b.rotation.y = -0.15
        g.add(a, b)
        this.group.add(g)
    }

    buildPalmStub({ x, z })
    {
        const g = new THREE.Group()
        g.position.set(x, 0, z)
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.2, 7), vibeMat('#8d6e63', true))
        trunk.position.y = 1.1
        trunk.rotation.z = 0.08
        g.add(trunk)
        for(let i = 0; i < 5; i++)
        {
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 1.1), vibeMat('#2d6a4f', true))
            leaf.position.set(0, 2.15, 0)
            leaf.rotation.y = (i / 5) * Math.PI * 2
            leaf.rotation.x = -0.55
            g.add(leaf)
        }
        this.group.add(g)
        this.addFixedCollider(x, 1.0, z, [ 0.35, 1.0, 0.35 ])
    }

    buildDriftWood({ x, z })
    {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.4, 8), vibeMat('#6f4e37', true))
        log.rotation.z = Math.PI / 2
        log.position.set(x, 0.12, z)
        this.group.add(log)
        this.addFixedCollider(x, 0.15, z, [ 0.7, 0.15, 0.2 ])
    }

    setSign(x, z)
    {
        const g = new THREE.Group()
        g.position.set(x, 0, z)
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), vibeMat('#5c4033', true))
        post.position.y = 0.7
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 0.08), vibeMat('#7b5cff', true))
        board.position.set(0, 1.45, 0)
        const edge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.1), vibeMat('#ffb703', true))
        edge.position.set(0, 1.75, 0)
        g.add(post, board, edge)
        this.group.add(g)
        this.sign = g
        this.addFixedCollider(x, 0.9, z, [ 0.75, 0.9, 0.2 ])
    }

    setInteract(x, z)
    {
        this.chatPoint = this.game.interactivePoints.create(
            new THREE.Vector3(x, 1.2, z),
            'Beach Club',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.notifications.show(
                    `<div class="top"><div class="title">Seafront Club</div></div><div class="bottom"><div class="description">Clear sand mid-pad — lounge gear on the edges. Don't park in the chai cooler.</div></div>`,
                    'bowling-beach',
                    2.8,
                    null,
                    'bowling-beach'
                )
            },
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    update(elapsed)
    {
        for(const f of this.floaters)
        {
            f.mesh.position.y = f.baseY + Math.sin(elapsed * 2.2 + f.phase) * f.amp
            f.mesh.rotation.y += f.spin * 0.016
            f.mesh.rotation.x = Math.sin(elapsed + f.phase) * 0.15
        }
        if(this.sign)
            this.sign.rotation.y = Math.sin(elapsed * 0.5) * 0.05
    }
}
