/**
 * @param rows Number of rows in the grid.
 * @param cols Number of columns in the grid.
 * @returns Number of unique paths that can be taken from pos (0, 0) to (rows - 1, cols - 1).
 */
export function solveUniquePathsInAGrid(grid : number[][]) : number{

	console.log("Coding-Contract: Unique Paths in a Grid");
    console.log(`Grid: ${grid}`);
	const start = new Date().getTime();

	function getUniquePaths(i : number, j : number) : number {
		if (i === grid.length - 1 && j === grid[0].length - 1) {
			return 1;
		} else {

			let rightPaths = 0;
			if (j < grid[0].length - 1) {
				if (grid[i][j + 1] !== 1) rightPaths = getUniquePaths(i, j + 1);
			}

			let downPaths = 0;
			if (i < grid.length - 1) {
				if (grid[i + 1][j] !== 1) downPaths = getUniquePaths(i + 1, j);
			}
			
			return rightPaths + downPaths;
		}
	}

	const solution = getUniquePaths(0, 0);

	const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");

	return solution;
}