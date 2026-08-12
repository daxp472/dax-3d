import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { VoxelPatron, vibeMat } from './VoxelPatron.js'

/**
 * Diner life at bowling — chai/coffee patrons on booths + stool table.
 * Seat Y tuned to mapItemLocations couch (y≈1.11) / stool (y≈0.82) tops.
 */
export class BowlingLounge
{
    constructor(bowlingArea)
    {
        this.game = Game.getInstance()
        this.area = bowlingArea
        this.group = new THREE.Group()
        this.group.name = 'bowlingLounge'
        this.game.scene.add(this.group)

        this.patrons = []
        this.props = []

        this.placeBoothPatrons()
        this.placeStoolPatrons()
        this.placeTableExtras()
        this.setChat()
    }

    addPatron(options)
    {
        const patron = new VoxelPatron(options)
        this.group.add(patron.group)
        this.patrons.push(patron)
        return patron
    }

    /**
     * Couches at (−1.18 / 2.49 / 8.5, 1.11, 59.47).
     * Sit ON cushion — group Y ≈ seat top − small lift so hips clear mesh.
     */
    placeBoothPatrons()
    {
        // Couch 0 — west of table (−1.18) · face table
        this.addPatron({
            name: 'boothChai',
            position: { x: -1.05, y: 1.05, z: 59.47 },
            yaw: Math.PI * 0.5,
            drink: 'chai',
            outfit: 'cocoa',
            phase: 0.4,
            pose: 'booth',
        })
        // Couch 1 — east of table (2.49)
        this.addPatron({
            name: 'boothCoffee',
            position: { x: 2.35, y: 1.05, z: 59.47 },
            yaw: -Math.PI * 0.5,
            drink: 'coffee',
            outfit: 'sand',
            phase: 1.7,
            pose: 'booth',
        })
        // Couch 2 — solo (8.5)
        this.addPatron({
            name: 'boothSolo',
            position: { x: 8.65, y: 1.05, z: 59.47 },
            yaw: -Math.PI * 0.45,
            drink: 'chai',
            outfit: 'olive',
            phase: 2.9,
            pose: 'booth',
        })
    }

    /** Stools world ≈ (4.82 / 7.28, 0.82, 73.8) — seat top ≈ 0.95–1.0. */
    placeStoolPatrons()
    {
        this.addPatron({
            name: 'stoolDev',
            position: { x: 4.82, y: 0.92, z: 73.83 },
            yaw: Math.PI * 0.35,
            drink: 'coffee',
            outfit: 'pearl',
            phase: 0.9,
            pose: 'stool',
        })
        this.addPatron({
            name: 'stoolFriend',
            position: { x: 7.28, y: 0.92, z: 73.80 },
            yaw: -Math.PI * 0.9,
            drink: 'chai',
            outfit: 'mango',
            phase: 3.4,
            pose: 'stool',
        })
    }

    placeTableExtras()
    {
        const kettle = new THREE.Group()
        kettle.position.set(0.65, 1.22, 59.5)
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 10), vibeMat('#c9a227'))
        const lid = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), vibeMat('#a88820'))
        lid.position.y = 0.12
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.16, 6), vibeMat('#c9a227'))
        spout.rotation.z = Math.PI * 0.4
        spout.position.set(0.14, 0.02, 0)
        kettle.add(pot, lid, spout)
        this.group.add(kettle)
        this.props.push(kettle)

        const menu = new THREE.Group()
        menu.position.set(10.33, 1.22, 59.5)
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.04), vibeMat('#f4e4bc'))
        board.position.y = 0.14
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), vibeMat('#5c4033'))
        menu.add(board, stand)
        this.group.add(menu)

        for(const [x, z] of [[5.5, 74.2], [7.6, 75.4]])
        {
            const glow = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16),
                vibeMat('#7b5cff')
            )
            glow.position.set(x, 0.02, z)
            this.group.add(glow)
        }

        this.group.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
    }

    setChat()
    {
        const lines = [
            { title: 'Chai break', text: 'Best pit stop after bowling — masala strong.' },
            { title: 'Dev fuel', text: 'Coffee first. Strike second. Ship third.' },
        ]
        let i = 0

        this.chatPoint = this.game.interactivePoints.create(
            new THREE.Vector3(0.65, 1.4, 59.5),
            'Lounge',
            InteractivePoints.ALIGN_LEFT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                const line = lines[i % lines.length]
                i++
                this.game.notifications.show(
                    `<div class="top"><div class="title">${line.title}</div></div><div class="bottom"><div class="description">${line.text}</div></div>`,
                    'bowling-lounge',
                    2.6,
                    null,
                    'bowling-lounge'
                )
            },
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    update(elapsed)
    {
        const playerPos = this.game.player?.position ?? null
        for(const patron of this.patrons)
            patron.update(elapsed, playerPos)
    }
}
