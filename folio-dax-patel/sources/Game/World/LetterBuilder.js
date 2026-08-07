import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import gsap from 'gsap'
import { Game } from '../Game.js'
import { InteractivePoints } from '../InteractivePoints.js'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'
import { smallestAngle } from '../utilities/maths.js'
import { BuilderSpeech } from './BuilderSpeech.js'

/**
 * Name caretaker:
 * - Patrols letter tops
 * - Climbs down → shoulder-drags fallen letters home → shoves upright → climbs back
 * - Idle → pulls a pocket chair, sits, rests (toast)
 * - Reacts when the car hits him
 * - Click → looks at player / rest chatter
 */
export class LetterBuilder
{
    static STATE_IDLE = 'idle'
    static STATE_WALK = 'walk'
    static STATE_REPAIR = 'repair'
    static STATE_CLIMB = 'climb'
    static STATE_LOOK = 'look'
    static STATE_INTRO = 'intro'
    static STATE_STUN = 'stun'
    static STATE_REST = 'rest'

    constructor(nameLetters)
    {
        this.game = Game.getInstance()
        this.nameLetters = nameLetters
        this.destroyed = false

        this.state = LetterBuilder.STATE_IDLE
        this.prevState = LetterBuilder.STATE_WALK
        this.pathIndex = 0
        this.pathDirection = 1
        this.walkSpeed = 1.7
        this.carrySpeed = 1.15
        this.climbSpeed = 2.45
        this.bobTime = 0
        this.lookTimer = 0
        this.stunTimer = 0
        this.stunVel = new THREE.Vector3()
        this.hitCooldown = 0

        this.repairTarget = null
        this.repairPhase = null
        this.repairT = 0
        this.hammerTween = null
        this.footingY = 0
        this.climbTarget = null

        // Patrol → rest on pocket chair when idle (~2.5 real minutes)
        this.patrolTimer = 0
        this.patrolBeforeRest = 14
        this.restDuration = 150
        this.restTimer = 0
        this.restPhase = null
        this.restT = 0
        this.chair = null
        this.restSpot = null
        this.sitShown = false
        this.restInterruptCount = 0
        this.restRefuseAt = 3
        this.pendingReturnToRest = false
        this.speech = new BuilderSpeech()

        this.tmpPos = new THREE.Vector3()
        this.tmpPos2 = new THREE.Vector3()
        this.tmpQuat = new THREE.Quaternion()
        this.tmpQuat2 = new THREE.Quaternion()
        // Local-space shoulder slot (applied with character scale)
        this.carryOffset = new THREE.Vector3(0.28, 1.55, -0.35)
        this.pickFromPos = new THREE.Vector3()
        this.pickFromQuat = new THREE.Quaternion()
        this.dropPos = new THREE.Vector3()
        this.leanQuat = new THREE.Quaternion()
        this.carryTilt = new THREE.Quaternion()
            .setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.55)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.35))
        this.leanTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -1.05)

        this.path = nameLetters.getWalkPath()
        this.groundY = nameLetters.getRoadY()

        this.buildCharacter()
        this.buildChair()
        this.setInteraction()
        this.enterIntro()

        this.tickCallback = () => this.update()
        this.game.ticker.events.on('tick', this.tickCallback, 10)
    }

    buildCharacter()
    {
        this.group = new THREE.Group()
        this.group.name = 'letterBuilder'

        const s = 0.38
        this.group.scale.setScalar(s)
        this.baseScale = s

        const mat = (hex) => new MeshDefaultMaterial({
            colorNode: color(hex),
            hasWater: false,
        })

        const red = mat('#e23b2f')
        const blue = mat('#2f5bd8')
        const skin = mat('#f2c7a4')
        const brown = mat('#6b3e2e')
        const dark = mat('#1a1a1a')
        const yellow = mat('#f5c518')
        const white = mat('#f4f4f4')

        this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.32), blue)
        this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.32), blue)
        this.legL.position.set(-0.18, 0.28, 0)
        this.legR.position.set(0.18, 0.28, 0)
        this.group.add(this.legL, this.legR)

        const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.44), brown)
        const bootR = bootL.clone()
        bootL.position.set(-0.18, 0.06, 0.05)
        bootR.position.set(0.18, 0.06, 0.05)
        this.group.add(bootL, bootR)

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.46), blue)
        torso.position.y = 0.86
        this.group.add(torso)

        const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.08), blue)
        const strapR = strapL.clone()
        strapL.position.set(-0.22, 1.15, 0.2)
        strapR.position.set(0.22, 1.15, 0.2)
        this.group.add(strapL, strapR)

        const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.3, 0.5), red)
        shirt.position.y = 1.2
        this.group.add(shirt)

        const btnL = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), yellow)
        const btnR = btnL.clone()
        btnL.position.set(-0.14, 0.95, 0.24)
        btnR.position.set(0.14, 0.95, 0.24)
        this.group.add(btnL, btnR)

        this.armL = new THREE.Group()
        this.armR = new THREE.Group()
        this.armL.position.set(-0.48, 1.08, 0)
        this.armR.position.set(0.48, 1.08, 0)

        const upperL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.22), red)
        upperL.position.y = -0.2
        const upperR = upperL.clone()
        this.armL.add(upperL)
        this.armR.add(upperR)

        const handL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), skin)
        handL.position.y = -0.52
        const handR = handL.clone()
        this.armL.add(handL)
        this.armR.add(handR)
        this.group.add(this.armL, this.armR)

        this.hammer = new THREE.Group()
        this.hammer.position.set(0, -0.55, 0.05)
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 6), brown)
        handle.rotation.z = Math.PI * 0.5
        handle.position.x = 0.26
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.44), dark)
        head.position.x = 0.6
        this.hammer.add(handle, head)
        this.armR.add(this.hammer)

        const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.55, 0.55), skin)
        headMesh.position.y = 1.58
        this.group.add(headMesh)

        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.72), red)
        cap.position.y = 1.86
        this.group.add(cap)
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.36), red)
        brim.position.set(0, 1.76, 0.3)
        this.group.add(brim)
        const badge = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), white)
        badge.position.set(0, 1.9, 0.38)
        this.group.add(badge)
        const badgeDot = new THREE.Mesh(new THREE.CircleGeometry(0.055, 10), red)
        badgeDot.position.set(0, 1.9, 0.39)
        this.group.add(badgeDot)

        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), dark)
        const eyeR = eyeL.clone()
        eyeL.position.set(-0.14, 1.6, 0.29)
        eyeR.position.set(0.14, 1.6, 0.29)
        this.group.add(eyeL, eyeR)

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), dark)
        const browR = browL.clone()
        browL.position.set(-0.14, 1.7, 0.29)
        browR.position.set(0.14, 1.7, 0.29)
        browL.rotation.z = 0.15
        browR.rotation.z = -0.15
        this.group.add(browL, browR)

        const stash = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.1), brown)
        stash.position.set(0, 1.44, 0.29)
        this.group.add(stash)

        this.group.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
                child.frustumCulled = false
                child.renderOrder = 2
            }
        })

        if(this.path.length)
        {
            const first = this.path[0]
            this.group.position.set(first.x - 0.95, this.groundY, first.z)
            this.footingY = this.groundY
        }

        this.game.scene.add(this.group)
    }

    buildChair()
    {
        const wood = new MeshDefaultMaterial({
            colorNode: color('#8b5a3c'),
            hasWater: false,
        })
        const darkWood = new MeshDefaultMaterial({
            colorNode: color('#5c3a24'),
            hasWater: false,
        })

        this.chair = new THREE.Group()
        this.chair.name = 'letterBuilderChair'
        this.chair.visible = false

        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.55), wood)
        seat.position.y = 0.42
        this.chair.add(seat)

        const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.07), wood)
        back.position.set(0, 0.72, -0.24)
        this.chair.add(back)

        const legGeo = new THREE.BoxGeometry(0.07, 0.42, 0.07)
        const offsets = [
            [ -0.2, 0.21, -0.2 ],
            [ 0.2, 0.21, -0.2 ],
            [ -0.2, 0.21, 0.2 ],
            [ 0.2, 0.21, 0.2 ],
        ]
        for(const [ x, y, z ] of offsets)
        {
            const leg = new THREE.Mesh(legGeo, darkWood)
            leg.position.set(x, y, z)
            this.chair.add(leg)
        }

        this.chair.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
                child.frustumCulled = false
            }
        })

        this.chair.scale.setScalar(0.001)
        this.game.scene.add(this.chair)
    }

    setInteraction()
    {
        const pos = this.group.position.clone()
        pos.y += 0.95

        this.interactivePoint = this.game.interactivePoints.create(
            pos,
            'Builder',
            InteractivePoints.ALIGN_LEFT,
            InteractivePoints.STATE_CONCEALED,
            () => this.onClick(),
            () => this.game.inputs.interactiveButtons.addItems([ 'interact' ]),
            () => this.game.inputs.interactiveButtons.removeItems([ 'interact' ]),
            () => this.game.inputs.interactiveButtons.removeItems([ 'interact' ])
        )
    }

    onClick()
    {
        if(
            this.state === LetterBuilder.STATE_REPAIR ||
            this.state === LetterBuilder.STATE_CLIMB ||
            this.state === LetterBuilder.STATE_INTRO ||
            this.state === LetterBuilder.STATE_STUN
        )
            return

        if(this.state === LetterBuilder.STATE_REST)
        {
            this.speech.say(
                'Taking a breather',
                "Tired from walking the name… let me sit. Please don't break it again too fast!",
                4,
                'builder-rest-click'
            )
            return
        }

        this.state = LetterBuilder.STATE_LOOK
        this.lookTimer = 2.6
        this.resetPose()

        this.speech.say(
            'Letter Builder',
            'Knock letters? I climb down, haul them on my shoulder, and shove them back up!',
            4,
            'builder-info'
        )
    }

    enterIntro()
    {
        this.state = LetterBuilder.STATE_INTRO
        this.climbTarget = this.path[0]?.clone() || null
        this.pathIndex = 0
        this.pathDirection = 1
    }

    enterWalk()
    {
        this.state = LetterBuilder.STATE_WALK
        this.repairTarget = null
        this.repairPhase = null
    }

    enterClimb(target = null)
    {
        this.state = LetterBuilder.STATE_CLIMB
        this.climbTarget = target?.clone?.() || target || this.nearestPathPoint()
    }

    nearestPathPoint()
    {
        if(!this.path.length)
            return new THREE.Vector3()

        let best = this.path[0]
        let bestD = Infinity
        const pos = this.group.position

        for(const p of this.path)
        {
            const d = pos.distanceToSquared(p)
            if(d < bestD)
            {
                bestD = d
                best = p
            }
        }

        return best.clone()
    }

    updateInteractionPoint()
    {
        if(!this.interactivePoint)
            return

        const x = this.group.position.x
        const y = this.group.position.y + 0.9
        const z = this.group.position.z

        this.interactivePoint.position.set(x, z)

        if(this.interactivePoint.intersect?.shape?.center)
            this.interactivePoint.intersect.shape.center.set(x, y, z)

        if(this.interactivePoint.visual)
            this.interactivePoint.visual.position.set(x, y, z)
    }

    faceToward(target, turnSpeed = 9)
    {
        const dx = target.x - this.group.position.x
        const dz = target.z - this.group.position.z
        if(Math.hypot(dx, dz) < 0.001)
            return

        const desired = Math.atan2(dx, dz)
        const current = this.group.rotation.y
        const delta = smallestAngle(current, desired)
        const step = Math.sign(delta) * Math.min(Math.abs(delta), turnSpeed * this.game.ticker.deltaScaled)
        this.group.rotation.y = current + step
    }

    animateWalk(speedFactor = 1, strained = false)
    {
        this.bobTime += this.game.ticker.deltaScaled * (strained ? 8 : 11) * speedFactor
        const swing = Math.sin(this.bobTime)

        this.legL.rotation.x = swing * (strained ? 0.4 : 0.55)
        this.legR.rotation.x = -swing * (strained ? 0.4 : 0.55)

        if(strained)
        {
            // Both arms holding the letter on the shoulder
            this.armL.rotation.x = -1.1 + swing * 0.08
            this.armL.rotation.z = 0.35
            this.armR.rotation.x = -0.85
            this.armR.rotation.z = -0.55
        }
        else
        {
            this.armL.rotation.x = -swing * 0.45
            this.armL.rotation.z = 0
            this.armR.rotation.x = swing * 0.28
            this.armR.rotation.z = 0
        }

        this.group.position.y = this.footingY + Math.abs(Math.sin(this.bobTime * 2)) * (strained ? 0.018 : 0.025)
    }

    resetPose()
    {
        this.legL.rotation.x = 0
        this.legR.rotation.x = 0
        this.armL.rotation.x = 0
        this.armL.rotation.z = 0
        this.armR.rotation.x = 0
        this.armR.rotation.z = 0
        this.group.position.y = this.footingY
        this.group.rotation.x = 0
        this.group.rotation.z = 0
    }

    getCarryWorldPose(outPos, outQuat)
    {
        // Scale local offset — group.scale is NOT applied by applyQuaternion alone
        this.tmpPos.copy(this.carryOffset).multiplyScalar(this.baseScale)
        this.tmpPos.applyQuaternion(this.group.quaternion)
        outPos.copy(this.group.position).add(this.tmpPos)
        outQuat.copy(this.group.quaternion).multiply(this.carryTilt)
    }

    moveHorizontalToward(target, speed)
    {
        const pos = this.group.position
        const dx = target.x - pos.x
        const dz = target.z - pos.z
        const dist = Math.hypot(dx, dz)
        if(dist < 0.001)
            return 0

        const step = speed * this.game.ticker.deltaScaled
        const ratio = Math.min(1, step / dist)
        pos.x += dx * ratio
        pos.z += dz * ratio
        return dist
    }

    // ─── Car hit ───────────────────────────────────────────────
    checkCarHit()
    {
        if(this.hitCooldown > 0)
        {
            this.hitCooldown -= this.game.ticker.deltaScaled
            return
        }

        if(
            this.state === LetterBuilder.STATE_STUN ||
            this.state === LetterBuilder.STATE_INTRO
        )
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

        // Hit radius ~ car bumper + character
        if(dist > 1.55 || speed < 2.2)
            return

        this.applyCarHit(dx, dz, speed)
    }

    applyCarHit(dx, dz, speed)
    {
        const len = Math.hypot(dx, dz) || 1
        const force = THREE.MathUtils.clamp(speed * 0.35, 4, 12)
        this.stunVel.set((dx / len) * force, 5.5 + speed * 0.08, (dz / len) * force)

        // Don't leave a letter stuck mid-carry — toss it as physics
        if(this.repairTarget?.held)
            this.dropHeldLetterAsPhysics()

        this.prevState = this.state === LetterBuilder.STATE_REPAIR
            ? LetterBuilder.STATE_WALK
            : this.state

        this.state = LetterBuilder.STATE_STUN
        this.stunTimer = 1.35 + Math.min(speed * 0.04, 0.8)
        this.hitCooldown = 2.2
        this.resetPose()

        this.game.audio.groups.get('hitDefault')?.playRandomNext?.(Math.min(speed * 2, 40), this.group.position)

        // Kick the chair away if resting
        if(this.chair?.visible)
            this.hideChair(true)

        this.speech.say(
            'Hey!',
            "Watch the tires — I'm working here!",
            2.5,
            'builder-hit'
        )
    }

    dropHeldLetterAsPhysics()
    {
        const letter = this.repairTarget
        if(!letter)
            return

        const visual = letter.object.visual?.object3D
        if(visual)
            this.nameLetters.setLetterPose(letter, visual.position, visual.quaternion)

        letter.held = false
        letter.object.manualControl = false
        const body = letter.object.physical?.body
        if(body)
        {
            body.setEnabled(true)
            body.wakeUp()
            body.applyImpulse({ x: this.stunVel.x * 0.15, y: 2, z: this.stunVel.z * 0.15 }, true)
        }

        this.repairTarget = null
        this.repairPhase = null
    }

    updateStun()
    {
        const dt = this.game.ticker.deltaScaled
        this.stunVel.y -= 18 * dt
        this.group.position.x += this.stunVel.x * dt
        this.group.position.y += this.stunVel.y * dt
        this.group.position.z += this.stunVel.z * dt

        this.stunVel.x *= (1 - 2.5 * dt)
        this.stunVel.z *= (1 - 2.5 * dt)

        this.group.rotation.x += this.stunVel.z * 0.04
        this.group.rotation.z -= this.stunVel.x * 0.04
        this.group.rotation.y += 4 * dt

        if(this.group.position.y <= this.groundY)
        {
            this.group.position.y = this.groundY
            this.footingY = this.groundY
            this.stunVel.y = Math.abs(this.stunVel.y) * 0.35
            this.stunVel.x *= 0.6
            this.stunVel.z *= 0.6

            if(this.stunVel.y < 1.2)
                this.stunVel.y = 0
        }

        this.stunTimer -= dt
        if(this.stunTimer <= 0)
        {
            this.resetPose()
            this.footingY = this.groundY
            this.group.position.y = this.groundY

            const fallen = this.nameLetters.getFallenLetters()
            if(fallen.length)
                this.startRepair(fallen)
            else
                this.enterClimb(this.nearestPathPoint())
        }
    }

    // ─── Repair FSM ────────────────────────────────────────────
    startRepair(fallen)
    {
        this.state = LetterBuilder.STATE_REPAIR
        this.resetPose()
        this.pickNextRepair(fallen)
    }

    pickNextRepair(fallenList = null)
    {
        const stillFallen = fallenList || this.nameLetters.getFallenLetters()
        if(!stillFallen.length)
        {
            // After an interrupt fix, go back to the chair for remaining rest
            if(this.pendingReturnToRest && this.restTimer > 8)
            {
                this.pendingReturnToRest = false
                this.startRest({ resume: true })
                return
            }

            this.pendingReturnToRest = false
            this.enterClimb(this.nearestPathPoint())
            return
        }

        const pos = this.group.position
        stillFallen.sort((a, b) =>
        {
            this.nameLetters.getLetterWorldPosition(a, this.tmpPos)
            this.nameLetters.getLetterWorldPosition(b, this.tmpPos2)
            return pos.distanceToSquared(this.tmpPos) - pos.distanceToSquared(this.tmpPos2)
        })

        this.repairTarget = stillFallen[0]
        this.repairPhase = 'descend'
        this.repairT = 0
    }

    updateRepair()
    {
        if(!this.repairTarget)
        {
            this.pickNextRepair()
            return
        }

        switch(this.repairPhase)
        {
            case 'descend':
                this.phaseDescend()
                break
            case 'approach':
                this.phaseApproach()
                break
            case 'pickup':
                this.phasePickup()
                break
            case 'carry':
                this.phaseCarry()
                break
            case 'drop':
                this.phaseDrop()
                break
            case 'shove':
                this.phaseShove()
                break
            default:
                this.repairPhase = 'descend'
                break
        }
    }

    phaseDescend()
    {
        // Climb / hop down to ground before fetching
        this.footingY = THREE.MathUtils.lerp(this.footingY, this.groundY, 0.16)
        this.group.position.y = this.footingY

        this.bobTime += this.game.ticker.deltaScaled * 10
        this.armL.rotation.x = Math.sin(this.bobTime) * 0.5
        this.armR.rotation.x = -Math.sin(this.bobTime) * 0.5

        if(Math.abs(this.footingY - this.groundY) < 0.04)
        {
            this.footingY = this.groundY
            this.group.position.y = this.groundY
            this.repairPhase = 'approach'
        }
    }

    phaseApproach()
    {
        this.nameLetters.getLetterWorldPosition(this.repairTarget, this.tmpPos)
        this.tmpPos.y = this.groundY

        this.faceToward(this.tmpPos)
        const dist = this.moveHorizontalToward(this.tmpPos, this.walkSpeed * 1.45)
        this.footingY = this.groundY
        this.animateWalk(1.3)

        if(dist < 0.7)
        {
            this.nameLetters.beginManualControl(this.repairTarget)
            this.nameLetters.getLetterWorldPosition(this.repairTarget, this.pickFromPos)
            this.nameLetters.getLetterWorldQuaternion(this.repairTarget, this.pickFromQuat)
            this.repairPhase = 'pickup'
            this.repairT = 0
            this.resetPose()
        }
    }

    phasePickup()
    {
        this.repairT += this.game.ticker.deltaScaled * 1.8
        const t = Math.min(1, this.repairT)
        const ease = t * t * (3 - 2 * t)

        this.getCarryWorldPose(this.tmpPos, this.tmpQuat)
        this.tmpPos2.lerpVectors(this.pickFromPos, this.tmpPos, ease)
        this.tmpQuat2.slerpQuaternions(this.pickFromQuat, this.tmpQuat, ease)
        this.nameLetters.setLetterPose(this.repairTarget, this.tmpPos2, this.tmpQuat2)

        // Reach / lift arms
        this.armL.rotation.x = THREE.MathUtils.lerp(0.4, -1.1, ease)
        this.armL.rotation.z = THREE.MathUtils.lerp(0, 0.35, ease)
        this.armR.rotation.x = THREE.MathUtils.lerp(0.2, -0.85, ease)
        this.armR.rotation.z = THREE.MathUtils.lerp(0, -0.55, ease)
        this.group.position.y = this.groundY + Math.sin(ease * Math.PI) * 0.08

        if(t >= 1)
        {
            this.repairPhase = 'carry'
            this.game.audio.groups.get('hitBrick')?.playRandomNext?.(4, this.tmpPos)
        }
    }

    phaseCarry()
    {
        const home = this.repairTarget.homePosition
        this.tmpPos.set(home.x, this.groundY, home.z)

        this.faceToward(this.tmpPos, 7)
        const dist = this.moveHorizontalToward(this.tmpPos, this.carrySpeed)
        this.footingY = this.groundY
        this.animateWalk(0.85, true)

        // Keep letter glued to shoulder while dragging
        this.getCarryWorldPose(this.tmpPos2, this.tmpQuat)
        // Drag feel: letter lags slightly behind
        this.tmpPos2.x += Math.sin(this.bobTime) * 0.02
        this.tmpPos2.y += Math.abs(Math.sin(this.bobTime)) * 0.03
        this.nameLetters.setLetterPose(this.repairTarget, this.tmpPos2, this.tmpQuat)

        if(dist < 0.45)
        {
            this.repairPhase = 'drop'
            this.repairT = 0
            this.getCarryWorldPose(this.pickFromPos, this.pickFromQuat)

            // Lean against slot, slightly in front of home
            this.dropPos.copy(home)
            this.dropPos.y = Math.max(home.y * 0.45, this.groundY + 0.35)
            this.leanQuat.copy(this.repairTarget.homeQuaternion).multiply(this.leanTilt)
        }
    }

    phaseDrop()
    {
        this.repairT += this.game.ticker.deltaScaled * 2.2
        const t = Math.min(1, this.repairT)
        const ease = t * t * (3 - 2 * t)

        this.tmpPos2.lerpVectors(this.pickFromPos, this.dropPos, ease)
        this.tmpQuat2.slerpQuaternions(this.pickFromQuat, this.leanQuat, ease)
        this.nameLetters.setLetterPose(this.repairTarget, this.tmpPos2, this.tmpQuat2)

        this.armL.rotation.x = THREE.MathUtils.lerp(-1.1, -0.3, ease)
        this.armR.rotation.x = THREE.MathUtils.lerp(-0.85, 0.2, ease)

        if(t >= 1)
        {
            this.repairPhase = 'shove'
            this.repairT = 0
            this.resetPose()
            this.pickFromPos.copy(this.dropPos)
            this.pickFromQuat.copy(this.leanQuat)
        }
    }

    phaseShove()
    {
        this.repairT += this.game.ticker.deltaScaled * 1.6
        const t = Math.min(1, this.repairT)

        // Wind-up then shove
        if(t < 0.35)
        {
            const w = t / 0.35
            this.armR.rotation.x = -0.4 - w * 0.6
            this.armR.rotation.z = -0.3
            this.faceToward(this.repairTarget.homePosition)
        }
        else
        {
            const s = (t - 0.35) / 0.65
            const ease = 1 - Math.pow(1 - s, 3)

            this.tmpPos2.lerpVectors(this.pickFromPos, this.repairTarget.homePosition, ease)
            this.tmpQuat2.slerpQuaternions(this.pickFromQuat, this.repairTarget.homeQuaternion, ease)
            this.nameLetters.setLetterPose(this.repairTarget, this.tmpPos2, this.tmpQuat2)

            this.armR.rotation.x = THREE.MathUtils.lerp(-1.0, 0.7, ease)
            this.armR.rotation.z = THREE.MathUtils.lerp(-0.3, 0.2, ease)
            this.armL.rotation.x = THREE.MathUtils.lerp(-0.3, 0.15, ease)

            // Small body lean into the shove
            this.group.rotation.x = Math.sin(ease * Math.PI) * 0.12
        }

        if(t >= 1)
        {
            this.nameLetters.settleLetterHome(this.repairTarget)
            this.game.audio.groups.get('hitBrick')?.playRandomNext?.(12, this.repairTarget.homePosition)
            this.resetPose()
            this.repairTarget = null
            this.repairPhase = null
            this.pickNextRepair()
        }
    }

    // ─── Movement states ───────────────────────────────────────
    updateIntro()
    {
        this.updateClimb()
    }

    updateWalk()
    {
        if(!this.path.length)
            return

        const fallen = this.nameLetters.getFallenLetters()
        if(fallen.length)
        {
            this.patrolTimer = 0
            this.startRepair(fallen)
            return
        }

        this.patrolTimer += this.game.ticker.deltaScaled
        if(this.patrolTimer >= this.patrolBeforeRest)
        {
            this.startRest()
            return
        }

        const target = this.path[this.pathIndex]
        const pos = this.group.position
        const dx = target.x - pos.x
        const dz = target.z - pos.z
        const dist = Math.hypot(dx, dz)

        this.faceToward(target)

        if(dist < 0.09)
        {
            this.pathIndex += this.pathDirection
            if(this.pathIndex >= this.path.length - 1)
            {
                this.pathIndex = this.path.length - 1
                this.pathDirection = -1
            }
            else if(this.pathIndex <= 0)
            {
                this.pathIndex = 0
                this.pathDirection = 1
            }
            return
        }

        const step = this.walkSpeed * this.game.ticker.deltaScaled
        pos.x += (dx / dist) * Math.min(step, dist)
        pos.z += (dz / dist) * Math.min(step, dist)
        this.footingY = target.y
        this.animateWalk(1)
    }

    // ─── Pocket chair rest ─────────────────────────────────────
    startRest({ resume = false } = {})
    {
        this.state = LetterBuilder.STATE_REST
        this.restPhase = 'descend'
        this.restT = 0
        if(!resume)
        {
            this.restTimer = this.restDuration
            this.restInterruptCount = 0
        }
        this.sitShown = resume
        this.patrolTimer = 0
        this.pendingReturnToRest = false
        this.resetPose()

        // Place chair on the road toward the player so it reads clearly
        this.restSpot = this.nameLetters.getRestSpot()
        const player = this.game.player?.position
        if(player && this.nameLetters.letters.length)
        {
            const mid = this.nameLetters.letters[Math.floor(this.nameLetters.letters.length * 0.5)].homePosition
            const dx = player.x - mid.x
            const dz = player.z - mid.z
            const len = Math.hypot(dx, dz) || 1
            this.restSpot.set(
                mid.x + (dx / len) * 1.4,
                this.groundY,
                mid.z + (dz / len) * 1.4
            )
        }
    }

    hideChair(kick = false)
    {
        if(!this.chair)
            return

        if(kick)
        {
            this.chair.visible = false
            this.chair.scale.setScalar(0.001)
            return
        }

        this.chair.visible = false
        this.chair.scale.setScalar(0.001)
    }

    updateRest()
    {
        const fallen = this.nameLetters.getFallenLetters()
        if(fallen.length && this.restPhase === 'idleSit')
        {
            if(this.restInterruptCount >= this.restRefuseAt)
            {
                this.speech.say(
                    "I'm on rest!",
                    "I am NOT doing this again — I'm exhausted. Go explore somewhere else and let me sit!",
                    5,
                    'builder-refuse'
                )
                return
            }

            this.restInterruptCount++
            this.pendingReturnToRest = true
            this.restPhase = 'stand'
            this.restT = 0
            this._restResumeFallen = fallen

            if(this.restInterruptCount >= this.restRefuseAt)
            {
                this.speech.say(
                    'Last time…',
                    "Okay fine — I'll fix it THIS time. Break it again and I'm staying in this chair!",
                    4,
                    'builder-warn'
                )
            }
            return
        }

        // During place/sit transitions, ignore breaks until seated
        if(fallen.length && (this.restPhase === 'placeChair' || this.restPhase === 'sit'))
        {
            // Wait until idleSit to decide refuse vs fix
        }

        switch(this.restPhase)
        {
            case 'descend':
                this.restDescend()
                break
            case 'walkToSpot':
                this.restWalkToSpot()
                break
            case 'placeChair':
                this.restPlaceChair()
                break
            case 'sit':
                this.restSitDown()
                break
            case 'idleSit':
                this.restIdleSit()
                break
            case 'stand':
                this.restStand()
                break
            case 'pack':
                this.restPack()
                break
            default:
                this.restPhase = 'descend'
                break
        }
    }

    restDescend()
    {
        this.footingY = THREE.MathUtils.lerp(this.footingY, this.groundY, 0.18)
        this.group.position.y = this.footingY
        this.bobTime += this.game.ticker.deltaScaled * 10
        this.armL.rotation.x = Math.sin(this.bobTime) * 0.45
        this.armR.rotation.x = -Math.sin(this.bobTime) * 0.45

        if(Math.abs(this.footingY - this.groundY) < 0.04)
        {
            this.footingY = this.groundY
            this.group.position.y = this.groundY
            this.restPhase = 'walkToSpot'
        }
    }

    restWalkToSpot()
    {
        this.faceToward(this.restSpot)
        const dist = this.moveHorizontalToward(this.restSpot, this.walkSpeed)
        this.footingY = this.groundY
        this.animateWalk(1)

        if(dist < 0.2)
        {
            this.restPhase = 'placeChair'
            this.restT = 0
            this.resetPose()

            this.chair.position.set(this.restSpot.x, this.groundY, this.restSpot.z)
            this.chair.rotation.y = this.group.rotation.y
            this.chair.visible = true
            this.chair.scale.setScalar(0.001)
        }
    }

    restPlaceChair()
    {
        this.restT += this.game.ticker.deltaScaled * 2.4
        const t = Math.min(1, this.restT)
        const ease = 1 - Math.pow(1 - t, 3)

        // Pull from pocket → grow onto the road
        this.chair.scale.setScalar(0.001 + ease * 0.999)
        this.armR.rotation.x = -0.8 + ease * 0.5
        this.armR.rotation.z = -0.4 * (1 - ease)

        if(t >= 1)
        {
            this.chair.scale.setScalar(1)
            this.restPhase = 'sit'
            this.restT = 0
        }
    }

    restSitDown()
    {
        this.restT += this.game.ticker.deltaScaled * 2.0
        const t = Math.min(1, this.restT)
        const ease = t * t * (3 - 2 * t)

        // Settle onto the seat
        const sitY = this.groundY + 0.22
        this.footingY = THREE.MathUtils.lerp(this.groundY, sitY, ease)
        this.group.position.y = this.footingY

        this.legL.rotation.x = THREE.MathUtils.lerp(0, -1.15, ease)
        this.legR.rotation.x = THREE.MathUtils.lerp(0, -1.15, ease)
        this.armL.rotation.x = THREE.MathUtils.lerp(0, -0.35, ease)
        this.armR.rotation.x = THREE.MathUtils.lerp(0, -0.25, ease)
        this.group.rotation.x = THREE.MathUtils.lerp(0, 0.08, ease)

        if(t >= 1)
        {
            this.restPhase = 'idleSit'
            if(!this.sitShown)
            {
                this.sitShown = true
                this.speech.say(
                    'Taking a breather',
                    "Tired from walking the name… let me sit and rest. Please don't break it again too fast!",
                    4.5,
                    'builder-rest'
                )
            }
        }
    }

    restIdleSit()
    {
        this.bobTime += this.game.ticker.deltaScaled * 1.5
        // Soft breathing
        this.group.position.y = this.footingY + Math.sin(this.bobTime) * 0.008
        this.armL.rotation.x = -0.35 + Math.sin(this.bobTime * 0.7) * 0.05
        this.armR.rotation.x = -0.25 + Math.cos(this.bobTime * 0.7) * 0.05

        // Real-time minutes (not game-scaled) so ~2.5 min feels right
        this.restTimer -= this.game.ticker.delta
        if(this.restTimer <= 0)
        {
            this.restInterruptCount = 0
            this.restPhase = 'stand'
            this.restT = 0
            this._restResumeFallen = this.nameLetters.getFallenLetters()
            if(!this._restResumeFallen.length)
                this._restResumeFallen = null
        }
    }

    restStand()
    {
        this.restT += this.game.ticker.deltaScaled * 2.2
        const t = Math.min(1, this.restT)
        const ease = t * t * (3 - 2 * t)

        this.footingY = THREE.MathUtils.lerp(this.groundY + 0.22, this.groundY, ease)
        this.group.position.y = this.footingY
        this.legL.rotation.x = THREE.MathUtils.lerp(-1.15, 0, ease)
        this.legR.rotation.x = THREE.MathUtils.lerp(-1.15, 0, ease)
        this.armL.rotation.x = THREE.MathUtils.lerp(-0.35, 0, ease)
        this.armR.rotation.x = THREE.MathUtils.lerp(-0.25, 0, ease)
        this.group.rotation.x = THREE.MathUtils.lerp(0.08, 0, ease)

        if(t >= 1)
        {
            this.resetPose()
            this.footingY = this.groundY
            this.restPhase = 'pack'
            this.restT = 0
        }
    }

    restPack()
    {
        this.restT += this.game.ticker.deltaScaled * 2.8
        const t = Math.min(1, this.restT)
        const ease = t * t

        this.chair.scale.setScalar(Math.max(0.001, 1 - ease))
        this.armR.rotation.x = -0.6 * (1 - ease)

        if(t >= 1)
        {
            this.hideChair()
            this.resetPose()

            if(this._restResumeFallen?.length)
            {
                const fallen = this._restResumeFallen
                this._restResumeFallen = null
                this.startRepair(fallen)
                return
            }

            this.enterClimb(this.nearestPathPoint())
        }
    }

    updateClimb()
    {
        const target = this.climbTarget || this.path[0]
        if(!target)
        {
            this.enterWalk()
            return
        }

        this.faceToward(target)
        const pos = this.group.position
        const dx = target.x - pos.x
        const dy = target.y - pos.y
        const dz = target.z - pos.z
        const dist = Math.hypot(dx, dy, dz)
        const step = this.climbSpeed * this.game.ticker.deltaScaled

        if(dist < 0.08)
        {
            pos.copy(target)
            this.footingY = target.y

            let best = 0
            let bestD = Infinity
            this.path.forEach((p, i) =>
            {
                const d = p.distanceToSquared(target)
                if(d < bestD)
                {
                    bestD = d
                    best = i
                }
            })
            this.pathIndex = best
            this.pathDirection = 1
            this.enterWalk()
            return
        }

        pos.x += (dx / dist) * Math.min(step, dist)
        pos.y += (dy / dist) * Math.min(step, dist)
        pos.z += (dz / dist) * Math.min(step, dist)
        this.footingY = pos.y

        this.bobTime += this.game.ticker.deltaScaled * 13
        this.armL.rotation.x = Math.sin(this.bobTime) * 0.75
        this.armR.rotation.x = -Math.sin(this.bobTime) * 0.75
        this.legL.rotation.x = -Math.sin(this.bobTime) * 0.45
        this.legR.rotation.x = Math.sin(this.bobTime) * 0.45
    }

    updateLook()
    {
        this.resetPose()
        const player = this.game.player?.position || this.game.view?.position
        if(player)
            this.faceToward(player, 11)

        this.lookTimer -= this.game.ticker.deltaScaled
        if(this.lookTimer <= 0)
        {
            const fallen = this.nameLetters.getFallenLetters()
            if(fallen.length)
                this.startRepair(fallen)
            else
                this.enterWalk()
        }
    }

    update()
    {
        if(this.destroyed)
            return

        this.checkCarHit()

        switch(this.state)
        {
            case LetterBuilder.STATE_INTRO:
                this.updateIntro()
                break
            case LetterBuilder.STATE_WALK:
                this.updateWalk()
                break
            case LetterBuilder.STATE_REPAIR:
                this.updateRepair()
                break
            case LetterBuilder.STATE_CLIMB:
                this.updateClimb()
                break
            case LetterBuilder.STATE_LOOK:
                this.updateLook()
                break
            case LetterBuilder.STATE_STUN:
                this.updateStun()
                break
            case LetterBuilder.STATE_REST:
                this.updateRest()
                break
            default:
                break
        }

        this.updateInteractionPoint()
    }

    destroy()
    {
        this.destroyed = true
        this.game.ticker.events.off('tick', this.tickCallback)
        if(this.hammerTween)
            this.hammerTween.kill()

        if(this.repairTarget?.held)
            this.nameLetters.settleLetterHome(this.repairTarget)

        if(this.chair)
            this.chair.removeFromParent()

        this.group.removeFromParent()
    }
}
