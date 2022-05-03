/**
 * @param s String to be compressed.
 * @returns Compressed string.
 */
export function solveCompressionRLECompress(s: string): string {
    console.log("Coding-Contract: Compression I: RLE Compression");
    console.log(`String: ${s}`);
    const start = new Date().getTime();

    s = s.trim();

    let lastChar = "";
    let charCount = 0;

    let solution = "";

    for (const char of s) {
        if (lastChar === "") {
            lastChar = char;
            charCount = 1;
        } else if (lastChar !== char) {
            solution += charCount.toString() + lastChar;
            lastChar = char;
            charCount = 1;
        } else {
            charCount++;
            if (charCount === 9) {
                solution += charCount.toString() + lastChar;
                lastChar = "";
                charCount = 0;
            }
        }
    }

    // Append the remaining characters
    if (charCount > 0 && lastChar !== "") solution += charCount.toString() + lastChar;

    const end = new Date().getTime();
    console.log(`Finished solver in ${end - start}ms`);
    console.log("Solution:");
    console.log(solution);
    console.log("---");

    return solution;
}

/**
 * @param s String to be decompressed.
 * @returns Decompressed string.
 */
export function solveCompressionLZDecompress(s: string): string {
    console.log("Coding-Contract: Compression II: LZ Decompression");
    console.log(`String: ${s}`);
    const start = new Date().getTime();

    s = s.trim();

    let chunkType = 0;
    let chunk = "";

    let solution = "";

    let i = 0;
    while (i < s.length) {
        if (chunkType === 0) {
            const chunkLength = parseInt(s[i]);
            chunk = s.slice(i + 1, i + chunkLength + 1);
            solution += chunk;

            i += chunkLength + 1;
            chunkType = 1;
        } else {
            const chunkLength = parseInt(s[i]);
            if (chunkLength === 0) {
                chunk = "";
                i++;
            } else {
                const chunkSlice = solution.slice(solution.length - parseInt(s[i + 1]));
                const extract = chunkSlice.repeat(10);
                solution += extract.slice(0, chunkLength);

                i += 2;
            }

            chunkType = 0;
        }
    }

    const end = new Date().getTime();
    console.log(`Finished solver in ${end - start}ms`);
    console.log("Solution:");
    console.log(solution);
    console.log("---");

    return solution;
}

/**
 * @param s String to be compressed.
 * @returns Compressed string.
 */
