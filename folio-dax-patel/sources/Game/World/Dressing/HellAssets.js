import * as THREE from 'three/webgpu'
import { AnimationUtils } from 'three/webgpu'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'
import { hellMat, HELL } from './HellProps.js'

/**
 * Place CC0 Gobkit GLB minions in Inferno (idle subclip @ 24fps).
 */
export function placeHellMinion(gltf, options = {})
{
    const g = new THREE.Group()
    const model = skeletonClone(gltf.scene)
    const scale = options.scale ?? 1
    model.scale.setScalar(scale)
    if(options.yaw != null)
        g.rotation.y = options.yaw

    model.traverse((child) =>
    {
        if(child.isMesh)
        {
            child.castShadow = true
            child.receiveShadow = true
            child.frustumCulled = false
        }
    })

    // Ground align
    const box = new THREE.Box3().setFromObject(model)
    model.position.y -= box.min.y

    g.add(model)
    g.position.set(options.x ?? 0, options.y ?? 0.42, options.z ?? 0)

    let mixer = null
    if(gltf.animations?.length)
    {
        const idle = AnimationUtils.subclip(gltf.animations[0], 'idle', 0, 30, 24)
        mixer = new THREE.AnimationMixer(model)
        const action = mixer.clipAction(idle)
        action.loop = THREE.LoopRepeat
        action.play()
    }

    return { group: g, mixer }
}

/** Main-world style gateway — stone arch + lantern glow. */
export function makeInfernoGateway(options = {})
{
    const g = new THREE.Group()
    g.name = options.name ?? 'infernoGateway'
    const label = options.label ?? 'Gate'

    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.5, 5),
        hellMat(HELL.stone)
    )
    platform.position.y = 0.25
    const trim = new THREE.Mesh(
        new THREE.BoxGeometry(7.4, 0.12, 5.4),
        hellMat(HELL.stoneDark)
    )
    trim.position.y = 0.52

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.5, 0.9), hellMat(HELL.stoneEdge))
    postL.position.set(-2.8, 3, 0)
    const postR = postL.clone()
    postR.position.x = 2.8
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.9, 1), hellMat(HELL.stoneDark))
    beam.position.set(0, 5.8, 0)

    const portal = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.14, 8, 28),
        hellMat(HELL.lavaMid, { glow: true, fog: false })
    )
    portal.position.set(0, 3.4, 0)
    const portalInner = new THREE.Mesh(
        new THREE.TorusGeometry(1.7, 0.08, 8, 24),
        hellMat(HELL.lavaBright, { glow: true, fog: false })
    )
    portalInner.position.set(0, 3.4, 0.08)

    // Lantern posts (main-world readable markers)
    for(const sx of [-3.4, 3.4])
    {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 6), hellMat(HELL.iron))
        pole.position.set(sx, 1.4, 2.2)
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), hellMat(HELL.lavaBright, { glow: true, fog: false }))
        lamp.position.set(sx, 2.9, 2.2)
        g.add(pole, lamp)
    }

    // Sign board
    const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), hellMat(HELL.trunk))
    signPost.position.set(0, 1.1, 2.55)
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 0.12), hellMat(HELL.stone))
    sign.position.set(0, 2.2, 2.55)
    const signGlow = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 0.08), hellMat(HELL.lavaMid, { glow: true, fog: false }))
    signGlow.position.set(0, 2.45, 2.62)

    g.add(platform, trim, postL, postR, beam, portal, portalInner, signPost, sign, signGlow)
    g.userData.gateway = { portal, portalInner, label }
    return g
}

/** Clone a named child from a loaded GLB (lanterns, fences, etc). */
export function cloneFromGlb(gltf, childName, options = {})
{
    const g = new THREE.Group()
    let source = null
    gltf.scene.traverse((child) =>
    {
        if(child.name === childName)
            source = child
    })
    if(!source)
        return g

    const mesh = source.clone(true)
    const s = options.scale ?? 1
    mesh.scale.setScalar(s)
    mesh.traverse((c) =>
    {
        if(c.isMesh)
        {
            c.castShadow = true
            c.receiveShadow = true
        }
    })
    g.add(mesh)
    g.position.set(options.x ?? 0, options.y ?? 0, options.z ?? 0)
    if(options.yaw != null)
        g.rotation.y = options.yaw
    return g
}
