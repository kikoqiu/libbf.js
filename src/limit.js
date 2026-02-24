import * as bfjs from "./bf.js";

/**
 * High-precision Numerical Limit using Richardson Extrapolation.
 *
 * This function estimates the limit of `f(x)` as `x` approaches `point`.
 * It evaluates the function at a sequence of points converging to the target
 * and uses Richardson extrapolation to eliminate error terms, achieving high precision.
 *
 * @param {Function} f - The function to evaluate.
 *        Must accept a BigFloat argument (x) and return a BigFloat result (f(x)).
 *
 * @param {number|string|BigFloat} point - The target value to approach.
 *        Can be a finite number, or 'inf', '+inf', 'infinity' for positive infinity,
 *        '-inf', '-infinity' for negative infinity.
 *
 * @param {Object} [info={}] - Configuration and Status object.
 * @param {number} [info._e=1e-30] - Absolute Error Tolerance.
 * @param {number} [info._re=info._e] - Relative Error Tolerance.
 *
 *        // --- Input Configuration Properties ---
 * @param {boolean|Number} [info.useExp=false] - If true, uses exponential coordinate transformation.
 *        Useful for slowly converging limits (e.g. logarithmic) or limits at infinity.
 *        Use info.useExp as base number when it's a Number, otherwize use 2 as base number.
 *        For x->inf, substitutes x = pow(baseNumber,1/t).
 *        For x->c, substitutes x = c + dir * pow(baseNumber,-1/t).
 * @param {number} [info.max_step=100] - Maximum number of iterations (rows in the extrapolation table).
 * @param {number} [info.max_acc=15] - Maximum extrapolation order (columns in the table).
 * @param {number} [info.max_time=60000] - Maximum execution time in milliseconds.
 * @param {number} [info.direction=1] - Direction of approach for finite limits.
 *        1 for approaching from right (c + h), -1 for approaching from left (c - h).
 *        Ignored if point is infinite.
 * @param {Function} [info.cb] - Optional callback function executed after each iteration.
 * @param {boolean} [info.debug] - Optional flag to enable debug logging.
 *
 *        // --- Output Status Properties ---
 * @param {BigFloat|null} info.result - The final calculated limit.
 * @param {BigFloat} info.lastresult - The best estimate from the most recent iteration.
 * @param {string} info.eff_result - String representation based on effective precision.
 * @param {number} info.steps - Current iteration number.
 * @param {BigFloat} info.error - Estimated absolute error.
 * @param {BigFloat} info.rerror - Estimated relative error.
 * @param {number} info.eff_decimal_precision - Estimated significant digits.
 *
 * @returns {BigFloat|null} 
 *        Returns the BigFloat limit value if tolerances are met, or null otherwise.
 */
