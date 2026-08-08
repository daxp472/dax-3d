import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { VoxelPatron, vibeMat } from './VoxelPatron.js'

/**
 * Dress the giant keyboard / controller / joystick pocket near Landing controls.
 * Adds Dax-coded clutter so it doesn't read as empty Bruno props.
 */
export class GamerCornerDressing
{
    constructor(anchor = new THREE.Vector3(50.5, 0, 33.5))
    {
        this.game = Game.getInstance()
        this.group = new THREE.Group()
        this.group.name = 'gamerCornerDressing'
        this.group.position.copy(anchor)
        this.game.scene.add(this.group)

        this.bobbers = []
        this.patrons = []

        this.buildStickyNotes()
        this.buildMugAndSnacks()
        this.buildCableSnake()
        this.buildMiniMonitor()
        this.buildBugJar()
        this.buildDevSitting()
        this.buildNeonPlaque()
        this.setInteract()

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

    buildStickyNotes()
    {
        const notes = [
            { x: -1.2, y: 0.85, z: 0.4, rot: 0.2, c: '#ffe66d', label: true },
            { x: -0.7, y: 1.05, z: 0.55, rot: -0.15, c: '#ff6b6b', label: false },
            { x: -1.5, y: 1.15, z: 0.2, rot: 0.4, c: '#4ecdc4', label: false },
        ]
        for(const n of notes)
        {
            const note = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.03), vibeMat(n.c))
            note.position.set(n.x, n.y, n.z)
            note.rotation.y = n.rot
            note.rotation.x = -0.5
            this.group.add(note)
            this.bobbers.push({ mesh: note, baseY: n.y, phase: Math.random() * 4, amp: 0.02 })
        }
    }

    buildMugAndSnacks()
    {
        const mug = new THREE.Group()
        mug.position.set(0.8, 0.55, -0.6)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.28, 10), vibeMat('#f8f9fa'))
        body.position.y = 0.14
        const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 10), vibeMat('#3b2314'))
        coffee.position.y = 0.26
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 12, Math.PI), vibeMat('#f8f9fa'))
        handle.rotation.y = Math.PI / 2
        handle.position.set(0.16, 0.14, 0)
        mug.add(body, coffee, handle)
        this.group.add(mug)

        // Packet of "sev"/chips — desi snack bit
        const packet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.12), vibeMat('#ff9f1c'))
        packet.position.set(1.25, 0.35, -0.35)
        packet.rotation.z = 0.25
        this.group.add(packet)
    }

    buildCableSnake()
    {
        const cableMat = vibeMat('#c77dff')
        for(let i = 0; i < 8; i++)
        {
            const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), cableMat)
            const t = i / 7
            seg.position.set(-0.2 + t * 2.2, 0.08 + Math.sin(t * Math.PI) * 0.15, -1.2 + Math.sin(t * 4) * 0.4)
            seg.rotation.z = Math.PI / 2
            seg.rotation.y = t * 1.2
            this.group.add(seg)
        }
    }

    buildMiniMonitor()
    {
        const mon = new THREE.Group()
        mon.position.set(1.8, 0.4, 0.8)
        mon.rotation.y = -0.7
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.2), vibeMat('#2b2d42'))
        stand.position.y = 0.25
        const screen = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.08), vibeMat('#1a1a2e'))
        screen.position.y = 0.85
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.03), vibeMat('#00f5d4'))
        glow.position.set(0, 0.85, 0.05)
        mon.add(stand, screen, glow)
        this.group.add(mon)
        this.bobbers.push({ mesh: glow, baseY: 0.85, phase: 1.2, amp: 0, pulse: true })
        this.monitorGlow = glow
    }

    buildBugJar()
    {
        // Jar of "fixed bugs" — portfolio humor
        const jar = new THREE.Group()
        jar.position.set(-2.0, 0.05, -0.8)
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.55, 12), vibeMat('#90e0ef'))
        glass.position.y = 0.3
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12), vibeMat('#ef476f'))
        lid.position.y = 0.6
        jar.add(glass, lid)
        for(let i = 0; i < 5; i++)
        {
            const bug = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.12), vibeMat('#06d6a0'))
            bug.position.set((i - 2) * 0.08, 0.15 + (i % 2) * 0.12, (i % 3) * 0.05)
            jar.add(bug)
        }
        this.group.add(jar)
    }

    buildDevSitting()
    {
        // One coder vibing near the peripherals
        const patron = new VoxelPatron({
            name: 'gamerDev',
            position: { x: -0.4, y: 0.55, z: 1.4 },
            yaw: Math.PI * 1.15,
            drink: 'coffee',
            outfit: 'indigo',
            phase: 2.1,
        })
        this.group.add(patron.group)
        this.patrons.push(patron)

        // Laptop on lap-ish crate
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.5), vibeMat('#6c584c'))
        crate.position.set(-0.35, 0.2, 0.95)
        const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.4), vibeMat('#22223b'))
        laptop.position.set(-0.35, 0.42, 0.95)
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.03), vibeMat('#4cc9f0'))
        screen.position.set(-0.35, 0.6, 0.78)
        screen.rotation.x = -0.35
        this.group.add(crate, laptop, screen)
        this.bobbers.push({ mesh: screen, baseY: 0.6, phase: 0.5, amp: 0, pulse: true })
        this.laptopScreen = screen
    }

    buildNeonPlaque()
    {
        const plaque = new THREE.Group()
        plaque.position.set(0.2, 0, 2.2)
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), vibeMat('#3d348b'))
        post.position.y = 0.6
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), vibeMat('#240046'))
        board.position.y = 1.35
        const neon = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 0.04), vibeMat('#ff006e'))
        neon.position.y = 1.45
        const neon2 = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 0.04), vibeMat('#00f5d4'))
        neon2.position.y = 1.25
        plaque.add(post, board, neon, neon2)
        this.group.add(plaque)
        this.plaque = plaque
    }

    setInteract()
    {
        const world = this.group.position.clone().add(new THREE.Vector3(0.2, 1.4, 2.2))
        this.chatPoint = this.game.interactivePoints.create(
            world,
            'Build Desk',
            InteractivePoints.ALIGN_LEFT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.notifications.show(
                    `<div class="top"><div class="title">Build with Dax</div></div><div class="bottom"><div class="description">Keyboard warrior HQ — bugs jarred, chai nearby, shipping soon.</div></div>`,
                    'gamer-corner',
                    2.8,
                    null,
                    'gamer-corner'
                )
            },
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    update(elapsed)
    {
        for(const patron of this.patrons)
            patron.update(elapsed, this.game.player?.position)

        for(const b of this.bobbers)
        {
            if(b.pulse && b.mesh.material)
            {
                // subtle scale pulse on glowing panels
                const s = 1 + Math.sin(elapsed * 3 + b.phase) * 0.02
                b.mesh.scale.set(s, s, 1)
            }
            else if(b.amp)
            {
                b.mesh.position.y = b.baseY + Math.sin(elapsed * 1.8 + b.phase) * b.amp
            }
        }

        if(this.plaque)
            this.plaque.rotation.y = Math.sin(elapsed * 0.35) * 0.08
    }
}
