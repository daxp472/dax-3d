import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'
import { Game } from '../../Game.js'

const matCache = new Map()

/** Shared box geos — fewer allocations across all patrons. */
const GEO = {
    head: new THREE.BoxGeometry(0.38, 0.4, 0.36),
    cheek: new THREE.BoxGeometry(0.09, 0.11, 0.09),
    eyeWhite: new THREE.BoxGeometry(0.12, 0.08, 0.045),
    iris: new THREE.BoxGeometry(0.07, 0.07, 0.04),
    pupil: new THREE.BoxGeometry(0.032, 0.032, 0.032),
    spark: new THREE.BoxGeometry(0.018, 0.018, 0.02),
    brow: new THREE.BoxGeometry(0.12, 0.03, 0.035),
    nose: new THREE.BoxGeometry(0.06, 0.1, 0.08),
    noseTip: new THREE.BoxGeometry(0.08, 0.05, 0.06),
    mouth: new THREE.BoxGeometry(0.14, 0.04, 0.045),
    blush: new THREE.BoxGeometry(0.07, 0.05, 0.03),
    ear: new THREE.BoxGeometry(0.06, 0.12, 0.07),
    hairCap: new THREE.BoxGeometry(0.4, 0.16, 0.38),
    bang: new THREE.BoxGeometry(0.34, 0.08, 0.09),
    chest: new THREE.BoxGeometry(0.58, 0.54, 0.36),
    hips: new THREE.BoxGeometry(0.52, 0.24, 0.38),
}

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
 * Clearer skin kits — warmer midtones so faces read under folio night lighting.
 * Inspired by stylized toy / LetterBuilder readability (high contrast eyes + soft blush).
 */
const OUTFITS = {
    teal: {
        shirt: '#1fa7a0', pants: '#243447', skin: '#d4a574', skinDeep: '#c68642',
        hair: '#2a1f18', accent: '#0d7377', iris: '#2f6b4f', lips: '#b56a58',
        blush: '#e8a090', hairStyle: 'short',
    },
    mango: {
        shirt: '#f0a202', pants: '#3d2c29', skin: '#a66b3d', skinDeep: '#8d5524',
        hair: '#1a0f0a', accent: '#e85d04', iris: '#3d2914', lips: '#8a4a38',
        blush: '#c47860', hairStyle: 'curl',
    },
    indigo: {
        shirt: '#5b4dff', pants: '#1e1b2e', skin: '#e8b98a', skinDeep: '#d4a574',
        hair: '#3b2f2f', accent: '#7b2cbf', iris: '#4a3728', lips: '#c4846a',
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
        shirt: '#386641', pants: '#283618', skin: '#c49a6c', skinDeep: '#a67c52',
        hair: '#2b1d3a', accent: '#a7c957', iris: '#344e41', lips: '#9c6644',
        blush: '#d4a090', hairStyle: 'short',
    },
    pearl: {
        shirt: '#ff8fab', pants: '#3d2c29', skin: '#ffe4c8', skinDeep: '#f5d0a9',
        hair: '#c9a06a', accent: '#ff006e', iris: '#5b8c5a', lips: '#e8a0a8',
        blush: '#ffc0c8', hairStyle: 'bob',
    },
}

/** Pose presets — torso/leg/head offsets so patrons read seated vs standing. */
const POSES = {
    standing: { torsoY: 0.58, legRotX: 0.12, legPosZ: -0.02, headY: 1.0, tilt: 0 },
    booth: { torsoY: 0.36, legRotX: -1.15, legPosZ: 0.08, headY: 0.78, tilt: 0.06 },
    stool: { torsoY: 0.44, legRotX: -1.0, legPosZ: 0.06, headY: 0.88, tilt: 0.05 },
    lounger: { torsoY: 0.3, legRotX: -0.35, legPosZ: 0.16, headY: 0.68, tilt: -0.14 },
    fishing: { torsoY: 0.4, legRotX: -1.05, legPosZ: 0.1, headY: 0.84, tilt: 0.1 },
}

