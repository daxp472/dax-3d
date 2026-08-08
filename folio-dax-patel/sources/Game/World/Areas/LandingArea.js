import * as THREE from 'three/webgpu'
import { color, float, Fn, instancedArray, mix, normalWorld, positionGeometry, step, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import { Inputs } from '../../Inputs/Inputs.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { Area } from './Area.js'
import gsap from 'gsap'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'
import { NameLetters } from '../NameLetters.js'
import { LetterBuilder } from '../LetterBuilder.js'
import { GuestbookBoard } from '../GuestbookBoard.js'
import { GamerCornerDressing } from '../Dressing/GamerCornerDressing.js'

export class LandingArea extends Area
{
    constructor(model)
    {
        super(model)

        this.localTime = uniform(0)

        this.setLetters()
        this.setGuestbook()
        this.setKiosk()
        this.setControls()
        this.setBonfire()
        this.setAchievement()
        this.setGamerCorner()
    }

    setGamerCorner()
    {
        try
        {
            // Giant gamepad ≈ (57.5, 32.3), controls pin ≈ (53.8, 32.5)
            const controlsRef = this.references.items.get('controlsInteractivePoint')?.[0]
            const anchor = (controlsRef?.position?.clone() || new THREE.Vector3(57.5, 0, 32.3))
                .add(new THREE.Vector3(2.2, 0, 1.5))
            anchor.y = 0
            this.gamerCorner = new GamerCornerDressing(anchor)
        }
        catch(error)
        {
            console.error('[LandingArea] gamer corner failed', error)
        }
    }

    setLetters()
    {
        const references = this.references.items.get('letters')
        this.nameLetters = new NameLetters(references)
        this.nameLetters.onReady = () =>
        {
            this.letterBuilder = new LetterBuilder(this.nameLetters)
        }
    }

    setGuestbook()
    {
        // Image 2: garden to the LEFT of Res(e)t bench — clear it and plant the Guest Wall there
        const resetRef = this.references.items.get('bonfireInteractivePoint')?.[0]
        const letters = this.references.items.get('letters')
        const resetPos = new THREE.Vector3()

        if(resetRef)
            resetPos.copy(resetRef.position)
        else
            return

        const lettersMid = new THREE.Vector3()
        if(letters?.length)
        {
            for(const mesh of letters)
            {
                const p = new THREE.Vector3()
                mesh.getWorldPosition(p)
                lettersMid.add(p)
            }
            lettersMid.multiplyScalar(1 / letters.length)
        }
        else
        {
            lettersMid.copy(resetPos)
            lettersMid.z -= 4
        }

        // Facing Res(e)t → name (road / visitor flow)
        const toName = lettersMid.clone().sub(resetPos)
        toName.y = 0
        if(toName.lengthSq() < 0.01)
            toName.set(0, 0, -1)
        else
            toName.normalize()

        // Left of Res(e)t when looking toward the name = garden patch
        // (perpendicular; flipped from earlier wrong-side placement)
        const toGarden = new THREE.Vector3(toName.z, 0, -toName.x).normalize()

        const anchor = resetPos.clone()
        anchor.addScaledVector(toGarden, 4.8)
        anchor.addScaledVector(toName, -0.8)
        anchor.y = 0

        // Cork face (+Z) toward the road / Res(e)t so visitors can read
        const facing = Math.atan2(resetPos.x - anchor.x, resetPos.z - anchor.z)

        this.clearGuestbookGarden(anchor, 4.4)
        this.guestbookBoard = new GuestbookBoard(anchor, facing)
    }

    clearGuestbookGarden(center, radius)
    {
        const world = this.game.world
        if(!world)
            return

        world.birchTrees?.hideNear?.(center, radius)
        world.oakTrees?.hideNear?.(center, radius)
        world.cherryTrees?.hideNear?.(center, radius)

        // Hide nearby loose scenery / crates (blue blocks etc.) — keep benches & name letters
        for(const object of this.game.objects.list)
        {
            if(!object.visual?.object3D || !object.physical)
                continue
            if(object.physical.type === 'fixed')
                continue

            const name = object.visual.object3D.name || ''
            if(name.startsWith('nameLetter') || name.includes('bench') || name.includes('Bench'))
                continue

            const pos = object.visual.object3D.position
            const dx = pos.x - center.x
            const dz = pos.z - center.z
            if((dx * dx + dz * dz) > radius * radius)
                continue

            this.game.objects.disable(object)
        }
    }

    setKiosk()
    {
        // Interactive point
        const interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('kioskInteractivePoint')[0].position,
            'Map',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.modals.open('map')
                // interactivePoint.hide()
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

        // this.game.map.items.get('map').events.on('close', () =>
        // {
        //     interactivePoint.show()
        // })
    }

    setControls()
    {
        // Interactive point
        const interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('controlsInteractivePoint')[0].position,
            'Controls',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.menu.open('controls')
                interactivePoint.hide()
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

        // Menu instance
        const menuInstance = this.game.menu.items.get('controls')

        menuInstance.events.on('close', () =>
        {
            interactivePoint.show()
        })

        menuInstance.events.on('open', () =>
        {
            if(this.game.inputs.mode === Inputs.MODE_GAMEPAD)
                menuInstance.tabs.goTo('gamepad')
            else if(this.game.inputs.mode === Inputs.MODE_MOUSEKEYBOARD)
                menuInstance.tabs.goTo('mouse-keyboard')
            else if(this.game.inputs.mode === Inputs.MODE_TOUCH)
                menuInstance.tabs.goTo('touch')
        })
    }

    setBonfire()
    {
        const position = this.references.items.get('bonfireHashes')[0].position

        // Particles
        let particles = null
        {
            const emissiveMaterial = this.game.materials.getFromName('emissiveOrangeRadialGradient')
    
            const count = 30
            const elevation = uniform(5)
            const positions = new Float32Array(count * 3)
            const scales = new Float32Array(count)
    
    
            for(let i = 0; i < count; i++)
            {
                const i3 = i * 3
    
                const angle = Math.PI * 2 * Math.random()
                const radius = Math.pow(Math.random(), 1.5) * 1
                positions[i3 + 0] = Math.cos(angle) * radius
                positions[i3 + 1] = Math.random()
                positions[i3 + 2] = Math.sin(angle) * radius
    
                scales[i] = 0.02 + Math.random() * 0.06
            }
            
            const positionAttribute = instancedArray(positions, 'vec3').toAttribute()
            const scaleAttribute = instancedArray(scales, 'float').toAttribute()
    
            const material = new THREE.SpriteNodeMaterial()
            material.outputNode = emissiveMaterial.outputNode
    
            const progress = float(0).toVar()
    
            material.positionNode = Fn(() =>
            {
                const newPosition = positionAttribute.toVar()
                progress.assign(newPosition.y.add(this.localTime.mul(newPosition.y)).fract())
    
                newPosition.y.assign(progress.mul(elevation))
                newPosition.xz.addAssign(this.game.wind.direction.mul(progress))
    
                const progressHide = step(0.8, progress).mul(100)
                newPosition.y.addAssign(progressHide)
                
                return newPosition
            })()
            material.scaleNode = Fn(() =>
            {
                const progressScale = progress.remapClamp(0.5, 1, 1, 0)
                return scaleAttribute.mul(progressScale)
            })()
    
            const geometry = new THREE.CircleGeometry(0.5, 8)
    
            particles = new THREE.Mesh(geometry, material)
            particles.visible = false
            particles.position.copy(position)
            particles.count = count
            this.game.scene.add(particles)
        }

        // Hashes
        {
            const alphaNode = Fn(() =>
            {
                const baseUv = uv(1)
                const distanceToCenter = baseUv.sub(0.5).length()
    
                const voronoi = texture(
                    this.game.noises.voronoi,
                    baseUv
                ).g
    
                voronoi.subAssign(distanceToCenter.remap(0, 0.5, 0.3, 0))
    
                return voronoi
            })()
    
            const material = new MeshDefaultMaterial({
                colorNode: color(0x6F6A87),
                alphaNode: alphaNode,
                hasWater: false,
                hasLightBounce: false
            })
    
            const mesh = this.references.items.get('bonfireHashes')[0]
            mesh.material = material
        }

        // Burn
        const burn = this.references.items.get('bonfireBurn')[0]
        burn.visible = false

        // Interactive point
        this.game.interactivePoints.create(
            this.references.items.get('bonfireInteractivePoint')[0].position,
            'Res(e)t',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.reset()

                gsap.delayedCall(2, () =>
                {
                    // Bonfire
                    particles.visible = true
                    burn.visible = true
                    this.game.ticker.wait(2, () =>
                    {
                        particles.geometry.boundingSphere.center.y = 2
                        particles.geometry.boundingSphere.radius = 2
                    })

                    // Sound
                    this.game.audio.groups.get('campfire').items[0].positions.push(position)
                })
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

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'landing')
        })
        this.events.on('boundingOut', () =>
        {
            this.game.achievements.setProgress('landingLeave', 1)
        })
    }

    update()
    {
        this.localTime.value += this.game.ticker.deltaScaled * 0.1
        this.gamerCorner?.update(this.game.ticker.elapsed)
    }
}