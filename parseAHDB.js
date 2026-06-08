import fs from 'fs'

export function parseAHDB(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const idx = content.indexOf('i2589')
    const regex = /\["i(\d+)[^"]*"\] = "(\d+),(\d+).*?\|h\[([^\]]+)\]/g
    const items = []
    console.log(items.length)
    console.log(items.slice(0, 3))
    let match

    while ((match = regex.exec(content)) !== null) {
        items.push({
            itemId: parseInt(match[1]),
            price: parseInt(match[2]),
            quantity: parseInt(match[3]),
            name: match[4],
        })
    }

    return items
}