export const Utility = {
    getSyncTimeLabel(date) {
        const hour = date.getHours();
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const dayLabel = isToday ? '' : ` - ${date.getDate()} ${date.toLocaleString('it-IT', { month: 'short' })}`
        switch (true) {
            case hour >= 0 && hour < 6:
                return `🌙 "If you read this you have to go to bed and you know it" - ${dayLabel}`
            case hour >= 6 && hour < 12:
                return `🌅 Morning scan - ${dayLabel}`
            case hour >= 12 && hour < 18:
                return `☀️ Afternoon scan - ${dayLabel}`
            default:
                return `🌆 Evning scan - ${dayLabel}`
        }
    },
    copperToGold(copper) {
        const gold = Math.floor(copper / 10000)
        const silver = Math.floor((copper % 10000) / 100)
        const cop = copper % 100
        return `${gold}g ${silver}s ${cop}c`
    }
}