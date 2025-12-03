import {BigFloat, bf, Complex, BigFraction, Scalar, scalar} from "./bf.js";
/**
 * Poly Class
 * Represents a Polynomial or a Truncated Power Series using sparse storage.
 * 
 * Storage Strategy:
 * - Sparse representation: Two parallel arrays, `degs` (degrees) and `coefs` (coefficients).
 * - Coefficients are generic types (BigFloat, Complex) supporting arithmetic interfaces.
 * - `order` (property `o`): The truncation order O(X^n). 
 *    - If `Infinity`, it represents an exact polynomial.
 *    - If a number `n`, terms with degree >= n are discarded.
 * 
 * @property {number[]} degs - Array of degrees (integers).
 * @property {any[]} coefs - Array of coefficients corresponding to degrees.
 * @property {number} o - Truncation order O(X^n).
 * @property {Function} coefType - The coefficient type constructor.
 */
export class Poly {
    /**
     * @param {number[]} degs - Array of degrees (integers).
     * @param {any[]} coefs - Array of coefficients corresponding to degrees.
     * @param {number} [order=Infinity] - Truncation order O(X^n).
     * @param {Function} [coefType=bf] - the coef type
     */
    constructor(degs, coefs, order = Infinity, coefType=BigFloat) {
        this.degs = degs || [];
        this.coefs = coefs || [];
        this.o = order;
        this.coefType = coefType;
        this._normalize();
    }

    // --- Global Factory Helpers ---

    /**
     * Creates a polynomial representing X^n.
     * @param {number} [n=1] - The degree of X.
     * @param {Function} [coefType=BigFloat] - The coefficient type.
     * @returns {Poly}
     */
    static X(n=1,coefType=BigFloat) {
        return new Poly([n], [new coefType(1)], Infinity, coefType); // 1*X^1
    }

    /**
     * Creates a Big-O term O(X^n).
     * @param {number} n - The order of the truncation.
     * @param {Function} [coefType=BigFloat] - The coefficient type.
     * @returns {Poly}
     */
    static O(n,coefType=BigFloat) {
        return new Poly([], [], n,coefType); // 0 + O(X^n)
    }

    // --- Internal Logic ---

    /**
     * Normalizes the sparse representation:
     * 1. Sorts by degree.
     * 2. Merges duplicate degrees.
     * 3. Removes zero coefficients.
     * 4. Removes terms with degree >= order.
     * @private
     */
    _normalize() {
        if (this.degs.length === 0) return;

        // 1. Combine into pairs for sorting
        let terms = this.degs.map((d, i) => ({ d, c: this.coefs[i] }));

        // 2. Sort by degree (Ascending)
        terms.sort((a, b) => a.d - b.d);

        const newDegs = [];
        const newCoefs = [];

        if (terms.length > 0) {
            let currentD = terms[0].d;
            let currentC = terms[0].c;

            for (let i = 1; i < terms.length; i++) {
                if (terms[i].d === currentD) {
                    currentC = currentC.add(terms[i].c);
                } else {
                    this._pushTerm(newDegs, newCoefs, currentD, currentC);
                    currentD = terms[i].d;
                    currentC = terms[i].c;
                }
            }
            this._pushTerm(newDegs, newCoefs, currentD, currentC);
        }

        this.degs = newDegs;
        this.coefs = newCoefs;
    }

    /**
     * Pushes a term to the new arrays if it's valid.
     * @private
     * @param {number[]} degs
     * @param {any[]} coefs
     * @param {number} d
     * @param {any} c
     */
    _pushTerm(degs, coefs, d, c) {
        // Filter out zero coefficients and terms exceeding order
        if (d >= this.o) return; 
        if (!c.isZero()) {
            degs.push(d);
            coefs.push(c);
        }
    }

    /**
     * Wraps a scalar value in a Poly object.
     * @private
     * @param {any} v
     * @returns {Poly}
     */
    _wrap(v) {
        if (v instanceof Poly) return v;
        // Treat scalar as polynomial degree 0
        return new Poly([0], [this._ensureType(v)], Infinity,this.coefType);
    }

    /**
     * Ensures a value is of the correct coefficient type.
     * @private
     * @param {any} c
     * @returns {any}
     */
    _ensureType(c) {
        // Helper to convert number -> BigFloat if needed
        // Assuming global 'new this.coefType' function or similar mechanism exists
        return (c && c.add) ? c : new this.coefType(c);
    }

    // --- Inspection ---

    /**
     * Returns the "Valuation" (degree of the lowest non-zero term).
     * @returns {number} - Infinity if Exact Zero, or n if O(X^n).
     */
    valuation() {
        if (this.degs.length === 0) {
            // If it's a series (order is finite), the valuation is the order 
            // (representing uncertainty starts at X^o).
            // If it's exact zero, valuation is Infinity.
            return (this.o === Infinity || this.o === null) ? Infinity : this.o;
        }
        return this.degs[0]; // Since it is sorted ascending
    }

    /**
     * Returns the Degree (highest non-zero term).
     * @returns {number} - -1 if zero polynomial.
     */
    degree() {
        if (this.degs.length === 0) return -1;
        return this.degs[this.degs.length - 1];
    }

    /**
     * Returns a dense array of coefficients up to the highest degree.
     * Note: Throws if polynomial contains negative powers. Use offsetCoefs for Laurent series.
     * @returns {any[]} [c0, c1, c2, ...]
     */
    get denseCoefs() {
        if (this.valuation() < 0) {
            throw new Error("denseCoefs does not support negative degrees (Laurent Series). Use offsetCoefs instead.");
        }
        const len = this.degree() + 1;
        if (len <= 0) return [];
        
        // Initialize with zero
        const zero = this.coefs.length > 0 ? this.coefs[0].sub(this.coefs[0]) : new this.coefType(0);
        const arr = new Array(len).fill(zero);

        for (let i = 0; i < this.degs.length; i++) {
            arr[this.degs[i]] = this.coefs[i];
        }
        return arr;
    }

