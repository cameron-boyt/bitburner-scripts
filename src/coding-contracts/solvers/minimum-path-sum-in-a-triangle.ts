/**
 * @param {number[][]} triangle Array of increasing row sizes i.e. [[1], [2,3], [4,5,6]]
 * @returns {number} Minimum possible path sum.
 */
 export function solveMinimumPathSumInATriangle(triangle : number[][]) : number {

    console.log("Coding-Contract: Minimum Path Sum in a Triangle");
    console.log(`Triangle: ${triangle}`);
	const start = new Date().getTime();

    function traverseTriangle(row : number, col : number) : number {
        if (row === triangle.length - 1) {
            return triangle[row][col];
        } else {
            return triangle[row][col] + Math.min(traverseTriangle(row + 1, col), traverseTriangle(row + 1, col + 1));
        }
    }

    const solution = traverseTriangle(0, 0);

    const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");
    
    return solution;
}