/**
 * High-precision ODE Solver using Dormand-Prince method (similar to MATLAB's ode45).
 * 
 * Solves non-stiff differential equations y' = f(t, y).
 * Implementation of the explicit Runge-Kutta (4,5) formula (Dormand-Prince pair).
 * Supports adaptive step size control.
 *
 * @param {Function} odefun - The main function to integrate: dydt = odefun(t, y).
 *        - t: BigFloat (current time)
 *        - y: Array<BigFloat> (current state vector)
 *        Returns: Array<BigFloat> (derivatives)
 *
 * @param {Array<number|string|BigFloat>} tspan - Interval of integration [t0, tf].
 *
 * @param {Array<number|string|BigFloat>|BigFloat} y0 - Initial conditions.
 *        Can be a scalar (converted to array internally) or an array of values.
 *
 * @param {Object} [info={}] - Configuration and Status object.
 *        Updates in-place with solution data and statistics.
 *
 *        // --- Input Configuration Properties ---
 * @param {number|string|BigFloat} [info._e=1e-16] - Absolute Tolerence (AbsTol).
 * @param {number|string|BigFloat} [info._re=1e-16] - Relative Tolerance (RelTol).
 *        Error control: |e| <= max(RelTol * |y|, AbsTol)
 * @param {number|string|BigFloat} [info.initial_step] - Initial step size guess. 
 *        If omitted, it is automatically estimated.
 * @param {number} [info.max_step=10000] - Maximum number of steps allowed.
 * @param {number} [info.max_time=60000] - Maximum execution time in milliseconds.
 * @param {Function} [info.cb] - Optional callback per step: cb(t, y).
 *
 *        // --- Output Status Properties ---
 * @param {Array<BigFloat>} info.t - Array of time points.
 * @param {Array<Array<BigFloat>>} info.y - Array of state vectors corresponding to info.t.
 * @param {number} info.steps - Total successful steps taken.
 * @param {number} info.failed_steps - Number of rejected steps (due to error tolerance).
 * @param {number} info.exectime - Execution time in ms.
 * @param {string} info.status - "done", "timeout", or "max_steps".
 * 
 * @returns {Object|null} 
 *        Returns { t, y } (references to info.t and info.y) if successful.
 *        Returns null if critical errors occur.
 */
