import { Game } from './Game.js'

/**
 * Live FPS overlay (top-right) + Options toggle.
 * Target cadence is display refresh (usually 60); tiers describe laptop feel.
 */
export class FpsMeter
{
    static TIERS = [
        { min: 55, id: 'excellent', label: 'Excellent', hint: 'Gaming / discrete GPU' },
        { min: 45, id: 'good', label: 'Good', hint: 'Solid laptop' },
        { min: 30, id: 'ok', label: 'Playable', hint: 'Mid / integrated GPU' },
        { min: 20, id: 'low', label: 'Low', hint: 'Weak laptop — use Low quality' },
        { min: 0, id: 'rough', label: 'Rough', hint: 'Struggle mode' },
    ]

    constructor()
    {
        this.game = Game.getInstance()
        this.visible = localStorage.getItem('fpsMeter') === '1'
        this.fps = 0
        this.tier = FpsMeter.TIERS[FpsMeter.TIERS.length - 1]

        this.buildOverlay()
        this.bindOptions()

        this.game.ticker.events.on('tick', () => this.update(), 60)

        if(this.visible)
            this.show()
        else
            this.hide()
    }

    buildOverlay()
    {
        this.el = document.createElement('div')
        this.el.className = 'fps-meter'
        this.el.innerHTML = /* html */`
            <button class="fps-meter__toggle js-fps-corner-toggle" type="button" title="Toggle FPS">FPS</button>
            <div class="fps-meter__panel js-fps-panel">
                <div class="fps-meter__row">
                    <span class="js-fps-value fps-meter__value">--</span>
                    <span class="fps-meter__unit">FPS</span>
                </div>
                <div class="js-fps-tier fps-meter__tier">—</div>
                <div class="js-fps-hint fps-meter__hint"></div>
                <div class="fps-meter__quality js-fps-quality"></div>
            </div>
        `
        document.body.append(this.el)

        this.valueEl = this.el.querySelector('.js-fps-value')
        this.tierEl = this.el.querySelector('.js-fps-tier')
        this.hintEl = this.el.querySelector('.js-fps-hint')
        this.qualityEl = this.el.querySelector('.js-fps-quality')
        this.panelEl = this.el.querySelector('.js-fps-panel')

        this.el.querySelector('.js-fps-corner-toggle').addEventListener('click', () =>
        {
            this.setVisible(!this.visible)
        })
    }

    bindOptions()
    {
        const btn = this.game.menu?.items?.get('options')?.contentElement
            ?.querySelector('.js-fps-toggle')
        if(!btn)
            return

        this.optionsBtn = btn
        this.optionsLabel = btn.querySelector('span')
        this.syncOptionsLabel()

        btn.addEventListener('click', () =>
        {
            this.setVisible(!this.visible)
        })
    }

    syncOptionsLabel()
    {
        if(this.optionsLabel)
            this.optionsLabel.textContent = this.visible ? 'On' : 'Off'
    }

    setVisible(on)
    {
        this.visible = !!on
        localStorage.setItem('fpsMeter', this.visible ? '1' : '0')
        if(this.visible)
            this.show()
        else
            this.hide()
        this.syncOptionsLabel()
    }

    show()
    {
        this.el.classList.add('is-visible')
        this.panelEl.hidden = false
    }

    hide()
    {
        this.el.classList.remove('is-visible')
        this.panelEl.hidden = true
    }

    tierFor(fps)
    {
        for(const t of FpsMeter.TIERS)
        {
            if(fps >= t.min)
                return t
        }
        return FpsMeter.TIERS[FpsMeter.TIERS.length - 1]
    }

    update()
    {
        if(!this.visible)
            return

        const avg = this.game.ticker.deltaAverage || (1 / 60)
        this.fps = Math.round(1 / avg)
        this.tier = this.tierFor(this.fps)

        this.valueEl.textContent = String(this.fps)
        this.tierEl.textContent = this.tier.label
        this.tierEl.dataset.tier = this.tier.id
        this.hintEl.textContent = this.tier.hint
        this.qualityEl.textContent = this.game.quality.level === 0 ? 'Quality: High' : 'Quality: Low'

        this.el.dataset.tier = this.tier.id
    }
}
