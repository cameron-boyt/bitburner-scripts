import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const name = ns.args[1] as string;

    const result = ns.gang.recruitMember(name);

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
