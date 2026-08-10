import { Events } from './Events.js'
import { Game } from './Game.js'

export class Viewport
{
    constructor(domElement)
    {
        this.domElement = domElement
        this.game = Game.getInstance()

        this.events = new Events()
        
        this.measure()
        this.setResize()
    }

    measure()
    {
        const bounding = this.domElement.getBoundingClientRect()

        this.width = bounding.width
        this.height = bounding.height
        this.ratio = this.width / this.height

        this.pixelRatioPure = window.devicePixelRatio
        const qualityMax = this.game?.quality?.pixelRatioMax
        this.pixelRatioMax = typeof qualityMax === 'number' ? qualityMax : 2
        this.pixelRatio = Math.min(this.pixelRatioPure, this.pixelRatioMax)
    }

    setResize()
    {
        const throttleDuration = 400
        let throttleTimeout = null
        addEventListener('resize', () =>
        {
            this.measure()
            this.events.trigger('change')

            if(throttleTimeout)
            {
                clearTimeout(throttleTimeout)
            }

            throttleTimeout = setTimeout(() =>
            {
                throttleTimeout = null
                this.events.trigger('throttleChange')
            }, throttleDuration)
        })
    }
}