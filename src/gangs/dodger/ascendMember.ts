import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const memberName = ns.args[1] as string;

    const result = ns.gang.ascendMember(memberName);

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
