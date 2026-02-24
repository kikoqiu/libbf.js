import * as bfjs from "./bf.js";
import { Complex } from "./complex.js";
import { bf, BigFloat,one,two,three } from "./bf.js";

/**
 * High-precision Lambert W function W_k(z).
 * Computes the principal branch W_0(z) by default, or the k-th branch W_k(z).
 *
 * @param {Complex|number|string|BigFloat} z The complex argument
 * @param {number} k Branch index (default 0)
 * @returns {Complex}
 */
export function lambertw(z, k = 0) {
    let _z = z instanceof Complex ? z : new Complex(z);
    
    // 1. Handle exact zero
    if (_z.re.isZero() && _z.im.isZero()) {
        if (k === 0) return new Complex(0);
        return new Complex(-Infinity, 0); // W_k(0) goes to -Infinity for k != 0
    }

    const E = new Complex(bfjs.E);
    const branch_pt = new Complex(-1).div(E);

    // 2. Handle exact branch point z = -1/e
    if (_z.re.cmp(branch_pt.re) === 0 && _z.im.isZero()) {
        if (k === 0 || k === -1) {
            return new Complex(-1);
        }
    }

    const ONE = new Complex(one);
    const TWO = new Complex(two);
    const THREE = new Complex(three);

    let w;
    // We can use standard precision numbers for bounding/branch logic.
    let re = _z.re.toNumber();
    let im = _z.im.toNumber();
    let abs_z = Math.sqrt(re * re + im * im);
    let dist_bp = Math.sqrt((re + 0.36787944117144233)**2 + im * im);

    // 3. Initial Guess Configuration
    if (k === 0) {
        if (dist_bp < 0.3) {
            // Branch point expansion: p = sqrt(2*(e*z + 1))
            let p = TWO.mul( E.mul(_z).add(ONE) ).sqrt();
            w = new Complex(-1).add(p).sub( p.mul(p).div(THREE) );
        } else if (re > -0.3 && abs_z < 2.5) {
            // Padé approximant for small z: w = z / (1 + z)
            w = _z.div( _z.add(ONE) );
        } else {
            // Asymptotic expansion for large |z|
            let L1 = _z.log();
            let L2 = L1.log();
            w = L1.sub(L2).add( L2.div(L1) );
        }
    } else if (k === -1) {
        if (dist_bp < 0.3) {
            // W_{-1} takes the negative branch of the square root
            let p = TWO.mul( E.mul(_z).add(ONE) ).sqrt().mul(new Complex(-1));
            w = new Complex(-1).add(p).sub( p.mul(p).div(THREE) );
        } else if (re < 0 && abs_z < 0.5) {
            // Special handling for negative real axis approach to avoid jumping branches
            let L1 = _z.neg().log();
            let L2 = L1.neg().log();
            w = L1.sub(L2).add( L2.div(L1) );
        } else {
            let L1 = _z.log().add(new Complex(0, bfjs.PI.mul(bf(-2))));
            let L2 = L1.log();
            w = L1.sub(L2).add( L2.div(L1) );
        }
    } else {
        // General branches
        let L1 = _z.log().add(new Complex(0, bfjs.PI.mul(bf(2 * k))));
        let L2 = L1.log();
        w = L1.sub(L2).add( L2.div(L1) );
    }

    // 4. Halley's Method Refinement (Cubic convergence)
    const max_iter = 1000;
    let prev_w = w;
    let prev2_w = w;

    for (let i = 0; i < max_iter; i++) {
        let w_re = w.re.toNumber();
        let w_next;

        let wPlus1 = w.add(ONE);
        if (wPlus1.re.isZero() && wPlus1.im.isZero()) {
            break; // Protected against division by zero at exactly w = -1
        }

        let wPlus2 = w.add(TWO);

        // Dynamically shift formulation to prevent high-precision exponent overflow
        if (w_re > 0) {
            let emw = w.neg().exp(); // exp(-w)
            let delta = w.sub( _z.mul(emw) );
            let term2 = wPlus2.mul(delta).div( wPlus1.mul(TWO) );
            let denom = wPlus1.sub(term2);
            if (denom.re.isZero() && denom.im.isZero()) break;
            w_next = w.sub( delta.div(denom) );
        } else {
            let ew = w.exp(); // exp(w)
            let p = w.mul(ew).sub(_z);
            let term2 = wPlus2.mul(p).div( wPlus1.mul(TWO) );
            let denom = ew.mul(wPlus1).sub(term2);
            if (denom.re.isZero() && denom.im.isZero()) break;
            w_next = w.sub( p.div(denom) );
        }

        // Convergence Checks
        if (w_next.re.cmp(w.re) === 0 && w_next.im.cmp(w.im) === 0) {
            w = w_next;
            break;
        }
        
        // Anti-oscillation (detect limits of arbitrary precision float epsilon jitter)
        if (i > 0 && w_next.re.cmp(prev2_w.re) === 0 && w_next.im.cmp(prev2_w.im) === 0) {
            w = w_next;
            break;
        }

        prev2_w = prev_w;
        prev_w = w;
        w = w_next;
    }

    return w;
}