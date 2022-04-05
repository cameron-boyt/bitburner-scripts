import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const otherGangInfo = ns.gang.getOtherGangInformation();

    const result = [
        { name: "Slum Snakes",           power: otherGangInfo['Slum Snakes'].power,           territory: otherGangInfo['Slum Snakes'].territory },
        { name: "NiteSec",               power: otherGangInfo['NiteSec'].power,               territory: otherGangInfo['NiteSec'].territory },
        { name: "Speakers for the Dead", power: otherGangInfo['Speakers for the Dead'].power, territory: otherGangInfo['Speakers for the Dead'].territory },
        { name: "Tetrads",               power: otherGangInfo['Tetrads'].power,               territory: otherGangInfo['Tetrads'].territory },
        { name: "The Black Hand",        power: otherGangInfo['The Black Hand'].power,        territory: otherGangInfo['The Black Hand'].territory },
        { name: "The Dark Army",         power: otherGangInfo['The Dark Army'].power,         territory: otherGangInfo['The Dark Army'].territory },
        { name: "The Syndicate",         power: otherGangInfo['The Syndicate'].power,         territory: otherGangInfo['The Syndicate'].territory }
    ];

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
