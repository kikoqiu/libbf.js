import * as bfjs from "./bf.js";

/**
 * High-precision Sequence Limit using Wynn's Epsilon Algorithm (Shanks Transformation).
 *
 * This function estimates the limit of a sequence `f(n)` as `n` approaches infinity.
 * It is particularly effective for accelerating the convergence of slowly converging
 * alternating series or sequences.
 *
 * @param {Function|Array[number|string|bfjs.BigFloat]} f - The sequence generator.
 *        Must accept an integer (n) and return a BigFloat result (the n-th partial sum or term).
 *        f(0), f(1), f(2)... should generate the sequence to be accelerated.
 *
 * @param {Object} [info={}] - Configuration and Status object.
 * @param {number} [info._e=1e-30] - Absolute Error Tolerance.
 * @param {number} [info._re=info._e] - Relative Error Tolerance.
 * @param {number} [info.max_step=500] - Maximum number of terms to evaluate.
 * @param {number} [info.max_time=60000] - Maximum execution time in milliseconds.
 * @param {Function} [info.cb] - Optional callback function executed after each iteration.
 * @param {boolean} [info.debug] - Optional flag to enable debug logging.
 *
 *        // --- Output Status Properties ---
 * @param {BigFloat|null} info.result - The final calculated limit.
 * @param {BigFloat} info.lastresult - The best estimate from the most recent iteration.
 * @param {string} info.eff_result - String representation based on effective precision.
 * @param {number} info.steps - Current iteration number (n).
 * @param {BigFloat} info.error - Estimated absolute error.
 * @param {BigFloat} info.rerror - Estimated relative error.
 * @param {number} info.eff_decimal_precision - Estimated significant digits.
 *
 * @returns {BigFloat|null} 
 *        Returns the BigFloat limit value if tolerances are met, or null otherwise.
 */
