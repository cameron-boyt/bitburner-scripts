import { GangOtherInfoObject, NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const gangNames: string[] = JSON.parse(ns.args[1] as string);

    const otherGangInfo: Record<string, GangOtherInfoObject> = ns.gang.getOtherGangInformation() as unknown as Record<string, GangOtherInfoObject>;

    const result = gangNames.map((gang) => otherGangInfo[gang]);

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), "w");
}
