import * as THREE from 'three/webgpu'

const text = `
██████╗  █████╗ ██╗  ██╗    ██████╗  █████╗ ████████╗███████╗██╗
██╔══██╗██╔══██╗╚██╗██╔╝    ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██║
██║  ██║███████║ ╚███╔╝     ██████╔╝███████║   ██║   █████╗  ██║
██║  ██║██╔══██║ ██╔██╗     ██╔═══╝ ██╔══██║   ██║   ██╔══╝  ██║
██████╔╝██║  ██║██╔╝ ██╗    ██║     ██║  ██║   ██║   ███████╗███████╗
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝

╔═ Intro ═══════════════╗
║ Welcome to my interactive portfolio.
║ I am Dax Patel, a Full Stack Developer focused on shipping production-ready products.
╚═══════════════════════╝

╔═ Core profile ════════╗
║ Role           ⇒ Full Stack Developer
║ Portfolio      ⇒ https://dax-patel.in
║ Projects       ⇒ 20+
║ Technologies   ⇒ 15+
║ Client work    ⇒ 2+ projects delivered
╚═══════════════════════╝

╔═ Stack ═══════════════╗
║ Frontend       ⇒ React.js, Next.js, Tailwind CSS
║ Backend        ⇒ Node.js, REST APIs, auth systems
║ Databases      ⇒ MongoDB, PostgreSQL, MySQL, Redis
║ Cloud          ⇒ AWS (deployment-oriented workflows)
╚═══════════════════════╝

╔═ Links ═══════════════╗
║ Portfolio      ⇒ https://dax-patel.in
║ GitHub         ⇒ https://github.com/daxp472
║ LinkedIn       ⇒ https://www.linkedin.com/in/dax-cg/
║ X / Twitter    ⇒ https://x.com/dax_CG
║ YouTube        ⇒ https://www.youtube.com/@BuildwithDax
║ LeetCode       ⇒ https://leetcode.com/u/daxCG/
║ Discord        ⇒ dax01804
║ Resume         ⇒ /resume/Dax-Patel.pdf
║ 3D source      ⇒ https://github.com/daxp472/dax-3d
╚═══════════════════════╝

╔═ Debug ═══════════════╗
║ Add #debug to the URL and reload to open debug controls.
║ Press [V] to toggle the free camera.
╚═══════════════════════╝

╔═ Tech behind this build ═╗
║ Three.js render engine (release: ${THREE.REVISION}) ⇒ https://threejs.org/
║ Rapier physics                                    ⇒ https://rapier.rs/
║ Howler.js audio                                   ⇒ https://howlerjs.com/
╚════════════════════════╝
`
let finalText = ''
let finalStyles = []
const stylesSet = {
    letter: 'color: #ffffff; font: 400 1em monospace;',
    pipe: 'color: #D66FFF; font: 400 1em monospace;',
}
let currentStyle = null
for(let i = 0; i < text.length; i++)
{
    const char = text[i]

    const style = char.match(/[╔║═╗╚╝╔╝]/) ? 'pipe' : 'letter'
    if(style !== currentStyle)
    {
        currentStyle = style
        finalText += '%c'

        finalStyles.push(stylesSet[currentStyle])
    }
    finalText += char
}

export default [finalText, ...finalStyles]