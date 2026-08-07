import * as THREE from 'three/webgpu'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { smallestAngle } from '../../utilities/maths.js'
import { createAnimationClips } from './npcAnimations.js'
import npcModels from '../../../data/npcModels.js'

export class NPC
{
    static STATE_IDLE = 1
    static STATE_PATROL = 2
    static STATE_WORK = 3
    static STATE_FOLLOW = 4

    constructor(definition, gltf)
    {
        this.game = Game.getInstance()
        this.definition = definition
        this.destroyed = false
        this.modelMeta = npcModels[definition.model] ?? null

        this.group = new THREE.Group()
        this.model = skeletonClone(gltf.scene)
        this.groupVisible = true
        this.model.traverse((child) =>
        {
            child.frustumCulled = false
        })

        if(this.modelMeta?.keepMaterials)
            this.enableShadows(this.model)
        else
            this.applyPaletteMaterial(this.model)

        const scale = definition.scale ?? 1
        this.alignToGround(this.model, scale)

        this.group.add(this.model)
        this.group.position.copy(definition.position)
        this.baseRotationY = (definition.rotation ?? 0) + (this.modelMeta?.facingOffsetY ?? 0)
        this.group.rotation.y = this.baseRotationY

        this.baseY = definition.position.y
        this.rotationY = this.group.rotation.y
        this.lookAtRadius = definition.lookAtRadius ?? 12
        this.lod = {
            near: definition.lod?.near ?? 25,
            medium: definition.lod?.medium ?? 45,
            far: definition.lod?.far ?? 70,
            level: 0,
        }
        this.locomotionSpeed = 0

        this.setAnimation(gltf)
        this.setTask()
        this.setInteraction()

        this.game.scene.add(this.group)

        this.tickCallback = () =>
        {
            this.update()
        }
        this.game.ticker.events.on('tick', this.tickCallback, 10)
    }

    setAnimation(gltf)
    {
        this.mixer = null
        this.actions = {}
        this.locomotionActions = {}

        if(!this.modelMeta?.animations || !gltf.animations?.length)
            return

        const clips = createAnimationClips(
            gltf.animations,
            this.modelMeta.animations,
            this.modelMeta.fps ?? 24
        )

        this.mixer = new THREE.AnimationMixer(this.model)

        for(const [ name, clip ] of Object.entries(clips))
        {
            const action = this.mixer.clipAction(clip)
            action.loop = THREE.LoopRepeat
            action.enabled = true
            action.play()
            this.actions[name] = action
        }

        const locomotion = this.modelMeta.locomotion || {}
        if(this.actions[locomotion.idle] && this.actions[locomotion.walk] && this.actions[locomotion.run])
        {
            this.locomotionActions.idle = this.actions[locomotion.idle]
            this.locomotionActions.walk = this.actions[locomotion.walk]
            this.locomotionActions.run = this.actions[locomotion.run]
            this.setLocomotionWeights(1, 0, 0)
        }
        else
        {
            this.playAction('idle')
        }
    }

    playAction(name, fade = 0.2)
    {
        const next = this.actions[name]

        if(!next || this.currentAction === next)
            return

        if(this.currentAction)
            this.currentAction.fadeOut(fade)

        next.reset().fadeIn(fade).play()
        this.currentAction = next
        this.currentActionName = name
    }

    setLocomotionWeights(idle, walk, run)
    {
        if(!this.locomotionActions.idle || !this.locomotionActions.walk || !this.locomotionActions.run)
            return

        this.locomotionActions.idle.setEffectiveWeight(idle)
        this.locomotionActions.walk.setEffectiveWeight(walk)
        this.locomotionActions.run.setEffectiveWeight(run)
    }

    setTask()
    {
        this.state = NPC.STATE_IDLE
        this.task = this.definition.task ?? 'idle'
        this.patrol = null
        this.follow = null
        this.workTimer = 0

        if(this.task === 'patrol')
        {
            const points = this.definition.patrol?.points ?? [
                { x: 0, z: 0 },
                { x: 5, z: 0 },
                { x: 2.5, z: 4 },
            ]

            this.patrol = {
                points: points.map((point) => new THREE.Vector3(
                    this.definition.position.x + point.x,
                    this.definition.position.y,
                    this.definition.position.z + point.z
                )),
                index: 0,
                wait: 0,
                walkSpeed: this.definition.patrol?.walkSpeed ?? 1.6,
                runSpeed: this.definition.patrol?.runSpeed ?? 3,
                runDistance: this.definition.patrol?.runDistance ?? 4,
                waitDuration: this.definition.patrol?.waitDuration ?? 2.5,
            }

            this.state = NPC.STATE_PATROL
        }
        else if(this.task === 'follow')
        {
            this.follow = {
                walkSpeed: this.definition.follow?.walkSpeed ?? 1.8,
                runSpeed: this.definition.follow?.runSpeed ?? 3.6,
                runDistance: this.definition.follow?.runDistance ?? 8,
                stopDistance: this.definition.follow?.stopDistance ?? 3.5,
                catchUpDistance: this.definition.follow?.catchUpDistance ?? 12,
            }

            this.state = NPC.STATE_FOLLOW
        }
    }

