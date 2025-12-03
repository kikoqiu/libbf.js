import { bf, BigFloat } from "./bf.js";

/**
 * Helper function to calculate Greatest Common Divisor (GCD) using Euclidean algorithm.
 * @param {bigint} a 
 * @param {bigint} b 
 * @returns {bigint}
 */
const gcd = (a, b) => {
    return b === 0n ? a : gcd(b, a % b);
};


/**
 * Calculates the integer square root of a BigInt.
 * Returns undefined if the value is negative or not a perfect square.
 * @param {bigint} value 
 * @returns {bigint|undefined}
 */
const bigIntSqrt = (value) => {
    // Return undefined for negative inputs as they have no real square root
    if (value < 0n) return undefined;
    if (value < 2n) return value;

    let x0 = value;
    let x1 = (x0 + value / x0) >> 1n;

    // Newton's method for integer square root
    while (x1 < x0) {
        x0 = x1;
        x1 = (x0 + value / x0) >> 1n;
    }

    // Check if the result is a perfect square
    // BigInt division truncates, so we must verify by squaring the result
    return (x0 * x0 === value) ? x0 : undefined;
};



// ==========================================
// Performance Helpers (Module Level)
// ==========================================

// Shared buffers to avoid allocation overhead on every instantiation.
const _buf = new ArrayBuffer(8);
const _f64 = new Float64Array(_buf);
const _u64 = new BigUint64Array(_buf);

/**
 * Rapidly converts a JS Number to BigInt numerator and denominator
 * by directly accessing IEEE 754 bits.
 * 
 * Formula: Value = (-1)^S * (1 + Mantissa/2^52) * 2^(Exponent - 1023)
 * @param {number} val
 * @returns {{n: bigint, d: bigint}}
 */
const fromDouble = (val) => {
    _f64[0] = val;
    const bits = _u64[0];

    // Extract IEEE 754 components
    const sign = (bits >> 63n) ? -1n : 1n;
    const exponent = (bits >> 52n) & 0x7FFn;
    let mantissa = bits & 0xFFFFFFFFFFFFFn;

    // Handle 0
    if (exponent === 0n && mantissa === 0n) {
        return { n: 0n, d: 1n };
    }

    // Handle Subnormals (exponent = 0) vs Normals
    let shift;
    if (exponent === 0n) {
        // Subnormal: val = mantissa * 2^(1 - 1023 - 52)
        // exp is effectively -1022, mantissa has no implicit leading 1
        shift = 1n - 1023n - 52n; 
    } else {
        // Normal: val = (1.mantissa) * 2^(exponent - 1023)
        // We treat 1.mantissa as (1<<52 + mantissa) * 2^-52
        mantissa |= 0x10000000000000n; // Add implicit leading 1
        shift = exponent - 1023n - 52n;
    }

    // Construct Numerator and Denominator based on shift (exponent)
    let num, den;
    if (shift >= 0n) {
        // Number is integer or large: 5.0 -> 5 * 2^0
        num = mantissa << shift;
        den = 1n;
    } else {
        // Number is fraction: 0.5 -> 1 * 2^-1
        num = mantissa;
        den = 1n << (-shift);
    }

    // Apply Sign
    if (sign < 0n) num = -num;

    return { n: num, d: den };
};


/**
 * @class BigFraction
 * @description A class for arbitrary-precision rational number arithmetic.
 */
export class BigFraction {
    /**
     * Optimized Constructor.
     * 
     * Supports:
     * 1. Number (Float): Uses bitwise extraction (Fastest, Exact).
     * 2. Number (Integer): Direct BigInt conversion.
     * 3. String: "1.5", "1/2", "-5".
     * 4. BigInt / BigFraction.
     * @param {BigFraction | bigint | number | string} [n] - The numerator or the whole value.
     * @param {bigint | number | string} [d] - The denominator.
     */
    constructor(n, d) {
        // 1. Handle Copy Constructor
        if (n instanceof BigFraction) {
            this.n = n.n;
            this.d = n.d;
            return;
        }

        let num = 0n;
        let den = 1n;

        // 2. Identify Input Type
        const typeN = typeof n;

        if (typeN === 'bigint') {
            num = n;
            den = (d !== undefined) ? BigInt(d) : 1n;
        } 
        else if (typeN === 'number') {
            if (Number.isInteger(n)) {
                // Fast path for integers
                num = BigInt(n);
                den = (d !== undefined) ? BigInt(d) : 1n;
            } else if (!Number.isFinite(n)) {
                 // NaN or Infinity
                this.n = 0n; 
                this.d = 0n; // Mark as NaN
                return;
            } else {
                // Fast bitwise float extraction (No strings)
                const res = fromDouble(n);
                num = res.n;
                den = res.d;
                // Note: 'd' argument is ignored when n is a float, 
                // as a float contains its own denominator data.
            }
        } 
        else if (typeN === 'string') {
            // String Parsing
            if (n.includes('/')) {
                const parts = n.split('/');
                num = BigInt(parts[0]);
                den = BigInt(parts[1]);
            } else if (n.includes('.')) {
                const [intPart, fracPart] = n.split('.');
                num = BigInt(intPart + fracPart);
                den = 10n ** BigInt(fracPart.length);
            } else {
                num = BigInt(n);
                den = 1n;
            }
            
            // If second arg provided for string (rare case: new Fraction("1", "2"))
            if (d !== undefined) {
                const den2 = BigInt(d);
                den = den * den2;
            }
        } 
        else {
            // Default / Empty
            num = 0n;
            den = 1n;
        }

        // 3. Normalization & Simplification
        if (den === 0n) {
            this.n = 0n;
            this.d = 0n; // NaN
        } else {
            if (den < 0n) {
                num = -num;
                den = -den;
            }
            // Simplify using GCD
            // Note: Binary conversion of floats often produces large even numbers,
            // so GCD is crucial here.
            const common = gcd(num > 0n ? num : -num, den);
            this.n = num / common;
            this.d = den / common;
        }
    }

