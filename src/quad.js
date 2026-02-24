import * as bfjs from "./bf.js";
import { Complex, zero, half, one, two } from "./bf.js";

/**
 * High-precision Numerical Integration using Tanh-Sinh (Double Exponential) Quadrature.
 * 
 * SOTA level implementation equivalent to mpmath.quad.
 * - Natively supports finite, half-infinite, and fully infinite bounds.
 * - Supports Complex variables, endpoints, and complex integrands.
 * - Supports contour/path integration when `_a` is an array of nodes and `_b` is undefined.
 * - Extremely robust against endpoint singularities (e.g. log(0), 1/0) through smart boundary bypassing.
 *
 * @param {Function} f - The integrand function.
 *        Must accept a BigFloat/Complex argument (z) and return a BigFloat/Complex result (f(z)).
 *
 * @param {number|string|BigFloat|Complex|Array} _a - The lower limit of integration, or an array of points for contour integration.
 * @param {number|string|BigFloat|Complex} [_b] - The upper limit of integration (leave undefined for contour path integration).
 *
 * @param {Object} [info={}] - Configuration and Status object.
 * @param {number}[info._e=1e-50] - Absolute Error Tolerance.
 * @param {number}[info._re=info._e] - Relative Error Tolerance.
 * @param {number}[info.max_step=15] - Maximum number of interval halving steps.
 * @param {number}[info.max_time=60000] - Maximum execution time in milliseconds.
 * @param {Function}[info.cb] - Optional callback function executed after each level computation.
 * @param {boolean} [info.debug] - Optional flag to enable debug logging.
 *
 * @returns {BigFloat|Complex|null} Returns the exact integral value, or `null` if failed.
 */
