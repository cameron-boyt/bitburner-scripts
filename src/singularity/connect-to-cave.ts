import { NS } from "@ns";
import { getServerPath } from "/helpers/server-helper";

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    const path = getServerPath(ns, ns.getHostname(), "The-Cave");

    path.forEach((hostname) => ns.singularity.connect(hostname));
}
