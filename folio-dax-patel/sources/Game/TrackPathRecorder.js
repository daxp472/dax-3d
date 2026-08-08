import * as THREE from 'three/webgpu'
import { Game } from './Game.js'

/**
 * F3 drive-path recorder.
 * Drive the car → record XZ samples → copy/download JSON for NPC track.
 *
 * Keys:
 *   F3          toggle panel
 *   F4 / Space  start/stop (when panel open, Space only if not typing)
 *   F5          clear
 *   F6          copy JSON
 */
export class TrackPathRecorder
{
    constructor()
    {
        this.game = Game.getInstance()
        this.open = false
        this.recording = false
        this.minStep = 0.35
        this.points = []
        this.line = null
        this.marker = null

        this.buildDom()
        this.buildVisuals()
        this.bindKeys()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 50)

        // Easy access for dump / paste to agent
        window.__drivePath = this
    }

    buildDom()
    {
        const root = document.createElement('div')
        root.className = 'js-track-recorder track-recorder'
        root.innerHTML = /* html */`
            <div class="panel">
                <div class="title">F3 · Track Path Recorder</div>
                <div class="status js-status">IDLE · 0 pts</div>
                <div class="hint">Drive a clean lap on the circuit. Path auto-samples every ${this.minStep}m.</div>
                <div class="row">
                    <button type="button" class="js-rec">REC (F4)</button>
                    <button type="button" class="js-stop">STOP</button>
                    <button type="button" class="js-clear">CLEAR (F5)</button>
                </div>
                <div class="row">
                    <button type="button" class="js-copy">COPY JSON (F6)</button>
                    <button type="button" class="js-download">DOWNLOAD</button>
                </div>
                <pre class="js-preview preview"></pre>
            </div>
        `
        document.body.append(root)
        this.root = root
        this.statusEl = root.querySelector('.js-status')
        this.previewEl = root.querySelector('.js-preview')

        root.querySelector('.js-rec').addEventListener('click', () => this.start())
        root.querySelector('.js-stop').addEventListener('click', () => this.stop())
        root.querySelector('.js-clear').addEventListener('click', () => this.clear())
        root.querySelector('.js-copy').addEventListener('click', () => this.copy())
        root.querySelector('.js-download').addEventListener('click', () => this.download())

        this.setOpen(false)
        this.refreshUi()
    }

    buildVisuals()
    {
        try
        {
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([ 0, 0, 0, 0, 0, 0 ]), 3))
            const mat = new THREE.LineBasicNodeMaterial({
                color: new THREE.Color('#22ff88'),
            })
            this.line = new THREE.Line(geo, mat)
            this.line.frustumCulled = false
            this.line.visible = false
            this.game.scene.add(this.line)

            this.marker = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 10, 10),
                new THREE.MeshBasicNodeMaterial({ color: new THREE.Color('#22ff88') })
            )
            this.marker.visible = false
            this.game.scene.add(this.marker)
        }
        catch(error)
        {
            console.warn('[TrackPathRecorder] visuals skipped', error)
            this.line = null
            this.marker = null
        }
    }

    bindKeys()
    {
        addEventListener('keydown', (event) =>
        {
            if(event.code === 'F3')
            {
                event.preventDefault()
                this.setOpen(!this.open)
                return
            }

            if(!this.open)
                return

            if(event.code === 'F4')
            {
                event.preventDefault()
                if(this.recording)
                    this.stop()
                else
                    this.start()
            }
            else if(event.code === 'F5')
            {
                event.preventDefault()
                this.clear()
            }
            else if(event.code === 'F6')
            {
                event.preventDefault()
                this.copy()
            }
        })
    }

    setOpen(open)
    {
        this.open = open
        this.root.classList.toggle('is-open', open)
        if(this.line)
            this.line.visible = open && this.points.length > 1
        if(this.marker)
            this.marker.visible = open && this.recording
    }

    start()
    {
        this.recording = true
        this.setOpen(true)
        if(this.marker)
            this.marker.visible = true
        this.refreshUi()
        console.info('[TrackPathRecorder] REC — drive the track')
    }

    stop()
    {
        this.recording = false
        if(this.marker)
            this.marker.visible = false
        this.refreshUi()
        console.info(`[TrackPathRecorder] STOP — ${this.points.length} points`)
        console.info(this.toJson())
    }

    clear()
    {
        this.points = []
        this.recording = false
        if(this.marker)
            this.marker.visible = false
        this.rebuildLine()
        this.refreshUi()
        console.info('[TrackPathRecorder] cleared')
    }

    payload()
    {
        return {
            generatedAt: new Date().toISOString(),
            source: 'player-drive-record',
            coordinateSpace: 'world',
            minStep: this.minStep,
            pointCount: this.points.length,
            points: this.points.map((p) => ({
                x: Math.round(p.x * 1000) / 1000,
                z: Math.round(p.z * 1000) / 1000,
            })),
        }
    }

    toJson()
    {
        return JSON.stringify(this.payload(), null, 2)
    }

    async copy()
    {
        const text = this.toJson()
        try
        {
            await navigator.clipboard.writeText(text)
            this.statusEl.textContent = `COPIED · ${this.points.length} pts`
            console.info('[TrackPathRecorder] copied to clipboard')
        }
        catch
        {
            console.info(text)
            this.statusEl.textContent = `SEE CONSOLE · ${this.points.length} pts`
        }
    }

    download()
    {
        const blob = new Blob([ this.toJson() ], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `drive-path-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
        this.statusEl.textContent = `DOWNLOADED · ${this.points.length} pts`
    }

    refreshUi()
    {
        const mode = this.recording ? 'REC' : 'IDLE'
        this.statusEl.textContent = `${mode} · ${this.points.length} pts`
        const last = this.points.slice(-6)
        this.previewEl.textContent = last.length
            ? last.map((p) => `${p.x.toFixed(2)}, ${p.z.toFixed(2)}`).join('\n')
            : 'no points yet — press REC and drive'
        this.root.classList.toggle('is-recording', this.recording)
    }

    rebuildLine()
    {
        if(!this.line)
            return

        if(this.points.length < 2)
        {
            this.line.visible = false
            return
        }

        const arr = new Float32Array(this.points.length * 3)
        for(let i = 0; i < this.points.length; i++)
        {
            arr[i * 3] = this.points[i].x
            arr[i * 3 + 1] = 0.6
            arr[i * 3 + 2] = this.points[i].z
        }
        this.line.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3))
        this.line.geometry.attributes.position.needsUpdate = true
        this.line.geometry.computeBoundingSphere()
        this.line.visible = this.open
    }

    update()
    {
        if(!this.recording || !this.game.player)
            return

        const x = this.game.player.position.x
        const z = this.game.player.position.z
        const last = this.points[this.points.length - 1]

        if(!last || Math.hypot(x - last.x, z - last.z) >= this.minStep)
        {
            this.points.push({ x, z })
            this.rebuildLine()
            this.refreshUi()
        }

        if(this.marker)
            this.marker.position.set(x, 1.2, z)
    }
}
