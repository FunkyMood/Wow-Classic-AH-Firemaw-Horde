import axios from 'axios'
import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import { parseAHDB } from './parseAHDB.js'

const AHDB_PATH = 'C:\\Program Files (x86)\\World of Warcraft\\_classic_era_\\WTF\\Account\\102363894#2\\SavedVariables\\AuctionDB.lua'

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })

function copperToGold(copper) {
    const gold = Math.floor(copper / 10000)
    const silver = Math.floor((copper % 10000) / 100)
    const cop = copper % 100
    return `${gold}g ${silver}s ${cop}c`
}

// Bot commands

bot.onText(/\/ping/, (msg) => {
    bot.sendMessage(msg.chat.id, '🟢 Bot online!')
})

bot.onText(/\/price (.+)/, async (msg, match) => {
    const chatID = msg.chat.id
    const itemName = match[1]
    try {
        bot.sendMessage(chatID, 'Sto cercando...')
        const items = parseAHDB(AHDB_PATH)
        const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase())
        if (!item) {
            bot.sendMessage(chatID, `❌ Item "${itemName}" non trovato nella scan AHDB.`)
            return
        }
        bot.sendMessage(chatID,
            `📦 *${item.name}*\n` +
            `💰 Min Buyout: ${copperToGold(item.price)}\n` +
            `🔢 Quantità: ${item.quantity}`,
            { parse_mode: 'Markdown' }
        )
    } catch (err) {
        console.log('ERRORE:', err.message)
        bot.sendMessage(chatID, `❌ Errore: ${err.message}`)
    }
})