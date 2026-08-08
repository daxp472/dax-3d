import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import gsap from 'gsap'
import { Game } from '../Game.js'
import { InteractivePoints } from '../InteractivePoints.js'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'
import { BuilderSpeech } from './BuilderSpeech.js'
import featuredNotes from '../../data/guestbookFeatured.js'

/**
 * Visitor Notes wall — folio-styled cork board with Hall of Fame + live notes.
 * - View wall → cinematic camera rolls to face the board
 * - Write note → whispers menu
 * - Click a frame → opens that note only
 */
export class GuestbookBoard
{
    constructor(anchorPosition, facingYaw = 0)
    {
        this.game = Game.getInstance()
        this.destroyed = false
        this.focusing = false

        this.group = new THREE.Group()
        this.group.name = 'guestbookBoard'
        this.group.position.copy(anchorPosition)
        this.group.rotation.y = facingYaw
        this.game.scene.add(this.group)

        this.position = anchorPosition.clone()
        this.position.y = 0
        this.game.guestbookBoard = this

        this.liveSlots = []
        this.frameCards = []
        this.cardIntersects = []
        this.featuredEntries = []
        this.readableNotes = []
        this.selectedIndex = 0
        this.localNotes = this.loadLocalNotes()
        this.speech = new BuilderSpeech()

        this.buildStructure()
        this.buildFeaturedRow()
        this.buildLiveGrid()
        this.buildTitle()
        this.setInteractions()
        this.refreshLiveCards()

        this.tickCallback = () => this.update()
        this.game.ticker.events.on('tick', this.tickCallback, 11)

        this.onServerMessage = (data) =>
        {
            if(data.type === 'init' || data.type === 'whispersInsert' || data.type === 'whispersDelete')
                this.refreshLiveCards()
        }
        this.game.server.events.on('message', this.onServerMessage)
    }

    mat(hex)
    {
        return new MeshDefaultMaterial({
            colorNode: color(hex),
            hasWater: false,
        })
    }

