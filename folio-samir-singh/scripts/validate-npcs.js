import npcDefinitions from '../sources/data/npcs.js'
import { validateNpcDefinitions } from '../sources/Game/World/NPCs/npcValidation.js'

const result = validateNpcDefinitions(npcDefinitions)

if(result.warnings.length)
{
    console.warn('[validate-npcs] Warnings:')
    for(const warning of result.warnings)
        console.warn(`  - ${warning}`)
}

if(!result.valid)
{
    console.error('[validate-npcs] Errors:')
    for(const error of result.errors)
        console.error(`  - ${error}`)

    process.exit(1)
}

console.log(`[validate-npcs] OK — ${npcDefinitions.length} NPC definition(s) valid.`)
