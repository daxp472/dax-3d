import npcModels from '../../../data/npcModels.js'

/**
 * Map data model keys → Game.resources keys
 */
export const NPC_MODEL_RESOURCES = Object.fromEntries(
    Object.entries(npcModels).map(([ key, meta ]) => [ key, meta.resourceKey ])
)

const REQUIRED_STRING_FIELDS = [ 'id', 'model' ]
const VALID_TASKS = [ 'idle', 'patrol', 'follow' ]

/**
 * @param {unknown} definitions
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateNpcDefinitions(definitions)
{
    const errors = []
    const warnings = []

    if(!Array.isArray(definitions))
    {
        errors.push('NPC definitions must be an array.')
        return { valid: false, errors, warnings }
    }

    const ids = new Set()

    for(let i = 0; i < definitions.length; i++)
    {
        const def = definitions[i]
        const prefix = `npcs[${i}]`

        if(!def || typeof def !== 'object')
        {
            errors.push(`${prefix}: must be an object.`)
            continue
        }

        for(const field of REQUIRED_STRING_FIELDS)
        {
            if(typeof def[field] !== 'string' || !def[field].trim())
                errors.push(`${prefix}: "${field}" must be a non-empty string.`)
        }

        if(def.id)
        {
            if(ids.has(def.id))
                errors.push(`${prefix}: duplicate id "${def.id}".`)
            else
                ids.add(def.id)
        }

        if(def.model && !NPC_MODEL_RESOURCES[def.model])
            errors.push(`${prefix}: unknown model "${def.model}". Known: ${Object.keys(NPC_MODEL_RESOURCES).join(', ')}.`)

        if(def.task && !VALID_TASKS.includes(def.task))
            errors.push(`${prefix}: unknown task "${def.task}". Valid: ${VALID_TASKS.join(', ')}.`)

        const hasSpawn = typeof def.spawn === 'string' && def.spawn.trim()
        const hasPosition = def.position && typeof def.position === 'object'

        if(!hasSpawn && !hasPosition)
            errors.push(`${prefix}: must define either "spawn" + "spawnOffset" or "position".`)

        if(hasSpawn && def.spawnOffset)
        {
            for(const axis of [ 'x', 'z' ])
            {
                if(typeof def.spawnOffset[axis] !== 'number' || Number.isNaN(def.spawnOffset[axis]))
                    errors.push(`${prefix}: spawnOffset.${axis} must be a number.`)
            }
        }

        if(hasPosition)
        {
            for(const axis of [ 'x', 'y', 'z' ])
            {
                if(typeof def.position[axis] !== 'number' || Number.isNaN(def.position[axis]))
                    errors.push(`${prefix}: position.${axis} must be a number.`)
            }
        }

        if(typeof def.scale !== 'undefined')
        {
            if(typeof def.scale !== 'number' || def.scale <= 0)
                errors.push(`${prefix}: scale must be a positive number.`)
        }

        if(typeof def.rotation !== 'undefined')
        {
            if(typeof def.rotation !== 'number' || Number.isNaN(def.rotation))
                errors.push(`${prefix}: rotation must be a number (radians).`)
        }

        if(def.interact === true)
        {
            if(typeof def.label !== 'string' || !def.label.trim())
                warnings.push(`${prefix}: interact is true but label is missing — will use "Talk".`)

            if(typeof def.dialog !== 'string' || !def.dialog.trim())
                warnings.push(`${prefix}: interact is true but dialog is empty.`)
        }

        if(typeof def.lookAtRadius === 'number' && def.lookAtRadius <= 0)
            errors.push(`${prefix}: lookAtRadius must be positive.`)

        if(typeof def.area !== 'undefined' && (typeof def.area !== 'string' || !def.area.trim()))
            errors.push(`${prefix}: area must be a non-empty string when provided.`)

        if(def.task === 'patrol')
        {
            const points = def.patrol?.points
            if(!Array.isArray(points) || points.length < 2)
                errors.push(`${prefix}: patrol task requires at least 2 patrol points.`)

            if(Array.isArray(points))
            {
                for(let p = 0; p < points.length; p++)
                {
                    const point = points[p]
                    if(typeof point?.x !== 'number' || typeof point?.z !== 'number')
                        errors.push(`${prefix}: patrol.points[${p}] must have numeric x and z.`)
                }
            }
        }

        if(def.task === 'follow')
        {
            const follow = def.follow ?? {}

            if(typeof follow.stopDistance !== 'undefined' && follow.stopDistance <= 0)
                errors.push(`${prefix}: follow.stopDistance must be positive.`)

            if(typeof follow.walkSpeed !== 'undefined' && follow.walkSpeed <= 0)
                errors.push(`${prefix}: follow.walkSpeed must be positive.`)

            if(typeof follow.runSpeed !== 'undefined' && follow.runSpeed <= 0)
                errors.push(`${prefix}: follow.runSpeed must be positive.`)
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    }
}

/**
 * @param {Record<string, unknown>} resources
 * @param {Array<{ model: string }>} definitions
 */
export function validateNpcResources(resources, definitions)
{
    const errors = []

    const modelsNeeded = new Set(definitions.map(def => def.model))

    for(const model of modelsNeeded)
    {
        const resourceKey = NPC_MODEL_RESOURCES[model]
        const resource = resources[resourceKey]

        if(!resource?.scene)
            errors.push(`Missing GLTF resource "${resourceKey}" for model "${model}".`)
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}
