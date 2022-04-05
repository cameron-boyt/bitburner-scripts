/**
 * @param n Number to get largest prime factor for.
 * @returns Largest prime factor of n
 */
export function solveFindLargestPrimeFactor(n : number) : number {

	console.log("Coding-Contract: Find Largest Prime Factor");
    console.log(`Number: ${n}`);
	const start = new Date().getTime();

	const factors = [];

	let d = 2;

	while (n > 1) {
		while (n % d == 0) {
			factors.push(d);
			n /= d;
		}

		d += 1;
	}

	const solution = factors.reduce((a, b) => (a > b ? a : b));

	const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");
	
	return solution;
}