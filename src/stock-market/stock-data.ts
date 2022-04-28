/** Object type to store information about a given stock's current status */
export interface IStockHolding {
    sym: string;
    maxShares: number;
    longPos: {
        shares: number;
        price: number;
    };
    shortPos: {
        shares: number;
        price: number;
    };
    askPrice: number;
    bidPrice: number;
    timeToCoverSpread: number;
    priceHistory: number[];
    ticksHeld: number;
    forecast: {
        current: number;
        lastTick: number;
        abs: number;
        near: number;
        far: number;
    };
    possibleInversion: boolean;
    volatility: number;
    expectedReturn: number;
    absReturn: number;
}

/** Object type to store information about current stock states. */
export interface IStockData {
    stocks: Record<string, IStockHolding>;
    currentTick: number;
    refreshPeriod: number;
    lastUpdate: number;
}

/** Map of stock symbols to server hostnames */
export const symToHostname: Record<string, string> = {
    ECP: "ecorp",
    MGCP: "megacorp",
    BLD: "blade",
    CLRK: "clarkinc",
    OMTK: "omnitek",
    FSIG: "4sigma",
    KGI: "kuai-gong",
    DCOMM: "defcomm",
    VITA: "vitalife",
    ICRS: "icarus",
    UNV: "univ-energy",
    AERO: "aerocorp",
    SLRS: "solaris",
    GPH: "global-pharm",
    NVMD: "nova-med",
    LXO: "lexo-corp",
    RHOC: "rho-construction",
    APHE: "alpha-ent",
    SYSC: "syscore",
    CTK: "comptek",
    NTLK: "netlink",
    OMGA: "omega-net",
    JGN: "joesguns",
    SGC: "sigma-cosmetics",
    CTYS: "catalyst",
    MDYN: "microdyne",
    TITN: "titan-labs",
    FLCM: "fulcrumassets",
    STM: "stormtech",
    HLS: "helios",
    OMN: "omnia",
    FNS: "foodnstuff"
};

/** Map of stock symbols to company names */
export const symToCompany: Record<string, string> = {
    ECP: "ECorp",
    MGCP: "MegaCorp",
    BLD: "Blade Industries",
    CLRK: "Clarke Incorporated",
    OMTK: "OmniTek Incorporated",
    FSIG: "Four Sigma",
    KGI: "KuaiGong International",
    DCOMM: "DefComm",
    VITA: "VitaLife",
    ICRS: "Icarus Microsystems",
    UNV: "Universal Energy",
    AERO: "AeroCorp",
    SLRS: "Solaris Space Systems",
    GPH: "Global Pharmaceuticals",
    NVMD: "Nova Medical",
    LXO: "LexoCorp",
    RHOC: "Rho Construction",
    APHE: "Alpha Enterprises",
    SYSC: "SysCore Securities",
    CTK: "CompuTek",
    NTLK: "NetLink Technologies",
    OMGA: "Omega Software",
    JGN: "Joe's Guns",
    FLCM: "Fulcrum Technologies",
    STM: "Storm Technologies",
    HLS: "Helios Labs",
    OMN: "Omnia Cybersystems",
    FNS: "FoodNStuff"
};