    /**
     * Returns a dense array of coefficients along with the valuation offset.
     * Supports negative degrees.
     * @returns {{val: number, coefs: any[]}} { val: starting_degree, coefs: [c_val, c_val+1, ...] }
     */
    get offsetCoefs() {
        if (this.degs.length === 0) return { val: (this.o === Infinity ? 0 : this.o), coefs: [] };
        
        const minDeg = this.degs[0];
        const maxDeg = this.degs[this.degs.length - 1];
        const len = maxDeg - minDeg + 1;

        // Initialize with zero
        const zero = this.coefs.length > 0 ? this.coefs[0].sub(this.coefs[0]) : new this.coefType(0);
        const arr = new Array(len).fill(zero);

        for (let i = 0; i < this.degs.length; i++) {
            arr[this.degs[i] - minDeg] = this.coefs[i];
        }
        return { val: minDeg, coefs: arr };
    }

    /**
     * Evaluates the polynomial at x.
     * P(x) = sum( c_i * x^i )
     * @param {number|BigFloat|Complex} x 
     * @returns {any}
     */
    eval(x) {
        const X = this._ensureType(x);
        if (this.degs.length === 0) return new this.coefType(0); // Zero polynomial

        // Check for singularity at x=0 with negative powers
        const isZero = (X.isZero && X.isZero()) || X === 0;
        if (isZero && this.valuation() < 0) {
            return Infinity;
        }

        let result = new this.coefType(0);
        for (let i = 0; i < this.degs.length; i++) {
            const d = this.degs[i];
            const c = this.coefs[i];
            // result += c * x^d
            // Optimization: Could use Horner's method if converted to dense, 
            // but for sparse high-degree, direct power might be better or mixed.
            // Using direct power for simplicity in sparse structure:
            const term = c.mul(X.pow(d));
            result = result.add(term);
        }
        return result;
    }

    // --- Arithmetic ---

    /**
     * Adds two polynomials.
     * @param {Poly|number|any} other
     * @returns {Poly}
     */
    add(other) {
        const B = this._wrap(other);
        const newOrder = Math.min(this.o, B.o);
        
        // Concatenate arrays (normalization will handle merging)
        const newDegs = this.degs.concat(B.degs);
        const newCoefs = this.coefs.concat(B.coefs);
        
        return new Poly(newDegs, newCoefs, newOrder,this.coefType);
    }

    /**
     * Subtracts two polynomials.
     * @param {Poly|number|any} other
     * @returns {Poly}
     */
    sub(other) {
        const B = this._wrap(other);
        const newOrder = Math.min(this.o, B.o);
        
        const negCoefs = B.coefs.map(c => c.neg());
        const newDegs = this.degs.concat(B.degs);
        const newCoefs = this.coefs.concat(negCoefs);

        return new Poly(newDegs, newCoefs, newOrder,this.coefType);
    }

    /**
     * Negates the polynomial.
     * @returns {Poly}
     */
    neg() {
        return this.mul(-1);
    }

    /**
     * Multiplies two polynomials.
     * @param {Poly|number|any} other
     * @returns {Poly}
     */
    mul(other) {
        const B = this._wrap(other);
        
        // Order propagation logic for multiplication:
        // (A + O(x^a)) * (B + O(x^b))
        // Error terms: A*O(x^b) -> x^val(A)*x^b
        //              B*O(x^a) -> x^val(B)*x^a
        //              O(x^a)*O(x^b) -> x^(a+b) (usually higher order)
        const vA = this.valuation();
        const vB = B.valuation();
        
        // If exact 0, result is exact 0
        if (vA === Infinity || vB === Infinity) return new Poly([],[],Infinity,this.coefType);

        const term1 = (B.o === Infinity) ? Infinity : vA + B.o;
        const term2 = (this.o === Infinity) ? Infinity : vB + this.o;
        const term3 = (this.o === Infinity || B.o === Infinity) ? Infinity : this.o + B.o;
        
        const newOrder = Math.min(term1, term2, term3);

        // If exact 0, result is exact 0
        // Must pass empty arrays explicitly, otherwise coefs becomes undefined
        if (vA === Infinity || vB === Infinity) return new Poly([], [], newOrder,this.coefType);

        // Sparse Convolution
        // Use a Map to accumulate coefficients: degree -> value
        // Note: For very large polynomials, FFT is better, but Map is fine for O(N*M) sparse.
        const productMap = new Map();

        for (let i = 0; i < this.degs.length; i++) {
            for (let j = 0; j < B.degs.length; j++) {
                const d = this.degs[i] + B.degs[j];
                
                // Optimization: Skip if degree exceeds resulting order
                if (newOrder !== Infinity && d >= newOrder) continue;

                const c = this.coefs[i].mul(B.coefs[j]);
                
                // Accumulate
                if (productMap.has(d)) {
                    productMap.set(d, productMap.get(d).add(c));
                } else {
                    productMap.set(d, c);
                }
            }
        }

        // Convert Map back to arrays
        const resDegs = [];
        const resCoefs = [];
        for (const [d, c] of productMap) {
            resDegs.push(d);
            resCoefs.push(c);
        }

        return new Poly(resDegs, resCoefs, newOrder,this.coefType);
    }
    /**
     * Power: P(x)^n
     * @param {number} n - The exponent.
     * @param {number} [d=1] - The denominator of the exponent.
     * @returns {Poly}
     */
    pow(n, d = 1) {
        if (!Number.isInteger(n) || n < 0 || d!==1) {
            return this.powSeries(n,d);
        }
        if (n === 0) return new Poly([0], [new this.coefType(1)], this.o,this.coefType); // 1
        
        let base = this;
        let result = new Poly([0], [new this.coefType(1)], this.o,this.coefType); // 1
        
        let p = n;
        while (p > 0) {
            if (p % 2 === 1) result = result.mul(base);
            base = base.mul(base);
            p = Math.floor(p / 2);
        }
        return result;
    }
    
