import { NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
    const confirm = await ns.prompt("Are you sure you wish to delete ALL files?");

    if (confirm) {
        ns.ls("home", ".ts").forEach((file) => ns.rm(file));
        ns.ls("home", ".js").forEach((file) => ns.rm(file));
    }
}
