/**
 * @param array Input array of numbers.
 * @returns Subarray with the maximal sum.
 */
export function solveSubarrayWithMaximumSum(array : number[]) : number{

	console.log("Coding-Contract: Subarray with Maximum Sum");
    console.log(`Array: ${array}`);
	const start = new Date().getTime();

	let solution = 0;

	for (let i = 0; i < array.length; i++) {
		for (let j = i + 1; j <= array.length; j++) {
			solution = Math.max(solution, array.slice(i, j).reduce((a, b) => a + b, 0));
		}
	}

	const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");

	return solution;
}