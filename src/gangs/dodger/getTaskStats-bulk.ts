import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const taskNames : string[] = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const task of taskNames) {
        result.push(ns.gang.getTaskStats(task));
    }

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