export function ode45(odefun, tspan, y0, info = {}) {
    // 1. Configuration & Constants
    
    // Default Tolerance: 
    // MATLAB default is 1e-3 Rel, 1e-6 Abs. 
    // Since we are in BigFloat context and tests expect ~15 digits, we default to 1e-16.
    let _e  = bfjs.bf(info._e ?? 1e-16);
    let _re = bfjs.bf(info._re ?? 1e-16);
    
    let max_steps_limit = info.max_step || 100000; // Increased limit for high precision
    let max_time = info.max_time || 60000;

    const start_time = new Date().getTime();

    // Cache BigFloat constants
    const bf = (n) => bfjs.bf(n);
    const bf_zero = bfjs.zero;
    const bf_one = bfjs.one;
    const bf_p1 = bf(0.1); 
    const bf_p8 = bf(0.8);
    const bf_p9 = bf(0.9);
    const bf_5 = bf(5);

    // Rational helper
    const rat = (n, d) => bf(n).div(bf(d));

    // --- Dormand-Prince 5(4) Coefficients ---
    const c2 = rat(1, 5), c3 = rat(3, 10), c4 = rat(4, 5), c5 = rat(8, 9);
    // c6 = 1, c7 = 1
    
    const a21 = rat(1, 5);
    const a31 = rat(3, 40),       a32 = rat(9, 40);
    const a41 = rat(44, 45),      a42 = rat(-56, 15),      a43 = rat(32, 9);
    const a51 = rat(19372, 6561), a52 = rat(-25360, 2187), a53 = rat(64448, 6561), a54 = rat(-212, 729);
    const a61 = rat(9017, 3168),  a62 = rat(-355, 33),     a63 = rat(46732, 5247), a64 = rat(49, 176),   a65 = rat(-5103, 18656);
    const a71 = rat(35, 384),     a72 = bf_zero,           a73 = rat(500, 1113),   a74 = rat(125, 192),  a75 = rat(-2187, 6784),  a76 = rat(11, 84);

    const b1 = a71, b3 = a73, b4 = a74, b5 = a75, b6 = a76;

    const E1 = rat(71, 57600);
    const E3 = rat(-71, 16695);
    const E4 = rat(71, 1920);
    const E5 = rat(-17253, 339200);
    const E6 = rat(22, 525);
    const E7 = rat(-1, 40);

    // --- Helpers ---
    let y_curr = Array.isArray(y0) ? y0.map(bf) : [bf(y0)];
    let dim = y_curr.length;

    const computeStageY = (y, h, coeffs, k_vecs) => {
        let res = new Array(dim);
        for(let i=0; i<dim; i++) {
            let sum = bf_zero;
            for(let j=0; j<coeffs.length; j++) {
                if (coeffs[j].isZero()) continue;
                sum = sum.add(k_vecs[j][i].mul(coeffs[j]));
            }
            res[i] = y[i].add(sum.mul(h));
        }
        return res;
    };

    // 2. Initialization
    let t_start = bf(tspan[0]);
    let t_final = bf(tspan[1]);
    let t = t_start;
    
    // Check for zero span
    if (t_start.cmp(t_final) === 0) {
        return null;
    }

    let h = info.initial_step ? bf(info.initial_step) : bf_zero;
    
    let absTol = _e;
    let relTol = _re;

    let direction = t_final.sub(t_start).sign(); 
    
    // Automatic initial step size guess
    if (h.isZero()) {
        h = t_final.sub(t_start).mul(rat(1, 100)).abs();
        // Constrain initial guess to avoid being too small or too large
        let min_h = rat(1, 1000000);
        if (h.cmp(min_h) < 0) h = min_h;
        // Don't exceed full span
        if (h.cmp(t_final.sub(t_start).abs()) > 0) h = t_final.sub(t_start).abs();
    }
    // Apply direction
    h = h.abs().mul(bf(direction));

    info.t = [t];
    info.y = [y_curr.map(val => val)];
    info.steps = 0;
    info.failed_steps = 0;
    info.status = "running";

    let k1 = odefun(t, y_curr);
    if (!Array.isArray(k1)) k1 = [k1];

    // 3. Main Loop
    let done = false;
    let steps = 0;

    while (!done) {
        if (steps >= max_steps_limit) {
            console.warn(`ode45: Max steps (${max_steps_limit}) exceeded at t=${t.toString(10, 6)}.`);
            info.status = "max_steps";
            break;
        }
        if (new Date().getTime() - start_time > max_time) {
            console.warn("ode45: Timeout reached.");
            info.status = "timeout";
            break;
        }

        // Distance to end
        let dist_to_end = t_final.sub(t);
        let dist_abs = dist_to_end.abs();
        let h_abs = h.abs();

        // Check if we are close enough to finish
        if (dist_abs.cmp(bf(1e-40)) <= 0) { // Safety epsilon
            done = true;
            break;
        }

        // Clamp step size to hit t_final exactly
        // Use a flag 'last_step' to know if we are forcing the step
        let last_step = false;
        if (h_abs.cmp(dist_abs) >= 0) {
            h = dist_to_end;
            last_step = true;
        }

        // --- Stages ---
        let y_temp = computeStageY(y_curr, h, [a21], [k1]);
        let k2 = odefun(t.add(c2.mul(h)), y_temp);
        if (!Array.isArray(k2)) k2 = [k2];

        y_temp = computeStageY(y_curr, h, [a31, a32], [k1, k2]);
        let k3 = odefun(t.add(c3.mul(h)), y_temp);
        if (!Array.isArray(k3)) k3 = [k3];

        y_temp = computeStageY(y_curr, h, [a41, a42, a43], [k1, k2, k3]);
        let k4 = odefun(t.add(c4.mul(h)), y_temp);
        if (!Array.isArray(k4)) k4 = [k4];

        y_temp = computeStageY(y_curr, h, [a51, a52, a53, a54], [k1, k2, k3, k4]);
        let k5 = odefun(t.add(c5.mul(h)), y_temp);
        if (!Array.isArray(k5)) k5 = [k5];

        y_temp = computeStageY(y_curr, h, [a61, a62, a63, a64, a65], [k1, k2, k3, k4, k5]);
        let k6 = odefun(t.add(h), y_temp); // c6=1
        if (!Array.isArray(k6)) k6 = [k6];

        // Result Candidate
        let y_next = computeStageY(y_curr, h, [b1, bf_zero, b3, b4, b5, b6], [k1, k2, k3, k4, k5, k6]);
        
        let k7 = odefun(t.add(h), y_next);
        if (!Array.isArray(k7)) k7 = [k7];

        // Error Calculation
        let max_norm_err = bf_zero;
        for(let i=0; i<dim; i++) {
            let term = k1[i].mul(E1)
                .add(k3[i].mul(E3))
                .add(k4[i].mul(E4))
                .add(k5[i].mul(E5))
                .add(k6[i].mul(E6))
                .add(k7[i].mul(E7));
            
            let err_abs_val = term.mul(h).abs();
            let y_max = y_curr[i].abs().cmp(y_next[i].abs()) > 0 ? y_curr[i].abs() : y_next[i].abs();
            let sc = absTol.add(y_max.mul(relTol));
            
            let ratio = err_abs_val.div(sc);
            if (ratio.cmp(max_norm_err) > 0) {
                max_norm_err = ratio;
            }
        }

        // --- Accept/Reject ---
        if (max_norm_err.cmp(bf_one) <= 0) {
            // ACCEPT
            t = t.add(h);
            y_curr = y_next;
            k1 = k7; // FSAL
            steps++;

            info.t.push(t);
            info.y.push(y_curr.map(v => v));
            if (info.cb) info.cb(t, y_curr);

            if (last_step) {
                done = true;
            } else {
                // Grow step
                let factor = bf_zero;
                if (max_norm_err.cmp(bf(1e-40)) < 0) {
                    factor = bf_5; 
                } else {
                    let inv_err = bf_one.div(max_norm_err);
                    // factor = 0.9 * err^(-0.2)
                    let pow_val = bfjs.exp(inv_err.log().mul(bf(0.2))); 
                    factor = bf_p9.mul(pow_val);
                }
                if (factor.cmp(bf_5) > 0) factor = bf_5;
                if (factor.cmp(bf_p1) < 0) factor = bf_p1;
                
                h = h.mul(factor);
            }
        } else {
            // REJECT
            info.failed_steps++;
            // If we tried to force the last step but it failed, we are not done.
            // We need to shrink and try again.
            
            // Shrink step
            let inv_err = bf_one.div(max_norm_err);
            let pow_val = bfjs.exp(inv_err.log().mul(bf(0.2))); 
            let factor = bf_p9.mul(pow_val);
            
            if (factor.cmp(bf_p1) < 0) factor = bf_p1;
            if (factor.cmp(bf_p8) > 0) factor = bf_p8;

            h = h.mul(factor);

            // Underflow check
            if (h.abs().cmp(bf(1e-50)) < 0) {
                console.warn("ode45: Step size underflow.");
                info.status = "underflow";
                break;
            }
        }
    }

    if (info.status === "running") info.status = "done";
    
    info.exectime = new Date().getTime() - start_time;
    info.steps = steps;
    
    info.toString = function() {
        return `status=${this.status}, steps=${this.steps}, failed=${this.failed_steps}, t_final=${this.t[this.t.length-1].toString(10, 6)}`;
    };

    return { t: info.t, y: info.y };
}