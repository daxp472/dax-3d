import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

/** Cute-fantasy-volcano palette (dark stone vs bright lava — not monochrome red). */
export const HELL = {
    lavaBright: '#ffc04d',
    lavaMid: '#e87820',
    lavaDark: '#9a3a12',
    lavaDeep: '#5c1a08',
    stone: '#5c5c6a',
    stoneLight: '#72728a',
    stoneDark: '#3a3a48',
    stoneEdge: '#2e2e38',
    basalt: '#454552',
    trunk: '#2a1f18',
    canopy: '#e8a030',
    canopyDeep: '#c46b18',
    purple: '#6b4d8a',
    imp: '#d63a3a',
    impDark: '#8b1a1a',
    bone: '#d8ccb8',
    iron: '#4a4a55',
}

const matCache = new Map()

export function hellMat(hex, opts = {})
{
    const key = `${hex}|${opts.glow ? 1 : 0}|${opts.fog ? 1 : 0}`
    if(matCache.has(key))
        return matCache.get(key)

    const mat = new MeshDefaultMaterial({
        colorNode: color(hex),
        hasWater: false,
        hasFog: opts.fog ?? true,
        hasReveal: false,
        hasDropShadows: true,
        hasCoreShadows: true,
    })
    matCache.set(key, mat)
    return mat
}

/** Full lava bed — orange/yellow with dark rim (reference style). */
export function makeLavaBed(w, d)
{
    const g = new THREE.Group()
    const deep = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.2, d),
        hellMat(HELL.lavaDeep, { glow: true, fog: false })
    )
    deep.position.y = -0.28
    const mid = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.98, 0.12, d * 0.98),
        hellMat(HELL.lavaMid, { glow: true, fog: false })
    )
    mid.position.y = -0.18
    const bright = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.94, 0.06, d * 0.94),
        hellMat(HELL.lavaBright, { glow: true, fog: false })
    )
    bright.position.y = -0.1
    g.add(deep, mid, bright)
    g.userData.lavaPulse = [
        { mesh: mid, phase: 0 },
        { mesh: bright, phase: 1.2 },
    ]
    return g
}

/** Raised stone walkway segment — drives on top. */
export function makeStonePath(x, z, length, width, yaw = 0)
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = yaw

    const deckH = 0.55
    const deck = new THREE.Mesh(
        new THREE.BoxGeometry(length, deckH, width),
        hellMat(HELL.stone)
    )
    deck.position.y = deckH * 0.5
    g.add(deck)

    // Tile grid on top
    const tilesX = Math.max(1, Math.floor(length / 1.1))
    const tilesZ = Math.max(1, Math.floor(width / 1.1))
    for(let i = 0; i < tilesX; i++)
    {
        for(let j = 0; j < tilesZ; j++)
        {
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(0.95, 0.04, 0.95),
                hellMat((i + j) % 2 ? HELL.stoneLight : HELL.stoneDark)
            )
            tile.position.set(
                -length * 0.5 + 0.55 + i * 1.05,
                deckH + 0.02,
                -width * 0.5 + 0.55 + j * 1.05
            )
            g.add(tile)
        }
    }

    // Low stone curb (reference cliff edge)
    for(const side of [ -1, 1 ])
    {
        const curb = new THREE.Mesh(
            new THREE.BoxGeometry(length + 0.2, 0.55, 0.22),
            hellMat(HELL.stoneEdge)
        )
        curb.position.set(0, 0.28, side * (width * 0.5 + 0.1))
        g.add(curb)
    }

    g.userData.pathCollider = { length, width, deckH }
    return g
}

/** Bridge with low rails over lava channel. */
export function makeStoneBridge(x, z, length, width = 3.2, yaw = 0)
{
    const g = makeStonePath(x, z, length, width, yaw)
    for(const side of [ -1, 1 ])
    {
        const rail = new THREE.Mesh(
            new THREE.BoxGeometry(length, 0.35, 0.14),
            hellMat(HELL.stoneDark)
        )
        rail.position.set(0, 0.72, side * (width * 0.5 + 0.05))
        g.add(rail)
    }
    return g
}

/** Short stairs connecting path levels. */
export function makeStoneStairs(x, z, steps = 4, width = 3.5, yaw = 0, rise = 0.35)
{
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = yaw
    for(let i = 0; i < steps; i++)
    {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(width, rise, 0.85),
            hellMat(i % 2 ? HELL.stone : HELL.stoneLight)
        )
        step.position.set(0, rise * (i + 0.5), -i * 0.8)
        g.add(step)
    }
    g.userData.stairTop = { y: rise * steps, z: -(steps - 1) * 0.8 }
    return g
}