    // ===========================
    // Core Arithmetic Methods
    // ===========================

    /**
     * Adds another fraction.
     * @param {BigFraction|bigint|number|string} b 
     * @returns {BigFraction} New Fraction instance
     */
    add(b) {
        const other = new BigFraction(b);
        // a/b + c/d = (ad + bc) / bd
        return new BigFraction(
            this.n * other.d + other.n * this.d,
            this.d * other.d
        );
    }

    /**
     * Subtracts another fraction.
     * @param {BigFraction|bigint|number|string} b 
     * @returns {BigFraction}
     */
    sub(b) {
        const other = new BigFraction(b);
        // a/b - c/d = (ad - bc) / bd
        return new BigFraction(
            this.n * other.d - other.n * this.d,
            this.d * other.d
        );
    }

    /**
     * Multiplies by another fraction.
     * @param {BigFraction|bigint|number|string} b 
     * @returns {BigFraction}
     */
    mul(b) {
        const other = new BigFraction(b);
        return new BigFraction(
            this.n * other.n,
            this.d * other.d
        );
    }

    /**
     * Divides by another fraction.
     * @param {BigFraction|bigint|number|string} b 
     * @returns {BigFraction}
     */
    div(b) {
        const other = new BigFraction(b);
        if (other.isZero()) throw new Error("Division by zero");
        // (a/b) / (c/d) = ad / bc
        return new BigFraction(
            this.n * other.d,
            this.d * other.n
        );
    }

    /**
     * Returns the integer square root of the fraction (floor(sqrt(value))).
     * Since BigInt arithmetic is integer based, exact rational roots are rare.
     * This returns a Fraction representing the integer root.
     * @returns {BigFraction|undefined}
     */
    sqrt() {
        if (this.n < 0n) throw new Error("Square root of negative number");
        // We calculate the integer square root of the simplified value (n/d)
        const val = this.n / this.d;
        let s=bigIntSqrt(val);
        return s===undefined?undefined:new BigFraction(s, 1n);
    }

    /**
     * Raises fraction to an integer power.
     * @param {number|bigint|BigFraction} exponent 
     * @returns {BigFraction|undefined}
     */
    pow(exponent) {        
        if(typeof(exponent)==="bigint"){
            //nothing
        }else if(exponent instanceof BigFraction){
            if(exponent.n === 0n || exponent.d===1n){
                exponent = exponent.n;
            }else{
                return undefined;
            }
        }else if(typeof(exponent)==="number"){
            if(Number.isInteger(exponent)){
                exponent=BigInt(exponent);
            }else{
                return undefined;
            }
        }

        let exp = exponent;
        if (exp === 0n) return new BigFraction(1n);

        let num = this.n;
        let den = this.d;

        if (exp < 0n) {
            // Invert if negative exponent
            let temp = num;
            num = den;
            den = temp;
            exp = -exp;
        }

        // Apply power
        return new BigFraction(num ** exp, den ** exp);
    }

    /**
     * Returns the floor of the fraction (largest integer <= value).
     * @returns {BigFraction}
     */
    floor() {
        if (this.d === 0n) return this;
        let res = this.n / this.d;
        // Handling negative numbers: -3/2 = -1.5 -> floor is -2
        // Integer division in JS truncates towards zero (-1), so we need adjustment
        if (this.n < 0n && (this.n % this.d !== 0n)) {
            res -= 1n;
        }
        return new BigFraction(res, 1n);
    }

    /**
     * Negates the value.
     * @returns {BigFraction}
     */
    neg() {
        return new BigFraction(-this.n, this.d);
    }

    /**
     * Returns the absolute value.
     * @returns {BigFraction}
     */
    abs() {
        return new BigFraction(this.n < 0n ? -this.n : this.n, this.d);
    }