export function quad(f, _a, _b, info = {}) {
    // --- Utility: Safe Addition for Mixed BigFloat and Complex Types ---
    function safeAdd(val1, val2) {
        if (val1 === null) return val2;
        if (val2 === null) return val1;
        if (typeof val1.im === 'undefined' && typeof val2.im !== 'undefined') {
            return val2.add(val1); // Complex natively handles adding a BigFloat parameter
        }
        return val1.add(val2);
    }

    // --- Utility: Universal Info Status Updater ---
    function updateInfoBase(info_obj) {
        if (!info_obj.rerror) {
            info_obj.eff_decimal_precision = 0;
            info_obj.eff_result = '';
            return;
        }
        if ((info_obj.rerror.isAlmostZero && info_obj.rerror.isAlmostZero()) || info_obj.rerror === 0) {
            info_obj.eff_decimal_precision = bfjs.decimalPrecision();
        } else {
            let logRerr = info_obj.rerror.log();
            let logVal = logRerr.f64();
            info_obj.eff_decimal_precision = Math.floor(-logVal / Math.log(10));
        }
        if (info_obj.eff_decimal_precision <= 0) {
            info_obj.eff_decimal_precision = 0;
            info_obj.eff_result = '';
        } else {
            let lr = info_obj.lastresult;
            if (info_obj.eff_decimal_precision > bfjs.decimalPrecision()) {
                info_obj.eff_result = lr.toString(10);
            } else {
                info_obj.eff_result = lr.toString(10, info_obj.eff_decimal_precision);
            }
        }
    }

    let max_step = info.max_step || 15,
        max_time = info.max_time || 60000;
    let _e  = info._e ?? 1e-50;
    let _re = info._re ?? _e;
    
    if (typeof(_e) != 'number' || typeof(_re) != 'number' || typeof(info) != "object") {
        throw new Error("arguments error");
    }
    
    let start_time = new Date().getTime();
    info.toString = function() {
        return `lastresult=${this.lastresult ? this.lastresult.toString() : 'N/A'}, 
        effective_result=${this.eff_result},
        steps=${this.steps}/${max_step}, 
        error=${this.error ? this.error.toString(10,3) : 'N/A'},
        rerror=${this.rerror ? this.rerror.toString(10,3) : 'N/A'},
        eff_decimal_precision=${this.eff_decimal_precision}, 	  
        exectime=${this.exectime}/${max_time}`
    };

    // ==========================================
    // PATH (CONTOUR) INTEGRATION OVERLOAD
    // ==========================================
    if (Array.isArray(_a) && _b === undefined) {
        let points = _a;
        if (points.length < 2) return bfjs.bf(0);
        
        let total_integral = null;
        let total_error = bfjs.bf(0);
        let max_steps = 0;
        
        for (let i = 0; i < points.length - 1; i++) {
            let sub_info = Object.assign({}, info);
            delete sub_info.cb; // Avoid redundant sequential callbacks during segments
            delete sub_info.toString; 
            
            let res = quad(f, points[i], points[i+1], sub_info);
            
            if (res === null) {
                info.result = null; // Fails if any segment fails to converge
                return null;
            }
            total_integral = safeAdd(total_integral, res);
            total_error = total_error.add(sub_info.error);
            if (sub_info.steps > max_steps) max_steps = sub_info.steps;
        }
        
        info.exectime = new Date().getTime() - start_time;
        info.steps = max_steps;
        info.error = total_error;
        info.lastresult = total_integral;
        info.result = total_integral;
        
        let abs_val = total_integral.abs(); // Complex or BigFloat native .abs()
        info.rerror = abs_val.isAlmostZero() ? total_error : total_error.div(abs_val);
        
        updateInfoBase(info);
        return total_integral;
    }

    // ==========================================
    // SINGLE SEGMENT INTEGRATION
    // ==========================================
    function parseBound(val) {
        if (val === '-Infinity' || val === 'Infinity') return val;
        if (typeof val === 'string') {
            if (val.includes('i') || val.includes('I')) return Complex.fromString(val);
        }
        if (typeof val === 'number' || typeof val === 'string') return bfjs.bf(val);
        return val; // Already instantiated BigFloat or Complex
    }

    let a = parseBound(_a);
    let b = parseBound(_b);
    let a_str = a.toString();
    let b_str = b.toString();
    let a_is_inf = a_str === '-Infinity' || a_str === 'Infinity';
    let b_is_inf = b_str === '-Infinity' || b_str === 'Infinity';

    let e = bfjs.bf(_e), re = bfjs.bf(_re);

    // Direction & Swapping:
    // Only applied to infinities to reuse infinite coordinate mappings.
    // Finite bounds intentionally DO NOT SWAP, as c = (b - a)/2 intrinsically preserves contour direction!
    let sign = 1;
    if (a_is_inf || b_is_inf) {
        let is_greater = false;
        if (a_str === 'Infinity' && b_str !== 'Infinity') is_greater = true;
        if (a_str !== '-Infinity' && b_str === '-Infinity') is_greater = true;
        if (a_str === 'Infinity' && b_str === '-Infinity') is_greater = true;
        
        if (is_greater) {
            let tmp = a; a = b; b = tmp;
            let tmp_inf = a_is_inf; a_is_inf = b_is_inf; b_is_inf = tmp_inf;
            let tmp_str = a_str; a_str = b_str; b_str = tmp_str;
            sign = -1;
        }
    } else {
        // If either boundary is Complex, promote both to Complex to streamline m & c calculations
        if (a.im !== undefined || b.im !== undefined) {
            if (a.im === undefined) a = new Complex(a);
            if (b.im === undefined) b = new Complex(b);
        }
    }

    const PI = bfjs.PI;
    const f0p5 = half;
    const bf_0 = zero;
    const bf_1 = one;
    const bf_2 = two;
    const bf_m2 = bfjs.bf(-2);
    const pi_over_2 = PI.mul(f0p5);

    // --- Boundary Validation (Safeguard against endpoint singularities) ---
    function isAtBoundary(x) {
        if (!a_is_inf && a !== undefined && a !== null) {
            if (x.equals(a)) return true;
        }
        if (!b_is_inf && b !== undefined && b !== null) {
            if (x.equals(b)) return true;
        }
        return false;
    }

    // --- Dynamically selecting integration substitution map ---
    let calc_x_w = null;

    if (!a_is_inf && !b_is_inf) {
        // [a, b] Finite - elegantly supports directed contours via complex 'c'
        let m = a.add(b).mul(f0p5);
        let c = b.sub(a).mul(f0p5);
        let c2 = b.sub(a); // equivalent to 2*c
        
        calc_x_w = (v, dv) => {
            let ch = v.cosh();
            let w = c.mul(dv).div(ch.mul(ch)); // c * dv / cosh^2(v)
            
            let x;
            // High-precision stabilization to prevent catastrophic cancellation near real boundaries.
            // Maintains precision near boundaries rather than wiping out digits in `m + c*th`.
            if (typeof v.im === 'undefined' && typeof a.im === 'undefined' && typeof b.im === 'undefined') {
                let sign_v = v.toNumber();
                if (sign_v > 0) {
                    let exp_2v = v.mul(bf_2).exp();
                    let offset = c2.div(exp_2v.add(bf_1));
                    x = b.sub(offset);
                } else if (sign_v < 0) {
                    let exp_m2v = v.mul(bf_m2).exp();
                    let offset = c2.div(exp_m2v.add(bf_1));
                    x = a.add(offset);
                } else {
                    x = m;
                }
            } else {
                let th = v.tanh();
                x = m.add(c.mul(th)); // Fallback for Complex paths
            }
            return {x, w};
        };
    } else if (!a_is_inf && b_str === 'Infinity') {
        //[a, Infinity)
        calc_x_w = (v, dv) => {
            let ev = v.exp();
            let x = a.add(ev);
            let w = ev.mul(dv); // e^v * dv
            return {x, w};
        };
    } else if (a_str === '-Infinity' && !b_is_inf) {
        // (-Infinity, b]
        calc_x_w = (v, dv) => {
            let ev = v.exp();
            let x = b.sub(ev);
            let w = ev.mul(dv); // Jacobian maps properly -> positive weight
            return {x, w};
        };
    } else if (a_str === '-Infinity' && b_str === 'Infinity') {
        // (-Infinity, Infinity)
        calc_x_w = (v, dv) => {
            let x = v.sinh();
            let w = v.cosh().mul(dv); // cosh(v) * dv
            return {x, w};
        };
    } else {
        // (+Infinity, +Infinity) or (-Infinity, -Infinity)
        info.result = bf_0;
        updateInfoBase(info);
        return info.result;
    }

    /**
     * Compute trapezoidal summation nodes for the current grid density
     * @param {BigFloat} h - Step size
     * @param {number} k_start - Step origin index
     * @param {number} k_step - Stride (used for isolating odd-term summation)
     */
    function eval_sum(h, k_start, k_step) {
        let sum = null;
        let k = k_start;
        let consecutive_zeros = 0;

        // Origin node computation (Required for Level 0)
        if (k === 0) {
            let p0 = calc_x_w(bf_0, pi_over_2); 
            if (!p0.w.isAlmostZero() && !isAtBoundary(p0.x)) {
                sum = f(p0.x).mul(p0.w);
            } else {
                sum = bf_0;
            }
            k += k_step;
        }

        while(true) {
            let t = h.mul(k);
            let v_plus = t.sinh().mul(pi_over_2);
            let dv_plus = t.cosh().mul(pi_over_2);
            
            let p_plus = calc_x_w(v_plus, dv_plus);
            let p_minus = calc_x_w(v_plus.neg(), dv_plus); // dv is an even function, stays positive

            // Singularity protection & structural bypass.
            // When precision limits hit, 'x' might exactly equal bounds. Weights here are virtually zero.
            let term_plus;
            if (p_plus.w.isAlmostZero() || isAtBoundary(p_plus.x)) {
                term_plus = bf_0;
            } else {
                term_plus = f(p_plus.x).mul(p_plus.w);
            }

            let term_minus;
            if (p_minus.w.isAlmostZero() || isAtBoundary(p_minus.x)) {
                term_minus = bf_0;
            } else {
                term_minus = f(p_minus.x).mul(p_minus.w);
            }

            let term_sum = safeAdd(term_plus, term_minus);
            sum = safeAdd(sum, term_sum);

            // Double-Exponential steep convergence guarantee: Break when node weights critically underflow
            if ((term_plus.isAlmostZero() && term_minus.isAlmostZero()) || (p_plus.w.isAlmostZero() && p_minus.w.isAlmostZero())) {
                consecutive_zeros++;
                if (consecutive_zeros > 3) break;
            } else {
                consecutive_zeros = 0;
            }

            // Extreme Fail-Safe bounding
            if (k > 100000) break;
            k += k_step;
        }
        return sum === null ? bf_0 : sum;
    }

    // Level 0 Initialization
    let h0 = one;
    let T = eval_sum(h0, 0, 1).mul(h0);
    
    // Successive Adaptive Sub-interval Tracking
    for(let m = 1; m <= max_step; ++m) {
        let h = one.div(bfjs.bf(2**m));
        
        // Summing solely across interlaced odd nodes -> T_{m} = 0.5 * T_{m-1} + h * sum_{odd}
        let sum_new = eval_sum(h, 1, 2);
        let Tm = safeAdd(T.mul(f0p5), sum_new.mul(h));

        // Careful difference validation mapped strictly to the real axis for error bound metrics
        let diff = (typeof Tm.im === 'undefined' && typeof T.im !== 'undefined') ? T.sub(Tm) : Tm.sub(T);
        let err = diff.abs(); 
        let rerr = Tm.isAlmostZero() ? err : err.div(Tm.abs());

        if (!!info.debug && m > 2) {    	
            console.log('Level['+m+']='+Tm.toString());
            console.log('Error: '+err.toString(10,3));
        }

        info.exectime = new Date().getTime() - start_time;
        info.lastresult = sign < 0 ? Tm.neg() : Tm;
        info.steps = m;
        info.error = err;
        info.rerror = rerr; 

        // Block premature convergence on structurally deceptive integration waves (min bound m > 3)
        if (m > 3 && (err.cmp(e) <= 0 || rerr.cmp(re) <= 0)) {
            info.result = info.lastresult;
            updateInfoBase(info);
            return info.result;
        } else if (m == max_step || info.exectime > max_time) {
            updateInfoBase(info);
            info.result = null; // Execution limit hit without formal convergence
            return info.result;
        }

        if (info.cb) {
            updateInfoBase(info);
            info.cb();
        }
        
        T = Tm;
    }
}

export { quad as integral };