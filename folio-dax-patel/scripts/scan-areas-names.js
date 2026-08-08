import { readFileSync } from 'fs'

const buf = readFileSync('static/areas/areas.glb')
const jsonLen = buf.readUInt32LE(12)
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
const nodes = json.nodes || []
const parentOf = new Map()
nodes.forEach((n, i) =>
{
    for(const c of n.children || [])
        parentOf.set(c, i)
})

function worldPos(index)
{
    let x = 0, y = 0, z = 0, i = index, guard = 0
    while(i !== undefined && guard++ < 30)
    {
        const t = nodes[i].translation || [0, 0, 0]
        x += t[0]; y += t[1]; z += t[2]
        i = parentOf.get(i)
    }
    return [x, y, z]
}

const landingIdx = nodes.findIndex((n) => n.name === 'landing')
function underLanding(i)
{
    let p = i
    while(p !== undefined)
    {
        if(p === landingIdx)
            return true
        p = parentOf.get(p)
    }
    return false
}

console.log('LANDING children world positions:')
nodes.forEach((n, i) =>
{
    if(!underLanding(i) || i === landingIdx)
        return
    if(!n.name || /^ref/i.test(n.name))
        return
    const w = worldPos(i)
    console.log(`${n.name.padEnd(42)} ${w.map((v) => v.toFixed(2)).join(', ')}`)
})
