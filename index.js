import http from 'http'
import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import { Utility } from './utilities.js'
import { createClient } from '@supabase/supabase-js'

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

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
                    last_sync: lastSync
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

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `📖 Comandi disponibili:\n\n` +
        `/price <nome item> — Cerca il prezzo esatto o mostra suggerimenti\n` +
        `Esempio: /price Linen Cloth\n` +
        `Esempio: /price cloth (mostra tutti i cloth)\n\n` +
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
        const { data: exactData, error: exactError } = await supabase
            .from('items')
            .select('*')
            .ilike('name', itemName)
            .limit(1)

        if (exactError) throw exactError

        if (exactData && exactData.length > 0) {
            const item = exactData[0]
            bot.sendMessage(chatID,
                `📦 ${item.name}\n` +
                `💰 Min Buyout: ${Utility.copperToGold(item.price)}\n` +
                `🔢 Quantità: ${item.quantity}\n` +
                `${Utility.getSyncTimeLabel(new Date(item.last_sync))}`
            )
            return
        }

        const { data: partialData, error: partialError } = await supabase
            .from('items')
            .select('name, item_id')
            .ilike('name', `%${itemName}%`)
            .limit(10)

        if (partialError) throw partialError

        if (!partialData || partialData.length === 0) {
            bot.sendMessage(chatID, `❌ Nessun item trovato per "${itemName}".`)
            return
        }

        const buttons = partialData.map(item => ([{
            text: item.name,
            callback_data: `price_${item.item_id}`
        }]))

        bot.sendMessage(chatID, `🔍 Risultati per "${itemName}":`, {
            reply_markup: {
                inline_keyboard: buttons
            }
        })

    } catch (err) {
        console.log('ERRORE:', err.message)
        bot.sendMessage(chatID, `❌ Errore: ${err.message}`)
    }
})

bot.on('callback_query', async (query) => {
    const chatID = query.message.chat.id
    const itemId = parseInt(query.data.replace('price_', ''))

    try {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('item_id', itemId)
            .limit(1)

        if (error) throw error

        const item = data[0]
        bot.sendMessage(chatID,
            `📦 ${item.name}\n` +
            `💰 Min Buyout: ${Utility.copperToGold(item.price)}\n` +
            `🔢 Quantità: ${item.quantity}\n` +
            `${Utility.getSyncTimeLabel(new Date(item.last_sync))}`
        )
        bot.answerCallbackQuery(query.id)
    } catch (err) {
        console.log('ERRORE:', err.message)
        bot.answerCallbackQuery(query.id, { text: 'Errore!' })
    }
})