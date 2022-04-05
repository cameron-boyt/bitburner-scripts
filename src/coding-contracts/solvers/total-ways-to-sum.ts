/**
 * @param {number} n Number which we want to find out the totals partitions for.
 * @returns {number} Number of partitions of length > 1
 */
export function solveTotalWaysToSum(n : number) : number {

    console.log("Coding-Contract: Total Ways to Sum");
    console.log(`Number: ${n}`);
	const start = new Date().getTime();

    function p(n : number) : number {
        if (n === 0) return 0;

        function pk(k : number, n : number) : number {
            if (k === 0 && n === 0) return 1;
            if ((n <= 0 || k <= 0) && !(n === 0 && k === 0)) return 0;
            else return pk(k, n - k) + pk(k - 1, n - 1)
        }

        let sum = 0;
        for (let i = 0; i <= n; i++) { sum += pk(i, n); }
        return sum;
    }
    
    const solution = p(n) - 1;

    const end = new Date().getTime();
	console.log(`Finished solver in ${end-start}ms`);
	console.log("Solution:");
	console.log(solution);
	console.log("---");

    return solution;
}