export enum JobType {
    Operations = "Operations",
    Engineer = "Engineer",
    Business = "Business",
    Management = "Management",
    ResearchAndDevelopment = "Research & Development",
    Training = "Training",
    Unassigned = "Unassigned"
}

export interface ICorpUpgradeLimit {
    limit: number;
    costThreshold: number;
}

export enum IndustryType {
    Material,
    Product
}

export function getIndustryFromEnum(type: IndustryType): string {
    switch (type) {
        case IndustryType.Material:
            return "Material";
        case IndustryType.Product:
            return "Product";
    }
}

export interface IDivisionLimits {
    [key: number]: {
        officeLimit: number;
        warehouseLimit: number;
        adVertLimit: number;
    };
}

export interface IProduct {
    name: string;
    developmentProgress: number;
    successiveSellPriceIncreaseTicks: Record<string, number>;
}

export interface IDivision {
    name: string;
    industry: string;
    expenses: number;
    revenue: number;
    profit: number;
    popularity: number;
    awareness: number;
    prodMult: number;
    research: number;
    products: IProduct[];
}

export interface ICorpData {
    funds: number;
    isPublic: boolean;
    divisions: IDivision[];
    refreshPeriod: number;
    lastUpdate: number;
}
