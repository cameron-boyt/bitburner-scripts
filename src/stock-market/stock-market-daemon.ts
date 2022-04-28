import { BitNodeMultipliers, NS, SourceFileLvl } from "@ns";
import { IStockData, IStockHolding } from "/stock-market/stock-data.js";
import { readBitnodeMultiplierData } from "/data/read-bitnodemult-data.js";
import { readSourceFileData } from "/data/read-sourcefile-data";
import { genPlayer, IPlayerObject } from "/libraries/player-factory.js";
import { peekPort, PortNumber, purgePort, readFromPort, writeToPort } from "/helpers/port-helper.js";
import { MessageType, ScriptLogger } from "/libraries/script-logger.js";
import { runDodgerScript } from "/helpers/dodger-helper";

// Script logger
let logger: ScriptLogger;

// Script refresh period
const refreshPeriod = 2000;

// Flags
const flagSchema: [string, string | number | boolean | string[]][] = [
    ["h", false],
    ["help", false],
    ["v", false],
    ["verbose", false],
    ["d", false],
    ["debug", false]
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode

/*
 * > SCRIPT VARIABLES <
 */

/** Player object */
let player: IPlayerObject;

/** Does player have a WSE account? */
let hasWSE = false;
/** Does player have the TIX API? */
let hasTixAPI = false;
/** Does player have the 4S API? */
let has4SAPI = false;

/** Does the player have access to stock shorting? */
let canShort = false;

/** Proporation of funds to retain when buying stocks */
const MIN_RETAIN = 0.1;

/** Stock trading commission fee */
const COMMISSION = 100000;

/** Length of the short forecast period */
const shortForecastPeriod = 10;

/** Ticks to collect data before making transactions */
let dataGatherPeriodTicks = 25;
/** Does the script have enough information to start making transactions? */
let hasSufficientData = false;

/** Length of 1 market cycle */
const marketCycleLength = 75;
/** Current estimated tick */
let estTick = 0;
/** Current detected tick */
let detectedCycleTick = 0;
/** Number of inversions detected to flag a new market cycle */
let inversionAgreementThreshold = 6;
/** Was a new market cycle detected? */
let marketCycleDetected = false;

/** Tolerence for forecast different to trigger an "inversion" */
const inversionDetectionTolerance = 0.1;
/** Half of the inversion threshold */
const tol2 = inversionDetectionTolerance / 2;

/** Total of all the player's assets */
let totalWorth = 0;

/** HUD element for tracking stock value */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let hudElement: any;

/** Bitnode Multipliers */
let multipliers: BitNodeMultipliers;
/** Source File Levels */
let sourceFiles: SourceFileLvl[];

/** List of all stock symbols */
let symbols: string[];

/** Stock data tracking object */
const stockData: IStockData = {
    stocks: {},
    currentTick: 0,
    refreshPeriod: 0,
    lastUpdate: 0
};

/*
 * ------------------------
 * > ARGUMENT AND FLAG PARSING FUNCTIONS
 * ------------------------
 */

/**
 * Parse script flags.
 * @param ns NS object.
 */
async function parseFlags(ns: NS): Promise<void> {
    const flags = ns.flags(flagSchema);
    help = flags.h || flags["help"];
    verbose = flags.v || flags["verbose"];
    debug = flags.d || flags["debug"];

    if (verbose) logger.setLogLevel(2);
    if (debug) logger.setLogLevel(3);
}

/*
 * ------------------------
 * > SCRIPT RUN TEST FUNCTIONS
 * ------------------------
 */

/**
 * Test if this script can/should be run.
 * @returns True if the script can be run; false otherwise.
 */
async function canRunScript(): Promise<boolean> {
    hasWSE = player.stocks.hasWSE;
    hasTixAPI = player.stocks.hasTixApi;
    has4SAPI = player.stocks.has4SDataTixApi;

    if (!hasWSE) logger.log("No WSE Trading Account - aborting execution", { type: MessageType.fail, sendToast: true });
    if (!hasTixAPI) logger.log("No access to the basic TIX API - aborting execution", { type: MessageType.fail, sendToast: true });
    if (!has4SAPI) logger.log("No access to the 4S TIX API - continuing with limited functionality", { type: MessageType.warning, sendToast: true });

    return hasWSE && hasTixAPI;
}

/*
 * ------------------------
 * > ENVIRONMENT SETUP FUNCTION
 * ------------------------
 */

/**
 * Set up the environment for this script.
 * @param ns NS object parameter.
 */
async function setupEnvironment(ns: NS): Promise<void> {
    multipliers = await readBitnodeMultiplierData(ns);
    sourceFiles = await readSourceFileData(ns);

    if (player.bitnodeN === 8) {
        logger.log("Player on BitNode 8 - enabling shorting of stocks", { type: MessageType.info });
        canShort = true;
    } else {
        logger.log("Player not on BitNode 8 - checking SF8 level", { type: MessageType.info });
        const sourceFileEightLevel = sourceFiles.find((x) => x.n === 8)?.lvl;
        if (sourceFileEightLevel) {
            if (sourceFileEightLevel >= 2) {
                logger.log(`Source File 8 Level = ${sourceFileEightLevel} - enabling shorting of stocks`, { type: MessageType.info });
                canShort = true;
            } else {
                logger.log(`Source File 8 Level = ${sourceFileEightLevel} - disabling shorting of stocks`, { type: MessageType.info });
            }
        } else {
            logger.log(`Player does not own Source File 8 - disabling shorting of stocks`, { type: MessageType.info });
        }
    }

    symbols = await runDodgerScript<string[]>(ns, "/stock-market/dodger/getSymbols.js");
    const maxShares = await runDodgerScript<number[]>(ns, "/stock-market/dodger/getMaxShares-bulk.js", symbols);

    totalWorth = 0;
    estTick = 0;
    detectedCycleTick = 0;
    inversionAgreementThreshold = 6;
    marketCycleDetected = false;

    stockData.stocks = {};
    stockData.currentTick = 0;
    stockData.refreshPeriod = refreshPeriod;
    stockData.lastUpdate = 0;

    for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        const max = maxShares[i];

        stockData.stocks[sym] = {
            sym: sym,
            maxShares: max,
            longPos: { shares: 0, price: 0 },
            shortPos: { shares: 0, price: 0 },
            askPrice: 0,
            bidPrice: 0,
            timeToCoverSpread: 0,
            priceHistory: [],
            forecast: {
                current: 0,
                lastTick: 0,
                abs: 0,
                near: 0,
                far: 0
            },
            volatility: 0,
            possibleInversion: false,
            ticksHeld: 0,
            expectedReturn: 0,
            absReturn: 0
        };
    }

    purgePort(ns, PortNumber.StockWorth);
    purgePort(ns, PortNumber.StockData);
    purgePort(ns, PortNumber.StockSellFlag);

    hudElement = initializeHud();
    ns.atExit(() => hudElement.parentElement.parentElement.parentElement.removeChild(hudElement.parentElement.parentElement));
}

