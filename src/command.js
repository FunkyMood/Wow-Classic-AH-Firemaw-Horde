import { Utility } from './utilities.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ALCHEMY_JSON_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'alchemy.json')

export function registerCommands(bot, supabase) {

    bot.onText(/\/help/, (msg) => {
        bot.sendMessage(msg.chat.id,
            `📖 Available commands:\n\n` +
            `/price <item name> — Search exact price or show suggestions\n` +
            `Example: /price Linen Cloth\n` +
            `Example: /price cloth (shows all cloth items)\n\n` +
            `/browse — Browse items by category\n\n` +
            `/alchemist <level> — Best consumables for your level\n` +
            `Example: /alchemist 40\n\n` +
            `/sharegold <Xg Ys> <players> — Split gold between players\n` +
            `Example: /sharegold 49g 27s 4\n\n` +
            `/ping — Check if bot is online\n\n` +
            `/help — Show this message`
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
                    `🔢 Quantity: ${item.quantity}\n`
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

        const alchemyButton = [[{ text: '⚗️ Alchemy Professions', callback_data: 'profession_alchemy' }]]
        const categoryButtons = categories.map(cat => ([{
            text: cat,
            callback_data: `browse_${cat}`
        }]))

        bot.sendMessage(chatID, '📂 Select a category:', {
            reply_markup: { inline_keyboard: [...alchemyButton, ...categoryButtons] }
        })
    })

    bot.onText(/\/alchemist (\d+)/, async (msg, match) => {
        const chatID = msg.chat.id
        const level = parseInt(match[1])

        const recipes = JSON.parse(fs.readFileSync(ALCHEMY_JSON_PATH, 'utf8'))

        const getBest = (filterFn) => {
            const available = recipes
                .filter(r => filterFn(r) && r.requiredLevel <= level)
                .sort((a, b) => {
                    if (a.priority !== b.priority) return a.priority - b.priority
                    return b.requiredLevel - a.requiredLevel
                })
            return available[0] || null
        }

        const results = [
            { icon: '⚔️', label: 'Battle Elixir (melee)', item: getBest(r => r.type === 'Battle Elixir' && r.name !== 'Elixir of Giant Growth' && r.role === 'melee') },
            { icon: '⚔️', label: 'Battle Elixir (spellcaster)', item: getBest(r => r.type === 'Battle Elixir' && r.role === 'spellcaster') },
            { icon: '🛡️', label: 'Guardian Elixir (melee)', item: getBest(r => r.type === 'Guardian Elixir' && r.role === 'melee') },
            { icon: '🛡️', label: 'Guardian Elixir (spellcaster)', item: getBest(r => r.type === 'Guardian Elixir' && r.role === 'spellcaster') },
            { icon: '❤️', label: 'Healing Potion', item: getBest(r => r.type === 'Potion' && r.name.toLowerCase().includes('healing')) },
            { icon: '💙', label: 'Mana Potion', item: getBest(r => r.type === 'Potion' && r.name.toLowerCase().includes('mana')) },
            { icon: '🔮', label: 'Flask (melee)', item: getBest(r => r.type === 'Flask' && r.role === 'melee') },
            { icon: '🔮', label: 'Flask (spellcaster)', item: getBest(r => r.type === 'Flask' && r.role === 'spellcaster') },
        ]

        const lines = results.map(({ icon, label, item }) =>
            item
                ? `${icon} ${label}: ${item.name} (lvl ${item.requiredLevel})`
                : `${icon} ${label}: none available`
        )

        bot.sendMessage(chatID, `⚗️ Best consumables for level ${level}:\n\n${lines.join('\n')}`)
    })

    bot.onText(/\/sharegold (\d+) (\d+) (\d+)/, (msg, match) => {
        const chatID = msg.chat.id
        const gold = parseInt(match[1])
        const silver = parseInt(match[2])
        const people = parseInt(match[3])

        if (people <= 0) {
            bot.sendMessage(chatID, '❌ Number of people must be greater than 0.')
            return
        }

        const totalSilver = gold * 100 + silver
        const perPerson = Math.floor(totalSilver / people)
        const remainder = totalSilver - (perPerson * people)

        const perPersonGold = Math.floor(perPerson / 100)
        const perPersonSilver = perPerson % 100
        const remainderGold = Math.floor(remainder / 100)
        const remainderSilver = remainder % 100

        let message = `💰 Split ${gold}g ${silver}s between ${people} people:\n\n`
        message += `👤 Each person gets: ${perPersonGold}g ${perPersonSilver}s\n`
        if (remainder > 0) {
            message += `🏦 Remainder: ${remainderGold}g ${remainderSilver}s`
        }

        bot.sendMessage(chatID, message)
    })

    bot.on('callback_query', async (query) => {
        const chatID = query.message.chat.id
        if (query.data === 'profession_alchemy') {
            const skillRanges = [
                { label: '1-74 (Apprentice)', min: 1, max: 74 },
                { label: '75-149 (Journeyman)', min: 75, max: 149 },
                { label: '150-224 (Expert)', min: 150, max: 224 },
                { label: '225-300 (Artisan)', min: 225, max: 300 },
            ]

            const buttons = skillRanges.map(range => ([{
                text: range.label,
                callback_data: `alchemy_profit_${range.min}_${range.max}`
            }]))

            bot.sendMessage(chatID, '⚗️ Select your Alchemy skill range:', {
                reply_markup: { inline_keyboard: buttons }
            })
            bot.answerCallbackQuery(query.id)
            return
        }

        if (query.data.startsWith('alchemy_profit_')) {
            const parts = query.data.replace('alchemy_profit_', '').split('_')
            const minSkill = parseInt(parts[0])
            const maxSkill = parseInt(parts[1])

            const VENDOR_ITEMS = ['Crystal Vial', 'Leaded Vial', 'Imbued Vial', 'Empty Vial']
            const recipes = JSON.parse(fs.readFileSync(ALCHEMY_JSON_PATH, 'utf8'))

            const inRange = recipes.filter(r =>
                r.skillRequired >= minSkill &&
                r.skillRequired <= maxSkill &&
                !(minSkill === 225 && r.type === 'Flask')
            )

            const results = []

            for (const recipe of inRange) {
                const { data: productData } = await supabase
                    .from('items')
                    .select('price, name')
                    .ilike('name', recipe.name)
                    .limit(1)

                if (!productData || productData.length === 0) continue

                const sellPrice = productData[0].price
                if (!sellPrice || sellPrice === 0) continue

                const ingredients = recipe.ingredients.filter(i => !VENDOR_ITEMS.includes(i.name))

                let totalCost = 0
                let canCalculate = true

                for (const ingredient of ingredients) {
                    const { data: ingData } = await supabase
                        .from('items')
                        .select('price')
                        .ilike('name', ingredient.name)
                        .limit(1)

                    if (!ingData || ingData.length === 0 || !ingData[0].price) {
                        canCalculate = false
                        break
                    }

                    totalCost += ingData[0].price * ingredient.quantity
                }

                if (!canCalculate) continue

                const profit = sellPrice - totalCost
                results.push({ name: recipe.name, profit, sellPrice, totalCost })
            }

            if (results.length === 0) {
                bot.sendMessage(chatID, `❌ No calculable recipes in this skill range.`)
                bot.answerCallbackQuery(query.id)
                return
            }

            const top5 = results.sort((a, b) => b.profit - a.profit).slice(0, 5)

            const message = top5.map((r, i) => {
                const profitStr = r.profit >= 0
                    ? `✅ +${Utility.copperToGold(r.profit)}`
                    : `❌ ${Utility.copperToGold(Math.abs(r.profit))}`
                return `${i + 1}. ${r.name}\n💰 Sell: ${Utility.copperToGold(r.sellPrice)} | Cost: ${Utility.copperToGold(r.totalCost)}\n${profitStr}`
            }).join('\n\n')

            bot.sendMessage(chatID, `⚗️ Top 5 most profitable recipes (skill ${minSkill}-${maxSkill}):\n\n${message}`)
            bot.answerCallbackQuery(query.id)
            return
        }
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
                `🔢 Quantity: ${item.quantity}\n`
            )
            bot.answerCallbackQuery(query.id)
        } catch (err) {
            console.log('ERROR:', err.message)
            bot.answerCallbackQuery(query.id, { text: 'Error!' })
        }
    })
}