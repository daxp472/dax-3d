import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { Player } from '../../Player.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { PocketDimension } from './PocketDimension.js'
import { vibeMat } from './VoxelPatron.js'

/**
 * Altar pit → Inferno pocket teleport.
 */
export class VoidPortal
{
    static HOLE = new THREE.Vector3(75.34, -0.5, -27.95)
    static RETURN = new THREE.Vector3(74.79, 4, -14.08)
    static RETURN_ROT = 1.12

    constructor()
    {
        this.game = Game.getInstance()
        this.inDimension = false
        this.transitioning = false
        this.cooldownUntil = 0
        this.armed = true

        this.dimension = new PocketDimension()
        this.dimension.onExitRequest = () => this.exitDimension()

        this.buildMouthVfx()
        this.setMouthInteract()

        this.tickCallback = () => this.update()
        this.game.ticker.events.on('tick', this.tickCallback, 12)

        console.info('[VoidPortal] Inferno gate ready @', VoidPortal.HOLE.toArray().map((n) => n.toFixed(1)).join(', '))
    }

    buildMouthVfx()
    {
        this.mouth = new THREE.Group()
        this.mouth.name = 'voidPortalMouth'
        // Rim only — keep clear of altar mesh center
        this.mouth.position.set(VoidPortal.HOLE.x, 0.06, VoidPortal.HOLE.z)
        this.game.scene.add(this.mouth)

        const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.12, 8, 36), vibeMat('#ff544d'))
        ring.rotation.x = Math.PI / 2
        this.mouth.add(ring)
        this.ring = ring

        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.08, 8, 28), vibeMat('#7b5cff'))
        ring2.rotation.x = Math.PI / 2
        ring2.position.y = 0.05
        this.mouth.add(ring2)
        this.ring2 = ring2

        // Approach sign north of pit (road side), not on altar props
        const sign = new THREE.Group()
        sign.position.set(0, 0, 8.2)
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), vibeMat('#2b2d42'))
        post.position.y = 0.9
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.1), vibeMat('#1a0a14'))
        board.position.y = 1.85
        const neon = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.05), vibeMat('#ff006e'))
        neon.position.y = 2.05
        sign.add(post, board, neon)
        this.mouth.add(sign)

        this.mouth.traverse((c) =>
        {
            if(c.isMesh)
            {
                c.castShadow = true
                c.frustumCulled = false
            }
        })
    }

    setMouthInteract()
    {
        const p = VoidPortal.HOLE.clone()
        p.y = 1.8
        this.mouthPoint = this.game.interactivePoints.create(
            p,
            'Inferno',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () => this.enterDimension('interact'),
            () => this.game.inputs.interactiveButtons.addItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
            () => this.game.inputs.interactiveButtons.removeItems(['interact']),
        )
    }

    nearHole(pos, radius = 4.5)
    {
        const dx = pos.x - VoidPortal.HOLE.x
        const dz = pos.z - VoidPortal.HOLE.z
        return Math.hypot(dx, dz) < radius
    }

    enterFromAltar()
    {
        this.enterDimension('altar')
    }

    enterDimension(reason = 'fall')
    {
        if(this.inDimension || this.transitioning)
            return
        if(this.game.ticker.elapsed < this.cooldownUntil)
            return

        this.transitioning = true
        this.game.player.state = Player.STATE_LOCKED
        this.game.inputs.filters.delete('wandering')
        this.game.inputs.filters.add('cinematic')

        this.game.notifications.show(
            `<div class="top"><div class="title">Inferno</div></div><div class="bottom"><div class="description">The pit opens. Lava, demons, and the King await below…</div></div>`,
            'void-portal',
            2.5,
            null,
            'void-portal'
        )

        this.game.overlay.show(() =>
        {
            // Dark volcanic atmosphere — orange lava pop, not red wash
            this.game.weather?.override?.start?.(
                { humidity: 0.2, electricField: 0.6, clouds: 0.7, wind: 0.3 },
                0
            )
            this.game.dayCycles?.override?.start?.(
                {
                    progress: 0.48,
                    fogNearRatio: -0.25,
                    fogFarRatio: 0.48,
                    lightIntensity: 1.6,
                    fogColorA: new THREE.Color('#1a1520'),
                    fogColorB: new THREE.Color('#3a2830'),
                    lightColor: new THREE.Color('#ffaa66'),
                    shadowColor: new THREE.Color('#1a1018'),
                    revealColor: new THREE.Color('#ff8833'),
                    revealIntensity: 6,
                },
                0
            )

            this.dimension.show()
            const spawn = this.dimension.getSpawn()
            this.game.physicalVehicle.moveTo(spawn.position, spawn.rotation)

            // Snap camera focus immediately (XZ) so we don't ease across the ocean
            if(this.game.view?.focusPoint)
            {
                this.game.view.focusPoint.trackedPosition.set(spawn.position.x, 0, spawn.position.z)
                this.game.view.focusPoint.position.set(spawn.position.x, 0, spawn.position.z)
                this.game.view.focusPoint.smoothedPosition.set(spawn.position.x, 0, spawn.position.z)
            }

            this.inDimension = true
            this.transitioning = false
            this.game.player.state = Player.STATE_DEFAULT
            this.game.inputs.filters.delete('cinematic')
            this.game.inputs.filters.add('wandering')
            this.mouthPoint?.hide?.()
            if(this.mouth)
                this.mouth.visible = false
            this.game.overlay.hide()

            this.game.achievements?.setProgress?.('voidPortal', 1)
            console.info(`[VoidPortal] entered Inferno via ${reason} @`, spawn.position.toArray().map((n) => n.toFixed(1)).join(', '))
        })
    }

    exitDimension()
    {
        if(!this.inDimension || this.transitioning)
            return

        this.transitioning = true
        this.game.player.state = Player.STATE_LOCKED
        this.game.inputs.filters.delete('wandering')
        this.game.inputs.filters.add('cinematic')

        this.game.overlay.show(() =>
        {
            this.dimension.hide()

            this.game.weather?.override?.end?.(0)
            this.game.dayCycles?.override?.end?.(0)

            this.game.physicalVehicle.moveTo(VoidPortal.RETURN, VoidPortal.RETURN_ROT)

            if(this.game.view?.focusPoint)
            {
                const r = VoidPortal.RETURN
                this.game.view.focusPoint.trackedPosition.set(r.x, 0, r.z)
                this.game.view.focusPoint.position.set(r.x, 0, r.z)
                this.game.view.focusPoint.smoothedPosition.set(r.x, 0, r.z)
            }

            this.inDimension = false
            this.transitioning = false
            this.cooldownUntil = this.game.ticker.elapsed + 5
            this.game.player.state = Player.STATE_DEFAULT
            this.game.inputs.filters.delete('cinematic')
            this.game.inputs.filters.add('wandering')
            this.mouthPoint?.show?.()
            if(this.mouth)
                this.mouth.visible = true
            this.game.overlay.hide()

            this.game.notifications.show(
                `<div class="top"><div class="title">Escaped</div></div><div class="bottom"><div class="description">Back at the altar. The pit still breathes fire.</div></div>`,
                'void-portal-exit',
                2.2,
                null,
                'void-portal-exit'
            )
        })
    }

    update()
    {
        const elapsed = this.game.ticker.elapsed
        const player = this.game.player?.position
        if(!player)
            return

        if(this.ring)
            this.ring.rotation.z = elapsed * 0.55
        if(this.ring2)
            this.ring2.rotation.z = -elapsed * 0.85

        this.dimension.update(elapsed)

        if(this.transitioning)
            return

        if(this.inDimension)
        {
            // Fell through hell floor somehow → respawn in arena
            if(player.y < PocketDimension.ORIGIN.y - 6)
            {
                const spawn = this.dimension.getSpawn()
                this.game.physicalVehicle.moveTo(spawn.position, spawn.rotation)
            }
            if(this.dimension.isNearExit(player, 3.2))
                this.exitDimension()
        }
    }
}
