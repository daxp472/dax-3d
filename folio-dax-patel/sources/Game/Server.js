import msgpack from 'msgpack-lite'
import { v4 as uuidv4 } from 'uuid'
import { Events } from './Events.js'
import { Game } from './Game.js'

export class Server
{
    constructor()
    {
        this.game = Game.getInstance()

        // Unique session ID
        this.uuid = localStorage.getItem('uuid')
        if(!this.uuid)
        {
            this.uuid = uuidv4()
            localStorage.setItem('uuid', this.uuid)
        }

        this.connected = false
        this.connecting = false
        this.initData = null
        this.socket = null
        this.events = new Events()
        document.documentElement.classList.add('is-server-offline')
    }

    start()
    {
        if(!import.meta.env.VITE_SERVER_URL)
            return

        this.connect()

        setInterval(() =>
        {
            if(!this.connected && !this.connecting)
                this.connect()
        }, 2000)
    }

    connect()
    {
        if(this.connecting || this.connected)
            return

        // Close any half-open socket (prevents reconnect leaks)
        if(this.socket)
        {
            try { this.socket.close() } catch { /* ignore */ }
            this.socket = null
        }

        this.connecting = true
        const url = import.meta.env.VITE_SERVER_URL
        this.socket = new WebSocket(url)
        this.socket.binaryType = 'arraybuffer'

        this.socket.addEventListener('open', () =>
        {
            this.connecting = false
            this.connected = true
            document.documentElement.classList.remove('is-server-offline')
            document.documentElement.classList.add('is-server-online')
            this.events.trigger('connected')

            if(this.game.ticker.elapsed > 10)
            {
                const html = /* html */`
                    <div class="top">
                        <div class="title">Server connected</div>
                    </div>
                `

                this.game.notifications.show(
                    html,
                    'server-connected',
                    8,
                    null,
                    'server-connected'
                )
            }
        })

        this.socket.addEventListener('message', (message) =>
        {
            this.onReceive(message)
        })

        this.socket.addEventListener('close', () =>
        {
            const wasConnected = this.connected
            this.connecting = false
            this.connected = false
            this.socket = null

            document.documentElement.classList.add('is-server-offline')
            document.documentElement.classList.remove('is-server-online')

            if(wasConnected)
            {
                const html = /* html */`
                    <div class="top">
                        <div class="title">Server disconnected</div>
                    </div>
                `

                this.game.notifications.show(
                    html,
                    'server-disconnected',
                    8,
                    null,
                    'server-disconnected'
                )

                this.events.trigger('disconnected')
            }
        })

        this.socket.addEventListener('error', () =>
        {
            this.connecting = false
        })
    }

    onReceive(message)
    {
        const data = this.decode(message.data)

        if(data?.type === 'init')
            this.initData = data
        else if(this.initData === null)
            this.initData = data

        this.events.trigger('message', [ data ])
    }

    send(message)
    {
        if(!this.connected || !this.socket)
            return false

        this.socket.send(this.encode({ uuid: this.uuid, ...message }))
        return true
    }

    decode(data)
    {
        return msgpack.decode(new Uint8Array(data))
    }

    encode(data)
    {
        return msgpack.encode(data)
    }
}
