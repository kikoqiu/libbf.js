import * as bfjs from "./bf.js";
import { Complex } from "./bf.js";


/**
 * Calculates the roots of a polynomial with high precision using the Durand-Kerner method.
 * 
 * This function mimics MATLAB's `roots` command but supports arbitrary precision BigFloat numbers.
 * It solves for `x` in the polynomial equation:
 * c[0]*x^n + c[1]*x^(n-1) + ... + c[n] = 0
 * 
 * The algorithm iterates simultaneously towards all `n` roots, naturally handling complex conjugate pairs.
 *
 * @param {Array<number|string|BigFloat|Complex>} _coeffs - The polynomial coefficients.
 *        Must be ordered from highest degree to lowest (e.g., [1, -5, 6] for x^2 - 5x + 6).
 *        Leading zeros are automatically removed.
 * 
 * @param {Object} [info={}] - Configuration and Status object.
 * 
 *        // --- Input Configuration ---
 * @param {number} [info.max_step=500] - Maximum number of iterations. 
 *        Durand-Kerner usually converges quadratically, so 50-100 is typically sufficient for high precision.
 * @param {number} [info.max_time=60000] - Maximum execution time in milliseconds.
 * @param {number|string|BigFloat} [info._e=1e-30] - Convergence tolerance.
 *        The loop stops when the maximum change in any root position is smaller than this value.
 * @param {Function} [info.cb] - Optional callback function executed after each iteration.
 * 
 *        // --- Output Status (Updated during execution) ---
 * @param {Array<{re:BigFloat, im:BigFloat}>|null} info.result - The final array of roots.
 * @param {number} info.steps - Current iteration count.
 * @param {number} info.exectime - Elapsed time in ms.
 * @param {BigFloat} info.error - The maximum correction (shift magnitude) applied in the last step.
 *        Used as a proxy for the current error bound.
 * @param {number} info.eff_decimal_precision - Estimated significant decimal digits based on convergence error.
 * @param {string} info.eff_result - A string summary of the first root (for debugging/display).
 * @param {Function} info.toString - Helper to print status summary.
 * 
 * @returns {Array<Complex>|null} 
 *          Returns an array of objects representing complex numbers {re, im}.
 *          Returns `null` if the solver fails to converge within limits.
 */
