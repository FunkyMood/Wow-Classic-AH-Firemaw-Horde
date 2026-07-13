import { parseAHDB } from './parseAHDB.js'
import axios from 'axios'
import 'dotenv/config'

const AHDB_PATH = process.env.AHDB_PATH
const RAILWAY_URL = 'https://wow-classic-ah-firemaw-horde.onrender.com/sync'

const items = parseAHDB(AHDB_PATH)

console.log('Sample item:', items.find(i => i.itemId === 12360))
try {
    await axios.post(RAILWAY_URL, {
        items,
        timestamp: Date.now()
    })
    console.log('Sync completato!')
} catch (err) {
    console.log('ERRORE sync:', err.message)
}