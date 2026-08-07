import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { Game } from '../Game.js'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'

/**
 * Knockable "DAX PATEL" letters + API for the LetterBuilder mascot.
 */
export class NameLetters
{
    constructor(letterReferences)
    {
        this.game = Game.getInstance()
        this.letterReferences = letterReferences
        this.objects = []
        this.letters = []
        this.disposables = []
        this.ready = false
        this.onReady = null

        this.anchors = this.captureAnchors()
        this.hideOriginals()
        this.loadAndBuild()
    }

    captureAnchors()
    {
        const anchors = []
        const quat = new THREE.Quaternion()

        for(const reference of this.letterReferences)
        {
            const position = new THREE.Vector3()
            reference.getWorldPosition(position)
            reference.getWorldQuaternion(quat)
            anchors.push({
                position,
                quaternion: quat.clone(),
            })
        }

        anchors.sort((a, b) => b.position.x - a.position.x)
        return anchors
    }

    hideOriginals()
    {
        for(const reference of this.letterReferences)
        {
            reference.visible = false

            const object = reference.userData.object
            if(object?.visual?.object3D)
                object.visual.object3D.visible = false

            if(object?.physical?.body)
                object.physical.body.setEnabled(false)
        }
    }

    loadAndBuild()
    {
        const loader = new FontLoader()
        loader.load(
            'fonts/helvetiker_bold.typeface.json',
            (font) =>
            {
                this.build(font)
                this.ready = true
                if(typeof this.onReady === 'function')
                    this.onReady(this)
            },
            undefined,
            (error) =>
            {
                console.error('[NameLetters] Failed to load font', error)
            }
        )
    }

