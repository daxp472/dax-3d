import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { NPC_WHEEL_Y } from './raceNpcMath.js'

const paintCache = new Map()

function getNpcPaint(game, paintName, colorFrom, colorTo)
{
    if(paintCache.has(paintName))
        return paintCache.get(paintName)

    if(game.materials.list?.has?.(paintName))
    {
        const mat = game.materials.getFromName(paintName)
        paintCache.set(paintName, mat)
        return mat
    }

    game.materials.createGradient(paintName, colorFrom, colorTo)
    const mat = game.materials.getFromName(paintName)
    paintCache.set(paintName, mat)
    return mat
}

/**
 * One lightweight visual rival — same jeep + 4 tires as the player.
 * Prefer wheel template from VisualVehicle (materials already applied).
 */
export class NpcRaceCar
{
    constructor(options = {})
    {
        this.game = Game.getInstance()
        this.paintName = options.paintName ?? 'npcRivalCyan'
        this.colorFrom = options.colorFrom ?? '#3ecfff'
        this.colorTo = options.colorTo ?? '#0066aa'
        this.steering = 0
        this.parts = {}
        this.wheels = { items: [] }
        this.ready = false

        const chassisSource = this.game.world?.vehicleChassisTemplate
            || this.game.world?.visualVehicle?.parts?.chassis
            || this.findChassisInVehicleGltf()

        if(!chassisSource)
        {
            console.warn('[NpcRaceCar] no chassis source')
            return
        }

        this.buildFromTemplate(chassisSource, options.id ?? 'rival')
        this.applyPaint()
        this.ready = !!this.parts.chassis
    }

    findChassisInVehicleGltf()
    {
        let found = null
        this.game.resources?.vehicle?.scene?.traverse((child) =>
        {
            if(!found && /^chassis/i.test(child.name))
                found = child
        })
        return found
    }

    buildFromTemplate(source, id)
    {
        this.parts.chassis = source.clone(true)
        this.parts.chassis.name = `npcRivalChassis_${id}`
        this.parts.chassis.rotation.reorder('YXZ')
        this.parts.chassis.visible = false
        this.parts.chassis.frustumCulled = false
        // Template may carry Blender local offsets — zero so world pose is authoritative
        this.parts.chassis.position.set(0, 0, 0)
        this.parts.chassis.scale.set(1, 1, 1)

        // Strip ANY leftover wheel / tire nodes from the clone (source of sunk tires)
        const stale = []
        this.parts.chassis.traverse((child) =>
        {
            if(child === this.parts.chassis)
                return
            if(/wheel|tire|tyre/i.test(child.name))
                stale.push(child)
        })
        for(const node of stale)
            node.removeFromParent()

        this.parts.chassis.traverse((child) =>
        {
            child.frustumCulled = false
            if(/antenna|cell|energy|blinker|stopLights|backLights/i.test(child.name))
                child.visible = false
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
            }
        })

        this.game.materials.updateObject(this.parts.chassis)

        this.parts.bodyPainted = null
        this.parts.chassis.traverse((child) =>
        {
            if(!this.parts.bodyPainted && /^bodyPainted/i.test(child.name))
                this.parts.bodyPainted = child
        })

