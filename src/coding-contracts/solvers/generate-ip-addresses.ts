/**
 * @param {string} digits Digits from which to create IP addresses
 * @returns {string[]} All possible valid IP address combinations
 */
 export function solveGenerateIPAddresses(digits : string) : string[] {

    console.log("Coding-Contract: Generate IP Addresses");
    console.log(`Digits: ${digits}`);
	const start = new Date().getTime();

    // Can't have an IP address longer than 12 digits - reject that!
    if (digits.length > 12) return [];

	const digitsArray = digits.split('');
    let solution : string[] = [];
    const operators = ['.', ''];

    for (let i = 0; i < digitsArray.length; i++) {
        const digit = digitsArray[i];

        if (i === 0) {

            // If this is the first digit, populate the solution array with the digit followed by all operators
            solution = solution.concat([digit].flatMap(d => operators.map(op => d + op)));
        } else if (i === digitsArray.length - 1) {

            // If we're at the end of the digit list, append the final digit to all expressions
            solution = solution.map(e => e + digit);
        } else {
        
            // Else if we're in the middle, add some digits, or operators to completion
            solution = solution.flatMap((e) => { return operators.map(op => e + digit + op); });
        }
    }
    
    solution = solution.filter(x => x.match(/\./g)?.length === 3 && x.split('.').every(y => y.length <= 3 && parseInt(y) < 256 && !(y.length > 1 && y[0] === '0')));
    
    const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");

    return solution;
}