export function shanks(f, info = {}) {
    let max_step = info.max_step || 200,
        max_time = info.max_time || 30000;
    let isArray = Array.isArray(f);
    if(isArray){
        max_step = Math.min(max_step,f.length-1);
        let fa=f;
        f = n=>fa[n] instanceof bfjs.BigFloat? fa[n] : bfjs.bf(fa[n]);
    }
    let _e  = info._e ?? 1e-30;
    let _re = info._re ?? _e;
    
    if (typeof(_e) != 'number' || typeof(_re) != 'number' || typeof(info) != "object") {
        throw new Error("arguments error");
    }

    let start_time = new Date().getTime();

    // Standardize toString helper (same as limit function)
    info.toString = function() {
        return `lastresult=${this.lastresult}, 
        effective_result=${this.eff_result},
        steps=${this.steps}/${max_step}, 
        error=${this.error ? this.error.toString(10, 3) : 'N/A'},
        rerror=${this.rerror ? this.rerror.toString(10, 3) : 'N/A'},
        eff_decimal_precision=${this.eff_decimal_precision}, 
        exectime=${this.exectime}/${max_time}`;
    };

    let e = bfjs.bf(_e), re = bfjs.bf(_re);
    let one = bfjs.bf(1);

    // Helper to update output info
    let updateInfo = () => {
        let prec = 0;
        if (!info.rerror || info.rerror.isZero() || info.rerror.isNaN()) {
            prec = bfjs.decimalPrecision();
        } else {
            try {
                let logErr = info.rerror.log();
                if (logErr.isFinite()) {
                    prec = Math.floor(-logErr.f64() / Math.log(10));
                } else {
                    prec = bfjs.decimalPrecision();
                }
            } catch(err) {
                prec = bfjs.decimalPrecision();
            }
        }
        
        if (!Number.isFinite(prec) || prec <= 0) {
            prec = 0;
            info.eff_decimal_precision = 0;
            info.eff_result = '';
        } else {
            info.eff_decimal_precision = prec;
            if (info.eff_decimal_precision > bfjs.decimalPrecision()) {
                info.eff_result = info.lastresult.toString(10);
            } else {
                info.eff_result = info.lastresult.toString(10, info.eff_decimal_precision);
            }
        }
    };

    // Wynn's Epsilon Table
    // table[n][k] stores epsilon_{k}^{(n-k)} roughly
    // We only need to store rows. table[n] is the n-th row.
    // k=0 is the original sequence, k=1 is 1st reciprocal, k=2 is 1st Shanks transform, etc.
    let table = [];

    // Initial State
    info.lastresult = bfjs.bf(0);
    info.error = bfjs.bf(1e100);
    info.rerror = bfjs.bf(1e100);

    // Loop n from 0 to max_step
    for (let n = 0; n <= max_step; ++n) {
        let currentRow = [];
        
        // 1. Calculate the raw sequence value S_n
        let val = f(n);
        currentRow[0] = val;

        // 2. Compute the Epsilon table for this row
        // Formula: E[n][k] = E[n-1][k-2] + 1 / (E[n][k-1] - E[n-1][k-1])
        // With implicit E[any][-1] = 0
        for (let k = 1; k <= n; ++k) {
            let prevRow = table[n - 1];
            
            // Denominator: E[n][k-1] - E[n-1][k-1]
            let diff = currentRow[k - 1].sub(prevRow[k - 1]);

            if (diff.isZero()) {
                currentRow[k] = currentRow[k-1]; 
                break;
            }

            let term2 = one.div(diff);
            
            let term1;
            if (k === 1) {
                // E[n-1][-1] is conceptually 0
                term1 = bfjs.bf(0);
            } else {
                // E[n-1][k-2]
                term1 = prevRow[k - 2];
            }

            currentRow[k] = term1.add(term2);
        }

        table[n] = currentRow;

        // 3. Analyze Error & Select Best Estimate
        // We only care about even columns (0, 2, 4...) as they are the sequence approximants.
        // Odd columns are divergent auxiliary values.
        
        let bestEst = currentRow[0]; // Default to raw value
        let currentMinErr = bfjs.bf(1e100);

        // If n=0, we only have raw value, no error estimate possible yet (set high)
        if (n > 0) {
            // Check raw convergence (k=0)
            currentMinErr = currentRow[0].sub(table[n-1][0]).abs();
        }

        // Iterate even columns k=2, 4, ...
        for (let k = 2; k < currentRow.length; k += 2) {
            if (!currentRow[k]) continue;

            // Error Estimation:
            // Compare current transformed value with the previous row's value of the same order.
            // Stability check: |E[n][k] - E[n-1][k]|
            if (table[n-1] && table[n-1].length > k) {
                let estErr = currentRow[k].sub(table[n-1][k]).abs();
                
                if (!estErr.isNaN() && estErr.cmp(currentMinErr) < 0) {
                    currentMinErr = estErr;
                    bestEst = currentRow[k];
                }
            }
        }

        // Calculate Relative Error
        let rerr;
        if (!bestEst.isZero()) {
            rerr = currentMinErr.div(bestEst.abs());
        } else {
            rerr = currentMinErr;
        }

        // Update Info
        info.exectime = new Date().getTime() - start_time;
        info.lastresult = bestEst;
        info.steps = n;
        info.error = currentMinErr;
        info.rerror = rerr;

        if (!!info.debug && n > 2) {
            console.log(`Shanks[${n}]: val=${bestEst.toString(10, 10)}, err=${currentMinErr.toString(10, 3)}`);
        }

        // 4. Convergence Check
        // Require at least a few steps to ensure stability (n > 2)
        // Check if error is within tolerance
        if (!isArray && n > 2 && (currentMinErr.cmp(e) <= 0 || rerr.cmp(re) <= 0)) {
            info.result = info.lastresult;
            updateInfo();
            return info.result;
        }

        // Time limit check
        if (info.exectime > max_time) {
            updateInfo();
            info.result = null; 
            return info.result;
        }

        if (info.cb) {
            updateInfo();
            info.cb();
        }
    }

    // Reached max_step without full convergence
    updateInfo();
    if(isArray){
        info.result = info.lastresult;
        return info.result;
    }

    info.result = null;
    return null;
}