/** Basalt hex pillar cluster (Giant's Causeway). */
export function makeBasaltCluster(x, z, count = 5)
{
    const g = new THREE.Group()
    g.position.set(x, -0.05, z)
    for(let i = 0; i < count; i++)
    {
        const h = 0.5 + Math.random() * 1.8
        const col = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.32, h, 6),
            hellMat(HELL.basalt)
        )
        col.position.set((Math.random() - 0.5) * 1.6, h * 0.5 - 0.1, (Math.random() - 0.5) * 1.6)
        g.add(col)
    }
    return g
}

/** Scorched autumn tree from reference. */
export function makeScorchedTree(x, z, scale = 1)
{
    const g = new THREE.Group()
    g.position.set(x, 0.38, z)
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 1.4 * scale, 6),
        hellMat(HELL.trunk)
    )
    trunk.position.y = 0.7 * scale
    const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.75 * scale, 8, 6),
        hellMat(HELL.canopy)
    )
    canopy.scale.set(1.1, 0.75, 1)
    canopy.position.y = 1.55 * scale
    const canopy2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.45 * scale, 7, 5),
        hellMat(HELL.canopyDeep)
    )
    canopy2.position.set(0.2 * scale, 1.85 * scale, 0.1 * scale)
    g.add(trunk, canopy, canopy2)
    return g
}

export function makePurpleShroom(x, z)
{
    const g = new THREE.Group()
    g.position.set(x, 0.38, z)
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 5), hellMat(HELL.purple))
    stem.position.y = 0.18
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), hellMat('#8b6bb8'))
    cap.scale.set(1.2, 0.6, 1)
    cap.position.y = 0.42
    g.add(stem, cap)
    return g
}

/** Cute red imp with pitchfork (reference NPC). */
export function makeImp(options = {})
{
    const g = new THREE.Group()
    const s = options.scale ?? 1
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.28), hellMat(HELL.imp))
    body.position.y = 0.35
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.28), hellMat(HELL.imp))
    head.position.y = 0.72
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.32), hellMat(HELL.impDark))
    helm.position.y = 0.88
    for(const sx of [-0.1, 0.1])
    {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 4), hellMat('#1a1010'))
        horn.position.set(sx, 0.98, 0)
        g.add(horn)
    }
    const fork = new THREE.Group()
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 4), hellMat(HELL.trunk))
    handle.position.y = 0.45
    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), hellMat('#4a7cff'))
    prong.position.y = 0.72
    fork.add(handle, prong)
    fork.position.set(0.28, 0, 0.1)
    fork.rotation.z = -0.3
    g.add(body, head, helm, fork)
    g.scale.setScalar(s)
    if(options.yaw != null)
        g.rotation.y = options.yaw
    return g
}

/** Gothic volcano temple — throne court (reference left building). */
export function makeVolcanoTemple()
{
    const g = new THREE.Group()
    g.name = 'volcanoTemple'

    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 8), hellMat(HELL.stoneDark))
    base.position.y = 0.25
    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 6), hellMat(HELL.stone))
    body.position.y = 4
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.5, 2.5, 4), hellMat(HELL.stoneEdge))
    roof.position.y = 8.2
    roof.rotation.y = Math.PI / 4

    // Twin arches
    for(const sx of [-1.8, 1.8])
    {
        const arch = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 0.5), hellMat(HELL.stoneDark))
        arch.position.set(sx, 2.2, 3.1)
        const hole = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 0.55), hellMat('#1a1520'))
        hole.position.set(sx, 1.9, 3.15)
        g.add(arch, hole)
    }

    // Buttresses
    for(const sx of [-4.2, 4.2])
    {
        const butt = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), hellMat(HELL.stoneEdge))
        butt.position.set(sx, 2.8, 0)
        g.add(butt)
    }

    // Sun sigil (reference top emblem)
    const sigil = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), hellMat(HELL.lavaMid, { glow: true, fog: false }))
    sigil.position.set(0, 7.2, 3.12)
    const king = makeImp({ scale: 2.2, yaw: Math.PI })
    king.position.set(0, 0.5, 1.2)

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), hellMat(HELL.bone))
    skull.position.set(-3.2, 0.55, 3.5)
    const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 4), hellMat(HELL.iron))
    spike.position.set(-3.2, 1.1, 3.5)

    g.add(base, body, roof, sigil, king, skull, spike)
    g.userData.sigil = sigil
    return g
}

