import { NS } from '@ns'
import { getAllServers } from '/helpers/server-helper';

const HACK_SCRIPT = "/hacking/single/hack.js";
const GROW_SCRIPT = "/hacking/single/grow.js";
const WEAK_SCRIPT = "/hacking/single/weak.js";

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    while (true) {
        ns.clearLog();

        // Tally up ongoing hack/grow/weak threads
        const threads : { [key: string]: { hacks: number; grows: number; weaks: number } } = {};

        for (const s of getAllServers(ns)) {
            for (const proc of ns.ps(s)) {

                switch (proc.filename) {
                    case HACK_SCRIPT:
                        if (!threads[proc.args[0]]) threads[proc.args[0]] = { hacks: 0, grows: 0, weaks: 0 }
                        threads[proc.args[0]].hacks += proc.threads;
                        break;

                    case GROW_SCRIPT:
                        if (!threads[proc.args[0]]) threads[proc.args[0]] = { hacks: 0, grows: 0, weaks: 0 }
                        threads[proc.args[0]].grows += proc.threads;
                        break;

                    case WEAK_SCRIPT:
                        if (!threads[proc.args[0]]) threads[proc.args[0]] = { hacks: 0, grows: 0, weaks: 0 }
                        threads[proc.args[0]].weaks += proc.threads;
                        break;
                }
            }
        }


        if (Object.keys(threads).length !== 0) {

            const moneyWeights = []
            for (const target in threads) { moneyWeights.push({ target: target, money: ns.getServerMaxMoney(target) }); }

            const sortedWeights = moneyWeights.sort((a, b) => a.money - b.money);

            const longestNameLength = Math.max(8, moneyWeights.sort((a, b) => b.target.length - a.target.length)[0].target.length);


            ns.print(`${" ".repeat(longestNameLength - 4)}Target  | <Hacks> | <Grows> | <Weaks> `)
            for (const target of sortedWeights) {
                const name = target.target;

                const nameSpaceLen = longestNameLength + 2 - name.length

                const nHacks = threads[name].hacks
                const nHacksLen = 7 - nHacks.toString().length

                const nGrows = threads[name].grows
                const nGrowsLen = 7 - nGrows.toString().length

                const nWeaks = threads[name].weaks
                const nWeaksLen = 7 - nWeaks.toString().length

                ns.print(`${" ".repeat(nameSpaceLen)}${name}  |${" ".repeat(nHacksLen)}${nHacks}  |${" ".repeat(nGrowsLen)}${nGrows}  |${" ".repeat(nWeaksLen)}${nWeaks}`);
            }
        } else {
            ns.print(`            -- -- -- NO -- -- DATA -- -- --`)
        }

        await ns.asleep(1000);

    }
}
