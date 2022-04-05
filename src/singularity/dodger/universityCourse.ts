import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const universityName = ns.args[1] as string;
    const courseName = ns.args[2] as string;

    const result = ns.universityCourse(universityName, courseName);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