/*
 * ------------------------
 * > DATA UPDATE FUNCTIONS
 * ------------------------
 */

/**
 * Update cycle data for the script.
 * @param ns NS object.
 */
async function updateData(ns: NS): Promise<void> {
    logger.log("Updating data...", { type: MessageType.debugLow });
    let stockWorth = 0;
    let inversionsDetected = 0;

    const stockPositions = await runDodgerScript<[number, number, number, number][]>(ns, "/stock-market/dodger/getPosition-bulk.js", symbols);
    const stockPrices = await runDodgerScript<[number, number][]>(ns, "/stock-market/dodger/getPrice-bulk.js", symbols);
    const stockForecast = has4SAPI ? await runDodgerScript<number[]>(ns, "/stock-market/dodger/getForecast-bulk.js", symbols) : symbols.map((_) => 0.5);
    const stockVolatility = has4SAPI ? await runDodgerScript<number[]>(ns, "/stock-market/dodger/getVolatility-bulk.js", symbols) : symbols.map((_) => 0);

    for (let i = 0; i < symbols.length; i++) {
        const stockHolding = stockData.stocks[symbols[i]];

        updateStockPosition(stockHolding, stockPositions[i]);
        updatePriceHistory(stockHolding, stockPrices[i]);
        updateForecast(stockHolding, stockForecast[i]);
        updateVolatility(stockHolding, stockVolatility[i]);

        updateExpectedReturn(stockHolding);

        stockWorth += getValueOfStocksOwned(stockHolding);

        if (stockHolding.possibleInversion) inversionsDetected += 1;
    }

    checkForNewMarketCycle(inversionsDetected);
    if (!hasSufficientData) checkForSufficientData();

    hudElement.innerText = ns.nFormat(stockWorth, "$0.000a");

    totalWorth = player.money + stockWorth;

    purgePort(ns, PortNumber.StockWorth);
    await writeToPort<number>(ns, PortNumber.StockWorth, totalWorth);

    stockData.currentTick = estTick;
}

