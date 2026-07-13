import http from 'http'
import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import { createClient } from '@supabase/supabase-js'
import { registerCommands } from './command.js'

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

registerCommands(bot, supabase)

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/sync') {
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
            try {
                const data = JSON.parse(body)
                const lastSync = new Date(data.timestamp).toISOString()

                await supabase.from('items').delete().neq('id', 0)

                const rows = data.items.map(item => ({
                    item_id: item.itemId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    last_sync: lastSync,
                    category: item.category,
                    required_level: item.requiredLevel
                }))

                const { error } = await supabase.from('items').insert(rows)
                if (error) throw error

                console.log(`Sync received: ${data.items.length} items`)
                res.writeHead(200)
                res.end('ok')
            } catch (err) {
                console.log('ERROR sync:', err.message)
                res.writeHead(400)
                res.end('error')
            }
        })
    } else {
        res.writeHead(200)
        res.end('ok')
    }
})

server.listen(process.env.PORT || 3000)