import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { VoxelPatron, vibeMat } from './VoxelPatron.js'

/**
 * Fill Projects main table (pill + 4 stools) with chai/coffee drinkers.
 * This is the empty stool table from the user's 2nd screenshot.
 */
export class ProjectsLounge
{
    constructor(projectsArea)
    {
        this.game = Game.getInstance()
        this.area = projectsArea
        this.group = new THREE.Group()
        this.group.name = 'projectsLounge'
        this.game.scene.add(this.group)

        this.patrons = []

        // mainTablePhysicalDynamic world ≈ (36.61, 0.53, 12.15)
        const cx = 36.61
        const cz = 12.15
        const seatY = 0.78

        this.addPatron({
            name: 'projDev',
            position: { x: cx - 0.95, y: seatY, z: cz + 0.35 },
            yaw: Math.PI * 0.5,
            drink: 'coffee',
            outfit: 'cocoa',
            phase: 0.6,
        })
        this.addPatron({
            name: 'projFriend',
            position: { x: cx + 0.95, y: seatY, z: cz - 0.25 },
            yaw: -Math.PI * 0.55,
            drink: 'chai',
            outfit: 'pearl',
            phase: 2.2,
        })

        // Desk clutter — sticky shipping notes
        const note = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.35), vibeMat('#ffe66d'))
        note.position.set(cx, 1.05, cz)
        note.rotation.y = 0.3
        this.group.add(note)

        const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 8), vibeMat('#c9a227'))
        kettle.position.set(cx + 0.25, 1.15, cz + 0.15)
        this.group.add(kettle)

        this.group.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
            }
        })

        this.chatPoint = this.game.interactivePoints.create(
            new THREE.Vector3(cx, 1.5, cz),
            'Project Table',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.notifications.show(
                    `<div class="top"><div class="title">Ship room</div></div><div class="bottom"><div class="description">Chai + critiques. Next build starts after this cup.</div></div>`,
                    'projects-lounge',
                    2.6,
                    null,
                    'projects-lounge'
                )
            },
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    addPatron(options)
    {
        const patron = new VoxelPatron(options)
        this.group.add(patron.group)
        this.patrons.push(patron)
    }

    update(elapsed)
    {
        const playerPos = this.game.player?.position ?? null
        for(const p of this.patrons)
            p.update(elapsed, playerPos)
    }
}