    setInteraction()
    {
        if(!this.definition.interact)
            return

        const interactPosition = this.definition.position.clone()
        interactPosition.y += 1.5

        this.interactivePoint = this.game.interactivePoints.create(
            interactPosition,
            this.definition.label ?? 'Talk',
            InteractivePoints.ALIGN_LEFT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.onInteract()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems([ 'interact' ])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems([ 'interact' ])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems([ 'interact' ])
            }
        )
    }

    onInteract()
    {
        this.state = NPC.STATE_WORK
        this.workTimer = 1.2
        this.playAction('work', 0.1)

        const title = this.definition.label ?? 'Talk'
        const description = this.definition.dialog ?? ''

        const html = /* html */`
            <div class="top">
                <div class="title">${title}</div>
            </div>
            <div class="bottom">
                <div class="description">${description}</div>
            </div>
        `

        this.game.notifications.show(
            html,
            `npc-${this.definition.id}`,
            4
        )
    }

    updateInteractionPoint()
    {
        if(!this.interactivePoint)
            return

        const position = this.group.position
        const height = position.y + 1.5

        this.interactivePoint.position.set(position.x, position.z)

        if(this.interactivePoint.intersect?.shape?.center)
            this.interactivePoint.intersect.shape.center.set(position.x, height, position.z)

        if(this.interactivePoint.visual)
            this.interactivePoint.visual.position.set(position.x, height, position.z)
    }

    updatePatrol()
    {
        if(!this.patrol || this.state !== NPC.STATE_PATROL)
            return

        if(this.patrol.wait > 0)
        {
            this.patrol.wait -= this.game.ticker.deltaScaled
            this.locomotionSpeed = 0
            this.lookAtPlayer()
            return
        }

        const target = this.patrol.points[this.patrol.index]
        const dx = target.x - this.group.position.x
        const dz = target.z - this.group.position.z
        const distance = Math.hypot(dx, dz)

        if(distance < 0.15)
        {
            this.patrol.index = (this.patrol.index + 1) % this.patrol.points.length
            this.patrol.wait = this.patrol.waitDuration
            this.locomotionSpeed = 0
            return
        }

        const targetSpeed = distance > this.patrol.runDistance ? this.patrol.runSpeed : this.patrol.walkSpeed
        this.locomotionSpeed = targetSpeed

        const step = targetSpeed * this.game.ticker.deltaScaled
        const ratio = Math.min(1, step / distance)

        this.group.position.x += dx * ratio
        this.group.position.z += dz * ratio

        const targetY = Math.atan2(dx, dz)
        const delta = smallestAngle(this.rotationY, targetY)
        this.rotationY += delta * this.game.ticker.deltaScaled * 6
        this.group.rotation.y = this.rotationY
    }

    updateFollow()
    {
        if(!this.follow || this.state !== NPC.STATE_FOLLOW)
            return

        const target = this.game.player.position
        const dx = target.x - this.group.position.x
        const dz = target.z - this.group.position.z
        const distance = Math.hypot(dx, dz)

        if(distance <= this.follow.stopDistance)
        {
            this.locomotionSpeed = 0
            this.lookAtPlayer()
            return
        }

        const speed = distance > this.follow.runDistance ? this.follow.runSpeed : this.follow.walkSpeed
        this.locomotionSpeed = speed

        let step = speed * this.game.ticker.deltaScaled

        // Faster catch-up when too far
        if(distance > this.follow.catchUpDistance)
            step *= 1.5

        const targetDistance = Math.max(this.follow.stopDistance, distance - step)
        const travelDistance = Math.max(0, distance - targetDistance)
        const ratio = distance > 0 ? Math.min(1, travelDistance / distance) : 0

        this.group.position.x += dx * ratio
        this.group.position.z += dz * ratio

        const targetY = Math.atan2(dx, dz)
        const delta = smallestAngle(this.rotationY, targetY)
        this.rotationY += delta * this.game.ticker.deltaScaled * 7
        this.group.rotation.y = this.rotationY
    }

    updateLocomotionAnimation()
    {
        if(!this.locomotionActions.idle || !this.locomotionActions.walk || !this.locomotionActions.run)
            return

        if(this.state === NPC.STATE_WORK)
        {
            this.setLocomotionWeights(1, 0, 0)
            return
        }

        const walkSpeed = this.patrol?.walkSpeed ?? 1.6
        const runSpeed = this.patrol?.runSpeed ?? 3
        const speed = this.locomotionSpeed

        const walkRatio = THREE.MathUtils.clamp(speed / walkSpeed, 0, 1)
        const runRatio = THREE.MathUtils.clamp((speed - walkSpeed) / Math.max(0.01, runSpeed - walkSpeed), 0, 1)
        const walkWeight = walkRatio * (1 - runRatio)
        const runWeight = runRatio
        const idleWeight = Math.max(0, 1 - walkWeight - runWeight)

        this.setLocomotionWeights(idleWeight, walkWeight, runWeight)
    }

    updateLod()
    {
        const distance = this.group.position.distanceTo(this.game.player.position)
        const previous = this.lod.level

        if(distance > this.lod.far)
            this.lod.level = 3
        else if(distance > this.lod.medium)
            this.lod.level = 2
        else if(distance > this.lod.near)
            this.lod.level = 1
        else
            this.lod.level = 0

        if(previous === this.lod.level)
            return

        this.model.traverse((child) =>
        {
            if(!child.isMesh)
                return

            child.castShadow = this.lod.level <= 1
        })
    }

    setEnabled(enabled)
    {
        this.groupVisible = enabled
        this.group.visible = enabled

        if(this.interactivePoint)
        {
            this.interactivePoint.intersect.active = enabled

            if(!enabled)
                this.interactivePoint.hide()
            else
                this.interactivePoint.show()
        }
    }

    lookAtPlayer()
    {
        const distance = this.group.position.distanceTo(this.game.player.position)

        if(distance > this.lookAtRadius)
            return

        const dx = this.game.player.position.x - this.group.position.x
        const dz = this.game.player.position.z - this.group.position.z
        const targetY = Math.atan2(dx, dz)
        const delta = smallestAngle(this.rotationY, targetY)

        this.rotationY += delta * this.game.ticker.deltaScaled * 4
        this.group.rotation.y = this.rotationY
    }

    update()
    {
        if(this.destroyed)
            return

        if(!this.groupVisible)
            return

        this.updateLod()

        if(this.mixer && this.lod.level !== 3)
            this.mixer.update(this.game.ticker.deltaScaled)

        if(this.state === NPC.STATE_WORK)
        {
            this.workTimer -= this.game.ticker.deltaScaled
            this.locomotionSpeed = 0
            this.lookAtPlayer()

            if(this.workTimer <= 0)
            {
                if(this.task === 'patrol')
                    this.state = NPC.STATE_PATROL
                else if(this.task === 'follow')
                    this.state = NPC.STATE_FOLLOW
                else
                    this.state = NPC.STATE_IDLE
            }
        }
        else if(this.task === 'patrol')
        {
            this.updatePatrol()
        }
        else if(this.task === 'follow')
        {
            this.updateFollow()
        }
        else
        {
            this.locomotionSpeed = 0
            this.lookAtPlayer()
        }

        if(this.currentActionName === 'work' && this.state !== NPC.STATE_WORK)
            this.playAction('idle')

        this.updateLocomotionAnimation()

        this.group.position.y = this.baseY
        this.updateInteractionPoint()
    }

    applyPaletteMaterial(object)
    {
        const paletteMaterial = this.game.materials.getFromName('palette')

        object.traverse((child) =>
        {
            if(!child.isMesh)
                return

            child.material = paletteMaterial
            child.castShadow = true
            child.receiveShadow = true
        })
    }

    enableShadows(object)
    {
        object.traverse((child) =>
        {
            if(!child.isMesh)
                return

            child.castShadow = true
            child.receiveShadow = true
        })
    }

    alignToGround(object, scale)
    {
        object.scale.setScalar(scale)

        const box = new THREE.Box3().setFromObject(object)
        object.position.y -= box.min.y
    }

    destroy()
    {
        if(this.destroyed)
            return

        this.destroyed = true
        this.game.ticker.events.off('tick', this.tickCallback)
        this.group.removeFromParent()
    }
}
