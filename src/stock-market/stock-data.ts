/** Object type to store information about a given stock's current status */
export interface IStockHolding {
    sym : string;
    maxShares : number;
    longPos : {
        shares : number;
        price : number;
    };
    shortPos : {
        shares : number;
        price : number;
    };
    askPrice : number;
    bidPrice : number;
    timeToCoverSpread : number;
    priceHistory : number[];
    ticksHeld : number;
    forecast : {
        current : number;
        lastTick : number;
        abs : number;
        near : number;
        far : number;
    };
    possibleInversion : boolean;
    volatility : number;
    expectedReturn : number;
    absReturn : number;
}

/** Object type to store information about current stock states. */
export interface IStockData {
    stocks : IStockHolding[];
    currentTick : number;
    refreshPeriod : number;
    lastUpdate : number;
}

export interface IStockHostname {
    sym : string;
    server : string;
}

/** Map of stock symbols to server hostnames */
export const symToHostname : IStockHostname[] = [
    { sym: "ECP", server: "ecorp" },
    { sym: "MGCP", server: "megacorp" },
    { sym: "BLD", server: "blade" },
    { sym: "CLRK", server: "clarkinc" },
    { sym: "OMTK", server: "omnitek" },
    { sym: "FSIG", server: "4sigma" },
    { sym: "KGI", server: "kuai-gong" },
    { sym: "DCOMM", server: "defcomm" },
    { sym: "VITA", server: "vitalife" },
    { sym: "ICRS", server: "icarus" },
    { sym: "UNV", server: "univ-energy" },
    { sym: "AERO", server: "aerocorp" },
    { sym: "SLRS", server: "solaris" },
    { sym: "GPH", server: "global-pharm" },
    { sym: "NVMD", server: "nova-med" },
    { sym: "LXO", server: "lexo-corp" },
    { sym: "RHOC", server: "rho-construction" },
    { sym: "APHE", server: "alpha-ent" },
    { sym: "SYSC", server: "syscore" },
    { sym: "CTK", server: "comptek" },
    { sym: "NTLK", server: "netlink" },
    { sym: "OMGA", server: "omega-net" },
    { sym: "JGN", server: "joesguns" },
    { sym: "SGC", server: "sigma-cosmetics" },
    { sym: "CTYS", server: "catalyst" },
    { sym: "MDYN", server: "microdyne" },
    { sym: "TITN", server: "titan-labs" },
    { sym: "FLCM", server: "fulcrumassets" },
    { sym: "STM", server: "stormtech" },
    { sym: "HLS", server: "helios" },
    { sym: "OMN", server: "omnia" },
    { sym: "FNS", server: "foodnstuff" }
];

export interface IStockCompany {
    sym : string;
    company : string;
}

/** Map of stock symbols to company names */
export const symToCompany : IStockCompany[] = [
    { sym: "ECP", company: "ECorp" },
    { sym: "MGCP", company: "MegaCorp" },
    { sym: "BLD", company: "Blade Industries" },
    { sym: "CLRK", company: "Clarke Incorporated" },
    { sym: "OMTK", company: "OmniTek Incorporated" },
    { sym: "FSIG", company: "Four Sigma" },
    { sym: "KGI", company: "KuaiGong International" },
    { sym: "DCOMM", company: "DefComm" },
    { sym: "VITA", company: "VitaLife" },
    { sym: "ICRS", company: "Icarus Microsystems" },
    { sym: "UNV", company: "Universal Energy" },
    { sym: "AERO", company: "AeroCorp" },
    { sym: "SLRS", company: "Solaris Space Systems" },
    { sym: "GPH", company: "Global Pharmaceuticals" },
    { sym: "NVMD", company: "Nova Medical" },
    { sym: "LXO", company: "LexoCorp" },
    { sym: "RHOC", company: "Rho Construction" },
    { sym: "APHE", company: "Alpha Enterprises" },
    { sym: "SYSC", company: "SysCore Securities" },
    { sym: "CTK", company: "CompuTek" },
    { sym: "NTLK", company: "NetLink Technologies" },
    { sym: "OMGA", company: "Omega Software" },
    { sym: "JGN", company: "Joe's Guns" },
    { sym: "FLCM", company: "Fulcrum Technologies" },
    { sym: "STM", company: "Storm Technologies" },
    { sym: "HLS", company: "Helios Labs" },
    { sym: "OMN", company: "Omnia Cybersystems" },
    { sym: "FNS", company: "FoodNStuff" }
];
