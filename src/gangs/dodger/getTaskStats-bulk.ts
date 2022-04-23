import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const taskNames: string[] = JSON.parse(ns.args[1] as string);

    const result = taskNames.map((task) => ns.gang.getTaskStats(task));

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), "w");
}
