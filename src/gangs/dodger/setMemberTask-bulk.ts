import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const tasksToAssign: [string, string][] = JSON.parse(ns.args[1] as string);

    const result = tasksToAssign.map((taskAssign) => ns.gang.setMemberTask(taskAssign[0], taskAssign[1]));

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), "w");
}