/**
 * Update the player's current position in this stock.
 * @param stock Stock object to update.
 * @returns Total value of stocks the player owns of this type.
 */
function updateStockPosition(stock: IStockHolding, position: number[]): void {
    stock.longPos.shares = position[0];
    stock.longPos.price = position[1];
    stock.shortPos.shares = position[2];
    stock.shortPos.price = position[3];

    if (position[0] + position[2] > 0) stock.ticksHeld += 1;
}

/**
 * Update the price history of this stock.
 * @param stock Stock object to update.
 */
function updatePriceHistory(stock: IStockHolding, prices: [number, number]): void {
    stock.askPrice = prices[0];
    stock.bidPrice = prices[1];

    if (stock.priceHistory.length === 50) stock.priceHistory.pop();
    stock.priceHistory.unshift((prices[0] + prices[1]) / 2);
}

/**
 * Update the volatility of this stock.
 * @param stock Stock object to update.
 */
function updateVolatility(stock: IStockHolding, volatility: number): void {
    if (has4SAPI) {
        stock.volatility = volatility;
    } else {
        // Get highest %difference between two prices
        stock.volatility = stock.priceHistory.reduce((max, price, idx) => Math.max(max, idx == 0 ? 0 : Math.abs(stock.priceHistory[idx - 1] - price) / price), 0);
    }
}

/**
 * Given two probabilities, detect if an inversion may have occurred.
 * @param p1 Probablity 1
 * @param p2 Probablity 1
 * @returns True if an inversion might have occurred; false otherwise.
 */
function detectInversion(p1: number, p2: number): boolean {
    return (
        (p1 >= 0.5 + tol2 && p2 <= 0.5 - tol2 && p2 <= 1 - p1 + inversionDetectionTolerance) || (p1 <= 0.5 - tol2 && p2 >= 0.5 + tol2 && p2 >= 1 - p1 - inversionDetectionTolerance)
    );
}

/**
 * Update the forecast of this stock.
 * @param stock Stock object to update.
 */
function updateForecast(stock: IStockHolding, forecast: number): void {
    stock.forecast.lastTick = stock.forecast.current;

    const getUps = (ups: number, price: number, idx: number, arr: number[]): number => {
        if (idx === 0) return 0;
        else if (arr[idx - 1] > price) return ups + 1;
        else return ups;
    };

    const nearPriceHistory = stock.priceHistory.slice(0, shortForecastPeriod);
    stock.forecast.near = nearPriceHistory.length > 1 ? nearPriceHistory.reduce(getUps, 0) / (nearPriceHistory.length - 1) : 0.5;

    const farPriceHistory = stock.priceHistory.slice(shortForecastPeriod);
    stock.forecast.far = farPriceHistory.length > 1 ? farPriceHistory.reduce(getUps, 0) / (farPriceHistory.length - 1) : 0.5;

    if (has4SAPI) {
        stock.forecast.current = forecast;
        stock.possibleInversion = detectInversion(stock.forecast.current, stock.forecast.lastTick || stock.forecast.current);
    } else {
        // Get number of increases / total history
        stock.forecast.current = stock.priceHistory.reduce(getUps, 0) / (stock.priceHistory.length - 1);
        stock.possibleInversion = detectInversion(stock.forecast.near, stock.forecast.far);
    }

    stock.forecast.abs = Math.abs(stock.forecast.current - 0.5);
}

/**
 * Update the expected return value of this stock.
 * @param stock Stock object to update.
 */
function updateExpectedReturn(stock: IStockHolding): void {
    const normalisedProb = stock.forecast.current - 0.5;
    const forecastStdDev = Math.sqrt((stock.forecast.current * (1 - stock.forecast.current)) / 50);
    const conservativeProb = normalisedProb < 0 ? Math.min(0, normalisedProb + forecastStdDev) : Math.max(0, normalisedProb - forecastStdDev);
    stock.expectedReturn = stock.volatility * conservativeProb;
    stock.absReturn = Math.abs(stock.expectedReturn);
    stock.timeToCoverSpread = Math.min(Math.ceil(Math.log(stock.askPrice / stock.bidPrice) / Math.log(1 + stock.absReturn)), 9999);
}

