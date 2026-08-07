import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import npcDefinitions from '../../../data/npcs.js'
import { NPC } from './NPC.js'
import { NPC_MODEL_RESOURCES, validateNpcDefinitions, validateNpcResources } from './npcValidation.js'

export class NPCs
{
    constructor()
    {
        this.game = Game.getInstance()
        this.items = []
        this.spawned = false

        this.validate()
    }

    validate()
    {
        const definitionResult = validateNpcDefinitions(npcDefinitions)

        if(!definitionResult.valid)
        {
            console.error('[NPCs] Invalid definitions:')
            for(const error of definitionResult.errors)
                console.error(`  - ${error}`)

            throw new Error('[NPCs] Invalid NPC definitions — fix sources/data/npcs.js')
        }

        for(const warning of definitionResult.warnings)
            console.warn(`[NPCs] ${warning}`)
    }

    spawn()
    {
        if(this.spawned)
            return

        const resourceResult = validateNpcResources(this.game.resources, npcDefinitions)

        if(!resourceResult.valid)
        {
            console.error('[NPCs] Missing resources:')
            for(const error of resourceResult.errors)
                console.error(`  - ${error}`)

            throw new Error('[NPCs] Missing NPC model resources — check Game.js resource list')
        }

        for(const definition of npcDefinitions)
        {
            const resourceKey = NPC_MODEL_RESOURCES[definition.model]
            const gltf = this.game.resources[resourceKey]
            const resolved = this.resolveDefinition(definition)

            const npc = new NPC(resolved, gltf)
            this.items.push(npc)
        }

        this.spawned = true

        if(this.game.debug.active)
            console.log(`[NPCs] Spawned ${this.items.length} NPC(s)`)

        this.tickCallback = () =>
        {
            this.updateSpawnRules()
        }
        this.game.ticker.events.on('tick', this.tickCallback, 10)
    }

    resolveDefinition(definition)
    {
        const resolved = { ...definition }

        if(definition.spawn)
        {
            const spawn = this.game.respawns.getByName(definition.spawn)

            if(!spawn)
                throw new Error(`[NPCs] Unknown spawn "${definition.spawn}" for NPC "${definition.id}"`)

            const offset = definition.spawnOffset ?? { x: 0, y: 0, z: 0 }

            resolved.position = new THREE.Vector3(
                spawn.position.x + (offset.x ?? 0),
                spawn.position.y + (offset.y ?? 0),
                spawn.position.z + (offset.z ?? 0)
            )
        }
        else
        {
            resolved.position = new THREE.Vector3(
                definition.position.x,
                definition.position.y,
                definition.position.z
            )
        }

        return resolved
    }

    updateSpawnRules()
    {
        for(const npc of this.items)
        {
            if(!npc.definition.area)
            {
                npc.setEnabled(true)
                continue
            }

            const area = this.game.world.areas?.[npc.definition.area]
            const isActive = area ? area.isIn : true
            npc.setEnabled(isActive)
        }
    }

    destroy()
    {
        if(this.tickCallback)
            this.game.ticker.events.off('tick', this.tickCallback)

        for(const npc of this.items)
            npc.destroy()

        this.items = []
        this.spawned = false
    }
}
