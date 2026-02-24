import * as bfjs from "./bf.js";
import { Complex } from "./complex.js";
import { bf, BigFloat, one, two, three, gamma } from "./bf.js";

/**
 * Helper to check if a Complex number is strictly an integer.
 * Used to detect singularities in Gamma or branch logic.
 */
function isInteger(c) {
    if (!c.im.isZero()) return false;
    let num = c.re.toNumber();
    // Use modulo for exact checking to allow small numerical perturbations to bypass it
    if(Math.abs(num)<Number.MAX_SAFE_INTEGER){
        return num % 1 === 0;
    }
    return c.re.cmp(c.re.floor())===0;
}

/**
 * Confluent Hypergeometric Limit Function 0F1(; a; z)
 * Used as the primary power series expansion for Bessel functions.
 * 
 * @param {Complex} a The parameter 'a' (usually nu + 1)
 * @param {Complex} z The complex argument
 * @param {Number} [max_iter=10000]
 * @returns {Complex}
 */
export function hyp0f1(a, z, max_iter = 10000) {
    let _a = a instanceof Complex ? a : new Complex(a);
    let _z = z instanceof Complex ? z : new Complex(z);

    const ONE = new Complex(one);
    let term = ONE;
    let sum = ONE;
    let prev_sum = ONE;
    let prev2_sum = ONE;
    
    // Halley-like convergence loop bounds    
    for (let k = 1; k < max_iter; k++) {
        let k_cplx = new Complex(k);
        let a_plus_k_minus_1 = _a.add(new Complex(k - 1));
        
        // term = term * z / (k * (a + k - 1))
        term = term.mul(_z).div(k_cplx.mul(a_plus_k_minus_1));
        let next_sum = sum.add(term);
        
        // Convergence Check
        if (next_sum.re.cmp(sum.re) === 0 && next_sum.im.cmp(sum.im) === 0) {
            sum = next_sum;
            break;
        }
        
        // Anti-oscillation (detect arbitrary precision float epsilon jitter)
        if (k > 1 && next_sum.re.cmp(prev2_sum.re) === 0 && next_sum.im.cmp(prev2_sum.im) === 0) {
            sum = next_sum;
            break;
        }
        
        prev2_sum = prev_sum;
        prev_sum = sum;
        sum = next_sum;
    }
    
    return sum;
}

/**
 * Bessel function of the first kind J_v(z).
 * Defined by series: J_v(z) = (z/2)^v / gamma(v+1) * 0F1(; v+1; -z^2/4)
 * 
 * @param {Complex|number} nu Order of the Bessel function
 * @param {Complex|number} z Complex argument
 * @returns {Complex}
 */
export function besselj(nu, z) {
    let _nu = nu instanceof Complex ? nu : new Complex(nu);
    let _z = z instanceof Complex ? z : new Complex(z);

    // 1. Handle exact zero origin
    if (_z.re.isZero() && _z.im.isZero()) {
        if (_nu.re.isZero() && _nu.im.isZero()) return new Complex(one);
        if (_nu.re.toNumber() > 0) return new Complex(0);
        return new Complex(Infinity, 0); // Singular behavior for negative orders
    }

    // 2. Handle negative integers to avoid division by zero in 0F1
    // J_{-n}(z) = (-1)^n J_n(z)
    if (isInteger(_nu) && _nu.re.toNumber() < 0) {
        let n = Math.abs(Math.round(_nu.re.toNumber()));
        let sign = (n % 2 === 0) ? new Complex(one) : new Complex(-1);
        return sign.mul(besselj(_nu.neg(), _z));
    }

    const TWO = new Complex(two);
    const ONE = new Complex(one);
    
    // (z/2)^v
    let z_over_2 = _z.div(TWO);
    let prefactor = z_over_2.pow(_nu);
    
    // Gamma function: requires `gamma()` implementation on Complex prototype in complex.js
    let gamma_nu_plus_1 = gamma(_nu.add(ONE)); 
    
    // -z^2 / 4
    let z_sq_over_4_neg = _z.mul(_z).div(new Complex(4)).neg();
    
    // 0F1(; v+1; -z^2/4)
    let h = hyp0f1(_nu.add(ONE), z_sq_over_4_neg);
    
    return prefactor.mul(h).div(gamma_nu_plus_1);
}

/**
 * Modified Bessel function of the first kind I_v(z).
 * Defined by: I_v(z) = (z/2)^v / gamma(v+1) * 0F1(; v+1; z^2/4)
 * 
 * @param {Complex|number} nu Order
 * @param {Complex|number} z Complex argument
 * @returns {Complex}
 */
