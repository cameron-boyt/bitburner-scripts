import { NS } from '@ns'

/**
 * Get an array of all server hostnames.
 * @param ns NS object parameter.
 * @returns List of all server hostnames.
 */
export function getAllServers(ns : NS) : string[] {

	/**
	 * @param {NS} ns 'ns' namespace parameter.
	 * @param {string} server Root server to being the search from.
	 * @param {string[]} found Array of servers which have been found so far.
	 **/
	function getServersRecursive(ns : NS, server : string, found : string[]) : string[] {
		for (const child of ns.scan(server)) {
			if (!found.includes(child)) {
				found.push(child);
				found = getServersRecursive(ns, child, found);
			}
		}

		return found;
	}

	return getServersRecursive(ns, "home", []);
}

/**
 * Get the path of hostnames to jump from a given start point to a given goal.
 * @param ns NS object parameter.
 * @param start Start host.
 * @param goal Goal host.
 * @returns Path of hostnames from start to goal.
 */
export function getServerPath(ns : NS, start: string, goal : string) : string[] {
	function getPath(goal : string, host : string, path : string[]) : string[] {
		path.push(host);

		if (host === goal) {
			return path;
		}
		else {
			const nodes = ns.scan(host).filter(x => !path.includes(x));

			if (nodes.length === 0) {
				return [];
			} else {
				for (const server of nodes) {
					const nextPath = getPath(goal, server, [...path]);

					if (nextPath.length !== 0) {
						return nextPath;
					}
				}

				return [];
			}
		}
	}

	return getPath(goal, start, []);
}

/**
 * Get the amount of free RAM a given server has available.
 * @param ns NS object.
 * @param hostname Server hostname.
 * @returns Amount of free RAM on the specified server.
 */
export function getFreeRam(ns : NS, hostname : string) : number {
	return ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname)
}
