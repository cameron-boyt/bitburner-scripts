import { NS } from '@ns';
import { ICorpData, ICorpUnlock, ICorpUpgrade, IDivisionLimits, IndustryType, IProduct, IStorage, JobType } from '/data-types/corporation-data.js';
import { runDodgerScript } from '/helpers/dodger-helper';
import { CITIES, INDUSTRIES, PRODUCT_INDUSTRIES } from '/libraries/constants.js';
import { genPlayer, IPlayerObject } from '/libraries/player-factory.js';
import { PortNumber, purgePort, writeToPort } from '/libraries/port-handler.js';
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';

// Script logger
let logger : ScriptLogger;

// Args ???
let industries : string[] = [];

// Flags
const flagSchema : [string, string | number | boolean | string[]][] = [
	["h", false],
	["help", false],
    ["v", false],
    ["verbose", false],
    ["d", false],
    ["debug", false]
];

let help = false;
let verbose = false;
let debug = false;

// Set valid material and product industries

// This player and server objects
let player : IPlayerObject;
//let machine : IServerObject;

// Coporation research upgrades
const researchUpgrades = [
    "Hi-Tech R&D Laboratory",
    "Market-TA.I",
    "Market-TA.II",
    "uPgrade: Fulcrum",
    "uPgrade: Capacity.I",
    "Overclock",
    "Sti.mu",
    "JoyWire",
    "Automatic Drug Administration",
    "CPH4 Injections",
    "Go-Juice",
    "Self-Correcting Assemblers",
    "AutoBrew",
    "AutoPartyManager",
    "Bulk Purchasing",
    "Drones",
    "Drones - Assembly",
    "Drones - Transport",
    "HRBuddy-Recruitment",
    "HRBuddy-Training",
    "uPgrade: Dashboard",
];

// Corporation main upgrades
const corpUnlocks : ICorpUnlock[] = [
    { name: "Smart Supply", costThreshold: 1 },
    { name: "Export", costThreshold: 1000 },
    { name: "Market Data - Competition", costThreshold: 1000 },
    { name: "Market Research - Demand", costThreshold: 1000 },
    { name: "VeChain", costThreshold: 1000 },
    { name: "Shady Accounting", costThreshold: 4 },
    { name: "Government Partnership", costThreshold: 4 },
    { name: "Office API", costThreshold: 25 },
    { name: "Warehouse API", costThreshold: 25 }
];

let corpUpgrades : ICorpUpgrade[] = [];
let divisionLimits : IDivisionLimits = {};

// Investment offer acceptance thresholds
const investmentAcceptanceThresholds = [
    180e9,
    5e12,
    5e15,
    5e18
];

let hasOfficeAPI = false;
let hasWarehouseAPI = false;

// Set main production city for product industries
const mainProductionCity = "Aevum";

const corpData : ICorpData = {
    funds: 0,
    isPublic: false,
    divisions: [],
    refreshPeriod: 0,
    lastUpdate: 0
};

/*
 * ------------------------
 * > ENVIRONMENT SETUP FUNCTION
 * ------------------------
*/

/**
 * Set up the environment for this script.
 * @param ns NS object parameter.
 */
 function setupCorporationEnvironment(ns : NS) : void {
    corpData.funds = 0;
    corpData.divisions = [];
    corpData.lastUpdate = 0;

    if (tryFoundCorporation(ns)) {
        logger.log("Corporation found - continuing initialisation.", { type: MessageType.info });
    } else {
        logger.log("Unable to found coporation - terminating execution", { type: MessageType.fail });
        ns.exit();
    }

    processCheckForCorporationAPIs(ns);

    if (!hasOfficeAPI) logger.log("No access to Office API - functionality will be limited", { type: MessageType.warning });
    if (!hasWarehouseAPI) logger.log("No access to Warehouse API - functionality will be limited", { type: MessageType.warning });
}

/*
 * ------------------------
 * > CORPORATION API CHECKER FUNCTION
 * ------------------------
*/

/**
 * Check if the player has access to the corporation APIs.
 * @param ns NS object parameter.
 */
function processCheckForCorporationAPIs(ns : NS) : void {
    hasOfficeAPI = ns.corporation.hasUnlockUpgrade("Office API");
    hasWarehouseAPI = ns.corporation.hasUnlockUpgrade("Warehouse API");
}

/*
 * ------------------------
 * > CORP DATA UPDATE FUNCTION
 * ------------------------
*/

/**
 * Update the current coporation state and dump it into an object.
 * @param ns NS object parameter.
 */
async function updateCorpData(ns : NS) : Promise<void> {
    corpData.funds = ns.corporation.getCorporation().funds;

    const successTicks : { [key : string] : number } = {};
    CITIES.forEach(c => successTicks[c] = 0);

    for (const division of ns.corporation.getCorporation().divisions) {

        const dataDiv = corpData.divisions.find(x => x.name === division.name);
        if (dataDiv) {
            dataDiv.expenses = (division.thisCycleExpenses === 0) ? dataDiv.expenses : division.thisCycleExpenses;
            dataDiv.revenue = (division.thisCycleRevenue === 0) ? dataDiv.revenue : division.thisCycleRevenue;
            dataDiv.profit = dataDiv.revenue - dataDiv.expenses;
            dataDiv.popularity = division.popularity;
            dataDiv.awareness = division.awareness;
            dataDiv.prodMult = division.prodMult;
            dataDiv.research = division.research;

            const products : IProduct[] = [];
            for (const product of division.products) {
                const dataDivProduct = dataDiv.products.find(x => x.name === product);
                if (!dataDivProduct) {
                    const productInfo = ns.corporation.getProduct(division.name, product);
                    products.push({
                        name: product,
                        developmentProgress: productInfo.developmentProgress,
                        successiveSellPriceIncreaseTicks: successTicks
                    });
                } else {
                    const productInfo = ns.corporation.getProduct(division.name, product);
                    products.push({ name: productInfo.name, developmentProgress: productInfo.developmentProgress, successiveSellPriceIncreaseTicks: dataDivProduct.successiveSellPriceIncreaseTicks });
                }
            }

            dataDiv.products = products;
        } else {
            const products = [];

            for (const product of division.products) {
                const productInfo = ns.corporation.getProduct(division.name, product);

                const successTicks : { [key : string] : number } = {};
                CITIES.forEach(c => successTicks[c] = 0);

                products.push({
                    name: productInfo.name,
                    developmentProgress: productInfo.developmentProgress,
                    successiveSellPriceIncreaseTicks: successTicks
                });
            }

            corpData.divisions.push({
                name: division.name,
                industry: division.type,
                expenses: division.thisCycleExpenses,
                revenue: division.thisCycleRevenue,
                profit: division.thisCycleRevenue - division.thisCycleExpenses,
                popularity: division.popularity,
                awareness: division.awareness,
                prodMult: division.prodMult,
                research: division.research,
                products: products
            });
        }
    }

    corpData.isPublic = ns.corporation.getCorporation().public;

    corpData.lastUpdate = performance.now();

    purgePort(ns, PortNumber.CorpData);
    await writeToPort<ICorpData>(ns, PortNumber.CorpData, corpData);
}

/*
 * ------------------------
 * > FOUND CORPORATION FUNCTION
 * ------------------------
*/

/**
 * Try to found a new corporation.
 * @param ns NS object parameter.
 * @returns True if a corporation was founded, or if one already existed; false otherwise.
 */
function tryFoundCorporation(ns : NS) : boolean {
    if (player.hasCorp) {
        return true;
    } else if (player.bitnodeN === 3) {
        return ns.corporation.createCorporation("Corp Inc", false);
    } else if (player.money >= 150e9) {
        return ns.corporation.createCorporation("Corp Inc", true);
    } else {
        return false;
    }
}

/*
 * ------------------------
 * > CORPORATION LIFECYCLE STAGE SETTER FUNCTION
 * ------------------------
*/

/**
 * Set the current stage of the corporation based on which investment round we are on.
 * @param ns NS object parameter.
 */
function setCorporationStage(ns : NS) : void {
    switch (ns.corporation.getInvestmentOffer().round) {
        case 1: return setStageOneLimits();
        case 2: return setStageTwoLimits();
        case 3: return setStageThreeLimits();
        case 4: return setStageFourLimits();
        case 5: return setStageFiveLimits(ns);
    }
}

/*
 * ------------------------
 * > SET STAGE LIMIT FUNCTIONS
 * ------------------------
*/

/**
 * Set the upgrade limits for a stage 1 corporation.
 */
function setStageOneLimits() : void {
    corpUpgrades = [
        { name: "FocusWires", limit: 2, costThreshold: 1 },
        { name: "Neural Accelerators", limit: 2, costThreshold: 1 },
        { name: "Speech Processor Implants", limit: 2, costThreshold: 1 },
        { name: "Nuoptimal Nootropic Injector Implants", limit: 2, costThreshold: 1 },
        { name: "Smart Factories", limit: 2, costThreshold: 1 },
        { name: "Wilson Analytics", limit: 0, costThreshold: 1 }
    ];

    divisionLimits = {};
    divisionLimits[IndustryType.Material] = { warehouseLimit: 300, officeLimit: 3, adVertLimit: 1 };
    divisionLimits[IndustryType.Product] = { warehouseLimit: 0, officeLimit: 0, adVertLimit: 0 };
}

