import * as bfjs from "./bf.js";

/**
 * Identify a high-precision BigFloat as a simple symbolic expression.
 * This function uses the Continued Fraction algorithm to find the best rational 
 * approximation p/q for x, x/pi, x^2, etc.
 *
 * @param {BigFloat|number|string} _x - The value to identify.
 * @param {Object} [options={}] - Configuration options.
 * @param {number|BigFloat} [options.tol] - Error tolerance (defaults to current precision's epsilon).
 * @param {number} [options.max_den=1000000] - Maximum denominator allowed for rational parts.
 * @param {Array} [options.constants] - Custom constants to check against.
 * @returns {string} - A string representation of the identified expression, or the number itself.
 */
export function identify(_x, options = {}) {
    const x = bfjs.bf(_x);
    if (x.isZero()) return "0";

    // Default tolerance: roughly 10^-25 or based on provided option
    const tol = bfjs.bf(options.tol || "1e-25");
    const max_den = options.max_den || 1000000;

    // Library of known constants
    const base_constants = options.constants || [
        { name: "PI", val: bfjs.PI },
        { name: "E", val: bfjs.E },
        { name: "SQRT2", val: bfjs.bf(2).sqrt() },
        { name: "LN2", val: bfjs.bf(2).log() },
        { name: "PHI", val: bfjs.bf(5).sqrt().add(1).div(2) } // Golden Ratio
    ];

    /**
     * Internal helper: Find best rational p/q using Continued Fractions.
     * Stops when error < tol or denominator > max_q.
     */
    function toRational(v, max_q) {
        let val = bfjs.bf(v);
        let sign = val.cmp(0) < 0 ? -1 : 1;
        val = val.abs();

        let h0 = bfjs.bf(0), h1 = bfjs.bf(1);
        let k0 = bfjs.bf(1), k1 = bfjs.bf(0);
        
        let x_n = val;

        for (let i = 0; i < 50; i++) {
            let a_n = x_n.floor();
            
            let h_next = a_n.mul(h1).add(h0);
            let k_next = a_n.mul(k1).add(k0);

            // Check if denominator exceeds limit
            if (k_next.cmp(max_q) > 0) break;

            h0 = h1; h1 = h_next;
            k0 = k1; k1 = k_next;

            // Check current approximation error
            let current_val = h1.div(k1);
            let diff = val.sub(current_val).abs();
            if (diff.cmp(tol) < 0) {
                return { p: h1.mul(sign), q: k1, diff: diff };
            }

            let residue = x_n.sub(a_n);
            if (residue.isZero() || i > 40) break;
            x_n = bfjs.bf(1).div(residue);
        }
        return { p: h1.mul(sign), q: k1, diff: val.sub(h1.div(k1)).abs() };
    }

    /**
     * Helper to format p/q * ConstantName
     */
    function format(p, q, constName) {
        let ps = p.toString(10);
        let qs = q.toString(10);
        let res = "";
        
        if (constName) {
            if (ps === "1") res = constName;
            else if (ps === "-1") res = "-" + constName;
            else res = ps + "*" + constName;
        } else {
            res = ps;
        }

        if (qs !== "1") {
            return `(${res})/${qs}`;
        }
        return res;
    }

    // Strategy 1: Rational p/q
    let rat = toRational(x, max_den);
    if (rat.diff.cmp(tol) < 0) return format(rat.p, rat.q);

    // Strategy 2: k * Constant (e.g., 3*PI/4)
    for (let c of base_constants) {
        let ratC = toRational(x.div(c.val), max_den);
        if (ratC.diff.cmp(tol) < 0) return format(ratC.p, ratC.q, c.name);
    }

    // Strategy 3: Constant / k (e.g., PI/120)
    for (let c of base_constants) {
        let ratI = toRational(c.val.div(x), max_den);
        if (ratI.diff.cmp(tol) < 0) return format(ratI.q, ratI.p, c.name);
    }

    // Strategy 4: sqrt(p/q)
    let x2 = x.mul(x);
    let rat2 = toRational(x2, max_den);
    if (rat2.diff.cmp(tol) < 0) {
        return `sqrt(${format(rat2.p, rat2.q)})`;
    }

    // Strategy 5: Linear combination with integers (x = p/q * C + r)
    for (let c of base_constants) {
        for (let r = -5; r <= 5; r++) {
            if (r === 0) continue;
            let target = x.sub(r);
            let ratT = toRational(target.div(c.val), 1000);
            if (ratT.diff.cmp(tol) < 0) {
                let term1 = format(ratT.p, ratT.q, c.name);
                return `${term1}${r > 0 ? '+' : ''}${r}`;
            }
        }
    }

    // Strategy 6: exp(p/q)
    try {
        let lx = x.log();
        let ratL = toRational(lx, 1000);
        if (ratL.diff.cmp(tol) < 0) return `exp(${format(ratL.p, ratL.q)})`;
    } catch(e) {}

    // No match found
    return x.toString(10);
}