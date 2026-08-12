import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

const matCache = new Map()

export function hellMat(hex, opts = {})
{
    const key = `${hex}|${opts.emissive ? 1 : 0}`
    if(matCache.has(key))
        return matCache.get(key)

    const mat = new MeshDefaultMaterial({
        colorNode: color(hex),
        hasWater: false,
        hasFog: opts.hasFog ?? false,
        hasReveal: false,
    })
    matCache.set(key, mat)
    return mat
}

/** Glowing lava surface — pulses in update via userData. */
export function makeLavaPool(x, z, radius = 3, depth = 0.15)
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    const lava = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 1.02, depth, 20),
        hellMat('#ff4500', { emissive: true })
    )
    lava.position.y = -0.02
    const rim = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.98, 0.12, 6, 24),
        hellMat('#2a0a00')
    )
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.02
    g.add(lava, rim)
    g.userData.lavaPulse = { mesh: lava, phase: x + z }
    return g
}

export function makeFloatingLava(x, y, z, scale = 1)
{
    const g = new THREE.Group()
    g.position.set(x, y, z)
    const chunk = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55 * scale, 0),
        hellMat('#ff6b1a', { emissive: true })
    )
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.35 * scale, 8, 6),
        hellMat('#ffaa00', { emissive: true })
    )
    glow.position.y = 0.15 * scale
    g.add(chunk, glow)
    g.userData.float = { mesh: g, baseY: y, phase: x * 0.7 + z, amp: 0.35, drift: 0.25 }
    return g
}

/** Ash / ember dust cloud. */
export function makeAshField(count = 120, spread = 22, height = 12)
{
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for(let i = 0; i < count; i++)
    {
        positions[i * 3] = (Math.random() - 0.5) * spread * 2
        positions[i * 3 + 1] = Math.random() * height
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 2
        speeds[i] = 0.3 + Math.random() * 1.2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
        color: '#ff6633',
        size: 0.18,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        sizeAttenuation: true,
    })
    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    points.userData.ash = { speeds, spread, height }
    return points
}

/** Horned demon — readable low-poly silhouette. */
export function makeDemon(options = {})
{
    const scale = options.scale ?? 1
    const skin = options.skin ?? '#8b0000'
    const horn = options.horn ?? '#1a0a00'
    const g = new THREE.Group()
    g.name = options.name ?? 'demon'

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.45), hellMat(skin))
    body.position.y = 1.1
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.5), hellMat('#5c0000'))
    chest.position.y = 1.55
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.48, 0.45), hellMat(skin))
    head.position.y = 2.05
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), hellMat('#ffcc00', { emissive: true }))
    eyeL.position.set(-0.12, 2.1, 0.2)
    const eyeR = eyeL.clone()
    eyeR.position.x = 0.12
    for(const sx of [-0.22, 0.22])
    {
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 5), hellMat(horn))
        h.position.set(sx, 2.45, 0)
        h.rotation.z = sx > 0 ? -0.25 : 0.25
        g.add(h)
    }
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.7), hellMat('#3d0000'))
    wingL.position.set(-0.55, 1.5, -0.1)
    wingL.rotation.z = 0.4
    const wingR = wingL.clone()
    wingR.position.x = 0.55
    wingR.rotation.z = -0.4
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), hellMat('#2a0000'))
    legL.position.set(-0.2, 0.45, 0)
    const legR = legL.clone()
    legR.position.x = 0.2
    g.add(body, chest, head, eyeL, eyeR, wingL, wingR, legL, legR)

    if(options.chain)
    {
        const chain = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 5, 12, Math.PI), hellMat('#444444'))
        chain.rotation.x = Math.PI / 2
        chain.position.set(0.5, 1.2, 0.3)
        g.add(chain)
    }

    g.scale.setScalar(scale)
    if(options.yaw != null)
        g.rotation.y = options.yaw
    return g
}

/** Victim (chained patron silhouette). */
export function makeVictim(yaw = 0)
{
    const g = new THREE.Group()
    g.rotation.y = yaw
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.28), hellMat('#c68642'))
    torso.position.y = 0.85
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), hellMat('#e8b98a'))
    head.position.y = 1.25
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), hellMat('#3d2914'))
    legL.position.set(-0.1, 0.35, 0)
    const legR = legL.clone()
    legR.position.x = 0.1
    g.add(torso, head, legL, legR)
    return g
}

/** Demon dragging a victim — animated in update. */
export function makeDragScene(x, z, yaw = 0)
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = yaw
    const demon = makeDemon({ scale: 1.1, chain: true })
    demon.position.set(0, 0, 0)
    const victim = makeVictim(Math.PI)
    victim.position.set(0.9, 0, 0.6)
    victim.rotation.y = yaw + Math.PI * 0.85
    g.add(demon, victim)
    g.userData.drag = { demon, victim, phase: x + z }
    return g
}

