import * as bfjs from "./bf.js";
import { Complex,complex } from "./complex.js";
import { bf, zero, half, BigFloat, bernoulli } from "./bf.js";



/**
 * Computes the Stirling series contribution for log-gamma.
 * sum_{k=1}^m [ B_{2k} / (2k(2k-1) * z^{2k-1}) ]
 * 
 * @private
 */
function stirlingSeries(z, numTerms) {
    const zInv = new Complex(1).div(z);
    const zInvSq = zInv.mul(zInv);
    let termPow = zInv; 
    let sum = new Complex(0);

    for (let k = 1; k <= numTerms; k++) {
        const n = 2 * k;
        const b = bernoulli(n);
        // denominator = n * (n - 1)
        const denom = bf(n).mul(bf(n - 1));
        const term = termPow.mul(new Complex(b.div(denom)));
        
        sum = sum.add(term);
        termPow = termPow.mul(zInvSq);
    }
    return sum;
}

/**
 * High-precision Log-Gamma function ln(Gamma(z)).
 * Essential for large z where Gamma(z) would overflow.
 * 
 * @param {Complex|number|string|BigFloat} z 
 * @returns {Complex}
 */
export function logGamma(z) {
    let _z = z instanceof Complex ? z : new Complex(z);
    const prec = bfjs.decimalPrecision();
    const pi = bfjs.PI;

    // 1. Pole Check
    if (_z.im.isZero() && _z.re.cmp(zero) <= 0 && _z.re.round().equals(_z.re)) {
        return new Complex(Infinity, 0); 
    }

    // 2. Reflection Formula for Re(z) < 0.5
    // ln Gamma(z) = ln(pi) - ln(sin(pi*z)) - ln Gamma(1-z)
    if (_z.re.cmp(half) < 0) {
        const c_pi = new Complex(pi);
        const sinPiZ = _z.mul(c_pi).sin();
        return c_pi.log().sub(sinPiZ.log()).sub(logGamma(new Complex(1).sub(_z)));
    }

    // 3. Argument Shifting
    // Shift z to a region where Stirling is accurate enough for target precision
    // Empirical rule: Re(z) > prec * 0.5 + 5
    let currentZ = _z;
    let shiftLogSum = new Complex(0);
    const threshold = bf(Math.floor(prec * 0.6) + 10);

    while (currentZ.re.cmp(threshold) < 0) {
        shiftLogSum = shiftLogSum.add(currentZ.log());
        currentZ = currentZ.add(new Complex(1));
    }

    // 4. Stirling Approximation
    // ln Gamma(z) ~ (z-0.5)ln(z) - z + 0.5*ln(2pi) + StirlingSeries
    const lnSqrt2Pi = bf(2).mul(pi).log().mul(half);
    const numTerms = Math.floor(prec * 0.4) + 2; // Heuristic for terms
    
    let res = currentZ.sub(new Complex(0.5)).mul(currentZ.log())
                .sub(currentZ)
                .add(new Complex(lnSqrt2Pi))
                .add(stirlingSeries(currentZ, numTerms));

    return res.sub(shiftLogSum);
}

/**
 * High-precision Gamma function Γ(z).
 * 
 * @param {Complex|number|string|BigFloat} z 
 * @returns {Complex}
 */
export function gamma(z) {
    const _z = z instanceof Complex ? z : new Complex(z);
    
    // Small positive integer optimization
    if (_z.im.isZero() && _z.re.cmp(zero) > 0) {
        const val = _z.re.toNumber();
        if (Number.isInteger(val) && val < 50) {
            let res = bf(1);
            for (let i = 1; i < val; i++) res = res.mul(bf(i));
            return new Complex(res);
        }
    }

    // Handle poles
    if (_z.im.isExactZero() && _z.re.cmp(zero) <= 0 && _z.re.floor().equals(_z.re)) {
        throw new Error("Gamma function pole at " + _z.re.toString());
    }

    // Gamma(z) = exp(logGamma(z))
    return logGamma(_z).exp();
}

/**
 * Factorial function n! = Γ(n + 1)
 * @returns {Complex|BigFloat} return Complex when n is Complex, otherwize return a BigFloat
 */
export function factorial(n) {
    if(Number.isInteger(n) && n>0){
        let ret=bf(1);
        for(let i=2;i<=n;++i){
            ret.setmul(ret,i);
        }
        return ret;
    }
    const _n = n instanceof Complex ? n : new Complex(n);
    let ret= gamma(_n.add(new Complex(1)));
    if(n instanceof Complex){
        return ret;
    }
    return ret.re;
}

/**
 * Beta function B(x, y) = Γ(x)Γ(y) / Γ(x+y)
 */
export function beta(x, y) {
    const _x = x instanceof Complex ? x : new Complex(x);
    const _y = y instanceof Complex ? y : new Complex(y);
    
    // Use logGamma to prevent intermediate overflow
    const logB = logGamma(_x).add(logGamma(_y)).sub(logGamma(_x.add(_y)));
    return logB.exp();
}

