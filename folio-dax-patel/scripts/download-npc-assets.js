/**
 * Download CC0 NPC assets into static/npcs/
 * Source: https://gobkit.com/api/free (CC0 1.0)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'static', 'npcs')

const assets = [
    {
        name: 'minion-b01.glb',
        url: 'https://gobkit.com/freebies/minion/minion-b01.glb',
    },
]

await mkdir(outputDir, { recursive: true })

for(const asset of assets)
{
    const response = await fetch(asset.url)

    if(!response.ok)
        throw new Error(`Failed to download ${asset.url}: ${response.status}`)

    const buffer = Buffer.from(await response.arrayBuffer())
    const filePath = path.join(outputDir, asset.name)
    await writeFile(filePath, buffer)
    console.log(`[download-npc-assets] ${asset.name} (${buffer.length} bytes)`)
}

console.log('[download-npc-assets] Done.')
