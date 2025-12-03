import { BigFloat,bf,zero,half } from "./bf";
/**
 * High-Precision Complex Number Utility Class.
 * Provides arithmetic and transcendental functions for complex numbers using BigFloat.
 * 
 * @class
 * @property {BigFloat} re - The real part.
 * @property {BigFloat} im - The imaginary part.
 */
export class Complex {
    /**
     * @param {number|string|BigFloat|Complex} re - Real part or Complex object
     * @param {number|string|BigFloat} [im=0] - Imaginary part
     */
    constructor(re, im) {
        if (re instanceof Complex) {
            this.re = re.re;
            this.im = re.im;
        } else {
            this.re = bf(re);
            this.im = im === undefined ? bf(0) : bf(im);
        }
    }

    // --- Basic Arithmetic ---

    /**
     * Adds another complex number.
     * @param {Complex|number|string|BigFloat} other
     * @returns {Complex}
     */
    add(other) {
        const b = this._wrap(other);
        return new Complex(this.re.add(b.re), this.im.add(b.im));
    }

    /**
     * Subtracts another complex number.
     * @param {Complex|number|string|BigFloat} other
     * @returns {Complex}
     */
    sub(other) {
        const b = this._wrap(other);
        return new Complex(this.re.sub(b.re), this.im.sub(b.im));
    }

    /**
     * Multiplies by another complex number.
     * @param {Complex|number|string|BigFloat} other
     * @returns {Complex}
     */
    mul(other) {
        const b = this._wrap(other);
        // (a+bi)(c+di) = (ac-bd) + (ad+bc)i
        const ac = this.re.mul(b.re);
        const bd = this.im.mul(b.im);
        const ad = this.re.mul(b.im);
        const bc = this.im.mul(b.re);
        return new Complex(ac.sub(bd), ad.add(bc));
    }

    /**
     * Divides by another complex number.
     * @param {Complex|number|string|BigFloat} other
     * @returns {Complex}
     */
    div(other) {
        const b = this._wrap(other);
        // (a+bi)/(c+di) = [(ac+bd) + (bc-ad)i] / (c^2+d^2)
        const denom = b.re.mul(b.re).add(b.im.mul(b.im));
        if (denom.cmp(bf(0)) === 0) throw new Error("Complex division by zero");
        
        const ac = this.re.mul(b.re);
        const bd = this.im.mul(b.im);
        const bc = this.im.mul(b.re);
        const ad = this.re.mul(b.im);

        const newRe = ac.add(bd).div(denom);
        const newIm = bc.sub(ad).div(denom);
        return new Complex(newRe, newIm);
    }

    /**
     * Raises this complex number to the power of another.
     * @param {Complex|number|string|BigFloat} other
     * @returns {Complex}
     */
    pow(other) {
        const b = this._wrap(other);

        if (this.re.isZero() && this.im.isZero()) {
            return new Complex(zero, zero);
        }

        // w^z = exp(z * ln(w))
        return this.log().mul(b).exp();
    }

    // --- Advanced Math & Transcendental Functions ---

    /**
     * Magnitude (Absolute value) |z|
     * @returns {BigFloat}
     */
    abs() {
        return this.re.mul(this.re).add(this.im.mul(this.im)).sqrt();
    }

    /**
     * Argument (Angle) arg(z)
     * @returns {BigFloat}
     */
    arg() {
        return this.im.atan2(this.re);
    }

    /**
     * Complex Square Root sqrt(z)
     * @returns {Complex}
     */
    sqrt() {
        const r = this.abs();
        const re = r.add(this.re).mul(half).sqrt();
        const im = r.sub(this.re).mul(half).sqrt();
        return new Complex(re, this.im.cmp(zero) >= 0 ? im : im.neg());
    }

    /**
     * Complex Exponential e^z
     * @returns {Complex}
     */
    exp() {
        // e^(a+bi) = e^a * (cos(b) + i*sin(b))
        const expRe = this.re.exp();
        return new Complex(expRe.mul(this.im.cos()), expRe.mul(this.im.sin()));
    }

    /**
     * Complex Natural Logarithm ln(z)
     * @returns {Complex}
     */
    log() {
        // ln(z) = ln|z| + i*arg(z)
        const rSq = this.re.mul(this.re).add(this.im.mul(this.im));
        return new Complex(rSq.log().mul(half), this.arg());
    }

