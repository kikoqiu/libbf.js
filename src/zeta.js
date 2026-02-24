import * as bfjs from "./bf.js";
import { Complex } from "./complex.js";
import { bf, zero,  one, BigFloat, bernoulli } from "./bf.js";
import { logGamma,  factorial } from "./gamma.js";

/**
 * Computes the Riemann Zeta function ζ(s) or Hurwitz Zeta function ζ(s, a).
 * 
 * Logic:
 * 1. Handle pole at s = 1.
 * 2. If Re(s) < 0 and a = 1, use the Reflection Formula to mirror into the right half-plane.
 * 3. Handle specific Hurwitz reductions (e.g., a = 0.5).
 * 4. Use the Euler-Maclaurin summation formula for high-precision results.
 * 
 * @param {Complex|number|BigFloat} s - The complex exponent.
 * @param {Complex|number|BigFloat} [a=1] - The shift parameter (default is 1 for Riemann Zeta).
 * @returns {Complex}
 */
export function zeta(s, a = "1") {
    let _s = s instanceof Complex ? s : new Complex(s);
    let _a = a instanceof Complex ? a : new Complex(a);
    const prec = bfjs.decimalPrecision();

    // 1. Pole Check: ζ(1) is undefined (Infinity)
    if (_s.re.equals(one) && _s.im.isZero()) {
        return new Complex(Infinity, 0);
    }

    // 2. Reflection Formula for Riemann Zeta (a=1) when Re(s) < 0
    // Formula: ζ(s) = 2^s * π^(s-1) * sin(πs/2) * Γ(1-s) * ζ(1-s)
    if (_a.re.equals(one) && _a.im.isZero() && _s.re.cmp(zero) < 0) {
        const c_pi = new Complex(bfjs.PI);
        const c_one = new Complex(one);
        
        // Compute the massive multiplier in the logarithmic domain
        // V = 2^s * pi^(s-1) * Gamma(1-s)
        // ln(V) = s*ln(2) + (s-1)*ln(pi) + logGamma(1-s)
        const log2 = new Complex(2).log();
        const logPi = c_pi.log();
        
        const term_sLog2 = _s.mul(log2);
        const term_sMinus1LogPi = _s.sub(c_one).mul(logPi);
        const term_logGamma = logGamma(c_one.sub(_s));
        
        const expTerm = term_sLog2.add(term_sMinus1LogPi).add(term_logGamma).exp();
        
        // Multiply with the remaining terms
        const sinTerm = _s.mul(c_pi.div(new Complex(2))).sin();
        const zetaTerm = zeta(c_one.sub(_s));
        
        return expTerm.mul(sinTerm).mul(zetaTerm);
    }

    // 3. Hurwitz Zeta Reduction for a = 0.5
    // zeta(s, 0.5) = (2^s - 1) * zeta(s)
    // This strictly prevents EM divergence for large negative s when a=0.5
    if (_a.re.cmp(new Complex(0.5).re) === 0 && _a.im.isZero()) {
        const c_two = new Complex(2);
        const c_one = new Complex(1);
        return c_two.pow(_s).sub(c_one).mul(zeta(_s, 1));
    }

    // 4. Euler-Maclaurin Parameters
    // Dynamically scale N and M based on precision AND magnitude of s
    const absS = _s.abs().toNumber();
    const N = Math.floor(prec * 0.6) + Math.floor(absS * 0.5) + 15;
    const M = Math.floor(prec * 0.4) + Math.floor(absS * 0.1) + 5;

    return zetaEulerMaclaurin(_s, _a, N, M);
}

/**
 * Dirichlet Eta function η(s) = (1 - 2^(1-s)) * ζ(s).
 * 
 * @param {Complex|number|BigFloat} s 
 * @returns {Complex}
 */