export function limit(f, point, info = {}) {
    let max_step = info.max_step || 100,
        max_acc = info.max_acc || 15,
        max_time = info.max_time || 60000;
    
    let _e  = info._e ?? 1e-30;
    let _re = info._re ?? _e;
    let useExp = !!info.useExp;
    let baseNumber = typeof(info.useExp) == "number"? info.useExp : 2;
    
    // Default direction: 1 (approach from right/above), -1 (approach from left/below)
    let direction = info.direction || 1; 

    if (typeof(_e) != 'number' || typeof(_re) != 'number' || typeof(info) != "object") {
        throw new Error("arguments error");
    }

    let start_time = new Date().getTime();
    
    // Standardize toString helper
    info.toString = function() {
        return `lastresult=${this.lastresult}, 
        effective_result=${this.eff_result},
        steps=${this.steps}/${max_step}, 
        error=${this.error ? this.error.toString(10, 3) : 'N/A'},
        rerror=${this.rerror ? this.rerror.toString(10, 3) : 'N/A'},
        eff_decimal_precision=${this.eff_decimal_precision}, 
        exectime=${this.exectime}/${max_time}`;
    };

    let target;
    let func = f;
    let h; // Initial step
    
    // 1. Handle Infinity and setup the target point & wrapper function
    let pointStr = String(point).toLowerCase();
    
    if (pointStr === 'inf' || pointStr === '+inf' || pointStr === 'infinity' || pointStr === '+infinity') {
        // Limit x->inf
        target = bfjs.bf(0); // We solve for t->0
        
        if (useExp) {
            // Transformation: x = pow(baseNumber,1/t)
            // Useful for logarithmic functions like 1/ln(x)
            func = (t) => f(bfjs.pow(baseNumber,bfjs.bf(1).div(t)));
        } else {
            // Transformation: x = 1/t
            func = (t) => f(bfjs.bf(1).div(t));
        }
        
        // Initial t = 1.0. As steps progress, t becomes 0.5, 0.25... 
        // leading to x increasing.
        h = bfjs.bf(1); 

    } else if (pointStr === '-inf' || pointStr === '-infinity') {
        // Limit x->-inf
        target = bfjs.bf(0);
        
        if (useExp) {
             // Transformation: x = -pow(baseNumber,1/t)
             func = (t) => f(bfjs.pow(baseNumber,bfjs.bf(1).div(t)).neg());
        } else {
             // Transformation: x = -1/t
             func = (t) => f(bfjs.bf(-1).div(t));
        }
        
        h = bfjs.bf(1);

    } else {
        // Finite limit: x->point
        target = bfjs.bf(point);
        let bfDirection = bfjs.bf(direction);

        if (useExp) {
            // Exponential approach to finite point: x = point + dir * pow(baseNumber,-1/t)
            // As t->0 (from 1), pow(baseNumber,-1/t) -> 0 very fast.
            func = (t) => {
                let displacement = bfjs.pow(baseNumber,bfjs.bf(1).div(t).neg()); // pow(baseNumber,-1/t)
                return f(target.add(bfDirection.mul(displacement)));
            };
             h = bfjs.bf(1);
        } else {
            // Standard linear approach: x = point + dir * t
            // Note: In the loop, we evaluate func(target + h). 
            // So we can keep original f and just adjust the input x directly in the loop 
            // OR wrap it. To be consistent with 'inf', we can wrap or just handle x calculation below.
            // Let's keep f as is and handle x calculation via h.
            func = f; 
            // Initial distance.
            h = bfjs.bf(direction); 
        }
    }

    let e = bfjs.bf(_e), re = bfjs.bf(_re);

    let updateInfo = () => {
        let prec = 0;
        if (!info.rerror || info.rerror.isZero() || info.rerror.isNaN()) {
            prec = bfjs.decimalPrecision();
        } else {
            // Log10 of relative error gives rough significant digits
            // Handle cases where log returns -Infinity or NaN
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
        
        // Safety cap for precision to ensure it's a valid integer
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

    // T stores the current row of the Richardson table
    // T[j] corresponds to the extrapolation of order j
    let T = []; 

    // Initial evaluation (Step 0)
    // If wrapping is used (inf or useExp), 'target' is 0 and 'h' is 1 (representing t).
    // If standard finite, 'target' is point and 'h' is step size.
    let x0 = target.add(h);
    T[0] = func(x0);
    
    info.lastresult = T[0];
    info.error = bfjs.bf(1e100); // Init high error
    info.rerror = bfjs.bf(1e100);

    // Keep track of the globally best result seen (in case of divergence later)
    let globalBest = T[0];
    let globalMinErr = bfjs.bf(1e100);

    for (let m = 1; m <= max_step; ++m) {
        let Tm = []; // New row
        
        // Halve the step size: h = h / 2
        h.setdiv(h, bfjs.bf(2));
        
        // Calculate new value at x = target + h
        let x = target.add(h);
        Tm[0] = func(x);

        // Richardson Extrapolation
        // Formula: R(m, j) = (t^k * R(m, j-1) - R(m-1, j-1)) / (t^k - 1)
        // factor = 2^j
        
        for (let j = 1; j <= max_acc && j <= m; ++j) {
            let factor = bfjs.bf(2).pow(j);
            let denom = factor.sub(bfjs.bf(1)); // 2^j - 1
            
            // Tm[j] = (Tm[j-1] * factor - T[j-1]) / denom
            let num = Tm[j-1].mul(factor).sub(T[j-1]);
            Tm[j] = num.div(denom);
        }

        // Robust Error Estimation & Best Result Selection
        // Richardson extrapolation assumes error terms are polynomials (c*h^k).
        // If convergence is super-linear (e.g. exponential due to useExp on rational functions),
        // Richardson extrapolation often overshoots and adds noise.
        // We compare the raw convergence error vs the extrapolated convergence error
        // to select the most stable value in the current row.

        let bestEst = Tm[0];
        // Initial error estimate based on step change of raw values
        let minErr = Tm[0].sub(T[0]).abs(); 
        
        // Check extrapolated columns
        for (let j = 1; j < Tm.length; j++) {
            // We estimate the error of Tm[j] by comparing it to its 
            // diagonal predecessor T[j-1] (which is R(m-1, j-1)).
            // This represents the change introduced by the new step size at this order.
            if (j - 1 < T.length) {
                 let est = Tm[j].sub(T[j-1]).abs();
                 // If this extrapolation is more consistent than the raw value or previous orders, pick it.
                 if (!est.isNaN() && est.cmp(minErr) < 0) {
                     minErr = est;
                     bestEst = Tm[j];
                 }
            }
        }
        
        let err = minErr;
        let rerr;
        if (!bestEst.isZero()) {
            rerr = err.div(bestEst.abs());
        } else {
            rerr = err;
        }

        if (!!info.debug && m > 2) {
            console.log(`Limit[${m}]: val=${bestEst.toString(10, 10)}, err=${err.toString(10, 3)}`);
        }

        info.exectime = new Date().getTime() - start_time;
        info.lastresult = bestEst;
        info.steps = m;
        info.error = err;
        info.rerror = rerr;
        
        // Track global best in case of future divergence
        if (err.cmp(globalMinErr) < 0) {
            globalMinErr = err;
            globalBest = bestEst;
        }

        // Convergence Check
        // Require m > 3 to avoid premature exit on flat functions or lucky coincidences (e.g. 2^0.5 vs 4^0.25)
        if (m > 3 && (err.cmp(e) <= 0 || rerr.cmp(re) <= 0)) {
            info.result = info.lastresult;
            updateInfo();
            return info.result;
        } else if (m == max_step || info.exectime > max_time) {
            updateInfo();
            info.result = null; // Failed to converge
            return info.result;
        }

        if (info.cb) {
            updateInfo();
            info.cb();
        }

        // Update previous row to current row
        T = Tm;
    }
    
    return null;
}


/**
 * High-precision Numerical Differentiation.
 * 
 * Computes the n-th derivative of function `f` at point `x` using the `limit` function
 * to extrapolate the finite difference quotient as the step size `h` approaches zero.
 *
 * @param {Function} f - The function to differentiate. 
 *        Must accept and return BigFloat.
 * @param {number|string|BigFloat} x - The point at which to compute the derivative.
 * @param {number} [n=1] - The order of the derivative (1st, 2nd, etc.).
 * @param {Object} [info={}] - Configuration object.
 * @param {boolean} [info.singular=false] - If true, avoids evaluating f(x) exactly 
 *        by shifting the sampling points (useful if x is a singularity).
 * @param {number} [info.direction=1] - Direction of the limit: 1 for forward, -1 for backward.
 * 
 * @returns {BigFloat|null} The n-th derivative at x, or null if convergence fails.
 */
export function diff(f, x, n = 1, info = {}) {
    const _x = bfjs.bf(x);
    const order = Math.floor(n);
    const isSingular = !!info.singular;
    
    if (order < 0) {
        throw new Error("Derivative order must be a non-negative integer.");
    }
    if (order === 0) return f(_x);

    // Precompute Binomial Coefficients (n choose k) for the n-th order difference formula
    const binom = [bfjs.bf(1)];
    for (let i = 1; i <= order; i++) {
        // C(n, k) = C(n, k-1) * (n - k + 1) / k
        let prev = binom[i - 1];
        let val = prev.mul(bfjs.bf(order - i + 1)).div(bfjs.bf(i));
        binom.push(val);
    }

    /**
     * The finite difference quotient function: g(h)
     * For n-th derivative: g(h) = [Sum_{k=0..n} (-1)^(n-k) * binom(n, k) * f(x + (k+s)h)] / h^n
     * where s=1 if singular, else s=0.
     */
    const differenceQuotient = (h) => {
        let sum = bfjs.bf(0);
        let offset = isSingular ? 1 : 0;

        for (let k = 0; k <= order; k++) {
            // Calculate point: x + (k + offset) * h
            let step = bfjs.bf(k + offset).mul(h);
            let samplePoint = _x.add(step);
            
            // Calculate term: (-1)^(order - k) * binom(order, k) * f(samplePoint)
            let term = f(samplePoint).mul(binom[k]);
            
            if ((order - k) % 2 === 1) {
                sum.setsub(sum, term);
            } else {
                sum.setadd(sum, term);
            }
        }

        // Divide by h^n
        return sum.div(h.pow(bfjs.bf(order)));
    };

    // Use the limit function to find the limit of differenceQuotient as h -> 0
    // We pass the same info object to inherit tolerances (_e, _re, max_step, etc.)
    return limit(differenceQuotient, 0, info);
}