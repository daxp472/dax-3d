import { Game } from '../Game.js'

/**
 * Clash-of-Clans style speech: character slides in from the left,
 * bubble pops from his head.
 */
export class BuilderSpeech
{
    static STATE_HIDDEN = 0
    static STATE_VISIBLE = 1
    static STATE_HIDING = 2

    constructor()
    {
        this.game = Game.getInstance()
        this.state = BuilderSpeech.STATE_HIDDEN
        this.timeLeft = 0
        this.timeTotal = 0
        this.queue = []
        this.currentId = null

        this.element = document.createElement('div')
        this.element.className = 'builder-speech js-builder-speech'
        this.element.innerHTML = /* html */`
            <div class="builder-speech__stage">
                <div class="builder-speech__character" aria-hidden="true">
                    <div class="builder-speech__cap"></div>
                    <div class="builder-speech__brim"></div>
                    <div class="builder-speech__head">
                        <div class="builder-speech__eye builder-speech__eye--l"></div>
                        <div class="builder-speech__eye builder-speech__eye--r"></div>
                        <div class="builder-speech__mustache"></div>
                    </div>
                    <div class="builder-speech__body">
                        <div class="builder-speech__overalls"></div>
                    </div>
                </div>
                <div class="builder-speech__bubble">
                    <div class="builder-speech__title"></div>
                    <div class="builder-speech__text"></div>
                    <div class="builder-speech__tail"></div>
                </div>
            </div>
        `

        const host = this.game.domElement || document.body
        host.append(this.element)

        this.titleEl = this.element.querySelector('.builder-speech__title')
        this.textEl = this.element.querySelector('.builder-speech__text')

        this.element.addEventListener('click', () => this.hide())
        this.element.addEventListener('transitionend', (event) =>
        {
            if(event.target !== this.element)
                return
            if(this.state === BuilderSpeech.STATE_HIDING)
            {
                this.element.classList.remove('is-leaving', 'is-visible')
                this.state = BuilderSpeech.STATE_HIDDEN
                this.currentId = null
                this.flushQueue()
            }
        })

        this.game.ticker.events.on('tick', () => this.update(), 15)
    }

    say(title, text, duration = 4, id = null)
    {
        if(this.state !== BuilderSpeech.STATE_HIDDEN)
        {
            if(id && (id === this.currentId || this.queue.some(item => item.id === id)))
                return false

            this.queue.push({ title, text, duration, id })
            return false
        }

        this.currentId = id
        this.titleEl.textContent = title
        this.textEl.textContent = text
        this.timeTotal = duration
        this.timeLeft = duration
        this.state = BuilderSpeech.STATE_VISIBLE

        this.element.classList.remove('is-leaving')
        // Force reflow so enter animation always plays
        void this.element.offsetWidth
        this.element.classList.add('is-visible')
        return true
    }

    hide()
    {
        if(this.state !== BuilderSpeech.STATE_VISIBLE)
            return

        this.state = BuilderSpeech.STATE_HIDING
        this.element.classList.add('is-leaving')
        this.element.classList.remove('is-visible')
    }

    flushQueue()
    {
        if(!this.queue.length)
            return

        const next = this.queue.shift()
        this.say(next.title, next.text, next.duration, next.id)
    }

    update()
    {
        if(this.state !== BuilderSpeech.STATE_VISIBLE)
            return

        this.timeLeft = Math.max(0, this.timeLeft - this.game.ticker.delta)
        if(this.timeLeft === 0)
            this.hide()
    }
}
