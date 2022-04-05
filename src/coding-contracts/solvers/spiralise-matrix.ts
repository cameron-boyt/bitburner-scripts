/**
 * @param {number[]} matrix Number matrix to be "spiralised".
 * @returns {number} Order of numbers from the matrix in a "spiralised" fashion.
 */
 export function solveSpiraliseMatrix(matrix : number[][]) : number[] {

    console.log("Coding-Contract: Spiralise Matrix");
    console.log("Matrix:");

    const maxLen = matrix.flat().sort((a, b) => b - a)[0].toString().length + 1;
    for (let i = 0; i < matrix.length; i++) {
        let rowstr = "";        
        for (let j = 0; j < matrix[0].length; j++) {
            const numstr = (matrix[i][j]).toString();
            rowstr += " ".repeat(maxLen - numstr.length) + numstr;
        }
        console.log(rowstr);
    }

	const start = new Date().getTime();

    const solution : number[] = [];

    // While there is anything left in the matrix
    topLoop: while (matrix.length > 0) {

        // Shift the entire top row into the solution array (forward traversal complete)
        const topRow = matrix.shift()
        if (topRow) { solution.push(...topRow); } else { break; }

        // Pop every last element from each row into the solution (downward traversal complete)
        for (const line of matrix) { 
            const rightMost = line.pop();
            if (rightMost) { solution.push(rightMost); } else { break topLoop; }
        }

        // Apend the last row of the matrix in reverse order (backward traversal complete)
        const bottomRow = matrix.pop();
        if (bottomRow) { solution.push(...bottomRow.reverse()); } else { break; }

        // Shift the first element of each row into the solution (upward traversal complete)
        const leftColumn : number[] = [];
        for (const line of matrix) {
            const leftMost = line.shift();
            if (leftMost) { leftColumn.push(leftMost) } else { break topLoop; }
        }
        solution.push(...leftColumn.reverse());
    }

    console.log(matrix);
    
    const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");

    return solution;
}