    /**
     * Division: A / B
     * Supports Exact Polynomials (Euclidean/Laurent) and Truncated Series.
     * 
     * Logic:
     * Uses "Synthetic Division" from lowest degree upwards (Series Division).
     * - If both A and B are Exact (Order=Infinity):
     *    - Tries to divide exactly. 
     *    - If remainder becomes 0, returns Exact result (Order=Infinity).
     *    - If infinite expansion (e.g. 1/(1-x)), stops at defaultLimit and returns Series (Order=Limit).
     * - If one/both are Series (Finite Order):
     *    - Calculates terms up to the theoretical precision limit.
     * 
     * @param {Poly} other
     * @param {number} [defaultLimit=100] - Max terms to calculate for infinite exact expansions.
     * @returns {Poly}
     */
    div(other, defaultLimit = 100) {
        const B = this._wrap(other);
        const vA = this.valuation();
        const vB = B.valuation();

        // 1. Division by Zero Check
        if (vB === Infinity) throw new Error("Division by zero");

        // 2. Determine Result Order (Truncation Point)
        const a = this.o;
        const b = B.o;
        
        // Formula for precision of A/B:
        // O(res) = min( a - vB, b + vA - 2*vB )
        const term1 = (a === Infinity) ? Infinity : a - vB;
        const term2 = (b === Infinity) ? Infinity : b + vA - 2 * vB;
        const resOrder = Math.min(term1, term2);

        // 3. Setup Loop Limits
        // If resOrder is Infinity, it implies Exact/Exact division.
        const isExactMode = (resOrder === Infinity);
        
        // If exact, we look ahead enough terms to see if it terminates, otherwise fallback to truncation.
        // startDeg is vA - vB. We run until we hit resOrder OR the safety limit.
        const startDeg = (vA === Infinity) ? 0 : vA - vB; // vA=Inf means A=0
        
        // The degree at which we stop computing the Quotient.
        // If exact mode, we use defaultLimit relative to start; otherwise use theoretical limit.
        const limitDeg = isExactMode ? (startDeg + defaultLimit) : resOrder;

        // 4. Initialization
        const qDegs = [];
        const qCoefs = [];
        
        // Convert A to a Map for mutable remainder (Degree -> Coeff)
        const currentRem = new Map();
        for(let i=0; i<this.degs.length; i++) {
            currentRem.set(this.degs[i], this.coefs[i]);
        }

        const bLowDeg = B.degs[0];
        const bLowCoef = B.coefs[0]; // B is sorted, this is the lowest degree term

        // Flag to track if we discarded any high-degree remainder terms.
        // If true, the result can NEVER be exact (Order=Infinity).
        let droppedSignificantTerm = false;

        // 5. Main Division Loop (Low-to-High)
        // We iterate until we hit the limit degree
        for (let k = startDeg; k < limitDeg; k++) {
            // Check for Exact Termination
            // Only if we haven't dropped any terms yet.
            if (isExactMode && currentRem.size === 0 && !droppedSignificantTerm) {
                return new Poly(qDegs, qCoefs, Infinity, this.coefType);
            }

            // We need to eliminate the term at degree: target = k + bLowDeg
            // Because: q_k * X^k * (bLowCoef * X^bLowDeg) = q_k * bLowCoef * X^(k+bLowDeg)
            const targetDeg = k + bLowDeg;
            
            // Get current remainder value at this target degree
            let val = currentRem.get(targetDeg);
            
            // If the term is zero/missing, coefficient q_k is 0.
            if (!val || val.isZero()) {
                currentRem.delete(targetDeg); // Clean map
                continue;
            }

            // Calculate Quotient Term: q_k = val / bLowCoef
            const qVal = val.div(bLowCoef);
            qDegs.push(k);
            qCoefs.push(qVal);

            // Update Remainder: Rem = Rem - (qVal * X^k * B)
            // We subtract the effect of this quotient term from the remainder.
            // B = bLow + bHigh...
            // The lowest term (bLow) cancels 'val' exactly. We only need to update the rest.
            currentRem.delete(targetDeg); 

            // Optimization Threshold:
            // Any term generated at or beyond this degree will not affect the calculation 
            // of any quotient coefficient within our [startDeg, limitDeg) window.
            // Proof: Next q will be calculated at k+1, needing rem at (k+1)+bLowDeg.
            // Since k < limitDeg, max needed input is (limitDeg-1)+bLowDeg.
            // So cutoff is limitDeg + bLowDeg.
            const cutoffDeg = limitDeg + bLowDeg;

            for (let i = 1; i < B.degs.length; i++) {
                const bD = B.degs[i];
                const affectDeg = k + bD;
                
                // If the term is beyond our calculation window:
                if (affectDeg >= cutoffDeg) {
                    // We don't store it, but we MUST check if it would have been non-zero.
                    // qVal * B[i] is effectively the "error" being pushed to high degrees.
                    // If it's non-zero, we are losing exactness info.
                    if (!droppedSignificantTerm) {
                        const termVal = qVal.mul(B.coefs[i]);
                        if (!termVal.isZero()) {
                            droppedSignificantTerm = true;
                        }
                    }
                    continue; 
                }

                const bC = B.coefs[i];
                const subVal = qVal.mul(bC);
                const oldRem = currentRem.get(affectDeg) || new this.coefType(0);
                const newRem = oldRem.sub(subVal);
                
                if (newRem.isZero()) {
                    currentRem.delete(affectDeg);
                } else {
                    currentRem.set(affectDeg, newRem);
                }
            }
        }

        // 6. Return Result
        // If we exited loop, we either hit the limit or ran out of remainder.
        
        // Special Case: Even if we hit the limit loop count, 
        // if the remainder is strictly empty and we never dropped anything,
        // it WAS an exact division that just happened to fill the window exactly.
        if (isExactMode && currentRem.size === 0 && !droppedSignificantTerm) {
             return new Poly(qDegs, qCoefs, Infinity, this.coefType);
        }

        // Otherwise, return truncated series.
        // The order is exactly the limit we calculated up to.
        return new Poly(qDegs, qCoefs, limitDeg, this.coefType);
    }


