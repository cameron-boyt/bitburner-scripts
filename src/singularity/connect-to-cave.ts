import { NS } from '@ns'
import { getServerPath } from '/helpers/server-helper';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	const path = getServerPath(ns, ns.getHostname(), "The-Cave");

    for (const host of path) {
        ns.connect(host);
    }
}