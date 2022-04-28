import { NS } from "@ns";

// Script refresh period
const refreshPeriod = 15000;

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
 */

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const companies = [
        "ECorp",
        "MegaCorp",
        "KuaiGong International",
        "Four Sigma",
        "NWO",
        "Blade Industries",
        "OmniTek Incorporated",
        "Bachman & Associates",
        "Clarke Incorporated",
        "Fulcrum Technologies",
    ];

    while (true) {
        for (const company of companies) {
            ns.singularity.applyToCompany(company, "software");
        }

        await ns.asleep(refreshPeriod);
    }
}
