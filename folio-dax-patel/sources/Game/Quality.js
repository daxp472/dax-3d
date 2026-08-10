import { Events } from './Events.js'
import { Game } from './Game.js'

/**
 * Quality tiers:
 * 0 = high (desktop GPU)
 * 1 = low (mobile / weak / integrated / no discrete GPU)
 */
export class Quality
{
    constructor()
    {
        this.game = Game.getInstance()
        this.events = new Events()

        this.weakDevice = Quality.detectWeakDevice()
        this.level = this.weakDevice ? 1 : 0
        this._autoDowngraded = false
        this._fpsSamples = []

        if(this.game.debug.active)
        {
            const debugPanel = this.game.debug.panel.addFolder({
                title: '⚙️ Quality',
                expanded: false,
            })

            this.game.debug.addButtons(
                debugPanel,
                {
                    low: () => this.changeLevel(1),
                    high: () => this.changeLevel(0),
                },
                'change'
            )
        }

        // After a few seconds, if FPS is rough, drop to low automatically once
        setTimeout(() => this._watchFps(), 4000)
        setTimeout(() => this.showPortfolioFallbackIfWeak(), 800)
    }

    static detectWeakDevice()
    {
        try
        {
            const ua = navigator.userAgent || ''
            const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
            const cores = navigator.hardwareConcurrency || 8
            const mem = navigator.deviceMemory || 8
            const saveData = navigator.connection?.saveData === true
            const noWebGpu = typeof navigator.gpu === 'undefined'
            // Integrated / very weak hints
            const weakCpu = cores <= 4
            const weakRam = mem <= 4
            return mobile || saveData || (noWebGpu && weakCpu) || (weakCpu && weakRam)
        }
        catch
        {
            return false
        }
    }

    /** Cap DPR for low tier — biggest free FPS win on weak GPUs. */
    get pixelRatioMax()
    {
        return this.level === 0 ? 2 : 1
    }

    get grassSubdivisions()
    {
        return this.level === 0 ? 280 : 160
    }

    get preferLowPower()
    {
        return this.level === 1
    }

    changeLevel(level = 0)
    {
        if(level === this.level)
            return

        this.level = level
        this.events.trigger('change', [ this.level ])

        // Live DPR update
        if(this.game.viewport)
        {
            this.game.viewport.pixelRatioMax = this.pixelRatioMax
            this.game.viewport.pixelRatio = Math.min(
                this.game.viewport.pixelRatioPure,
                this.game.viewport.pixelRatioMax
            )
            this.game.rendering?.resize?.()
        }
    }

    _watchFps()
    {
        if(!this.game.ticker || this.level === 1 || this._autoDowngraded)
            return

        const tick = () =>
        {
            if(this.level === 1 || this._autoDowngraded)
                return

            const avg = this.game.ticker.deltaAverage
            if(!avg)
                return

            const fps = 1 / avg
            this._fpsSamples.push(fps)
            if(this._fpsSamples.length > 45)
                this._fpsSamples.shift()

            if(this._fpsSamples.length < 30)
                return

            const mean = this._fpsSamples.reduce((a, b) => a + b, 0) / this._fpsSamples.length
            if(mean < 28)
            {
                this._autoDowngraded = true
                console.info('[Quality] Auto low — avg FPS', mean.toFixed(1))
                this.changeLevel(1)
                this.game.notifications?.show?.(
                    `<div class="top"><div class="title">Performance</div></div><div class="bottom"><div class="description">Switched to Low quality. Options → <strong>dax-patel.in</strong> for the 2D portfolio.</div></div>`,
                    'quality-auto-low',
                    4.5,
                    null,
                    'quality-auto-low'
                )
                this._showPortfolioFallback()
            }
        }

        this.game.ticker.events.on('tick', tick, 50)
    }

    _showPortfolioFallback()
    {
        const el = this.game.domElement?.querySelector('.js-portfolio-fallback')
        if(el)
            el.hidden = false
    }

    /** Call at intro if device already flagged weak. */
    showPortfolioFallbackIfWeak()
    {
        if(this.weakDevice || this.level === 1)
            this._showPortfolioFallback()
    }
}
