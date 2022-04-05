import { GangTaskStats, NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function readGangTaskData(ns: NS) : Promise<GangTaskStats[]> {
	ns.disableLog("ALL");

    if (!ns.fileExists("/data/gangTaskData.txt")) {
        throw new Error("Could not find file '/data/gangTaskData.txt'. Please run /data/write-gangTask-data.js.")
    }

    const gangTaskDataJson = ns.read("/data/gangTaskData.txt");
    const gangTaskData : GangTaskStats[] = JSON.parse(gangTaskDataJson);
    return gangTaskData;
}
