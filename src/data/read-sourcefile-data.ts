import { NS, SourceFileLvl } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function readSourceFileData(ns: NS) : Promise<SourceFileLvl[]> {
	ns.disableLog("ALL");

    if (!ns.fileExists("/data/sourceFilesData.txt")) {
        throw new Error("Could not find file '/data/sourceFilesData.txt'. Please run /data/write-sourcefile-data.js.");
    }

    const sourceFilesDataJSON = ns.read("/data/sourceFilesData.txt");
    const sourceFilesData : SourceFileLvl[] = JSON.parse(sourceFilesDataJSON);
    return sourceFilesData;
}