/**
 * Chai/coffee patron — pose-aware seating, car-hit knockback.
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

        const o = OUTFITS[options.outfit] ?? OUTFITS.teal
        this.outfit = o

        this.body = new THREE.Group()
        this.group.add(this.body)

        const pants = vibeMat(o.pants)
        const skin = vibeMat(o.skin)
        const skinDeep = vibeMat(o.skinDeep)
        const shirt = vibeMat(o.shirt)
        const hairM = vibeMat(o.hair)
        const shoeM = vibeMat('#1f1f1f')
        const accent = vibeMat(o.accent)
        const irisM = vibeMat(o.iris)
        const white = vibeMat('#ffffff')
        const lipM = vibeMat(o.lips)
        const blushM = vibeMat(o.blush)

        const hips = new THREE.Mesh(GEO.hips, pants)
        hips.position.set(0, 0.28, 0.02)
        this.body.add(hips)

        this.legL = this._makeLeg(-0.16, pants, shoeM, skin)
        this.legR = this._makeLeg(0.16, pants, shoeM, skin)
        this.body.add(this.legL, this.legR)

        this.torso = new THREE.Group()
        this.torso.position.set(0, 0.58, 0)
        const chest = new THREE.Mesh(GEO.chest, shirt)
        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.38), accent)
        collar.position.y = 0.29
        this.torso.add(chest, collar)
        if(!this.low)
        {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.38), accent)
            stripe.position.set(0, 0, 0.01)
            this.torso.add(stripe)
        }
        this.body.add(this.torso)

        const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, 0.22), shirt)
        shoulderL.position.set(-0.35, 0.22, 0)
        const shoulderR = shoulderL.clone()
        shoulderR.position.x = 0.35
        this.torso.add(shoulderL, shoulderR)

        this.armL = this._makeArm(-1, shirt, skin)
        this.armR = this._makeArm(1, shirt, skin)
        this.cup = this._makeCup()
        this.cup.position.set(-0.02, -0.52, 0.22)
        this.armR.add(this.cup)
        this.torso.add(this.armL, this.armR)

        this._buildHead(skin, skinDeep, hairM, irisM, white, lipM, blushM, o.hairStyle)

        this.steam = []
        if(!this.low)
        {
            for(let i = 0; i < 2; i++)
            {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 5), vibeMat('#ffffff'))
                puff.position.set(0.02, 0.08 + i * 0.07, 0.22)
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
        if(this.poseName === 'fishing')
            this._applyFishingPose()

        this.restPos = new THREE.Vector3(options.position.x, options.position.y, options.position.z)
        this.stunVel = new THREE.Vector3()
        this.stunTimer = 0
        this.hitCooldown = 0
        this._stunned = false
    }

    _applyPose(name)
    {
        const cfg = POSES[name] ?? POSES.booth
        this.torso.position.y = cfg.torsoY
        this.head.position.y = cfg.headY
        this.legL.rotation.x = cfg.legRotX
        this.legR.rotation.x = cfg.legRotX
        this.legL.position.z = cfg.legPosZ
        this.legR.position.z = cfg.legPosZ
        this.body.rotation.x = cfg.tilt
    }

    _applyFishingPose()
    {
        this.armL.rotation.x = -0.85
        this.armL.rotation.z = 0.15
        this.armR.rotation.x = -0.35
        this.cup.visible = false
    }

    _resetAfterStun()
    {
        this._stunned = false
        this.body.rotation.set(0, 0, 0)
        this.group.position.copy(this.restPos)
        this.group.rotation.y = this.baseYaw
        this._applyPose(this.poseName)
        if(this.poseName === 'fishing')
            this._applyFishingPose()
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

        if(dist > 1.6 || speed < 2.0)
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

    _makeArm(side, shirt, skin)
    {
        const arm = new THREE.Group()
        arm.position.set(side * 0.42, 0.18, side > 0 ? 0.08 : 0.06)
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.15), shirt)
        upper.position.y = -0.1
        const fore = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.28, 0.13), shirt)
        fore.position.set(side * -0.02, -0.34, 0.1)
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.13), skin)
        hand.position.set(side * -0.02, -0.48, 0.16)
        arm.add(upper, fore, hand)
        if(side < 0)
        {
            arm.rotation.x = -0.5
            arm.rotation.z = 0.25
            fore.rotation.x = -0.6
        }
        return arm
    }

    _buildHead(skin, skinDeep, hairM, irisM, white, lipM, blushM, hairStyle)
    {
        this.head = new THREE.Group()
        this.head.position.set(0, 1.0, 0)

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, this.low ? 6 : 8), skin)
        neck.position.y = -0.14

        // Slightly taller skull + deeper jaw plane = clearer face silhouette
        const skull = new THREE.Mesh(GEO.head, skin)
        skull.position.y = 0.02

        this.head.add(neck, skull)
        this._addHair(hairM, hairStyle)

        // High-contrast eyes (readable from camera distance)
        this.eyeWhiteL = new THREE.Mesh(GEO.eyeWhite, white)
        this.eyeWhiteL.position.set(-0.095, 0.06, 0.175)
        this.eyeWhiteR = this.eyeWhiteL.clone()
        this.eyeWhiteR.position.x = 0.095

        this.eyeL = new THREE.Mesh(GEO.iris, irisM)
        this.eyeL.position.set(-0.095, 0.06, 0.195)
        this.eyeR = this.eyeL.clone()
        this.eyeR.position.x = 0.095

        this.head.add(this.eyeWhiteL, this.eyeWhiteR, this.eyeL, this.eyeR)

        if(!this.low)
        {
            const pupilL = new THREE.Mesh(GEO.pupil, vibeMat('#0a0a0a'))
            pupilL.position.set(-0.095, 0.06, 0.21)
            const pupilR = pupilL.clone()
            pupilR.position.x = 0.095
            const sparkL = new THREE.Mesh(GEO.spark, white)
            sparkL.position.set(-0.08, 0.075, 0.22)
            const sparkR = sparkL.clone()
            sparkR.position.x = 0.11
            this.head.add(pupilL, pupilR, sparkL, sparkR)

            const cheekL = new THREE.Mesh(GEO.cheek, skinDeep)
            cheekL.position.set(-0.19, -0.02, 0.12)
            const cheekR = cheekL.clone()
            cheekR.position.x = 0.19
            this.head.add(cheekL, cheekR)

            const blushL = new THREE.Mesh(GEO.blush, blushM)
            blushL.position.set(-0.14, -0.02, 0.19)
            const blushR = blushL.clone()
            blushR.position.x = 0.14
            this.head.add(blushL, blushR)

            const browL = new THREE.Mesh(GEO.brow, hairM)
            browL.position.set(-0.095, 0.14, 0.19)
            browL.rotation.z = 0.1
            const browR = browL.clone()
            browR.position.x = 0.095
            browR.rotation.z = -0.1
            this.head.add(browL, browR)

            const noseBridge = new THREE.Mesh(GEO.nose, skin)
            noseBridge.position.set(0, 0.02, 0.2)
            const noseTip = new THREE.Mesh(GEO.noseTip, skinDeep)
            noseTip.position.set(0, -0.04, 0.22)
            this.head.add(noseBridge, noseTip)

            const earL = new THREE.Mesh(GEO.ear, skin)
            earL.position.set(-0.22, 0.02, 0)
            const earR = earL.clone()
            earR.position.x = 0.22
            this.head.add(earL, earR)
        }
        else
        {
            // Low LOD: simple nose bump still sells a face
            const nose = new THREE.Mesh(GEO.noseTip, skinDeep)
            nose.position.set(0, 0.0, 0.2)
            this.head.add(nose)
        }

        this.mouth = new THREE.Mesh(GEO.mouth, lipM)
        this.mouth.position.set(0, -0.12, 0.19)
        this.head.add(this.mouth)

        this.body.add(this.head)
    }

    _addHair(hairM, style)
    {
        const cap = new THREE.Mesh(GEO.hairCap, hairM)
        cap.position.y = 0.24
        this.head.add(cap)

        const bang = new THREE.Mesh(GEO.bang, hairM)
        bang.position.set(0, 0.15, 0.16)
        this.head.add(bang)

        if(this.low)
            return

        if(style === 'bob' || style === 'curl')
        {
            const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.2), hairM)
            sideL.position.set(-0.2, 0.02, 0.02)
            const sideR = sideL.clone()
            sideR.position.x = 0.2
            this.head.add(sideL, sideR)
        }
        if(style === 'ponytail')
        {
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 6), hairM)
            tail.position.set(0, 0.05, -0.22)
            tail.rotation.x = 0.5
            this.head.add(tail)
        }
    }

    _makeLeg(x, pants, shoeM, skin)
    {
        const leg = new THREE.Group()
        leg.position.set(x, 0.22, 0.08)
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.4), pants)
        thigh.position.set(0, 0.02, 0.12)
        const shin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.18), pants)
        shin.position.set(0, -0.08, 0.42)
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.34), shoeM)
        boot.position.set(0, -0.22, 0.5)
        leg.add(thigh, shin, boot)
        if(!this.low)
        {
            const knee = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.14), pants)
            knee.position.set(0, -0.02, 0.32)
            const sock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), skin)
            sock.position.set(0, -0.14, 0.42)
            leg.add(knee, sock)
        }
        return leg
    }

    _makeCup()
    {
        const cup = new THREE.Group()
        const cupColor = this.drink === 'chai' ? '#c45c26' : '#3d2914'
        const liquid = this.drink === 'chai' ? '#d4a017' : '#2b1810'
        const segs = this.low ? 6 : 10
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.12, segs), vibeMat(cupColor))
        const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, segs), vibeMat(liquid))
        fill.position.y = 0.05
        cup.add(mug, fill)
        if(!this.low)
        {
            const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 10, Math.PI), vibeMat(cupColor))
            handle.rotation.y = Math.PI / 2
            handle.position.set(0.07, 0, 0)
            const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 10), vibeMat('#f5f0e6'))
            saucer.position.y = -0.07
            cup.add(handle, saucer)
        }
        return cup
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

        // Distance gate — skip heavy idle when far (CPU win on weak laptops)
        if(playerPos)
        {
            const dist = Math.hypot(
                playerPos.x - this.group.position.x,
                playerPos.z - this.group.position.z
            )
            const far = dist > (this.low ? 22 : 28)
            if(far !== this._animFar)
            {
                this._animFar = far
                // Keep mesh visible; just freeze animation when far
            }
            if(far)
                return
        }

        const t = elapsed + this.phase
        const pose = POSES[this.poseName] ?? POSES.booth

        this.torso.position.y = pose.torsoY + Math.sin(t * 1.55) * 0.012
        this.torso.rotation.x = pose.tilt + Math.sin(t * 1.55) * 0.02

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

        const cycle = (t % 4.6) / 4.6
        let sip = 0
        if(this.poseName !== 'fishing' && cycle > 0.52 && cycle < 0.82)
            sip = Math.sin(((cycle - 0.52) / 0.3) * Math.PI)
        if(this.poseName !== 'fishing')
        {
            this.armR.rotation.x = -0.45 - sip * 0.95
            this.armR.rotation.z = -0.2 + sip * 0.15
            this.cup.rotation.x = sip * 0.55
            this.head.rotation.x += sip * 0.15
            if(this.mouth)
                this.mouth.scale.y = 1 + sip * 0.35
        }

        this.armL.rotation.z = 0.25 + Math.sin(t * 0.8) * 0.04
        if(this.poseName === 'fishing')
        {
            this.armL.rotation.x = -0.85 + Math.sin(t * 0.7) * 0.06
        }

        for(const s of this.steam)
        {
            const u = ((t * 0.6 + s.offset) % 1.8) / 1.8
            s.mesh.position.y = 0.1 + u * 0.28
            s.mesh.position.x = Math.sin(t + s.offset) * 0.04
            const sc = u < 0.2 ? u * 5 : Math.max(0.01, 1 - u)
            s.mesh.scale.setScalar(0.4 + sc * 0.8)
            s.mesh.visible = sip < 0.3
        }
    }
}
