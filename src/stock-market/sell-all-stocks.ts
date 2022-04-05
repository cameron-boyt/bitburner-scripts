import { NS } from '@ns'
import { PortNumber, purgePort, writeToPort } from '/libraries/port-handler.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
    purgePort(ns, PortNumber.StockSellFlag);
    await writeToPort(ns, PortNumber.StockSellFlag, "sell");
}
