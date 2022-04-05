/**
 * @param {string} digits String of digits used to create expressions.
 * @param {number} target Target number to reach via mathematical operations.
 * @returns {number} Number of partitions of length > 1
 */
 export function solveFindAllValidMathExpressions(digits : string, target : number) : string[] {

    console.log("Coding-Contract: Find All Valid Math Expressions");
    console.log(`Digits: ${digits}`);
    console.log(`Target: ${target}`);
	const start = new Date().getTime();

    // Get list of numbers from the digit string
    const digitsArray = digits.split('');

    const operators = ['+', '-', '*', '']
    let solution : string[] = [];

    for (let i = 0; i < digitsArray.length; i++) {
        const digit = digitsArray[i];

        if (i === 0) {

            // If this is the first digit, populate the solution array with the digit followed by all operators
            if (digit === '0') continue;
            solution = solution.concat([digit].flatMap(d => operators.map(op => d + op)));
        } else if (i === digitsArray.length - 1) {

            // If we're at the end of the digit list, append the final digit to all expressions
            solution = solution.map(e => e + digit);
        } else {

            // Else if we're in the middle, add some digits, or operators to completion
            solution = solution.flatMap((e) =>  operators.map(op => e + digit + op));
        }
    }

    // Only return expressions that do not have leading 0s and correctly evaluate to our numerical target
    solution = solution.filter(e => e.match(/[\+\-\*]0[0-9]/g) === null && eval(e) === target);

    const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");

    return solution;
}