    /**
     * Trigonometric Sine sin(z)
     * sin(x+iy) = sin(x)cosh(y) + i cos(x)sinh(y)
     * @returns {Complex}
     */
    sin() {
        const x = this.re;
        const y = this.im;
        return new Complex(
            x.sin().mul(y.cosh()),
            x.cos().mul(y.sinh())
        );
    }

    /**
     * Trigonometric Cosine cos(z)
     * cos(x+iy) = cos(x)cosh(y) - i sin(x)sinh(y)
     * @returns {Complex}
     */
    cos() {
        const x = this.re;
        const y = this.im;
        return new Complex(
            x.cos().mul(y.cosh()),
            x.sin().mul(y.sinh()).neg()
        );
    }

    /**
     * Trigonometric Tangent tan(z)
     * @returns {Complex}
     */
    tan() {
        return this.sin().div(this.cos());
    }

    /**
     * Hyperbolic Sine sinh(z)
     * sinh(x+iy) = sinh(x)cos(y) + i cosh(x)sin(y)
     * @returns {Complex}
     */
    sinh() {
        const x = this.re;
        const y = this.im;
        return new Complex(
            x.sinh().mul(y.cos()),
            x.cosh().mul(y.sin())
        );
    }

    /**
     * Hyperbolic Cosine cosh(z)
     * cosh(x+iy) = cosh(x)cos(y) + i sinh(x)sin(y)
     * @returns {Complex}
     */
    cosh() {
        const x = this.re;
        const y = this.im;
        return new Complex(
            x.cosh().mul(y.cos()),
            x.sinh().mul(y.sin())
        );
    }

    /**
     * Hyperbolic Tangent tanh(z)
     * @returns {Complex}
     */
    tanh() {
        return this.sinh().div(this.cosh());
    }

    /**
     * Inverse Sine asin(z) = -i * ln(iz + sqrt(1 - z^2))
     * @returns {Complex}
     */
    asin() {
        const i = new Complex(0, 1);
        const one = new Complex(1, 0);
        const iz = i.mul(this);
        const sqrtPart = one.sub(this.mul(this)).sqrt();
        return iz.add(sqrtPart).log().mul(i.neg());
    }

    /**
     * Inverse Cosine acos(z) = -i * ln(z + i*sqrt(1 - z^2))
     * @returns {Complex}
     */
    acos() {
        const i = new Complex(0, 1);
        const one = new Complex(1, 0);
        const sqrtPart = one.sub(this.mul(this)).sqrt();
        return this.add(i.mul(sqrtPart)).log().mul(i.neg());
    }

    /**
     * Inverse Tangent atan(z) = (i/2) * ln((i+z)/(i-z))
     * @returns {Complex}
     */
    atan() {
        const i = new Complex(0, 1);
        const halfI = new Complex(0, 0.5);
        const numerator = i.add(this);
        const denominator = i.sub(this);
        return numerator.div(denominator).log().mul(halfI.neg());
    }

    /**
     * Inverse Hyperbolic Sine asinh(z) = ln(z + sqrt(z^2 + 1))
     * @returns {Complex}
     */
    asinh() {
        const one = new Complex(1, 0);
        return this.add(this.mul(this).add(one).sqrt()).log();
    }

    /**
     * Inverse Hyperbolic Cosine acosh(z) = ln(z + sqrt(z^2 - 1))
     * @returns {Complex}
     */
    acosh() {
        const one = new Complex(1, 0);
        return this.add(this.mul(this).sub(one).sqrt()).log();
    }

    /**
     * Inverse Hyperbolic Tangent atanh(z) = 0.5 * ln((1+z)/(1-z))
     * @returns {Complex}
     */
    atanh() {
        const one = new Complex(1, 0);
        const half = new Complex(0.5, 0);
        return one.add(this).div(one.sub(this)).log().mul(half);
    }

    // --- Utilities ---

    /**
     * Returns the complex conjugate.
     * @returns {Complex}
     */
    conj() {
        return new Complex(this.re, this.im.neg());
    }
    
    /**
     * Negates the complex number.
     * @returns {Complex}
     */
    neg() {
        return new Complex(this.re.neg(), this.im.neg());
    }

