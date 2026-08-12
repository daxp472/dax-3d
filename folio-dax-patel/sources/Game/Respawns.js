import * as THREE from 'three/webgpu'
import { Game } from './Game.js'

export class Respawns
{
    constructor(defaultName = 'landing')
    {
        this.game = Game.getInstance()
        this.defaultName = defaultName

        this.setItems()
    }

    setItems()
    {
        this.items = new Map()

        for(const child of this.game.resources.respawnsReferencesModel.scene.children)
        {
            child.rotation.reorder('YXZ')

            let name = child.name.replace(/^respawn(.+)$/i, '$1')

            name = name.charAt(0).toLowerCase() + name.slice(1)

            const item = {
                name: name,
                position: new THREE.Vector3(
                    child.position.x,
                    4,
                    child.position.z
                ),
                rotation: child.rotation.y
            }

            this.items.set(name, item)
        }

        // Dressing-only pins (no GLB respawn empty)
        // Keep these on CLEAR ground — never on prop colliders / portal hole.
        const extras = [
            { name: 'riverBank', x: -48, z: 78.2, rotation: 0.2 },
            { name: 'beachClub', x: -27.4, z: 70.6, rotation: 0 },
            // Soft Stack pin = portal approach (RETURN), not the pit mouth
            { name: 'softStack', x: 74.79, z: -14.08, rotation: 1.12 },
        ]
        for(const e of extras)
        {
            this.items.set(e.name, {
                name: e.name,
                position: new THREE.Vector3(e.x, 4, e.z),
                rotation: e.rotation,
            })
        }
    }

    getByName(name)
    {
        return this.items.get(name)
    }

    getDefault()
    {
        return this.items.get(this.defaultName)
    }

    getClosest(position)
    {
        let closestItem = null
        let closestDistance = Infinity

        this.items.forEach((item) =>
        {
            const distance = Math.hypot(item.position.x - position.x, item.position.z - position.z)

            if(distance < closestDistance)
            {
                closestDistance = distance
                closestItem = item
            }
        })

        return closestItem
    }
}