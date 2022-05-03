import { NS } from "@ns";
import { solveCompressionLZCompress, solveCompressionLZDecompress, solveCompressionRLECompress } from "/coding-contracts/solvers/compression";

function performTestOne(ns: NS, input: string, output: string): boolean {
    const result = solveCompressionRLECompress(input);
    if (result !== output) {
        ns.print(`${result} !== ${output}`);
    }
    return result === output;
}

function performTestTwo(ns: NS, input: string, output: string): boolean {
    const result = solveCompressionLZDecompress(input);
    if (result !== output) {
        ns.print(`${result} !== ${output}`);
    }
    return result === output;
}

function performTestThree(ns: NS, input: string, output: string): boolean {
    const result = solveCompressionLZCompress(input);
    if (result !== output) {
        ns.print(`${result} !== ${output}`);
    }
    return result === output;
}

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    const testOne: { input: string; output: string }[] = [
        {
            input: "aaaaabccc",
            output: "5a1b3c"
        },
        {
            input: "aAaAaA",
            output: "1a1A1a1A1a1A"
        },
        {
            input: "111112333",
            output: "511233"
        },
        {
            input: "zzzzzzzzzzzzzzzzzzz",
            output: "9z9z1z"
        }
    ];

    const testTwo: { input: string; output: string }[] = [
        {
            input: "5aaabc340533bca",
            output: "aaabcaabaabaabca"
        }
    ];

    const testThree: { input: string; output: string }[] = [
        {
            input: "abracadabra",
            output: "7abracad47"
        },
        {
            input: "mississippi",
            output: "4miss433ppi"
        },
        {
            input: "aAAaAAaAaAA",
            output: "3aAA53035"
        },
        {
            input: "2718281828",
            output: "627182844"
        },
        {
            input: "abcdefghijk",
            output: "9abcdefghi02jk"
        },
        {
            input: "aaaaaaaaaaa",
            output: "1a911a"
        },
        {
            input: "aaaaaaaaaaaa",
            output: "1a912aa"
        },
        {
            input: "aaaaaaaaaaaaa",
            output: "1a91031"
        }
    ];

    ns.print("-- Starting Tests for Compression I --");
    for (const test of testOne) {
        ns.print(`Input: ${test.input} => ${performTestOne(ns, test.input, test.output)}`);
    }

    ns.print("-- Starting Tests for Compression II --");
    for (const test of testTwo) {
        ns.print(`Input: ${test.input} => ${performTestTwo(ns, test.input, test.output)}`);
    }

    ns.print("-- Starting Tests for Compression III --");
    for (const test of testThree) {
        ns.print(`Input: ${test.input} => ${performTestThree(ns, test.input, test.output)}`);
    }

    //const test: { input: [number, number[]]; output: number } = { input: [9, [134, 181, 115, 129, 165, 65]], output: 97 };
    //ns.print(`${test.input[0]} trades, ${test.input[1].length} days => ${performTest(ns, test.input[0], test.input[1], test.output)}`);
}
