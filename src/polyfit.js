import * as bfjs from "./bf.js";

/**
 * High-precision Polynomial Curve Fitting using Least Squares Method.
 *
 * Finds the coefficients of a polynomial p(x) of degree n that fits the data, 
 * minimizing the sum of the squared errors.
 *
 * Coefficients are returned in descending powers (MATLAB style):
 * p(x) = c[0]*x^n + c[1]*x^(n-1) + ... + c[n-1]*x + c[n]
 *
 * @param {Array<number|string|BigFloat>} x - Array of x-coordinates.
 * @param {Array<number|string|BigFloat>} y - Array of y-coordinates.
 * @param {number} order - The degree of the polynomial to fit (n).
 *
 * @param {Object} [info={}] - Configuration and Status object.
 * @param {number} [info.max_time=60000] - Maximum execution time in milliseconds.
 * @param {boolean} [info.debug] - Enable debug logging.
 *
 *        // --- Output Status Properties ---
 * @param {Array<BigFloat>|null} info.result - Array of coefficients (descending order).
 * @param {BigFloat} info.ssr - Sum of Squared Residuals (Error).
 * @param {BigFloat} info.r_squared - Coefficient of determination (0 to 1).
 * @param {BigFloat} info.rmse - Root Mean Square Error.
 * @param {number} info.exectime - Elapsed execution time.
 * @param {Function} info.toString - Helper to format the result.
 *
 * @returns {Array<BigFloat>|null} 
 *        Returns array of BigFloat coefficients if successful, null otherwise.
 */
export function polyfit(x, y, order, info = {}) {
    let max_time = info.max_time || 60000;
    let start_time = new Date().getTime();

    // 1. Input Validation and Conversion
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length === 0) {
        throw new Error("Input arrays x and y must be non-empty and of equal length.");
    }
    if (order < 0 || order >= x.length) {
        // Technically strict polyfit requires order < N, but we'll allow order <= N-1 (N points determine degree N-1)
        throw new Error("Polynomial degree must be non-negative and less than the number of data points.");
    }

    // Convert inputs to BigFloat
    const X = x.map(val => bfjs.bf(val));
    const Y = y.map(val => bfjs.bf(val));
    const N = X.length;
    const M = order + 1; // Number of coefficients

    // Initialize info object
    info.result = null;
    info.ssr = bfjs.bf(0);
    info.r_squared = bfjs.bf(0);
    info.exectime = 0;
    info.toString = function() {
        if (!this.result) return "No result";
        return `degree=${order}, 
        R^2=${this.r_squared.toString(10, 6)}, 
        SSR=${this.ssr.toString(10, 6)}, 
        exectime=${this.exectime}ms`;
    };

    // 2. Build the Normal Equations Matrix (Linear System)
    // We need to solve A * c = B, where A is (order+1)x(order+1) and B is (order+1) vector.
    // A[j][k] = Sum(x_i ^ (j+k)), B[j] = Sum(x_i^j * y_i)
    // Indices j, k go from 0 to order.

    // Pre-calculate powers of X to avoid re-computing inside the loop (Optimization)
    // powers[i][p] = X[i]^p
    const powers = new Array(N);
    const max_pow = 2 * order;
    for (let i = 0; i < N; i++) {
        powers[i] = new Array(max_pow + 1);
        powers[i][0] = bfjs.bf(1); // x^0
        for (let p = 1; p <= max_pow; p++) {
            powers[i][p] = powers[i][p - 1].mul(X[i]);
        }
    }

    const A = []; // LHS Matrix
    const B = []; // RHS Vector

    for (let j = 0; j < M; j++) {
        const row = [];
        let sumB = bfjs.bf(0);

        for (let k = 0; k < M; k++) {
            let sumA = bfjs.bf(0);
            // Sum over all data points
            for (let i = 0; i < N; i++) {
                sumA = sumA.add(powers[i][j + k]);
            }
            row.push(sumA);
        }
        
        for (let i = 0; i < N; i++) {
            // B[j] = sum(x_i^j * y_i)
            // powers[i][j] is x_i^j
            sumB = sumB.add(powers[i][j].mul(Y[i]));
        }

        A.push(row);
        B.push(sumB);

        // Time check
        if (new Date().getTime() - start_time > max_time) {
            info.exectime = new Date().getTime() - start_time;
            return null; // Timeout
        }
    }

    // 3. Solve Linear System A * C = B using Gaussian Elimination with Partial Pivoting
    // Result C will be [c0, c1, ..., cn] where y = c0 + c1*x + ...
    try {
        const coeffs = solveLinearSystem(A, B);

        // 4. Post-processing
        // MATLAB polyfit returns highest degree first. 
        // Our coeffs are ascending (c0 + c1*x...), so we reverse.
        info.result = coeffs.reverse(); 

        // 5. Calculate Statistics (SSR, R^2)
        // Re-evaluate polynomial at data points
        // We use the non-reversed coeffs for calculation here (c0 + c1*x...) or handle indices carefully.
        // Let's use Horner's method with the descending result we just stored.
        
        let ss_res = bfjs.bf(0); // Sum of Squared Residuals
        let sum_y = bfjs.bf(0);
        
        for(let i=0; i<N; i++) sum_y = sum_y.add(Y[i]);
        const mean_y = sum_y.div(bfjs.bf(N));
        let ss_tot = bfjs.bf(0); // Total Sum of Squares

        for (let i = 0; i < N; i++) {
            // Evaluate P(x)
            let y_pred = bfjs.bf(0);
            // Horner's method: result is [c_n, c_{n-1}, ..., c_0]
            for (let k = 0; k < info.result.length; k++) {
                y_pred = y_pred.mul(X[i]).add(info.result[k]);
            }

            const res = Y[i].sub(y_pred);
            ss_res = ss_res.add(res.mul(res));
            
            const dev = Y[i].sub(mean_y);
            ss_tot = ss_tot.add(dev.mul(dev));
        }

        info.ssr = ss_res;
        info.rmse = ss_res.div(bfjs.bf(N)).sqrt();
        
        if (!ss_tot.isZero()) {
            info.r_squared = bfjs.bf(1).sub(ss_res.div(ss_tot));
        } else {
            info.r_squared = bfjs.bf(1); // Perfect fit (variance is 0)
        }

    } catch (e) {
        if (info.debug) console.error("Polyfit Solver Error:", e);
        info.result = null;
    }

    info.exectime = new Date().getTime() - start_time;
    return info.result;
}

