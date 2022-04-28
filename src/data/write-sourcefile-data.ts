import { NS } from "@ns";

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const sourceFilesData = ns.getOwnedSourceFiles();

    const sourceFilesDataJSON = JSON.stringify(sourceFilesData);

    ns.print(sourceFilesDataJSON);

    await ns.write("/data/sourceFilesData.txt", [sourceFilesDataJSON], "w");
}
