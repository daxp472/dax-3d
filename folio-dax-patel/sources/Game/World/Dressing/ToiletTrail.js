import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { vibeMat } from './VoxelPatron.js'

/**
 * Light trail dressing toward the lonely toilet peninsula.
 */
export class ToiletTrail
{
    constructor()
    {
        this.game = Game.getInstance()
        this.group = new THREE.Group()
        this.group.name = 'toiletTrail'
        this.game.scene.add(this.group)

        this.bobbers = []

        // Path markers from ~south approach toward cabin
        for(let i = 0; i < 5; i++)
        {
            const z = 56 + i * 2.2
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), vibeMat('#7b5cff'))
            cone.position.set(66.5 + (i % 2 ? 0.6 : -0.6), 0.25, z)
            this.group.add(cone)
            this.bobbers.push({ mesh: cone, baseY: 0.25, phase: i })
        }

        // Joke sign
        const sign = new THREE.Group()
        sign.position.set(68.5, 0, 62)
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), vibeMat('#5c4033'))
        post.position.y = 0.75
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.08), vibeMat('#2ec4b6'))
        board.position.y = 1.55
        sign.add(post, board)
        this.group.add(sign)

        // Moon-side mini glow (tease)
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), vibeMat('#ffb703'))
        glow.position.set(62.8, 1.2, 64.5)
        this.group.add(glow)
        this.bobbers.push({ mesh: glow, baseY: 1.2, phase: 2, pulse: true })

        this.group.traverse((c) =>
        {
            if(c.isMesh)
            {
                c.castShadow = true
                c.frustumCulled = false
            }
        })

        this.chatPoint = this.game.interactivePoints.create(
            new THREE.Vector3(68.5, 1.4, 62),
            'Rest Stop',
            InteractivePoints.ALIGN_LEFT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.notifications.show(
                    `<div class="top"><div class="title">Night stop</div></div><div class="bottom"><div class="description">Even portfolios need a bathroom break.</div></div>`,
                    'toilet-trail',
                    2.4,
                    null,
                    'toilet-trail'
                )
            },
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    update(elapsed)
    {
        for(const b of this.bobbers)
        {
            if(b.pulse)
            {
                const s = 1 + Math.sin(elapsed * 2.5 + b.phase) * 0.15
                b.mesh.scale.setScalar(s)
            }
            else
            {
                b.mesh.position.y = b.baseY + Math.sin(elapsed * 2 + b.phase) * 0.06
            }
        }
    }
}