/**
 * Set the upgrade limits for a stage 2 corporation.
 */
function setStageTwoLimits() : void {
    corpUpgrades = [
        { name: "FocusWires", limit: 2, costThreshold: 1 },
        { name: "Neural Accelerators", limit: 2, costThreshold: 1 },
        { name: "Speech Processor Implants", limit: 2, costThreshold: 1 },
        { name: "Nuoptimal Nootropic Injector Implants", limit: 2, costThreshold: 1 },
        { name: "Smart Factories", limit: 10, costThreshold: 1 },
        { name: "Smart Storage", limit: 10, costThreshold: 1 },
        { name: "DreamSense", limit: 1, costThreshold: 1 },
        { name: "Wilson Analytics", limit: 0, costThreshold: 1 }
    ];

    divisionLimits = {};
    divisionLimits[IndustryType.Material] = { warehouseLimit: 2000, officeLimit: 9, adVertLimit: 1 };
    divisionLimits[IndustryType.Product] = { warehouseLimit: 2000, officeLimit: 9, adVertLimit: 1 };
}

/**
 * Set the upgrade limits for a stage 3 corporation.
 */
function setStageThreeLimits() : void {
    corpUpgrades = [
        { name: "FocusWires", limit: 30, costThreshold: 1 },
        { name: "Neural Accelerators", limit: 30, costThreshold: 1 },
        { name: "Speech Processor Implants", limit: 30, costThreshold: 1 },
        { name: "Nuoptimal Nootropic Injector Implants", limit: 30, costThreshold: 1 },
        { name: "Smart Factories", limit: 10, costThreshold: 1 },
        { name: "Smart Storage", limit: 30, costThreshold: 1 },
        { name: "DreamSense", limit: 10, costThreshold: 1 },
        { name: "Project Insight", limit: 20, costThreshold: 1 },
        { name: "ABC SalesBots", limit: 30, costThreshold: 1 },
        { name: "Wilson Analytics", limit: Infinity, costThreshold: 1 }
    ];

    divisionLimits = {};
    divisionLimits[IndustryType.Material] = { warehouseLimit: 2000, officeLimit: 9, adVertLimit: 10 };
    divisionLimits[IndustryType.Product] = { warehouseLimit: 5000, officeLimit: 90,  adVertLimit: Infinity };
}

/**
 * Set the upgrade limits for a stage 4 corporation.
 */
function setStageFourLimits() : void {
    corpUpgrades = [
        { name: "FocusWires", limit: 100, costThreshold: 1000 },
        { name: "Neural Accelerators", limit: 100, costThreshold: 1000 },
        { name: "Speech Processor Implants", limit: 100, costThreshold: 1000 },
        { name: "Nuoptimal Nootropic Injector Implants", limit: 100, costThreshold: 1000 },
        { name: "Smart Factories", limit: 100, costThreshold: 1000  },
        { name: "Smart Storage", limit: 100, costThreshold: 25 },
        { name: "DreamSense", limit: 10, costThreshold: 1 },
        { name: "Project Insight", limit: 100, costThreshold: 1000  },
        { name: "ABC SalesBots", limit: 100, costThreshold: 1000  },
        { name: "Wilson Analytics", limit: Infinity, costThreshold: 1 }
    ];

    divisionLimits = {};
    divisionLimits[IndustryType.Material] = { warehouseLimit: 5000, officeLimit: 18, adVertLimit: 10 };
    divisionLimits[IndustryType.Product] = { warehouseLimit: 10000, officeLimit: 240,  adVertLimit: Infinity };
}

/**
 * Set the upgrade limits for a stage 5 corporation.
 */
function setStageFiveLimits(ns : NS) : void {
    corpUpgrades = [
        { name: "FocusWires", limit: Infinity, costThreshold: 1000 },
        { name: "Neural Accelerators", limit: Infinity, costThreshold: 1000 },
        { name: "Speech Processor Implants", limit: Infinity, costThreshold: 1000 },
        { name: "Nuoptimal Nootropic Injector Implants", limit: Infinity, costThreshold: 1000 },
        { name: "Smart Factories", limit: Infinity, costThreshold: 1000  },
        { name: "Smart Storage", limit: 250, costThreshold: 25 },
        { name: "DreamSense", limit: 10, costThreshold: 1 },
        { name: "Project Insight", limit: Infinity, costThreshold: 1000  },
        { name: "ABC SalesBots", limit: Infinity, costThreshold: 1000  },
        { name: "Wilson Analytics", limit: Infinity, costThreshold: 1 }
    ];

    divisionLimits = {};
    divisionLimits[IndustryType.Material] = { warehouseLimit: 10000, officeLimit: 18, adVertLimit: 10 };
    divisionLimits[IndustryType.Product] = { warehouseLimit: 10000, officeLimit: 300,  adVertLimit: Infinity };

    if (!ns.corporation.getCorporation().public) {
        ns.corporation.goPublic(0)
    }

    ns.corporation.issueDividends(0.5);
}

/*
 * ------------------------
 * > INDUSTRY TYPE GETTER FUCTION
 * ------------------------
*/

/**
 * Get the type of industry for the name provided.
 * @param industry Name of industry.
 * @returns Type of industry (product/material).
 */
function getIndustryType(industry : string) : IndustryType {
    if (PRODUCT_INDUSTRIES.includes(industry)) {
        return IndustryType.Product;
    } else {
        return IndustryType.Material;
    }
}

/*
 * ------------------------
 * > GET DIVISION FROM INDUSTRY / INDUSTRY FROM DIVISION FUNCTIONS
 * ------------------------
*/

/**
 * Get the name of the division for the given industry type.
 * @param ns NS object parameter.
 * @param industry Name of industry.
 * @returns Name of the division for this industry,
 */
function getDivisionNameOfIndustry(ns : NS, industry : string) : string {
    const divisionName = ns.corporation.getCorporation().divisions.find(x => x.type === industry)?.name;
    if (!divisionName) {
        logger.log(`Unable to find division for industry ${industry}`, { type: MessageType.error });
        throw new Error(`Unable to find division for industry ${industry}`);
    } else {
        return divisionName;
    }
}

/**
 * Get the name of the industry type for the given division.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @returns Name of the industry type for this division name,
 */
function getIndustryFromDivisionName(ns : NS, division : string) : string {
    return ns.corporation.getDivision(division).type;
}

/*
 * ------------------------
 * > DIVISION LIMIT GETTER FUNCTIONS
 * ------------------------
*/

/**
 * Get the set warehouse capacity limit for the given industry.
 * @param industry Name of industry.
 * @returns Warehouse capacity limit.
 */
function getWarehouseLimit(industry : string) : number {
    return divisionLimits[getIndustryType(industry)].warehouseLimit;
}

/**
 * Get the set office size limit for the given industry.
 * @param industry Name of industry.
 * @returns Office size limit.
 */
function getOfficeLimit(industry : string) : number {
    return divisionLimits[getIndustryType(industry)].officeLimit;
}

/**
 * Get the set AdVert level limit for this industry.
 * @param industry Name of industry.
 * @returns AdVert level limit.
 */
function getAdVertLimit(industry : string) : number {
    return divisionLimits[getIndustryType(industry)].adVertLimit;
}

/*
 * ------------------------
 * > EXPANSION TEST FUNCTIONS
 * ------------------------
*/

/**
 * Test if the corporation has already expanded to the specified industry.
 * @param ns NS object parameter.
 * @param industry Name of the industry to expand to.
 * @returns True if expansion has already been done; false otherwise.
 */
function hasExpandedToIndustry(ns : NS, industry : string) : boolean {
    const division = ns.corporation.getCorporation().divisions.find(x => x.type === industry);
    return division !== undefined;
}

/**
 * Test if a division has already expanded to a given city.
 * @param ns NS object parameter.
 * @param division Name of a division.
 * @param city Name of a city.
 * @returns True if expansion has already been done; false otherwise.
 */
function hasExpandedDivisionToCity(ns : NS, division : string, city : string) : boolean {
    return ns.corporation.getDivision(division).cities.includes(city);
}

/**
 * Test if a division has an office in a given city.
 * @param ns NS object parameter.
 * @param division Name of a division.
 * @param city Name of a city.
 * @returns True if an office exists; false otherwise.
 */
function hasOfficeForDivisionInCity(ns : NS, division : string, city : string) : boolean {
    const office = ns.corporation.getOffice(division, city);
    return office !== undefined;
}

/**
 * Test if a division has an office in a given city.
 * @param ns NS object parameter.
 * @param division Name of a division.
 * @param city Name of a city.
 * @returns True if a warehouse exists; false otherwise.
 */
function hasWarehouseForDivisionInCity(ns : NS, division : string, city : string) : boolean {
    return ns.corporation.hasWarehouse(division, city);
}

