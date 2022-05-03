interface IStockTransaction {
    buyday: number;
    sellday: number;
    profit: number;
}

/**
 * Test if a buy transcation should be made on a given day.
 * @param prices Stock price array
 * @param i Day to buy
 * @returns True if the transaction is valid; false otherwise.
 */
function isValidBuyTransaction(prices: number[], i: number): boolean {
    if (i < prices.length - 1) {
        return prices[i] < prices[i + 1];
    } else {
        return false;
    }
}

/**
 * Test if a sell transcation should be made on a given day.
 * @param prices Stock price array
 * @param i Day to sell
 * @returns True if the transaction is valid; false otherwise.
 */
function isValidSellTransaction(prices: number[], i: number): boolean {
    if (i > 0) {
        return prices[i] > prices[i - 1];
    } else {
        return false;
    }
}

/**
 * Get all valid combinations of transcations from a starting list of transactions.
 * @param transcations Array of stock transactions indexed by buy day.
 * @param n Maximum number of trades that can be made.
 * @returns Array of combinations of the provided transcations.
 */
function getCombos(transcations: IStockTransaction[][], n: number): IStockTransaction[][] {
    n = Math.min(Math.ceil(transcations.length / 2), n);
    let txnData: IStockTransaction[][] = [[]];

    // Loop through each day in the stock prices
    for (let i = 0; i < transcations.length; i++) {
        const updatedData = createNewTransactionCombinations(txnData, transcations, i);
        txnData = pruneTransactionSets(updatedData, n, i);
    }

    return txnData.filter((txnSet) => txnSet.length <= n);
}

/**
 * Create an updated collection of transaction sets using the next day's transactions.
 * @param transactionsSets Existing transaction sets.
 * @param allTransactions Array of all possible transcations indexed by buy day.
 * @param day Current day.
 * @returns A new collection of transcation sets.
 */
function createNewTransactionCombinations(transactionsSets: IStockTransaction[][], allTransactions: IStockTransaction[][], day: number): IStockTransaction[][] {
    const newTransactionSets: IStockTransaction[][] = [];

    for (const data of transactionsSets) {
        // Push the equivalent of doing nothing
        newTransactionSets.push(data);

        // Push a scenario where each possible transaction is made
        const lastSellDay = data.length > 0 ? data.map((txn) => txn.sellday).sort((a, b) => b - a)[0] : -1;
        const valid = allTransactions[day].filter((txn) => txn.buyday > lastSellDay);
        if (valid.length > 0) {
            newTransactionSets.push(...valid.map((txn) => [...data, txn]));
        }
    }

    return newTransactionSets;
}

/**
 * Prune the provided collection by filtering out equal length sets that provide a lesser profit.
 * Create an updated collection of transaction sets using the next day's transactions.
 * @param transactionsSets Existing transaction sets.
 * @param maximumTransactions The maximum number of transactions allowed.
 * @param day Current day.
 * @returns A collection of pruned transaction sets.
 */
function pruneTransactionSets(transactionsSets: IStockTransaction[][], maximumTransactions: number, day: number): IStockTransaction[][] {
    const transactionsByLength: IStockTransaction[][][] = Array(maximumTransactions + 1)
        .fill(null)
        .map((_) => []);

    // Filter transaction sets by length
    for (let l = 1; l <= maximumTransactions; l++) {
        // Get a list of transaction sets that match the given length
        const transactionSets = [...transactionsSets.filter((txnSet) => txnSet.length === l)];
        if (transactionSets.length === 0) {
            continue;
        }

        // Do not prune transcation sets where the current day is not the maximum sell day of the set
        const toNotPrune = transactionSets.filter((txnSet) => txnSet.map((txn) => txn.sellday).sort((a, b) => b - a)[0] > day);
        if (toNotPrune.length > 0) transactionsByLength[l].push(...toNotPrune);

        // Prune on the set with the highest profit that ends on a given sell date
        const toPrune = transactionSets.filter((txnSet) => txnSet.map((txn) => txn.sellday).sort((a, b) => b - a)[0] <= day);
        const bestTransactionSet = getBestTransactionSet(toPrune);

        if (toPrune.length > 0) transactionsByLength[l].push(bestTransactionSet);
    }

    return [[], ...transactionsByLength.flat()];
}

function getBestTransactionSet(transactionSets: IStockTransaction[][]): IStockTransaction[] {
    transactionSets.sort((a, b) => {
        const aP = a.map((txn) => txn.profit);
        const bP = b.map((txn) => txn.profit);
        const aTot = aP.length === 1 ? aP[0] : aP.reduce((x, y) => x + y, 0);
        const bTot = bP.length === 1 ? bP[0] : bP.reduce((x, y) => x + y, 0);

        return bTot - aTot;
    });

    return transactionSets[0];
}

/**
 * @param tradeCount Maximum number of trades that can be performed.
 * @param stockPrices Array of stock prices on day i.
 * @returns Maximum profit attainable.
 */
export function solveAlgorithmicStockTrader(tradeCount: number, stockPrices: number[]): number {
    console.log("Coding-Contract Algorthmic Stock Trader");
    console.log(`Trade Count: ${tradeCount}`);
    console.log(`Stock Prices: ${stockPrices}`);
    const start = new Date().getTime();

    const txns: IStockTransaction[] = [];

    for (let i = 0; i < stockPrices.length; i++) {
        for (let j = i + 1; j < stockPrices.length; j++) {
            if (isValidBuyTransaction(stockPrices, i) && isValidSellTransaction(stockPrices, j) && stockPrices[j] > stockPrices[i]) {
                txns.push({ buyday: i, sellday: j, profit: stockPrices[j] - stockPrices[i] });
            }
        }
    }

    console.log(txns);

    const pruned = txns
        .filter((txn) => txn.profit > 0)
        .filter(
            (t1) =>
                txns.filter((t2) => t2.buyday === t1.buyday && t2.sellday < t1.sellday && t2.profit >= t1.profit).length === 0 &&
                txns.filter((t2) => t2.sellday === t1.sellday && t2.buyday > t1.buyday && t2.profit >= t1.profit).length === 0
        );

    console.log("---");
    console.log(pruned);

    if (pruned.length === 0) {
        return 0;
    } else if (pruned.length === 1) {
        return pruned[0].profit;
    } else {
        const highestBuyDay = pruned.map((txn) => txn.buyday).sort((a, b) => b - a)[0];
        const transcationsByBuyDay: IStockTransaction[][] = Array(highestBuyDay + 1)
            .fill(null)
            .map((_) => []);

        for (let i = 0; i <= highestBuyDay; i++) {
            transcationsByBuyDay[i] = pruned.filter((txn) => txn.buyday === i);
        }

        console.log("---");
        console.log(transcationsByBuyDay);

        const combos = getCombos(transcationsByBuyDay, tradeCount);
        const results = combos.map((combo) => combo.map((txn) => txn.profit).reduce((a, b) => a + b, 0)).sort((a, b) => b - a);
        const solution = results[0];

        const end = new Date().getTime();
        console.log(`Finished solver in ${end - start}ms`);
        console.log("Solution:");
        console.log(solution);
        console.log("---");

        return solution;
    }
}
