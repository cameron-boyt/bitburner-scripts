import { NS } from '@ns'
import { solveAlgorithmicStockTrader } from '/coding-contracts/solvers/algorithmic-stock-trader';
import { PRODUCT_INDUSTRIES } from '/libraries/constants';

function isValidBuyTransaction(arr : number[], i : number) : boolean {
	if (i === 0) {
		return arr[i] < arr[i + 1];
	} else if (i === arr.length - 1) {
		return false;
	} else {
		return arr[i] < arr[i - 1] && arr[i] < arr[i + 1];
	}
}

function isValidSellTransaction(arr : number[], i : number) : boolean {
	if (i === 0) {
		return false;
	} else if (i === arr.length - 1) {
		return arr[i] > arr[i - 1];
	} else {
		return arr[i] > arr[i - 1] && arr[i] > arr[i + 1];
	}
}

interface IStockTransaction {
	buyday: number;
	sellday: number;
	profit: number;
}

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    const tradeCount = 1000;
    const stockPrices = [38,13,127,111,122,182,24,88,18,147,100,56,86,113,183,109,196,30,94,116,124,24,60,12,119,113,183,47,81,38,136,136,109,98,142];

    const txns : IStockTransaction[] = [];

	for (let i = 0; i < stockPrices.length; i++) {
		for (let j = i + 1; j < stockPrices.length; j++) {
			if (isValidBuyTransaction(stockPrices, i) && isValidSellTransaction(stockPrices, j) && stockPrices[j] !== stockPrices[i])	{
				txns.push({ buyday: i, sellday: j, profit: stockPrices[j] - stockPrices[i] });
			}
		}
	}

    console.log(txns);

    const pruned = txns.filter((t1) =>
        txns.filter((t2) => t2.buyday === t1.buyday && t2.sellday < t1.sellday && t2.profit >= t1.profit).length === 0 &&
        txns.filter((t2) => t2.sellday === t1.sellday && t2.buyday > t1.buyday && t2.profit >= t1.profit).length === 0
    );

    console.log(pruned);

    let solutions = pruned.map((txn) => [txn]);

    for (let i = 0; i < pruned.length; i++) {
        const tmpSolutions : IStockTransaction[][] = [];
        solutions.forEach((sol) => {
            const eligibleTxns = pruned.filter((txn) => sol.every((t) => t.buyday !== txn.sellday && t.sellday !== txn.buyday));

            for (j = 0; j < sol.length; j++) {

            }
            eligibleTxns.forEach((txn) => tmpSolutions.push([...sol, txn]));
        });
        solutions = tmpSolutions;
    }

    console.log(solutions);

}
