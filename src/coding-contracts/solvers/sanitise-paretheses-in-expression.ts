/**
 * @param rows Number of rows in the grid.
 * @param cols Number of columns in the grid.
 * @returns Number of unique paths that can be taken from pos (0, 0) to (rows - 1, cols - 1).
 */
 export function solveSanitiseParenthesesInExpression(expression : string) : string[] {

    console.log("Coding-Contract: Sanitise Parentese In Expression");
    console.log(`Expression: ${expression}`);
	const start = new Date().getTime();

    // Else trim the excess fat (Forwards - remove ')')

    let solution : string[] = [expression];
    let pCount = 0;

    // Search forward
    for (let i = 0; i < expression.length; i++) {
        if (expression[i] === '(') pCount += 1;
        if (expression[i] === ')') pCount -= 1;

        // Too many closes
        if (pCount < 0) {

            // Amend all strings we have stored            
            const amended : string[] = [];

            for (const expr of solution) {

                // Remove one of all ')' up to this point 'i'
                for (let j = 0; j <= i; j++) {
                    if (expr[j] === ')') {
                        amended.push(expr.slice(0, j) + '#' + expr.slice(j + 1));
                    }
                }
            }

            solution = amended;

            // Treat the extra close as fixed
            pCount += 1;
        }
    }
      
    // Reset expression as we've now edited the number of '(' and ')'
    pCount = 0;
    expression = solution[0];

    // Search backwards
    for (let i = expression.length - 1; i >= 0; i--) {
        if (expression[i] === '(') pCount -= 1;
        if (expression[i] === ')') pCount += 1;

        // Too many opens
        if (pCount < 0) {

            // Amend all strings we have stored            
            const amended : string[] = [];

            for (const expr of solution) {

                // Remove one of all '(' up to this point 'i'
                for (let j = expr.length - 1; j >= i; j--) {
                    if (expr[j] === '(') { 
                        amended.push(expr.slice(0, j) + '#' + expr.slice(j + 1))
                    }
                }
            }

            solution = amended;

            // Treat the extra open as fixed
            pCount += 1;
        }
    }

    // Remove placeholder '#' characters and remove duplicates
    solution = solution.map(x => x.replaceAll('#', '')).filter((e, i, a) => a.indexOf(e) === i);

    const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");

    return solution;
}