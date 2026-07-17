# WoW Classic AH Firemaw Horde Bot

Telegram bot to check Auction House prices on WoW Classic Era — Firemaw EU Horde, using real data from your local scan.

## Why a local scan?

Blizzard's Auction House API for Classic Era (`dynamic-classic1x-{region}`) has been broken since December 10, 2024, returning 404 on all AH endpoints.

As a result, the only way to get real-time AH data is to scan the Auction House directly in-game using the **AHDB addon**, which saves the data locally. This bot reads that data and makes it available via Telegram.

## How it works
AHDB addon (in-game) → AH scan → AuctionDB.lua (local file)

↓

sync.bat (local script)

↓

Render (hosting) → Supabase (database)

↓

Telegram Bot

## Commands

| Command | Description |
|---|---|
| `/price <item name>` | Search for an item's exact price. If no exact match is found, shows a clickable list of suggestions. |
| `/browse` | Browse items by category and level range. Shows top 5 most valuable items per selection. |
| `/alchemist <level>` | Best potions and elixirs for a given character level, split by role (melee/spellcaster). |
| `/sharegold <Xg Ys> <players>` | Split a gold amount between players, rounded down to the nearest silver. |
| `/ping` | Check if the bot is online. |
| `/help` | Show available commands. |

**Examples:**
- `/price Arcanite Bar` — exact match, shows price directly
- `/price cloth` — partial match, shows a list of cloth items to choose from
- `/browse` — select category → level range → top 5 most valuable items
- `/alchemist 40` — best consumables for a level 40 character
- `/sharegold 49g 27s 4` — split 49g 27s between 4 players

## Stack

| Tool | Purpose |
|---|---|
| Node.js | Runtime |
| node-telegram-bot-api | Telegram integration |
| Supabase | PostgreSQL database for data persistence |
| Render | Bot hosting |
| UptimeRobot | Keep-alive to prevent Render free tier from sleeping |
| AHDB (WoW addon) | In-game Auction House scanner |

## Local Setup

### Prerequisites

- Node.js installed
- WoW Classic Era with [AHDB addon](https://www.curseforge.com/wow/addons/auction-house-database) installed
- A Telegram bot token (via [@BotFather](https://t.me/botfather))
- A [Render](https://render.com) account
- A [Supabase](https://supabase.com) account

### Installation

```bash
git clone https://github.com/FunkyMood/Wow-Classic-AH-Firemaw-Horde.git
cd Wow-Classic-AH-Firemaw-Horde
npm install
```

### Environment variables

Create a `.env` file in the project root:
TELEGRAM_TOKEN=your_telegram_bot_token

SUPABASE_URL=https://xxxx.supabase.co

SUPABASE_KEY=your_supabase_secret_key

AHDB_PATH="C:\Program Files (x86)\World of Warcraft_classic_era_\WTF\Account\YOURACCOUNT\SavedVariables\AuctionDB.lua"

### Supabase setup

Create a table called `items` with the following columns:

| Column | Type |
|---|---|
| id | int8 (primary key) |
| item_id | int4 |
| name | text |
| price | int4 |
| quantity | int4 |
| last_sync | timestamptz |
| category | text |
| required_level | int4 |

Make sure **Row Level Security (RLS)** is disabled on this table.

## Syncing data

After every AH scan with AHDB in-game:

1. Leave the AH — WoW saves the data automatically to `AuctionDB.lua`
2. Run the sync script:

```bash
node src/sync.js
```

Or use the `sync.bat` shortcut on your desktop (Windows only).

The script reads `AuctionDB.lua`, parses all auction data, and uploads it to Supabase via Render.

## Project structure
├── src/
│   ├── index.js        # Telegram bot + HTTP server for sync endpoint
│   ├── command.js      # All bot command handlers
│   ├── sync.js         # Local script to parse and upload AH data
│   ├── parseAHDB.js    # Parser for AuctionDB.lua file format
│   └── utilities.js    # Utility functions (copperToGold)

├── data/
│   └── alchemy.json    # Static alchemy recipes database (potions, elixirs, flasks)

├── sync.bat        # Windows shortcut for quick sync from desktop

└── .env            # Environment variables (never commit this file)

## Utility Commands

### `/alchemist <level>`
Shows the best potions and elixirs for a given character level, split by role and category. Guardian Elixirs are prioritized for dungeon use: defense > HP regen > stamina.

**Example:**
/alchemist 40
**Output:**
⚗️ Best consumables for level 40:
⚔️ Battle Elixir (melee): Elixir of Greater Agility (lvl 38)

⚔️ Battle Elixir (spellcaster): Arcane Elixir (lvl 37)

🛡️ Guardian Elixir (melee): Elixir of Greater Defense (lvl 29)

🛡️ Guardian Elixir (spellcaster): Elixir of Greater Intellect (lvl 37)

❤️ Healing Potion: Superior Healing Potion (lvl 35)

💙 Mana Potion: Greater Mana Potion (lvl 31)

🔮 Flask (melee): none available

🔮 Flask (spellcaster): none available

### `/sharegold <Xg Ys> <players>`
Splits a gold amount between a number of players. Rounds down to the nearest silver — the remainder stays with the loot master.

**Example:**
/sharegold 49g 27s 4
**Output:**
💰 Split 49g 27s between 4 people:
👤 Each person gets: 12g 31s

🏦 Remainder: 0g 3s

## Notes

- Prices reflect the state of the AH at the time of the last scan — more frequent scans mean more accurate data
- The bot runs on Render free tier, kept alive by UptimeRobot pinging it every 5 minutes
- Data persists on Supabase even after Render restarts or redeployments
- The `/alchemist` command uses a static `alchemy.json` file — no database queries needed