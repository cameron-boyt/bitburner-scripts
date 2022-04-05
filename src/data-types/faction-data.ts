
export enum FactionWorkType {
    Hacking,
    Security,
    Field,
    None
}

export function getFactionWorkTypeFromEnum(type : FactionWorkType) : string {
    switch (type) {
        case FactionWorkType.Hacking: return "Hacking";
        case FactionWorkType.Security: return "Security";
        case FactionWorkType.Field: return "Field";
        case FactionWorkType.None: return "None";
    }
}

export function getFactionWorkTypeFromString(type : string) : FactionWorkType {
    type = type.toLowerCase();
    switch (type) {
        case "hacking": return FactionWorkType.Hacking;
        case "security": return FactionWorkType.Security;
        case "field": return FactionWorkType.Field;
        default: throw new Error(`Unknown faction type string encountered: ${type}`);
    }
}

export const factionAvailableWorkTypes = [
    { faction: "Illuminati", types: [FactionWorkType.Hacking, FactionWorkType.Field] },
    { faction: "Daedalus", types: [FactionWorkType.Hacking, FactionWorkType.Field] },
    { faction: "The Covenant", types: [FactionWorkType.Hacking, FactionWorkType.Field] },
    { faction: "ECorp", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "MegaCorp", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Bachman & Associates", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "NWO", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Clarke Incorporated", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "OmniTek Incorporated", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Four Sigma", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "KuaiGong International", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Fulcrum Secret Technologies", types: [FactionWorkType.Hacking, FactionWorkType.Security] },
    { faction: "BitRunners", types: [FactionWorkType.Hacking] },
    { faction: "The Black Hand", types: [FactionWorkType.Hacking, FactionWorkType.Field] },
    { faction: "NiteSec", types: [FactionWorkType.Hacking] },
    { faction: "Aevum", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Chongqing", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Ishima", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "New Tokyo", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Sector-12", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Volhaven", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Speakers for the Dead", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "The Dark Army", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Silhouette", types: [FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Slum Snakes", types: [FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "CyberSec", types: [FactionWorkType.Hacking] },
    { faction: "Bladeburners", types: [FactionWorkType.None] },
    { faction: "Church of the Machine God", types: [FactionWorkType.None] },
    { faction: "Netburners", types: [FactionWorkType.Hacking] },
    { faction: "The Syndicate", types: [FactionWorkType.Hacking, FactionWorkType.Field, FactionWorkType.Security] },
    { faction: "Tian Di Hui", types: [FactionWorkType.Hacking, FactionWorkType.Security] }
];
