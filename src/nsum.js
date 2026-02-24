import * as bfjs from "./bf.js";

/**
 * High-precision Numerical Summation (Infinite/Finite Series).
 *
 * This function estimates the sum of `f(n)` for `n` from `start` to `end`.
 * For infinite series, it calculates a sequence of partial sums (doubling the number of terms each step)
 * and uses Richardson extrapolation to accelerate convergence.
 *
 * @param {Function} f - The term function.
 *        Must accept a BigFloat argument (n) and return a BigFloat result (f(n)).
 *
 * @param {Array<number|string|BigFloat>} range - The summation interval [start, end].
 *        e.g., [0, 100] or [1, 'inf'].
 *
 * @param {Object} [info={}] - Configuration and Status object.
 * @param {number} [info._e=1e-30] - Absolute Error Tolerance.
 * @param {number} [info._re=info._e] - Relative Error Tolerance.
 *
 *        // --- Input Configuration Properties ---
 * @param {number} [info.max_step=20] - Maximum number of doubling steps.
 *        Step m involves summing up to 2^m terms. Be careful increasing this, 
 *        as computational cost doubles with each step.
 * @param {number} [info.max_acc=15] - Maximum extrapolation order.
 * @param {number} [info.max_time=60000] - Maximum execution time in milliseconds.
 * @param {Function} [info.cb] - Optional callback function executed after each iteration.
 * @param {boolean} [info.debug] - Optional flag to enable debug logging.
 *
 *        // --- Output Status Properties ---
 * @param {BigFloat|null} info.result - The final calculated sum.
 * @param {BigFloat} info.lastresult - The best estimate from the most recent iteration.
 * @param {string} info.eff_result - String representation based on effective precision.
 * @param {number} info.steps - Current iteration number (row index m).
 *        Total terms summed approx 2^steps.
 * @param {number} info.terms_count - Total number of terms explicitly evaluated.
 * @param {BigFloat} info.error - Estimated absolute error.
 * @param {BigFloat} info.rerror - Estimated relative error.
 * @param {number} info.eff_decimal_precision - Estimated significant digits.
 *
 * @returns {BigFloat|null} 
 *        Returns the BigFloat sum if converged/completed, or null if failed.
 */
