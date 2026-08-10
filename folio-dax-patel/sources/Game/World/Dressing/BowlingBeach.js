import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { vibeMat, VoxelPatron } from './VoxelPatron.js'

/**
 * Beach club at player-recorded shore point (−27.4, 74.3).
 * Local offsets cluster around ORIGIN (world XZ).
 */
export class BowlingBeach
{
    static ORIGIN = { x: -27.398, z: 74.268 }

    constructor()
    {
        this.game = Game.getInstance()
        this.group = new THREE.Group()
        this.group.name = 'bowlingBeach'
        this.game.scene.add(this.group)

        this.floaters = []
        this.patrons = []
        const O = BowlingBeach.ORIGIN

        this.buildSandPad(O.x, O.z)
        // Cluster around recorded drive point
        this.buildUmbrella({ x: O.x - 2.4, z: O.z + 1.1, yaw: 0.35, canopy: '#ff6b35', pole: '#f4f0e6' })
        this.buildUmbrella({ x: O.x + 2.1, z: O.z + 0.4, yaw: -0.55, canopy: '#7b5cff', pole: '#f4f0e6' })
        this.buildLounger({ x: O.x - 1.2, z: O.z + 1.8, yaw: 0.4 })
        this.buildLounger({ x: O.x + 1.0, z: O.z + 1.5, yaw: -0.5 })
        this.addLoungerPatron({ x: O.x - 1.2, z: O.z + 1.8, yaw: 0.4, outfit: 'rose', phase: 0.8 })
        this.addLoungerPatron({ x: O.x + 1.0, z: O.z + 1.5, yaw: -0.5, outfit: 'indigo', phase: 1.6, drink: 'coffee' })
        this.buildChaiCooler({ x: O.x, z: O.z + 0.9 })
        this.buildTowel({ x: O.x - 3.2, z: O.z + 2.0, yaw: 0.25 })
        this.buildSurfboard({ x: O.x + 3.4, z: O.z + 0.6, yaw: 1.05 })
        this.buildSandcastle({ x: O.x - 0.4, z: O.z - 1.4 })
        this.buildBeachBall({ x: O.x + 0.8, z: O.z + 2.4 })
        this.buildFlipFlops({ x: O.x - 1.8, z: O.z + 2.2 })
        this.buildPalmStub({ x: O.x + 4.6, z: O.z - 0.2 })
        this.buildPalmStub({ x: O.x - 4.2, z: O.z + 1.4 })
        this.buildDriftWood({ x: O.x + 1.6, z: O.z - 2.0 })
        this.setSign(O.x + 3.0, O.z + 1.6)
        this.setInteract(O.x, O.z + 0.9)
        this.clearNearbyFoliage(O.x, O.z, 10)

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

    /** Warm sand disc so the club reads as beach, not grass island. */
    buildSandPad(x, z)
    {
        const wet = new THREE.Mesh(
            new THREE.CylinderGeometry(9.8, 10.2, 0.06, 40),
            vibeMat('#d4a574', true)
        )
        wet.position.set(x, 0.03, z)
        const dry = new THREE.Mesh(
            new THREE.CylinderGeometry(8.2, 8.5, 0.08, 40),
            vibeMat('#e9c46a', true)
        )
        dry.position.set(x, 0.06, z)
        // Soft shore ripples
        for(let i = 0; i < 6; i++)
        {
            const a = (i / 6) * Math.PI * 2
            const ripple = new THREE.Mesh(
                new THREE.TorusGeometry(7.2 + i * 0.35, 0.04, 6, 28),
                vibeMat(i % 2 ? '#f4e3b0' : '#c9a227', true)
            )
            ripple.rotation.x = Math.PI / 2
            ripple.position.set(x, 0.09, z)
            ripple.scale.set(1, 1, 0.92 + (i % 3) * 0.03)
            this.group.add(ripple)
        }
        this.group.add(wet, dry)
    }

    /** Hide bush/flower instances planted on the beach pad. */
    clearNearbyFoliage(cx, cz, radius)
    {
        const targets = [
            this.game.world?.bushes?.foliage,
            this.game.world?.flowers?.foliage,
        ]
        const m = new THREE.Matrix4()
        const p = new THREE.Vector3()
        const q = new THREE.Quaternion()
        const s = new THREE.Vector3()

        for(const foliage of targets)
        {
            const mesh = foliage?.mesh
            if(!mesh?.isInstancedMesh)
                continue

            for(let i = 0; i < mesh.count; i++)
            {
                mesh.getMatrixAt(i, m)
                m.decompose(p, q, s)
                if(Math.hypot(p.x - cx, p.z - cz) < radius)
                {
                    s.set(0, 0, 0)
                    m.compose(p, q, s)
                    mesh.setMatrixAt(i, m)
                }
            }
            mesh.instanceMatrix.needsUpdate = true
        }
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
    }

    addLoungerPatron({ x, z, yaw, outfit, phase, drink = 'chai' })
    {
        const patron = new VoxelPatron({
            name: 'beachLounger',
            position: { x, y: 0.32, z },
            yaw,
            outfit,
            phase,
            drink,
            pose: 'lounger',
        })
        this.patrons.push(patron)
        this.group.add(patron.group)
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
    }

    buildTowel({ x, z, yaw })
    {
        const g = new THREE.Group()
        g.position.set(x, 0.02, z)
        g.rotation.y = yaw
        const towel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 1.6), vibeMat('#5b4dff', true))
        for(let i = 0; i < 3; i++)
        {
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 0.035, 0.12),
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
        g.position.set(x, 0.05, z)
        g.rotation.y = yaw
        g.rotation.z = 0.15
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 2.2), vibeMat('#9b5de5', true))
        board.position.y = 0.9
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 2.0), vibeMat('#00f5d4', true))
        stripe.position.y = 0.9
        g.add(board, stripe)
        this.group.add(g)
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
    }

    buildBeachBall({ x, z })
    {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), vibeMat('#ff006e', true))
        ball.position.set(x, 0.28, z)
        this.group.add(ball)
        this.floaters.push({ mesh: ball, baseY: 0.28, phase: Math.random() * 6, amp: 0.06, spin: 0.4 })
    }

    buildFlipFlops({ x, z })
    {
        const g = new THREE.Group()
        g.position.set(x, 0.03, z)
        const mat = vibeMat('#00bbf9', true)
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.5), mat)
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
    }

    buildDriftWood({ x, z })
    {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.4, 8), vibeMat('#6f4e37', true))
        log.rotation.z = Math.PI / 2
        log.position.set(x, 0.12, z)
        this.group.add(log)
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
                    `<div class="top"><div class="title">Seafront Club</div></div><div class="bottom"><div class="description">Chai on the shore. Water's right there — don't drive in… unless you mean to.</div></div>`,
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
        const playerPos = this.game.player?.position ?? null
        for(const p of this.patrons)
            p.update(elapsed, playerPos)
    }
}