    /**
     * Returns e^this. Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    exp() {
        if (this.n === 0n) return new BigFraction(1n);
        return undefined;
    }

    /**
     * Returns log(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    log() {
        if (this.n === this.d && this.d !== 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns sin(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    sin() {
        if (this.n === 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns cos(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    cos() {
        if (this.n === 0n) return new BigFraction(1n);
        return undefined;
    }

    /**
     * Returns tan(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    tan() {
        if (this.n === 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns asin(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    asin() {
        if (this.n === 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns acos(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    acos() {
        if (this.n === this.d && this.d !== 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns atan(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    atan() {
        if (this.n === 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns sinh(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    sinh() {
        if (this.n === 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns cosh(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    cosh() {
        if (this.n === 0n) return new BigFraction(1n);
        return undefined;
    }

    /**
     * Returns tanh(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    tanh() {
        if (this.n === 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns asinh(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    asinh() {
        if (this.n === 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns acosh(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    acosh() {
        if (this.n === this.d && this.d !== 0n) return new BigFraction(0n);
        return undefined;
    }

    /**
     * Returns atanh(this). Placeholder, not implemented.
     * @returns {BigFraction|undefined}
     */
    atanh() {
        if (this.n === 0n) return new BigFraction(0n);
        return undefined;
    }    

    // ===========================
    // Status & Conversion
    // ===========================

    /**
     * Checks if the fraction is technically invalid (denominator was 0).
     * @returns {boolean}
     */
    isNaN() {
        return this.d === 0n;
    }

    /**
     * Checks if the value is zero.
     * @returns {boolean}
     */
    isZero() {
        return this.n === 0n && this.d !== 0n;
    }
    
    /**
     * Checks if the value is zero.
     * @returns {boolean}
     */
    isAlmostZero() {
        return this.n === 0n && this.d !== 0n;
    }

    /**
     * @returns {BigFloat}
     */
    toBigFloat() {
        return bf(this.n).div(bf(this.d));
    }

    /**
     * Converts to a standard JavaScript number (may lose precision).
     * @returns {number}
     */
    toNumber() {
        if (this.d === 0n) return NaN;
        // Convert to number explicitly
        return Number(this.n) / Number(this.d);
    }

    /**
     * Parses a string to create a fraction.
     * Supports integers "123", fractions "1/2", and decimals "1.5".
     * @param {string} str 
     * @returns {BigFraction}
     */
    static fromString(str) {
        if (typeof(str)!="string"){
            throw new Error("not a string");
        }
        return new BigFraction(str);
    }

    /**
     * Converts to string.
	 * @param {number} [radix=10] 
	 * @param {number} [prec=-1] precision digits in radix
	 * @param {boolean} [pretty=false] pretty print
     * @returns {string}
     */
    toString(radix = 10, prec=-1,pretty=false) {
        if (this.d === 1n){
            return this.n.toString(radix, prec, pretty);
        }
        return `${this.n.toString(radix, prec, pretty)}/${this.d.toString(radix, prec, pretty)}`;
    }

    // ===========================
    // Comparisons
    // ===========================

    /**
     * Compares with another value.
     * @param {BigFraction|bigint|number|string} b 
     * @returns {number} -1 if less, 0 if equal, 1 if greater.
     */
    cmp(b) {
        const other = b instanceof BigFraction ? b : new BigFraction(b);
        // Compare n1/d1 vs n2/d2 <=> n1*d2 vs n2*d1
        const left = this.n * other.d;
        const right = other.n * this.d;

        if (left < right) return -1;
        if (left > right) return 1;
        return 0;
    }

    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {boolean}
     */
    equals(b){
        return this.cmp(b)==0;
    }

    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {boolean}
     */
    operatorLess(b) {
        return this.cmp(b) === -1;
    }

    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {boolean}
     */
    operatorGreater(b) {
        return this.cmp(b) === 1;
    }

    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {boolean}
     */
    operatorLessEqual(b) {
        return this.cmp(b) <= 0;
    }

    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {boolean}
     */
    operatorGreaterEqual(b) {
        return this.cmp(b) >= 0;
    }

    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {boolean}
     */
    operatorEqual(b) {
        return this.cmp(b) === 0;
    }

    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {boolean}
     */
    operatorNotEqual(b) {
        return this.cmp(b) !== 0;
    }

    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {BigFraction}
     */
    operatorAdd(b) { return this.add(b); }
    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {BigFraction}
     */
    operatorSub(b) { return this.sub(b); }
    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {BigFraction}
     */
    operatorMul(b) { return this.mul(b); }
    /**
     * @param {BigFraction|bigint|number|string} b 
     * @returns {BigFraction}
     */
    operatorDiv(b) { return this.div(b); }
    /**
     * @param {number|bigint|BigFraction} b 
     * @returns {BigFraction|undefined}
     */
    operatorPow(b) { return this.pow(b); }
    /**
     * @returns {BigFraction}
     */
    operatorNeg() { return this.neg(); }
}

/**
 * Creates a new BigFraction instance.
 * @param {BigFraction | bigint | number | string} [n] - The numerator or the whole value.
 * @param {bigint | number | string} [d=1n] - The denominator.
 * @returns {BigFraction}
 */
export function frac(n,d=1n){
    return new BigFraction(n,d);
}