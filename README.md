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