/**
 * Check if enough inversions have been detected to flag a new market cycle.
 * @param inversionsDetected NUmber of inversions detected this tick.
 */
function checkForNewMarketCycle(inversionsDetected: number): void {
    if (inversionsDetected >= inversionAgreementThreshold || (marketCycleDetected && detectedCycleTick === 75)) {
        logger.log(`Detected ${inversionsDetected} stock inversions`, { type: MessageType.warning });
        const newPredictedCycleTick = has4SAPI ? 0 : 10;
        marketCycleDetected = true;
        detectedCycleTick = newPredictedCycleTick;
        inversionAgreementThreshold = Math.max(18, inversionsDetected);
    }
}

/**
 * Check if the script has gathered sufficient data to begin making transcations.
 */
function checkForSufficientData(): void {
    if (dataGatherPeriodTicks > 0) dataGatherPeriodTicks -= 1;
    else {
        logger.log(`Sufficient data collection - will now consider making stock transactions`, { type: MessageType.success });
        hasSufficientData = true;
    }
}

/*
 * ------------------------
 * > DO SCRIPT PROCESSING FUNCTIONS
 * ------------------------
 */

/**
 * Execute the funtionality of this script.
 * @param ns NS object.
 */
async function doScriptFunctions(ns: NS): Promise<void> {
    updateTick();

    const soldAll = await checkForSellCommand(ns);
    if (soldAll) {
        ns.exit();
        await ns.asleep(5000);
    }

    await checkFor4SApiPurchase(ns);
    await checkForCorpPurchase(ns);
    await tryTransactStocks(ns);
}

/*
 * ------------------------
 * > SPECIAL SELL-TO-BUY FUNCTIONS
 * ------------------------
 */

/**
 * Check if stocks can be sold in order to purchase the 4SApi.
 * @param ns NS object.
 */
async function checkFor4SApiPurchase(ns: NS): Promise<void> {
    if (!has4SAPI && totalWorth >= 25e9 * multipliers.FourSigmaMarketDataApiCost * 1.5) {
        logger.log(`Selling stocks in order to purchase 4S Market API`, { type: MessageType.success });
        for (const stock of Object.values(stockData.stocks)) {
            if (stock.longPos.shares > 0) await doTransactionSell(ns, stock, true);
            if (stock.shortPos.shares > 0) await doTransactionSell(ns, stock, false);
        }

        const purchased = await runDodgerScript<boolean>(ns, "/stock-market/dodger/purchase4SMarketDataTixApi.js");
        if (purchased) {
            logger.log(`Purchased 4S Market API`, { type: MessageType.success });
            has4SAPI = true;
            dataGatherPeriodTicks = 25;
            hasSufficientData = false;
        } else {
            logger.log(`Failed to purchase 4S Market API`, { type: MessageType.fail });
        }
    }
}

/**
 * Check if stocks can be sold in order to purchase a corporation.
 * @param ns NS object.
 */
async function checkForCorpPurchase(ns: NS): Promise<void> {
    if (!player.hasCorp && multipliers.CorporationValuation >= 0.2 && totalWorth >= 150e9 * 3) {
        logger.log(`Selling stocks in order to found a Corporation`, { type: MessageType.success });
        for (const stock of Object.values(stockData.stocks)) {
            if (stock.longPos.shares > 0) await doTransactionSell(ns, stock, true);
            if (stock.shortPos.shares > 0) await doTransactionSell(ns, stock, false);
        }

        logger.log(`Waiting for a Corporation to be founded`, { type: MessageType.info });
        while (!player.hasCorp) {
            await ns.asleep(1000);
            logger.log(`Waiting...`, { type: MessageType.debugLow });
        }
    }
}

/*
 * ------------------------
 * > STOCK TRANSACTIONS FUNCTIONS
 * ------------------------
 */

/**
 * Try to perform stock transactions.
 * @param ns NS object.
 */