export function nsum(f, range, info = {}) {
    // Default configuration
    // Note: max_step defaults to 20 (approx 1 million terms), which is heavy for BigFloat.
    // Convergence usually happens much earlier for well-behaved series.
    let max_step = info.max_step || 20,
        max_acc = info.max_acc || 15,
        max_time = info.max_time || 60000;

    let _e  = info._e ?? 1e-30;
    let _re = info._re ?? _e;

    if (typeof(_e) != 'number' || typeof(_re) != 'number' || typeof(info) != "object" || !Array.isArray(range)) {
        throw new Error("arguments error: invalid info object or range array");
    }

    let start_time = new Date().getTime();

    // Setup helper for logging
    info.toString = function() {
        return `lastresult=${this.lastresult}, 
        effective_result=${this.eff_result},
        steps=${this.steps}/${max_step}, 
        terms_eval=${this.terms_count},
        error=${this.error ? this.error.toString(10, 3) : 'N/A'},
        rerror=${this.rerror ? this.rerror.toString(10, 3) : 'N/A'},
        eff_decimal_precision=${this.eff_decimal_precision}, 
        exectime=${this.exectime}/${max_time}`;
    };

    // Parse Range
    let n_start = bfjs.bf(range[0]);
    let end_val = range[1];
    let isInfinite = false;
    let n_end = null;

    let endStr = String(end_val).toLowerCase();
    if (endStr === 'inf' || endStr === '+inf' || endStr === 'infinity' || endStr === '+infinity') {
        isInfinite = true;
    } else {
        n_end = bfjs.bf(end_val);
    }

    let e = bfjs.bf(_e), re = bfjs.bf(_re);

    // Update Info helper
    let updateInfo = () => {
        if (!info.rerror || info.rerror.isZero()) {
            info.eff_decimal_precision = bfjs.decimalPrecision();
        } else {
            info.eff_decimal_precision = Math.floor(-info.rerror.log().f64() / Math.log(10));
        }
        
        if (info.eff_decimal_precision <= 0) {
            info.eff_decimal_precision = 0;
            info.eff_result = '';
        } else {
            if (info.eff_decimal_precision > bfjs.decimalPrecision()) {
                info.eff_result = info.lastresult.toString(10);
            } else {
                info.eff_result = info.lastresult.toString(10, info.eff_decimal_precision);
            }
        }
    };

    // Algorithm State
    let T = []; // Richardson table row
    let current_partial_sum = bfjs.bf(0);
    let current_n = bfjs.bf(n_start); // Current index iterator
    let terms_evaluated = 0;

    // We accumulate partial sums.
    // m=0: sum 1 term
    // m=1: sum 2 terms (add 1 more)
    // m=2: sum 4 terms (add 2 more)
    // ...
    // m: sum 2^m terms (add 2^(m-1) more)

    // Initial Step (m=0): Calculate first term
    if (!isInfinite && current_n.cmp(n_end) > 0) {
        // Empty range
        info.result = bfjs.bf(0);
        return info.result;
    }

    let term0 = f(current_n);
    current_partial_sum = term0.clone();
    
    // Move iterator
    current_n.setadd(current_n, bfjs.bf(1));
    terms_evaluated++;

    // Initialize table
    T[0] = current_partial_sum;

    info.lastresult = T[0];
    info.error = bfjs.bf(1e100);
    info.rerror = bfjs.bf(1e100);
    info.terms_count = terms_evaluated;

    // Check if we are done (Finite case: only 1 term requested)
    if (!isInfinite && current_n.cmp(n_end) > 0) {
        info.result = current_partial_sum;
        info.steps = 0;
        info.error = bfjs.bf(0);
        info.rerror = bfjs.bf(0);
        updateInfo();
        return info.result;
    }

    for (let m = 1; m <= max_step; ++m) {
        let Tm = []; // New row for Richardson table

        // 1. Extend the partial sum
        // Determine how many new terms to add: 2^(m-1)
        // Be careful not to exceed n_end if finite.
        let count_to_add = Math.pow(2, m - 1);
        let stop_iteration = false;

        for (let k = 0; k < count_to_add; k++) {
            // Check time budget inside the inner loop periodically (e.g., every 1000 terms) to avoid freeze
            if (k % 1000 === 0 && (new Date().getTime() - start_time > max_time)) {
                break; // handled by outer check
            }

            // Finite range check
            if (!isInfinite && current_n.cmp(n_end) > 0) {
                stop_iteration = true;
                break;
            }

            let term = f(current_n);
            current_partial_sum.setadd(current_partial_sum, term);
            
            // Advance n
            current_n.setadd(current_n, bfjs.one);
            terms_evaluated++;
        }

        info.terms_count = terms_evaluated;

        // If we finished a finite sum completely, we don't need extrapolation.
        // The current partial sum IS the result.
        if (stop_iteration) {
            info.result = current_partial_sum;
            info.steps = m;
            info.error = bfjs.bf(0); // Exact (numerically)
            info.rerror = bfjs.bf(0);
            info.exectime = new Date().getTime() - start_time;
            updateInfo();
            return info.result;
        }

        Tm[0] = bfjs.bf(current_partial_sum);

        // 2. Richardson Extrapolation
        // Series error usually expands in powers of 1/N, so factor is 2^j.
        // T[m][j] = (2^j * T[m][j-1] - T[m-1][j-1]) / (2^j - 1)
        for (let j = 1; j <= max_acc && j <= m; ++j) {
            let factor = bfjs.two.pow(j);
            let denom = factor.sub(bfjs.one);
            
            // Tm[j] = (Tm[j-1] * factor - T[j-1]) / denom
            let num = Tm[j-1].mul(factor).sub(T[j-1]);
            Tm[j] = num.div(denom);
        }

        // 3. Error Estimation
        let lastIdx = Tm.length - 1;
        let bestEst = Tm[lastIdx];
        
        // Error is diff between current best and previous row's best (or diagonal)
        let err = bestEst.sub(T[T.length - 1]).abs();
        let rerr;
        
        if (!bestEst.isZero()) {
            rerr = err.div(bestEst.abs());
        } else {
            rerr = err;
        }

        // Update Info
        info.exectime = new Date().getTime() - start_time;
        info.lastresult = bestEst;
        info.steps = m;
        info.error = err;
        info.rerror = rerr;

        // Debug logging
        if (!!info.debug && m > 2) {
            console.log(`NSum[${m}]: terms=${terms_evaluated}, val=${bestEst.toString(10, 10)}, err=${err.toString(10, 3)}`);
        }

        // 4. Convergence Check
        // Require at least a few iterations for extrapolation to stabilize
        if (m > 3 && (err.cmp(e) <= 0 || rerr.cmp(re) <= 0)) {
            info.result = info.lastresult;
            updateInfo();
            return info.result;
        } else if (m == max_step || info.exectime > max_time) {
            // Reached limits without strict convergence
            // Return best estimate so far, but result is null to indicate warning? 
            // Or return value? Based on `romberg` reference, it returns null.
            updateInfo();
            info.result = null; 
            return info.result;
        }

        if (info.cb) {
            updateInfo();
            info.cb();
        }

        T = Tm;
    }

    return null;
}