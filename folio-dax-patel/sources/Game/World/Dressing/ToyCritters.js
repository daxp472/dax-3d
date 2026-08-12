import * as THREE from 'three/webgpu'
import { vibeMat } from './VoxelPatron.js'

/**
 * Cute stylized folio critters — fluffy sheep, readable ducks (not trash boxes).
 */

export function makeSheep(options = {})
{
    const scale = options.scale ?? 1
    const wool = options.wool ?? '#fff8f0'
    const woolDeep = options.woolDeep ?? '#f0e6d8'
    const face = options.face ?? '#3d342c'
    const blush = options.blush ?? '#f0a090'

    const g = new THREE.Group()
    g.name = options.name ?? 'sheep'

    // Soft body (slightly stretched sphere + wool puffs)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), vibeMat(wool, true))
    body.scale.set(1.25, 1.0, 1.05)
    body.position.y = 0.58
    g.add(body)

    const puffSpots = [
        [ 0.32, 0.78, 0.15 ], [ -0.32, 0.78, -0.12 ], [ 0.05, 0.9, -0.2 ],
        [ -0.12, 0.72, 0.28 ], [ 0.35, 0.55, -0.22 ], [ -0.35, 0.55, 0.18 ],
        [ 0, 0.95, 0.05 ], [ 0.2, 0.85, 0.22 ], [ -0.22, 0.88, -0.05 ],
    ]
    for(const [x, y, z] of puffSpots)
    {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), vibeMat(woolDeep, true))
        puff.position.set(x, y, z)
        g.add(puff)
    }

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), vibeMat(face))
    head.position.set(0.48, 0.62, 0)
    g.add(head)

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), vibeMat('#2a2420'))
    snout.scale.set(1.2, 0.85, 1)
    snout.position.set(0.66, 0.55, 0)
    g.add(snout)

    // Ears
    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), vibeMat(face))
    earL.scale.set(0.6, 1.2, 0.5)
    earL.position.set(0.42, 0.78, 0.16)
    earL.rotation.z = 0.4
    const earR = earL.clone()
    earR.position.z = -0.16
    earR.rotation.z = -0.4
    g.add(earL, earR)

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), vibeMat('#ffffff'))
    eyeL.position.set(0.58, 0.68, 0.1)
    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), vibeMat('#111111'))
    pupilL.position.set(0.61, 0.68, 0.1)
    const eyeR = eyeL.clone()
    eyeR.position.z = -0.1
    const pupilR = pupilL.clone()
    pupilR.position.z = -0.1
    g.add(eyeL, pupilL, eyeR, pupilR)

    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), vibeMat(blush))
    cheekL.position.set(0.55, 0.56, 0.12)
    const cheekR = cheekL.clone()
    cheekR.position.z = -0.12
    g.add(cheekL, cheekR)

    // Legs
    for(const sx of [ -0.2, 0.2 ])
    {
        for(const sz of [ -0.16, 0.16 ])
        {
            const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.36, 6), vibeMat('#3d342c'))
            limb.position.set(sx, 0.2, sz)
            g.add(limb)
            const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), vibeMat('#1a1614'))
            hoof.scale.set(1, 0.55, 1.1)
            hoof.position.set(sx, 0.04, sz)
            g.add(hoof)
        }
    }

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), vibeMat(wool))
    tail.position.set(-0.48, 0.55, 0)
    g.add(tail)

    g.scale.setScalar(scale)
    if(options.yaw != null)
        g.rotation.y = options.yaw
    if(options.position)
        g.position.set(options.position.x, options.position.y ?? 0, options.position.z)

    return g
}

export function makeDuck(options = {})
{
    const scale = options.scale ?? 1
    const bodyHex = options.body ?? '#ffe566'
    const beakHex = options.beak ?? '#ff9f1c'
    const g = new THREE.Group()
    g.name = options.name ?? 'duck'

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), vibeMat(bodyHex, true))
    body.position.y = 0.26
    body.scale.set(1.2, 0.9, 1.05)
    g.add(body)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), vibeMat(bodyHex, true))
    head.position.set(0.24, 0.42, 0)
    g.add(head)

    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.12), vibeMat(beakHex))
    beak.position.set(0.4, 0.4, 0)
    g.add(beak)

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), vibeMat('#1a1a1a'))
    eyeL.position.set(0.3, 0.48, 0.09)
    const eyeR = eyeL.clone()
    eyeR.position.z = -0.09
    g.add(eyeL, eyeR)

    const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), vibeMat('#f0d84a', true))
    wingL.scale.set(1.1, 0.45, 0.7)
    wingL.position.set(0, 0.26, 0.26)
    const wingR = wingL.clone()
    wingR.position.z = -0.26
    g.add(wingL, wingR)

    g.scale.setScalar(scale)
    if(options.yaw != null)
        g.rotation.y = options.yaw
    if(options.position)
        g.position.set(options.position.x, options.position.y ?? 0, options.position.z)

    return g
}