async function tryTransactStocks(ns: NS): Promise<void> {
    if (hasSufficientData) {
        if (await trySellStocks(ns)) return;
        await tryBuyStocks(ns);
    } else {
        logger.log(`Collecting data to make accurate stock decisions... ${dataGatherPeriodTicks} ticks remaining`, { type: MessageType.info });
    }
}

/*
 * ------------------------
 * > STOCK SELL TRANSACTION FUNCTIONS
 * ------------------------
 */

/**
 * Sell stocks which are underperforming.
 * @param ns NS object parameter.
 */
async function trySellStocks(ns: NS): Promise<boolean> {
    let didSell = false;
    for (const stock of getSellableStocks()) {
        if (stock.ticksHeld < 10) {
            logger.log(`Preventing sell of ${stock.sym} as it has only been held for ${stock.ticksHeld} ticks`, { type: MessageType.warning });
        } else {
            const isLongTransaction = stock.longPos.shares > 0;
            if ((isLongTransaction && stock.shortPos.shares > 0) || (!isLongTransaction && stock.longPos.shares > 0)) {
                logger.log("Have both long and short stocks - this shouldn't happen.", { type: MessageType.warning });
            }
            await doTransactionSell(ns, stock, isLongTransaction);
            didSell = true;
        }
    }

    return didSell;
}

/**
 * Get a list of stock objects which are considered "sellable"
 * @returns A list of stocks that should be sold.
 */
function getSellableStocks(): IStockHolding[] {
    return getOwnedStocks().filter((x) => isStockSellable(x));
}

/**
 * Get a list of stock objects where the player has some stock holdings.
 * @returns A list of stocks that the player owns.
 */
function getOwnedStocks(): IStockHolding[] {
    return Object.values(stockData.stocks).filter((stock) => stock.longPos.shares > 0 || stock.shortPos.shares > 0);
}

/**
 * Determine whether a given stock should be sold.
 * @param stock Stock data object.
 * @returns True if the given stock should be sold; false otherwise.
 */
function isStockSellable(stock: IStockHolding): boolean {
    return (
        (has4SAPI ? stock.absReturn <= 0 : stock.absReturn <= 0.0005) ||
        (stock.forecast.current > 0.5 && stock.shortPos.shares > 0) ||
        (stock.forecast.current < 0.5 && stock.longPos.shares > 0) ||
        getProfitAsPercentage(stock) >= 0.67
    );
}

/**
 * Get the profit of the given stock holding as a percentage.
 * @param stock Stock holding object.
 * @returns Profit of current holding as a percentage.
 */
function getProfitAsPercentage(stock: IStockHolding): number {
    const buyValue = stock.longPos.shares * stock.longPos.price + stock.shortPos.shares * stock.shortPos.price;
    const sellValue = stock.longPos.shares * stock.bidPrice + stock.shortPos.shares * (2 * stock.shortPos.price - stock.askPrice);
    const profit = sellValue - buyValue - COMMISSION;
    return profit / buyValue;
}

/**
 * Sell all of the given stock.
 * @param ns NS object parameter.
 * @param stock Stock data object.
 * @param isLongTransaction True if this is a sell in the long position; false otherwise.
 * @returns The total cost of the stocks sold.
 */
async function doTransactionSell(ns: NS, stock: IStockHolding, isLongTransaction: boolean): Promise<void> {
    const shares = isLongTransaction ? stock.longPos.shares : stock.shortPos.shares;
    const sellPrice = isLongTransaction ? await doTransactionSellLong(ns, stock.sym, shares) : await doTransactionSellShort(ns, stock.sym, shares);
    if (sellPrice > 0) {
        logger.log(`Sold ${shares}x ${stock.sym} > ${ns.nFormat(sellPrice * shares, "$0.00a")}`, { type: MessageType.info });
        stock.ticksHeld = 0;

        const profit = shares * (isLongTransaction ? sellPrice - stock.longPos.price : stock.shortPos.price - sellPrice) - COMMISSION;
        logger.log(`Sold ${shares}x ${stock.sym} for a ${profit > 0 ? "PROFIT" : "LOSS"} of ${ns.nFormat(profit, "$0.00 a")}`, {
            type: profit > 0 ? MessageType.success : MessageType.fail,
            sendToast: true
        });
    } else {
        logger.log(`There was an error trying to sell ${shares}x ${stock.sym}`, { type: MessageType.error });
    }
}