/*
 * ------------------------
 * > INVESTMENT OFFER PROCESSING FUNCTION
 * ------------------------
*/

/**
 * Process the next available investment offer and whether or not it should be taken.
 * @param ns NS object parameter.
 */
function processInvestmentOffers(ns : NS) : void {
    const offer = ns.corporation.getInvestmentOffer();
    if (offer.funds > investmentAcceptanceThresholds[offer.round - 1]) {
        ns.corporation.acceptInvestmentOffer();
        logger.log(`Accepted investment offer for ${ns.nFormat(offer.funds, '$0.00a')}`, { type: MessageType.success });
    }
}

/*
 * ------------------------
 * > CORPORATION STAGE PROCESSING FUNCTION
 * ------------------------
*/

/**
 * Process the current corporation stage.
 * @param ns NS object parameter.
 */
function processCorporationStage(ns : NS) : void {
    ns.print("hello??");
    setCorporationStage(ns);
}

/*
 * ------------------------
 * > INDUSTRY EXPANSION FUNCTIONS
 * ------------------------
*/

/**
 * Process attempting to expand to another industry.
 * @param ns NS object parameter.
 */
function processIndustryExpansions(ns : NS) : void {
    industries.filter(x => !hasExpandedToIndustry(ns, x)).forEach((industry) => {
        logger.log(`Trying to expand to industry ${industry}`, { type: MessageType.debugHigh });
        tryExpandToIndustry(ns, industry);
    });
}

/**
 * Try to expand to the specified industry.
 * @param ns NS object parameter.
 * @param industry Name of industry.
 */
function tryExpandToIndustry(ns : NS, industry : string) : void {
    if (canExpandToIndustry(ns, industry)) {
        logger.log(`Able to expand to industry ${industry}`, { type: MessageType.debugLow });
        doExpandToIndustry(ns, industry)
    } else {
        logger.log(`Unable to expand to industry ${industry}`, { type: MessageType.debugLow });
    }
}

/**
 * Test if the corporation can expand to the provided industry.
 * @param ns NS object parameter.
 * @param industry Name of industry.
 * @returns True if expansion is possible; false otherwise.
 */
