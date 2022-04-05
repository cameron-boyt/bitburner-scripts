import { NS } from '@ns'
import { getServerPath } from '/helpers/server-helper';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	const dest = ns.args[0].toString();
	const path = getServerPath(ns, ns.getHostname(), dest);
	
	if (path.length > 3)
	ns.tprint(`Full: ${path}`);
	ns.tprint(`3rd: ${path[3]}, 5th: ${path[5]}, 10th: ${path[10]}`);
}