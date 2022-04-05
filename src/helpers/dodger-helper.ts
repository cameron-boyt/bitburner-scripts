import { NS } from '@ns'
import { IScriptRun, IScriptRunRequest } from '/data-types/dodger-data';
import { getFreeRam } from '/helpers/server-helper';

/**
 * [RAM DODGER]
 *
 * Run a command in a separate script instance to avoid compounding RAM costs.
 * @param ns NS object parameter.
 * @param script Name of script to run.
 * @param args Args to run with the script.
 * @returns Return value of the command embedded in the provided script.
 */
export async function runDodgerScript<T>(ns : NS, script : string, ...args : (string | boolean | number)[]) : Promise<T> {
    const uid = generateUID(script);
    //ns.print(`Creating ${uid}`);

    if (getFreeRam(ns, "home") < ns.getScriptRam(script)) {
        await ns.asleep(5);
    }

    const result = ns.run(script, 1, uid, ...args);
    if (result <= 0) {
        ns.print("FAIL | Failed catestrophically");
        ns.tail();
        ns.print(script);
        ns.print(uid);
        ns.print(args);
    }

    const filename = `/tmp/${uid}.txt`;

    while (!ns.fileExists(filename)) {
        await ns.asleep(5);
    }

    const data = ns.read(filename);
    ns.rm(filename)

    return JSON.parse(data) as T;
}

/**
 * Generate a new UID for a script run.
 * @returns A unique identifier for this script run.
 */
function generateUID(script : string) : string {
    const scriptStr = (script.split('/').pop() as string).slice(0, -3);
    const timeStr = Math.floor(performance.now()).toString();
    const uid = `${scriptStr}-${timeStr}`;

	return uid;
}

/**
 * [RAM DODGER]
 *
 * Run a list of scripts with the designated arguments to avoid compounding RAM costs.
 * @param ns NS object parameter.
 * @param scripts Array of script run objects.
 * @returns Output of the executed scripts.
 */
export async function runDodgerScriptBulk(ns : NS, scripts : IScriptRun[]) : Promise<unknown[]> {
    for (const script of scripts) {
        if (!ns.fileExists(script.script)) {
            throw new Error(`Unable to find script: ${script.script}`);
        }
    }

    const runs = generateBulkUIDs(scripts);

    for (const s of runs) {
        if (getFreeRam(ns, "home") < ns.getScriptRam(s.script)) {
            await ns.asleep(5);
        }

        //ns.print(`Creating ${s.uid}`);
        const result = ns.run(s.script, 1, s.uid, ...s.args);
        if (result <= 0) {
            ns.print("FAIL | Failed catestrophically");
            ns.tail();
            ns.print(s.script);
            ns.print(s.uid);
            ns.print(s.args);
        }
    }

    const results : unknown[] = [];

    for (const run of runs) {
        const filename = `/tmp/${run.uid}.txt`;
        while (!ns.fileExists(filename)) {
            await ns.asleep(5);
        }
        const data = ns.read(filename);
        results.push(JSON.parse(data));
        ns.rm(filename);
    }

    return results;
}

/**
 * Generate a new UID for each provided script run.
 * @param scripts Script runs array.
 * @returns Array of script run request objects, including script UIDs.
 */
function generateBulkUIDs(scripts : IScriptRun[]) : IScriptRunRequest[] {
    const timeStr = Math.floor(performance.now()).toString();
    let scriptCount = 1;

    const uids : IScriptRunRequest[] = scripts.map((s) => {
        const scriptStr = (s.script.split('/').pop() as string).slice(0, -3);
        const uid = `${scriptStr}-${timeStr}-${(`000${scriptCount++}`).slice(-4)}`;

        return {
            uid: uid,
            script: s.script,
            args: s.args
        };
    });

	return uids;
}
