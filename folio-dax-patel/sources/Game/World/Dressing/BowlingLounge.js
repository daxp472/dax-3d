import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { VoxelPatron, vibeMat } from './VoxelPatron.js'

/**
 * Diner life at bowling — chai/coffee patrons on booths + stool table.
 * Custom Dax vibe (not stock Bruno empty furniture).
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

    /** Striped booths at known diner tables (z≈59.5). */
    placeBoothPatrons()
    {
        // Table 1 — face each other across table (couches y≈1.11)
        this.addPatron({
            name: 'boothChai',
            position: { x: -0.55, y: 0.95, z: 59.15 },
            yaw: Math.PI * 0.08,
            drink: 'chai',
            outfit: 'cocoa',
            phase: 0.4,
            pose: 'booth',
        })
        this.addPatron({
            name: 'boothCoffee',
            position: { x: 1.85, y: 0.95, z: 59.85 },
            yaw: Math.PI * 1.08,
            drink: 'coffee',
            outfit: 'sand',
            phase: 1.7,
            pose: 'booth',
        })

        // Table 2 — one chill regular
        this.addPatron({
            name: 'boothSolo',
            position: { x: 9.15, y: 0.95, z: 59.2 },
            yaw: 0.2,
            drink: 'chai',
            outfit: 'olive',
            phase: 2.9,
            pose: 'booth',
        })
    }

    /** Round high-top / stool cluster near bar + plaza filler. */
    placeStoolPatrons()
    {
        // Real bowling stools world ≈ (4.7–7.3, 0.82, 73.8–78.1)
        this.addPatron({
            name: 'stoolDev',
            position: { x: 4.82, y: 0.85, z: 73.83 },
            yaw: Math.PI * 0.35,
            drink: 'coffee',
            outfit: 'pearl',
            phase: 0.9,
            pose: 'stool',
        })
        this.addPatron({
            name: 'stoolFriend',
            position: { x: 7.28, y: 0.85, z: 73.80 },
            yaw: -Math.PI * 0.9,
            drink: 'chai',
            outfit: 'mango',
            phase: 3.4,
            pose: 'stool',
        })
    }

    placeTableExtras()
    {
        // Chai kettle on first table
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

        // Menu stand
        const menu = new THREE.Group()
        menu.position.set(10.33, 1.22, 59.5)
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.04), vibeMat('#f4e4bc'))
        board.position.y = 0.14
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), vibeMat('#5c4033'))
        menu.add(board, stand)
        this.group.add(menu)

        // Neon under-glow discs (custom — Dax purple) near stool table
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
