import * as THREE from 'three/webgpu'
import { Game } from './Game.js'
import MeshGridMaterial, { MeshGridMaterialLine } from './Materials/MeshGridMaterial.js'
import { color, Fn, length, mix, smoothstep, texture, uniform, uv, vec2 } from 'three/tsl'

export class Terrain
{
    constructor()
    {
        this.game = Game.getInstance()

        this.subdivision = 128
        this.size = 192

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🏔️ Terrain Data',
                expanded: false,
            })
        }

        this.setGradient()
        this.setNodes()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 10)
    }

    setGradient()
    {
        const height = 16

        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = height

        this.gradientTexture = new THREE.Texture(canvas)
        this.gradientTexture.colorSpace = THREE.SRGBColorSpace

        const context = canvas.getContext('2d')

        this.colors = [
            { stop: 0.1, value: '#ffa94e' },
            { stop: 0.3, value: '#5bc2b9' },
            { stop: 0.9, value: '#13375f' },
        ]

        const update = () =>
        {
            const gradient = context.createLinearGradient(0, 0, 0, height)
            for(const colorStop of this.colors)
                gradient.addColorStop(colorStop.stop, colorStop.value)

            context.fillStyle = gradient
            context.fillRect(0, 0, 1, height)
            this.gradientTexture.needsUpdate = true
        }

        update()

        if(this.game.debug.active)
        {
            for(const colorStop of this.colors)
            {
                this.debugPanel.addBinding(colorStop, 'stop', { min: 0, max: 1, step: 0.001 }).on('change', update)
                this.debugPanel.addBinding(colorStop, 'value', { view: 'color' }).on('change', update)
            }
        }
    }

    setNodes()
    {
        this.grassColorUniform = uniform(color('#b8b62e'))
        this.tracksDelta = uniform(vec2(0))

        // Beach club clear — kill grass blades around BowlingBeach origin
        this.beachClearCenter = uniform(vec2(-27.398, 74.268))
        this.beachClearInner = uniform(6.5)
        this.beachClearOuter = uniform(9.5)
        this.beachSandColor = uniform(color('#e8c47a'))

        const worldPositionToUvNode = Fn(([position]) =>
        {
            return position.div(this.subdivision).div(1.5).add(0.5)
        })

        this.terrainNode = Fn(([position]) =>
        {
            const textureUv = worldPositionToUvNode(position)
            const data = texture(this.game.resources.terrainTexture, textureUv)

            // Wheel tracks
            const groundDataColor = texture(
                this.game.tracks.renderTarget.texture,
                position.sub(- this.game.tracks.halfSize).sub(this.tracksDelta).div(this.game.tracks.size)
            )
            data.g.mulAssign(groundDataColor.r.oneMinus())

            // Soft-clear grass on beach pad (keep height/water B untouched)
            const beachDist = length(position.sub(this.beachClearCenter))
            const keepGrass = smoothstep(this.beachClearInner, this.beachClearOuter, beachDist)
            data.g.mulAssign(keepGrass)

            return data
        })

        this.colorNode = Fn(([terrainData]) =>
        {
            // Dirt and water
            const baseColor = texture(this.gradientTexture, vec2(0, terrainData.b.oneMinus()))

            // Grass
            baseColor.assign(mix(baseColor, this.grassColorUniform, terrainData.g))

            return baseColor.rgb
        })

        /** 1 inside beach pad, 0 outside — for Floor sand tint. */
        this.beachMaskNode = Fn(([position]) =>
        {
            const beachDist = length(position.sub(this.beachClearCenter))
            return smoothstep(this.beachClearOuter, this.beachClearInner, beachDist)
        })

        if(this.game.debug.active)
        {
            this.game.debug.addThreeColorBinding(this.debugPanel, this.grassColorUniform.value, 'grassColor')
            this.game.debug.addThreeColorBinding(this.debugPanel, this.beachSandColor.value, 'beachSand')
            this.debugPanel.addBinding(this.beachClearInner, 'value', { label: 'beachInner', min: 2, max: 20, step: 0.1 })
            this.debugPanel.addBinding(this.beachClearOuter, 'value', { label: 'beachOuter', min: 3, max: 25, step: 0.1 })
        }
    }

    update()
    {
        this.tracksDelta.value.set(
            this.game.tracks.focusPoint.x,
            this.game.tracks.focusPoint.y
        )
    }
}
