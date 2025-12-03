import { bf, BigFraction, Complex, BigFloat} from "./bf.js";

/**
 * Scalar Wrapper Class.
 * Manages dispatching and type promotion between BigFraction, BigFloat, and Complex.
 * 
 * Hierarchy:
 * Level 0: BigFraction (Rational)
 * Level 1: BigFloat (Real/Float)
 * Level 2: Complex (Complex)
 * 
 * @property {BigFraction|BigFloat|Complex} value - The underlying numeric value.
 * @property {number} level - The type promotion level (0, 1, or 2).
 */
export class Scalar {
    /**
     * @param {number|bigint|string|BigFraction|BigFloat|Complex|Scalar} v 
     */
    constructor(v) {
        if (v instanceof Scalar) {
            this.value = v.value;
            this.level = v.level;
            return;
        }

        const type = typeof v;

        if (type === 'number') {
            if (Number.isInteger(v)) {
                this.value = new BigFraction(v);
                this.level = 0;
            } else {
                this.value = bf(v); // bf is assumed to be the BigFloat factory
                this.level = 1;
            }
        } 
        else if (type === 'bigint') {
            this.value = new BigFraction(v);
            this.level = 0;
        } 
        else if (type === 'string') {
            const parsed = Scalar.fromString(v);
            this.value = parsed.value;
            this.level = parsed.level;
        } 
        else {
            // v is already a math object (Complex, BigFloat, or BigFraction)
            this.value = v;
            this.level = Scalar.getLevel(v);
        }
    }

    /**
     * Determine the level of a raw math object.
     * @param {any} v The value to check.
     * @returns {number} The promotion level.
     */
    static getLevel(v) {
        if (v instanceof Complex) return 2;
        if (v instanceof BigFloat) return 1;
        if (v instanceof BigFraction) return 0;
        return 1;
    }

    /**
     * Promotes a raw value to the target level.
     * @param {any} v The value to promote.
     * @param {number} targetLevel The target promotion level.
     * @returns {any} The promoted value.
     */
    static promote(v, targetLevel) {
        const currentLevel = Scalar.getLevel(v);
        if (currentLevel >= targetLevel) return v;

        if (targetLevel === 1) {
            // Level 0 -> 1: BigFraction to BigFloat
            return v.toBigFloat ? v.toBigFloat() : bf(v.toString());
        }
        if (targetLevel === 2) {
            // Level 0/1 -> 2: Scalar to Complex
            const realPart = Scalar.promote(v, 1);
            return new Complex(realPart, 0);
        }
        return v;
    }

    // --- Arithmetic Operators ---
    /**
     * Internal dispatcher for binary operations.
     * @private
     * @param {Scalar|any} a - The first operand.
     * @param {Scalar|any} b - The second operand.
     * @param {string} opName - The name of the operation.
     * @returns {Scalar} The result of the operation.
     */
    static _binaryOp(a, b, opName) {
        const va = a instanceof Scalar ? a.value : a;
        const vb = b instanceof Scalar ? b.value : b;

        const levelA = Scalar.getLevel(va);
        const levelB = Scalar.getLevel(vb);

        let na = va;
        let nb = vb;
        for(let targetLevel = Math.max(levelA, levelB);targetLevel<=3;targetLevel++){
            na = Scalar.promote(na, targetLevel);
            nb = Scalar.promote(nb, targetLevel);
            let v = na[opName](nb);
            if(v!==undefined){
                return new Scalar(v);
            }
        }
        throw new Error(`${opName} failed for ${a.toString()}, ${b.toString()}`);
    }


    /** @param {Scalar|any} other @returns {Scalar} */
    add(other) { return Scalar._binaryOp(this, other, 'add'); }
    /** @param {Scalar|any} other @returns {Scalar} */
    sub(other) { return Scalar._binaryOp(this, other, 'sub'); }
    /** @param {Scalar|any} other @returns {Scalar} */
    mul(other) { return Scalar._binaryOp(this, other, 'mul'); }
    /** @param {Scalar|any} other @returns {Scalar} */
    div(other) { return Scalar._binaryOp(this, other, 'div'); }
    /** @param {Scalar|any} other @returns {Scalar} */
    pow(other) { return Scalar._binaryOp(this, other, 'pow'); }

    // Alias for operator styles
    /** @param {Scalar|any} b @returns {Scalar} */
    operatorAdd(b) { return this.add(b); }
    /** @param {Scalar|any} b @returns {Scalar} */
    operatorSub(b) { return this.sub(b); }
    /** @param {Scalar|any} b @returns {Scalar} */
    operatorMul(b) { return this.mul(b); }
    /** @param {Scalar|any} b @returns {Scalar} */
    operatorDiv(b) { return this.div(b); }
    /** @param {Scalar|any} b @returns {Scalar} */
    operatorPow(b) { return this.pow(b); }
    /** @returns {Scalar} */
    operatorNeg() { return this.neg(); }