/**
 * Perform a long sell transaction for the given sym and amount of shares.
 * @param ns NS object parameter.
 * @param sym Symbol of the stock to sell.
 * @param shares Number of shares to sell.
 * @returns Price at which the stocks were sold.
 */
async function doTransactionSellLong(ns: NS, sym: string, shares: number): Promise<number> {
    return runDodgerScript<number>(ns, "/stock-market/dodger/sell.js", sym, shares);
}

/**
 * Perform a short sell transaction for the given sym and amount of shares.
 * @param ns NS object parameter.
 * @param sym Symbol of the stock to sell.
 * @param shares Number of shares to sell.
 * @returns Price at which the stocks were sold.
 */
async function doTransactionSellShort(ns: NS, sym: string, shares: number): Promise<number> {
    return runDodgerScript<number>(ns, "/stock-market/dodger/sellShort.js", sym, shares);
}

/*
 * ------------------------
 * > STOCK BUY TRANSACTION FUNCTIONS
 * ------------------------
 */

/**
 * Buy stocks that are looking promising.
 * @param ns NS object parameter.
 */
async function tryBuyStocks(ns: NS): Promise<void> {
    for (const stock of getWellPerformingStocks()) {
        const isLongTransaction = stock.forecast.current > 0.5;
        const stockAmount = getStockPurchaseAmount(stock, isLongTransaction);

        const buyPrice = isLongTransaction ? stock.askPrice : stock.bidPrice;
        const ticksBeforeEndOfCycle = marketCycleLength - estTick - stock.timeToCoverSpread;
        const estimatedEndOfCycleValue = stockAmount * buyPrice * ((stock.absReturn + 1) ** ticksBeforeEndOfCycle - 1);

        if (stockAmount > 0 && estimatedEndOfCycleValue > 2 * COMMISSION) {
            await doTransactionBuy(ns, stock.sym, stockAmount, isLongTransaction);
        }
    }
}

/**
 * Get a list of stocks, matching a list of parameters, that are performing well.
 * @returns A list of stocks which are performing well.
 */
function getWellPerformingStocks(): IStockHolding[] {
    return Object.values(stockData.stocks)
        .filter((stock) => stockHasGoodForecast(stock) && stockHasGoodReturn(stock) && stockHasGoodTime(stock))
        .sort((a, b) => b.absReturn - a.absReturn);
}

/**
 * Test if a stock has a good forecast.
 * @param stock Stock holding
 * @returns True if the forecast is good; false otherwise.
 */
function stockHasGoodForecast(stock: IStockHolding): boolean {
    if (canShort) {
        return has4SAPI ? stock.forecast.abs >= 0.05 : stock.forecast.abs >= 0.15;
    } else {
        return has4SAPI ? stock.forecast.current >= 0.55 : stock.forecast.current >= 0.65;
    }
}

/**
 * Test if a stock has a good return.
 * @param stock Stock holding
 * @returns True if the return is good; false otherwise.
 */
function stockHasGoodReturn(stock: IStockHolding): boolean {
    if (canShort) {
        return has4SAPI ? stock.absReturn >= 0.0001 : stock.absReturn >= 0.00075;
    } else {
        return has4SAPI ? stock.expectedReturn >= 0.0001 : stock.expectedReturn >= 0.00075;
    }
}

/**
 * Test if a stock has a good time for return.
 * @param stock Stock holding
 * @returns True if the time for return is good; false otherwise.
 */
function stockHasGoodTime(stock: IStockHolding): boolean {
    if (has4SAPI) {
        return Math.ceil(stock.timeToCoverSpread) < marketCycleLength - estTick;
    } else {
        return Math.max(10, Math.ceil(stock.timeToCoverSpread)) < marketCycleLength - estTick;
    }
}

/**
 * Get the maximum amount of stock the player is able to purchase of this type.
 * @param stock Stock data object.
 * @param isLongTransaction True if this is a long transcation; false otherwise.
 * @returns The amount of stock the player can purchase.
 */
function getStockPurchaseAmount(stock: IStockHolding, isLongTransaction: boolean): number {
    return Math.min(getAvailableStocks(stock), getAffordableNumberOfStocks(stock, isLongTransaction));
}

/**
 * Get a value of the current stocks owned for a given stock.
 * @param stock Stock data object.
 * @returns Valuation of current owned stocks of this type.
 */
