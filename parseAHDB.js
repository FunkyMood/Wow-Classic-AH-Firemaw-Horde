import fs from 'fs'

export function parseAHDB(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')

    const names = {}
    const lines = content.split('\n')
    for (const line of lines) {
        const itemMatch = line.match(/i(\d+)[^"]*/)
        const nameMatch = line.match(/\[([^\]]+)\]\|h\|r/)
        if (itemMatch && nameMatch) {
            names[parseInt(itemMatch[1])] = nameMatch[1]
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
                name: names[itemId] || `Item #${itemId}`
            }
        }
    }

    return Object.values(items)
}