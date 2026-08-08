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

/** Expanded skin / hair / outfit kits — Folio toy humans with real face reads. */
const OUTFITS = {
    teal: {
        shirt: '#1fa7a0', pants: '#243447', skin: '#c68642', hair: '#2a1f18',
        accent: '#0d7377', iris: '#2d6a4f', lips: '#a15c48', hairStyle: 'short',
    },
    mango: {
        shirt: '#f0a202', pants: '#3d2c29', skin: '#8d5524', hair: '#1a0f0a',
        accent: '#e85d04', iris: '#3d2914', lips: '#6b3a2a', hairStyle: 'curl',
    },
    indigo: {
        shirt: '#5b4dff', pants: '#1e1b2e', skin: '#e0ac69', hair: '#3b2f2f',
        accent: '#7b2cbf', iris: '#4a3728', lips: '#b07a5a', hairStyle: 'side',
    },
    rose: {
        shirt: '#e85d75', pants: '#2d2438', skin: '#ffdbac', hair: '#4a3728',
        accent: '#ff006e', iris: '#5c4033', lips: '#c97b84', hairStyle: 'bob',
    },
    cocoa: {
        shirt: '#2ec4b6', pants: '#1b1b1b', skin: '#5c3317', hair: '#0d0d0d',
        accent: '#00bbf9', iris: '#1a120e', lips: '#4a2c20', hairStyle: 'fade',
    },
    sand: {
        shirt: '#7b5cff', pants: '#2b2d42', skin: '#f1c27d', hair: '#6b4423',
        accent: '#ffb703', iris: '#6b4423', lips: '#c68642', hairStyle: 'ponytail',
    },
    olive: {
        shirt: '#386641', pants: '#283618', skin: '#b08968', hair: '#240046',
        accent: '#a7c957', iris: '#344e41', lips: '#9c6644', hairStyle: 'short',
    },
    pearl: {
        shirt: '#ff8fab', pants: '#3d2c29', skin: '#ffe0bd', hair: '#d4a574',
        accent: '#ff006e', iris: '#5b8c5a', lips: '#e8a0a0', hairStyle: 'bob',
    },
}

/**
 * Seated chai/coffee patron — denser face, varied skin tones, idle life.
 */
