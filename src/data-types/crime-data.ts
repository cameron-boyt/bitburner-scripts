export enum CrimeType {
    Money,
    Karma,
    Kills
}

export function getCrimeTypeFromEnum(type : CrimeType) : string {
    switch(type) {
        case CrimeType.Money: return "Money";
        case CrimeType.Karma: return "Karma";
        case CrimeType.Kills: return "Kills";
    }
}
