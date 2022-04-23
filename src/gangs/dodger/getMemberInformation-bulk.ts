import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const memberNames: string[] = JSON.parse(ns.args[1] as string);

    const result = memberNames.map((member) => ns.gang.getMemberInformation(member));

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), "w");
}