    build(font)
    {
        if(!this.anchors.length)
            return

        const chars = [ 'D', 'A', 'X', 'P', 'A', 'T', 'E', 'L' ]
        const wordBreakAfter = 2
        const slots = chars.length + 1

        const start = this.anchors[this.anchors.length - 1].position.clone()
        const end = this.anchors[0].position.clone()
        const baseQuat = this.anchors[0].quaternion.clone()
        baseQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI))

        const groundY = this.anchors[0].position.y

        let slot = 0
        chars.forEach((char, index) =>
        {
            if(index === wordBreakAfter + 1)
                slot += 1

            const t = slot / (slots - 1)
            const position = start.clone().lerp(end, t)
            position.y = groundY

            this.createLetter(char, font, position, baseQuat, index)
            slot += 1
        })
    }

    createLetter(char, font, position, quaternion, index)
    {
        const geometry = new TextGeometry(char, {
            font,
            size: 1.15,
            depth: 0.42,
            curveSegments: 3,
            bevelEnabled: true,
            bevelThickness: 0.045,
            bevelSize: 0.03,
            bevelOffset: 0,
            bevelSegments: 2,
        })

        geometry.computeBoundingBox()
        geometry.center()

        const material = new MeshDefaultMaterial({
            colorNode: color('#e49a78'),
            hasWater: false,
        })

        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.renderOrder = 1

        const root = new THREE.Group()
        root.name = `nameLetter_${char}_${index}`
        root.add(mesh)
        root.position.copy(position)
        root.quaternion.copy(quaternion)
        root.rotateY(Math.PI)

        const size = new THREE.Vector3()
        geometry.boundingBox.getSize(size)
        root.position.y = position.y + size.y * 0.5 + 0.02

        root.updateMatrixWorld(true)
        root.needsUpdate = true

        const half = size.clone().multiplyScalar(0.5)

        const object = this.game.objects.add(
            {
                model: root,
                updateMaterials: false,
                castShadow: false,
                receiveShadow: false,
                parent: this.game.scene,
            },
            {
                type: 'dynamic',
                position: root.position.clone(),
                rotation: root.quaternion.clone(),
                friction: 0.75,
                mass: 0.2,
                sleeping: true,
                colliders: [
                    {
                        shape: 'cuboid',
                        parameters: [
                            Math.max(half.x, 0.15),
                            Math.max(half.y, 0.15),
                            Math.max(half.z, 0.15),
                        ],
                        category: 'object',
                    },
                ],
                waterGravityMultiplier: -1,
                contactThreshold: 5,
                onCollision: (force, hitPosition) =>
                {
                    this.game.audio.groups.get('hitBrick').playRandomNext(force, hitPosition)
                },
            }
        )

        const homePosition = root.position.clone()
        const homeQuaternion = root.quaternion.clone()

        // Keep physics initialState in sync with final pose (after rotateY)
        if(object.physical)
        {
            object.physical.initialState.position.x = homePosition.x
            object.physical.initialState.position.y = homePosition.y
            object.physical.initialState.position.z = homePosition.z
            object.physical.initialState.rotation = {
                x: homeQuaternion.x,
                y: homeQuaternion.y,
                z: homeQuaternion.z,
                w: homeQuaternion.w,
            }
            object.physical.initialState.sleeping = true
            object.physical.body.setTranslation(homePosition, true)
            object.physical.body.setRotation(homeQuaternion, true)
            object.physical.body.sleep()
        }

        const letter = {
            char,
            index,
            object,
            size: size.clone(),
            homePosition,
            homeQuaternion,
            topOffset: size.y * 0.5 + 0.08,
        }

        this.objects.push(object)
        this.letters.push(letter)
        this.disposables.push(geometry, material)
    }

    /** Road / path height under the name (letter bottoms sit just above this). */
    getRoadY()
    {
        if(!this.letters.length)
            return 0

        const letter = this.letters[0]
        return letter.homePosition.y - letter.size.y * 0.5
    }

    /** Spot on the road in front of the name for resting. */
    getRestSpot()
    {
        if(!this.letters.length)
            return new THREE.Vector3(0, this.getRoadY(), 0)

        const mid = Math.floor(this.letters.length * 0.5)
        const letter = this.letters[mid]
        const spot = letter.homePosition.clone()
        spot.y = this.getRoadY()
        // Slightly in front of the name toward +Z (road side)
        spot.z += 1.35
        return spot
    }

    /** Walk path along the tops of letters in reading order */
    getWalkPath()
    {
        return this.letters.map((letter) =>
        {
            const p = letter.homePosition.clone()
            p.y += letter.topOffset
            return p
        })
    }

    isFallen(letter, distanceThreshold = 0.55, angleThreshold = 0.45)
    {
        if(letter.held || letter.object?.manualControl)
            return false

        const body = letter.object.physical?.body
        if(!body)
            return false

        // Prefer visual when physics is sleeping / mid-settle
        const visual = letter.object.visual?.object3D
        const pos = visual
            ? visual.position
            : body.translation()
        const rot = visual
            ? visual.quaternion
            : body.rotation()

        const dx = pos.x - letter.homePosition.x
        const dy = pos.y - letter.homePosition.y
        const dz = pos.z - letter.homePosition.z
        const dist = Math.hypot(dx, dy, dz)

        const q = rot.isQuaternion
            ? rot
            : new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)
        const angle = q.angleTo(letter.homeQuaternion)

        return dist > distanceThreshold || angle > angleThreshold
    }

    getFallenLetters()
    {
        return this.letters.filter((letter) => this.isFallen(letter))
    }

    getLetterWorldPosition(letter, out = new THREE.Vector3())
    {
        const visual = letter.object.visual?.object3D
        if(visual)
            return out.copy(visual.position)

        const t = letter.object.physical.body.translation()
        return out.set(t.x, t.y, t.z)
    }

    getLetterWorldQuaternion(letter, out = new THREE.Quaternion())
    {
        const visual = letter.object.visual?.object3D
        if(visual)
            return out.copy(visual.quaternion)

        const r = letter.object.physical.body.rotation()
        return out.set(r.x, r.y, r.z, r.w)
    }

    /** Take physics control so builder can carry / shove the letter. */
    beginManualControl(letter)
    {
        const object = letter.object
        if(!object?.physical?.body)
            return

        letter.held = true
        object.manualControl = true
        object.reseting = false

        const body = object.physical.body
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        body.resetForces(true)
        body.resetTorques(true)
        body.setEnabled(false)
    }

    setLetterPose(letter, position, quaternion)
    {
        const object = letter.object
        if(!object)
            return

        if(object.visual?.object3D)
        {
            object.visual.object3D.position.copy(position)
            object.visual.object3D.quaternion.copy(quaternion)
        }

        const body = object.physical?.body
        if(body)
        {
            body.setTranslation(position, true)
            body.setRotation(quaternion, true)
            body.setLinvel({ x: 0, y: 0, z: 0 }, true)
            body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        }
    }

    /** Snap letter home, re-enable physics, sleep. */
    settleLetterHome(letter)
    {
        const object = letter.object
        if(!object?.physical?.body)
            return

        this.setLetterPose(letter, letter.homePosition, letter.homeQuaternion)

        const body = object.physical.body
        object.manualControl = false
        letter.held = false
        body.setEnabled(true)
        body.sleep()
        object.physical.initialState.sleeping = true
        object.needsUpdate = true
    }

    rebuildLetter(letter)
    {
        if(!letter?.object)
            return

        this.game.objects.resetObject(letter.object)
    }

    rebuildAllFallen()
    {
        const fallen = this.getFallenLetters()
        for(const letter of fallen)
            this.rebuildLetter(letter)
        return fallen
    }

    destroy()
    {
        for(const object of this.objects)
        {
            if(object.physical?.body)
                object.physical.body.setEnabled(false)
            if(object.visual?.object3D)
                this.game.scene.remove(object.visual.object3D)
        }

        for(const d of this.disposables)
            d.dispose?.()

        this.objects = []
        this.letters = []
        this.disposables = []
    }
}
