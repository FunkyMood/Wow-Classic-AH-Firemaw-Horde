import { parseAHDB } from './parseAHDB.js'
import axios from 'axios'

const AHDB_PATH = 'C:\\Program Files (x86)\\World of Warcraft\\_classic_era_\\WTF\\Account\\102363894#2\\SavedVariables\\AuctionDB.lua'
const RAILWAY_URL = 'https://wow-classic-ah-firemaw-horde.onrender.com/sync'

const items = parseAHDB(AHDB_PATH)


await axios.post(RAILWAY_URL, {
    items,
    timestamp: Date.now()
})

console.log('Sync completato!')