function getAvailableStocks(stock: IStockHolding): number {
    return stock.maxShares - (stock.longPos.shares + stock.shortPos.shares);
}

/**
 * Get the number of stocks of this type the player can afford.
 * @param stock Stock data object.
 * @returns Number of affordable stocks.
 */
function getAffordableNumberOfStocks(stock: IStockHolding, isLongTransaction: boolean): number {
    let budget = player.money - MIN_RETAIN * totalWorth;
    if (budget <= 0) return 0;

    budget = Math.min(budget, (1 - MIN_RETAIN) * totalWorth * (has4SAPI ? 1 : 0.25) - getValueOfStocksOwned(stock));
    return Math.floor((budget - COMMISSION) / (isLongTransaction ? stock.askPrice : stock.bidPrice));
}

/**
 * Get a value of the current stocks owned for a given stock.
 * @param stock Stock data object.
 * @returns Valuation of current owned stocks of this type.
 */
function getValueOfStocksOwned(stock: IStockHolding): number {
    return stock.longPos.shares * stock.bidPrice + stock.shortPos.shares * (2 * stock.shortPos.price - stock.askPrice);
}

/**
 * Purchase an amount of the given stock.
 * @param ns NS object parameter.
 * @param sym Symbol of the stock to purchase.
 * @param shares Number of shares to purchase.
 * @param isLongTransaction True if this is a purchase in the long position; false otherwise.
 */
async function doTransactionBuy(ns: NS, sym: string, shares: number, isLongTransaction: boolean): Promise<void> {
    const buyPrice = isLongTransaction ? await doTransactionBuyLong(ns, sym, shares) : await doTransactionBuyShort(ns, sym, shares);
    if (buyPrice > 0) {
        logger.log(`Bought ${shares}x ${sym} > ${ns.nFormat(buyPrice * shares, "$0.00a")}`, { type: MessageType.info });
    } else {
        logger.log(`There was an error trying to purchase ${shares}x ${sym}`, { type: MessageType.error });
    }
}

/**
 * Perform a long buy transactions for the given sym and amount of shares.
 * @param ns NS object parameter.
 * @param sym Symbol of the stock to purchase.
 * @param shares Number of shares to purchase.
 * @returns Price at which the stocks were purchased.
 */
async function doTransactionBuyLong(ns: NS, sym: string, shares: number): Promise<number> {
    return runDodgerScript<number>(ns, "/stock-market/dodger/buy.js", sym, shares);
}

/**
 * Perform a short buy transactions for the given sym and amount of shares.
 * @param ns NS object parameter.
 * @param sym Symbol of the stock to purchase.
 * @param shares Number of shares to purchase.
 * @returns Price at which the stocks were purchased.
 */
async function doTransactionBuyShort(ns: NS, sym: string, shares: number): Promise<number> {
    return runDodgerScript<number>(ns, "/stock-market/dodger/short.js", sym, shares);
}

/*
 * ------------------------
 * > TICK UPDATE FUNCTIONS
 * ------------------------
 */

/**
 * Check if a market tick has occurred.
 * @param ns NS object parameter.
 * @returns True if a market ticket occurred; false otherwise.
 */
async function checkTickUpdate(ns: NS): Promise<boolean> {
    const stockPrices = await runDodgerScript<[number, number][]>(ns, "/stock-market/dodger/getPrice-bulk.js", symbols);
    return Array.from(Array(symbols.length).keys()).some((i) => stockData.stocks[symbols[i]].priceHistory[0] !== Math.floor((stockPrices[i][0] + stockPrices[i][1]) / 2));
}

/**
 * Update tick-releated information.
 */
function updateTick(): void {
    detectedCycleTick += 1;

    let tickDelta = 0;
    if (marketCycleDetected) tickDelta = 5;
    else if (inversionAgreementThreshold <= 8) tickDelta = 15;
    else if (inversionAgreementThreshold <= 10) tickDelta = 30;
    else tickDelta = marketCycleLength;

    estTick = Math.max(detectedCycleTick, marketCycleLength - tickDelta);
    logger.log(`Detected Tick: ${detectedCycleTick} | Estimated Tick: ${estTick}`, { type: MessageType.debugLow });
}

/*
 * ------------------------
 * > SELL ALL UPON FLAG FUNCTION
 * ------------------------
 */

