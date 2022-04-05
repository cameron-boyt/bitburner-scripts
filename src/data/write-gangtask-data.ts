import { GangTaskStats, NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    if (!ns.gang.inGang()) return;

    const gangTaskData : GangTaskStats[] = [];

    for (const task of ns.gang.getTaskNames()) {
        const stats = ns.gang.getTaskStats(task);

        gangTaskData.push(stats);
    }

    const gangTaskDataJson = JSON.stringify(gangTaskData);

    ns.print(gangTaskData);

    await ns.write("/data/gangTaskData.txt", [gangTaskDataJson], 'w');
}
