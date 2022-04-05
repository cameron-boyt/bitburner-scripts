/**
 * @param {number[][]} intervals Array number intervals.
 * @returns {number[][]} Merged intervals.
 */
export function solveMergeOverlappingIntervals(intervals : number[][]) : number[][] {

	console.log("Coding-Contract: Merge Overlapping Intervals");
    console.log(`Intervals: ${intervals}`);
	const start = new Date().getTime();

	const solution = intervals.sort((a, b) => a[0] - b[0]);

	let merge = true;

	while (merge) {
		merge = false;

		for (let i = 0; i < solution.length - 1; i++) {
			if (solution[i][1] >= solution[i + 1][0]) {
				merge = true;

				if (solution[i][1] < solution[i + 1][1]) {
					solution[i][1] = solution[i + 1][1];
				}

				solution.splice(i + 1, 1);

				break;
			}
		}
	}

	const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");

	return solution;
}