/**
 * Check if a sell-all command has been sent to this script.
 * @param ns NS object parameter.
 */
async function checkForSellCommand(ns: NS): Promise<boolean> {
    logger.log("Checking for sell command", { type: MessageType.debugHigh });
    if (peekPort<string>(ns, PortNumber.StockSellFlag) === "sell") {
        await readFromPort<string>(ns, PortNumber.StockSellFlag);
        await sellAllHoldings(ns);
        await writeToPort(ns, PortNumber.StockSellFlag, "all sold");
        purgePort(ns, PortNumber.StockData);
        return true;
    } else {
        return false;
    }
}

/**
 * Sell all current holdings.
 * @param ns NS object parameter.
 */
async function sellAllHoldings(ns: NS): Promise<void> {
    logger.log("Dumping all stocks!", { type: MessageType.warning, sendToast: true });

    for (const stock of Object.values(stockData.stocks)) {
        if (stock.longPos.shares > 0) await doTransactionSell(ns, stock, true);
        if (stock.shortPos.shares > 0) await doTransactionSell(ns, stock, false);
    }
}

/**
 * Updates the stock HUD item.
 * @returns Nothing.
 */
function initializeHud(): void {
    const d = eval("document");
    let htmlDisplay = d.getElementById("stock-display-1");
    if (htmlDisplay !== null) return htmlDisplay;
    // Get the custom display elements in HUD.
    const customElements = d.getElementById("overview-extra-hook-0").parentElement.parentElement;
    // Make a clone - in case other scripts are using them
    const stockValueTracker = customElements.cloneNode(true);
    // Clear id since duplicate id's are invalid
    stockValueTracker.querySelectorAll("p").forEach((el: { id: string }, i: string) => (el.id = "stock-display-" + i));
    // Get out output element
    htmlDisplay = stockValueTracker.querySelector("#stock-display-1");
    // Display label and default value
    stockValueTracker.querySelectorAll("p")[0].innerText = "Stock";
    htmlDisplay.innerText = "$0.000";
    // Insert our element right after Money
    customElements.parentElement.insertBefore(stockValueTracker, customElements.parentElement.childNodes[2]);
    return htmlDisplay;
}

/*
 * ------------------------
 * > DATA EXPORT FUNCTIONS
 * ------------------------
 */

/**
 * Package and export script data to a port to be used by other scripts.
 * @param ns NS object.
 */
async function exportData(ns: NS): Promise<void> {
    logger.log("Exporting data...", { type: MessageType.debugLow });

    stockData.lastUpdate = performance.now();
    purgePort(ns, PortNumber.StockData);
    await writeToPort<IStockData>(ns, PortNumber.StockData, stockData);
}

/*
 * ------------------------
 * > SCRIPT CYCLE WAIT FUNCTIONS
 * ------------------------
 */

/**
 * Wait an amount of time before the script starts its next cycle.
 * @param ns NS object.
 */
async function waitForScriptCycle(ns: NS): Promise<void> {
    logger.log("Waiting for script sleep cycle...", { type: MessageType.debugLow });
    await ns.asleep(refreshPeriod);
}

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "STOCKS", "Stock Market Daemon");
    player = genPlayer(ns);

    parseFlags(ns);

    // Helper output
    if (help) {
        ns.tprintf(
            "%s",
            `Stock Market Daemon\n` +
                `Description:\n` +
                `   Manages the stock market portfolio, buying and selling holdings to attain profit.\n` +
                `Usage:\n` +
                `   run /stock-market/stock-market-daemon.js [flags]\n` +
                `Flags:\n` +
                `   --h or --help    : boolean |>> Prints this.\n` +
                `   --v or --verbose : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
                `   --d or --debug   : boolean |>> Sets logging level to 3 - even more verbosing logging.`
        );

        return;
    }

    if (!(await canRunScript())) {
        logger.log("Conditions to run script are not met; exiting.", { type: MessageType.warning });
        ns.exit();
    }

    await setupEnvironment(ns);

    logger.initialisedMessage(true, false);

    while (true) {
        const tickUpdateOccurred = await checkTickUpdate(ns);
        if (tickUpdateOccurred) {
            await updateData(ns);
            await doScriptFunctions(ns);
            await exportData(ns);
        }

        await waitForScriptCycle(ns);
    }
}
