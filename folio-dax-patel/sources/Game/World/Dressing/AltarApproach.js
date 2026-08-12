import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { VoxelPatron, vibeMat } from './VoxelPatron.js'

/**
 * Altar approach road (respawn ~−14 → pit ~−28).
 * Keep clear of altar mesh (75.34, −27.95) and portal rim VFX.
 */
export class AltarApproach
{
    constructor()
    {
        this.game = Game.getInstance()
        this.group = new THREE.Group()
        this.group.name = 'altarApproach'
        this.game.scene.add(this.group)

        this.patrons = []
        this.torches = []

        // Side runes — not on road centerline
        for(let i = 0; i < 5; i++)
        {
            const z = -16.2 - i * 1.8
            const rune = new THREE.Mesh(
                new THREE.CylinderGeometry(0.32, 0.36, 0.08, 6),
                vibeMat(i % 2 ? '#ff544d' : '#7b5cff')
            )
            rune.position.set(75.3 + (i % 2 ? 1.35 : -1.35), 0.04, z)
            this.group.add(rune)
        }

        // Torches off the drive lane
        for(const z of [-16.8, -19.6, -22.4])
        {
            this.buildTorch(72.6, z)
            this.buildTorch(78.0, z)
        }

        // Witness off west shoulder
        this.addPatron({
            name: 'altarWitness',
            position: { x: 71.6, y: 0, z: -18.4 },
            yaw: 0.85,
            drink: 'chai',
            outfit: 'pearl',
            phase: 1.2,
            pose: 'standing',
        })

        // Shrine fragment east shoulder (before pit)
        const shrine = new THREE.Group()
        shrine.position.set(78.6, 0, -20.2)
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.8), vibeMat('#2b1b3d'))
        base.position.y = 0.15
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 0.35), vibeMat('#3a2060'))
        pillar.position.y = 1.0
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), vibeMat('#ff006e'))
        gem.position.y = 1.95
        shrine.add(base, pillar, gem)
        this.group.add(shrine)
        this.gem = gem

        // Sign near return spawn, slightly east
        const sign = new THREE.Group()
        sign.position.set(77.1, 0, -14.4)
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), vibeMat('#3d2c29'))
        post.position.y = 0.8
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), vibeMat('#1a0a14'))
        board.position.y = 1.7
        const edge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.05), vibeMat('#ff544d'))
        edge.position.y = 1.9
        sign.add(post, board, edge)
        this.group.add(sign)

        this.addFixedCollider(78.6, 0.9, -20.2, [ 0.55, 0.9, 0.4 ])
        for(const z of [-16.8, -19.6, -22.4])
        {
            this.addFixedCollider(72.6, 0.75, z, [ 0.12, 0.75, 0.12 ])
            this.addFixedCollider(78.0, 0.75, z, [ 0.12, 0.75, 0.12 ])
        }

        this.group.traverse((c) =>
        {
            if(c.isMesh)
            {
                c.castShadow = true
                c.receiveShadow = true
                c.frustumCulled = false
            }
        })

        this.chatPoint = this.game.interactivePoints.create(
            new THREE.Vector3(77.1, 1.5, -14.6),
            'Procession',
            InteractivePoints.ALIGN_LEFT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.notifications.show(
                    `<div class="top"><div class="title">Cataclysm Road</div></div><div class="bottom"><div class="description">Drive into the pit — The Soft Stack opens. Sacrifice still counts.</div></div>`,
                    'altar-approach',
                    2.8,
                    null,
                    'altar-approach'
                )
            },
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    buildTorch(x, z)
    {
        const g = new THREE.Group()
        g.position.set(x, 0, z)
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.5, 6), vibeMat('#3d2c29'))
        pole.position.y = 0.75
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 6), vibeMat('#ff6b35'))
        flame.position.y = 1.7
        g.add(pole, flame)
        this.group.add(g)
        this.torches.push(flame)
    }

    addPatron(options)
    {
        const p = new VoxelPatron(options)
        this.group.add(p.group)
        this.patrons.push(p)
    }

    addFixedCollider(x, y, z, halfExtents)
    {
        this.game.objects.add(null, {
            type: 'fixed',
            position: { x, y, z },
            friction: 0.4,
            colliders: [
                { shape: 'cuboid', parameters: halfExtents, position: { x: 0, y: 0, z: 0 }, category: 'object' },
            ],
        })
    }

    update(elapsed)
    {
        for(const p of this.patrons)
            p.update(elapsed, this.game.player?.position)
        for(const f of this.torches)
        {
            f.scale.y = 0.85 + Math.sin(elapsed * 8 + f.position.z) * 0.2
            f.rotation.y = elapsed * 2
        }
        if(this.gem)
        {
            this.gem.rotation.y = elapsed
            this.gem.position.y = 1.95 + Math.sin(elapsed * 2) * 0.08
        }
    }
}
