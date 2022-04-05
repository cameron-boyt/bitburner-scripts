import { NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
    while (true) {
        await ns.share();
    }
}