export class VoxelPatron
{
    constructor(options = {})
    {
        this.drink = options.drink ?? 'chai'
        this.phase = options.phase ?? Math.random() * Math.PI * 2
        this.lookAtPlayer = options.lookAtPlayer !== false
        this.baseYaw = options.yaw ?? 0

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
        const shirt = vibeMat(o.shirt)
        const hairM = vibeMat(o.hair)
        const shoeM = vibeMat('#1f1f1f')
        const accent = vibeMat(o.accent)
        const irisM = vibeMat(o.iris)
        const white = vibeMat('#f7f7f7')
        const lipM = vibeMat(o.lips)

        const hips = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.38), pants)
        hips.position.set(0, 0.28, 0.02)
        this.body.add(hips)

        this.legL = this._makeLeg(-0.16, pants, shoeM, skin)
        this.legR = this._makeLeg(0.16, pants, shoeM, skin)
        this.body.add(this.legL, this.legR)

        this.torso = new THREE.Group()
        this.torso.position.set(0, 0.58, 0)
        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.54, 0.36), shirt)
        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.38), accent)
        collar.position.y = 0.29
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.38), accent)
        stripe.position.set(0, 0, 0.01)
        this.torso.add(chest, collar, stripe)
        this.body.add(this.torso)

        const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, 0.22), shirt)
        shoulderL.position.set(-0.35, 0.22, 0)
        const shoulderR = shoulderL.clone()
        shoulderR.position.x = 0.35
        this.torso.add(shoulderL, shoulderR)

        this.armL = new THREE.Group()
        this.armL.position.set(-0.42, 0.18, 0.06)
        const upperL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.15), shirt)
        upperL.position.y = -0.12
        const foreL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.13), shirt)
        foreL.position.set(0.02, -0.38, 0.08)
        foreL.rotation.x = -0.6
        const handL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.13), skin)
        handL.position.set(0.02, -0.52, 0.16)
        this.armL.add(upperL, foreL, handL)
        this.armL.rotation.x = -0.5
        this.armL.rotation.z = 0.25
        this.torso.add(this.armL)

        this.armR = new THREE.Group()
        this.armR.position.set(0.42, 0.18, 0.08)
        const upperR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.15), shirt)
        upperR.position.y = -0.1
        const foreR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.28, 0.13), shirt)
        foreR.position.set(-0.02, -0.34, 0.1)
        const handR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.13), skin)
        handR.position.set(-0.02, -0.48, 0.16)
        this.armR.add(upperR, foreR, handR)

        this.cup = this._makeCup()
        this.cup.position.set(-0.02, -0.52, 0.22)
        this.armR.add(this.cup)
        this.torso.add(this.armR)

        // —— Face (higher detail) ——
        this.head = new THREE.Group()
        this.head.position.set(0, 1.0, 0)
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 8), skin)
        neck.position.y = -0.14

        const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.34), skin)
        const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), skin)
        cheekL.position.set(-0.18, -0.04, 0.12)
        const cheekR = cheekL.clone()
        cheekR.position.x = 0.18
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.26), skin)
        jaw.position.set(0, -0.2, 0.02)

        this._addHair(hairM, o.hairStyle)

        // Eyes: sclera → iris → pupil → highlight
        this.eyeWhiteL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.04), white)
        this.eyeWhiteL.position.set(-0.09, 0.05, 0.16)
        this.eyeWhiteR = this.eyeWhiteL.clone()
        this.eyeWhiteR.position.x = 0.09

        this.eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.035), irisM)
        this.eyeL.position.set(-0.09, 0.05, 0.175)
        this.eyeR = this.eyeL.clone()
        this.eyeR.position.x = 0.09

        const pupilL = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.03), vibeMat('#0a0a0a'))
        pupilL.position.set(-0.09, 0.05, 0.19)
        const pupilR = pupilL.clone()
        pupilR.position.x = 0.09

        const sparkL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.02), white)
        sparkL.position.set(-0.075, 0.065, 0.2)
        const sparkR = sparkL.clone()
        sparkR.position.x = 0.105

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.03), hairM)
        browL.position.set(-0.09, 0.13, 0.17)
        browL.rotation.z = 0.12
        const browR = browL.clone()
        browR.position.x = 0.09
        browR.rotation.z = -0.12

        const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.07), skin)
        noseBridge.position.set(0, 0.02, 0.19)
        const noseTip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.06), skin)
        noseTip.position.set(0, -0.04, 0.21)

        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.04), lipM)
        mouth.position.set(0, -0.12, 0.18)
        this.mouth = mouth

        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.07), skin)
        earL.position.set(-0.21, 0.02, 0)
        const earR = earL.clone()
        earR.position.x = 0.21

        this.head.add(
            neck, skull, cheekL, cheekR, jaw,
            this.eyeWhiteL, this.eyeWhiteR, this.eyeL, this.eyeR,
            pupilL, pupilR, sparkL, sparkR,
            browL, browR, noseBridge, noseTip, mouth, earL, earR
        )
        this.body.add(this.head)

        this.steam = []
        for(let i = 0; i < 3; i++)
        {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), vibeMat('#ffffff'))
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

    _addHair(hairM, style)
    {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.36), hairM)
        cap.position.y = 0.22
        this.head.add(cap)

        if(style === 'bob' || style === 'curl')
        {
            const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.2), hairM)
            sideL.position.set(-0.2, 0.02, 0.02)
            const sideR = sideL.clone()
            sideR.position.x = 0.2
            this.head.add(sideL, sideR)
        }
        if(style === 'side' || style === 'fade')
        {
            const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.1), hairM)
            fringe.position.set(0.02, 0.14, 0.16)
            this.head.add(fringe)
        }
        if(style === 'ponytail')
        {
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 6), hairM)
            tail.position.set(0, 0.05, -0.22)
            tail.rotation.x = 0.5
            this.head.add(tail)
        }
        if(style === 'short' || style === 'fade')
        {
            const bang = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.08), hairM)
            bang.position.set(0, 0.14, 0.15)
            this.head.add(bang)
        }
        else
        {
            const bang = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), hairM)
            bang.position.set(0, 0.14, 0.15)
            this.head.add(bang)
        }
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

        this.torso.position.y = 0.58 + Math.sin(t * 1.55) * 0.012
        this.torso.rotation.x = Math.sin(t * 1.55) * 0.02

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
        if(cycle > 0.52 && cycle < 0.82)
            sip = Math.sin(((cycle - 0.52) / 0.3) * Math.PI)
        this.armR.rotation.x = -0.45 - sip * 0.95
        this.armR.rotation.z = -0.2 + sip * 0.15
        this.cup.rotation.x = sip * 0.55
        this.head.rotation.x += sip * 0.15
        if(this.mouth)
            this.mouth.scale.y = 1 + sip * 0.4

        this.armL.rotation.z = 0.25 + Math.sin(t * 0.8) * 0.04

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
