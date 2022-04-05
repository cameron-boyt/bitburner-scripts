import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;

    const company = ns.args[1] as string;

    let done = false;

    try {
        for (let i = 0; i < 5; i++) ns.applyToCompany(company, "software");
        done = true;
    } catch (e) {
        ns.print("oopsies");
    }

    if (!done) {
        try {
            for (let i = 0; i < 5; i++) ns.applyToCompany(company, "business");
            done = true;
        } catch (e) {
            ns.print("oopsies");
        }
    }

    if (!done) {
        try {
            for (let i = 0; i < 5; i++) ns.applyToCompany(company, "security");
            done = true;
        } catch (e) {
            ns.print("oopsies");
        }
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(1), 'w');
}
