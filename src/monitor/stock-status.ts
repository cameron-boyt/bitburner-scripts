import { NS } from '@ns'
import { IStockData } from '../data-types/stock-data.js';
import { peekPort, PortNumber } from '/libraries/port-handler.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
    ns.tail();

    const symLength = 5;
    const moneyLength = 10;
    const profitPercentLength = 7;
    const timeLength = 4;

	while (true) {
		ns.clearLog();

        const data = peekPort<IStockData>(ns, PortNumber.StockData);

        if (!data) {
            ns.print(` ╭─| FAIL | DISCONNECTED FROM PARENT SCRIPT |──────────────────────────────────────────────────────────╮`);
            ns.print(` | -->>--->>  ____+++*****        S T O C K   H O L D I N G S                   *****+++____  <<---<<-- |`);
            ns.print(` | ──────────────────────────────────────────────────────────────────────────────────────────────────── |`);
            ns.print(` | > Please start the Stock Market Daemon script!                                                      <|`);
            ns.print(` ╰────────────────────────────────────────────────────────────────────────────────────────────| FAIL |─╯`);
            await ns.asleep(3000);
            continue;
        }

        let connectionStr = "| SUCCESS | CONNECTED |───────────────────";
        let smallConnectionStr = "| SUCCESS |"

        if (data.lastUpdate <= performance.now() - 7000) {
            connectionStr = "| FAIL | DISCONNECTED FROM PARENT SCRIPT |";
            smallConnectionStr = "───| FAIL |"
        }

        ns.print(` ╭─${connectionStr}──────────────────────────────────────────────────────────╮`);
        ns.print(` | -->>--->>  ____+++*****        S T O C K   H O L D I N G S                   *****+++____  <<---<<-- |`);
        ns.print(` | ──────────────────────────────────────────────────────────────────────────────────────────────────── |`);
        ns.print(` | >> >>        H E L D   S T O C K S                                                             << << |`);
        ns.print(` | ---------------------------------------------------------------------------------------------------- |`);
        ns.print(` |  SYM  |    BUY     |    SELL    |        PROFIT        | FORE  | N FC | F FC |  VOL  | ABS R. | TIME |`);

        let totalBuy = 0;
        let totalSell = 0;
        let totalProfit = 0;

        const heldStocks = data.stocks.filter(x => x.longPos.shares > 0 || x.shortPos.shares > 0);

		for (const h of heldStocks.sort((a, b) => b.absReturn - a.absReturn)) {
            const s = data.stocks.find(x => x.sym === h.sym);
            if (!s) continue;

			const sym = `${h.sym}`;
			const buyP = Math.ceil((h.longPos.shares * h.longPos.price) + (h.shortPos.shares * h.shortPos.price));
            const buyStr = ns.nFormat(buyP, '$0.000a')
			const sellP = Math.ceil((h.longPos.shares * h.bidPrice) + (h.shortPos.shares * (2 * h.shortPos.price - h.askPrice)));
            const sellStr = ns.nFormat(sellP, '$0.000a')
            const profit = sellP - buyP - 1e5;
            const profitStr = ns.nFormat(profit, '$0.000a')
            const profitPercent = profit / buyP;
            const profitPercentStr = `${ns.nFormat(profitPercent, '0.00a%')}`;

			const foreStr = `${s.forecast.current.toFixed(3)}`;
			const shortForeStr = `${s.forecast.near.toFixed(2)}`;
			const longForeStr = `${s.forecast.far.toFixed(2)}`;
			const volStr = `${s.volatility.toFixed(3)}`;
			const retStr = `${s.absReturn.toFixed(4)}`;
			const timeStr = s.timeToCoverSpread > 1000 ? `----` : `${s.timeToCoverSpread}`;

            totalBuy += buyP;
            totalSell += sellP;
            totalProfit += profit

			ns.print(` | ${" ".repeat(symLength - sym.length) + sym} | ${" ".repeat(moneyLength - buyStr.length) + buyStr} ` +
                      `| ${" ".repeat(moneyLength - sellStr.length) + sellStr} ` +
                      `| ${" ".repeat(moneyLength - profitStr.length) + profitStr} ${" ".repeat(profitPercentLength - profitPercentStr.length)}(${profitPercentStr}) ` +
                      `| ${foreStr} | ${shortForeStr} | ${longForeStr} | ${volStr} | ${retStr} ` +
                      `| ${" ".repeat(timeLength - timeStr.length) + timeStr} |`);
		}

        const totalBuyStr = ns.nFormat(totalBuy, '$0.000a')
        const totalSellStr = ns.nFormat(totalSell, '$0.000a')
        const totalProfitStr = ns.nFormat(totalProfit, '$0.000a')
        const totalProfitPercent = totalProfit / totalBuy;
        const totalProfitPercentStr = ns.nFormat(totalProfitPercent, '0.00a%')

        const currentTick = `${data.currentTick}`;
        const currentTickStr = `${" ".repeat(2 - currentTick.length) + currentTick}`;

        ns.print(` | ---------------------------------------------------------------------------------------------------- |`);
        ns.print(` | TOTAL | ${" ".repeat(moneyLength - totalBuyStr.length) + totalBuyStr} ` +
                          `| ${" ".repeat(moneyLength - totalSellStr.length) + totalSellStr} ` +
                          `| ${" ".repeat(moneyLength - totalProfitStr.length) + totalProfitStr} ` +
                            `${" ".repeat(profitPercentLength - totalProfitPercentStr.length)}(${totalProfitPercentStr}) ` +
                          `|                                    Tick: ${currentTickStr} |`
        );
        ns.print(` | ──────────────────────────────────────────────────────────────────────────────────────────────────── |`);
        ns.print(` | >> >>        O T H E R   S T O C K S                                                           << << |`);
        ns.print(` | ---------------------------------------------------------------------------------------------------- |`);
        ns.print(` |  SYM  |    BUY     |    SELL    |        PROFIT        | FORE  | N FC | F FC |  VOL  | ABS R. | TIME |`);

        const unheldStocks = data.stocks.filter(x => x.longPos.shares === 0 && x.shortPos.shares === 0);
        for (const h of unheldStocks.sort((a, b) => b.absReturn - a.absReturn)) {
            const s = data.stocks.find(x => x.sym === h.sym);
            if (!s) continue;

			const sym = `${h.sym}`;
            const buyStr = "";
            const sellStr = "";
            const profitStr = "";
            const profitPercentStr = "";

			const foreStr = `${s.forecast.current.toFixed(3)}`;
			const shortForeStr = `${s.forecast.near.toFixed(2)}`;
			const longForeStr = `${s.forecast.far.toFixed(2)}`;
			const volStr = `${s.volatility.toFixed(3)}`;
			const retStr = `${s.absReturn.toFixed(4)}`;
			const timeStr = s.timeToCoverSpread > 1000 ? `----` : `${s.timeToCoverSpread}`;

			ns.print(` | ${" ".repeat(symLength - sym.length) + sym} | ${" ".repeat(moneyLength - buyStr.length) + buyStr} ` +
                      `| ${" ".repeat(moneyLength - sellStr.length) + sellStr} ` +
                      `| ${" ".repeat(moneyLength - profitStr.length) + profitStr} ${" ".repeat(profitPercentLength - profitPercentStr.length)} ${profitPercentStr}  ` +
                      `| ${foreStr} | ${shortForeStr} | ${longForeStr} | ${volStr} | ${retStr} ` +
                      `| ${" ".repeat(timeLength - timeStr.length) + timeStr} |`);
        }

        ns.print(` ╰─────────────────────────────────────────────────────────────────────────────────────────${smallConnectionStr}─╯`);

		await ns.asleep(1000);
	}
}
