# WoW Classic AH Firemaw Horde Bot

Telegram bot to check Auction House prices on WoW Classic Era — Firemaw EU Horde, using real data from your local scan.

## Why a local scan?

Blizzard's Auction House API for Classic Era (`dynamic-classic1x-{region}`) has been broken since December 10, 2024, returning 404 on all AH endpoints.

As a result, one way to get real-time AH data is to scan the Auction House directly in-game using the **AHDB addon**, which saves the data locally. This bot reads that data and makes it available via Telegram.

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
| `/ping` | Check if the bot is online. |
| `/help` | Show available commands. |

**Examples:**
- `/price Arcanite Bar` — exact match, shows price directly
- `/price cloth` — partial match, shows a list of cloth items to choose from

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
AHDB_PATH=C:\Program Files (x86)\World of Warcraft_classic_era_\WTF\Account\YOURACCOUNT\SavedVariables\AuctionDB.lua

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

Make sure **Row Level Security (RLS)** is disabled on this table.

## Syncing data

After every AH scan with AHDB in-game:

1. Leave the AH — WoW saves the data automatically to `AuctionDB.lua`
2. Run the sync script:

```bash
node sync.js
```

Or use the `sync.bat` shortcut on your desktop (Windows only).

The script reads `AuctionDB.lua`, parses all auction data, and uploads it to Supabase via Render.

## Project structure

├── index.js        # Telegram bot + HTTP server for sync endpoint
├── sync.js         # Local script to parse and upload AH data
├── parseAHDB.js    # Parser for AuctionDB.lua file format
├── utilities.js    # Utility functions (copperToGold, getSyncTimeLabel)
├── sync.bat        # Windows shortcut for quick sync from desktop
└── .env            # Environment variables (never commit this file)

## Notes

- Prices reflect the state of the AH at the time of the last scan — more frequent scans mean more accurate data
- The bot runs on Render free tier, kept alive by UptimeRobot pinging it every 5 minutes
- Data persists on Supabase even after Render restarts or redeployments