   /**
     * Checks equality with another polynomial or scalar.
     * @param {Poly|number|BigFloat|Complex} other - The object to compare with.
     * @param {Function} [cmp] - Optional comparator (a, b) => boolean. 
     *                           Defaults to checking a.equals(b) or strict equality.
     * @returns {boolean}
     */
    equals(other, cmp) {
        // 1. Normalize other to Poly
        const B = (other instanceof Poly) ? other : this._wrap(other);

        // 2. Strict Equality (No Comparator)
        // Must match exact structure and order
        if (!cmp) {
            if (this.o !== B.o) return false;
            if (this.degs.length !== B.degs.length) return false;
            for (let i = 0; i < this.degs.length; i++) {
                if (this.degs[i] !== B.degs[i]) return false;
                const cA = scalar(this.coefs[i]);
                const cB = scalar(B.coefs[i]);
                if (cA && cA.equals) {
                    if (!cA.equals(cB)) return false;
                } else {
                    if (cA !== cB) return false;
                }
            }
            return true;
        }

        // 3. Approximate Equality (With Comparator)
        // Only compare coefficients up to the lower precision (min order).
        // Terms at or beyond the minimum order are considered "unknown" in the lower-order polynomial,
        // so we cannot assert equality or inequality.
        const limit = Math.min(this.o, B.o);
        
        let i = 0, j = 0;
        while (i < this.degs.length || j < B.degs.length) {
            const degA = (i < this.degs.length) ? this.degs[i] : Infinity;
            const degB = (j < B.degs.length) ? B.degs[j] : Infinity;

            // Stop comparison if we reach the limit of precision
            const minDeg = Math.min(degA, degB);
            if (minDeg >= limit) break;

            if (degA === degB) {
                // Both exist: compare values
                if (!cmp(this.coefs[i], B.coefs[j])) return false;
                i++; j++;
            } else if (degA < degB) {
                // A has term, B missing (treat B as 0)
                if (!cmp(this.coefs[i], undefined)) return false;
                i++;
            } else {
                // B has term, A missing (treat A as 0)
                if (!cmp(undefined, B.coefs[j])) return false;
                j++;
            }
        }

        return true;
    }


    /** @type {function(any): Poly} */
    operatorAdd(b) { return this.add(b); }
    /** @type {function(any): Poly} */
    operatorSub(b) { return this.sub(b); }
    /** @type {function(any): Poly} */
    operatorMul(b) { return this.mul(b); }
    /** @type {function(any): Poly} */
    operatorDiv(b) { return this.div(b); }
    /** @type {function(number, number=): Poly} */
    operatorPow(b) { return this.pow(b); }
    /** @type {function(): Poly} */
    operatorNeg() { return this.mul(-1); }

    /**
     * Derivative
     * d/dx ( c * x^k ) = (c*k) * x^(k-1)
     * @returns {Poly}
     */
    deriv() {
        const newDegs = [];
        const newCoefs = [];
        
        for (let i = 0; i < this.degs.length; i++) {
            const d = this.degs[i];
            if (d === 0) continue; // Constant term vanishes
            
            const k = new this.coefType(d);
            newDegs.push(d - 1);
            newCoefs.push(this.coefs[i].mul(k));
        }
        
        // Order decreases by 1
        const newOrder = (this.o === Infinity) ? Infinity : Math.max(0, this.o - 1); // Note: For Laurent, order decrease logic is same
        return new Poly(newDegs, newCoefs, newOrder,this.coefType);
    }

    /**
     * Formal Integration
     * int ( c * x^k ) = (c / (k+1)) * x^(k+1)
     * Constant term set to 0.
     * @returns {Poly}
     */
    integ() {
        const newDegs = [];
        const newCoefs = [];

        for (let i = 0; i < this.degs.length; i++) {
            const d = this.degs[i];
            
            // Check for 1/x term which integrates to ln(x), not a Laurent series
            if (d === -1) {
                throw new Error("Integration of 1/x term (logarithm) is not supported in Laurent series.");
            }

            // Order check: if term degree exceeds order (unlikely in storage but valid for logic)
            if (this.o !== Infinity && d >= this.o) continue;

            const kPlus1 = new this.coefType(d + 1);
            newDegs.push(d + 1);
            newCoefs.push(this.coefs[i].div(kPlus1));
        }

        // Order increases by 1
        const newOrder = (this.o === Infinity) ? Infinity : this.o + 1;
        return new Poly(newDegs, newCoefs, newOrder,this.coefType);
    }

    /**
     * Power for Series: P(x)^(n/d)
     * Supports negative and fractional powers.
     * 
     * Requirements:
     * 1. Must be a Series (Order != Infinity).
     * 2. Resulting valuation must be integer.
     * 
     * @param {number} n - Numerator
     * @param {number} [d=1] - Denominator
     * @returns {Poly}
     */
    powSeries(n, d = 1) {
        if (this.o === Infinity) {
            throw new Error("powSeries requires a truncated series (O(n)). Use Poly.O(k) to specify precision.");
        }
        
        // Exponent alpha = n / d
        const alpha = new this.coefType(n).div(new this.coefType(d));

        // 1. Analyze Valuation and Leading Coefficient
        const v = this.valuation(); // Lowest degree
        if (v === Infinity || v >= this.o) {
            // Zero polynomial case
            if (n > 0) return Poly.O(this.o, this.coefType); // 0^pos = 0
            throw new Error("Division by zero (0^neg)");
        }
        
        // Calculate new valuation
        // v * (n/d) must be integer
        if ((v * n) % d !== 0) {
            throw new Error(`Resulting degree ${v*n}/${d} is not an integer.`);
        }
        const newV = (v * n) / d;
        // Negative powers (Laurent Series) are now supported, so check removed.
        
        // 2. Normalize: P(x) = c * x^v * (1 + Delta)
        const c = this.coefs[0]; // Coeff at valuation
        
        // Calculate factor = c^(n/d) * X^(newV)
        // Note: BigFloat pow/root required here
        let cPow;
        if (d === 1) cPow = c.pow(new this.coefType(n));
        else {
             // c^(n/d) = (c^n)^(1/d). Assuming BigFloat supports pow(BigFloat) or we do pow(n).root(d)
             // fallback to generic pow if available
             cPow = c.pow(alpha); 
        }

        // Delta = (P / (c * x^v)) - 1
        // We construct Delta coefficients directly to save alloc
        // We only need terms up to relative precision: order - v
        const relPrec = this.o - v;
        const deltaMap = new Map(); // Degree -> Coeff
        
        for (let i = 1; i < this.degs.length; i++) {
            const deg = this.degs[i] - v;
            if (deg >= relPrec) break;
            deltaMap.set(deg, this.coefs[i].div(c));
        }

        // 3. Compute (1 + Delta)^alpha using J.C.P. Miller Formula
        // R = 1 + b1*x + b2*x^2 ...
        // b_k = (1/k) * sum_{j=1}^{k} [ alpha*j - (k-j) ] * a_j * b_{k-j}
        // Here a_j are coeffs of Delta. a_0 = 1 (implicit).
        
        const limit = relPrec; // Number of terms to compute
        const b = [new this.coefType(1)]; // b_0 = 1
        
        // Pre-convert Delta to dense-ish array for easier index access in loop
        // We only need a_j for j in [1, limit]
        const a = new Array(limit + 1).fill(null);
        for(const [deg, val] of deltaMap) {
            if (deg <= limit) a[deg] = val;
        }

        for (let k = 1; k < limit; k++) {
            let sum = new this.coefType(0);
            for (let j = 1; j <= k; j++) {
                if (a[j]) {
                    // term = (alpha * j - (k - j))
                    // (alpha*j - k + j) = ((alpha+1)*j - k)
                    const termScore = alpha.add(new this.coefType(1)).mul(new this.coefType(j)).sub(new this.coefType(k));
                    sum = sum.add(termScore.mul(a[j]).mul(b[k - j]));
                }
            }
            b[k] = sum.div(new this.coefType(k));
        }

        // 4. Reconstruct Result
        // Result = cPow * X^newV * (sum b_k X^k)
        //        = sum (cPow * b_k) * X^(newV + k)
        
        const resDegs = [];
        const resCoefs = [];
        const resultOrder = this.o - v + newV; // Absolute order shift

        for (let k = 0; k < b.length; k++) {
            if (b[k].isZero()) continue;
            
            const finalDeg = newV + k;
            if (finalDeg >= resultOrder) break;

            resDegs.push(finalDeg);
            resCoefs.push(cPow.mul(b[k]));
        }

        return new Poly(resDegs, resCoefs, resultOrder,this.coefType);
    }


