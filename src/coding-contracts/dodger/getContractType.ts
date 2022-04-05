import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const contractName = ns.args[1] as string;
    const contractHostname = ns.args[2] as string;

    const result = ns.codingcontract.getContractType(contractName, contractHostname)

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
