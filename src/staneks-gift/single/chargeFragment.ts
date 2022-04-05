import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const x = ns.args[0] as number;
    const y = ns.args[1] as number;
    await ns.stanek.chargeFragment(x, y);
}
