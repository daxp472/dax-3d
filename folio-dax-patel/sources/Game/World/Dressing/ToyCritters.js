import * as THREE from 'three/webgpu'
import { vibeMat } from './VoxelPatron.js'

/**
 * Procedural folio toys — sheep / ducks / reeds (no GLB assets).
 */
export function makeSheep(options = {})
{
    const scale = options.scale ?? 1
    const wool = options.wool ?? '#f5f0e6'
    const woolDeep = options.woolDeep ?? '#e8dfd0'
    const face = options.face ?? '#2a2420'
    const leg = options.leg ?? '#3d342c'
    const blush = options.blush ?? '#f0a090'

    const g = new THREE.Group()
    g.name = options.name ?? 'sheep'

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.55), vibeMat(wool, true))
    body.position.y = 0.55
    g.add(body)

    // Fluffy bumps
    const bumps = [
        [ 0.28, 0.78, 0.12 ], [ -0.28, 0.78, -0.1 ], [ 0.05, 0.82, -0.18 ],
        [ -0.1, 0.72, 0.22 ], [ 0.32, 0.62, -0.2 ], [ -0.32, 0.62, 0.15 ],
    ]
    for(const [x, y, z] of bumps)
    {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), vibeMat(woolDeep, true))
        puff.position.set(x, y, z)
        g.add(puff)
    }

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.28), vibeMat(face))
    head.position.set(0.48, 0.62, 0)
    g.add(head)

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.16), vibeMat('#1a1614'))
    snout.position.set(0.64, 0.55, 0)
    g.add(snout)

    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.06), vibeMat(face))
    earL.position.set(0.42, 0.78, 0.16)
    earL.rotation.z = 0.35
    const earR = earL.clone()
    earR.position.z = -0.16
    earR.rotation.z = -0.35
    g.add(earL, earR)

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), vibeMat('#ffffff'))
    eyeL.position.set(0.58, 0.68, 0.1)
    const pupilL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), vibeMat('#111111'))
    pupilL.position.set(0.61, 0.68, 0.1)
    const eyeR = eyeL.clone()
    eyeR.position.z = -0.1
    const pupilR = pupilL.clone()
    pupilR.position.z = -0.1
    g.add(eyeL, pupilL, eyeR, pupilR)

    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.03), vibeMat(blush))
    cheek.position.set(0.56, 0.58, 0.12)
    const cheekR = cheek.clone()
    cheekR.position.z = -0.12
    g.add(cheek, cheekR)

    for(const sx of [ -0.22, 0.18 ])
    {
        for(const sz of [ -0.16, 0.16 ])
        {
            const limb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.12), vibeMat(leg))
            limb.position.set(sx, 0.19, sz)
            g.add(limb)
            const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.14), vibeMat('#1a1614'))
            hoof.position.set(sx, 0.03, sz)
            g.add(hoof)
        }
    }

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), vibeMat(wool))
    tail.position.set(-0.42, 0.55, 0)
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

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), vibeMat(bodyHex, true))
    body.position.y = 0.22
    body.scale.set(1.15, 0.85, 1)
    g.add(body)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), vibeMat(bodyHex, true))
    head.position.set(0.22, 0.38, 0)
    g.add(head)

    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.1), vibeMat(beakHex))
    beak.position.set(0.36, 0.36, 0)
    g.add(beak)

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), vibeMat('#1a1a1a'))
    eyeL.position.set(0.28, 0.44, 0.08)
    const eyeR = eyeL.clone()
    eyeR.position.z = -0.08
    g.add(eyeL, eyeR)

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.14), vibeMat('#f0d84a', true))
    wingL.position.set(0, 0.22, 0.22)
    wingL.rotation.z = 0.2
    const wingR = wingL.clone()
    wingR.position.z = -0.22
    wingR.rotation.z = -0.2
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
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.06), vibeMat('#5a8a4a', true))
    tip.position.y = h + 0.05
    tip.rotation.z = 0.25
    g.add(stalk, tip)
    return g
}

export function makeDockPlank(x, z, yaw = 0, len = 3.2)
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = yaw
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 1.1), vibeMat('#8b6914', true))
    deck.position.y = 0.18
    const postA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), vibeMat('#5c4033', true))
    postA.position.set(-len * 0.35, 0.28, 0.4)
    const postB = postA.clone()
    postB.position.z = -0.4
    const postC = postA.clone()
    postC.position.x = len * 0.35
    const postD = postB.clone()
    postD.position.x = len * 0.35
    g.add(deck, postA, postB, postC, postD)
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

    const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.22), vibeMat('#4aa8c8', true))
    dorsal.position.set(-0.05, 0.42, 0)
    dorsal.rotation.z = 0.15
    g.add(dorsal)

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.35), vibeMat('#5ab8d8', true))
    tail.position.set(-0.85, 0.1, 0)
    tail.rotation.z = 0.35
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
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.6), vibeMat('#cccccc', true))
    line.position.set(0.52, 0.35, 0.55)
    line.rotation.x = -0.4
    g.add(handle, tip, line)
    return g
}