    // --- Transcendental Functions (Series Expansion) ---

    /**
     * Checks if the polynomial has a defined order.
     * Transcendental functions require truncation to avoid infinite loops.
     * @private
     * @param {string} op - The operation name.
     */
    _checkSeries(op) {
        // Allow Exact Constants (degree <= 0) to proceed.
        // E.g. exp(1) is valid. Infinite series only happens if there is a variable part (degree > 0).
        if (this.o === Infinity && this.degree() > 0) {
            throw new Error(`${op} requires a truncated series (O(n)). Use Poly.O(k) to specify precision.`);
        }
        // Essential Singularity check: Transcendental functions are not defined for Laurent series with negative valuation (e.g. e^(1/x)).
        if (this.valuation() < 0) {
            throw new Error(`${op} undefined for Laurent series (negative valuation/essential singularity).`);
        }
    }

    /**
     * Splits polynomial into Constant term (c0) and Variable part (V).
     * P(x) = c0 + V(x)
     * @private
     * @returns {[any, Poly]} [c0, V]
     */
    _splitConst() {
        const c0 = (this.degs.length > 0 && this.degs[0] === 0) ? this.coefs[0] : new this.coefType(0);
        // V = P - c0. Since c0 is just the term at index 0 (if sorted), 
        // effectively V is Poly with same degs/coefs but first removed if deg is 0.
        // Using sub() is safer generic way.
        const V = this.sub(c0); 
        return [c0, V];
    }

    /**
     * Exponential Function: e^P(x)
     * e^(c0 + V) = e^c0 * e^V
     * e^V = 1 + V + V^2/2! + V^3/3! + ...
     * @returns {Poly}
     */
    exp() {
        this._checkSeries("exp");
        const [c0, V] = this._splitConst();

        // 1. Calculate constant factor e^c0
        const expC0 = c0.exp();

        // If Variable part is zero, return scalar with the original Order.
        // Don't return strict poly(val) which has Order=Infinity.
        if (V.degs.length === 0) {
            return new Poly([0], [expC0], this.o,this.coefType);
        }
        // 2. Compute e^V = sum(V^k / k!)
        // Since V has valuation >= 1, V^k has valuation >= k.
        // We stop when k >= order.
        let result = new Poly([0], [new this.coefType(1)], this.o,this.coefType); // 1
        let term = new Poly([0], [new this.coefType(1)], this.o,this.coefType);   // V^0 / 0!
        
        // Loop limit: The series will vanish when valuation of term exceeds order
        // Practical limit: this.o
        for (let k = 1; k < this.o + 2; k++) {
            // term_k = term_{k-1} * V / k
            term = term.mul(V);
            
            // Optimization: If term becomes 0 (due to truncation), stop
            if (term.degs.length === 0) break;

            // Divide by k
            const kBf = new this.coefType(k);
            // We multiply scalars to coefficients directly for efficiency 
            // but here we rely on standard ops for code clarity
            // term = term / k
            const invK = new this.coefType(1).div(kBf);
            
            // Reconstruct term with scaled coeffs (scalar multiplication)
            // Or just use mul(scalar) if Poly supports it. 
            // Since our mul supports Poly only in prev snippet, we use wrap logic inside mul 
            // or we add a scalar multiplication helper. 
            // Assuming we stick to existing API:
            term = term.mul(invK);

            result = result.add(term);
        }

        return result.mul(expC0);
    }

    /**
     * Natural Logarithm: ln(P(x))
     * Uses Derivative-Integration method:
     * ln(P) = int( P' / P ) dx + ln(P(0))
     * @returns {Poly}
     */
    log() {
        this._checkSeries("log");
        const c0 = this.eval(0);
        
        if (c0.isZero()) {
            throw new Error("log(P) undefined: Constant term is zero.");
        }

        // 1. Compute logarithmic derivative: P' / P
        const deriv = this.deriv();
        const quot = deriv.div(this);

        // 2. Integrate
        const integ = quot.integ();

        // 3. Add constant term ln(c0)
        // Note: c0 can be negative/complex, handled by BigFloat/Complex class
        const lnC0 = c0.log();
        return integ.add(lnC0);
    }

    /**
     * Sine: sin(P(x))
     * sin(c0 + V) = sin(c0)cos(V) + cos(c0)sin(V)
     * @returns {Poly}
     */
    sin() {
        this._checkSeries("sin");
        const [c0, V] = this._splitConst();
        
        // If V is zero, return scalar sin(c0)
        if (V.degs.length === 0) {
            return new Poly([0], [c0.sin()], this.o,this.coefType);
        }

        const s0 = c0.sin();
        const c0_val = c0.cos();

        const [sinV, cosV] = this._sinCosV(V);
        
        // result = s0 * cosV + c0 * sinV
        const term1 = cosV.mul(s0); // s0 is scalar, auto-wrapped
        const term2 = sinV.mul(c0_val);
        return term1.add(term2);
    }

