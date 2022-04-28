import { NS } from "@ns";

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    while (true) {
        await ns.share();
    }
}