/**
 * Helper: Solve Ax = b using Gaussian Elimination with Partial Pivoting
 * @param {Array<Array<BigFloat>>} A - Matrix (modified in place)
 * @param {Array<BigFloat>} b - Vector (modified in place)
 * @returns {Array<BigFloat>} x - Solution vector
 */
export function solveLinearSystem(A, b) {
    const n = A.length;
    // Deep copy to avoid modifying original A/B outside if needed, 
    // but here A/B are local to polyfit so we modify directly for speed.
    // However, A and b passed here are arrays of references to BigFloats. 
    // Operations create new BigFloats, so original matrix numbers aren't mutated, 
    // but the array structure is.

    // Forward Elimination
    for (let i = 0; i < n; i++) {
        // Pivot selection
        let pivotRow = i;
        let maxVal = A[i][i].abs();
        
        for (let k = i + 1; k < n; k++) {
            if (A[k][i].abs().cmp(maxVal) > 0) {
                maxVal = A[k][i].abs();
                pivotRow = k;
            }
        }

        // Swap rows
        if (pivotRow !== i) {
            [A[i], A[pivotRow]] = [A[pivotRow], A[i]];
            [b[i], b[pivotRow]] = [b[pivotRow], b[i]];
        }

        if (A[i][i].isZero()) {
            throw new Error("Matrix is singular or ill-conditioned.");
        }

        // Elimination
        for (let k = i + 1; k < n; k++) {
            const factor = A[k][i].div(A[i][i]);
            b[k] = b[k].sub(factor.mul(b[i]));
            for (let j = i; j < n; j++) {
                A[k][j] = A[k][j].sub(factor.mul(A[i][j]));
            }
        }
    }

    // Back Substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        let sum = bfjs.bf(0);
        for (let j = i + 1; j < n; j++) {
            sum = sum.add(A[i][j].mul(x[j]));
        }
        x[i] = b[i].sub(sum).div(A[i][i]);
    }

    return x;
}

/**
 * Helper: Evaluate polynomial at x (MATLAB polyval style)
 * @param {Array<BigFloat>} p - Coefficients [c_n, ..., c_0]
 * @param {BigFloat|number} x 
 * @returns {BigFloat}
 */
export function polyval(p, x) {
    let xv = bfjs.bf(x);
    let y = bfjs.bf(0);
    for (let i = 0; i < p.length; i++) {
        y = y.mul(xv).add(p[i]);
    }
    return y;
}