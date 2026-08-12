import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'
import { Game } from '../../Game.js'

const matCache = new Map()

export function vibeMat(hex, hasWater = false)
{
    const key = `${hex}|${hasWater ? 1 : 0}`
    if(matCache.has(key))
        return matCache.get(key)

    const mat = new MeshDefaultMaterial({
        colorNode: color(hex),
        hasWater,
    })
    matCache.set(key, mat)
    return mat
}

/**
 * Folio-readable outfits — warm skin, high-contrast eyes (LetterBuilder DNA).
 */
const OUTFITS = {
    teal: {
        shirt: '#1fa7a0', pants: '#243447', skin: '#e8b98a', skinDeep: '#c68642',
        hair: '#2a1f18', accent: '#ffb703', iris: '#2f6b4f', lips: '#b56a58',
        blush: '#f0a898', hairStyle: 'short',
    },
    mango: {
        shirt: '#f0a202', pants: '#3d2c29', skin: '#c68642', skinDeep: '#8d5524',
        hair: '#1a0f0a', accent: '#e85d04', iris: '#3d2914', lips: '#8a4a38',
        blush: '#c47860', hairStyle: 'curl',
    },
    indigo: {
        shirt: '#5b4dff', pants: '#1e1b2e', skin: '#f0c987', skinDeep: '#d4a574',
        hair: '#3b2f2f', accent: '#ff006e', iris: '#4a3728', lips: '#c4846a',
        blush: '#efb0a0', hairStyle: 'side',
    },
    rose: {
        shirt: '#e85d75', pants: '#2d2438', skin: '#f3d5b5', skinDeep: '#e8c4a0',
        hair: '#4a3728', accent: '#ff006e', iris: '#5c4033', lips: '#d4899a',
        blush: '#f0b0b8', hairStyle: 'bob',
    },
    cocoa: {
        shirt: '#2ec4b6', pants: '#1b1b1b', skin: '#8d5524', skinDeep: '#6b3e1a',
        hair: '#0d0d0d', accent: '#00bbf9', iris: '#2a1810', lips: '#6b4030',
        blush: '#a86b50', hairStyle: 'fade',
    },
    sand: {
        shirt: '#7b5cff', pants: '#2b2d42', skin: '#f0c987', skinDeep: '#e0ac69',
        hair: '#6b4423', accent: '#ffb703', iris: '#5a3d22', lips: '#c68642',
        blush: '#efb89a', hairStyle: 'ponytail',
    },
    olive: {
        shirt: '#386641', pants: '#283618', skin: '#d4a574', skinDeep: '#a67c52',
        hair: '#2b1d3a', accent: '#a7c957', iris: '#344e41', lips: '#9c6644',
        blush: '#d4a090', hairStyle: 'short',
    },
    pearl: {
        shirt: '#ff8fab', pants: '#3d2c29', skin: '#ffe4c8', skinDeep: '#f5d0a9',
        hair: '#c9a06a', accent: '#ff006e', iris: '#5b8c5a', lips: '#e8a0a8',
        blush: '#ffc0c8', hairStyle: 'bob',
    },
}

/**
 * Pose = how we bend standing geometry onto furniture.
 * Legs start vertical (LetterBuilder style); sit rotates thighs forward.
 */
const POSES = {
    // bodyDrop = how far body sinks when sit=1 (hips land on seat)
    standing: { sit: 0, lean: 0, bodyDrop: 0, includeStool: false },
    booth: { sit: 1, lean: 0.05, bodyDrop: 0.52, includeStool: false },
    // Real lounge stools exist — don't spawn a second stool
    stool: { sit: 0.92, lean: 0.04, bodyDrop: 0.5, includeStool: false },
    lounger: { sit: 0.55, lean: -0.2, bodyDrop: 0.28, includeStool: false },
    // Built-in stool for dock / open ground fishing
    fishing: { sit: 0.95, lean: 0.06, bodyDrop: 0.25, includeStool: true },
}

/**
 * Cute stylized chai patron — LetterBuilder readability, not trash MC cubes.
 * API: position, yaw, outfit, drink, pose, knockable, phase, lookAtPlayer
 */
