import { NS } from '@ns'
import { ICorpData } from '../data-types/corporation-data.js';
import { PRODUCT_INDUSTRIES } from '/libraries/constants.js';
import { peekPort, PortNumber } from '/libraries/port-handler.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
    ns.tail();

	while (true) {
		ns.clearLog();

        const data = peekPort<ICorpData>(ns, PortNumber.CorpData);

        if (!data) {
            ns.print(` ╭─| FAIL | DISCONNECTED FROM PARENT SCRIPT |────────────────────────────────╮`);
            ns.print(` |  -->>  ___+++****  C O R P O R A T I O N   S T A T U S    ****+++___  <<-- |`);
            ns.print(` |────────────────────────────────────────────────────────────────────────────|`);
            ns.print(` | > Please start the Corporation Management script!                        < |`);
            ns.print(` ╰───────────────────────────────────────────────────────────────────| FAIL |─╯`);
            await ns.asleep(3000);
            continue;
        }

        let connectionStr = "| SUCCESS | CONNECTED |───────────────────";
        let smallConnectionStr = "| SUCCESS |"

        if (data.lastUpdate <= performance.now() - 60000) {
            connectionStr = "| FAIL | DISCONNECTED FROM PARENT SCRIPT |";
            smallConnectionStr = "───| FAIL |"
        }

        ns.print(` ╭─${connectionStr}────────────────────────╮`);
        ns.print(` |  ->  __++***  C O R P O R A T I O N   S T A T U S      ***++__  <- |`);
        ns.print(` |────────────────────────────────────────────────────────────────────|`);

        const funds = ns.nFormat(data.funds, '0.000a');
        const isPublic = data.isPublic;

        const fundsStr = `$${" ".repeat(129 - funds.toString().length) + funds}`;
        const isPublicStr = isPublic ? "Yes" : "No";

        ns.print(` | [$$$] TOTAL FUNDS: [ ${fundsStr} ]  PUBLIC: [ ${isPublicStr} ]         [$$$] |`);
        ns.print(` ╰───────────────────────────────────────────────────────────────────╯`);
        ns.print(` |   > I N D U S T R I E S < `);

		for (const d of data.divisions) {

			const name = d.name;
            const industry = d.industry;
            const expenses = ns.nFormat(d.expenses, '0.000a');
            const revenue = ns.nFormat(d.revenue, '0.000a');
            const profit = ns.nFormat(d.profit, '0.000a');
            const research = ns.nFormat(d.research, '0.000a');
            const popularity = ns.nFormat(d.popularity, '0.000a');
            const awareness = ns.nFormat(d.awareness, '0.000a');
            const prodMult = ns.nFormat(d.prodMult, '0.000a');

            const nameStr = `${name}`;
            const industryStr = `${industry}`;
            const expensesStr = `$${" ".repeat(9 - expenses.toString().length) + expenses}`;
            const revenueStr = `$${" ".repeat(9 - revenue.toString().length) + revenue}`;
            const profitStr = `$${" ".repeat(9 - profit.toString().length) + profit}`;
            const researchStr = `${" ".repeat(8 - research.toString().length) + research}`;
            const popularityStr = `${" ".repeat(8 - popularity.toString().length) + popularity}`;
            const awarenessStr = `${" ".repeat(8 - awareness.toString().length) + awareness}`;
            const prodMultStr = `${" ".repeat(8 - prodMult.toString().length) + prodMult}`;

			ns.print(` ╰ ╭ ──────────────────────────────────────────────────────────── ╮`);
			ns.print(`    | ${nameStr} [${industryStr}] ${" ".repeat(39 - nameStr.length - industryStr.length)} Research ${researchStr} | `);
            ns.print(` ╭ ╰ ──────────────────────────────────────────────────────────── ╯`);
            ns.print(` |   > Expenses ${expensesStr} | Popularity ${popularityStr} | `);
            ns.print(` |   > Revenue  ${revenueStr} | Awareness  ${awarenessStr} ╰───────────────╮ `)
            ns.print(` |   > Profit   ${profitStr} |                | Prod. Mult ${prodMultStr} | `);

            if (PRODUCT_INDUSTRIES.includes(d.industry)) {
                ns.print(` |   ╰---------------------------------------------------------------╮`);
                ns.print(` |   - - P R O D U C T S - -                                          |`);

                for (const p of d.products) {
                    const name = p.name;
                    const progress = ns.nFormat(Math.min(100, p.developmentProgress), '0.00');

                    const nameStr = `${name}`;
                    const progressStr = `${" ".repeat(6 - progress.length) + progress}`;

                    ns.print(` |   ${nameStr} -- ${progressStr}% Complete                                 |`);
                }
            }
		}

        ns.print(` ╰───────────────────────────────────────────────────────${smallConnectionStr}─╯`);

		await ns.asleep(1000);
	}
}