        this.setupWheels()
    }

    /**
     * Mirror VisualVehicle.setWheels + resting suspension (flat road).
     * Wheel Y chosen so tire bottoms sit on road when chassis is at NPC_CHASSIS_Y.
     */
    setupWheels()
    {
        let template = this.game.world?.vehicleWheelTemplate
            || this.game.world?.visualVehicle?.parts?.wheelContainer

        if(!template)
        {
            const searchRoot = this.game.world?.vehicleChassisTemplate
                || this.game.world?.visualVehicle?.parts?.chassis
            searchRoot?.traverse((child) =>
            {
                if(!template && /^wheelContainer/i.test(child.name))
                    template = child
            })
        }

        if(!template)
        {
            console.warn('[NpcRaceCar] no wheelContainer template — tires missing')
            return
        }

        // Prefer live player wheel XZ if available; Y always resting stance
        const playerItems = this.game.world?.visualVehicle?.wheels?.items
        const wheelY = this.resolveRestingWheelY(playerItems)
        const offsets = [
            new THREE.Vector3(0.90, wheelY, 0.75),
            new THREE.Vector3(0.90, wheelY, -0.75),
            new THREE.Vector3(-0.90, wheelY, 0.75),
            new THREE.Vector3(-0.90, wheelY, -0.75),
        ]

        if(playerItems?.length === 4)
        {
            for(let i = 0; i < 4; i++)
            {
                const src = playerItems[i]?.container?.position
                if(src)
                {
                    offsets[i].x = src.x
                    offsets[i].z = src.z
                }
            }
        }

        for(let i = 0; i < 4; i++)
        {
            const container = template.clone(true)
            container.name = `npcWheelContainer_${i}`
            container.visible = true
            container.frustumCulled = false
            container.scale.set(1, 1, 1)
            this.parts.chassis.add(container)
            container.position.copy(offsets[i])
            container.rotation.set(0, (i === 0 || i === 2) ? Math.PI : 0, 0)

            const wheel = { container, cylinder: null, painted: null, suspension: null }
            container.traverse((child) =>
            {
                child.visible = true
                child.frustumCulled = false
                if(/^wheelCylinder/i.test(child.name))
                    wheel.cylinder = child
                if(/^wheelPainted/i.test(child.name))
                    wheel.painted = child
                if(/^wheelSuspension/i.test(child.name))
                    wheel.suspension = child
            })

            if(wheel.cylinder)
                wheel.cylinder.position.set(0, 0, 0)

            // Same rest formula as VisualVehicle: scale.y = |wheelY| - 0.5
            if(wheel.suspension)
            {
                const suspensionScale = Math.max(0.02, Math.abs(container.position.y) - 0.5)
                wheel.suspension.scale.set(1, suspensionScale, 1)
            }

            this.wheels.items.push(wheel)
        }

        this.restingWheelY = wheelY
    }

    resolveRestingWheelY(playerItems)
    {
        // If player is settled on road, reuse their wheel Y (clamped like VisualVehicle)
        if(playerItems?.length)
        {
            let sum = 0
            let n = 0
            for(const item of playerItems)
            {
                const y = item?.container?.position?.y
                if(typeof y === 'number' && Number.isFinite(y) && y <= -0.45 && y >= -0.95)
                {
                    sum += y
                    n++
                }
            }
            if(n)
                return sum / n
        }
        return NPC_WHEEL_Y
    }

    applyPaint()
    {
        const mat = getNpcPaint(this.game, this.paintName, this.colorFrom, this.colorTo)
        if(!mat || !this.parts.bodyPainted)
            return

        this.parts.bodyPainted.material = mat
        for(const wheel of this.wheels.items)
        {
            if(wheel.painted)
                wheel.painted.material = mat
        }
    }

    /** Vehicle local +X = forward (same as PhysicsVehicle). */
    static yawFromDirection(dx, dz)
    {
        return Math.atan2(-dz, dx)
    }

    updateVisual(position, yaw, speed, steer = 0, delta = 1 / 60)
    {
        if(!this.parts.chassis)
            return

        this.parts.chassis.position.copy(position)
        this.parts.chassis.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)

        this.steering += (steer - this.steering) * Math.min(1, delta * 10)
        const spin = speed * delta * 1.6
        const wheelY = this.restingWheelY ?? NPC_WHEEL_Y

        for(let i = 0; i < this.wheels.items.length; i++)
        {
            const wheel = this.wheels.items[i]
            // Lock tire height every frame — prevents any drift/sink
            wheel.container.position.y = wheelY

            if(wheel.cylinder)
            {
                if(i === 0 || i === 2)
                    wheel.cylinder.rotation.z += spin
                else
                    wheel.cylinder.rotation.z -= spin
            }
            if(i === 0)
                wheel.container.rotation.y = Math.PI + this.steering
            if(i === 1)
                wheel.container.rotation.y = this.steering

            if(wheel.suspension)
            {
                const suspensionScale = Math.max(0.02, Math.abs(wheelY) - 0.5)
                wheel.suspension.scale.y = suspensionScale
            }
        }
    }

    getRoot()
    {
        return this.parts.chassis || null
    }

    setVisible(visible)
    {
        if(this.parts.chassis)
            this.parts.chassis.visible = visible
    }

    destroy()
    {
        this.parts.chassis?.removeFromParent()
        this.ready = false
    }
}