export class VoxelPatron
{
    constructor(options = {})
    {
        this.drink = options.drink ?? 'chai'
        this.phase = options.phase ?? Math.random() * Math.PI * 2
        this.lookAtPlayer = options.lookAtPlayer !== false
        this.baseYaw = options.yaw ?? 0
        this.poseName = options.pose ?? 'booth'
        this.knockable = options.knockable !== false

        const game = Game.getInstance?.() ?? null
        this.game = game
        this.low = (game?.quality?.level ?? 0) === 1

        this.group = new THREE.Group()
        this.group.name = options.name ?? 'voxelPatron'
        this.group.position.set(options.position.x, options.position.y, options.position.z)
        this.group.rotation.y = this.baseYaw

        // Chibi toy scale — readable at folio camera distance
        this.group.scale.setScalar(0.46)

        const o = OUTFITS[options.outfit] ?? OUTFITS.teal
        this.outfit = o

        const pants = vibeMat(o.pants)
        const skin = vibeMat(o.skin)
        const skinDeep = vibeMat(o.skinDeep)
        const shirt = vibeMat(o.shirt)
        const hairM = vibeMat(o.hair)
        const shoeM = vibeMat('#2a2118')
        const accent = vibeMat(o.accent)
        const irisM = vibeMat(o.iris)
        const white = vibeMat('#ffffff')
        const lipM = vibeMat(o.lips)
        const blushM = vibeMat(o.blush)
        const dark = vibeMat('#1a1410')

        this.body = new THREE.Group()
        this.group.add(this.body)

        // —— Legs (vertical standing baseline) ——
        this.legL = this._makeLeg(-0.2, pants, shoeM, skin)
        this.legR = this._makeLeg(0.2, pants, shoeM, skin)
        this.body.add(this.legL, this.legR)

        // —— Hips / torso ——
        this.hips = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.42), pants)
        this.hips.position.set(0, 0.7, 0)
        this.body.add(this.hips)

        this.torso = new THREE.Group()
        this.torso.position.set(0, 0.95, 0)
        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.7, 0.44), shirt)
        chest.position.y = 0.2
        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.46), accent)
        collar.position.y = 0.52
        this.torso.add(chest, collar)
        if(!this.low)
        {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.46), accent)
            stripe.position.set(0, 0.18, 0.01)
            this.torso.add(stripe)
            const btn = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), vibeMat('#f5c518'))
            btn.position.set(0, 0.28, 0.24)
            this.torso.add(btn)
        }
        this.body.add(this.torso)

        // —— Arms ——
        this.armL = this._makeArm(-1, shirt, skin)
        this.armR = this._makeArm(1, shirt, skin)
        this.cup = this._makeCup()
        this.cup.position.set(0, -0.62, 0.12)
        this.armR.add(this.cup)
        this.torso.add(this.armL, this.armR)

        // —— Head ——
        this._buildHead(skin, skinDeep, hairM, irisM, white, lipM, blushM, dark, o.hairStyle)

        // Optional stool for stool/fishing poses
        const poseCfg = POSES[this.poseName] ?? POSES.booth
        if(poseCfg.includeStool)
            this._buildStool()

        // Fishing rod in hand (not floating through back)
        if(this.poseName === 'fishing')
            this._buildRod()

        this.steam = []
        if(!this.low && this.poseName !== 'fishing')
        {
            for(let i = 0; i < 2; i++)
            {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), white)
                puff.position.set(0.02, 0.1 + i * 0.08, 0.18)
                puff.scale.setScalar(0.01)
                this.cup.add(puff)
                this.steam.push({ mesh: puff, offset: i * 0.7 })
            }
        }

        const cast = !this.low
        this.group.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.castShadow = cast
                child.receiveShadow = false
                child.frustumCulled = true
            }
        })

        this._blinkUntil = 0
        this._nextBlink = 2 + Math.random() * 3
        this._animFar = false

        this._applyPose(this.poseName)

        this.restPos = new THREE.Vector3(options.position.x, options.position.y, options.position.z)
        this.stunVel = new THREE.Vector3()
        this.stunTimer = 0
        this.hitCooldown = 0
        this._stunned = false
    }

    _makeLeg(x, pants, shoeM, skin)
    {
        const leg = new THREE.Group()
        leg.position.set(x, 0.7, 0)
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.28), pants)
        thigh.position.y = -0.18
        const shin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.26), pants)
        shin.position.y = -0.52
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.38), shoeM)
        boot.position.set(0, -0.72, 0.04)
        leg.add(thigh, shin, boot)
        if(!this.low)
        {
            const sock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.24), skin)
            sock.position.y = -0.62
            leg.add(sock)
        }
        return leg
    }

    _makeArm(side, shirt, skin)
    {
        const arm = new THREE.Group()
        arm.position.set(side * 0.46, 0.42, 0)
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.2), shirt)
        upper.position.y = -0.16
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), skin)
        hand.position.y = -0.42
        arm.add(upper, hand)
        return arm
    }

    _buildHead(skin, skinDeep, hairM, irisM, white, lipM, blushM, dark, hairStyle)
    {
        this.head = new THREE.Group()
        // Chibi: oversized head for “pretty 2.0” readability
        this.head.position.set(0, 1.68, 0)
        this.head.scale.setScalar(1.18)

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, this.low ? 6 : 8), skin)
        neck.position.y = -0.22

        const skull = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.58, 0.54), skin)
        this.head.add(neck, skull)

        // Big readable eyes
        this.eyeWhiteL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.06), white)
        this.eyeWhiteL.position.set(-0.15, 0.05, 0.28)
        this.eyeWhiteR = this.eyeWhiteL.clone()
        this.eyeWhiteR.position.x = 0.15

        this.eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.05), irisM)
        this.eyeL.position.set(-0.15, 0.05, 0.31)
        this.eyeR = this.eyeL.clone()
        this.eyeR.position.x = 0.15

        const pupilL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.04), dark)
        pupilL.position.set(-0.15, 0.05, 0.34)
        const pupilR = pupilL.clone()
        pupilR.position.x = 0.15

        this.head.add(this.eyeWhiteL, this.eyeWhiteR, this.eyeL, this.eyeR, pupilL, pupilR)

        if(!this.low)
        {
            const sparkL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), white)
            sparkL.position.set(-0.11, 0.07, 0.34)
            const sparkR = sparkL.clone()
            sparkR.position.x = 0.17
            this.head.add(sparkL, sparkR)

            const blushL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), blushM)
            blushL.position.set(-0.2, -0.08, 0.24)
            const blushR = blushL.clone()
            blushR.position.x = 0.2
            this.head.add(blushL, blushR)

            const browL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.04), hairM)
            browL.position.set(-0.14, 0.14, 0.28)
            browL.rotation.z = 0.12
            const browR = browL.clone()
            browR.position.x = 0.14
            browR.rotation.z = -0.12
            this.head.add(browL, browR)

            const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.1), skinDeep)
            nose.position.set(0, -0.02, 0.3)
            this.head.add(nose)

            const earL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), skin)
            earL.position.set(-0.32, 0.02, 0)
            const earR = earL.clone()
            earR.position.x = 0.32
            this.head.add(earL, earR)
        }

        this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), lipM)
        this.mouth.position.set(0, -0.16, 0.27)
        this.head.add(this.mouth)

        this._addHair(hairM, hairStyle)
        this.body.add(this.head)
    }

    _addHair(hairM, style)
    {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.56), hairM)
        cap.position.y = 0.28
        this.head.add(cap)

        if(style === 'bob' || style === 'side')
        {
            const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.28), hairM)
            sideL.position.set(-0.3, 0.02, 0)
            const sideR = sideL.clone()
            sideR.position.x = 0.3
            this.head.add(sideL, sideR)
        }
        if(style === 'bob' || style === 'curl' || style === 'ponytail')
        {
            const bang = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), hairM)
            bang.position.set(0, 0.18, 0.28)
            this.head.add(bang)
        }
        if(style === 'ponytail')
        {
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.4, 6), hairM)
            tail.position.set(0, 0.05, -0.28)
            tail.rotation.x = 0.4
            this.head.add(tail)
        }
        if(style === 'curl')
        {
            for(const sx of [-0.28, 0.28])
            {
                const curl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), hairM)
                curl.position.set(sx, 0.12, -0.05)
                this.head.add(curl)
            }
        }
        if(style === 'fade')
        {
            const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.45), hairM)
            top.position.y = 0.32
            this.head.add(top)
        }
    }

    _makeCup()
    {
        const cup = new THREE.Group()
        const liquid = this.drink === 'coffee' ? '#3b2314' : '#c45c26'
        const cupColor = this.drink === 'coffee' ? '#f4f0e6' : '#ffffff'
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.16, this.low ? 6 : 10), vibeMat(cupColor))
        const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, this.low ? 6 : 10), vibeMat(liquid))
        fill.position.y = 0.06
        cup.add(mug, fill)
        if(!this.low)
        {
            const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 10, Math.PI), vibeMat(cupColor))
            handle.rotation.y = Math.PI / 2
            handle.position.set(0.09, 0, 0)
            cup.add(handle)
        }
        return cup
    }

    _buildStool()
    {
        // Seat height matches hips after fishing bodyDrop (local ≈ 0.45)
        const wood = vibeMat('#8b6914')
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.1, 10), wood)
        seat.position.y = 0.45
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8), wood)
        post.position.y = 0.22
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.06, 10), wood)
        base.position.y = 0.03
        this.group.add(seat, post, base)
    }

    _buildRod()
    {
        const rod = new THREE.Group()
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), vibeMat('#5c4033'))
        handle.position.set(0, 0, 0.2)
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 1.1), vibeMat('#8b6914'))
        tip.position.set(0, 0.15, 0.7)
        tip.rotation.x = -0.55
        rod.add(handle, tip)
        rod.position.set(0.05, -0.35, 0.15)
        this.armL.add(rod)
        this.cup.visible = false
    }

    _applyPose(name)
    {
        const cfg = POSES[name] ?? POSES.booth
        const sit = cfg.sit

        // Bend thighs forward for sit (standing legs → seated)
        const thighBend = -sit * 1.2
        this.legL.rotation.x = thighBend
        this.legR.rotation.x = thighBend

        // Drop body onto seat when sitting
        this.body.position.y = -sit * (cfg.bodyDrop ?? 0.5)
        this.body.rotation.x = cfg.lean

        // Arms at rest / sip
        this.armL.rotation.z = 0.25
        this.armL.rotation.x = name === 'fishing' ? -0.9 : -0.35
        this.armR.rotation.z = -0.2
        this.armR.rotation.x = -0.45
    }

    _resetAfterStun()
    {
        this._stunned = false
        this.body.rotation.set(0, 0, 0)
        this.group.position.copy(this.restPos)
        this.group.rotation.y = this.baseYaw
        this._applyPose(this.poseName)
    }

    checkCarHit()
    {
        if(!this.knockable || this._stunned || this.hitCooldown > 0 || !this.game)
            return

        const vehicle = this.game.physicalVehicle
        if(!vehicle)
            return

        const car = vehicle.position
        const dx = this.group.position.x - car.x
        const dy = this.group.position.y - car.y
        const dz = this.group.position.z - car.z
        const dist = Math.hypot(dx, dy, dz)
        const speed = Math.abs(vehicle.forwardSpeed ?? vehicle.speed ?? 0)

        if(dist > 1.7 || speed < 2.0)
            return

        const len = Math.hypot(dx, dz) || 1
        const force = THREE.MathUtils.clamp(speed * 0.38, 4, 14)
        this.stunVel.set((dx / len) * force, 5 + speed * 0.1, (dz / len) * force)
        this.stunTimer = 1.2 + Math.min(speed * 0.05, 0.9)
        this.hitCooldown = 2.0
        this._stunned = true
        this.game.audio.groups.get('hitDefault')?.playRandomNext?.(Math.min(speed * 2, 40), this.group.position)
    }

    _updateStun(dt)
    {
        this.stunTimer -= dt
        this.group.position.x += this.stunVel.x * dt
        this.group.position.y += this.stunVel.y * dt
        this.group.position.z += this.stunVel.z * dt
        this.stunVel.y -= 16 * dt
        this.body.rotation.x += dt * 9
        this.body.rotation.z += dt * 6

        if(this.group.position.y < this.restPos.y)
        {
            this.group.position.y = this.restPos.y
            this.stunVel.y *= -0.3
            this.stunVel.x *= 0.55
            this.stunVel.z *= 0.55
        }

        if(this.stunTimer <= 0)
            this._resetAfterStun()
    }

    update(elapsed, playerPos = null)
    {
        const dt = this.game?.ticker?.deltaScaled ?? 0.016
        if(this.hitCooldown > 0)
            this.hitCooldown -= dt

        if(this._stunned)
        {
            this._updateStun(dt)
            return
        }

        this.checkCarHit()

        if(playerPos)
        {
            const dist = Math.hypot(
                playerPos.x - this.group.position.x,
                playerPos.z - this.group.position.z
            )
            if(dist > (this.low ? 22 : 28))
                return
        }

        const t = elapsed + this.phase
        const cfg = POSES[this.poseName] ?? POSES.booth

        this.body.position.y = -cfg.sit * 0.35 + Math.sin(t * 1.55) * 0.01
        this.body.rotation.x = cfg.lean + Math.sin(t * 1.1) * 0.01

        if(elapsed > this._nextBlink)
        {
            this._blinkUntil = elapsed + 0.12
            this._nextBlink = elapsed + 2.2 + Math.random() * 3.5
        }
        const blinking = elapsed < this._blinkUntil
        const eyeScaleY = blinking ? 0.08 : 1
        this.eyeL.scale.y = eyeScaleY
        this.eyeR.scale.y = eyeScaleY
        this.eyeWhiteL.scale.y = eyeScaleY
        this.eyeWhiteR.scale.y = eyeScaleY

        let headYaw = Math.sin(t * 0.55) * 0.1
        let headPitch = Math.sin(t * 0.9) * 0.05
        if(this.lookAtPlayer && playerPos)
        {
            const dx = playerPos.x - this.group.position.x
            const dz = playerPos.z - this.group.position.z
            const dist = Math.hypot(dx, dz)
            if(dist < 12)
            {
                const worldYaw = Math.atan2(dx, dz)
                let local = worldYaw - this.group.rotation.y
                while(local > Math.PI) local -= Math.PI * 2
                while(local < -Math.PI) local += Math.PI * 2
                const attention = 1 - dist / 12
                headYaw = THREE.MathUtils.clamp(local, -0.7, 0.7) * attention
                headPitch = THREE.MathUtils.clamp((playerPos.y - this.group.position.y - 1) * 0.05, -0.2, 0.25)
            }
        }
        this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, headYaw, 0.08)
        this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, headPitch, 0.08)

        if(this.poseName === 'fishing')
        {
            this.armL.rotation.x = -0.9 + Math.sin(t * 0.7) * 0.08
            this.armL.rotation.z = 0.15
        }
        else
        {
            const cycle = (t % 4.6) / 4.6
            let sip = 0
            if(cycle > 0.52 && cycle < 0.82)
                sip = Math.sin(((cycle - 0.52) / 0.3) * Math.PI)
            this.armR.rotation.x = -0.45 - sip * 0.95
            this.armR.rotation.z = -0.2 + sip * 0.15
            this.cup.rotation.x = sip * 0.55
            this.head.rotation.x += sip * 0.12
            if(this.mouth)
                this.mouth.scale.y = 1 + sip * 0.35
            this.armL.rotation.z = 0.25 + Math.sin(t * 0.8) * 0.04
        }

        for(const s of this.steam)
        {
            const u = ((t * 0.6 + s.offset) % 1.8) / 1.8
            s.mesh.position.y = 0.1 + u * 0.28
            s.mesh.position.x = Math.sin(t + s.offset) * 0.04
            const sc = u < 0.2 ? u * 5 : Math.max(0.01, 1 - u)
            s.mesh.scale.setScalar(0.4 + sc * 0.8)
        }
    }
}