    /** @returns {Scalar} */
    neg()  { return new Scalar(this.value.neg()); }
    /** @returns {boolean} */
    isZero() {return this.value.isZero();}
    /** @returns {boolean} */
    isAlmostZero(){return this.value.isAlmostZero();};
    /** @returns {Scalar} */
    abs()   { return new Scalar(this.value.abs()); }


    /**
     * Internal dispatcher for functions that might return undefined for BigFraction.
     * @private
     * @param {string} opName The name of the operation.
     * @returns {Scalar}
     */
    _unary(opName) {
        if (this.level === 0) {
            const res = this.value[opName]();
            if (res !== undefined) return new Scalar(res);
            
            // Result is irrational, promote to BigFloat and retry
            const promoted = this.value.toBigFloat();
            return new Scalar(promoted[opName]());
        }
        return new Scalar(this.value[opName]());
    }
    
    /** @returns {Scalar} */
    exp()   { return this._unary('exp'); }
    /** @returns {Scalar} */
    log()   { return this._unary('log'); }
    /** @returns {Scalar} */
    sin()   { return this._unary('sin'); }
    /** @returns {Scalar} */
    cos()   { return this._unary('cos'); }
    /** @returns {Scalar} */
    tan()   { return this._unary('tan'); }
    /** @returns {Scalar} */
    asin()  { return this._unary('asin'); }
    /** @returns {Scalar} */
    acos()  { return this._unary('acos'); }
    /** @returns {Scalar} */
    atan()  { return this._unary('atan'); }
    /** @returns {Scalar} */
    sinh()  { return this._unary('sinh'); }
    /** @returns {Scalar} */
    cosh()  { return this._unary('cosh'); }
    /** @returns {Scalar} */
    tanh()  { return this._unary('tanh'); }
    /** @returns {Scalar} */
    asinh() { return this._unary('asinh'); }
    /** @returns {Scalar} */
    acosh() { return this._unary('acosh'); }
    /** @returns {Scalar} */
    atanh() { return this._unary('atanh'); }
    /** @returns {Scalar} */
    sqrt()  { return this._unary('sqrt'); }

    // --- Comparison & Utilities ---

    /**
     * Compares this scalar with another value.
     * @param {Scalar|any} other
     * @returns {number} -1 if this < other, 0 if this === other, 1 if this > other.
     */
    cmp(other) {
        const vb = (other instanceof Scalar) ? other.value : other;
        const targetLevel = Math.max(this.level, Scalar.getLevel(vb));
        if (targetLevel === 2) throw new Error("Complex numbers are not ordered.");
        return Scalar.promote(this.value, targetLevel).cmp(Scalar.promote(vb, targetLevel));
    }

    /**
     * Checks for equality with another value.
     * @param {Scalar|any} other
     * @returns {boolean}
     */
    equals(other) {
        const vb = (other instanceof Scalar) ? other.value : other;
        const targetLevel = Math.max(this.level, Scalar.getLevel(vb));
        return Scalar.promote(this.value, targetLevel).equals(Scalar.promote(vb, targetLevel));
    }

    /**
     * Converts the scalar to a string.
     * @param {number} [radix=10]
     * @param {number} [precision=-1]
     * @param {boolean} [pretty=false] pretty print
     * @returns {string}
     */
    toString(radix = 10, precision = -1, pretty=false) {
        return this.value.toString(radix, precision, pretty);
    }

    /**
     * Parses string and determines correct type/level.
     * @param {string} str
     * @returns {Scalar}
     */
    static fromString(str) {
        const s = str.trim();
        // 1. Complex check
        if (s.includes('i')) {
            return new Scalar(Complex.fromString(s));
        }
        // 2. Fraction check
        if (s.includes('/')) {
            return new Scalar(BigFraction.fromString(s));
        }
        // 3. Float or Integer check
        if (s.includes('.') || s.toLowerCase().includes('e')) {
            let nv=parseFloat(s);
            if(Number.isInteger(nv)){
                return new Scalar(BigFraction.fromString(s));
            }
            return new Scalar(BigFloat.fromString(s));
        }
        // 4. Default to Fraction if it's a clean integer string
        try {
            return new Scalar(new BigFraction(s));
        } catch(e) {
            return new Scalar(bf(s));
        }
    }
}

/**
 * Factory function for creating Scalar instances.
 * @param {number|bigint|string|BigFraction|BigFloat|Complex|Scalar} s
 * @returns {Scalar}
 */
export function scalar(s){
    if(s instanceof Scalar){
        return s;
    }
    return new Scalar(s);
}