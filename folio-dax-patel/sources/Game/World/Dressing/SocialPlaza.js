import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { VoxelPatron, vibeMat } from './VoxelPatron.js'

/**
 * Social plaza dressing — placed in EMPTY gaps between existing GLB props
 * (statue apron ~26,-18 · OF ~39,-33 · social icons around that ring).
 */
export class SocialPlaza
{
    constructor()
    {
        this.game = Game.getInstance()
        this.group = new THREE.Group()
        this.group.name = 'socialPlaza'
        this.game.scene.add(this.group)

        this.patrons = []
        this.bobbers = []

        // North apron edge — clear of baguira/boy/sudo (~26,-18)
        this.addPatron({
            name: 'socialFanA',
            position: { x: 22.4, y: 0.72, z: -14.6 },
            yaw: 0.6,
            drink: 'coffee',
            outfit: 'cocoa',
            phase: 0.5,
        })
        this.addPatron({
            name: 'socialFanB',
            position: { x: 29.6, y: 0.72, z: -14.9 },
            yaw: -1.0,
            drink: 'chai',
            outfit: 'sand',
            phase: 2.0,
        })

        // Between youtube (30.9,-24.2) and onlyfans (39.6,-33.2) — west of OF
        this.addPatron({
            name: 'ofCorner',
            position: { x: 36.2, y: 0.72, z: -30.4 },
            yaw: 2.4,
            drink: 'coffee',
            outfit: 'olive',
            phase: 1.4,
        })

        // Gap east of bluesky (33,-21) / west of x (33.8,-18)
        this.buildChaiCart(31.4, -16.2)
        // Open patch south of discord/linkedin ring
        this.buildStickerCrate(21.2, -22.8)
        this.buildStickerCrate(34.8, -27.6)
        this.buildNeonPillar(28.8, -20.6)
        this.buildNeonPillar(35.6, -24.8)

        // Collision for patrons (fixed so car bumps them)
        for(const p of this.patrons)
        {
            const pos = p.group.position
            this.addFixedCollider(pos.x, 0.55, pos.z, [ 0.35, 0.55, 0.35 ])
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
            new THREE.Vector3(22.8, 1.4, -15.0),
            'Social Lounge',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.notifications.show(
                    `<div class="top"><div class="title">Social plaza</div></div><div class="bottom"><div class="description">Links, fans, chai. Not a copy — Dax hangout.</div></div>`,
                    'social-plaza',
                    2.5,
                    null,
                    'social-plaza'
                )
            },
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    addPatron(options)
    {
        const p = new VoxelPatron(options)
        this.group.add(p.group)
        this.patrons.push(p)
    }

    buildChaiCart(x, z)
    {
        const g = new THREE.Group()
        g.position.set(x, 0, z)
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.8), vibeMat('#f0a202'))
        body.position.y = 0.55
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.0), vibeMat('#e85d04'))
        roof.position.y = 1.2
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.28, 8), vibeMat('#c9a227'))
        pot.position.set(0.3, 1.15, 0)
        g.add(body, roof, pot)
        this.group.add(g)
        this.addFixedCollider(x, 0.55, z, [ 0.7, 0.55, 0.45 ])
    }

    buildStickerCrate(x, z)
    {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.7), vibeMat('#6c584c'))
        crate.position.set(x, 0.35, z)
        crate.rotation.y = 0.3
        crate.castShadow = true
        this.game.scene.add(crate)

        const sticker = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.04), vibeMat('#ff006e'))
        sticker.position.set(x, 0.55, z + 0.36)
        this.group.add(sticker)
        this.bobbers.push({ mesh: sticker, baseY: 0.55, phase: Math.random() * 4 })

        this.game.objects.add(
            { model: crate, parent: this.game.scene, updateMaterials: false },
            {
                type: 'dynamic',
                position: { x, y: 0.35, z },
                friction: 0.4,
                restitution: 0.15,
                sleeping: true,
                colliders: [
                    { shape: 'cuboid', parameters: [ 0.45, 0.35, 0.35 ], position: { x: 0, y: 0, z: 0 }, category: 'object' },
                ],
            }
        )
    }

    buildNeonPillar(x, z)
    {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.4, 8), vibeMat('#240046'))
        pole.position.set(x, 1.2, z)
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), vibeMat('#00f5d4'))
        glow.position.set(x, 2.5, z)
        this.group.add(pole, glow)
        this.bobbers.push({ mesh: glow, baseY: 2.5, phase: x, pulse: true })
        this.addFixedCollider(x, 1.2, z, [ 0.14, 1.2, 0.14 ])
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
        const player = this.game.player?.position
        for(const p of this.patrons)
            p.update(elapsed, player)
        for(const b of this.bobbers)
        {
            if(b.pulse)
            {
                const s = 1 + Math.sin(elapsed * 3 + b.phase) * 0.12
                b.mesh.scale.setScalar(s)
            }
            else
            {
                b.mesh.position.y = b.baseY + Math.sin(elapsed * 1.5 + b.phase) * 0.04
            }
        }
    }
}