export function makeDragScene(x, z, yaw = 0)
{
    const g = new THREE.Group()
    g.position.set(x, 0.38, z)
    g.rotation.y = yaw
    const imp = makeImp({ scale: 1.15, yaw: Math.PI })
    const victim = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.25), hellMat(HELL.bone))
    victim.position.set(0.7, 0.35, 0.5)
    g.add(imp, victim)
    g.userData.drag = { imp, victim, phase: x + z }
    return g
}

export function makeHellDragon()
{
    const g = new THREE.Group()
    g.name = 'hellDragon'
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), hellMat(HELL.stoneDark))
    body.scale.set(2.2, 0.7, 0.9)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.4, 8), hellMat(HELL.basalt))
    neck.rotation.z = -0.5
    neck.position.set(1.8, 0.5, 0)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.7), hellMat(HELL.stone))
    head.position.set(2.6, 0.9, 0)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), hellMat(HELL.lavaBright, { glow: true, fog: false }))
    eye.position.set(2.85, 1.0, 0.22)
    const eyeR = eye.clone()
    eyeR.position.z = -0.22
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 1.8), hellMat(HELL.stoneEdge))
    wingL.position.set(0, 0.6, 1.4)
    wingL.rotation.x = -0.3
    const wingR = wingL.clone()
    wingR.position.z = -1.4
    wingR.rotation.x = 0.3
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.5, 6), hellMat(HELL.basalt))
    tail.rotation.z = Math.PI / 2
    tail.position.set(-2.8, 0.1, 0)
    g.add(body, neck, head, eye, eyeR, wingL, wingR, tail)

    const fireGroup = new THREE.Group()
    fireGroup.position.set(3.2, 0.75, 0)
    for(let i = 0; i < 6; i++)
    {
        const ember = new THREE.Mesh(
            new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 5, 4),
            hellMat(i % 2 ? HELL.lavaMid : HELL.lavaBright, { glow: true, fog: false })
        )
        ember.position.set(i * 0.32, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.3)
        fireGroup.add(ember)
    }
    g.add(fireGroup)
    g.userData.dragon = { fireGroup, orbitRadius: 20, orbitY: 13, orbitSpeed: 0.18, angle: 0, wingL, wingR }
    return g
}

export function makeHellGate()
{
    const g = new THREE.Group()
    g.name = 'hellExitGate'
    const platform = makeStonePath(0, 0, 6, 5, 0)
    g.add(platform)
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.5, 0.9), hellMat(HELL.stoneEdge))
    left.position.set(-2.2, 2.6, 0)
    const right = left.clone()
    right.position.x = 2.2
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.7, 1), hellMat(HELL.stoneDark))
    beam.position.set(0, 5, 0)
    const portal = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 8, 24), hellMat(HELL.lavaMid, { glow: true, fog: false }))
    portal.position.set(0, 3.2, 0)
    const inner = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.08, 8, 20), hellMat(HELL.lavaBright, { glow: true, fog: false }))
    inner.position.set(0, 3.2, 0.05)
    g.add(left, right, beam, portal, inner)
    g.userData.exitPortal = { outer: portal, inner }
    return g
}

export function makeAshField(count = 80, spread = 20, height = 10)
{
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for(let i = 0; i < count; i++)
    {
        positions[i * 3] = (Math.random() - 0.5) * spread * 2
        positions[i * 3 + 1] = Math.random() * height
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 2
        speeds[i] = 0.2 + Math.random() * 0.8
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
        color: '#ffb347',
        size: 0.12,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        sizeAttenuation: true,
    })
    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    points.userData.ash = { speeds, spread, height }
    return points
}

/** Glowing crack decal on stone (heat under tiles). */
export function makeHeatCrack(x, z, len = 1.2, yaw = 0)
{
    const g = new THREE.Group()
    g.position.set(x, 0.42, z)
    g.rotation.y = yaw
    const crack = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.02, 0.12),
        hellMat(HELL.lavaMid, { glow: true, fog: false })
    )
    g.add(crack)
    g.userData.lavaPulse = { mesh: crack, phase: x }
    return g
}