function canExpandToIndustry(ns : NS, industry : string) : boolean {
    if (ns.corporation.getCorporation().divisions.length === 0) {
        logger.log(`This will be the corporation first industry - allow expansion`, { type: MessageType.debugHigh });
        return true;
    }

    if (!canAffordIndustryExpansion(ns, industry)) {
        logger.log(`Corporation is unable to afford expansion - deny expansion`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Test if the corporation can afford expanding to the specified industry.
 * @param ns NS object parameter.
 * @param industry Name of industry.
 * @returns True if expansion is affordable; false otherwise.
 */
function canAffordIndustryExpansion(ns : NS, industry : string) : boolean {
    return ns.corporation.getCorporation().funds >= ns.corporation.getExpandIndustryCost(industry) * 10;
}

/**
 * Perform the industry expansion.
 * @param ns NS object parameter.
 * @param industry Name of industry.
 */
function doExpandToIndustry(ns : NS, industry : string) : void {
    ns.corporation.expandIndustry(industry, industry);

    if (hasExpandedToIndustry(ns, industry)) {
        logger.log(`Succesfully expanded to industry ${industry}`, { type: MessageType.success });
    } else {
        logger.log(`Failed to expand to industry ${industry}`, { type: MessageType.fail });
    }
}

/*
 * ------------------------
 * > CITY EXPANSION PROCESSING FUNCTIONS
 * ------------------------
*/

/**
 * Process attempting to expand industries to cities.
 * @param ns NS object parameter.
 */
function processCityExpansions(ns : NS) : void {
    industries.filter(x => hasExpandedToIndustry(ns, x)).forEach((industry) => {
        const division = getDivisionNameOfIndustry(ns, industry);
        processCityExpansionsForDivision(ns, division);
    });
}

/**
 * Process attempting to expand a division to another city.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
function processCityExpansionsForDivision(ns : NS, division : string) : void {
    CITIES.filter(x => !hasExpandedDivisionToCity(ns, division, x)).forEach((city) => {
        logger.log(`Trying to expand ${division} to ${city}`, { type: MessageType.debugHigh });
        tryExpandDivisionToCity(ns, division, city);
    });
}

/**
 * Try to expand the specified division to the specified city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
function tryExpandDivisionToCity(ns : NS, division : string, city : string) : void {
    if (canExpandDivisionToCity(ns, division, city)) {
        doExpandDivisionToCity(ns, division, city);
    } else {
        logger.log(`Unable to expand division ${division} to ${city}`, { type: MessageType.debugHigh });
    }
}

/**
 * Test if a given division can expand to a given city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @returns True if expansion is possible; false otherwise.
 */
function canExpandDivisionToCity(ns : NS, division : string, city : string) : boolean {
    if (hasExpandedDivisionToCity(ns, division, city)) {
        logger.log(`${division} has already expanded to ${city} - deny expansion`, { type: MessageType.debugHigh });
        return false;
    }

    if (!canAffordCityExpansion(ns)) {
        logger.log(`Corporation is unable to afford expansion - deny expansion`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Test if the corporation can afford a city expansion.
 * @param ns NS object parameter.
 * @returns True if the expansion is affordable; false otherwise.
 */
function canAffordCityExpansion(ns : NS) : boolean {
    return ns.corporation.getCorporation().funds >= ns.corporation.getExpandCityCost();
}

/**
 * Perform the city expansion.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
function doExpandDivisionToCity(ns : NS, division : string, city : string) : void {
    ns.corporation.expandCity(division, city);

    if (hasExpandedDivisionToCity(ns, division, city)) {
        logger.log(`Succesfully expanded division ${division} to ${city}`, { type: MessageType.success });
    } else {
        logger.log(`Failed to expand division ${division} to ${city}`, { type: MessageType.fail });
    }
}

/*
 * ------------------------
 * > WAREHOUSE UPGRADE PROCESSING FUNCTIONS
 * ------------------------
*/

/**
 * Process attempting to upgrade warehouses in cities.
 * @param ns NS object parameter.
 */
function processWarehouseUpgrades(ns : NS) : void {
    if (!hasWarehouseAPI) return;
    industries.filter(x => hasExpandedToIndustry(ns, x)).forEach((industry) => {
        const division = getDivisionNameOfIndustry(ns, industry);
        processWarehouseUpgradesForDivision(ns, division)
    });
}

/**
 * Process attempting to purchase warehouse upgrades in a given division for cities.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
function processWarehouseUpgradesForDivision(ns : NS, division : string) : void {
    CITIES.filter(x => hasExpandedDivisionToCity(ns, division, x)).forEach((city) => {
        logger.log(`Trying to purchase warehouse upgrades for ${division} in ${city}`, { type: MessageType.debugHigh });
        processWarehouseUpgradesInCityForDivision(ns, division, city);
    });
}

/**
 * Process attempting to purchase warehouse upgrades in a division for a given city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
function processWarehouseUpgradesInCityForDivision(ns : NS, division : string, city : string) : void {
    if (!hasWarehouseForDivisionInCity(ns, division, city)) {
        logger.log(`${division} has no warehouse in ${city}`, { type: MessageType.debugHigh });
        const warehousePurchased = tryPurchaseWarehouseInCity(ns, division, city);
        if (!warehousePurchased) return;
    }

    doWarehouseUpgradeForDivisionInCity(ns, division, city);
}

/**
 * Try to expand the specified division to the specified city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
function tryPurchaseWarehouseInCity(ns : NS, division : string, city : string) : boolean {
    if (canPurchaseWarehouseInCity(ns, division, city)) {
        doPurchaseWarehouseInCity(ns, division, city);
        return true;
    } else {
        logger.log(`Unable to purchase warehouse in ${division} > ${city}`, { type: MessageType.debugLow });
        return false;
    }
}

/**
 * Test if a given division can purchase a warehouse in a given city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @returns True if purchase is possible; false otherwise.
 */
function canPurchaseWarehouseInCity(ns : NS, division : string, city : string) : boolean {
    if (hasWarehouseForDivisionInCity(ns, division, city)) {
        logger.log(`${division} already has a warehouse in ${city} - deny expansion`, { type: MessageType.debugHigh });
        return false;
    }

    if (!canAffordWarehouse(ns)) {
        logger.log(`Corporation is unable to afford warehouse - deny expansion`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Test if the corporation can afford a warehouse.
 * @param ns NS object parameter.
 * @returns True if the warehouse is affordable; false otherwise.
 */
function canAffordWarehouse(ns : NS) : boolean {
    return ns.corporation.getCorporation().funds >= ns.corporation.getPurchaseWarehouseCost();
}

/**
 * Perform the warehouse purchase.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
function doPurchaseWarehouseInCity(ns : NS, division : string, city : string) : void {
    ns.corporation.purchaseWarehouse(division, city);

    if (hasWarehouseForDivisionInCity(ns, division, city)) {
        logger.log(`Succesfully purchased warehouse in ${division} > ${city}`, { type: MessageType.success });
    } else {
        logger.log(`Failed to purchase warehouse in ${division} > ${city}`, { type: MessageType.fail });
    }
}

/**
 * Perform the warehouse upgrades.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
function doWarehouseUpgradeForDivisionInCity(ns : NS, division : string, city : string) : void {
    if (canUpgradeWarehouseSize(ns, division, city)) {
        ns.corporation.upgradeWarehouse(division, city);
        const warehouse = ns.corporation.getWarehouse(division, city);
        logger.log(`Upgraded ${division} warehouse in ${city} to size ${warehouse.size}`, { type: MessageType.success });
    }
}

/**
 * Test if a given division can upgrade a warehouse in a given city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @returns True if upgrade is possible; false otherwise.
 */
function canUpgradeWarehouseSize(ns : NS, division : string, city : string) : boolean {
    if (atWarehouseSizeLimit(ns, division, city)) {
        logger.log(`Warehouse in ${division} > ${city} is already at capacity limit - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    if (!canAffordWarehouseSizeUpgrade(ns, division, city)) {
        logger.log(`Corporation is unable to afford warehouse upgrade - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Test if a warehouse in a given city and division is at the capacity limit.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @returns True if the warehouse is at the capacity limit; false otherwise.
 */
function atWarehouseSizeLimit(ns : NS, division : string, city : string) : boolean {
    const warehouse = ns.corporation.getWarehouse(division, city);
    const industry = getIndustryFromDivisionName(ns, division);
    const limit = getWarehouseLimit(industry);
    return warehouse.size >= limit;
}

/**
 * Test if the corporation can afford a warehouse upgrade.
 * @param ns NS object parameter.
 * @returns True if the upgrade is affordable; false otherwise.
 */
function canAffordWarehouseSizeUpgrade(ns : NS, division : string, city : string) : boolean {
    return ns.corporation.getCorporation().funds >= ns.corporation.getUpgradeWarehouseCost(division, city) * 10;
}

/*
 * ------------------------
 * > CORPORATION UPGRADE PROCESSING FUNCTIONS
 * ------------------------
*/

/**
 * Process attempting to purchasing corporation upgrades and unlocks.
 * @param ns NS object parameter.
 */
function processCorporationUpgradesAndUnlocks(ns : NS) : void {
    processCorporationUnlocks(ns);
    processCorporationUpgrades(ns);
}

/**
 * Process attempting to purchasing corporation unlocks.
 * @param ns NS object parameter.
 */
function processCorporationUnlocks(ns : NS) : void {
    corpUnlocks.filter(x => canGetCorporationUnlock(ns, x)).forEach((unlock) => {
        ns.corporation.unlockUpgrade(unlock.name);
        logger.log(`Unlocked: ${unlock.name}`, { type: MessageType.success, sendToast: true });
    });
}

/**
 * Test if the corporation can purchase a given unlock.
 * @param ns NS object parameter.
 * @param unlock Corporation unlock object.
 * @returns True if unlock can be gotten; false otherwise.
 */
function canGetCorporationUnlock(ns : NS, unlock : ICorpUnlock) : boolean {
    if (ns.corporation.hasUnlockUpgrade(unlock.name)) {
        logger.log(`Corporation already has unlock ${unlock.name} - deny unlock`, { type: MessageType.debugHigh });
        return false;
    }

    if (!canAffordUnlock(ns, unlock)) {
        logger.log(`Corporation is unable to afford unlock - deny unlock`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Test if the corporation can afford an unlock.
 * @param ns NS object parameter.
 * @param unlock Corporation unlock object.
 * @returns True if the unlock is affordable; false otherwise.
 */
function canAffordUnlock(ns : NS, unlock : ICorpUnlock) : boolean {
    return ns.corporation.getCorporation().funds > ns.corporation.getUnlockUpgradeCost(unlock.name) * unlock.costThreshold;
}

/**
 * Process attempting to purchasing corporation upgrades.
 * @param ns NS object parameter.
 */
function processCorporationUpgrades(ns : NS) : void {
    let upgradePurchased = false;

    do {
        upgradePurchased = false;
        corpUpgrades.filter(x => canGetCorporationUpgrade(ns, x)).forEach(upgrade => {
            const upgradeLevel = ns.corporation.getUpgradeLevel(upgrade.name);
            ns.corporation.levelUpgrade(upgrade.name);
            upgradePurchased = true;
            logger.log(`Leveled upgrade: ${upgrade.name} (${upgradeLevel} --> ${upgradeLevel + 1})`, { type: MessageType.info });
        });
    } while (upgradePurchased);
}

/**
 * Test if the corporation can purchase a given upgrade.
 * @param ns NS object parameter.
 * @param upgrade Corporation upgrade object.
 * @returns True if upgrade can be gotten; false otherwise.
 */
function canGetCorporationUpgrade(ns : NS, upgrade : ICorpUpgrade) : boolean {
    if (upgrade.name === "Wilson Analytics") {
        return false;
    }

    const upgradeLevel = ns.corporation.getUpgradeLevel(upgrade.name);
    if (upgradeLevel >= upgrade.limit ) {
        logger.log(`Corporation at upgrade level limit - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    if (!canAffordUpgrade(ns, upgrade)) {
        logger.log(`Corporation is unable to afford upgrade - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Test if the corporation can afford an upgrade.
 * @param ns NS object parameter.
 * @param upgrade Corporation upgrade object.
 * @returns True if the upgrade is affordable; false otherwise.
 */
function canAffordUpgrade(ns : NS, upgrade : ICorpUpgrade) : boolean {
    return ns.corporation.getCorporation().funds > ns.corporation.getUpgradeLevelCost(upgrade.name) * upgrade.costThreshold;
}

/*
 * ------------------------
 * > DIVISION RESEARCH UPGRADE PROCESSING FUNCTIONS
 * ------------------------
*/

/*

function processResearchUpgrades(ns : NS) : void {
    industries.forEach(i => {
        if (hasExpandedToIndustry(ns, i)) {
            processResearchForIndustry(ns, i);
        }
    });
}

function processResearchForIndustry(ns : NS, industry : string) : void {
    logger.log(`Trying to unlock research for industry ${industry}`, { type: MessageType.debugHigh });
    const divisionName = ns.corporation.getCorporation().divisions.find(x => x.type === industry)?.name;
    if (!divisionName) {
        logger.log(`Unable to find division for industry ${industry} - fatal error`, { type: MessageType.error });
        return;
    }
    processResearchForDivision(ns, divisionName);
}

function processResearchForDivision(ns : NS, division : string) : void {
    for (const research of researchUpgrades) {
        if (hasResearchedUpgrade(ns, division, research)) {
            continue;
        } else if (canUnlockResearch(ns, division, research)) {
            ns.corporation.research(division, research);
            logger.log(`Researched ${research} in ${division}`, { type: MessageType.success });
        }

        // break as we want to buy the research in order
        break;
    }
}

function canUnlockResearch(ns : NS, division : string, research : string) : boolean {
    return !hasResearchedUpgrade(ns, division, research) && canAffordResearch(ns, division, research);
}

function hasResearchedUpgrade(ns : NS, division : string, research : string) : boolean {
    return ns.corporation.hasResearched(division, research);
}

function canAffordResearch(ns : NS, division : string, research : string) : boolean {
    return ns.corporation.getDivision(division).research >= 2 * ns.corporation.getResearchCost(division, research);
}

*/

/*
 * ------------------------
 * > OFFICE UPGRADE PROCESSING FUNCTIONS
 * ------------------------
*/

/**
 * Process attempting to upgrade warehouses in cities.
 * @param ns NS object parameter.
 */
function processOfficeUpgrades(ns : NS) : void {
    if (!hasOfficeAPI) return;
    industries.filter(x => hasExpandedToIndustry(ns, x)).forEach((industry) => {
        const division = getDivisionNameOfIndustry(ns, industry);
        processOfficeUpgradesForDivision(ns, division)
    });
}

/**
 * Process attempting to purchase office upgrades in a given division for cities.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
function processOfficeUpgradesForDivision(ns : NS, division : string) : void {
    CITIES.filter(x => hasExpandedDivisionToCity(ns, division, x)).forEach((city) => {
        logger.log(`Trying to purchase office upgrades for ${division} in ${city}`, { type: MessageType.debugHigh });
        processOfficeUpgradesInCityForDivision(ns, division, city);
    });
}

/**
 * Process attempting to purchase office upgrades in a division for a given city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
function processOfficeUpgradesInCityForDivision(ns : NS, division : string, city : string) : void {
    if (!hasOfficeForDivisionInCity(ns, division, city)) {
        logger.log(`${division} has no office in ${city}`, { type: MessageType.debugHigh });
        return;
    }

    doUpgradeOfficeInCityForDivision(ns, division, city);
}

/**
 * Perform the office upgrades.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
function doUpgradeOfficeInCityForDivision(ns : NS, division : string, city : string) : void {
    if (canUpgradeOfficeSize(ns, division, city)) {
        ns.corporation.upgradeOfficeSize(division, city, 3);
        const office = ns.corporation.getOffice(division, city);
        logger.log(`Upgraded ${division} office in ${city} to size ${office.size}`, { type: MessageType.success });
    }
}

/**
 * Test if a given division can upgrade an office in a given city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @returns True if upgrade is possible; false otherwise.
 */
function canUpgradeOfficeSize(ns : NS, division : string, city : string) : boolean {
    if (atOfficeSizeLimit(ns, division, city)) {
        logger.log(`Office in ${division} > ${city} is already at capacity limit - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    if (!canAffordOfficeSizeUpgrade(ns, division, city, 3)) {
        logger.log(`Corporation is unable to afford office upgrade - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Test if an office in a given city and division is at the capacity limit.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @returns True if the office is at the capacity limit; false otherwise.
 */
function atOfficeSizeLimit(ns : NS, division : string, city : string) : boolean {
    const office = ns.corporation.getOffice(division, city);
    const industry = getIndustryFromDivisionName(ns, division);
    const limit = (city === mainProductionCity && getIndustryType(industry) === IndustryType.Product) ? getOfficeLimit(industry) + 60 : getOfficeLimit(industry);
    return office.size >= limit;
}

/**
 * Test if the corporation can afford an office upgrade.
 * @param ns NS object parameter.
 * @returns True if the upgrade is affordable; false otherwise.
 */
function canAffordOfficeSizeUpgrade(ns : NS, division : string, city : string, size : number) : boolean {
    return ns.corporation.getCorporation().funds >= ns.corporation.getOfficeSizeUpgradeCost(division, city, size);
}

/*
 * ------------------------
 * > EMPLOYEE HIRING PROCESSING FUNCTIONS
 * ------------------------
*/

/**
 * Process attempting to hire employees for divisions in cities.
 * @param ns NS object parameter.
 */
async function processHireEmployees(ns : NS) : Promise<void> {
    if (!hasOfficeAPI) return;
    for (const industry of industries.filter(x => hasExpandedToIndustry(ns, x))) {
        const division = getDivisionNameOfIndustry(ns, industry);
        await processHireEmployeesForDivision(ns, division);
    }
}

/**
 * Process attempting to hire employees in a given division for cities.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
async function processHireEmployeesForDivision(ns : NS, division : string) : Promise<void> {
    for (const city of CITIES.filter(x => hasExpandedDivisionToCity(ns, division, x))) {
        logger.log(`Trying to hire employees for ${division} in ${city}`, { type: MessageType.debugHigh });
        await processHireEmployeesForDivisionInCity(ns, division, city);
    }
}

/**
 * Process hiring and assigning jobs to employees for a given division and city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
async function processHireEmployeesForDivisionInCity(ns : NS, division : string, city : string) : Promise<void> {
    doHireMaxEmployees(ns, division, city);
    await doAssignEmployeeJobs(ns, division, city);
}

/**
 * Hire the maximum amount of employees for a given division and city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
function doHireMaxEmployees(ns : NS, division : string, city : string) : void {
    let employeesHired = 0;
    while (canHireEmployee(ns, division, city)) {
        ns.corporation.hireEmployee(division, city);
        employeesHired += 1;
    }

    if (employeesHired > 0) {
        logger.log(`Hired ${employeesHired} employees for ${division} in ${city}`, { type: MessageType.info });
    }
}

/**
 * Test if it is possble to hire an employee for a given division and city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @returns True if hiring is possible; false otherwise.
 */
function canHireEmployee(ns : NS, division : string, city : string) : boolean {
    const office = ns.corporation.getOffice(division, city);
    return office.employees.length < office.size
}

/**
 * Assign employees to job roles based on whether the specified division and city is the main production site.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
async function doAssignEmployeeJobs(ns : NS, division : string, city : string) : Promise<void> {
    if (isProductionIndustryAndInMainCity(ns, division, city)) {
        await doAssignEmployeeJobsForDivisionInCity(ns, division, city, [0,   0.5, 0.25, 0.25, 0,   0]);
    } else {
        await doAssignEmployeeJobsForDivisionInCity(ns, division, city, [0.2, 0.2, 0.2,  0.2,  0.2, 0]);
    }
}


/**
 * Test if the provided division is a product-based industry and the city is the main production city.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @returns True if product industry and city is the main production city; false otherwise.
 */
function isProductionIndustryAndInMainCity(ns : NS, division : string, city : string) : boolean {
    const industry = getIndustryFromDivisionName(ns, division);
    const type = getIndustryType(industry);
    return type === IndustryType.Product && city === mainProductionCity;
}

async function doAssignEmployeeJobsForDivisionInCity(ns : NS, division : string, city : string, employeeRatio : number[]) : Promise<void> {
    if (employeeRatio.reduce((a, b) => (a + b), 0) !== 1) {
        logger.log(`Total ratio does not equal 1: ${employeeRatio}`, { type: MessageType.error });
        return;
    }

    const office = ns.corporation.getOffice(division, city);
    const employees = office.employees;

    const employeesToAssign = employeeRatio.map(x => Math.floor(employees.length * x));

    let remainingEmployees = (employees.length - employeesToAssign.reduce((a, b) => (a + b), 0));

    while (remainingEmployees > 0) {
        for (let i = 0; i < 6; i++) {
            if (employeeRatio[i] > 0 && remainingEmployees > 0) {
                employeesToAssign[i] += 1;
                remainingEmployees -= 1;
            }
        }
    }

    //ns.print(`${division} > ${city} > ${employeesToAssign}`);

    const assignedEmployees : string[][] = [
        employees.filter(x => ns.corporation.getEmployee(division, city, x).pos === JobType.Operations),
        employees.filter(x => ns.corporation.getEmployee(division, city, x).pos === JobType.Engineer),
        employees.filter(x => ns.corporation.getEmployee(division, city, x).pos === JobType.Business),
        employees.filter(x => ns.corporation.getEmployee(division, city, x).pos === JobType.Management),
        employees.filter(x => ns.corporation.getEmployee(division, city, x).pos === JobType.ResearchAndDevelopment),
        employees.filter(x => ns.corporation.getEmployee(division, city, x).pos === JobType.Training),
        employees.filter(x => ns.corporation.getEmployee(division, city, x).pos === JobType.Unassigned)
    ];

    //ns.print(`${division} > ${city} > ${assignedEmployees.map(x => x.length)}`);

    const availableEmployees : string[] = [
        ...assignedEmployees[0].slice(employeesToAssign[0]),
        ...assignedEmployees[1].slice(employeesToAssign[1]),
        ...assignedEmployees[2].slice(employeesToAssign[2]),
        ...assignedEmployees[3].slice(employeesToAssign[3]),
        ...assignedEmployees[4].slice(employeesToAssign[4]),
        ...assignedEmployees[5].slice(employeesToAssign[5]),
        ...assignedEmployees[6],
    ];

    const jobs = [JobType.Operations, JobType.Engineer, JobType.Business, JobType.Management, JobType.ResearchAndDevelopment, JobType.Training];

    logger.log(`Beginning to assign jobs to employees in ${division} > ${city}`, { type: MessageType.debugLow });

    for (let i = 0; i < jobs.length; i++) {
        const amountToAssign = Math.max(0, employeesToAssign[i] - assignedEmployees[i].length);
        for (let j = 0; j < amountToAssign; j++) {
            const employee = availableEmployees.shift()
            if (!employee) {
                logger.log("Run out of employees to assign", { type: MessageType.debugLow });
                return;
            }
            await ns.corporation.assignJob(division, city, employee, jobs[i]);
        }
    }
}

/*
 * ------------------------
 * > WILSON AND ADVERT PURCHASING FUNCTIONS
 * ------------------------
*/

/**
 * Process attempting to purchase a Wilsons upgrade or an AdVert level for a division
 * @param ns NS object parameter.
 */
function processPurchaseWilsonsAndAdVert(ns : NS) : void {
    if (!hasOfficeAPI) return;

    const allDivisionsAtLimits = industries.filter(x => hasExpandedToIndustry(ns, x)).every((industry) => {
        const division = getDivisionNameOfIndustry(ns, industry);
        return isDivisionAtOfficeAndWareHouseLimits(ns, division);
    })

    if (!allDivisionsAtLimits) {
        logger.log(`Not all divisions at office and warehouse limits - deny Wilson and AdVert upgrades`, { type: MessageType.debugHigh });
        return;
    }

    const wilsonsCost = ns.corporation.getUpgradeLevelCost("Wilson Analytics");
    let adVertPurchased = false;
    for (const industry of industries.filter(x => hasExpandedToIndustry(ns, x))) {
        const division = getDivisionNameOfIndustry(ns, industry);
        if (tryPurchaseAdVertForDivision(ns, division, wilsonsCost)) {
            adVertPurchased = true;
            break;
        }
    }

    if (!adVertPurchased){
        tryPurchaseWilsons(ns);
    }
}


/**
 * Test if the division has met the office and warehouse limits first.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @returns True if all limits are met; false otherwise.
 */
 function isDivisionAtOfficeAndWareHouseLimits(ns : NS, division : string) : boolean {
    return isDivisionAtOfficeAllLimits(ns, division) && isDivisionAtWarehouseAllLimits(ns, division);
}

/**
 * Test if a division is at all office limits.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @returns True if all offices are at the limit; false otherwise.
 */
function isDivisionAtOfficeAllLimits(ns : NS, division : string) : boolean {
    const industry = getIndustryFromDivisionName(ns, division);
    const officeLimit = getOfficeLimit(industry);

    return CITIES.every((city) => {
        if (!hasOfficeForDivisionInCity(ns, division, city)) return false;
        const office = ns.corporation.getOffice(division, city);
        return office.size >= officeLimit;
    });
}

/**
 * Test if a division is at all warehouse limits.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @returns True if all warehouses are at the limit; false otherwise.
 */
function isDivisionAtWarehouseAllLimits(ns : NS, division : string) : boolean {
    const industry = getIndustryFromDivisionName(ns, division);
    const warehouseLimit = getWarehouseLimit(industry);

    return CITIES.every((city) => {
        if (!hasWarehouseForDivisionInCity(ns, division, city)) return false;
        const warehouse = ns.corporation.getWarehouse(division, city);
        return warehouse.size >= warehouseLimit;
    });
}

/**
 * Try to purchase a level of the Wilsons Analytics upgrade
 * @param ns NS object parameter.
 */
function tryPurchaseWilsons(ns : NS) : void {
    if (canPurchaseWilsons(ns)) {
        doPurchaseWilsons(ns);
    }
}

/**
 * Test if the corporation can upgrade the Wilsons Analytics upgrade.
 * @param ns NS object parameter.
 * @returns True if upgrade is possible; false otherwise.
 */
function canPurchaseWilsons(ns : NS) : boolean {
    if (atWilsonsLevelLimit(ns)) {
        logger.log(`Wilsons Analytics upgrade is already at the level limit - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    if (!canAffordWilsons(ns)) {
        logger.log(`Corporation is unable to afford Wilsons upgrade - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Test if the Wilsons Analytics upgrade is at the set level limit.
 * @param ns NS object parameter.
 * @returns True if the upgrade is at the level limit; false otherwise.
 */
 function atWilsonsLevelLimit(ns : NS) : boolean {
    const currentLevel = ns.corporation.getUpgradeLevel("Wilson Analytics");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const limit = corpUpgrades.find(x => x.name === "Wilson Analytics")!.limit
    return currentLevel >= limit;
}

/**
 * Test if the corporation can afford a Wilsons Analytics upgrade.
 * @param ns NS object parameter.
 * @returns True if the upgrade is affordable; false otherwise.
 */
function canAffordWilsons(ns : NS) : boolean {
    const wilsonsCost = ns.corporation.getUpgradeLevelCost("Wilson Analytics");
    return ns.corporation.getCorporation().funds >= wilsonsCost;
}

/**
 * Purchase a Wilson's Analytics upgrade.
 * @param ns NS object parameter.
 */
function doPurchaseWilsons(ns : NS) : void {
    const upgradeLevel = ns.corporation.getUpgradeLevel("Wilson Analytics");
    ns.corporation.levelUpgrade("Wilson Analytics");
    logger.log(`Leveled upgrade: Wilson Analytics (${upgradeLevel} --> ${upgradeLevel + 1})`, { type: MessageType.info });
}

/**
 * Try to purchase a level of AdVert for a given division
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param wilsonsCost Cost of the Wilsons Analytics upgrade.
 */
function tryPurchaseAdVertForDivision(ns : NS, division : string, wilsonsCost : number) : boolean {
    if (canPurchaseAdVert(ns, division, wilsonsCost)) {
        doPurchaseAdVert(ns, division);
        return true;
    } else {
        return false;
    }
}

/**
 * Test if a division can purchase a level of AdVert.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param wilsonsCost Cost of the Wilsons Analytics upgrade.
 * @returns True if purchase is possible; false otherwise.
 */
function canPurchaseAdVert(ns : NS, division : string, wilsonsCost : number) : boolean {
    if (ns.corporation.getHireAdVertCost(division) >= wilsonsCost) {
        logger.log(`Wilsons Analytics is cheaper - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    if (atAdVertLevelLimit(ns, division)) {
        logger.log(`AdVert upgrade is already at the level limit for this ${division} - deny upgrade`, { type: MessageType.debugHigh });
        return false;
    }

    if (!canAffordAdVertForDivision(ns, division)) {
        logger.log(`Corporation is unable to afford AdVert level for ${division} - deny expansion`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Test if the AdVert upgrade is at the set level limit for a given division.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @returns True if the upgrade is at the level limit; false otherwise.
 */
 function atAdVertLevelLimit(ns : NS, division : string) : boolean {
    const industry = getIndustryFromDivisionName(ns, division);
    const limit = getAdVertLimit(industry);
    return ns.corporation.getHireAdVertCount(division) >= limit;
}

/**
 * Test if the corporation can afford an AdVert upgrade for a given division.
 * @param ns NS object parameter.
 * @returns True if the upgrade is affordable; false otherwise.
 */
function canAffordAdVertForDivision(ns : NS, division : string) : boolean {
    const adVertCost = ns.corporation.getHireAdVertCost(division);
    return  ns.corporation.getCorporation().funds >= adVertCost;
}

/**
 * Purchase an AdVert upgrade for a given division.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
function doPurchaseAdVert(ns : NS, division : string) : void {
    ns.corporation.hireAdVert(division);
    logger.log(`Hired AdVert for ${division}`, { type: MessageType.info });
}

/*
 * ------------------------
 * > MATERIAL PURCHASING PROCESSING FUNCTIONS
 * ------------------------
*/

/**
 * Process attempting to buy materials for divisions in cities.
 * @param ns NS object parameter.
 */
async function processMaterialPurchases(ns : NS) : Promise<void> {
    if (!hasWarehouseAPI) return;
    for (const industry of industries.filter(x => hasExpandedToIndustry(ns, x))) {
        const division = getDivisionNameOfIndustry(ns, industry);
        await processMaterialPurchasesForDivision(ns, division);
    }
}

/**
 * Process attempting to purchase materials upgrades in a given division for cities.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
async function processMaterialPurchasesForDivision(ns : NS, division : string) : Promise<void> {
    for (const city of CITIES.filter(x =>
        hasExpandedDivisionToCity(ns, division, x) &&
        hasWarehouseForDivisionInCity(ns, division, x)
    )) {
        logger.log(`Trying to purchase materials for ${division} in ${city}`, { type: MessageType.debugHigh });
        await doMaterialPurchasesForDivisionInCity(ns, division, city);
    }
}

/**
 * Perform the material purchases.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 */
async function doMaterialPurchasesForDivisionInCity(ns : NS, division : string, city : string) : Promise<void> {
    ns.corporation.setSmartSupply(division, city, true);
    const warehouse = ns.corporation.getWarehouse(division, city);
    const industry = getIndustryFromDivisionName(ns, division);
    const storage = optimalMaterialStorage(industry, warehouse.size * 0.75);

    if (industry === "Agriculture") {
        ns.corporation.sellMaterial(division, city, "Food", "MAX", "MP");
        ns.corporation.sellMaterial(division, city, "Plants", "MAX", "MP");
    }

    logger.log(`Starting material buy/sell for ${division} > ${city}`, { type: MessageType.debugHigh });

    await sellExcessMaterials(ns, division, city, storage);
    await buyRequiredMaterials(ns, division, city, storage);

    logger.log(`Finished material buy/sell for ${division} > ${city}`, { type: MessageType.debugHigh });
}

/**
 * Sell any excess materials to reach the desired amount.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @param storage Storage object.
 */
async function sellExcessMaterials(ns : NS, division : string, city : string, storage : IStorage) : Promise<void> {
    for (const material of ["Hardware", "Robots", "AICores", "RealEstate"]) {
        ns.corporation.buyMaterial(division, city, material, 0);
        ns.corporation.sellMaterial(division, city, material, "0", "0");
        let quantity = ns.corporation.getMaterial(division, city, material).qty;

        while (quantity > storage[material]) {
            const amtToSell = quantity - storage[material];
            await doSellMaterials(ns, division, city, material, amtToSell);
            quantity = ns.corporation.getMaterial(division, city, material).qty;
        }
    }
}

/**
 * Buy any required materials to reach the desired amount.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @param storage Storage object.
 */
async function buyRequiredMaterials(ns : NS, division : string, city : string, storage : IStorage) : Promise<void> {
    for (const material of ["Hardware", "Robots", "AICores", "RealEstate"]) {
        ns.corporation.buyMaterial(division, city, material, 0);
        ns.corporation.sellMaterial(division, city, material, "0", "0");
        let quantity = ns.corporation.getMaterial(division, city, material).qty;

        while (quantity < storage[material] && ns.corporation.getCorporation().funds >= 5e9) {
            const amtToBuy = storage[material] - quantity;
            await doBuyMaterials(ns, division, city, material, amtToBuy);
            quantity = ns.corporation.getMaterial(division, city, material).qty;
        }
    }
}

/**
 * Perform the selling of materials.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @param material Material to sell.
 * @param amount Amount to sell.
 */
async function doSellMaterials(ns : NS, division : string, city : string, material : string, amount : number) : Promise<void> {
    // Wait for next pre-"SALE" state
    while (ns.corporation.getCorporation().state !== "PRODUCTION") { await ns.asleep(10); }

    // Sell the required number of materials
    ns.corporation.sellMaterial(division, city, material, (amount / 10).toString(), "0");
    logger.log(`Selling ${amount.toFixed(0)} x ${material} in ${division} > ${city}`, { type: MessageType.info });

    // Wait for the next post-"SALE" state
    while (ns.corporation.getCorporation().state !== "EXPORT") { await ns.asleep(10); }

    // Unset materials to sell
    ns.corporation.sellMaterial(division, city, material, "0", "0");
}

/**
 * Perform the purchasing of materials.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @param material Material to buy.
 * @param amount Amount to buy.
 */
async function doBuyMaterials(ns : NS, division : string, city : string, material : string, amount : number) : Promise<void> {
    // Wait for the next pre-"PURCHASE" state
    while (ns.corporation.getCorporation().state !== "START") { await ns.asleep(10); }

    // Buy the required number of materials
    ns.corporation.buyMaterial(division, city, material, (amount / 10));
    logger.log(`Buying ${amount.toFixed(0)} x ${material} in ${division} > ${city}`, { type: MessageType.info });

    // Wait for the next post-"PURCHASE" state
    while (ns.corporation.getCorporation().state !== "PRODUCTION") { await ns.asleep(10); }

    // Unset materials to buy
    ns.corporation.buyMaterial(division, city, material, 0);
}

/*
 * ------------------------
 * > PRODUCT PRODUCTION PROCESSING FUNCTIONS
 * ------------------------
*/

/**
 * Process attempting to make products in divisions.
 * @param ns NS object parameter.
 */
async function processProductMaking(ns : NS) : Promise<void> {
    if (!hasWarehouseAPI) return;
    for (const industry of industries.filter(x => hasExpandedToIndustry(ns, x))) {
        if (canIndustryMakeProducts(ns, industry)) {
            const division = getDivisionNameOfIndustry(ns, industry);
            await tryProductMakingForDivision(ns, division);
        } else {
            logger.log(`Cannot make products for industry ${industry} as it is not a product-making industry`, { type: MessageType.debugHigh });
        }
    }
}

/**
 * Test if a given industry can make products.
 * @param ns NS object parameter.
 * @param industry Name of industry.
 * @returns True if production is possible; false otherwise.
 */
function canIndustryMakeProducts(ns : NS, industry : string) : boolean {
    const type = getIndustryType(industry);
    return type === IndustryType.Product;
}

/**
 * Try to create a product for the specified division.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
async function tryProductMakingForDivision(ns : NS, division : string) : Promise<void> {
    if (!canMakeProductInDivision(ns, division)) {
        logger.log(`Unable to make product in division ${division}`, { type: MessageType.debugHigh });
    } else {
        checkProductCapacityAvailability(ns, division);
        createNewProduct(ns, division);
    }

    await assignProductSellPrices(ns, division);
}

/**
 * Test if a given division make products.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param city Name of city.
 * @returns True if purchase is possible; false otherwise.
 */
function canMakeProductInDivision(ns : NS, division : string) : boolean {
    if (!hasWarehouseForDivisionInCity(ns, division, mainProductionCity)) {
        logger.log(`${division} does not have a warehouse in ${mainProductionCity} (main production city) - deny product creation`, { type: MessageType.debugHigh });
        return false;
    }

    const products = ns.corporation.getDivision(division).products;
    const productsInDevelopment = products.some(x => ns.corporation.getProduct(division, x).developmentProgress < 100);
    if (productsInDevelopment) {
        logger.log(`${division} has a product current in development - deny product creation`, { type: MessageType.debugHigh });
        return false;
    }

    return true;
}

/**
 * Check if a division needs to discontinue any older products before making newer ones.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
function checkProductCapacityAvailability(ns : NS, division : string) : void {
    if (atMaxProducts(ns, division)) {
        logger.log(`${division} at product capacity - need to discontinue one product`, { type: MessageType.debugLow });
        discontinueWorstProduct(ns, division);
    }
}

/**
 * Test if a given division is at product capacity.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @returns True if the division is at capacity; false otherwise.
 */
function atMaxProducts(ns : NS, division : string) : boolean {
    let productCapacity = 3;

    if (hasOfficeAPI) {
        const hasCapacityUpgrade = ns.corporation.hasResearched(division, "uPgrade: Capacity.I");
        productCapacity = hasCapacityUpgrade ? 4 : 3;
    }

    return ns.corporation.getDivision(division).products.length === productCapacity;
}

/**
 * Discontinue a division's worst product.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
function discontinueWorstProduct(ns : NS, division : string) : void {
    const worstProduct = getWorstProduct(ns, division);
    ns.corporation.discontinueProduct(division, worstProduct);
    logger.log(`Discontinuing product: ${worstProduct} in ${division}`, { type: MessageType.info });
}

/**
 * Get a division's worst product.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
function getWorstProduct(ns : NS, division : string) : string {
    logger.log(`Getting worst product in ${division}`, { type: MessageType.debugHigh });
    const products = ns.corporation.getDivision(division).products;
    return products[0];
}

/**
 * Create a new product for a given division.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
function createNewProduct(ns : NS, division : string) : void {
    logger.log(`Creating new product in ${division}`, { type: MessageType.debugHigh });
    const productName = "prd_" + Math.round(performance.now()).toString();
    const productInvestAmt = Math.max(0, ns.corporation.getCorporation().funds * 0.1);
    ns.corporation.makeProduct(division, mainProductionCity, productName, productInvestAmt, productInvestAmt);
    logger.log(`Starting production of product: ${productName} in ${division}`, { type: MessageType.success });
    logger.log(`Investment Amount: ${ns.nFormat(productInvestAmt, '$0.000a')}`, { type: MessageType.info });
}

/**
 * Assign product sell prices for all products in a given division.
 * @param ns NS object parameter.
 * @param division Name of division.
 */
async function assignProductSellPrices(ns : NS, division : string) : Promise<void> {
    logger.log(`Assiging sell prices to products in ${division}`, { type: MessageType.debugHigh });
    const products = ns.corporation.getDivision(division).products;

    logger.log(`Waiting for next sell cycle to pass`, { type: MessageType.debugHigh });
    while (ns.corporation.getCorporation().state !== "EXPORT") { await ns.asleep(10); }

    products.forEach((product) => {
        const productInfo = ns.corporation.getProduct(division, product);
        if (productInfo.developmentProgress >= 100) {
            assignProductSellPricesForProduct(ns, division, product);
        }
    });
}

/**
 * Assign the sell price for a product based on whether Market-TA.II is researched.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param product Name of product.
 */
function assignProductSellPricesForProduct(ns : NS, division : string, product : string) : void {
    if (hasOfficeAPI) {
        if (ns.corporation.hasResearched(division, "Market-TA.II")) {
            const sellData = ns.corporation.getProduct(division, product).cityData["Volhaven"];
            if (sellData[1] > sellData[2] || (sellData[1] <= sellData[2] && sellData[0] > 0)) {
                setProductPricesWithMarketTA2(ns, division, product, false);
            } else {
                setProductPricesWithMarketTA2(ns, division, product, true);
            }

            return;
        }
    }

    setProductPricesWithPriceEstimation(ns, division, product);
}

/**
 * Set the sell price of a product with Market-TA.II.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param product Name of product.
 */
function setProductPricesWithMarketTA2(ns : NS, division : string, product : string, state : boolean) : void {
    ns.corporation.setProductMarketTA2(division, product, state);
    ns.corporation.setProductMarketTA1(division, product, state);
    ns.corporation.sellProduct(division, mainProductionCity, product, "MAX", `MP`, true);
}

/**
 * Set the sell price of a product via numerical estimation.
 * @param ns NS object parameter.
 * @param division Name of division.
 * @param product Name of product.
 */
function setProductPricesWithPriceEstimation(ns : NS, division : string, product : string) : void {
    if (ns.corporation.hasResearched(division, "Market-TA.I")) ns.corporation.setProductMarketTA1(division, product, false);

    const productInfo = ns.corporation.getProduct(division, product);
    const productData = corpData.divisions.find(x => x.name === division)?.products.find(x => x.name === product);
    if (!productData) return;

    const currentMult = productInfo.sCost.toString().length > 2 ? parseFloat(productInfo.sCost.toString().substring(3)) : 1;
    let newMult = 1;

    const city = "Volhaven"

    const qty = productInfo.cityData[city][0];
    const prod = productInfo.cityData[city][1];
    const sell = productInfo.cityData[city][2];

    if (qty > 0 || prod > sell) {
        newMult = parseFloat((currentMult - (0.01 * Math.pow(2, Math.floor(productData.successiveSellPriceIncreaseTicks[city] / 5)))).toFixed(2));
        productData.successiveSellPriceIncreaseTicks[city] = 0;
    } else {
        productData.successiveSellPriceIncreaseTicks[city] += 1;
        newMult = parseFloat((currentMult + (0.01 * Math.pow(2, Math.floor(productData.successiveSellPriceIncreaseTicks[city] / 5)))).toFixed(2));
    }

    logger.log(`Setting sell price for ${product} from ${division} to MP*${newMult}`, { type: MessageType.debugLow });
    ns.corporation.sellProduct(division, city, product, "MAX", `MP*${newMult}`, true);
}

/*
 * ------------------------
 * > OPTIMAL MATERIAL CALCULATOR FUNCTION
 * ------------------------
*/

/**
 * [STOLEN CODE] Calculate the optimal number of materials to boost production for a given division and storage size.
 * @param divisionType Type of industry.
 * @param size Size of warehouse.
 * @returns Optimal storage amounts.
 */
function optimalMaterialStorage(divisionType : string, size : number) : IStorage {
    const matProdFactors : { [key : string] : IStorage } = {
        "Energy":           {"Hardware": 0.,    "RealEstate": 0.65, "Robots": 0.05, "AICores": 0.3},
        "Utilities":        {"Hardware": 0.,    "RealEstate": 0.5,  "Robots": 0.4,  "AICores": 0.4},
        "Agriculture":      {"Hardware": 0.2,   "RealEstate": 0.72, "Robots": 0.3,  "AICores": 0.3},
        "Fishing":          {"Hardware": 0.35,  "RealEstate": 0.15, "Robots": 0.5,  "AICores": 0.2},
        "Mining":           {"Hardware": 0.4,   "RealEstate": 0.3,  "Robots": 0.45, "AICores": 0.45},
        "Food":             {"Hardware": 0.15,  "RealEstate": 0.05, "Robots": 0.3,  "AICores": 0.25},
        "Tobacco":          {"Hardware": 0.15,  "RealEstate": 0.15, "Robots": 0.2,  "AICores": 0.15},
        "Chemical":         {"Hardware": 0.2,   "RealEstate": 0.25, "Robots": 0.25, "AICores": 0.2},
        "Pharmaceutical":   {"Hardware": 0.15,  "RealEstate": 0.05, "Robots": 0.25, "AICores": 0.2},
        "Computer":         {"Hardware": 0.,    "RealEstate": 0.2,  "Robots": 0.36, "AICores": 0.19},
        "Robotics":         {"Hardware": 0.19,  "RealEstate": 0.32, "Robots": 0.,   "AICores": 0.36},
        "Software":         {"Hardware": 0.25,  "RealEstate": 0.15, "Robots": 0.05, "AICores": 0.18},
        "Healthcare":       {"Hardware": 0.1,   "RealEstate": 0.1,  "Robots": 0.1,  "AICores": 0.1},
        "Real Estate":      {"Hardware": 0.05,  "RealEstate": 0.,   "Robots": 0.6,  "AICores": 0.6},
    };
    const matSizes : IStorage = { "Hardware": 0.06, "RealEstate": 0.005, "Robots": 0.5, "AICores": 0.1 };

    const beta = 0.002;         // constant multiplier used in production factor calculation
    const epsilon = 1e-12;
    const alpha = matProdFactors[divisionType];

    const storage : IStorage = { "Hardware": -1., "RealEstate": -1., "Robots": -1., "AICores": -1. };

    const removedMats : string[] = [];       // if the optimal solution requires negative material storage, resolve without that material
    while (true) {
        let alphaSum = 0;
        let gSum = 0;
        for (const mat in matSizes) {
            if (!removedMats.includes(mat)) {
                gSum += matSizes[mat];      // sum of material sizes
                alphaSum += alpha[mat];     // sum of material material "production factors"
            }
        }
        for (const mat in matSizes) {
            if (!removedMats.includes(mat)) {
                // solution of the constrained optimiztion problem via the method of Lagrange multipliers
                storage[mat] = 1./beta*(alpha[mat]/alphaSum*(beta*size + gSum)/matSizes[mat] - 1.);
            }
        }

        if (storage["Hardware"] >= -epsilon && storage["RealEstate"] >= -epsilon && storage["Robots"] >= -epsilon && storage["AICores"] >= -epsilon) {
            break;
        } else { // negative solutions are possible, remove corresponding material and resolve
            if (storage["Hardware"] < -epsilon)     { storage["Hardware"] = 0.;     removedMats.push("Hardware"); continue; }
            if (storage["RealEstate"] < -epsilon)   { storage["RealEstate"] = 0.;   removedMats.push("RealEstate"); continue; }
            if (storage["Robots"] < -epsilon)       { storage["Robots"] = 0.;       removedMats.push("Robots"); continue; }
            if (storage["AICores"] < -epsilon)      { storage["AICores"] = 0.;      removedMats.push("AICores"); continue; }
        }
    }

    storage["Hardware"] = Math.floor(storage["Hardware"]);
    storage["RealEstate"] = Math.floor(storage["RealEstate"]);
    storage["Robots"] = Math.floor(storage["Robots"]);
    storage["AICores"] = Math.floor(storage["AICores"]);

    return storage;
}








async function bribeFactions(ns : NS) : Promise<void> {
    const factionRep = await runDodgerScript<{ faction : string, rep : number }[]>(ns, "/singularity/dodger/getFactionRep-bulk.js", JSON.stringify(player.factions.joinedFactions));
    const rep = ns.getAugmentationRepReq("The Red Pill");
    const gangFaction = ns.gang.inGang() ? ns.gang.getGangInformation().faction : "";
    for (const f of factionRep) {
        if (["Bladeburners", "Church of the Machine God", gangFaction].includes(f.faction)) continue;
        if (f.rep < rep && corpData.funds >= 1e17) {
            logger.log(`Bribing ${f.faction}`);
            ns.corporation.bribe(f.faction, corpData.funds, 0);
        }
    }
}


// researhc idk

async function processResearchUpgrades(ns : NS) : Promise<void> {
    if (!hasOfficeAPI) return;
    for (const industry of industries.filter(x => hasExpandedToIndustry(ns, x))) {
        const division = getDivisionNameOfIndustry(ns, industry);

        for (const r of ["Hi-Tech R&D Laboratory", "Market-TA.I", "Market-TA.II",]) {
            if (!ns.corporation.hasResearched(division, r)) {
                if (ns.corporation.getDivision(division).research >= ns.corporation.getResearchCost(division, r) * 2) {
                    ns.corporation.research(division, r)
                }
            }
        }
    }
}




/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "CORP-DAE", "Corporation Daemon");

    // Parse args?
    industries = ["Agriculture", "Tobacco"];
    industries.forEach(x => x = x.substring(0, 1).toUpperCase() + x.substring(1).toLowerCase());
    if (!industries.every(x => INDUSTRIES.includes(x))) {
        await logger.abort("Invalid industry", { type: MessageType.error });
    }

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

	// Helper output
	if (help) {
		ns.tprintf(
			`Corporation Daemon Helper:\n`+
			`Description:\n` +
			`   Manage your very own corporation... by doing nothing! (Does not guarantee return on investment).\n` +
			`Usage: run /corporation/corporation-daemon.js [args] [flags]\n` +
            `Args:\n` +
            `   [industries to join] : string[] |>> List of industries to join >>in order<<. \n` +
			`Flags:\n` +
			`   [--h or help]        : boolean  |>> Prints this.\n` +
			`   [--v or --verbose]   : boolean  |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   [--d or --debug]     : boolean  |>> Sets logging level to 3 - even more verbosing logging.`
		);

		return;
	}

    // Define player and current server
    player = genPlayer(ns);
    //machine = genServer(ns, ns.getHostname());

    setupCorporationEnvironment(ns);

    await updateCorpData(ns);

	logger.initialisedMessage(true, false);

    while (true) {

        logger.log("Starting corporation cycle", { type: MessageType.debugLow });

        processInvestmentOffers(ns);

        processCorporationStage(ns);

        processIndustryExpansions(ns);

        processCityExpansions(ns);

        processWarehouseUpgrades(ns);

        processCorporationUpgradesAndUnlocks(ns);

        processCheckForCorporationAPIs(ns);

        await processResearchUpgrades(ns);

        processOfficeUpgrades(ns);

        await processHireEmployees(ns);

        await processProductMaking(ns);

        await processMaterialPurchases(ns);

        processPurchaseWilsonsAndAdVert(ns);

        await bribeFactions(ns);

        await updateCorpData(ns);

        await ns.asleep(5000);
    }

    /**
     * Implement new bulk buy method
     *
     * Need to prevent script getting stuck on purchasing materials for FOREVER (prevents other aspects
     * such as employees + upgrade purchases from progressing - hampering progress)
     *
     * Need to re-implement researching somehow. MIght have to hardcode available research per division.......
     *
     * General cleanup might be in order. Some functions are probably redundant + others are over-complicated.
     */
}
