import * as bfjs from "./bf.js";
import { bf, BigFloat } from "./bf.js";



/**
 * Cache for Bernoulli numbers to avoid redundant computations
 * The cache is always in current precision. Clear the cache if you want to update.
 * @private
 */ 
let B_CACHE = [];

export function clearBernoulliCache(){
    B_CACHE=[];
}

/**
 * Bernoulli numbers B_n using Ramanujan's recursive formula for small n
 * and the Zeta relationship for large n.
 * 
 * Ramanujan's Formula (speeds up recursion):
 * sum_{k=0}^n [ C(6n+3, 6k) * B_{6k} ] = (2n+1)/2
 * 
 * @param {number} n - The index of the Bernoulli number.
 * @returns {BigFloat}
 */
export function bernoulli(n) {
    if(B_CACHE.length==0){
        B_CACHE.push(new BigFloat(bf(1),10,false,true));
        B_CACHE.push(new BigFloat(bf(-1).div(2),10,false,true));
    }

    if (n < 0) throw new Error("Index must be non-negative");
    if (n > 1 && n % 2 !== 0) return bf(0);
    if (B_CACHE[n] !== undefined) return B_CACHE[n];


    // Use Ramanujan's formula for small n (n < 40)
    // For n >= 40, Zeta-based formula is faster and extremely accurate 
    // because Zeta(n) converges to 1 exponentially.
    if (n < 40) {
        // Standard recursive formula (as Ramanujan's full 6n+3 block is complex to implement for arbitrary n)
        // sum_{k=0}^n [ C(n+1, k) * B_k ] = 0
        let s = bf(0);
        const n_plus_1 = n + 1;
        
        // Iterative Binomial Coefficient helper
        let binom = bf(1); // C(n+1, 0)
        for (let k = 0; k < n; k++) {
            s = s.add(binom.mul(bernoulli(k)));
            // Update binom for next k: C(n+1, k+1) = C(n+1, k) * (n+1-k)/(k+1)
            binom = binom.mul(bf(n_plus_1 - k)).div(bf(k + 1));
        }
        
        const res = s.div(bf(n_plus_1)).neg();
        B_CACHE[n] = res;
        return res;
    }

    // For large n, use Zeta relation:
    // |B_2k| = 2 * (2k)! * ζ(2k) / (2 * pi)^(2k)
    const k = n / 2;
    const pi = bfjs.PI;
    const twoPi = pi.mul(bf(2));
    
    // Calculate (n)!
    let fact = bf(1);
    for (let i = 2; i <= n; i++) fact = fact.mul(bf(i));
    
    // zeta(n) for even n converges very fast
    // We compute zeta(n) using its definition sum_{m=1}^inf m^-n
    // because for n >= 40, a few terms give hundreds of digits.
    let z = bf(1);
    const eps = bf(bfjs.getEpsilon()*1e-3);
    for (let m = 2; m < 1000; m++) {
        const term = bf(m).pow(bf(-n));
        z = z.add(term);
        if (term.cmp(eps) < 0) break;
    }
    
    let res = bf(2).mul(fact).mul(z).div(twoPi.pow(bf(n)));
    
    // Sign is (-1)^(k+1)
    if ((k + 1) % 2 !== 0) res = res.neg();
    
    B_CACHE[n] = new BigFloat(res,10,false,true);
    return B_CACHE[n];
}