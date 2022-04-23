import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const gangNames: string[] = JSON.parse(ns.args[1] as string);

    const result = gangNames.map((gang) => ns.gang.getChanceToWinClash(gang));

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), "w");
}