export function makeReed(x, z, h = 1.2, hex = '#3d6b4f')
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, h, 5), vibeMat(hex, true))
    stalk.position.y = h * 0.5
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), vibeMat('#5a8a4a', true))
    tip.scale.set(1, 1.6, 0.7)
    tip.position.y = h + 0.05
    g.add(stalk, tip)
    return g
}

export function makeDockPlank(x, z, yaw = 0, len = 3.2)
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = yaw
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 1.1), vibeMat('#8b6914', true))
    deck.position.y = 0.32
    // Posts under the deck (not sticking through the top)
    const postH = 0.28
    const postY = postH * 0.5
    const postGeo = new THREE.BoxGeometry(0.14, postH, 0.14)
    const postMat = vibeMat('#5c4033', true)
    for(const [px, pz] of [
        [ -len * 0.35, 0.4 ], [ -len * 0.35, -0.4 ],
        [ len * 0.35, 0.4 ], [ len * 0.35, -0.4 ],
    ])
    {
        const post = new THREE.Mesh(postGeo, postMat)
        post.position.set(px, postY, pz)
        g.add(post)
    }
    g.add(deck)
    return g
}

export function makeFencePost(x, z, yaw = 0)
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = yaw
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), vibeMat('#6b4f2a', true))
    post.position.y = 0.45
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), vibeMat('#8b6914', true))
    rail.position.set(0.55, 0.55, 0)
    g.add(post, rail)
    return g
}

/** Continuous fence run — posts + double rails (not random sticks). */
export function makeFenceRun(x0, z0, x1, z1, posts = 4)
{
    const g = new THREE.Group()
    g.name = 'fenceRun'
    const wood = vibeMat('#6b4f2a', true)
    const railM = vibeMat('#8b6914', true)
    const dx = x1 - x0
    const dz = z1 - z0
    const len = Math.hypot(dx, dz) || 1
    const yaw = Math.atan2(dx, dz)

    for(let i = 0; i < posts; i++)
    {
        const t = i / (posts - 1)
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), wood)
        post.position.set(x0 + dx * t, 0.42, z0 + dz * t)
        g.add(post)
    }

    const midX = (x0 + x1) * 0.5
    const midZ = (z0 + z1) * 0.5
    const railA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, len), railM)
    railA.position.set(midX, 0.58, midZ)
    railA.rotation.y = yaw
    const railB = railA.clone()
    railB.position.y = 0.32
    g.add(railA, railB)
    return g
}

/** Tight reed clump (3 stalks) — water edge only. */
export function makeReedClump(x, z, hex = '#3d6b4f')
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    const offsets = [ [ 0, 0, 1.15 ], [ 0.28, 0.15, 0.95 ], [ -0.22, 0.1, 1.05 ] ]
    for(const [ox, oz, h] of offsets)
        g.add(makeReed(ox, oz, h, hex))
    return g
}

export function makeDolphin(options = {})
{
    const scale = options.scale ?? 1
    const bodyHex = options.body ?? '#6ec8e8'
    const g = new THREE.Group()
    g.name = options.name ?? 'dolphin'

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), vibeMat(bodyHex, true))
    body.scale.set(1.8, 0.55, 0.7)
    body.position.y = 0.15
    g.add(body)

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), vibeMat('#5ab8d8', true))
    snout.scale.set(1.4, 0.7, 0.8)
    snout.position.set(0.75, 0.12, 0)
    g.add(snout)

    const dorsal = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), vibeMat('#4aa8c8', true))
    dorsal.scale.set(0.4, 1.4, 0.7)
    dorsal.position.set(-0.05, 0.42, 0)
    g.add(dorsal)

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), vibeMat('#5ab8d8', true))
    tail.scale.set(0.5, 1.3, 1.6)
    tail.position.set(-0.85, 0.1, 0)
    g.add(tail)

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), vibeMat('#1a1a1a'))
    eye.position.set(0.55, 0.22, 0.18)
    const eyeR = eye.clone()
    eyeR.position.z = -0.18
    g.add(eye, eyeR)

    g.scale.setScalar(scale)
    if(options.yaw != null)
        g.rotation.y = options.yaw
    if(options.position)
        g.position.set(options.position.x, options.position.y ?? -0.2, options.position.z)

    return g
}

/** @deprecated rod is now built into VoxelPatron fishing pose */
export function makeFishingRod(yaw = 0)
{
    const g = new THREE.Group()
    g.rotation.y = yaw
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.45), vibeMat('#5c4033', true))
    handle.position.set(0.28, 0.42, 0.18)
    handle.rotation.x = -0.55
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.95), vibeMat('#8b6914', true))
    tip.position.set(0.48, 0.78, 0.42)
    tip.rotation.x = -0.82
    g.add(handle, tip)
    return g
}
