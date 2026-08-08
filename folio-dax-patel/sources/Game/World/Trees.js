import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { Foliage } from './Foliage.js'
import { color, uniform } from 'three/tsl'

export class Trees
{
    constructor(name, visual, references, colorA, colorB)
    {
        this.game = Game.getInstance()

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: `🌳 ${name}`,
                expanded: false,
            })
        }

        this.visual = visual
        this.references = references
        this.colorA = colorA
        this.colorB = colorB

        this.setModelParts()
        this.setBodies()
        this.setLeaves()
        this.setPhysical()
    }

    setModelParts()
    {
        this.modelParts = {}
        this.modelParts.leaves = []
        this.modelParts.body = null
        
        this.visual.traverse((_child) =>
        {
            if(_child.isMesh)
            {
                if(_child.name.startsWith('treeLeaves'))
                    this.modelParts.leaves.push(_child)
                else if(_child.name.startsWith('treeBody'))
                    this.modelParts.body = _child
            }
        })
    }

    setBodies()
    {
        this.game.materials.updateObject(this.modelParts.body)
        this.bodies = new THREE.InstancedMesh(this.modelParts.body.geometry, this.modelParts.body.material, this.references.length)
        this.bodies.instanceMatrix.setUsage(THREE.StaticDrawUsage)
        this.bodies.castShadow = true
        this.bodies.receiveShadow = true
        
        let i = 0
        for(const treeReference of this.references)
        {
            this.bodies.setMatrixAt(i, treeReference.matrix)
            i++
        }

        this.game.scene.add(this.bodies)
    }

    setLeaves()
    {
        const references = []
        
        for(const treeReference of this.references)
        {
            for(const leaves of this.modelParts.leaves)
            {
                const finalMatrix = leaves.matrix.clone().premultiply(treeReference.matrixWorld)
                const reference = new THREE.Object3D()
                reference.applyMatrix4(finalMatrix)

                references.push(reference)
            }
        }

        const leavesColorANode = uniform(color(this.colorA))
        const leavesColorBNode = uniform(color(this.colorB))
        this.leaves = new Foliage(references, leavesColorANode, leavesColorBNode, true)

        // Debug
        if(this.game.debug.active)
        {
            this.game.debug.addThreeColorBinding(this.debugPanel, leavesColorANode.value, 'leavesColorA')
            this.game.debug.addThreeColorBinding(this.debugPanel, leavesColorBNode.value, 'leavesColorB')
            this.debugPanel.addBinding(this.leaves.material.shadowOffset, 'value', { label: 'shadowOffset', min: 0, max: 2, step: 0.001 })
            this.debugPanel.addBinding(this.leaves.material.threshold, 'value', { label: 'threshold', min: 0, max: 1, step: 0.001 })
            this.debugPanel.addBinding(this.leaves.material.seeThroughEdgeMin, 'value', { label: 'seeThroughEdgeMin', min: 0, max: 1, step: 0.001 })
            this.debugPanel.addBinding(this.leaves.material.seeThroughEdgeMax, 'value', { label: 'seeThroughEdgeMax', min: 0, max: 1, step: 0.001 })
        }
    }

    setPhysical()
    {
        this.physicals = []

        for(const treeReference of this.references)
        {
            const object = this.game.objects.add(
                null,
                {
                    type: 'fixed',
                    position: treeReference.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                    rotation: treeReference.quaternion.clone(),
                    friction: 0.7,
                    sleeping: true,
                    colliders: [ { shape: 'cylinder', parameters: [ 2.5, 0.15 ], category: 'object' } ],
                    onCollision: (force, position) =>
                    {
                        this.game.audio.groups.get('hitDefault').playRandomNext(force, position)
                    }
                }
            )
            this.physicals.push(object)
        }
    }

    /**
     * Hide trees near a world point (clears space for Guest Wall, etc.).
     */
    hideNear(center, radius = 4)
    {
        const dummy = new THREE.Object3D()
        const leavesPerTree = this.modelParts.leaves.length || 1
        let hidden = 0

        this.references.forEach((treeReference, i) =>
        {
            const pos = treeReference.position
            const dx = pos.x - center.x
            const dz = pos.z - center.z
            if((dx * dx + dz * dz) > radius * radius)
                return

            // Collapse trunk instance
            dummy.position.copy(pos)
            dummy.quaternion.copy(treeReference.quaternion)
            dummy.scale.set(0, 0, 0)
            dummy.updateMatrix()
            this.bodies.setMatrixAt(i, dummy.matrix)
            this.bodies.instanceMatrix.needsUpdate = true

            // Collapse foliage instances for this tree
            if(this.leaves?.mesh)
            {
                for(let l = 0; l < leavesPerTree; l++)
                {
                    const leafIndex = i * leavesPerTree + l
                    if(leafIndex >= this.leaves.mesh.count)
                        break
                    dummy.position.set(0, -999, 0)
                    dummy.scale.set(0, 0, 0)
                    dummy.updateMatrix()
                    this.leaves.mesh.setMatrixAt(leafIndex, dummy.matrix)
                }
                this.leaves.mesh.instanceMatrix.needsUpdate = true
            }

            // Disable collider
            const physical = this.physicals?.[i]
            if(physical?.physical?.body)
                physical.physical.body.setEnabled(false)

            hidden++
        })

        return hidden
    }
}