    /** World-space point in front of the cork face */
    getFrontWorld(distance = 4.5, height = 2.2)
    {
        const forward = new THREE.Vector3(0, 0, distance)
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y)
        return this.position.clone().add(forward).setY(height)
    }

    getBoardCenterWorld()
    {
        const forward = new THREE.Vector3(0, 0, 0.2)
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y)
        return this.position.clone().add(forward).setY(1.55)
    }

    buildStructure()
    {
        // Folio palette: deep plum wood + warm cork + salmon accent (matches letters / UI)
        const wood = this.mat('#2a2430')
        const darkWood = this.mat('#1d1721')
        const cork = this.mat('#e8d5b5')
        const brass = this.mat('#e49a78')
        const trim = this.mat('#ffceca')

        const postGeo = new THREE.BoxGeometry(0.2, 2.75, 0.2)
        const postL = new THREE.Mesh(postGeo, darkWood)
        const postR = postL.clone()
        postL.position.set(-2.45, 1.35, 0.02)
        postR.position.set(2.45, 1.35, 0.02)
        this.group.add(postL, postR)

        const back = new THREE.Mesh(new THREE.BoxGeometry(4.85, 2.45, 0.14), wood)
        back.position.set(0, 1.5, 0)
        this.group.add(back)

        const face = new THREE.Mesh(new THREE.BoxGeometry(4.55, 2.15, 0.05), cork)
        face.position.set(0, 1.5, 0.1)
        this.group.add(face)

        const ledge = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 0.32), darkWood)
        ledge.position.set(0, 2.72, 0.08)
        this.group.add(ledge)

        // Salmon accent rail (folio letter color)
        const rail = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.06, 0.06), brass)
        rail.position.set(0, 2.55, 0.14)
        this.group.add(rail)

        const plateGeo = new THREE.BoxGeometry(0.28, 0.28, 0.04)
        for(const [ x, y ] of [[ -2.1, 2.4 ], [ 2.1, 2.4 ], [ -2.1, 0.6 ], [ 2.1, 0.6 ]])
        {
            const p = new THREE.Mesh(plateGeo, trim)
            p.position.set(x, y, 0.14)
            this.group.add(p)
        }

        this.group.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
                child.frustumCulled = false
            }
        })
    }

    buildTitle()
    {
        const canvas = this.drawBanner(900, 140)
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.needsUpdate = true
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true })
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.44), mat)
        mesh.position.set(0, 2.95, 0.22)
        mesh.renderOrder = 4
        this.group.add(mesh)
    }

    drawBanner(w, h)
    {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')

        // Rounded dark card like folio notifications
        ctx.fillStyle = '#1d1721'
        this.roundRect(ctx, 8, 8, w - 16, h - 16, 18)
        ctx.fill()
        ctx.strokeStyle = '#e49a78'
        ctx.lineWidth = 6
        this.roundRect(ctx, 8, 8, w - 16, h - 16, 18)
        ctx.stroke()

        ctx.fillStyle = '#ffceca'
        ctx.font = '700 52px "Amatic SC", cursive'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('VISITOR NOTES', w / 2, h * 0.42)

        ctx.fillStyle = '#ffffff'
        ctx.font = '600 22px "Nunito", sans-serif'
        ctx.fillText('kind words only · click a frame to open', w / 2, h * 0.72)
        return canvas
    }

    roundRect(ctx, x, y, w, h, r)
    {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + w, y, x + w, y + h, r)
        ctx.arcTo(x + w, y + h, x, y + h, r)
        ctx.arcTo(x, y + h, x, y, r)
        ctx.arcTo(x, y, x + w, y, r)
        ctx.closePath()
    }

    buildFeaturedRow()
    {
        const notes = featuredNotes.slice(0, 5)
        const width = 0.78
        const gap = 0.1
        const total = notes.length * width + (notes.length - 1) * gap
        let x = -total * 0.5 + width * 0.5

        notes.forEach((note) =>
        {
            const card = this.createCardMesh(width, 0.68, true)
            card.position.set(x, 2.2, 0.17)
            this.group.add(card)
            this.paintCard(card, note.message, note.author || 'Hall of Fame', true)
            this.frameCards.push(card)

            const entry = {
                card,
                message: note.message,
                caption: note.author || 'Hall of Fame',
                featured: true,
            }
            this.featuredEntries.push(entry)
            this.bindCardClick(entry)
            x += width + gap
        })
    }

    buildLiveGrid()
    {
        const cols = 3
        const rows = 2
        const width = 1.3
        const height = 0.74
        const gapX = 0.14
        const gapY = 0.12
        const startY = 1.42

        for(let r = 0; r < rows; r++)
        {
            for(let c = 0; c < cols; c++)
            {
                const card = this.createCardMesh(width, height, false)
                const x = (c - (cols - 1) * 0.5) * (width + gapX)
                const y = startY - r * (height + gapY)
                card.position.set(x, y, 0.17)
                this.group.add(card)
                const slot = { card, message: null, caption: null, featured: false }
                this.liveSlots.push(slot)
                this.paintCard(card, 'Waiting for a kind note…', 'empty wall', false, true)
                this.bindCardClick(slot)
            }
        }
    }

    createCardMesh(width, height, featured)
    {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = Math.round(512 * (height / width))

        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.needsUpdate = true

        const mat = new THREE.MeshBasicMaterial({ map: tex })
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat)
        mesh.userData.canvas = canvas
        mesh.userData.texture = tex
        mesh.userData.featured = featured
        mesh.frustumCulled = false
        mesh.renderOrder = 3

        // Physical paper stack depth for premium feel
        const paper = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.04, height + 0.04, 0.03),
            this.mat(featured ? '#3d2a22' : '#2a2430')
        )
        paper.position.z = -0.02
        mesh.add(paper)

        return mesh
    }

    bindCardClick(entry)
    {
        const mesh = entry.card
        mesh.updateMatrixWorld(true)
        const worldPos = new THREE.Vector3()
        mesh.getWorldPosition(worldPos)

        const intersect = this.game.rayCursor.addIntersect({
            active: true,
            shape: new THREE.Sphere(worldPos.clone(), entry.featured ? 0.45 : 0.55),
            onClick: () =>
            {
                if(!entry.message)
                {
                    this.speech.sayForce('Empty frame', 'This spot is waiting for a kind note — hit Write note!', 3, 'guestbook-empty')
                    return
                }
                this.selectNoteByCard(mesh)
                this.openSelectedNote()
            },
        })

        mesh.userData.intersect = intersect
        mesh.userData.syncIntersect = () =>
        {
            mesh.getWorldPosition(worldPos)
            intersect.shape.center.copy(worldPos)
        }
        this.cardIntersects.push(mesh)
    }

    paintCard(mesh, message, caption, featured = false, empty = false, selected = false)
    {
        const canvas = mesh.userData.canvas
        const ctx = canvas.getContext('2d')
        const w = canvas.width
        const h = canvas.height

        ctx.clearRect(0, 0, w, h)

        ctx.fillStyle = empty ? '#efe4d0' : (featured ? '#fff6e8' : '#fffaf3')
        this.roundRect(ctx, 0, 0, w, h, 18)
        ctx.fill()

        ctx.strokeStyle = selected
            ? '#ffceca'
            : (featured ? '#e49a78' : (empty ? '#c4b09a' : '#2a2430'))
        ctx.lineWidth = selected ? 18 : (featured ? 14 : 10)
        this.roundRect(ctx, 10, 10, w - 20, h - 20, 14)
        ctx.stroke()

        if(featured)
        {
            ctx.fillStyle = '#e49a78'
            ctx.fillRect(10, 10, w - 20, 36)
            ctx.fillStyle = '#1d1721'
            ctx.font = '700 18px "Nunito", sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('★ HALL OF FAME ★', w / 2, 34)
        }

        ctx.fillStyle = empty ? '#9a8570' : '#1d1721'
        ctx.font = featured
            ? '700 34px "Amatic SC", cursive'
            : '700 32px "Amatic SC", cursive'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        this.wrapText(ctx, message, w / 2, h * (featured ? 0.55 : 0.45), w - 70, 36)

        ctx.fillStyle = empty ? '#b09a82' : '#e49a78'
        ctx.font = '600 17px "Nunito", sans-serif'
        ctx.fillText(caption, w / 2, h - 30)

        if(!empty)
        {
            ctx.fillStyle = selected ? '#1d1721' : '#8a7a6a'
            ctx.font = '600 14px "Nunito", sans-serif'
            ctx.fillText(selected ? 'selected · open' : 'click to open', w / 2, h - 12)
        }

        mesh.userData.texture.needsUpdate = true
        mesh.userData.lastPaint = { message, caption, featured, empty }
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight)
    {
        const words = String(text).split(/\s+/)
        const lines = []
        let line = ''

        for(const word of words)
        {
            const test = line ? `${line} ${word}` : word
            if(ctx.measureText(test).width > maxWidth && line)
            {
                lines.push(line)
                line = word
            }
            else
                line = test
        }
        if(line)
            lines.push(line)

        const startY = y - ((lines.length - 1) * lineHeight) * 0.5
        lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight))
    }

    getWhisperMessages()
    {
        const whispers = this.game.world?.whispers
        if(!whispers?.data?.items)
            return []

        return whispers.data.items
            .filter((item) => !item.available && item.message)
            .map((item) => ({
                message: item.message,
                caption: item.countryCode ? `visitor · ${item.countryCode}` : 'visitor',
                id: item.id,
            }))
    }

    refreshLiveCards()
    {
        const live = this.getWhisperMessages()
        const local = this.localNotes.map((n) => ({
            message: n.message,
            caption: n.caption || 'local note',
        }))

        const merged = [...live, ...local]
        const unique = []
        const seen = new Set()
        for(const note of merged)
        {
            const key = note.message.toLowerCase()
            if(seen.has(key))
                continue
            seen.add(key)
            unique.push(note)
        }

        this.liveSlots.forEach((slot, i) =>
        {
            const note = unique[i]
            if(note)
            {
                slot.message = note.message
                slot.caption = note.caption
                this.paintCard(slot.card, note.message, note.caption, false, false, false)
            }
            else
            {
                slot.message = null
                slot.caption = null
                this.paintCard(slot.card, 'Waiting for a kind note…', 'your words could live here', false, true, false)
            }
        })

        this.rebuildReadableNotes()
    }

    rebuildReadableNotes()
    {
        this.readableNotes = [
            ...(this.featuredEntries || []),
            ...this.liveSlots.filter((slot) => slot.message),
        ]

        if(this.selectedIndex >= this.readableNotes.length)
            this.selectedIndex = Math.max(0, this.readableNotes.length - 1)

        this.repaintSelection()
    }

    repaintSelection()
    {
        const selected = this.readableNotes[this.selectedIndex]
        const all = [ ...(this.featuredEntries || []), ...this.liveSlots ]

        for(const entry of all)
        {
            if(!entry.message)
            {
                this.paintCard(entry.card, 'Waiting for a kind note…', entry.caption || 'your words could live here', !!entry.featured, true, false)
                continue
            }
            const isSelected = this.focusing && selected && entry.card === selected.card
            this.paintCard(
                entry.card,
                entry.message,
                entry.caption,
                !!entry.featured,
                false,
                isSelected
            )
        }
    }

    selectNoteByCard(card)
    {
        const index = this.readableNotes.findIndex((entry) => entry.card === card)
        if(index >= 0)
        {
            this.selectedIndex = index
            this.repaintSelection()
        }
    }

    cycleNote(delta)
    {
        if(!this.readableNotes.length)
            return

        this.selectedIndex = (this.selectedIndex + delta + this.readableNotes.length) % this.readableNotes.length
        this.repaintSelection()
        this.openSelectedNote()
    }

    openSelectedNote()
    {
        const note = this.readableNotes[this.selectedIndex]
        if(!note?.message)
        {
            this.speech.sayForce('Empty wall', 'No notes here yet — leave the first kind one!', 3, 'guestbook-none')
            return
        }
        this.openSingleNote(note.message, note.caption)
    }

    loadLocalNotes()
    {
        try
        {
            const raw = localStorage.getItem('dax-guestbook-local')
            return raw ? JSON.parse(raw) : []
        }
        catch
        {
            return []
        }
    }

    saveLocalNote(message)
    {
        const note = { message, caption: 'you · local', at: Date.now() }
        this.localNotes = [ note, ...this.localNotes ].slice(0, 12)
        try
        {
            localStorage.setItem('dax-guestbook-local', JSON.stringify(this.localNotes))
        }
        catch { /* ignore */ }
        this.refreshLiveCards()
    }

    setInteractions()
    {
        const writePos = this.getFrontWorld(1.35, 1.15)
        const viewPos = writePos.clone()
        const along = new THREE.Vector3(1.35, 0, 0)
        along.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y)
        viewPos.add(along)

        this.writePoint = this.game.interactivePoints.create(
            writePos,
            'Write note',
            InteractivePoints.ALIGN_LEFT,
            InteractivePoints.STATE_CONCEALED,
            () => this.openWrite(),
            () => this.game.inputs.interactiveButtons.addItems([ 'interact' ]),
            () => this.game.inputs.interactiveButtons.removeItems([ 'interact' ]),
            () => this.game.inputs.interactiveButtons.removeItems([ 'interact' ])
        )

        this.viewPoint = this.game.interactivePoints.create(
            viewPos,
            'View wall',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () => this.focusCamera(),
            () => this.game.inputs.interactiveButtons.addItems([ 'interact' ]),
            () => this.game.inputs.interactiveButtons.removeItems([ 'interact' ]),
            () => this.game.inputs.interactiveButtons.removeItems([ 'interact' ])
        )
    }

    getSnapPosition()
    {
        const p = this.getFrontWorld(0.9, 0.15)
        p.x += (Math.random() - 0.5) * 1.6
        return p
    }

    /**
     * Smooth cinematic roll so the wall fills the view (Projects/Lab pattern).
     * Buttons: previous / next / open (this note only) / close
     */
    focusCamera()
    {
        if(this.focusing)
            return

        this.rebuildReadableNotes()
        if(this.readableNotes.length)
            this.selectedIndex = 0

        const target = this.getBoardCenterWorld()
        const position = this.getFrontWorld(5.2, 3.4)

        this.focusing = true
        this.game.inputs.filters.delete('wandering')
        this.game.inputs.filters.add('cinematic')
        this.game.view.focusPoint.isTracking = false
        // Keep ray-cursor distance checks valid while camera is on the wall
        this.game.view.focusPoint.position.x = this.position.x
        this.game.view.focusPoint.position.z = this.position.z
        this.game.view.cinematic.start(position, target)
        this.game.physicalVehicle.deactivate()
        this.game.interactivePoints.temporaryHide()
        this.game.inputs.interactiveButtons.clearItems()
        this.game.inputs.interactiveButtons.addItems([ 'previous', 'next', 'open', 'close' ])

        this.repaintSelection()
        this.speech.sayForce(
            'Visitor Notes',
            'Use Open for the highlighted note, or click a frame. Close to drive again.',
            3.5,
            'guestbook-focus'
        )

        this._onPrevious = () => this.cycleNote(-1)
        this._onNext = () => this.cycleNote(1)
        this._onOpen = () => this.openSelectedNote()
        this._onClose = () => this.endFocus()

        this.game.inputs.interactiveButtons.events.on('previous', this._onPrevious)
        this.game.inputs.interactiveButtons.events.on('next', this._onNext)
        this.game.inputs.interactiveButtons.events.on('open', this._onOpen)
        this.game.inputs.interactiveButtons.events.on('close', this._onClose)

        if(this._focusTimeout)
            this._focusTimeout.kill()
        this._focusTimeout = gsap.delayedCall(60, () => this.endFocus())
    }

    endFocus()
    {
        if(!this.focusing)
            return

        this.focusing = false
        if(this._focusTimeout)
        {
            this._focusTimeout.kill()
            this._focusTimeout = null
        }

        const buttons = this.game.inputs.interactiveButtons.events
        if(this._onPrevious) buttons.off('previous', this._onPrevious)
        if(this._onNext) buttons.off('next', this._onNext)
        if(this._onOpen) buttons.off('open', this._onOpen)
        if(this._onClose) buttons.off('close', this._onClose)
        this._onPrevious = this._onNext = this._onOpen = this._onClose = null

        this.game.view.cinematic.end()
        this.game.inputs.filters.delete('cinematic')
        this.game.inputs.filters.add('wandering')
        this.game.physicalVehicle.activate()
        this.game.view.focusPoint.isTracking = true
        this.game.interactivePoints.recover()
        this.game.inputs.interactiveButtons.clearItems()
        this.repaintSelection()
    }

    openWrite()
    {
        if(this.game.world?.whispers)
            this.game.world.whispers.boardSnap = this

        this.game.menu.open('whispers')
        this.speech.say(
            'Leave a kind note',
            'Keep it warm — Hall of Fame loves the lovely ones.',
            3,
            'guestbook-write'
        )
    }

    openSingleNote(message, caption)
    {
        this.speech.sayForce(
            caption || 'Note',
            message,
            5.5,
            `guestbook-note-${String(message).slice(0, 24)}`
        )
    }

    openRead()
    {
        this.focusCamera()
    }

    update()
    {
        const t = this.game.ticker.elapsedScaled
        this.frameCards.forEach((card, i) =>
        {
            card.rotation.z = Math.sin(t * 0.6 + i) * 0.015
        })

        // Keep click spheres on cards
        for(const mesh of this.cardIntersects)
            mesh.userData.syncIntersect?.()
    }

    destroy()
    {
        this.destroyed = true
        this.endFocus()
        this.game.ticker.events.off('tick', this.tickCallback)
        this.game.server.events.off('message', this.onServerMessage)
        for(const mesh of this.cardIntersects)
        {
            if(mesh.userData.intersect)
                this.game.rayCursor.removeIntersect(mesh.userData.intersect)
        }
        this.group.removeFromParent()
        if(this.game.guestbookBoard === this)
            this.game.guestbookBoard = null
    }
}
