interface IStockTransaction {
	buyday: number;
	sellday: number;
	profit: number;
}

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

function getCombos(arr : IStockTransaction[], n : number) : IStockTransaction[][] {
	if (n === 0 || arr.length === 0) return [[]];
	else {
		console.log(`${arr.length} ${n}`);
		const data = [];

		for (const txn of arr) {
			const tmp = arr.filter((v) => v.buyday > txn.sellday || v.sellday < txn.buyday);
			while (tmp.length > 0) {
				break;
			}
			const nextData = arr.filter((v) => v.buyday > txn.sellday || v.sellday < txn.buyday);
			const comboData = getCombos(nextData, n - 1).filter(x => x.length > 0);

			if (comboData.length === 0) {
				data.push([txn]);
			} else {
				comboData.forEach((c) => data.push([txn, ...c.flat()]));
			}
		}

		return data;
	}
}

/**
 * @param {number} tradeCount Maximum number of trades that can be performed.
 * @param {number[]} stockPrices Array of stock prices on day i.
 * @returns {number} Maximum profit attainable.
 */
export function solveAlgorithmicStockTrader(tradeCount : number, stockPrices : number[]) : number {

	console.log("Coding-Contract Algorthmic Stock Trader");
    console.log(`Trade Count: ${tradeCount}`);
    console.log(`Stock Prices: ${stockPrices}`);
	const start = new Date().getTime();

	const txns : IStockTransaction[] = [];

	for (let i = 0; i < stockPrices.length; i++) {
		for (let j = i + 1; j < stockPrices.length; j++) {
			if (isValidBuyTransaction(stockPrices, i) && isValidSellTransaction(stockPrices, j) && stockPrices[j] !== stockPrices[i])	{
				txns.push({ buyday: i, sellday: j, profit: stockPrices[j] - stockPrices[i] });
			}
		}
	}

	let pruned = [...txns];

	for (const x of pruned) console.log(x);

	let change = true;
	while (change) {
		change = false;

		for (let i = 0; i < pruned.length; i++) {
			const txn = pruned[i];
			const beforeLength = pruned.length;
			pruned = pruned.filter(x => !(x.buyday === txn.buyday && x.sellday > txn.sellday && x.profit <= txn.profit));
			const afterLength = pruned.length;

			if (beforeLength !== afterLength) {
				change = true;
				break;
			}

		}
	}

	console.log("---");
	for (const x of pruned) console.log(x);

	if (txns.length === 0) {
		return 0;
	} else {
		//const combos = getCombos(pruned, tradeCount);
		//const results = combos.map(x => x.map(y => y.profit).reduce((a, b) => a + b, 0));
		//const solution = results.sort((a, b) => b - a)[0];
		return 0;
		const end = new Date().getTime();
		console.log(`Finished solver in ${end-start}ms`);
		console.log("Solution:");
		//console.log(solution);
		console.log("---");

		//return solution;
	}
}
