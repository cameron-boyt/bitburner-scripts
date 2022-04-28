interface IStockTransaction {
    buyday: number;
    sellday: number;
    profit: number;
}

/**
 * Test if a buy transcation shoud be made on a given day.
 * @param prices Stock price array
 * @param i Day to buy
 * @returns True if the transaction is valid; false otherwise.
 */
function isValidBuyTransaction(prices: number[], i: number): boolean {
    if (i === 0) {
        return prices[i] < prices[i + 1];
    } else if (i === prices.length - 1) {
        return false;
    } else {
        return prices[i] < prices[i - 1] && prices[i] < prices[i + 1];
    }
}

/**
 * Test if a sell transcation shoud be made on a given day.
 * @param prices Stock price array
 * @param i Day to sell
 * @returns True if the transaction is valid; false otherwise.
 */
function isValidSellTransaction(prices: number[], i: number): boolean {
    if (i === 0) {
        return false;
    } else if (i === prices.length - 1) {
        return prices[i] > prices[i - 1];
    } else {
        return prices[i] > prices[i - 1] && prices[i] > prices[i + 1];
    }
}

/**
 * Get all valid combinations of transcations from a starting list of transactions.
 * @param transcations Array of stock transactions
 * @param n Number of trades that can be made
 * @returns Array of combinations of the provided transcations.
 */
function getCombos(transcations: IStockTransaction[], n: number): IStockTransaction[][] {
    if (n === 0 || transcations.length === 0) return [[]];
    else {
        const data = [];

        for (const txn of transcations) {
            const validTransactions = transcations.filter((v) => v.buyday > txn.sellday || v.sellday < txn.buyday);

            const nonConflictingTransactions = validTransactions.filter((txn1, idx) =>
                validTransactions
                    .filter((_, i) => idx !== i)
                    .every((txn2) => (txn1.buyday > txn2.sellday && txn1.sellday > txn2.sellday) || (txn1.buyday < txn2.buyday && txn1.sellday < txn2.buyday))
            );

            const conflictingTransactions = validTransactions.filter((txn1) =>
                nonConflictingTransactions.every((txn2) => txn1.buyday !== txn2.buyday && txn1.sellday !== txn2.sellday && txn1.profit !== txn2.profit)
            );

            const partialData = [txn, ...nonConflictingTransactions];

            const comboData = getCombos(conflictingTransactions, n - 1).filter((x) => x.length > 0);

            if (comboData.length === 0) {
                data.push([...partialData]);
            } else {
                comboData.forEach((c) => data.push([...partialData, ...c.flat()]));
            }
        }

        return data;
    }
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
            if (isValidBuyTransaction(stockPrices, i) && isValidSellTransaction(stockPrices, j) && stockPrices[j] !== stockPrices[i]) {
                txns.push({ buyday: i, sellday: j, profit: stockPrices[j] - stockPrices[i] });
            }
        }
    }

    console.log(txns);

    const pruned = txns.filter(
        (t1) =>
            txns.filter((t2) => t2.buyday === t1.buyday && t2.sellday < t1.sellday && t2.profit >= t1.profit).length === 0 &&
            txns.filter((t2) => t2.sellday === t1.sellday && t2.buyday > t1.buyday && t2.profit >= t1.profit).length === 0
    );

    console.log("---");
    for (const x of pruned) console.log(x);

    if (txns.length === 0) {
        return 0;
    } else {
        const combos = getCombos(pruned, tradeCount);
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
