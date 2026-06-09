export const Utility = {
    getSyncTimeLabel(date) {
        const hour = date.getHours()
        switch (true) {
            case hour >= 0 && hour < 6:
                return '🌙 "Se leggi questo forse è meglio che tu vada a letto sai?"'
            case hour >= 6 && hour < 12:
                return '🌅 Scan di mattina'
            case hour >= 12 && hour < 18:
                return '☀️ Scan di pomeriggio'
            default:
                return '🌆 Scan di sera'
        }
    }
}