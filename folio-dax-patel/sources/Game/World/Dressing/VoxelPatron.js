import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

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
 * Seated chai/coffee patron — LetterBuilder-grade detail, human idle reads.
 * Blink, glance-at-player, sip, steam, shoulder breathe.
 */
export class VoxelPatron
{
    constructor(options = {})
    {
        this.game = options.game ?? null
        this.drink = options.drink ?? 'chai'
        this.phase = options.phase ?? Math.random() * Math.PI * 2
        this.lookAtPlayer = options.lookAtPlayer !== false
        this.baseYaw = options.yaw ?? 0

        this.group = new THREE.Group()
        this.group.name = options.name ?? 'voxelPatron'
        this.group.position.set(options.position.x, options.position.y, options.position.z)
        this.group.rotation.y = this.baseYaw

        const outfits = {
            teal: { shirt: '#1fa7a0', pants: '#243447', skin: '#e8b896', hair: '#2a1f18', accent: '#0d7377' },
            mango: { shirt: '#f0a202', pants: '#3d2c29', skin: '#c68642', hair: '#1a120e', accent: '#e85d04' },
            indigo: { shirt: '#5b4dff', pants: '#1e1b2e', skin: '#f1c27d', hair: '#3b2f2f', accent: '#7b2cbf' },
            rose: { shirt: '#e85d75', pants: '#2d2438', skin: '#ffdbac', hair: '#4a3728', accent: '#ff006e' },
        }
        const o = outfits[options.outfit] ?? outfits.teal
        this.outfit = o

        this.body = new THREE.Group()
        this.group.add(this.body)

        const pants = vibeMat(o.pants)
        const skin = vibeMat(o.skin)
        const shirt = vibeMat(o.shirt)
        const hairM = vibeMat(o.hair)
        const shoeM = vibeMat('#1f1f1f')
        const accent = vibeMat(o.accent)

        // Hips / seated pelvis
        const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.36), pants)
        hips.position.set(0, 0.28, 0.02)
        this.body.add(hips)

        // Thighs + shins + boots (more human joint read)
        this.legL = this._makeLeg(-0.16, pants, shoeM, skin)
        this.legR = this._makeLeg(0.16, pants, shoeM, skin)
        this.body.add(this.legL, this.legR)

        // Torso with collar + accent stripe
        this.torso = new THREE.Group()
        this.torso.position.set(0, 0.58, 0)
        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.52, 0.34), shirt)
        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.36), accent)
        collar.position.y = 0.28
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.36), accent)
        stripe.position.set(0, 0, 0.01)
        this.torso.add(chest, collar, stripe)
        this.body.add(this.torso)

        // Shoulders
        const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.2), shirt)
        shoulderL.position.set(-0.34, 0.22, 0)
        const shoulderR = shoulderL.clone()
        shoulderR.position.x = 0.34
        this.torso.add(shoulderL, shoulderR)

        // Left arm (resting on table / lap)
        this.armL = new THREE.Group()
        this.armL.position.set(-0.4, 0.18, 0.06)
        const upperL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), shirt)
        upperL.position.y = -0.12
        const foreL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12), shirt)
        foreL.position.set(0.02, -0.36, 0.08)
        foreL.rotation.x = -0.6
        const handL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), skin)
        handL.position.set(0.02, -0.5, 0.16)
        this.armL.add(upperL, foreL, handL)
        this.armL.rotation.x = -0.5
        this.armL.rotation.z = 0.25
        this.torso.add(this.armL)

        // Right arm (cup)
        this.armR = new THREE.Group()
        this.armR.position.set(0.4, 0.18, 0.08)
        const upperR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), shirt)
        upperR.position.y = -0.1
        const foreR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.12), shirt)
        foreR.position.set(-0.02, -0.32, 0.1)
        const handR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), skin)
        handR.position.set(-0.02, -0.46, 0.16)
        this.armR.add(upperR, foreR, handR)

        this.cup = this._makeCup()
        this.cup.position.set(-0.02, -0.5, 0.22)
        this.armR.add(this.cup)
        this.torso.add(this.armR)

        // Neck + head
        this.head = new THREE.Group()
        this.head.position.set(0, 0.98, 0)
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), skin)
        neck.position.y = -0.12
        const skull = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.32), skin)
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.34), hairM)
        hair.position.y = 0.2
        const bang = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), hairM)
        bang.position.set(0, 0.14, 0.14)

        this.eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.04), vibeMat('#1a1a1a'))
        this.eyeL.position.set(-0.08, 0.04, 0.16)
        this.eyeR = this.eyeL.clone()
        this.eyeR.position.x = 0.08
        this.eyeWhiteL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), vibeMat('#ffffff'))
        this.eyeWhiteL.position.set(-0.08, 0.04, 0.15)
        this.eyeWhiteR = this.eyeWhiteL.clone()
        this.eyeWhiteR.position.x = 0.08

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), hairM)
        browL.position.set(-0.08, 0.12, 0.16)
        const browR = browL.clone()
        browR.position.x = 0.08
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.08), skin)
        nose.position.set(0, -0.02, 0.18)
        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.06), skin)
        earL.position.set(-0.2, 0.02, 0)
        const earR = earL.clone()
        earR.position.x = 0.2

        this.head.add(neck, skull, hair, bang, this.eyeWhiteL, this.eyeWhiteR, this.eyeL, this.eyeR, browL, browR, nose, earL, earR)
        this.body.add(this.head)

        // Steam puffs above cup
        this.steam = []
        for(let i = 0; i < 3; i++)
        {
            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 6, 6),
                vibeMat('#ffffff')
            )
            puff.position.set(0.02, 0.08 + i * 0.06, 0.22)
            puff.scale.setScalar(0.01)
            this.cup.add(puff)
            this.steam.push({ mesh: puff, offset: i * 0.7 })
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

        this._blinkUntil = 0
        this._nextBlink = 2 + Math.random() * 3
    }

    _makeLeg(x, pants, shoeM, skin)
    {
        const leg = new THREE.Group()
        leg.position.set(x, 0.22, 0.08)
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.4), pants)
        thigh.position.set(0, 0.02, 0.12)
        const knee = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.14), pants)
        knee.position.set(0, -0.02, 0.32)
        const shin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.18), pants)
        shin.position.set(0, -0.08, 0.42)
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.34), shoeM)
        boot.position.set(0, -0.22, 0.5)
        const sock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), skin)
        sock.position.set(0, -0.14, 0.42)
        leg.add(thigh, knee, shin, sock, boot)
        return leg
    }

    _makeCup()
    {
        const cup = new THREE.Group()
        const cupColor = this.drink === 'chai' ? '#c45c26' : '#3d2914'
        const liquid = this.drink === 'chai' ? '#d4a017' : '#2b1810'
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.12, 10), vibeMat(cupColor))
        const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), vibeMat(liquid))
        fill.position.y = 0.05
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 10, Math.PI), vibeMat(cupColor))
        handle.rotation.y = Math.PI / 2
        handle.position.set(0.07, 0, 0)
        const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 10), vibeMat('#f5f0e6'))
        saucer.position.y = -0.07
        cup.add(mug, fill, handle, saucer)
        return cup
    }

    update(elapsed, playerPos = null)
    {
        const t = elapsed + this.phase

        // Breathe
        this.torso.position.y = 0.58 + Math.sin(t * 1.55) * 0.012
        this.torso.rotation.x = Math.sin(t * 1.55) * 0.02

        // Blink
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

        // Glance toward player when close
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

        // Sip cycle (~4.5s)
        const cycle = (t % 4.6) / 4.6
        let sip = 0
        if(cycle > 0.52 && cycle < 0.82)
            sip = Math.sin(((cycle - 0.52) / 0.3) * Math.PI)
        this.armR.rotation.x = -0.45 - sip * 0.95
        this.armR.rotation.z = -0.2 + sip * 0.15
        this.cup.rotation.x = sip * 0.55
        this.head.rotation.x += sip * 0.15

        // Left arm idle fidget
        this.armL.rotation.z = 0.25 + Math.sin(t * 0.8) * 0.04

        // Steam
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