    /**
     * Cosine: cos(P(x))
     * cos(c0 + V) = cos(c0)cos(V) - sin(c0)sin(V)
     * @returns {Poly}
     */
    cos() {
        this._checkSeries("cos");
        const [c0, V] = this._splitConst();

        if (V.degs.length === 0) {
            return new Poly([0], [c0.cos()], this.o,this.coefType);
        }

        const c0_val = c0.cos();
        const s0 = c0.sin();

        const [sinV, cosV] = this._sinCosV(V);

        // result = c0 * cosV - s0 * sinV
        const term1 = cosV.mul(c0_val);
        const term2 = sinV.mul(s0);
        return term1.sub(term2);
    }

    /**
     * Tangent: tan(P(x))
     * tan(P) = sin(P) / cos(P)
     * @returns {Poly}
     */
    tan() {
        // Could use tan(c0+V) formula, but sin/cos is robust enough.
        return this.sin().div(this.cos());
    }

    /**
     * Arcsine: asin(P(x))
     * asin(P) = int( P' / sqrt(1 - P^2) ) + asin(P(0))
     * @returns {Poly}
     */
    asin() {
        this._checkSeries("asin");
        const c0 = this.eval(0);
        
        // Derivative P'
        const dP = this.deriv();
        
        // Denominator: sqrt(1 - P^2) = (1 - P^2)^(1/2)
        // 1 - P^2
        const pSq = this.mul(this);
        const oneMinusPSq = poly(1,this.coefType).sub(pSq);
        
        // sqrt(...)
        const denom = oneMinusPSq.powSeries(1, 2); // (1-P^2)^0.5
        
        // Integrand: P' / Denom
        const integrand = dP.div(denom);
        
        // Result: int(...) + asin(c0)
        return integrand.integ().add(c0.asin());
    }

    /**
     * Arccosine: acos(P(x))
     * acos(P) = PI/2 - asin(P)
     * @returns {Poly}
     */
    acos() {
        // Use identity or integral: - int( P' / sqrt(1 - P^2) )
        // Using asin reuse:
        const piDiv2 = new this.coefType(Math.PI).div(new this.coefType(2)); // Better if new this.coefType has PI constant
        return poly(piDiv2,this.coefType).sub(this.asin());
    }

    /**
     * Arctangent: atan(P(x))
     * atan(P) = int( P' / (1 + P^2) ) + atan(P(0))
     * @returns {Poly}
     */
    atan() {
        this._checkSeries("atan");
        const c0 = this.eval(0);

        const dP = this.deriv();
        const pSq = this.mul(this);
        const denom = poly(1,this.coefType).add(pSq);
        
        const integrand = dP.div(denom);
        
        return integrand.integ().add(c0.atan());
    }

    // --- Helper for Sin/Cos ---

    /**
     * Computes sin(V) and cos(V) for a polynomial V with no constant term.
     * Uses Taylor series optimized for simultaneous calculation.
     * sin(V) = V - V^3/3! + V^5/5! ...
     * cos(V) = 1 - V^2/2! + V^4/4! ...
     * @private
     * @param {Poly} V 
     * @returns {[Poly, Poly]} [sinV, cosV]
     */
    _sinCosV(V) {
        // sinV starts at V, cosV starts at 1
        let sinV = V;
        let cosV = poly(1,this.coefType);

        // V2 = V*V
        const V2 = V.mul(V);
        if (V2.degs.length === 0) return [sinV, cosV]; // High order cutoff

        // Term accumulator for odd/even powers
        // We start loop from k=1. 
        // For cos: term is (-1)^k * V^(2k) / (2k)!
        // For sin: term is (-1)^k * V^(2k+1) / (2k+1)!
        
        let termP = V; // Current power of V for Sin (starts V^1)
        // Actually, better to iterate term value directly
        // cos term starts at 1. sin term starts at V.
        
        let tCos = poly(1,this.coefType);
        let tSin = V;
        
        // We iterate step 2 (multiplying by -V^2)
        // cos series: 1, -V^2/2!, +V^4/4!
        // sin series: V, -V^3/3!, +V^5/5!
        
        // Loop sufficient times. Since V has valuation >=1, V^k val >= k.
        // Stop when 2k > order.
        
        for (let k = 1; k * 2 <= this.o + 2; k++) {
            // Update terms by multiplying -V^2
            // And dividing by appropriate integers
            
            // Next Cos Term: prev * (-V^2) / ((2k-1)*2k)
            // Indices: 1->2, 2->4... 
            // k=1: multiply by -V^2 / (1*2) -> -V^2/2!
            // k=2: multiply by -V^2 / (3*4) -> +V^4/4!
            
            const negV2 = V2.mul(new this.coefType(-1)); 
            
            // Cos update
            // divisor = (2k)(2k-1)
            const divCos = new this.coefType(2*k).mul(new this.coefType(2*k - 1));
            tCos = tCos.mul(negV2).mul(new this.coefType(1).div(divCos));
            if (tCos.degs.length === 0 && tSin.degs.length === 0) break;
            cosV = cosV.add(tCos);

            // Sin update
            // sin term goes V -> V^3 -> V^5
            // k=1: V * (-V^2) / (2*3) -> -V^3/3!
            // divisor = (2k)(2k+1)
            const divSin = new this.coefType(2*k).mul(new this.coefType(2*k + 1));
            tSin = tSin.mul(negV2).mul(new this.coefType(1).div(divSin));
            sinV = sinV.add(tSin);
        }
        
        return [sinV, cosV];
    }

    // --- Utilities ---

