import { NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
    const args = ns.flags([["help", false]]);
    if (args.help) {
        ns.tprint("This script will enhance your HUD (Heads up Display) with custom statistics.");
        ns.tprint(`Usage: run ${ns.getScriptName()}`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()}`);
        return;
    }

    const doc = eval("document"); // This is expensive! (25GB RAM) Perhaps there's a way around it? ;)
    const hook0 = doc.getElementById('overview-extra-hook-0');
    const hook1 = doc.getElementById('overview-extra-hook-1');
    while (true) {
        try {
            const headers = []
            const values = [];

            // Add Karma
            headers.push("Karma");
            values.push(ns.nFormat(Math.floor(ns.heart.break()), '0.00a'));

            // Add Hacknet Production
            headers.push("Node Prod");
            let prod = 0;
            for (let i = 0; i < ns.hacknet.numNodes(); i++) { prod += ns.hacknet.getNodeStats(i).production; }
            values.push(ns.nFormat(prod, '$0.00a') + "/s");

            // Add Share Power
            headers.push("Share");
            values.push("x" + ns.getSharePower().toFixed(2));


            // TODO: Add more neat stuff

            // Now drop it into the placeholder elements
            if (hook0) hook0.innerText = headers.join(" \n");
            if (hook1) hook1.innerText = values.join("\n");
        } catch (err) { // This might come in handy later
            ns.print("ERROR: Update Skipped: " + String(err));
        }
        await ns.asleep(1000);
    }
}
