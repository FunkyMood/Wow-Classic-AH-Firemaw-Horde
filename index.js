import axios from 'axios'
import http from 'http'
import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })

// Database in memoria
let ahdbItems = []
let lastSync = null

function copperToGold(copper) {
    const gold = Math.floor(copper / 10000)
    const silver = Math.floor((copper % 10000) / 100)
    const cop = copper % 100
    return `${gold}g ${silver}s ${cop}c`
}

// Server HTTP
const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/sync') {
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
            try {
                const data = JSON.parse(body)
                ahdbItems = data.items
                lastSync = new Date(data.timestamp)
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

// Bot commands

bot.onText(/\/ping/, (msg) => {
    bot.sendMessage(msg.chat.id, '🟢 Bot online!')
})

bot.onText(/\/price (.+)/, async (msg, match) => {
    const chatID = msg.chat.id
    const itemName = match[1]
    try {
        bot.sendMessage(chatID, 'Sto cercando...')

        if (ahdbItems.length === 0) {
            bot.sendMessage(chatID, '❌ Nessun dato disponibile. Esegui prima il sync locale.')
            return
        }

        const item = ahdbItems.find(i => i.name.toLowerCase() === itemName.toLowerCase())
        if (!item) {
            bot.sendMessage(chatID, `❌ Item "${itemName}" non trovato.`)
            return
        }

        const syncTime = lastSync ? `🕐 _Scan: ${lastSync.toLocaleString('it-IT')}_` : ''
        bot.sendMessage(chatID,
            `📦 *${item.name}*\n` +
            `💰 Min Buyout: ${copperToGold(item.price)}\n` +
            `🔢 Quantità: ${item.quantity}\n` +
            syncTime,
            { parse_mode: 'Markdown' }
        )
    } catch (err) {
        console.log('ERRORE:', err.message)
        bot.sendMessage(chatID, `❌ Errore: ${err.message}`)
    }
})