export function altZeta(s) {
    const _s = s instanceof Complex ? s : new Complex(s);
    const c_one = new Complex(one);
    
    // Handle pole cancellation mathematically (L'Hopital's limit is ln(2))
    if (_s.re.equals(one) && _s.im.isZero()) {
        return new Complex(2).log();
    }
    
    const c_two = new Complex(2);
    const exponent = c_one.sub(_s);
    const term = c_one.sub(c_two.pow(exponent));
    
    return term.mul(zeta(_s));
}

/**
 * Core implementation of ζ(s, a) using Euler-Maclaurin formula.
 * Ensures all operations prioritize Complex objects on the left.
 * 
 * @private
 */
function zetaEulerMaclaurin(s, a, N, M) {
    const c_one = new Complex(one);
    const negS = s.neg();
    
    // Part 1: sum_{k=0}^{N-1} (k+a)^-s
    let sum1 = new Complex(0);
    for (let k = 0; k < N; k++) {
        sum1 = sum1.add(a.add(new Complex(k)).pow(negS));
    }

    // X = N + a (Complex)
    const X = a.add(new Complex(N));
    const sMinus1 = s.sub(c_one);
    
    // Part 2: (N+a)^(1-s) / (s-1)
    const sum2 = X.pow(c_one.sub(s)).div(sMinus1);

    // Part 3: 0.5 * (N+a)^-s
    const sum3 = X.pow(negS).mul(new Complex(0.5));

    // Part 4: Bernoulli Correction Series
    let sum4 = new Complex(0);
    let Xpow = X.pow(negS.sub(c_one)); // (N+a)^(-s-1)
    const XinvSq = c_one.div(X.mul(X));
    let falling = s; // Represents the rising product s*(s+1)*...

    for (let k = 1; k <= M; k++) {
        const n = 2 * k;
        const bk = bernoulli(n); 
        const denom = factorial(n); 
        
        const coeff = new Complex(bk.div(denom));
        
        const term = Xpow.mul(coeff).mul(falling);
        sum4 = sum4.add(term);

        if (k < M) {
            falling = falling.mul(s.add(new Complex(2 * k - 1)));
            falling = falling.mul(s.add(new Complex(2 * k)));
            Xpow = Xpow.mul(XinvSq);
        }
    }

    return sum1.add(sum2).add(sum3).add(sum4);
}

/**
 * Prime Zeta Function P(s) = sum_{p \in primes} p^-s.
 * Calculated via Mobius inversion: P(s) = sum_{n=1}^inf (μ(n)/n) * ln(ζ(ns))
 * 
 * @param {Complex|number|BigFloat} s 
 * @returns {Complex}
 */
export function primeZeta(s) {
    const _s = s instanceof Complex ? s : new Complex(s);
    if (_s.re.cmp(one) <= 0) {
        throw new Error("PrimeZeta diverges for Re(s) <= 1");
    }

    const prec = bfjs.decimalPrecision();
    const maxTerms = Math.floor(prec * 1.2) + 20;
    let sum = new Complex(0);

    for (let n = 1; n < maxTerms; n++) {
        const mu = getMobius(n);
        if (mu === 0) continue;

        const ns = _s.mul(new Complex(n));
        const logZ = zeta(ns).log();
        
        // Weight = mu / n (BigFloat)
        const weight = new Complex(bf(mu).div(bf(n)));
        const term = logZ.mul(weight);
        
        sum = sum.add(term);
        
        // Convergence check
        if (n > 2 && term.abs().cmp(bf(10).pow(bf(-prec))) < 0) break;
    }
    return sum;
}

/**
 * Mobius function μ(n).
 * @private
 */
function getMobius(n) {
    if (n === 1) return 1;
    let p = 0;
    let temp = n;
    for (let i = 2; i * i <= temp; i++) {
        if (temp % i === 0) {
            temp /= i;
            if (temp % i === 0) return 0;
            p++;
        }
    }
    if (temp > 1) p++;
    return (p % 2 === 0) ? 1 : -1;
}