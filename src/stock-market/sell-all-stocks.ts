import { NS } from "@ns";
import { PortNumber, purgePort, writeToPort } from "/helpers/port-helper.js";

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    purgePort(ns, PortNumber.StockSellFlag);
    await writeToPort(ns, PortNumber.StockSellFlag, "sell");
}