    /**
     * Converts the polynomial to a string representation.
     * @param {number} [radix=10]
     * @param {number} [precision=20]
	 * @param {boolean} [pretty=true] pretty print
     * @returns {string}
     */
    toString(radix=10, precision=20, pretty=true) {        
        let parts = [];
        for (let i = 0; i < this.degs.length; i++) {
            const d = this.degs[i];
            const c = this.coefs[i];
            if(c.isZero()){
                continue;
            }
            const cStr = c.toString(radix, precision, pretty); // Assume BigFloat/Complex toString
            
            let part = "";
            if (d === 0) part = cStr;
            else if (d === 1) part = `${cStr}X`;
            else part = `${cStr}X^${d}`;
            
            parts.push(part);
        }
        if (this.o !== Infinity) {
            parts.push(`O(X^${this.o})`);
        }
        let s = parts.join(" + ");
        if(s.length==0){
            s="0";
        }
        return s;
    }
}

// Global Exports
/**
 * Factory for creating a polynomial representing X^n.
 * @param {number} [n=1] - The degree of X.
 * @param {Function} [coefType=BigFloat] - The coefficient type.
 * @returns {Poly}
 */
export function X(n=1,coefType=BigFloat){
    return Poly.X(n,coefType);
}

/**
 * Factory for creating a Big-O term O(X^n).
 * @param {number} [n=1] - The order of the truncation.
 * @param {Function} [coefType=BigFloat] - The coefficient type.
 * @returns {Poly}
 */
export function O(n=1,coefType=BigFloat) {
   return Poly.O(n,coefType);
}


/**
 * Factory function to create a Poly instance using a State Machine parser.
 * This parser avoids regex for core logic to handle complex nested structures and strict validation.
 * 
 * Supported formats examples:
 *  - Integer/Fraction: "1", "-1", "+-1", "-2/3"
 *  - Variables: "X", "-X", "-2X", "-2*X"
 *  - Exponents: "X^2", "X^-1", "X^(-1)", "X^0"
 *  - Complex in parens: "(-1+i)X", "(3+2i)"
 *  - Big-O: "+O(3)", "O(X^5)"
 * 
 * @param {string} v 
 * @param {Function} [coefType=Scalar] - The class used to wrap/construct coefficients.
 * @returns {Poly}
 */
export function polyStr(v, coefType = Scalar) {
    // 1. Pre-processing
    // Standardize 'I' to 'i' and trim whitespace
    const s = v.replace(/I/g, "i").trim();
    if(!(coefType === Scalar)){
        if(v.indexOf("i")!=-1){
            if(!(coefType === Complex)){
                throw new Error(`Need complex, get ${coefType.name}`);
            }
        }
        if(v.indexOf("/")!=-1){
            if(!(coefType === BigFraction)){
                throw new Error(`Need complex, get ${coefType.name}`);
            }
        }
    }

    const len = s.length;
    
    let cursor = 0;
    let order = Infinity;
    const degs = [];
    const coefs = [];

    // Helper: Check bounds
    const eof = () => cursor >= len;
    
    // Helper: Peek current character
    const peek = () => cursor < len ? s[cursor] : null;
    
    // Helper: Consume current character and advance
    const consume = () => s[cursor++];

    // Helper: Error generator
    const error = (msg) => {
        throw new Error(`Parse Error at index ${cursor} ('${peek()}'): ${msg} in string "${s}"`);
    };

    // Helper: Check if char is whitespace
    const isSpace = (c) => /\s/.test(c);
    
    // Helper: Check if char is part of a number (digit, dot)
    const isDigitStart = (c) => /[0-9.]/.test(c);

    // State Machine Loop (Term by Term)
    while (!eof()) {
        // --- State 0: Sign Parsing ---
        // Consume all leading spaces, +, - to determine the term's sign
        let sign = 1;
        let hasSign = false; // Track if we actually saw a sign
        
        while (!eof()) {
            const c = peek();
            if (isSpace(c)) {
                consume();
            } else if (c === '+') {
                consume();
                hasSign = true;
            } else if (c === '-') {
                sign *= -1;
                consume();
                hasSign = true;
            } else {
                break; // Found start of term content
            }
        }

        if (eof()) {
            // String ended with signs? e.g. "1 + "
            // If we parsed signs but no content followed, it's an error.
            if (hasSign) error("Unexpected end of string after sign.");
            break; 
        }

        // --- State 1: Determine Term Type ---
        const char = peek();
        let currentCoefStr = "";
        let currentDeg = 0;
        let isBigO = false;

        if (char === 'O') {
            // Case: Big-O term like O(X^n) or O(n)
            isBigO = true;
        } else if (char === 'X') {
            // Case: Implicit coefficient 1. e.g. "-X" -> sign=-1, coef=1, var=X
            currentCoefStr = "1"; 
            // Don't consume X yet, let Variable Parser handle it
        } else if (isDigitStart(char) || char === '(' || char === 'i') {
            // Case: Explicit coefficient. e.g. "2", "2.5", "(1+i)", "i"
            
            // --- State 2: Parse Coefficient String ---
            if (char === '(') {
                // Consume balanced parentheses for complex numbers: (1+i)
                let balance = 0;
                let start = cursor;
                do {
                    const c = consume();
                    if (c === '(') balance++;
                    else if (c === ')') balance--;
                } while (!eof() && balance > 0);

                if (balance !== 0) error("Unbalanced parentheses in coefficient.");
                currentCoefStr = s.substring(start, cursor);
            } else {
                // Read Literal (Numbers, Fractions, i)
                // We read until we hit 'X', '*', 'O', or next Sign (+/-)
                let start = cursor;
                while (!eof()) {
                    const c = peek();
                    if (c === 'X' || c === '*' || c === '+' || c === '-') break;
                    // Note: 'O' shouldn't appear in middle of coef unless it's a variable name, which isn't allowed here
                    // Allow digits, ., i, / (for fractions like 2/3)
                    if (/[0-9.i/]/.test(c) || isSpace(c)) {
                        consume();
                    } else {
                        error(`Unexpected character in coefficient: ${c}`);
                    }
                }
                currentCoefStr = s.substring(start, cursor).replace(/\s+/g, ''); // remove spaces
            }
        } else {
            error("Expected digit, 'X', 'O', or '(' start.");
        }

        // --- State 3: Big-O Processing ---
        if (isBigO) {
            consume(); // 'O'
            while(!eof() && isSpace(peek())) consume();
            if (consume() !== '(') error("Expected '(' after 'O'.");
            
            // Parse inside O(...)
            // Supports O(3) or O(X^3)
            let innerContent = "";
            let balance = 1;
            while (!eof()) {
                const c = consume();
                if (c === '(') balance++;
                else if (c === ')') {
                    balance--;
                    if (balance === 0) break;
                }
                innerContent += c;
            }
            if (balance !== 0) error("Unclosed 'O(...)'.");

            // Extract order from innerContent
            // Remove "X^" if present to unify O(X^3) and O(3)
            let orderValStr = innerContent.replace(/\s+/g, '').replace('X^', '');
            
            // If user typed O(X), it means O(X^1)
            if (orderValStr === 'X') orderValStr = '1';

            const parsedOrder = parseInt(orderValStr, 10);
            if (isNaN(parsedOrder)) error(`Invalid number in O term: ${innerContent}`);
            
            // Update Poly order (take the minimum if multiple O found, or just overwrite? Standard behavior is usually min, but simple overwrite here)
            order = parsedOrder;
            
            continue; // Done with this term, loop to next
        }

        // --- State 4: Separator Handling ---
        // Handle explicit multiplication like "2*X"
        while(!eof() && isSpace(peek())) consume();
        if (peek() === '*') {
            consume();
            while(!eof() && isSpace(peek())) consume();
        }

        // --- State 5: Variable Parsing (X) ---
        if (peek() === 'X') {
            consume(); // eat X
            currentDeg = 1; // Default degree if X is present

            // Check for Exponent
            while(!eof() && isSpace(peek())) consume();
            if (peek() === '^') {
                consume(); // eat ^
                while(!eof() && isSpace(peek())) consume();

                // Parse Exponent Value
                // Can be "2", "-1", "(2)", "(-1)"
                let expStr = "";
                let inParen = false;

                if (peek() === '(') {
                    consume();
                    inParen = true;
                }

                // Read exponent digits/sign
                if (peek() === '+' || peek() === '-') expStr += consume();
                while (!eof() && /[0-9]/.test(peek())) {
                    expStr += consume();
                }

                if (inParen) {
                    while(!eof() && isSpace(peek())) consume();
                    if (consume() !== ')') error("Missing closing paren for exponent.");
                }

                if (expStr === "" || expStr === "+" || expStr === "-") {
                    error("Missing value for exponent.");
                }
                
                currentDeg = parseInt(expStr, 10);
            }
        } else {
            // No X found. 
            // If we had a coefficient, this is a constant term (deg=0).
            // Example: "1", "(-1+i)"
            currentDeg = 0;
            
            // Validation: We must ensure we didn't just stop randomly.
            // The loop condition handles "next is sign", but if we hit garbage:
            // e.g. "2Y" -> Y is garbage here
            if (!eof() && !/[+-]/.test(peek())) {
                // If the next char is NOT a sign start, and we haven't finished string, it's garbage.
                 error(`Unexpected character after coefficient: ${peek()}`);
            }
        }

        // --- State 6: Construct and Store Term ---
        
        // Process Coefficient String
        let val;
        
        // Strip outer parens from string if present e.g. "(1+i)" -> "1+i"
        if (currentCoefStr.startsWith('(') && currentCoefStr.endsWith(')')) {
            currentCoefStr = currentCoefStr.substring(1, currentCoefStr.length - 1);
        }

        if (!currentCoefStr) {
             // Should not happen for valid terms based on logic above (either '1' was set for X, or parsed digits)
             // But purely defensive:
             error("Empty coefficient.");
        }

        // Create Scalar
        if (typeof coefType.fromString === 'function') {
            val = coefType.fromString(currentCoefStr);
        } else {
            val = new coefType(currentCoefStr);
        }

        // Apply Sign
        if (sign === -1) {
            if (typeof val.neg === 'function') {
                val = val.neg();
            } else if (typeof val.mul === 'function') {
                val = val.mul(new coefType(-1));
            } else {
                val = val * -1;
            }
        }

        // Filter zero coefficients (Optional, but good practice)
        const isZero = (typeof val.isZero === 'function') ? val.isZero() : (val == 0);
        if (!isZero) {
            degs.push(currentDeg);
            coefs.push(val);
        }
    }

    return new Poly(degs, coefs, order, coefType);
}


