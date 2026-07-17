export const Utility = {
    copperToGold(copper) {
        const gold = Math.floor(copper / 10000)
        const silver = Math.floor((copper % 10000) / 100)
        const cop = copper % 100
        return `${gold}g ${silver}s ${cop}c`
    }
}