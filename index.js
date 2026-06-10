import http from 'http'
import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import { Utility } from './utilities.js'
import fs from 'fs'

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })
const CACHE_PATH = './cache.json'

let ahdbItems = []
let lastSync = null

if (fs.existsSync(CACHE_PATH)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
    ahdbItems = cache.items
    lastSync = new Date(cache.timestamp)
    console.log(`Cache caricata: ${ahdbItems.length} items`)
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/sync') {
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
            try {
                const data = JSON.parse(body)
                ahdbItems = data.items
                lastSync = new Date(data.timestamp)
                fs.writeFileSync(CACHE_PATH, JSON.stringify({ items: data.items, timestamp: data.timestamp }))
                console.log(`Sync ricevuto: ${ahdbItems.length} items`)
                res.writeHead(200)
                res.end('ok')
            } catch (err) {
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


bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `📖 Comandi disponibili:\n\n` +
        `/price <nome item> — Cerca il prezzo di un item\n` +
        `Esempio: /price Linen Cloth\n\n` +
        `/ping — Controlla se il bot è online`
    )
})


bot.onText(/\/ping/, (msg) => {
    bot.sendMessage(msg.chat.id, '🟢 Bot online!')
})

bot.onText(/\/price (.+)/, async (msg, match) => {
    const chatID = msg.chat.id
    const itemName = match[1]
    try {
        if (ahdbItems.length === 0) {
            bot.sendMessage(chatID, '❌ Nessun dato disponibile. Esegui prima il sync locale.')
            return
        }

        const item = ahdbItems.find(i => i.name.toLowerCase() === itemName.toLowerCase())
        if (!item) {
            bot.sendMessage(chatID, `❌ Item "${itemName}" non trovato.`)
            return
        }

        bot.sendMessage(chatID,
            `📦 ${item.name}\n` +
            `💰 Min Buyout: ${Utility.copperToGold(item.price)}\n` +
            `🔢 Quantità: ${item.quantity}\n` +
            `${Utility.getSyncTimeLabel(lastSync)}`
        )
    } catch (err) {
        console.log('ERRORE:', err.message)
        bot.sendMessage(chatID, `❌ Errore: ${err.message}`)
    }
})