    /**
     * Checks for equality with another complex number.
     * @param {Complex|number|string|BigFloat} b
     * @returns {boolean}
     */
    equals(b) {
        const other = this._wrap(b);
        return this.re.equals(other.re) && this.im.equals(other.im);
    }

    /**
     * Checks if the complex number is almost zero.
     * @returns {boolean}
     */
    isAlmostZero() {
        return this.re.isAlmostZero() && this.im.isAlmostZero();
    }

    /**
     * Checks if the complex number is exactly zero.
     * @returns {boolean}
     */
    isZero(){
        return this.re.isZero() && this.im.isZero();
    }

    /**
     * Converts the complex number to a string.
     * @param {number} [base=10]
     * @param {number} [precision=20]
     * @param {boolean} [pretty=false] pretty print
     * @returns {string}
     */
    toString(base = 10, precision = 20, pretty=false) {
        let rezero=this.re.isZero();
        let imzero=this.im.isZero();
        if(rezero && imzero){
            return "0";
        }else if(imzero){
            return this.re.toString(base, precision, pretty);
        }else {
            let imabs=this.im.abs();
            let imabsf=imabs.toNumber();
            const imStr = imabsf==1?"":imabs.toString(base, precision, pretty);
            if(rezero){
                const sign = this.im.cmp(zero) < 0 ? '-' : '';
                return `${sign}${imStr}i`; 
            }
            const sign = this.im.cmp(zero) < 0 ? '-' : '+';
            const reStr = this.re.toString(base, precision, pretty);
            return `(${reStr} ${sign} ${imStr}i)`;
        }
    }

    /**
     * Wraps a value in a Complex object if it isn't one already.
     * @private
     * @param {Complex|number|string|BigFloat} v
     * @returns {Complex}
     */
    _wrap(v) {
        if (v === undefined) {
            throw new Error("Operand mismatch");
        }
        if (v instanceof Complex) return v;
        return new Complex(v);
    }
	
    /**
     * Creates a complex number from polar coordinates.
     * @param {number|string|BigFloat} r - The radius.
     * @param {number|string|BigFloat} theta - The angle.
     * @returns {Complex}
     */
    static fromPolar(r, theta) {
        const R = bf(r);
        const T = bf(theta);
        return new Complex(R.mul(T.cos()), R.mul(T.sin()));
    }

    /**
     * Creates a complex number from a string.
     * @param {string} s
     * @returns {Complex}
     */
    static fromString(s){
        s=s.trim();
        s=s.replace(/I/g,"i");
        // If it's just "i" or "-i"
        if (s === 'i') return new Complex(0, 1);
        if (s === '-i') return new Complex(0, -1);

        // Use a regex to split real and imaginary parts
        // This regex handles: "1+2i", "1-2i", "1.5+i", "-2i"
        const match = s.match(/^(.+?)([+-].*|(?=i))i$/);
        if (match) {
            const re = match[1] === "" ? 0 : match[1];
            let im = match[2];
            if (im === "+" || im === "") im = 1;
            if (im === "-") im = -1;
            return new Complex(re, im);
        }
        // Pure imaginary like "2i"
        if (s.endsWith('i')) {
            const im = s.slice(0, -1);
            return new Complex(0, im === "" ? 1 : (im === "-" ? -1 : im));
        }
        return new Complex(BigFloat.fromString(s));
    }
}


/** @type {function(Complex|number|string|BigFloat): Complex} */
Complex.prototype.operatorAdd=Complex.prototype.add;
/** @type {function(Complex|number|string|BigFloat): Complex} */
Complex.prototype.operatorSub=Complex.prototype.sub;
/** @type {function(Complex|number|string|BigFloat): Complex} */
Complex.prototype.operatorMul=Complex.prototype.mul;
/** @type {function(Complex|number|string|BigFloat): Complex} */
Complex.prototype.operatorDiv=Complex.prototype.div;
/** @type {function(Complex|number|string|BigFloat): Complex} */
Complex.prototype.operatorPow=Complex.prototype.pow;
/** @type {function(): Complex} */
Complex.prototype.operatorNeg=Complex.prototype.neg;


/**
 * Creates a new Complex instance.
 * @param {number|string|BigFloat|Complex} re - Real part or Complex object
 * @param {number|string|BigFloat} [im] - Imaginary part
 * @returns {Complex}
 */
export function complex(re,im){
    return new Complex(re,im);
}