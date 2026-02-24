import { BigFloat, bf, zero } from "./bf";

/**
 * High-Precision Vector class optimized for BigFloat arithmetic.
 * Represents a mathematical column vector.
 * @class
 */
export class Vector {
    /**
     * Initializes a Vector from a size, an existing array, or another Vector.
     * @param {number|Array<number|string|BigFloat>|Vector} data 
     */
    constructor(data) {
        if (typeof data === 'number') {
            this.values = new Array(data).fill(zero);
        } else if (Array.isArray(data)) {
            this.values = data.map(v => v instanceof BigFloat ? v : bf(v));
        } else if (data instanceof Vector) {
            this.values = [...data.values];
        } else {
            throw new Error("Vector must be initialized with a size, an array, or another Vector.");
        }
    }

    /**
     * Returns a string representation of the vector.
     * Truncates the middle part with "..." if the length exceeds maxItem.
     * 
     * @param {number} radix - The base for number representation (e.g., 10).
     * @param {number} prec - The number of decimal places for BigFloat.
     * @param {number} maxItem - Maximum number of elements to show before truncating.
     * @returns {string}
     */
    toString(radix = 10, prec = 2, maxItem = 10) {
        const len = this.length;
        const parts = [];

        /**
         * Helper to format a single BigFloat value.
         */
        const format = (i) => this.get(i).toString(radix, prec);

        if (len <= maxItem) {
            // Display all elements if within limit
            for (let i = 0; i < len; i++) {
                parts.push(format(i));
            }
        } else {
            // Display start and end segments with "..." in between
            const half = Math.floor(maxItem / 2);
            
            // Add start elements
            for (let i = 0; i < half; i++) {
                parts.push(format(i));
            }
            
            parts.push("...");
            
            // Add end elements
            const endCount = maxItem - half;
            for (let i = len - endCount; i < len; i++) {
                parts.push(format(i));
            }
        }

        return `Vector (length=${len}): [ ${parts.join(", ")} ]`;
    }
    

    /**
     * Dimension of the vector.
     * @returns {number}
     */
    get length() {
        return this.values.length;
    }

    /**
     * Gets the value at index i.
     * @param {number} i 
     * @returns {BigFloat}
     */
    get(i) {
        return this.values[i];
    }

    /**
     * Sets the value at index i.
     * @param {number} i 
     * @param {number|string|BigFloat} val 
     */
    set(i, val) {
        this.values[i] = val instanceof BigFloat ? val : bf(val);
    }

    /**
     * Adds another vector to this vector (v = this + other).
     * @param {Vector} other 
     * @returns {Vector}
     */
    add(other) {
        if (this.length !== other.length) throw new Error("Vector dimension mismatch for addition.");
        const result = new Vector(this.length);
        for (let i = 0; i < this.length; i++) {
            result.values[i] = this.values[i].add(other.values[i]);
        }
        return result;
    }

    /**
     * Subtracts another vector from this vector (v = this - other).
     * @param {Vector} other 
     * @returns {Vector}
     */
    sub(other) {
        if (this.length !== other.length) throw new Error("Vector dimension mismatch for subtraction.");
        const result = new Vector(this.length);
        for (let i = 0; i < this.length; i++) {
            result.values[i] = this.values[i].sub(other.values[i]);
        }
        return result;
    }

    /**
     * Multiplies the vector by a scalar (v = this * scalar).
     * @param {number|string|BigFloat} scalar 
     * @returns {Vector}
     */
    scale(scalar) {
        const s = scalar instanceof BigFloat ? scalar : bf(scalar);
        const result = new Vector(this.length);
        for (let i = 0; i < this.length; i++) {
            result.values[i] = this.values[i].mul(s);
        }
        return result;
    }

    /**
     * Computes the dot product of this vector and another vector.
     * @param {Vector} other 
     * @returns {BigFloat}
     */
    dot(other) {
        if (this.length !== other.length) throw new Error("Vector dimension mismatch for dot product.");
        let sum = zero;
        for (let i = 0; i < this.length; i++) {
            sum = sum.add(this.values[i].mul(other.values[i]));
        }
        return sum;
    }

    /**
     * Computes the L2 norm (Euclidean norm) of the vector.
     * @returns {BigFloat}
     */
    norm() {
        return this.dot(this).sqrt();
    }

    /**
     * Converts the vector to a standard Javascript Array of BigFloats.
     * @returns {BigFloat[]}
     */
    toArray() {
        return [...this.values];
    }

    /**
     * Deep clones the vector.
     * @returns {Vector}
     */
    clone() {
        return new Vector(this);
    }
}