export function solveCompressionLZCompress(s: string): string {
    console.log("Coding-Contract: Compression III: LZ Compression");
    console.log(`String: ${s}`);
    const start = new Date().getTime();

    s = s.trim();

    let solution = "";

    // Double sliding window
    // [abc][defg]hij...
    // [abc][defgh]ij...
    // [abc][defghi]j...
    // [abc][defghij]...
    // [abcd][ef]ghij...
    // [abcd][efg]hij...

    let skipWindow = false;
    let ignoreWindowOne = false;
    let goodWindow = false;
    let chunkType = 0;

    for (let i = 0; i < s.length; i++) {
        for (let j = i + 1; j <= s.length; j++) {
            console.log(printWindows(s, i, j, -1, -1));
            ignoreWindowOne = false;

            // Capture the first window
            const windowOne = s.slice(i, j);

            // If windowOne is at length 9, consume
            if (windowOne.length === 9) {
                if (chunkType === 1) {
                    console.log(`adding 0`);
                    solution += "0";
                } else {
                    chunkType = 1;
                }
                console.log(`adding ${windowOne.length}${windowOne}`);
                solution += `${windowOne.length}${windowOne}`;

                // Move windowOne forward to the end of the string
                i = j;
                j = i;
                continue;
            }

            // If j is at or after the end of the input, directly add to the solution
            if (j >= s.length) {
                if (chunkType === 1) {
                    console.log(`adding 0`);
                    solution += "0";
                } else {
                    chunkType = 1;
                }
                console.log(`adding ${windowOne.length}${windowOne}`);
                solution += `${windowOne.length}${windowOne}`;

                // Move windowOne forward to the end of the string
                i = s.length;
                j = i;
                continue;
            }

            for (let a = j; a < s.length; a++) {
                for (let b = a + 2; b <= s.length; b++) {
                    // Capture the second window
                    const windowTwo = s.slice(a, b);

                    console.log(printWindows(s, i, j, a, b));

                    // Test if windowTwo is a substring of windowOne (including overlap)
                    if (isStringSubsetOfWindow(windowOne, windowTwo)[0]) {
                        if (!goodWindow && !ignoreWindowOne) {
                            // Append windowOne to the solution

                            // Account for chunk swap
                            if (chunkType === 1) {
                                console.log(`adding 0`);
                                solution += "0";
                            } else {
                                chunkType = 1;
                            }

                            // Add windowOne
                            console.log(`adding ${windowOne.length}${windowOne}`);
                            solution += `${windowOne.length}${windowOne}`;
                            goodWindow = true;
                        }

                        // If the end of windowTwo spans the end of the string,
                        // or windowTwo is at length 9,
                        // or the next character is not acceptable, consume
                        const subsetIsValid = isStringSubsetOfWindow(windowOne, s.slice(a, b + 1));
                        if (b >= s.length || windowTwo.length === 9 || !subsetIsValid[0]) {
                            const subInput = s.slice(0, a);
                            const searchString = isStringSubsetOfWindow(windowOne, windowTwo)[1];
                            console.log(searchString);
                            const indexOfWindowTwo = subInput.length - subInput.lastIndexOf(searchString);

                            // Append windowTwo to the solution

                            // Account for chunk swap
                            if (chunkType === 0) {
                                console.log(`adding 0`);
                                solution += "0";
                            } else {
                                chunkType = 0;
                            }

                            // Add windowTwo
                            console.log(`adding ${windowTwo.length}${indexOfWindowTwo}`);
                            solution += `${windowTwo.length}${indexOfWindowTwo}`;

                            // Move windowTwo forward to the end of the current windowTwo
                            a = b;
                            b = a + 2;

                            console.log(`check: ${printWindows(s, i, j, a, b)}`);

                            // Ignore the next attempted add of windowOne
                            ignoreWindowOne = true;

                            if (b >= s.length) {
                                i = a;
                                j = i;
                                break;
                            }

                            // Adjust so we don't miss a beat
                            //b -= 1;

                            // Reset windows, and mark that we need to skip to the next window set
                            goodWindow = false;
                        }
                    } else {
                        if (ignoreWindowOne) {
                            // If we're on the second windowTwo varient for this instance of windowOne,
                            // Set windowOne to start where windowTwo does
                            i = a;
                            j = i;
                        }
                        skipWindow = true;
                        break;
                    }
                }

                if (skipWindow) {
                    skipWindow = false;
                    break;
                }
            }
        }
    }

    const end = new Date().getTime();
    console.log(`Finished solver in ${end - start}ms`);
    console.log("Solution:");
    console.log(solution);
    console.log("---");

    return solution;
}

const isStringSubsetOfWindow = (one: string, two: string): [boolean, string] => {
    let maxAcceptableLength = one.length;

    while (maxAcceptableLength > 0) {
        const comparisonString = two.length > maxAcceptableLength ? two.slice(0, maxAcceptableLength) : two;

        //console.log(`Main string: ${one}, search string: ${two.slice(0, maxAcceptableLength)}`);
        const startIndex = one.indexOf(comparisonString);

        let skipIteration = false;

        let i = startIndex;
        for (const char of two) {
            if (one[i] === char) {
                i = i + 1 < one.length ? i + 1 : startIndex;
            } else {
                maxAcceptableLength -= 1;
                skipIteration = true;
                break;
            }
        }

        if (!skipIteration) {
            return [true, comparisonString];
        }
    }

    return [false, ""];
};

const printWindows = (str: string, i: number, j: number, a: number, b: number): string => {
    let outString = "";
    for (let k = 0; k < str.length; k++) {
        if (k === i) outString += "[";
        if (k === j) outString += "]";
        if (k === a) outString += "[";
        if (k === b) outString += "]";
        outString += str[k];
    }

    // Catch when the end of windowOne or windowTwo is the end of the string
    if (j >= str.length) outString += "]";
    if (b >= str.length) outString += "]";

    return outString;
};