/**
 * Factory function to create a Poly instance from various inputs.
 * Now uses the Scalar class for coefficient parsing and unified representation.
 * 
 * @param {string | Array<any> | Object<string, any> | Map<string, any> | number | bigint | BigFloat | BigFraction | Complex | Poly | Scalar} v 
 * @param {Function} [coefType=BigFloat] - The class used to construct coefficients.
 * @returns {Poly}
 */
export function poly(v, coefType = BigFloat) {
    if(typeof(v)==="string"){
        return polyStr(v, coefType);
    }

    if (v instanceof Poly) return v;

    // 1. Handle Dense Array (e.g., [1, 0, "1/3"]) -> 0-based index
    if (Array.isArray(v)) {
        const degs = [];
        const coefs = [];
        for (let i = 0; i < v.length; i++) {
            const val = v[i];
            const s = (typeof val === "object" && val !== null) ? val : new coefType(val);
            if (!s.isZero()) {
                degs.push(i);
                coefs.push(s); 
            }
        }
        return new Poly(degs, coefs, Infinity, coefType);
    }

    // 2. Handle Map or Plain Object (Dictionary) -> Explicit degrees (allows negative)
    // Example: { "-2": 1, "0": 5 } => X^-2 + 5
    if (typeof v === 'object' && v !== null && !(v instanceof coefType) && typeof v.isZero !== 'function') {
        const degs = [];
        const coefs = [];
        const entries = (v instanceof Map) ? v.entries() : Object.entries(v);
        
        for (const [key, val] of entries) {
            const d = parseInt(key, 10);
            if (isNaN(d)) continue; // Skip non-integer keys
            
            const s = (typeof val === "object" && val !== null) ? val : new coefType(val);
            if (!s.isZero()) {
                degs.push(d);
                coefs.push(s);
            }
        }
        return new Poly(degs, coefs, Infinity, coefType);
    }

    // 3. Scalar / Single Value
    // Fixed bug: 'val' was undefined in original code, changed to use 'v'
    const s = (typeof v === "object" && v !== null) ? v : new coefType(v);
    if (s.isZero()) {
        return new Poly([], [], Infinity, coefType);
    }
    return new Poly([0], [s], Infinity, coefType);
}