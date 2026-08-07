import * as THREE from 'three/webgpu'

const text = `
███████╗ █████╗ ███╗   ███╗██╗██████╗     ███████╗██╗███╗   ██╗ ██████╗ ██╗  ██╗
██╔════╝██╔══██╗████╗ ████║██║██╔══██╗    ██╔════╝██║████╗  ██║██╔════╝ ██║  ██║
███████╗███████║██╔████╔██║██║██████╔╝    ███████╗██║██╔██╗ ██║██║  ███╗███████║
╚════██║██╔══██║██║╚██╔╝██║██║██╔══██╗    ╚════██║██║██║╚██╗██║██║   ██║██╔══██║
███████║██║  ██║██║ ╚═╝ ██║██║██║  ██║    ███████║██║██║ ╚████║╚██████╔╝██║  ██║
╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═╝    ╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝

╔═ Intro ═══════════════╗
║ Welcome to my interactive portfolio.
║ I am Samir Singh, a Full Stack Engineer & Mentor focused on AI/RAG systems and production-ready products.
╚═══════════════════════╝

╔═ Core profile ════════╗
║ Role           ⇒ Full Stack Engineer & Mentor
║ Portfolio      ⇒ https://samirsir-portfolio.vercel.app
║ Location       ⇒ Gandhinagar / Ahmedabad, Gujarat — CodingGita SDE
║ Focus          ⇒ Full-stack + AI/RAG systems
╚═══════════════════════╝

╔═ Stack ═══════════════╗
║ Frontend       ⇒ React.js, Next.js, Tailwind CSS
║ Backend        ⇒ Node.js, REST APIs, GraphQL, AI/RAG (LangChain)
║ Databases      ⇒ MongoDB, PostgreSQL, Redis
║ Cloud          ⇒ AWS deployment workflows
╚═══════════════════════╝

╔═ Links ═══════════════╗
║ Portfolio      ⇒ https://samirsir-portfolio.vercel.app
║ LinkedIn       ⇒ https://www.linkedin.com/in/kshatriya-samir-singh/
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
