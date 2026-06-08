import axios from 'axios'
import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'
import { Items } from 'wow-classic-items'

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })

function getItemId(itemName) {
    const items = new Items()
    const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase())
    return item ? item.itemId : null
}

async function getTSMToken() {
    const response = await axios.post(
        'https://auth.tradeskillmaster.com/oauth2/token',
        {
            client_id: 'client',
            grant_type: 'api_token',
            scope: 'app:realm-api app:pricing-api',
            token: process.env.TSM_API_KEY,
        }
    )
    return response.data.access_token
}

async function getTSMPrice(tsmToken, itemId) {
    const response = await axios.get(
        'https://pricing-api.tradeskillmaster.com/ah/212',
        {
            headers: {
                Authorization: `Bearer ${tsmToken}`,
            },
        }
    )
    return response.data.find(item => item.itemId === itemId) || null
}

function copperToGold(copper) {
    const gold = Math.floor(copper / 10000)
    const silver = Math.floor((copper % 10000) / 100)
    const cop = copper % 100
    return `${gold}g ${silver}s ${cop}c`
}

// Bot commands

bot.onText(/\/price (.+)/, async (msg, match) => {
    const chatID = msg.chat.id
    const itemName = match[1]
    try {
        bot.sendMessage(chatID, 'Sto cercando...')
        const itemId = getItemId(itemName)
        if (!itemId) {
            bot.sendMessage(chatID, `❌ Item "${itemName}" non trovato.`)
            return
        }
        const tsmToken = await getTSMToken()
        const priceData = await getTSMPrice(tsmToken, itemId)
        if (!priceData) {
            bot.sendMessage(chatID, `❌ Nessun prezzo trovato per "${itemName}" su Firemaw.`)
            return
        }
        bot.sendMessage(chatID,
            `📦 *${itemName}*\n` +
            `💰 Min Buyout: ${copperToGold(priceData.minBuyout)}\n` +
            `📊 Market Value: ${copperToGold(priceData.marketValue)}\n` +
            `🔢 Quantità: ${priceData.quantity}`,
            { parse_mode: 'Markdown' }
        )
    } catch (err) {
        console.log('ERRORE:', err.message)
        bot.sendMessage(chatID, `❌ Errore: ${err.message}`)
    }
})