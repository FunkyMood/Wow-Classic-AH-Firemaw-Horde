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

        if (query.data.startsWith('browse_') && !query.data.includes('_lvl_')) {
            const category = query.data.replace('browse_', '')

            const levelRanges = [
                { label: '1-9', min: 1, max: 9 },
                { label: '10-19', min: 10, max: 19 },
                { label: '20-29', min: 20, max: 29 },
                { label: '30-39', min: 30, max: 39 },
                { label: '40-49', min: 40, max: 49 },
                { label: '50-59', min: 50, max: 59 },
                { label: '60', min: 60, max: 60 },
            ]

            const buttons = levelRanges.map(range => ([{
                text: `Level ${range.label}`,
                callback_data: `browse_${category}_lvl_${range.min}_${range.max}`
            }]))

            bot.sendMessage(chatID, `⚔️ Select a level range for ${category}:`, {
                reply_markup: { inline_keyboard: buttons }
            })
            bot.answerCallbackQuery(query.id)
            return
        }

        if (query.data.startsWith('browse_') && query.data.includes('_lvl_')) {
            const parts = query.data.split('_lvl_')
            const category = parts[0].replace('browse_', '')
            const [minLevel, maxLevel] = parts[1].split('_').map(Number)

            const { data, error } = await supabase
                .from('items')
                .select('name, item_id, price, quantity')
                .eq('category', category)
                .gte('required_level', minLevel)
                .lte('required_level', maxLevel)
                .gt('price', 0)

            if (error) {
                bot.answerCallbackQuery(query.id, { text: 'Error!' })
                return
            }

            if (!data || data.length === 0) {
                bot.sendMessage(chatID, `❌ No items found in ${category} for level ${minLevel}-${maxLevel}.`)
                bot.answerCallbackQuery(query.id)
                return
            }

            const prices = data.map(i => i.price).sort((a, b) => a - b)
            const mid = Math.floor(prices.length / 2)
            const median = prices.length % 2 !== 0
                ? prices[mid]
                : (prices[mid - 1] + prices[mid]) / 2

            const threshold = median * 3
            const filtered = data
                .filter(i => i.price <= threshold)
                .sort((a, b) => b.price - a.price)
                .slice(0, 5)

            if (filtered.length === 0) {
                bot.sendMessage(chatID, `❌ No valid items found.`)
                bot.answerCallbackQuery(query.id)
                return
            }

            const message = filtered.map((item, index) =>
                `${index + 1}. ${item.name}\n💰 ${Utility.copperToGold(item.price)} — 🔢 ${item.quantity}`
            ).join('\n\n')

            bot.sendMessage(chatID, `🏆 Top 5 in ${category} (Level ${minLevel}-${maxLevel}):\n\n${message}`)
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