export function besseli(nu, z) {
    let _nu = nu instanceof Complex ? nu : new Complex(nu);
    let _z = z instanceof Complex ? z : new Complex(z);

    if (_z.re.isZero() && _z.im.isZero()) {
        if (_nu.re.isZero() && _nu.im.isZero()) return new Complex(one);
        if (_nu.re.toNumber() > 0) return new Complex(0);
        return new Complex(Infinity, 0);
    }

    // I_{-n}(z) = I_n(z)
    if (isInteger(_nu) && _nu.re.toNumber() < 0) {
        return besseli(_nu.neg(), _z);
    }

    const TWO = new Complex(two);
    const ONE = new Complex(one);
    
    let z_over_2 = _z.div(TWO);
    let prefactor = z_over_2.pow(_nu);
    
    let gamma_nu_plus_1 = gamma(_nu.add(ONE));
    
    // + z^2 / 4
    let z_sq_over_4 = _z.mul(_z).div(new Complex(4));
    let h = hyp0f1(_nu.add(ONE), z_sq_over_4);
    
    return prefactor.mul(h).div(gamma_nu_plus_1);
}

/**
 * Bessel function of the second kind Y_v(z)
 * Uses the mpmath precision trick of limit approximation (perturbation) 
 * for integer orders to sidestep exact L'Hôpital evaluation over series.
 * 
 * Y_v(z) =[J_v(z)cos(v*pi) - J_{-v}(z)] / sin(v*pi)
 * 
 * @param {Complex|number} nu Order
 * @param {Complex|number} z Complex argument
 * @returns {Complex}
 */
export function bessely(nu, z) {
    let _nu = nu instanceof Complex ? nu : new Complex(nu);
    let _z = z instanceof Complex ? z : new Complex(z);
    
    if (_z.re.isZero() && _z.im.isZero()) {
        return new Complex(-Infinity, 0); // Y_n(0) -> -Infinity
    }

    // Perturbation to compute limit if order is integer
    if (isInteger(_nu)) {
        // Adjust epsilon depending on available precision capability (1e-12 is robust for double)
        let eps = new Complex(1e-12); 
        _nu = _nu.add(eps);
    }
    
    let pi = new Complex(bfjs.PI || Math.PI);
    let nu_pi = _nu.mul(pi);
    
    let j_nu = besselj(_nu, _z);
    let j_minus_nu = besselj(_nu.neg(), _z);
    
    let cos_nu_pi = nu_pi.cos();
    let sin_nu_pi = nu_pi.sin();
    
    let num = j_nu.mul(cos_nu_pi).sub(j_minus_nu);
    return num.div(sin_nu_pi);
}

/**
 * Modified Bessel function of the second kind K_v(z)
 * 
 * K_v(z) = (pi/2) *[I_{-v}(z) - I_v(z)] / sin(v*pi)
 * 
 * @param {Complex|number} nu Order
 * @param {Complex|number} z Complex argument
 * @returns {Complex}
 */
export function besselk(nu, z) {
    let _nu = nu instanceof Complex ? nu : new Complex(nu);
    let _z = z instanceof Complex ? z : new Complex(z);

    if (_z.re.isZero() && _z.im.isZero()) {
        return new Complex(Infinity, 0); // K_n(0) -> Infinity
    }

    // Perturbation
    if (isInteger(_nu)) {
        let eps = new Complex(1e-12); 
        _nu = _nu.add(eps);
    }
    
    let pi = new Complex(bfjs.PI || Math.PI);
    let nu_pi = _nu.mul(pi);
    
    let i_nu = besseli(_nu, _z);
    let i_minus_nu = besseli(_nu.neg(), _z);
    
    let sin_nu_pi = nu_pi.sin();
    
    let num = i_minus_nu.sub(i_nu);
    let half_pi = pi.div(new Complex(two));
    
    return half_pi.mul(num).div(sin_nu_pi);
}

/**
 * Hankel function of the first kind H1_v(z) = J_v(z) + i*Y_v(z)
 */
export function hankel1(nu, z) {
    let j = besselj(nu, z);
    let y = bessely(nu, z);
    let i = new Complex(0, 1);
    return j.add(i.mul(y));
}

/**
 * Hankel function of the second kind H2_v(z) = J_v(z) - i*Y_v(z)
 */
export function hankel2(nu, z) {
    let j = besselj(nu, z);
    let y = bessely(nu, z);
    let i = new Complex(0, 1);
    return j.sub(i.mul(y));
}