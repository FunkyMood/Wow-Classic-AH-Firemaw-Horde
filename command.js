import { Utility } from './utilities.js'

export function registerCommands(bot, supabase) {

    bot.onText(/\/help/, (msg) => {
        bot.sendMessage(msg.chat.id,
            `📖 Available commands:\n\n` +
            `/price <item name> — Search for exact price or show suggestions\n` +
            `Example: /price Linen Cloth\n` +
            `Example: /price cloth (shows all cloth items)\n\n` +
            `/browse — Browse items by category\n\n` +
            `/ping — Check if the bot is online`
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
                    `🔢 Quantity: ${item.quantity}\n` +
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
                bot.sendMessage(chatID, `❌ No items found for "${itemName}".`)
                return
            }

            const buttons = partialData.map(item => ([{
                text: item.name,
                callback_data: `price_${item.item_id}`
            }]))

            bot.sendMessage(chatID, `🔍 Results for "${itemName}":`, {
                reply_markup: { inline_keyboard: buttons }
            })

        } catch (err) {
            console.log('ERROR:', err.message)
            bot.sendMessage(chatID, `❌ Error: ${err.message}`)
        }
    })

    bot.onText(/\/browse/, async (msg) => {
        const chatID = msg.chat.id

        const { data, error } = await supabase
            .from('items')
            .select('category')

        if (error) {
            bot.sendMessage(chatID, `❌ Error: ${error.message}`)
            return
        }

        const categories = [...new Set(data.map(i => i.category).filter(Boolean))].sort()

        const buttons = categories.map(cat => ([{
            text: cat,
            callback_data: `browse_${cat}`
        }]))

        bot.sendMessage(chatID, '📂 Select a category:', {
            reply_markup: { inline_keyboard: buttons }
        })
    })

    bot.on('callback_query', async (query) => {
        const chatID = query.message.chat.id

        if (query.data.startsWith('browse_')) {
            const category = query.data.replace('browse_', '')
            const { data, error } = await supabase
                .from('items')
                .select('name, item_id, price, quantity')
                .eq('category', category)
                .order('price', { ascending: true })
                .limit(5)

            if (error) {
                bot.answerCallbackQuery(query.id, { text: 'Error!' })
                return
            }

            const message = data.map(item =>
                `📦 ${item.name}\n💰 ${Utility.copperToGold(item.price)} — 🔢 ${item.quantity}`
            ).join('\n\n')

            bot.sendMessage(chatID, `🏷️ Top 5 cheapest in ${category}:\n\n${message}`)
            bot.answerCallbackQuery(query.id)
            return
        }

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
                `🔢 Quantity: ${item.quantity}\n` +
                `${Utility.getSyncTimeLabel(new Date(item.last_sync))}`
            )
            bot.answerCallbackQuery(query.id)
        } catch (err) {
            console.log('ERROR:', err.message)
            bot.answerCallbackQuery(query.id, { text: 'Error!' })
        }
    })
}