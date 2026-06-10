import fs from 'fs'
import { Items } from 'wow-classic-items'

const itemsDb = new Items()
const itemLevels = {}


for (const item of itemsDb) {
    itemLevels[item.itemId] = item.requiredLevel || 0
}

const CATEGORIES = {
    0: 'Consumable',
    1: 'Container',
    2: 'Weapon',
    3: 'Gem',
    4: 'Armor',
    5: 'Reagent',
    6: 'Projectile',
    7: 'Trade Goods',
    9: 'Recipe',
    10: 'Currency',
    11: 'Quiver',
    12: 'Quest',
    13: 'Key',
    15: 'Miscellaneous'
}

export function parseAHDB(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const names = {}
    const categories = {}
    const lines = content.split('\n')
    for (const line of lines) {
        const itemMatch = line.match(/i(\d+)[^"]*/)
        const nameMatch = line.match(/\[([^\]]+)\]\|h\|r/)
        const categoryMatch = line.match(/"(\d+),\d+,(\d+)/)
        if (itemMatch && nameMatch) {
            const id = parseInt(itemMatch[1])
            names[id] = nameMatch[1]
            if (categoryMatch) {
                categories[id] = CATEGORIES[parseInt(categoryMatch[2])] || 'Miscellaneous'
            }
        }
    }

    const ahStart = content.indexOf('"ah"] = {')
    if (ahStart === -1) return []
    const ahSection = content.substring(ahStart)

    const itemRegex = /i(\d+)[^!]*!\/([^"]+?)(?=\si\d|$)/g
    const items = {}
    let m

    while ((m = itemRegex.exec(ahSection)) !== null) {
        const itemId = parseInt(m[1])
        const auctionsRaw = m[2]
        const auctions = auctionsRaw.split('&').filter(a => a.trim().length > 0)

        let minBuyoutPerUnit = Infinity
        let totalQuantity = 0

        for (const auction of auctions) {
            const parts = auction.split(',')
            if (parts.length < 4) continue
            const quantity = parseInt(parts[1])
            const buyout = parseInt(parts[3])
            if (!buyout || buyout <= 0 || isNaN(quantity) || isNaN(buyout)) continue
            const buyoutPerUnit = buyout / quantity
            if (buyoutPerUnit < minBuyoutPerUnit) {
                minBuyoutPerUnit = buyoutPerUnit
            }
            totalQuantity += quantity
        }

        if (minBuyoutPerUnit !== Infinity) {
            items[itemId] = {
                itemId,
                price: Math.floor(minBuyoutPerUnit),
                quantity: totalQuantity,
                name: names[itemId] || `Item #${itemId}`,
                category: categories[itemId] || 'Miscellaneous',
                requiredLevel: itemLevels[itemId] || 0
            }
        }
    }

    return Object.values(items)
}