/** King of Hell throne + seated demon lord. */
export function makeThroneOfHell()
{
    const g = new THREE.Group()
    g.name = 'hellThrone'

    const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 6), hellMat('#1a0a0a'))
    platform.position.y = 0.6
    const steps = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 7), hellMat('#2a1010'))
    steps.position.y = 0.2

    const back = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 0.6), hellMat('#3d0000'))
    back.position.set(0, 4, -2.2)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 2.2), hellMat('#5c0000'))
    seat.position.set(0, 1.8, -1.2)
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.5, 0.5), hellMat('#4a0000'))
    armL.position.set(-1.8, 2.8, -1.2)
    const armR = armL.clone()
    armR.position.x = 1.8

    // Spiked crown backdrop
    for(let i = -3; i <= 3; i++)
    {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.8, 4), hellMat('#ff2200', { emissive: true }))
        spike.position.set(i * 0.7, 6.8, -2.4)
        g.add(spike)
    }

    const king = makeDemon({ scale: 1.6, skin: '#aa0000' })
    king.position.set(0, 0.2, -0.8)
    king.rotation.y = Math.PI

    const brazierL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.8, 8), hellMat('#333333'))
    brazierL.position.set(-3.5, 0.4, 1.5)
    const brazierR = brazierL.clone()
    brazierR.position.x = 3.5
    const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 6), hellMat('#ff6600', { emissive: true }))
    flameL.position.set(-3.5, 1.1, 1.5)
    const flameR = flameL.clone()
    flameR.position.x = 3.5

    g.add(platform, steps, back, seat, armL, armR, king, brazierL, brazierR, flameL, flameR)
    g.userData.throneFlames = [ flameL, flameR ]
    return g
}

/** Flying dragon with fire breath. */
export function makeHellDragon()
{
    const g = new THREE.Group()
    g.name = 'hellDragon'

    const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), hellMat('#4a1515'))
    body.scale.set(2.2, 0.7, 0.9)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.4, 8), hellMat('#5c1a1a'))
    neck.rotation.z = -0.5
    neck.position.set(1.8, 0.5, 0)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.7), hellMat('#6b2020'))
    head.position.set(2.6, 0.9, 0)
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.55), hellMat('#3d1010'))
    jaw.position.set(2.75, 0.65, 0)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), hellMat('#ffcc00', { emissive: true }))
    eye.position.set(2.9, 1.05, 0.25)
    const eyeR = eye.clone()
    eyeR.position.z = -0.25

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 1.8), hellMat('#2a0808'))
    wingL.position.set(0, 0.6, 1.4)
    wingL.rotation.x = -0.3
    const wingR = wingL.clone()
    wingR.position.z = -1.4
    wingR.rotation.x = 0.3

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.5, 6), hellMat('#3d1010'))
    tail.rotation.z = Math.PI / 2
    tail.position.set(-2.8, 0.1, 0)

    g.add(body, neck, head, jaw, eye, eyeR, wingL, wingR, tail)

    // Fire breath particles group
    const fireGroup = new THREE.Group()
    fireGroup.position.set(3.4, 0.75, 0)
    for(let i = 0; i < 8; i++)
    {
        const ember = new THREE.Mesh(
            new THREE.SphereGeometry(0.12 + Math.random() * 0.15, 5, 4),
            hellMat(i % 2 ? '#ff4400' : '#ffaa00', { emissive: true })
        )
        ember.position.set(i * 0.35, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4)
        fireGroup.add(ember)
    }
    g.add(fireGroup)

    g.userData.dragon = {
        fireGroup,
        orbitRadius: 18,
        orbitY: 14,
        orbitSpeed: 0.22,
        angle: 0,
        wingL,
        wingR,
    }
    return g
}

export function makeTorturePillar(x, z)
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 3.5, 8), hellMat('#2a1010'))
    post.position.y = 1.75
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 5, 14, Math.PI * 1.2), hellMat('#555555'))
    chain.rotation.x = Math.PI / 2
    chain.position.y = 2.8
    const victim = makeVictim(0)
    victim.position.y = 0.2
    victim.rotation.y = Math.PI * 0.5
    g.add(post, chain, victim)
    g.userData.torture = { victim, phase: x }
    return g
}

export function makeBonePile(x, z, yaw = 0)
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = yaw
    for(let i = 0; i < 5; i++)
    {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.8 + Math.random() * 0.4, 5), hellMat('#d4c4a8'))
        bone.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.8
        bone.rotation.y = Math.random() * Math.PI
        bone.position.set((Math.random() - 0.5) * 0.8, 0.1, (Math.random() - 0.5) * 0.8)
        g.add(bone)
    }
    return g
}

export function makeHellGate()
{
    const g = new THREE.Group()
    g.name = 'hellExitGate'
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6, 1.4), hellMat('#1a0505'))
    left.position.set(-3.5, 3, 0)
    const right = left.clone()
    right.position.x = 3.5
    const beam = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 1.6), hellMat('#3d0000'))
    beam.position.set(0, 6.2, 0)
    const portal = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.2, 8, 28), hellMat('#ff2200', { emissive: true }))
    portal.position.set(0, 3.2, 0)
    const inner = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 8, 24), hellMat('#ffaa00', { emissive: true }))
    inner.position.set(0, 3.2, 0.1)
    g.add(left, right, beam, portal, inner)
    g.userData.exitPortal = { outer: portal, inner }
    return g
}
