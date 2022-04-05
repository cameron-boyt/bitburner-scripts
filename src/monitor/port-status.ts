import { NS } from '@ns'
import { peekPort } from '/libraries/port-handler.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
    ns.tail();

    while (true){

        ns.clearLog();

        for (let i = 1; i <= 20; i++) {
            ns.print(`Port: ${i} --> ${JSON.stringify(peekPort(ns, i))}`);
        }

        await ns.asleep(1000);
    }
}
