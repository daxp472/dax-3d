import { readFileSync, writeFileSync } from 'fs'

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
    while(i !== undefined && guard++ < 40)
    {
        const t = nodes[i].translation || [0, 0, 0]
        x += t[0]; y += t[1]; z += t[2]
        i = parentOf.get(i)
    }
    return [x, y, z]
}

function rootName(i)
{
    let p = i, last = nodes[i].name
    while(parentOf.has(p))
    {
        p = parentOf.get(p)
        last = nodes[p].name
    }
    return last
}

const rows = []
nodes.forEach((n, i) =>
{
    const name = n.name || ''
    if(!name || /^ref/i.test(name) || /pin\d/i.test(name))
        return
    if(!/Physical|table|couch|stool|bar|jukebox|cabin|statue|altar|gamepad|gizmo|phone|sword|keyboard|fan|cookie|ball|bumper|screen|moon|letter|bench/i.test(name))
        return
    const [x, y, z] = worldPos(i)
    rows.push({
        name,
        area: rootName(i),
        x: +x.toFixed(2),
        y: +y.toFixed(2),
        z: +z.toFixed(2),
    })
})

rows.sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name))
writeFileSync('sources/data/mapItemLocations.json', JSON.stringify({ generatedAt: new Date().toISOString(), count: rows.length, items: rows }, null, 2))
console.log(`Wrote ${rows.length} items`)
for(const r of rows.slice(0, 80))
    console.log(`${r.area.padEnd(14)} ${r.name.padEnd(36)} ${r.x}, ${r.y}, ${r.z}`)
if(rows.length > 80)
    console.log(`... +${rows.length - 80} more in sources/data/mapItemLocations.json`)
