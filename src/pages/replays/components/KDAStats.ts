
type KDAEvent = {
    att?: string;
    vic?: string;
    ass?: string;
}

type KDA = {
    kills: number
    deaths: number
    assists: number
}

// might get expanded or refactored in the future to cover a broader range of stats, just kda for now
export default function getKDA(events: KDAEvent[]) {
    const kda: Record<string, KDA> = {}

    //ensure player exists in map. if not, create 0/0/0 entry
    const ensure = (steamid: string) => {
        if (!kda[steamid]) {
            kda[steamid] = { kills: 0, deaths: 0, assists: 0 }
        }
        return kda[steamid]
    }

    //increment stats
    for (const e of events) {
        if (e.att) { // if there's an attacker, increment their kill count
            ensure(e.att.toString()).kills++
        }
        if (e.vic) { // if there's a victim, increment their death count
            ensure(e.vic.toString()).deaths++
        }
        if (e.ass) { // if there's an assister, increment their assist count
            ensure(e.ass.toString()).assists++
        }
    }
    return kda;
}

