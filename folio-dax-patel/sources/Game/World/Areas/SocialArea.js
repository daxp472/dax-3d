import * as THREE from 'three/webgpu'
import { color, texture } from 'three/tsl'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import socialData from '../../../data/social.js'
import { InstancedGroup } from '../../InstancedGroup.js'
import { Area } from './Area.js'
import { View } from '../../View.js'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

export class SocialArea extends Area
{
    constructor(model)
    {
        super(model)

        this.center = this.references.items.get('center')[0].position

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '👨‍🦲 Social',
                expanded: false,
            })
        }

        this.setLeetCodeIcon()
        this.setLinks()
        this.setFans()
        this.setOnlyFans()
        this.setStatue()
        // this.setFWA()
        this.setAchievement()
    }

    /**
     * Hide Twitch prop and drop a chunky LeetCode mark on the same pedestal.
     */
    setLeetCodeIcon()
    {
        const twitch = this.game.scene.getObjectByName('twitchPhysicalDynamic')

        if(!twitch)
        {
            console.warn('[SocialArea] twitchPhysicalDynamic not found — LeetCode icon skipped')
            return
        }

        // Capture pose before hiding / disabling physics
        const worldPosition = new THREE.Vector3()
        const worldQuaternion = new THREE.Quaternion()
        const worldScale = new THREE.Vector3()
        twitch.updateWorldMatrix(true, true)
        twitch.getWorldPosition(worldPosition)
        twitch.getWorldQuaternion(worldQuaternion)
        twitch.getWorldScale(worldScale)

        const box = new THREE.Box3().setFromObject(twitch)
        const size = box.getSize(new THREE.Vector3())
        const targetWidth = Math.max(size.x, size.z, 0.9)

        // Hide Twitch visual + disable knockable collider
        twitch.visible = false
        twitch.traverse((child) => { child.visible = false })

        const physical = twitch.userData?.object?.physical
        if(physical?.body)
            physical.body.setEnabled(false)

        if(twitch.userData?.object?.visual?.object3D)
            twitch.userData.object.visual.object3D.visible = false

        // Canvas logo (orange LeetCode mark on dark tile — readable at distance)
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const ctx = canvas.getContext('2d')

        ctx.fillStyle = '#1a1a1a'
        if(typeof ctx.roundRect === 'function')
        {
            ctx.beginPath()
            ctx.roundRect(0, 0, 256, 256, 28)
            ctx.fill()
        }
        else
        {
            ctx.fillRect(0, 0, 256, 256)
        }

        // Grey top bar
        ctx.fillStyle = '#B3B1B0'
        ctx.fillRect(92, 78, 128, 22)

        // Orange C / blade mark
        ctx.strokeStyle = '#FFA116'
        ctx.lineWidth = 22
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.arc(118, 128, 62, -0.85 * Math.PI, 0.55 * Math.PI)
        ctx.stroke()

        // Orange tip accent
        ctx.fillStyle = '#FFA116'
        ctx.beginPath()
        ctx.arc(168, 72, 14, 0, Math.PI * 2)
        ctx.fill()

        const logoTexture = new THREE.CanvasTexture(canvas)
        logoTexture.colorSpace = THREE.SRGBColorSpace
        logoTexture.needsUpdate = true
        logoTexture.flipY = true

        const depth = 0.38
        const face = targetWidth * 0.95
        const root = new THREE.Group()
        root.name = 'leetCodeIcon'

        // Solid body — matches other social props thickness
        const bodyGeo = new THREE.BoxGeometry(face, face, depth)
        const bodyMat = new MeshDefaultMaterial({
            colorNode: color('#2a2a2a'),
            hasWater: false,
        })
        const body = new THREE.Mesh(bodyGeo, bodyMat)
        body.castShadow = true
        body.receiveShadow = true
        root.add(body)

        // Front logo face
        const faceGeo = new THREE.PlaneGeometry(face * 0.92, face * 0.92)
        const faceMat = new MeshDefaultMaterial({
            colorNode: texture(logoTexture).rgb,
            hasWater: false,
        })
        const faceMesh = new THREE.Mesh(faceGeo, faceMat)
        faceMesh.position.z = depth * 0.5 + 0.01
        faceMesh.castShadow = false
        root.add(faceMesh)

        // Back face (same logo) so it reads when knocked around
        const backMesh = faceMesh.clone()
        backMesh.position.z = -depth * 0.5 - 0.01
        backMesh.rotation.y = Math.PI
        root.add(backMesh)

        root.position.copy(worldPosition)
        root.quaternion.copy(worldQuaternion)
        // Lift slightly so it sits on the pedestal like the other icons
        root.position.y = worldPosition.y + Math.max(0, (face - size.y) * 0.35)

        this.game.objects.add(
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
                        parameters: [ face * 0.5, face * 0.5, depth * 0.5 ],
                        category: 'object',
                    },
                ],
                waterGravityMultiplier: -1,
                contactThreshold: 8,
                onCollision: (force, position) =>
                {
                    this.game.audio.groups.get('hitBrick').playRandomNext(force, position)
                },
            }
        )

        this.leetCodeIcon = root
    }

    setLinks()
    {
        // Exact Bruno semicircle math — requires social.js length 8 in icon order
        const radius = 6
        let i = 0

        for(const link of socialData)
        {
            const angle = i * Math.PI / (socialData.length - 1)
            const position = this.center.clone()
            position.x += Math.cos(angle) * radius
            position.y = 1
            position.z -= Math.sin(angle) * radius

            this.game.interactivePoints.create(
                position,
                link.name,
                link.align === 'left' ? InteractivePoints.ALIGN_LEFT : InteractivePoints.ALIGN_RIGHT,
                InteractivePoints.STATE_CONCEALED,
                () =>
                {
                    if(link.url)
                        window.open(link.url, '_blank')
                    else if(link.modal)
                        this.game.modals.open(link.modal)
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.addItems(['interact'])
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                }
            )

            i++
        }
    }

    setFans()
    {
        const baseFan = this.references.items.get('fan')[0]
        baseFan.castShadow = true
        baseFan.receiveShadow = true

        baseFan.position.set(0, 0, 0)

        // Update materials 
        this.game.materials.updateObject(baseFan)

        baseFan.removeFromParent()
        
        this.fans = {}
        this.fans.spawnerPosition = this.references.items.get('onlyFans')[0].position
        this.fans.count = 30
        this.fans.visibleCount = 0
        this.fans.currentIndex = 0
        this.fans.mass = 0.02
        this.fans.objects = []

        const references = []

        for(let i = 0; i < this.fans.count; i++)
        {
            // Reference
            const reference = new THREE.Object3D()

            reference.position.copy(this.fans.spawnerPosition)
            reference.position.y += 99
            reference.needsUpdate = true
            references.push(reference)
            
            // Object
            const object = this.game.objects.add(
                {
                    model: reference,
                    updateMaterials: false,
                    castShadow: false,
                    receiveShadow: false,
                    parent: null,
                },
                {
                    type: 'dynamic',
                    position: reference.position,
                    rotation: reference.quaternion,
                    friction: 0.7,
                    mass: this.fans.mass,
                    sleeping: true,
                    enabled: false,
                    colliders: [ { shape: 'cuboid', parameters: [ 0.45, 0.65, 0.45 ], category: 'object' } ],
                    waterGravityMultiplier: - 1
                },
            )

            this.fans.objects.push(object)
        }

        this.fans.instancedGroup = new InstancedGroup(references, baseFan)

        this.fans.pop = () =>
        {
            const object = this.fans.objects[this.fans.currentIndex]

            const spawnPosition = this.fans.spawnerPosition.clone()
            spawnPosition.x += (Math.random() - 0.5) * 4
            spawnPosition.y += 4 * Math.random()
            spawnPosition.z += (Math.random() - 0.5) * 4
            object.physical.body.setTranslation(spawnPosition)
            object.physical.body.setEnabled(true)
            object.physical.body.setLinvel({ x: 0, y: 0, z: 0 })
            object.physical.body.setAngvel({ x: 0, y: 0, z: 0 })
            object.physical.body.wakeUp()
            // this.game.ticker.wait(1, () =>
            // {
            //     object.physical.body.applyImpulse({
            //         x: (Math.random() - 0.5) * this.fans.mass * 2,
            //         y: Math.random() * this.fans.mass * 3,
            //         z: this.fans.mass * 7
            //     }, true)
            //     object.physical.body.applyTorqueImpulse({ x: 0, y: 0, z: 0 }, true)
            // })

            this.fans.currentIndex = (this.fans.currentIndex + 1) % this.fans.count

            this.fans.visibleCount = Math.min(this.fans.visibleCount + 1, this.fans.count)

            // Sound
            this.game.audio.groups.get('click').play(true)

            // Achievement
            this.game.achievements.setProgress('fan', 1)
        }
    }

    setOnlyFans()
    {
        const interactiveArea = this.game.interactivePoints.create(
            this.references.items.get('onlyFans')[0].position,
            'OnlyFans',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.fans.pop()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )
    }

    setStatue()
    {
        this.statue = {}
        this.statue.body = this.references.items.get('statue')[0].userData.object.physical.body
        this.statue.down = false
    }

    setFWA()
    {
        this.fwa = {}

        // Confetti
        let i = 0
        this.fwa.positions = [
            new THREE.Vector3(23.5, 0, -18.5),
            new THREE.Vector3(27, 0, -19.5),
        ]
        const pop = () =>
        {
            i++
            const position = this.fwa.positions[i % this.fwa.positions.length]
            this.game.world.confetti.pop(position)
            
            setTimeout(pop, 500 + Math.random() * 1500)
        }
        setTimeout(pop, 2000)
        
        // Interactive points
        game.interactivePoints.temporaryHide()

        // Input => start
        this.game.inputs.addActions([
            { name: 'startFWA', categories: [ 'intro', 'modal', 'menu', 'racing', 'cinematic', 'wandering' ], keys: [ 'Keyboard.k' ] },
            { name: 'winFWA', categories: [ 'intro', 'modal', 'menu', 'racing', 'cinematic', 'wandering' ], keys: [ 'Keyboard.j' ] },
        ])
        this.game.inputs.events.on('startFWA', (action) =>
        {
            if(action.active)
            {
                // View
                game.view.zoom.baseRatio = 0.55
                game.view.zoom.ratio = 0.55
                game.view.zoom.smoothedRatio = 0.55
                game.view.focusPoint.position.set(25, 0, -19.2)
                game.view.focusPoint.isTracking = false
                window.setTimeout(() =>
                {
                    this.game.view.setMode(View.MODE_FREE)
                }, 1000)

                // Weather
                this.game.weather.override.start(
                    {
                        humidity: 0,
                        electricField: 0,
                        clouds: 0,
                        wind: 0
                    },
                    0
                )
        
                // Day cycles
                this.game.dayCycles.override.start(
                    {
                        progress: 0.87
                    },
                    0
                )
                
                // Buttons
                document.querySelector('.js-menu-trigger').style.display = 'none'
                document.querySelector('.js-map-trigger').style.display = 'none'
            }
        })
        this.game.inputs.events.on('winFWA', (action) =>
        {
            if(action.active)
            {
                this.game.achievements.setProgress('foty', 1)
            }
        })
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'social')
        })
    }

    update()
    {
        if(this.fans.visibleCount)
        {
            let allFansSleeping = true
            for(const fan of this.fans.objects)
                allFansSleeping = allFansSleeping && fan.physical.body.isSleeping()

            if(!allFansSleeping)
                this.fans.instancedGroup.updateBoundings()
        }
    
        if(this.statue && !this.statue.down && !this.statue.body.isSleeping())
        {
            const statueUp = new THREE.Vector3(0, 1, 0)
            statueUp.applyQuaternion(this.statue.body.rotation())
            if(statueUp.y < 0.25)
            {
                this.statue.down = true
                this.game.achievements.setProgress('statueDown', 1)
            }
        }

        for(const object of this.fans.objects)
        {
            if(!object.physical.body.isSleeping() && object.physical.body.isEnabled())
                object.visual.object3D.needsUpdate = true
        }
    }
}