export function roots(_coeffs, info = {}) {    
    // 1. Config & Initialization
    let max_step = info.max_step || 500;
    let max_time = info.max_time || 60000;
    let tol = bfjs.bf(info._e || 1e-30);
    const start_time = new Date().getTime();

    // Constant helpers
    const zero = bfjs.zero;
    const one = bfjs.one;

    // 2. Pre-processing: Convert all inputs to Complex objects
    let rawPoly = _coeffs.map(c => new Complex(c));

    // Remove leading zeros (leading coefficient cannot be 0)
    while (rawPoly.length > 0 && rawPoly[0].abs().cmp(zero) === 0) {
        rawPoly.shift();
    }

    let n = rawPoly.length - 1; // Degree

    // Update info helper
    const updateInfo = (iter, max_err, current_roots_arr) => {
        info.steps = iter;
        info.exectime = new Date().getTime() - start_time;
        info.error = max_err;
        
        // Calculate precision based on error
        let c=max_err.cmp(zero);
        if (c === 0) {
            info.eff_decimal_precision = bfjs.decimal_precision();
        } else if (c < 0) {
            info.eff_decimal_precision = 0;
        } else {
            info.eff_decimal_precision = Math.floor(-max_err.log().f64() / Math.log(10));
        }
        if(info.eff_decimal_precision < 0) info.eff_decimal_precision = 0;

        // Save result preview
        if (current_roots_arr) {
            info.lastresult = current_roots_arr;
            // Format string for first root
            let prec = Math.min(info.eff_decimal_precision, 10);
            info.eff_result = current_roots_arr[0].toString(10, prec) + ` ...(${n} roots)`;
        }
    };

    info.toString = function() {
        return `degree=${n}, 
      error=${this.error ? this.error.toString(10, 3) : 'N/A'},
      steps=${this.steps}/${max_step}, 
      eff_prec=${this.eff_decimal_precision},
      exectime=${this.exectime}/${max_time}`;
    };

    // Edge Cases
    if (n < 1) return []; // Empty or Constant
    if (n === 1) {
        // Linear: a*z + b = 0  =>  z = -b/a
        // coeffs are [a, b]
        let root = rawPoly[1].div(rawPoly[0]).neg();
        let res = [root];
        info.result = res;
        updateInfo(1, zero, res);
        return res;
    }

    // 3. Normalization (Make Monic)
    // P(z) = z^n + a[1]z^(n-1) + ... + a[n]
    // where a[i] = coeffs[i] / coeffs[0]
    // We store 'a' array such that index matches power offset or simply 1..n
    let a = []; 
    let c0 = rawPoly[0];
    for (let i = 1; i <= n; i++) {
        a.push(rawPoly[i].div(c0));
    }

    // 4. Initialization (Aberth's Initial Guess)
    // Place roots on a circle: R * exp(i * theta)
    // Radius R = 1 + max(|a_i|)
    let max_coeff_mag = zero;
    for (let coeff of a) {
        let m = coeff.abs();
        if (m.cmp(max_coeff_mag) > 0) max_coeff_mag = m;
    }
    let radius = one.add(max_coeff_mag);
    
    // Initial roots
    let current_roots = [];
    const pi = bfjs.bf(Math.PI);
    const two_pi = pi.mul(bfjs.bf(2));
    const offset = bfjs.bf(0.7); // Avoid symmetries
    
    for (let k = 0; k < n; k++) {
        let theta = two_pi.mul(bfjs.bf(k)).div(bfjs.bf(n)).add(offset);
        current_roots.push(Complex.fromPolar(radius, theta));
    }

    let max_change = zero;
    // 5. Durand-Kerner Iteration Loop
    for (let iter = 1; iter <= max_step; ++iter) {
        max_change = zero;

        let next_roots = new Array(n);

        for (let i = 0; i < n; i++) {
            let z = current_roots[i];

            // A. Evaluate P(z) using Horner's Method for Monic Polynomial
            // P(z) = (...((z + a_1)*z + a_2)*z + ... + a_n
            // Note: a[0] in our 'a' array corresponds to coeff of z^(n-1) (which is P_1)
            
            let p_val = z.add(a[0]); // First step: z + a_1
            for (let j = 1; j < n; j++) {
                p_val = p_val.mul(z).add(a[j]);
            }
            
            // B. Calculate Denominator: Product_{j != i} (z_i - z_j)
            let denom = new Complex(1, 0);
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                denom = denom.mul(z.sub(current_roots[j]));
            }

            // C. Calculate Shift
            // shift = P(z) / Product
            let shift = p_val.div(denom);
            
            // D. Update
            next_roots[i] = z.sub(shift);

            // Track convergence
            let change = shift.abs();
            if (change.cmp(max_change) > 0) {
                max_change = change;
            }
        }

        current_roots = next_roots;

        // Callback
        if (info.cb) {
            updateInfo(iter, max_change, current_roots);
            info.cb();
        }

        // Check Timeout
        if (new Date().getTime() - start_time > max_time) {
            updateInfo(iter, max_change, current_roots);
            console.log(`roots: Timeout after ${iter} steps.`);
            info.result = null;
            return null;
        }

        // Check Convergence
        if (max_change.cmp(tol) <= 0) {
            updateInfo(iter, max_change, current_roots);
            info.result = current_roots;
            return current_roots;
        }
    }

    // Failure
    updateInfo(max_step, max_change, current_roots);
    console.log(`roots: Failed to converge. Error: ${info.error.toString(10,3)}`);
    info.result = null;
    return null;
};



