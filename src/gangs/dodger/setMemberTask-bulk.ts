import { NS } from '@ns'
import { IGangTaskAssign } from '/data-types/gang-data';

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const tasksToAssign : IGangTaskAssign[] = JSON.parse(ns.args[1] as string);

    const result : boolean[] = [];

    for (const assign of tasksToAssign) {
        result.push(ns.gang.setMemberTask(assign.member, assign.task));
    }

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
