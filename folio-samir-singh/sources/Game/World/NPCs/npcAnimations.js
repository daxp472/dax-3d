import { AnimationUtils } from 'three'

/**
 * Build named clips from metadata.
 * Supports:
 * - clipName: direct animation clip lookup by name
 * - from/to: subclip extraction from the first animation track
 *
 * @param {THREE.AnimationClip[]} animations
 * @param {Record<string, { clipName?: string, from?: number, to?: number }>} clipMap
 * @param {number} fps
 */
export function createAnimationClips(animations, clipMap, fps = 24)
{
    const clips = {}
    const source = animations[0] || null

    if(!animations?.length)
        return clips

    for(const [ name, config ] of Object.entries(clipMap))
    {
        if(config.clipName)
        {
            const byName = animations.find((animation) => animation.name === config.clipName)

            if(byName)
                clips[name] = byName
            continue
        }

        if(source && typeof config.from === 'number' && typeof config.to === 'number')
        {
            clips[name] = AnimationUtils.subclip(
                source,
                name,
                config.from,
                config.to + 1,
                fps
            )
        }
    }

    return clips
}
