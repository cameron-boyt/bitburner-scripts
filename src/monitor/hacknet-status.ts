import { NS } from '@ns'
import { IHacknetData } from '../data-types/hacknet-data.js';
import { peekPort, PortNumber } from '/libraries/port-handler.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
    ns.tail();

	while (true) {
		ns.clearLog();

        const data = peekPort<IHacknetData>(ns, PortNumber.HacknetData);

        if (!data) {
            ns.print(` ╭─| FAIL | DISCONNECTED FROM PARENT SCRIPT |──────────────────────────────╮`);
            ns.print(` |  -->>  ____+++*****  H A C K N E T   S T A T U S      *****+++____  <<-- |`);
            ns.print(` |──────────────────────────────────────────────────────────────────────────|`);
            ns.print(` | > Please start the Hashnet Server Purchasing script!                   < |`);
            ns.print(` ╰─────────────────────────────────────────────────────────────────| FAIL |─╯`);
            await ns.asleep(3000);
            continue;
        }

        let connectionStr = "| SUCCESS | CONNECTED |───────────────────";
        let smallConnectionStr = "| SUCCESS |"

        if (data.lastUpdate <= performance.now() - 7000) {
            connectionStr = "| FAIL | DISCONNECTED FROM PARENT SCRIPT |";
            smallConnectionStr = "───| FAIL |"
        }

        ns.print(` ╭─${connectionStr}──────────────────────────────╮`);
        ns.print(` |  -->>  ____+++*****  H A C K N E T   S T A T U S      *****+++____  <<-- |`);
        ns.print(` |──────────────────────────────────────────────────────────────────────────|`);

        const hashes = ns.nFormat(data.currentHashes, '0.000a');
        const funds = ns.nFormat(data.currentFunds, '0.000a');
        const allprod = ns.nFormat(data.overallProduction, '0.000a');
        const allMoneyProd = ns.nFormat(data.overallProduction * (1e6 / 4), '0.000a');

        const hashesStr = `${" ".repeat(8 - hashes.toString().length) + hashes}h`;
        const fundsStr = `$${" ".repeat(9 - funds.toString().length) + funds}`;
        const allprodStr = `${" ".repeat(6 - allprod.toString().length) + allprod}h/s`;
        const allMoneyProdStr = `$${" ".repeat(8 - allMoneyProd.toString().length) + allMoneyProd}/s`;

        ns.print(` | > PRODUCTION [${allprodStr} ${allMoneyProdStr}] - - STORED [${hashesStr} ${fundsStr}] < |`);
        ns.print(` | ------------------------------------------------------------------------ |`);

		for (const s of data.servers) {

			const i = s.index
            const level = s.level;
            const cores = s.cores;
            const ram = ns.nFormat(s.ram * 1e9, '0.00b');
            const ramUsed = ns.nFormat(s.ramUsed * 1e9, '0.00b');
            const ramPercent = ns.nFormat(100 - (s.ramUsed / s.ram), '0');
            const prod = ns.nFormat(s.production, '0.000a');

            const iStr = i.toString().length === 1 ? `#0${i}` : `#${i}`;
            const levelStr = `${" ".repeat(3 - level.toString().length) + level}`;
            const coresStr = `${" ".repeat(2 - cores.toString().length) + cores}`;
            const ramStr = `${" ".repeat(8 - ram.toString().length) + ram}`;
            const ramUsedStr = `${" ".repeat(8 - ramUsed.toString().length) + ramUsed}`;
            const ramPercentStr = `${" ".repeat(3 - ramPercent.toString().length) + ramPercent}%`;
            const prodStr = `${" ".repeat(6 - prod.toString().length) + prod}h/s`;

			ns.print(` | [${iStr}] >> Level ${levelStr} | Cores ${coresStr} | RAM ${ramUsedStr}/${ramStr} (${ramPercentStr}) > ${prodStr} | `);
		}

        ns.print(` ╰─────────────────────────────────────────────────────────────${smallConnectionStr}─╯`);

		await ns.asleep(1000);
	}
}
