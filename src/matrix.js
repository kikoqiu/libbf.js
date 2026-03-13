import { BigFloat, bf, zero, one, Vector, Complex } from "./bf";

/**
 * Compressed Sparse Column (CSC) Matrix.
 * Exclusively optimized for BigFloat arithmetic.
 * 
 * In CSC format, the matrix is specified by three arrays:
 * - values: Non-zero elements of the matrix.
 * - rowIndices: The row indices corresponding to the values.
 * - colPointers: The start and end indices in `values` and `rowIndices` for each column.
 * 
 * @class
 */
export class SparseMatrixCSC {
    /**
     * @param {number} rows - Number of rows.
     * @param {number} cols - Number of columns.
     * @param {BigFloat[]} values - Array of non-zero BigFloat values.
     * @param {Uint32Array|number[]} rowIndices - Row indices for each non-zero value.
     * @param {Uint32Array|number[]} colPointers - Column pointers of length (cols + 1).
     */
    constructor(rows, cols, values, rowIndices, colPointers) {
        this.rows = rows;
        this.cols = cols;
        
        this.values = values;
        // Use TypedArrays for performance and memory efficiency
        this.rowIndices = rowIndices instanceof Uint32Array ? rowIndices : new Uint32Array(rowIndices);
        this.colPointers = colPointers instanceof Uint32Array ? colPointers : new Uint32Array(colPointers);

        // Basic structural validation
        if (this.colPointers.length !== this.cols + 1) {
            throw new Error(`colPointers length must be cols + 1 (${this.cols + 1}), got ${this.colPointers.length}`);
        }
        if (this.values.length !== this.rowIndices.length) {
            throw new Error("values and rowIndices must have the same length.");
        }
        if (this.colPointers[this.cols] !== this.values.length) {
            throw new Error("The last element of colPointers must equal the number of non-zero elements (nnz).");
        }
    }

    /**
     * Returns a string representation of the matrix.
     * Uses the existing `get(row, col)` method and `nnz` property.
     * 
     * @param {number} radix - The base for number representation (e.g., 10).
     * @param {number} prec - The number of decimal places for BigFloat.
     * @param {number} maxRowItem - Maximum number of rows/cols to show before truncating with "...".
     * @returns {string}
     */
    toString(radix = 10, prec = 2, maxRowItem = 10) {
        /**
         * Helper to calculate which indices should be visible based on maxRowItem.
         * Returns an object containing the start indices, end indices, and truncation status.
         */
        const getDisplayLayout = (total) => {
            if (total <= maxRowItem) {
                return { 
                    indices: Array.from({ length: total }, (_, i) => i), 
                    isTruncated: false 
                };
            }
            const half = Math.floor(maxRowItem / 2);
            return {
                start: Array.from({ length: half }, (_, i) => i),
                end: Array.from({ length: maxRowItem - half }, (_, i) => total - (maxRowItem - half) + i),
                isTruncated: true
            };
        };

        const rowLayout = getDisplayLayout(this.rows);
        const colLayout = getDisplayLayout(this.cols);

        /**
         * Formats a single row by iterating through visible column indices.
         */
        const formatRow = (r) => {
            const cells = [];
            if (!colLayout.isTruncated) {
                colLayout.indices.forEach(c => cells.push(this.get(r, c).toString(radix, prec)));
            } else {
                colLayout.start.forEach(c => cells.push(this.get(r, c).toString(radix, prec)));
                cells.push("...");
                colLayout.end.forEach(c => cells.push(this.get(r, c).toString(radix, prec)));
            }
            return `[ ${cells.join(", ")} ]`;
        };

        const output = [];
        
        // Header info
        output.push(`SparseMatrixCSC (${this.rows}x${this.cols}, nnz=${this.nnz}):`);

        // Build row strings
        if (!rowLayout.isTruncated) {
            rowLayout.indices.forEach(r => output.push(formatRow(r)));
        } else {
            // Top rows
            rowLayout.start.forEach(r => output.push(formatRow(r)));
            
            // Middle truncation indicator (vertical ellipsis line)
            // Calculate how many "columns" are printed to align the ellipsis
            const colCount = colLayout.isTruncated ? (maxRowItem + 1) : colLayout.indices.length;
            const verticalEllipsis = new Array(colCount).fill("...").join("  ");
            output.push(`  ${verticalEllipsis}  `);
            
            // Bottom rows
            rowLayout.end.forEach(r => output.push(formatRow(r)));
        }

        return output.join("\n");
    }


    /**
     * Number of non-zero elements.
     * @returns {number}
     */
    get nnz() {
        return this.values.length;
    }

    /**
     * Retrieves the value at the specified row and column.
     * Uses binary search within the specific column for O(log(nnz_in_col)) performance.
     * 
     * @param {number} row 
     * @param {number} col 
     * @returns {BigFloat}
     */
    get(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            throw new Error("Matrix indices out of bounds.");
        }

        const start = this.colPointers[col];
        const end = this.colPointers[col + 1];

        // Binary search for the row index
        let low = start;
        let high = end - 1;

        while (low <= high) {
            const mid = (low + high) >>> 1;
            const r = this.rowIndices[mid];

            if (r === row) return this.values[mid];
            if (r < row) low = mid + 1;
            else high = mid - 1;
        }

        return zero; // Return BigFloat zero if not found
    }

    /**
     * Sets the value at the specified row and column.
     * Warning: Modifying the structure of a CSC matrix is O(nnz). 
     * If you are building a matrix, it is highly recommended to use `fromCOO` instead.
     * 
     * @param {number} row 
     * @param {number} col 
     * @param {number|string|BigFloat} val 
     */
    set(row, col, val) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            throw new Error("Matrix indices out of bounds.");
        }

        const value = val instanceof BigFloat ? val : bf(val);
        const start = this.colPointers[col];
        const end = this.colPointers[col + 1];

        let low = start;
        let high = end - 1;
        let found = false;
        let insertPos = start;

        // Binary search to find exact position or insertion point
        while (low <= high) {
            const mid = (low + high) >>> 1;
            const r = this.rowIndices[mid];

            if (r === row) {
                this.values[mid] = value;
                found = true;
                break;
            }
            if (r < row) {
                low = mid + 1;
                insertPos = low;
            } else {
                high = mid - 1;
                insertPos = mid;
            }
        }

        // If not found, we must insert a new structural non-zero (Expensive O(nnz) operation)
        if (!found) {
            if (value.isZero()) return; // Don't insert structural zeros

            const newNnz = this.nnz + 1;
            const newValues = new Array(newNnz);
            const newRowIndices = new Uint32Array(newNnz);

            // Copy left part
            for (let i = 0; i < insertPos; i++) {
                newValues[i] = this.values[i];
                newRowIndices[i] = this.rowIndices[i];
            }

            // Insert
            newValues[insertPos] = value;
            newRowIndices[insertPos] = row;

            // Copy right part
            for (let i = insertPos; i < this.nnz; i++) {
                newValues[i + 1] = this.values[i];
                newRowIndices[i + 1] = this.rowIndices[i];
            }

            // Update column pointers
            for (let j = col + 1; j <= this.cols; j++) {
                this.colPointers[j]++;
            }

            this.values = newValues;
            this.rowIndices = newRowIndices;
        }
    }

    /**
     * Eliminates explicit structural zeros from the matrix.
     * Sparse operations might leave explicit zeros to avoid shifting arrays.
     * Call this method to compact the matrix memory.
     */
    prune() {
        let dest = 0;
        const newColPointers = new Uint32Array(this.cols + 1);
        newColPointers[0] = 0;

        for (let j = 0; j < this.cols; j++) {
            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];

            for (let i = start; i < end; i++) {
                const val = this.values[i];
                if (!val.isZero()) {
                    this.values[dest] = val;
                    this.rowIndices[dest] = this.rowIndices[i];
                    dest++;
                }
            }
            newColPointers[j + 1] = dest;
        }

        this.values.length = dest; // Truncate array
        this.rowIndices = this.rowIndices.slice(0, dest);
        this.colPointers = newColPointers;
    }

    /**
     * Transposes the matrix. 
     * Converts an M x N CSC matrix to an N x M CSC matrix.
     * This algorithm executes in O(nnz + max(rows, cols)) time.
     * 
     * @returns {SparseMatrixCSC}
     */
    transpose() {
        const newRows = this.cols;
        const newCols = this.rows;
        const nnz = this.nnz;

        const transposedValues = new Array(nnz);
        const transposedRowIndices = new Uint32Array(nnz);
        const transposedColPointers = new Uint32Array(newCols + 1);

        // Step 1: Count non-zero elements in each row (which will become columns)
        const rowCounts = new Uint32Array(newCols);
        for (let i = 0; i < nnz; i++) {
            rowCounts[this.rowIndices[i]]++;
        }

        // Step 2: Compute column pointers for the transposed matrix (Cumulative sum)
        transposedColPointers[0] = 0;
        for (let i = 0; i < newCols; i++) {
            transposedColPointers[i + 1] = transposedColPointers[i] + rowCounts[i];
        }

        // Step 3: Scatter values into their new locations
        // Copy colPointers to use as current insertion offsets
        const currentOffsets = new Uint32Array(transposedColPointers);

        for (let j = 0; j < this.cols; j++) {
            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];

            for (let p = start; p < end; p++) {
                const r = this.rowIndices[p];
                const dest = currentOffsets[r]++;
                
                transposedRowIndices[dest] = j; // The old column is the new row
                transposedValues[dest] = this.values[p]; // Keep the value
            }
        }

        return new SparseMatrixCSC(
            newRows, 
            newCols, 
            transposedValues, 
            transposedRowIndices, 
            transposedColPointers
        );
    }

    /**
     * Creates a deep copy of the matrix.
     * @returns {SparseMatrixCSC}
     */
    clone() {
        return new SparseMatrixCSC(
            this.rows,
            this.cols,[...this.values], // Deep enough since BigFloat is immutable mostly, or we map to clone
            new Uint32Array(this.rowIndices),
            new Uint32Array(this.colPointers)
        );
    }

    // --- Format Conversions ---

    /**
     * Creates a CSC matrix from Coordinate (COO) / Triplet format.
     * This is the recommended way to build a sparse matrix.
     * Duplicates are automatically summed.
     * 
     * @param {number} rows 
     * @param {number} cols 
     * @param {number[]} rowIdx - Array of row coordinates.
     * @param {number[]} colIdx - Array of column coordinates.
     * @param {(number|string|BigFloat)[]} vals - Array of values.
     * @returns {SparseMatrixCSC}
     */
    static fromCOO(rows, cols, rowIdx, colIdx, vals) {
        if (rowIdx.length !== colIdx.length || colIdx.length !== vals.length) {
            throw new Error("COO arrays must be of the same length.");
        }

        const n = vals.length;
        // Step 1: Stable sort by Column (primary) and Row (secondary)
        const perm = new Uint32Array(n);
        for (let i = 0; i < n; i++) perm[i] = i;

        perm.sort((a, b) => {
            if (colIdx[a] !== colIdx[b]) return colIdx[a] - colIdx[b];
            return rowIdx[a] - rowIdx[b];
        });

        // Step 2: Assemble CSC and sum duplicates
        const values =[];
        const rowIndices =[];
        const colPointers = new Uint32Array(cols + 1);
        colPointers.fill(0);

        let lastRow = -1;
        let lastCol = -1;

        for (let i = 0; i < n; i++) {
            const idx = perm[i];
            const r = rowIdx[idx];
            const c = colIdx[idx];
            let v = vals[idx];
            v = v instanceof BigFloat ? v : bf(v);

            if (v.isZero()) continue;

            if (c === lastCol && r === lastRow) {
                // Sum duplicate entry
                values[values.length - 1] = values[values.length - 1].add(v);
            } else {
                // New entry
                values.push(v);
                rowIndices.push(r);
                colPointers[c + 1]++;
                lastRow = r;
                lastCol = c;
            }
        }

        // Cumulative sum for colPointers
        for (let i = 0; i < cols; i++) {
            colPointers[i + 1] += colPointers[i];
        }

        return new SparseMatrixCSC(rows, cols, values, new Uint32Array(rowIndices), colPointers);
    }

    /**
     * Converts a Dense Matrix (2D Array) into a Sparse CSC Matrix.
     * @param {(number|string|BigFloat)[][]} matrix 
     * @returns {SparseMatrixCSC}
     */
    static fromDense(matrix) {
        const rows = matrix.length;
        const cols = rows > 0 ? matrix[0].length : 0;

        const rowIdx = [];
        const colIdx = [];
        const vals =[];

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let v = matrix[i][j];
                v = v instanceof BigFloat ? v : bf(v);
                if (!v.isZero()) {
                    rowIdx.push(i);
                    colIdx.push(j);
                    vals.push(v);
                }
            }
        }

        return SparseMatrixCSC.fromCOO(rows, cols, rowIdx, colIdx, vals);
    }

    /**
     * Converts the CSC Sparse Matrix back to a Dense Matrix (2D Array of BigFloat).
     * @returns {BigFloat[][]}
     */
    toDense() {
        const dense = new Array(this.rows);
        for (let i = 0; i < this.rows; i++) {
            dense[i] = new Array(this.cols).fill(zero);
        }

        for (let j = 0; j < this.cols; j++) {
            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];
            for (let p = start; p < end; p++) {
                dense[this.rowIndices[p]][j] = this.values[p];
            }
        }

        return dense;
    }


    /**
     * Internal implementation for Matrix Addition and Subtraction.
     * Utilizes a highly optimized Two-Pointer Merge algorithm, running in O(nnz(A) + nnz(B)) time.
     * 
     * @private
     * @param {SparseMatrixCSC} other - The other matrix.
     * @param {boolean} isSub - True if subtraction (A - B), False if addition (A + B).
     * @returns {SparseMatrixCSC}
     */
    _addSub(other, isSub) {
        if (this.rows !== other.rows || this.cols !== other.cols) {
            throw new Error("Matrix dimensions must match for addition/subtraction.");
        }

        const cols = this.cols;
        const maxNnz = this.nnz + other.nnz;
        
        // Pre-allocate to prevent JS engine reallocation overhead
        const newColPointers = new Uint32Array(cols + 1);
        const tempRowIndices = new Uint32Array(maxNnz);
        const tempValues = new Array(maxNnz);
        
        let dest = 0;

        for (let j = 0; j < cols; j++) {
            newColPointers[j] = dest;

            let pA = this.colPointers[j];
            const endA = this.colPointers[j + 1];
            let pB = other.colPointers[j];
            const endB = other.colPointers[j + 1];

            // Two-pointer merge for sorted column row indices
            while (pA < endA && pB < endB) {
                const rA = this.rowIndices[pA];
                const rB = other.rowIndices[pB];

                if (rA < rB) {
                    tempRowIndices[dest] = rA;
                    tempValues[dest] = this.values[pA];
                    pA++;
                    dest++;
                } else if (rA > rB) {
                    tempRowIndices[dest] = rB;
                    tempValues[dest] = isSub ? other.values[pB].neg() : other.values[pB];
                    pB++;
                    dest++;
                } else {
                    const valA = this.values[pA];
                    const valB = other.values[pB];
                    const resultVal = isSub ? valA.sub(valB) : valA.add(valB);

                    if (!resultVal.isZero()) {
                        tempRowIndices[dest] = rA;
                        tempValues[dest] = resultVal;
                        dest++;
                    }
                    pA++;
                    pB++;
                }
            }

            // Exhaust remaining elements in A
            while (pA < endA) {
                tempRowIndices[dest] = this.rowIndices[pA];
                tempValues[dest] = this.values[pA];
                pA++;
                dest++;
            }

            // Exhaust remaining elements in B
            while (pB < endB) {
                tempRowIndices[dest] = other.rowIndices[pB];
                tempValues[dest] = isSub ? other.values[pB].neg() : other.values[pB];
                pB++;
                dest++;
            }
        }

        newColPointers[cols] = dest;

        // Truncate precisely to actual size
        return new SparseMatrixCSC(
            this.rows,
            cols,
            tempValues.slice(0, dest),
            tempRowIndices.slice(0, dest),
            newColPointers
        );
    }

    /**
     * Adds another SparseMatrixCSC to this matrix (C = A + B).
     * @param {SparseMatrixCSC} other 
     * @returns {SparseMatrixCSC}
     */
    add(other) {
        return this._addSub(other, false);
    }

    /**
     * Subtracts another SparseMatrixCSC from this matrix (C = A - B).
     * @param {SparseMatrixCSC} other 
     * @returns {SparseMatrixCSC}
     */
    sub(other) {
        return this._addSub(other, true);
    }

    /**
     * Matrix-Matrix Multiplication (C = A * B).
     * Implements Gustavson's Algorithm (Sparse Accumulator variant).
     * Computes the product in O(flops + nnz(C)) time footprint with zero inner-loop allocation.
     * 
     * @param {SparseMatrixCSC} B - The right-hand side matrix.
     * @returns {SparseMatrixCSC}
     */
    mul(B) {
        if (this.cols !== B.rows) {
            throw new Error(`Dimension mismatch: Left matrix cols (${this.cols}) must match right matrix rows (${B.rows}).`);
        }

        const M = this.rows;
        const K = this.cols; // Not directly used in sizes, but conceptually the inner dimension
        const N = B.cols;

        // Using a dynamic JS array for results since we don't know the precise nnz(C) beforehand
        const resultValues = [];
        const resultRowIndices =[];
        const resultColPointers = new Uint32Array(N + 1);

        // --- Sparse Accumulator (SPA) ---
        // Pre-allocate arrays to prevent GC pauses during accumulation.
        const x = new Array(M);               // Accumulator values array
        const marker = new Int32Array(M);     // Marker array to track active rows in O(1)
        marker.fill(-1);                      // -1 means untouched
        
        // Pre-allocate typed array for sorting row indices of the current column
        const activeRows = new Int32Array(M); 

        for (let j = 0; j < N; j++) {
            resultColPointers[j] = resultValues.length;
            let activeCount = 0;

            const B_start = B.colPointers[j];
            const B_end = B.colPointers[j + 1];

            // Iterate over non-zeros in column j of B
            for (let p = B_start; p < B_end; p++) {
                const k = B.rowIndices[p];
                const b_kj = B.values[p];

                const A_start = this.colPointers[k];
                const A_end = this.colPointers[k + 1];

                // Scale column k of A by b_kj and accumulate
                for (let q = A_start; q < A_end; q++) {
                    const i = this.rowIndices[q];
                    const a_ik = this.values[q];

                    const prod = a_ik.mul(b_kj);

                    if (marker[i] !== j) {
                        // First time seeing row i in column j
                        marker[i] = j;
                        x[i] = prod;
                        activeRows[activeCount++] = i;
                    } else {
                        // Accumulate
                        x[i] = x[i].add(prod);
                    }
                }
            }

            // optimization: sorting only the active row sub-array
            const colRows = activeRows.subarray(0, activeCount);
            colRows.sort(); // In-place O(k log k) typed array sort

            // Gather elements into result structure
            for (let idx = 0; idx < activeCount; idx++) {
                const r = colRows[idx];
                const val = x[r];
                if (!val.isZero()) {
                    resultValues.push(val);
                    resultRowIndices.push(r);
                }
            }
        }
        
        resultColPointers[N] = resultValues.length;

        return new SparseMatrixCSC(
            M, 
            N, 
            resultValues, 
            new Uint32Array(resultRowIndices), 
            resultColPointers
        );
    }

    /**
     * Scalar Multiplication (B = s * A).
     * Executes in O(nnz) time.
     * 
     * @param {number|string|BigFloat} scalar - The scalar value to multiply with.
     * @returns {SparseMatrixCSC} - The resulting sparse matrix.
     */
    
    mulScalar(scalar) {
        const s = scalar instanceof BigFloat ? scalar : bf(scalar);
        if (s.isZero()) {
            // Multiplying by zero results in a zero matrix
            return new SparseMatrixCSC(this.rows, this.cols, [], new Uint32Array(), new Uint32Array(this.cols + 1));
        }
        const newValues = this.values.map(v => v.mul(s));
        return new SparseMatrixCSC(this.rows, this.cols, newValues, this.rowIndices, this.colPointers);
    }

    /**
     * Matrix-Vector Multiplication (y = A * x).
     * Linear time execution: O(nnz(A)).
     * 
     * @param {Vector|Array<number|string|BigFloat>} vec - The input vector.
     * @returns {Vector} - The result vector.
     */
    mulVec(vec) {
        let vArray;

        if (vec instanceof Vector) {
            vArray = vec.values;
        } else if (Array.isArray(vec)) {
            vArray = vec.map(val => val instanceof BigFloat ? val : bf(val));
        } else {
            throw new Error("Input must be a Vector instance or an Array.");
        }

        if (this.cols !== vArray.length) {
            throw new Error(`Dimension mismatch: Matrix columns (${this.cols}) must match vector length (${vArray.length}).`);
        }

        // Initialize dense result array with BigFloat zeros
        const result = new Array(this.rows).fill(zero);

        // CSC SpMV execution loop
        // We iterate through columns, matching memory layout (highly cache efficient)
        for (let j = 0; j < this.cols; j++) {
            const xj = vArray[j];
            
            // Skip zero vector elements to save O(nnz_in_col) flops
            if (xj.isZero()) continue;

            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];

            // Accumulate scaled column j into result vector
            for (let p = start; p < end; p++) {
                const i = this.rowIndices[p];
                const a_ij = this.values[p];
                
                result[i] = result[i].add(a_ij.mul(xj));
            }
        }

        const outputVec = new Vector(this.rows);
        outputVec.values = result; // Bypass redundant mapping
        return outputVec;
    }


    /**
     * Extracts the diagonal elements of the matrix.
     * @returns {Vector} - A vector containing the diagonal elements.
     */
    getDiagonal() {
        const minDim = Math.min(this.rows, this.cols);
        const diag = new Vector(minDim);

        for (let j = 0; j < minDim; j++) {
            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];

            // Use binary search for optimal extraction
            let low = start;
            let high = end - 1;
            while (low <= high) {
                const mid = (low + high) >>> 1;
                const r = this.rowIndices[mid];
                if (r === j) {
                    diag.values[j] = this.values[mid];
                    break;
                }
                if (r < j) low = mid + 1;
                else high = mid - 1;
            }
        }
        return diag;
    }

    /**
     * Computes the Trace of the matrix (sum of diagonal elements).
     * @returns {BigFloat}
     */
    trace() {
        let sum = zero;
        const minDim = Math.min(this.rows, this.cols);
        for (let j = 0; j < minDim; j++) {
            const val = this.get(j, j);
            if (!val.isZero()) sum = sum.add(val);
        }
        return sum;
    }

    /**
     * Computes the L1 Norm (Maximum absolute column sum).
     * Executes in O(nnz) time.
     * @returns {BigFloat}
     */
    norm1() {
        let maxNorm = zero;
        for (let j = 0; j < this.cols; j++) {
            let colSum = zero;
            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];
            for (let p = start; p < end; p++) {
                colSum = colSum.add(this.values[p].abs());
            }
            if (colSum.cmp(maxNorm) > 0) maxNorm = colSum;
        }
        return maxNorm;
    }

    /**
     * Computes the Infinity Norm (Maximum absolute row sum).
     * Executes in O(nnz) time footprint.
     * @returns {BigFloat}
     */
    normInf() {
        const rowSums = new Array(this.rows).fill(zero);
        for (let j = 0; j < this.cols; j++) {
            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];
            for (let p = start; p < end; p++) {
                const r = this.rowIndices[p];
                rowSums[r] = rowSums[r].add(this.values[p].abs());
            }
        }
        
        let maxNorm = zero;
        for (let i = 0; i < this.rows; i++) {
            if (rowSums[i].cmp(maxNorm) > 0) maxNorm = rowSums[i];
        }
        return maxNorm;
    }

    /**
     * Computes the Frobenius Norm (Square root of the sum of the squares of elements).
     * @returns {BigFloat}
     */
    normF() {
        let sumSq = zero;
        for (let i = 0; i < this.nnz; i++) {
            const val = this.values[i];
            sumSq = sumSq.add(val.mul(val));
        }
        return sumSq.sqrt();
    }

    // --- Direct Solvers for Triangular Matrices ---

    /**
     * Forward Substitution to solve L * x = b.
     * Assumes this matrix is strictly a Lower Triangular matrix.
     * Column-Oriented approach for CSC layout. O(nnz) time.
     * 
     * @param {Vector|Array<number|string|BigFloat>} b - The right-hand side vector.
     * @returns {Vector} x - The solution vector.
     */
    solveLowerTriangular(b) {
        if (this.rows !== this.cols) throw new Error("Matrix must be square.");
        const n = this.rows;
        
        const bVec = b instanceof Vector ? b : new Vector(b);
        if (bVec.length !== n) throw new Error("Dimension mismatch.");

        const x = bVec.toArray(); // Clone RHS into x

        for (let j = 0; j < n; j++) {
            if (x[j].isZero()) continue;

            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];

            // we expect the diagonal element to be explicitly stored.
            // For CSC lower triangular, it should theoretically be the first element of the column.
            // We do a robust lookup to ensure correctness.
            let diagVal = zero;
            
            for (let p = start; p < end; p++) {
                const r = this.rowIndices[p];
                if (r === j) {
                    diagVal = this.values[p];
                } else if (r > j) {
                    // Update the remaining elements in the column (x[r] = x[r] - L[r, j] * x[j])
                    // Done only after x[j] is fully resolved.
                    // Wait! x[j] needs to be divided by diagVal FIRST.
                    continue; 
                }
            }

            if (diagVal.isZero()) throw new Error(`Singular matrix: zero diagonal at column ${j}`);

            x[j] = x[j].div(diagVal);
            const xj = x[j];

            // Now apply to below-diagonal elements
            for (let p = start; p < end; p++) {
                const r = this.rowIndices[p];
                if (r > j) {
                    x[r] = x[r].sub(this.values[p].mul(xj));
                }
            }
        }

        const res = new Vector(n);
        res.values = x;
        return res;
    }

    /**
     * Backward Substitution to solve U * x = b.
     * Assumes this matrix is strictly an Upper Triangular matrix.
     * Column-Oriented approach for CSC layout. O(nnz) time.
     * 
     * @param {Vector|Array<number|string|BigFloat>} b - The right-hand side vector.
     * @returns {Vector} x - The solution vector.
     */
    solveUpperTriangular(b) {
        if (this.rows !== this.cols) throw new Error("Matrix must be square.");
        const n = this.rows;

        const bVec = b instanceof Vector ? b : new Vector(b);
        if (bVec.length !== n) throw new Error("Dimension mismatch.");

        const x = bVec.toArray(); // Clone RHS into x

        for (let j = n - 1; j >= 0; j--) {
            if (x[j].isZero()) continue;

            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];

            let diagVal = zero;

            for (let p = start; p < end; p++) {
                const r = this.rowIndices[p];
                if (r === j) {
                    diagVal = this.values[p];
                }
            }

            if (diagVal.isZero()) throw new Error(`Singular matrix: zero diagonal at column ${j}`);

            x[j] = x[j].div(diagVal);
            const xj = x[j];

            // Apply to above-diagonal elements
            for (let p = start; p < end; p++) {
                const r = this.rowIndices[p];
                if (r < j) {
                    x[r] = x[r].sub(this.values[p].mul(xj));
                }
            }
        }

        const res = new Vector(n);
        res.values = x;
        return res;
    }

    // --- Iterative Solvers ---

    /**
     * Conjugate Gradient (CG) Method.
     * Solves the linear system A * x = b for Symmetric Positive Definite (SPD) matrices.
     * 
     * @param {Vector|Array<number|string|BigFloat>} b - The right-hand side vector.
     * @param {number|string|BigFloat}[tol="1e-20"] - Convergence tolerance.
     * @param {number} [maxIter] - Maximum number of iterations. Defaults to matrix dimension.
     * @returns {Vector} x - The estimated solution vector.
     */
    solveCG(b, tol = "1e-20", maxIter = this.cols) {
        if (this.rows !== this.cols) throw new Error("Matrix must be square for CG.");
        
        const n = this.rows;
        const bVec = b instanceof Vector ? b : new Vector(b);
        const tolerance = tol instanceof BigFloat ? tol : bf(tol);
        const tolSq = tolerance.mul(tolerance);

        // Pre-allocate pure BigFloat Arrays to avoid creating new Vector objects in the loop (GC optimization)
        const xVals = new Array(n).fill(zero);
        const rVals = bVec.toArray();   // r_0 = b - A*x_0 (since x_0 = 0, r_0 = b)
        const pVals = [...rVals];       // p_0 = r_0
        const ApVals = new Array(n);    // Buffer for A * p

        let rsold = zero;
        for (let i = 0; i < n; i++) {
            rsold = rsold.add(rVals[i].mul(rVals[i])); // r^T * r
        }

        for (let iter = 0; iter < maxIter; iter++) {
            if (rsold.cmp(tolSq) <= 0) break; // Convergence check

            // 1. SpMV: Ap = A * p
            ApVals.fill(zero);
            for (let j = 0; j < n; j++) {
                const pj = pVals[j];
                if (pj.isZero()) continue;

                const start = this.colPointers[j];
                const end = this.colPointers[j + 1];

                for (let k = start; k < end; k++) {
                    const row = this.rowIndices[k];
                    ApVals[row] = ApVals[row].add(this.values[k].mul(pj));
                }
            }

            // 2. pAp = p^T * Ap
            let pAp = zero;
            for (let i = 0; i < n; i++) {
                pAp = pAp.add(pVals[i].mul(ApVals[i]));
            }

            if (pAp.isZero()) break; // Safety against division by zero

            // 3. alpha = rsold / pAp
            const alpha = rsold.div(pAp);

            // 4. Update x and r
            let rsnew = zero;
            for (let i = 0; i < n; i++) {
                xVals[i] = xVals[i].add(alpha.mul(pVals[i]));
                rVals[i] = rVals[i].sub(alpha.mul(ApVals[i]));
                rsnew = rsnew.add(rVals[i].mul(rVals[i]));
            }

            if (rsnew.cmp(tolSq) <= 0) break;

            // 5. beta = rsnew / rsold
            const beta = rsnew.div(rsold);

            // 6. Update p
            for (let i = 0; i < n; i++) {
                pVals[i] = rVals[i].add(beta.mul(pVals[i]));
            }

            rsold = rsnew;
        }

        const result = new Vector(n);
        result.values = xVals;
        return result;
    }


    /**
     * Extracts the Jacobi Preconditioner (Inverse of the Diagonal).
     * This is the most memory-efficient and widely used preconditioner for diagonally dominant matrices.
     * 
     * @returns {Vector} - A vector representing the diagonal inverse M^{-1}.
     */
    getJacobiPreconditioner() {
        const n = Math.min(this.rows, this.cols);
        const invDiag = new Vector(n);
        
        for (let j = 0; j < n; j++) {
            const start = this.colPointers[j];
            const end = this.colPointers[j + 1];
            
            let diagVal = zero;
            for (let p = start; p < end; p++) {
                if (this.rowIndices[p] === j) {
                    diagVal = this.values[p];
                    break;
                }
            }

            if (diagVal.isZero()) {
                // fallback: If diagonal is exactly zero, we keep the preconditioner at 1.0 (no scaling)
                // to prevent division by zero in the solver.
                invDiag.values[j] = one;
            } else {
                invDiag.values[j] = one.div(diagVal);
            }
        }

        return invDiag;
    }

    /**
     * Bi-Conjugate Gradient Stabilized (BiCGSTAB) Method.
     * Solves the linear system A * x = b for non-symmetric square matrices.
     * 
     * - Fixed memory footprint (O(N) aux vectors, completely avoids GMRES memory explosion).
     * - GC-Pause Elimination: Completely pre-allocated functional closures for array vectors.
     * 
     * @param {Vector|Array<number|string|BigFloat>} b - The right-hand side vector.
     * @param {number|string|BigFloat} [tol="1e-20"] - Convergence tolerance.
     * @param {number}[maxIter] - Maximum number of iterations. Defaults to 2 * matrix dimension.
     * @param {Vector}[precond] - Optional Jacobi preconditioner vector (M^{-1}).
     * @returns {Vector} x - The estimated solution vector.
     */
    solveBiCGSTAB(b, tol = "1e-20", maxIter = this.cols * 2, precond = null) {
        if (this.rows !== this.cols) throw new Error("Matrix must be square for BiCGSTAB.");
        
        const n = this.rows;
        const bVec = b instanceof Vector ? b : new Vector(b);
        const tolerance = tol instanceof BigFloat ? tol : bf(tol);
        const tolSq = tolerance.mul(tolerance);

        // Pre-allocate completely GC-free working arrays
        const x = new Array(n).fill(zero);
        const r = bVec.toArray();         // r_0 = b - A*x_0 (x_0 is zero)
        const r_hat = [...r];             // \hat{r}_0 = r_0
        const p = new Array(n).fill(zero);
        const v = new Array(n).fill(zero);
        const s = new Array(n).fill(zero);
        const t = new Array(n).fill(zero);
        
        let rho_prev = one;
        let alpha = one;
        let omega = one;

        // --- Highly Optimized GC-free Inner Helpers ---

        // y = A * x
        const spmv = (inArr, outArr) => {
            outArr.fill(zero);
            for (let j = 0; j < n; j++) {
                const xj = inArr[j];
                if (xj.isZero()) continue;
                
                const start = this.colPointers[j];
                const end = this.colPointers[j + 1];
                for (let k = start; k < end; k++) {
                    const i = this.rowIndices[k];
                    outArr[i] = outArr[i].add(this.values[k].mul(xj));
                }
            }
        };

        // Preconditioner application: y = M^{-1} * x
        const applyPrecond = (inArr, outArr) => {
            if (!precond) {
                for (let i = 0; i < n; i++) outArr[i] = inArr[i];
            } else {
                for (let i = 0; i < n; i++) outArr[i] = inArr[i].mul(precond.values[i]);
            }
        };

        // Dot product: a^T * b
        const dot = (arrA, arrB) => {
            let sum = zero;
            for (let i = 0; i < n; i++) sum = sum.add(arrA[i].mul(arrB[i]));
            return sum;
        };

        const tempArr1 = new Array(n).fill(zero);
        const tempArr2 = new Array(n).fill(zero);

        // --- Iteration Loop ---
        for (let iter = 0; iter < maxIter; iter++) {
            const r_norm_sq = dot(r, r);
            if (r_norm_sq.cmp(tolSq) <= 0) break;

            const rho = dot(r_hat, r);
            if (rho.isZero()) break; // Algorithm breakdown (rare in diagonally dominant)

            if (iter > 0) {
                const beta = rho.div(rho_prev).mul(alpha).div(omega);
                // p_i = r_{i-1} + beta * (p_{i-1} - omega * v_{i-1})
                for (let i = 0; i < n; i++) {
                    const p_minus_omega_v = p[i].sub(omega.mul(v[i]));
                    p[i] = r[i].add(beta.mul(p_minus_omega_v));
                }
            } else {
                for (let i = 0; i < n; i++) p[i] = r[i];
            }

            // v_i = A * K^{-1} * p_i
            applyPrecond(p, tempArr1); // tempArr1 = K^{-1} * p
            spmv(tempArr1, v);

            const r_hat_dot_v = dot(r_hat, v);
            if (r_hat_dot_v.isZero()) break;

            alpha = rho.div(r_hat_dot_v);

            // s = r_{i-1} - alpha * v_i
            for (let i = 0; i < n; i++) {
                s[i] = r[i].sub(alpha.mul(v[i]));
            }

            // Early exit check on s
            if (dot(s, s).cmp(tolSq) <= 0) {
                // x = x + alpha * K^{-1} * p
                applyPrecond(p, tempArr2);
                for (let i = 0; i < n; i++) x[i] = x[i].add(alpha.mul(tempArr2[i]));
                break;
            }

            // t_i = A * K^{-1} * s
            applyPrecond(s, tempArr1);
            spmv(tempArr1, t);

            const t_dot_t = dot(t, t);
            if (t_dot_t.isZero()) {
                omega = zero;
            } else {
                omega = dot(t, s).div(t_dot_t);
            }

            // x_i = x_{i-1} + alpha * K^{-1} * p + omega * K^{-1} * s
            applyPrecond(p, tempArr2);
            for (let i = 0; i < n; i++) x[i] = x[i].add(alpha.mul(tempArr2[i]));
            
            applyPrecond(s, tempArr1); // K^{-1} * s already partially computed, but re-applied for safety
            for (let i = 0; i < n; i++) x[i] = x[i].add(omega.mul(tempArr1[i]));

            // r_i = s - omega * t_i
            for (let i = 0; i < n; i++) {
                r[i] = s[i].sub(omega.mul(t[i]));
            }

            rho_prev = rho;
            
            // Check convergence
            if (dot(r, r).cmp(tolSq) <= 0) break;
        }

        const result = new Vector(n);
        result.values = x;
        return result;
    }

    /**
     * Symmetric Rank-k Update (SYRK).
     * Computes the matrix product A * A^T.
     * 
     * @returns {SparseMatrixCSC}
     */
    syrk() {
        return this.mul(this.transpose());
    }

    /**
     * General Rank-1 Update (GER).
     * Computes A + x * y^T.
     * Note: Rank-1 updates on sparse matrices usually introduce significant fill-in (dense data).
     * 
     * @param {Vector|Array<number|string|BigFloat>} x 
     * @param {Vector|Array<number|string|BigFloat>} y 
     * @returns {SparseMatrixCSC}
     */
    ger(x, y) {
        const xVec = x instanceof Vector ? x.values : x;
        const yVec = y instanceof Vector ? y.values : y;
        
        if (this.rows !== xVec.length || this.cols !== yVec.length) {
            throw new Error("Dimension mismatch for GER: x must match rows, y must match cols.");
        }
        
        const rowIdx = [];
        const colIdx =[];
        const vals =[];
        
        for (let j = 0; j < yVec.length; j++) {
            const yj = yVec[j] instanceof BigFloat ? yVec[j] : bf(yVec[j]);
            if (yj.isZero()) continue;
            
            for (let i = 0; i < xVec.length; i++) {
                const xi = xVec[i] instanceof BigFloat ? xVec[i] : bf(xVec[i]);
                if (xi.isZero()) continue;
                
                rowIdx.push(i);
                colIdx.push(j);
                vals.push(xi.mul(yj));
            }
        }
        
        const XYt = SparseMatrixCSC.fromCOO(this.rows, this.cols, rowIdx, colIdx, vals);
        return this.add(XYt);
    }

    /**
     * Triangular Solve with Multiple Right-Hand Sides (TRSM).
     * Solves A * X = B, where A is this triangular matrix.
     * 
     * @param {SparseMatrixCSC} B - The right-hand side sparse matrix.
     * @param {boolean} [lower=true] - True if A is lower triangular, False if upper triangular.
     * @returns {SparseMatrixCSC} X - The solution sparse matrix.
     */
    trsm(B, lower = true) {
        if (this.rows !== this.cols) throw new Error("Matrix must be square for TRSM.");
        if (this.rows !== B.rows) throw new Error("Dimension mismatch: A rows must match B rows.");
        
        const M = B.rows;
        const N = B.cols;
        
        const X_vals =[];
        const X_rowIdx =[];
        const X_colPtrs = new Uint32Array(N + 1);
        
        for (let j = 0; j < N; j++) {
            X_colPtrs[j] = X_vals.length;
            
            // Extract column j of B into a dense Vector for the solver
            const bj = new Vector(M);
            const start = B.colPointers[j];
            const end = B.colPointers[j + 1];
            for (let p = start; p < end; p++) {
                bj.values[B.rowIndices[p]] = B.values[p];
            }
            
            // Utilize O(nnz) vector solvers
            const xj = lower ? this.solveLowerTriangular(bj) : this.solveUpperTriangular(bj);
            
            // Append non-zeros to CSC
            for (let i = 0; i < M; i++) {
                if (!xj.values[i].isZero()) {
                    X_rowIdx.push(i);
                    X_vals.push(xj.values[i]);
                }
            }
        }
        X_colPtrs[N] = X_vals.length;
        
        return new SparseMatrixCSC(M, N, X_vals, new Uint32Array(X_rowIdx), X_colPtrs);
    }

    /**
     * Sparse LU Factorization (Left-Looking / Gilbert-Peierls Algorithm).
     * Computes A = L * U where L is lower triangular with unit diagonal, and U is upper triangular.
     * 
     * @returns {{L: SparseMatrixCSC, U: SparseMatrixCSC}}
     */
    lu() {
        if (this.rows !== this.cols) throw new Error("Square matrix required for LU factorization.");
        const n = this.rows;
        
        const L_vals = [], L_rowIdx =[];
        const L_colPtrs = new Uint32Array(n + 1);
        
        const U_vals = [], U_rowIdx =[];
        const U_colPtrs = new Uint32Array(n + 1);
        
        // Sparse Accumulator (SPA) designed to avoid GC overhead
        const x = new Array(n).fill(zero);
        const active = new Uint8Array(n);
        const activeRows =[];
        
        for (let j = 0; j < n; j++) {
            L_colPtrs[j] = L_vals.length;
            U_colPtrs[j] = U_vals.length;
            
            // 1. Scatter A_{:, j} into SPA x
            const A_start = this.colPointers[j];
            const A_end = this.colPointers[j + 1];
            for (let p = A_start; p < A_end; p++) {
                const r = this.rowIndices[p];
                x[r] = this.values[p];
                if (!active[r]) { active[r] = 1; activeRows.push(r); }
            }
            
            // 2. Left-looking sparse elimination
            // Because L is strictly lower triangular, numerical order i=0..j-1 acts as topological sort
            for (let i = 0; i < j; i++) { 
                const xi = x[i];
                if (!xi.isZero()) {
                    const L_start = L_colPtrs[i];
                    const L_end = L_colPtrs[i + 1];
                    for (let p = L_start; p < L_end; p++) {
                        const r = L_rowIdx[p];
                        if (r > i) {
                            x[r] = x[r].sub(L_vals[p].mul(xi));
                            if (!active[r]) { active[r] = 1; activeRows.push(r); }
                        }
                    }
                }
            }
            
            // 3. Sort active rows to maintain CSC ordering invariant
            activeRows.sort((a, b) => a - b);
            
            const U_jj = x[j];
            if (U_jj === undefined || U_jj.isZero()) {
                throw new Error(`Zero pivot encountered at column ${j}. Sparse LU without pivoting failed.`);
            }
            
            // 4. Gather phase (Extract U_{:, j} and L_{:, j})
            L_rowIdx.push(j);
            L_vals.push(one); // Explicit unit diagonal for L
            
            for (let i = 0; i < activeRows.length; i++) {
                const r = activeRows[i];
                const val = x[r];
                if (!val.isZero()) {
                    if (r <= j) {
                        U_rowIdx.push(r);
                        U_vals.push(val);
                    } else {
                        // r > j => L matrix (scaled by pivot)
                        L_rowIdx.push(r);
                        L_vals.push(val.div(U_jj));
                    }
                }
                // Reset SPA perfectly for next column
                x[r] = zero;
                active[r] = 0;
            }
            activeRows.length = 0;
        }
        L_colPtrs[n] = L_vals.length;
        U_colPtrs[n] = U_vals.length;
        
        return {
            L: new SparseMatrixCSC(n, n, L_vals, new Uint32Array(L_rowIdx), L_colPtrs),
            U: new SparseMatrixCSC(n, n, U_vals, new Uint32Array(U_rowIdx), U_colPtrs)
        };
    }

    /**
     * Sparse Cholesky Factorization.
     * Computes A = L * L^T for Symmetric Positive Definite (SPD) matrices.
     * Extracts factor from the LU Decomposition by scaling L with sqrt(diag(U)).
     * 
     * @returns {SparseMatrixCSC} L - The lower triangular Cholesky factor.
     */
    cholesky() {
        // Since SPD matrices do not require pivoting, LU is unconditionally stable.
        const { L, U } = this.lu();
        const n = this.rows;
        
        const Lc_vals = new Array(L.nnz);
        const Lc_rowIdx = new Uint32Array(L.rowIndices);
        const Lc_colPtrs = new Uint32Array(L.colPointers);
        
        for (let j = 0; j < n; j++) {
            // Find U_{j,j} (The D factor in A = L D L^T)
            let U_jj = zero;
            const U_start = U.colPointers[j];
            const U_end = U.colPointers[j + 1];
            for (let p = U_start; p < U_end; p++) {
                if (U.rowIndices[p] === j) {
                    U_jj = U.values[p];
                    break;
                }
            }
            
            if (U_jj.cmp(zero) <= 0) {
                throw new Error("Matrix is not symmetric positive definite.");
            }
            
            const sqrt_Ujj = U_jj.sqrt();
            
            // Scale the j-th column of L
            const L_start = L.colPointers[j];
            const L_end = L.colPointers[j + 1];
            for (let p = L_start; p < L_end; p++) {
                Lc_vals[p] = L.values[p].mul(sqrt_Ujj);
            }
        }
        
        return new SparseMatrixCSC(n, n, Lc_vals, Lc_rowIdx, Lc_colPtrs);
    }

    /**
     * General Direct Solver for A * x = b.
     * Uses the exact Sparse LU Factorization to compute the solution.
     * 
     * @param {Vector|Array<number|string|BigFloat>} b 
     * @returns {Vector} x
     */
    solve(b) {
        const { L, U } = this.lu();
        // Forward substitution: L * y = b
        const y = L.solveLowerTriangular(b);
        // Backward substitution: U * x = y
        const x = U.solveUpperTriangular(y);
        return x;
    }

    /**
     * Computes the Determinant of the sparse matrix using LU factorization.
     * det(A) = Product of the diagonals of U.
     * 
     * @returns {BigFloat}
     */
    det() {
        if (this.rows !== this.cols) throw new Error("Square matrix required for determinant.");
        const { U } = this.lu();
        let d = one;
        
        for (let j = 0; j < this.cols; j++) {
            const start = U.colPointers[j];
            const end = U.colPointers[j + 1];
            let diagVal = zero;
            for (let p = start; p < end; p++) {
                if (U.rowIndices[p] === j) {
                    diagVal = U.values[p];
                    break;
                }
            }
            d = d.mul(diagVal);
        }
        return d;
    }

    /**
     * Computes the Log-Determinant of the matrix (useful for Gaussians and PDFs).
     * logDet(A) = Sum of the logs of the absolute diagonals of U.
     * 
     * @returns {BigFloat}
     */
    logDet() {
        if (this.rows !== this.cols) throw new Error("Square matrix required for logDet.");
        const { U } = this.lu();
        let logD = zero;
        
        for (let j = 0; j < this.cols; j++) {
            const start = U.colPointers[j];
            const end = U.colPointers[j + 1];
            let diagVal = zero;
            for (let p = start; p < end; p++) {
                if (U.rowIndices[p] === j) {
                    diagVal = U.values[p];
                    break;
                }
            }
            
            if (diagVal.isZero()) throw new Error("Matrix is singular, logDet is undefined.");
            
            // Standard approach: abs() prevents NaN for real math, tracking phase/sign externally if needed.
            logD = logD.add(diagVal.abs().log()); 
        }
        return logD;
    }

    // ============================================================================
    // --- Advanced Matrix Algorithms (Part 4): Inversion, QR, SVD & Eigen ---
    // ============================================================================

    /**
     * Computes the Inverse of the sparse matrix.
     * Warning: The inverse of a sparse matrix is typically dense. 
     * This uses column-by-column LU solves to construct the inverse dynamically.
     * 
     * @returns {SparseMatrixCSC}
     */
    inv() {
        if (this.rows !== this.cols) throw new Error("Matrix must be square to compute inverse.");
        const n = this.rows;
        
        // 1. Perform Sparse LU Factorization once
        const { L, U } = this.lu();
        
        const invVals = [];
        const invRowIdx =[];
        const invColPtrs = new Uint32Array(n + 1);
        
        // Memory-reused target vector for the standard basis e_j
        const e = new Array(n).fill(zero);

        // 2. Solve A * x_j = e_j for each column j
        for (let j = 0; j < n; j++) {
            invColPtrs[j] = invVals.length;
            
            // Set up basis vector e_j
            e[j] = one;
            if (j > 0) e[j - 1] = zero; // Clean up previous
            
            // Forward & Backward Substitution
            const y = L.solveLowerTriangular(e);
            const x = U.solveUpperTriangular(y);
            
            // Extract non-zeros into the inverse CSC matrix
            for (let i = 0; i < n; i++) {
                const val = x.values[i];
                if (!val.isZero()) {
                    invRowIdx.push(i);
                    invVals.push(val);
                }
            }
        }
        invColPtrs[n] = invVals.length;
        
        return new SparseMatrixCSC(n, n, invVals, new Uint32Array(invRowIdx), invColPtrs);
    }

    /**
     * Computes the Moore-Penrose Pseudoinverse (A^+).
     * Uses Normal Equations approach for sparse matrices to avoid full SVD overhead.
     * 
     * @returns {SparseMatrixCSC}
     */
    pinv() {
        const At = this.transpose();
        
        if (this.rows >= this.cols) {
            // Full column rank: A^+ = (A^T A)^{-1} A^T
            const AtA = At.mul(this);
            const invAtA = AtA.inv();
            return invAtA.mul(At);
        } else {
            // Full row rank: A^+ = A^T (A A^T)^{-1}
            const AAt = this.mul(At);
            const invAAt = AAt.inv();
            return At.mul(invAAt);
        }
    }

    /**
     * Sparse QR Factorization using Left-Looking Modified Gram-Schmidt (MGS).
     * Computes A = Q * R, where Q is orthogonal and R is upper triangular.
     * 
     * @returns {{Q: SparseMatrixCSC, R: SparseMatrixCSC}}
     */
    qr() {
        const m = this.rows;
        const n = this.cols;
        
        const Q_vals =[], Q_rowIdx =[];
        const Q_colPtrs = new Uint32Array(n + 1);
        
        const R_vals = [], R_rowIdx =[];
        const R_colPtrs = new Uint32Array(n + 1);
        
        // Dense working array for the current column being orthogonalized
        const v = new Array(m).fill(zero);
        
        for (let j = 0; j < n; j++) {
            Q_colPtrs[j] = Q_vals.length;
            R_colPtrs[j] = R_vals.length;
            
            // 1. Scatter A[:, j] into dense vector v
            v.fill(zero);
            const startA = this.colPointers[j];
            const endA = this.colPointers[j + 1];
            for (let p = startA; p < endA; p++) {
                v[this.rowIndices[p]] = this.values[p];
            }
            
            // 2. Left-looking MGS: Orthogonalize against all previous columns of Q
            for (let i = 0; i < j; i++) {
                // Compute R[i, j] = Q[:, i]^T * v
                let r_ij = zero;
                const startQ = Q_colPtrs[i];
                const endQ = Q_colPtrs[i + 1];
                for (let p = startQ; p < endQ; p++) {
                    const row = Q_rowIdx[p];
                    r_ij = r_ij.add(Q_vals[p].mul(v[row]));
                }
                
                if (!r_ij.isZero()) {
                    // Record R[i, j]
                    R_rowIdx.push(i);
                    R_vals.push(r_ij);
                    
                    // Update v = v - R[i, j] * Q[:, i]
                    for (let p = startQ; p < endQ; p++) {
                        const row = Q_rowIdx[p];
                        v[row] = v[row].sub(r_ij.mul(Q_vals[p]));
                    }
                }
            }
            
            // 3. Compute R[j, j] = norm(v)
            let normSq = zero;
            for (let i = 0; i < m; i++) {
                if (!v[i].isZero()) normSq = normSq.add(v[i].mul(v[i]));
            }
            const r_jj = normSq.sqrt();
            
            // Record R[j, j]
            if (!r_jj.isZero()) {
                R_rowIdx.push(j);
                R_vals.push(r_jj);
                
                // 4. Normalize v to become Q[:, j] and store it
                const inv_rjj = one.div(r_jj);
                for (let i = 0; i < m; i++) {
                    if (!v[i].isZero()) {
                        Q_rowIdx.push(i);
                        Q_vals.push(v[i].mul(inv_rjj));
                    }
                }
            } else {
                // Handle linear dependence (Rank deficient)
                R_rowIdx.push(j);
                R_vals.push(zero);
            }
        }
        
        Q_colPtrs[n] = Q_vals.length;
        R_colPtrs[n] = R_vals.length;
        
        return {
            Q: new SparseMatrixCSC(m, n, Q_vals, new Uint32Array(Q_rowIdx), Q_colPtrs),
            R: new SparseMatrixCSC(n, n, R_vals, new Uint32Array(R_rowIdx), R_colPtrs)
        };
    }

    /**
     * Computes ALL eigenvalues and eigenvectors using the globally convergent QR Algorithm.
     * Uses $O(n^3)$ Hessenberg Reduction followed by $O(n^2)$ Implicit Double-Shift Francis QR.
     * 
     * @param {number|string|BigFloat}[tol="1e-15"] - Convergence tolerance.
     * @param {number}[maxIter] - Maximum iterations (Defaults to dynamic bound based on size).
     * @returns {Array<{eigenvalue: Complex, eigenvector: Array<Complex>}>} - List of complex eigenpairs sorted by magnitude descending.
     */
    eig(tol = "1e-15", maxIter = null) {
        if (this.rows !== this.cols) throw new Error("Matrix must be square for Eigenvalue computation.");
        const n = this.rows;
        const eps = tol instanceof BigFloat ? tol : bf(tol);
        const maxIterTotal = maxIter || (50 * Math.max(n, 10));

        // Use dense fast arrays for the algorithm to avoid Sparse Object overhead
        let H = this.toDense();
        let V = new Array(n);
        for (let i = 0; i < n; i++) {
            V[i] = new Array(n).fill(zero);
            V[i][i] = one;
        }

        // 1. Reduction to Upper Hessenberg Form
        MatrixDense.hessenbergReduction(H, V);

        // 2. Implicit Double-Shift Francis QR Iteration to Real Schur Form
        MatrixDense.schurFrancisQR(H, V, eps, maxIterTotal);

        // 3. Exact Extraction of Real/Complex Eigenvalues
        const eigenvaluesInfo = MatrixDense.extractSchurEigenvalues(H, eps);

        // 4. Construct Complex Eigenvectors via Geometrically Directed Gaussian Elimination
        const result = MatrixDense.computeEigenvectors(H, V, eigenvaluesInfo);

        // 5. Output strictly sorted by generic magnitude logic
        result.sort((a, b) => {
            let absA = a.eigenvalue.abs();
            let absB = b.eigenvalue.abs();
            if (absA.cmp(absB) > 0) return -1;
            if (absA.cmp(absB) < 0) return 1;
            return 0;
        });

        return result;
    }

    /**
     * Computes the Dominant Eigenpair using Power Iteration.
     * Eigenvalue solvers extract top-K values iteratively.
     * 
     * @param {number|string|BigFloat} [tol="1e-20"] - Convergence tolerance.
     * @param {number} [maxIter=1000] - Maximum iterations.
     * @returns {{eigenvalue: BigFloat, eigenvector: Vector}}
     */
    eigen(tol = "1e-20", maxIter = 1000) {
        if (this.rows !== this.cols) throw new Error("Matrix must be square for Eigenvalue computation.");
        const n = this.rows;
        
        const tolerance = tol instanceof BigFloat ? tol : bf(tol);
        let v = new Vector(n);
        
        // Initialize with normalized random/ones vector
        let initialNormSq = zero;
        for (let i = 0; i < n; i++) {
            v.values[i] = one; // Simplified start, avoiding JS Math.random precision issues
            initialNormSq = initialNormSq.add(one);
        }
        v = v.scale(one.div(initialNormSq.sqrt()));

        let eigenvalue = zero;
        let prevEigenvalue = zero;

        for (let iter = 0; iter < maxIter; iter++) {
            // w = A * v
            const w = this.mulVec(v);
            
            // eigenvalue = v^T * w (Rayleigh Quotient)
            eigenvalue = v.dot(w);
            
            // Check convergence
            if (iter > 0 && eigenvalue.sub(prevEigenvalue).abs().cmp(tolerance) <= 0) {
                // Check convergence using Residual Vector: ||A*v - lambda*v||
                let maxResidual = zero;
                // (Infinity Norm) 
                for (let i = 0; i < n; i++) {
                    const diff = w.values[i].sub(v.values[i].mul(eigenvalue)).abs();
                    if (diff.cmp(maxResidual) > 0) {
                        maxResidual = diff;
                    }
                }                
                if (maxResidual.cmp(tolerance) <= 0) {
                    break;
                }
            }
            prevEigenvalue = eigenvalue;
            
            // v = w / ||w||
            const wNorm = w.norm();
            if (wNorm.isZero()) break;
            
            v = w.scale(one.div(wNorm));
        }

        return { eigenvalue, eigenvector: v };
    }

    /**
     * Computes the Dominant Singular Value and Vectors using Golub-Kahan (Power Method on A^T A).
     * Extracts the Top-1 Singular component.
     * 
     * @param {number|string|BigFloat}[tol="1e-20"]
     * @param {number} [maxIter=1000]
     * @returns {{singularValue: BigFloat, u: Vector, v: Vector}}
     */
    svd(tol = "1e-20", maxIter = 1000) {
        // A^T * A computation via SpGEMM
        const At = this.transpose();
        const AtA = At.mul(this);
        
        // Find dominant eigenvalue of (A^T A), which is sigma_1^2
        const { eigenvalue: lambda, eigenvector: v } = AtA.eigen(tol, maxIter);
        
        if (lambda.cmp(zero) < 0) {
            throw new Error("Numerical instability: Negative eigenvalue found for A^T A.");
        }
        
        const singularValue = lambda.sqrt();
        
        // Compute left singular vector u = (A * v) / sigma
        let u = new Vector(this.rows);
        if (!singularValue.isZero()) {
            u = this.mulVec(v).scale(one.div(singularValue));
        }
        
        return { singularValue, u, v };
    }
}


export class MatrixDense {
    // ============================================================================
    // --- Independent Dense Matrix Algorithms (Static Utilities) ---
    // ============================================================================

    /**
     * Reduces a dense square matrix H to Upper Hessenberg form in-place using Householder reflections.
     * Accumulates the orthogonal transformations into matrix V.
     * 
     * @static
     * @param {BigFloat[][]} H - Dense square matrix (Modified in-place).
     * @param {BigFloat[][]} V - Transformation matrix (Modified in-place).
     */
    static hessenbergReduction(H, V) {
        const n = H.length;
        for (let k = 0; k < n - 2; k++) {
            let scale = zero;
            for (let i = k + 1; i < n; i++) scale = scale.add(H[i][k].abs());
            
            if (!scale.isZero()) {
                // Optimization: Skip if already correctly zeroed out
                let lowerZero = true;
                for (let i = k + 2; i < n; i++) {
                    if (!H[i][k].isZero()) { lowerZero = false; break; }
                }
                
                if (!lowerZero) {
                    let sumSq = zero;
                    let u = new Array(n - k - 1);
                    for (let i = 0; i < u.length; i++) {
                        u[i] = H[k + 1 + i][k].div(scale);
                        sumSq = sumSq.add(u[i].mul(u[i]));
                    }
                    
                    let alpha = sumSq.sqrt();
                    if (u[0].cmp(zero) > 0) alpha = alpha.neg();
                    
                    u[0] = u[0].sub(alpha);
                    let normU2 = alpha.mul(alpha).sub(u[0].add(alpha).mul(alpha)); 
                    
                    // Apply to H from Left (Premultiply)
                    for (let j = k; j < n; j++) {
                        let dot = zero;
                        for (let i = 0; i < u.length; i++) dot = dot.add(u[i].mul(H[k + 1 + i][j]));
                        dot = dot.div(normU2);
                        for (let i = 0; i < u.length; i++) H[k + 1 + i][j] = H[k + 1 + i][j].sub(dot.mul(u[i]));
                    }
                    
                    // Apply to H from Right (Postmultiply)
                    for (let i = 0; i < n; i++) {
                        let dot = zero;
                        for (let j = 0; j < u.length; j++) dot = dot.add(u[j].mul(H[i][k + 1 + j]));
                        dot = dot.div(normU2);
                        for (let j = 0; j < u.length; j++) H[i][k + 1 + j] = H[i][k + 1 + j].sub(dot.mul(u[j]));
                    }
                    
                    // Accumulate Orthogonal Transformation in V
                    for (let i = 0; i < n; i++) {
                        let dot = zero;
                        for (let j = 0; j < u.length; j++) dot = dot.add(u[j].mul(V[i][k + 1 + j]));
                        dot = dot.div(normU2);
                        for (let j = 0; j < u.length; j++) V[i][k + 1 + j] = V[i][k + 1 + j].sub(dot.mul(u[j]));
                    }

                    // Force strict structure to prevent floating debris
                    H[k + 1][k] = alpha.mul(scale);
                    for (let i = k + 2; i < n; i++) H[i][k] = zero;
                }
            }
        }
    }

    /**
     * Implements the Implicit Double-Shift Francis QR Algorithm.
     * Reduces an Upper Hessenberg matrix H to Real Schur Form in-place.
     * 
     * @static
     * @param {BigFloat[][]} H - Upper Hessenberg matrix (Modified in-place).
     * @param {BigFloat[][]} V - Transformation matrix (Modified in-place).
     * @param {BigFloat} eps - Convergence tolerance.
     * @param {number} maxIterTotal - Maximum number of iterations before throwing an error.
     */
    static schurFrancisQR(H, V, eps, maxIterTotal) {
        const n = H.length;
        
        // Calculate generic matrix norm to scale deflations proportionally
        let normH = zero;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                normH = normH.add(H[i][j].abs());
            }
        }
        if (normH.isZero()) normH = one;

        let p = n - 1;
        let iterCount = 0;
        const bf1_5 = bf(1.5);
        while (p > 0) {
            if (iterCount > maxIterTotal) throw new Error("QR Algorithm failed to converge within maximum iterations.");

            // 1. Deflation check (Find independent active blocks)
            let l = p;
            while (l > 0) {
                let subDiag = H[l][l - 1].abs();
                let diagSum = H[l - 1][l - 1].abs().add(H[l][l].abs());
                if (diagSum.isZero()) diagSum = normH;
                
                if (subDiag.cmp(diagSum.mul(eps)) <= 0) {
                    H[l][l - 1] = zero;
                    break;
                }
                l--;
            }

            if (l === p) {
                p--;
                iterCount = 0;
                continue;
            }
            if (l === p - 1) {
                p -= 2;
                iterCount = 0;
                continue;
            }

            // 2. Determine Wilkinson Double Shifts for Complex Root breaking
            let s, t;
            if (iterCount > 0 && iterCount % 10 === 0) {
                let ad = H[p][p - 1].abs();
                if (p > 1) ad = ad.add(H[p - 1][p - 2].abs());
                s = ad.mul(bf1_5);
                t = ad.mul(ad);
            } else {
                let p11 = H[p - 1][p - 1], p12 = H[p - 1][p], p21 = H[p][p - 1], p22 = H[p][p];
                s = p11.add(p22);
                t = p11.mul(p22).sub(p12.mul(p21));
            }

            // 3. Bulge introduction at the top of the block
            let h_ll = H[l][l], h_l1_l = H[l + 1][l];
            let h_l_l1 = H[l][l + 1], h_l1_l1 = H[l + 1][l + 1];
            
            let x = h_ll.mul(h_ll).add(h_l_l1.mul(h_l1_l)).sub(s.mul(h_ll)).add(t);
            let y = h_l1_l.mul(h_ll.add(h_l1_l1).sub(s));
            let z = h_l1_l.mul(H[l + 2][l + 1]);

            // 4. Bulge chasing down the sub-diagonal
            for (let k = l; k <= p - 1; k++) {
                let nr = (k === p - 1) ? 2 : 3; 
                
                let max_val = x.abs();
                if (y.abs().cmp(max_val) > 0) max_val = y.abs();
                if (nr === 3 && z.abs().cmp(max_val) > 0) max_val = z.abs();
                
                if (!max_val.isZero()) {
                    let x_n = x.div(max_val);
                    let y_n = y.div(max_val);
                    let z_n = nr === 3 ? z.div(max_val) : zero;
                    
                    let sumSq = x_n.mul(x_n).add(y_n.mul(y_n)).add(z_n.mul(z_n));
                    let alpha = sumSq.sqrt();
                    if (x_n.cmp(zero) > 0) alpha = alpha.neg();
                    
                    let u0 = x_n.sub(alpha);
                    let u1 = y_n;
                    let u2 = z_n;
                    
                    let normU2 = alpha.mul(alpha).sub(x_n.mul(alpha)); 
                    
                    // Left transform
                    for (let j = Math.max(0, k - 1); j < n; j++) {
                        let dot = u0.mul(H[k][j]).add(u1.mul(H[k + 1][j]));
                        if (nr === 3) dot = dot.add(u2.mul(H[k + 2][j]));
                        dot = dot.div(normU2);
                        
                        H[k][j] = H[k][j].sub(dot.mul(u0));
                        H[k + 1][j] = H[k + 1][j].sub(dot.mul(u1));
                        if (nr === 3) H[k + 2][j] = H[k + 2][j].sub(dot.mul(u2));
                    }
                    
                    // Right transform
                    let end_i = Math.min(k + 3, n - 1);
                    for (let i = 0; i <= end_i; i++) {
                        let dot = u0.mul(H[i][k]).add(u1.mul(H[i][k + 1]));
                        if (nr === 3) dot = dot.add(u2.mul(H[i][k + 2]));
                        dot = dot.div(normU2);
                        
                        H[i][k] = H[i][k].sub(dot.mul(u0));
                        H[i][k + 1] = H[i][k + 1].sub(dot.mul(u1));
                        if (nr === 3) H[i][k + 2] = H[i][k + 2].sub(dot.mul(u2));
                    }
                    
                    // V transform mapping coordinates
                    for (let i = 0; i < n; i++) {
                        let dot = u0.mul(V[i][k]).add(u1.mul(V[i][k + 1]));
                        if (nr === 3) dot = dot.add(u2.mul(V[i][k + 2]));
                        dot = dot.div(normU2);
                        
                        V[i][k] = V[i][k].sub(dot.mul(u0));
                        V[i][k + 1] = V[i][k + 1].sub(dot.mul(u1));
                        if (nr === 3) V[i][k + 2] = V[i][k + 2].sub(dot.mul(u2));
                    }
                }
                
                // Read next targets for chasing
                if (k < p - 1) {
                    x = H[k + 1][k];
                    y = H[k + 2][k];
                    z = (k < p - 2) ? H[k + 3][k] : zero;
                }
            }
            
            // Re-enforce Hessenberg zeroes securely
            for (let i = l; i <= p; i++) {
                for (let j = 0; j <= i - 2; j++) {
                    H[i][j] = zero;
                }
            }
            
            iterCount++;
        }
    }

    /**
     * Extracts complex and real eigenvalues from a Real Schur Form matrix.
     * 
     * @static
     * @param {BigFloat[][]} H - Matrix in Real Schur Form.
     * @param {BigFloat} eps - Convergence tolerance.
     * @returns {Array<{lambda: Complex, index: number}>} - Extracted eigenvalues and submatrix boundary index.
     */
    static extractSchurEigenvalues(H, eps) {
        const n = H.length;
        const half = bf("0.5");
        const eigenvaluesInfo =[];
        let i = 0;
        
        while (i < n) {
            if (i < n - 1) {
                let subDiag = H[i + 1][i].abs();
                if (subDiag.cmp(eps) > 0) {
                    let a = H[i][i], b = H[i][i + 1], c = H[i + 1][i], d = H[i + 1][i + 1];
                    let T_val = a.add(d);
                    let D_val = a.mul(d).sub(b.mul(c));
                    let halfT = T_val.mul(half);
                    let disc = halfT.mul(halfT).sub(D_val);
                    
                    if (disc.cmp(zero) >= 0) {
                        let sqrtDisc = disc.sqrt();
                        eigenvaluesInfo.push({ lambda: new Complex(halfT.add(sqrtDisc), zero), index: i + 1 });
                        eigenvaluesInfo.push({ lambda: new Complex(halfT.sub(sqrtDisc), zero), index: i + 1 });
                    } else {
                        let sqrtDisc = disc.neg().sqrt();
                        eigenvaluesInfo.push({ lambda: new Complex(halfT, sqrtDisc), index: i + 1 });
                        eigenvaluesInfo.push({ lambda: new Complex(halfT, sqrtDisc.neg()), index: i + 1 });
                    }
                    i += 2;
                    continue;
                }
            }
            eigenvaluesInfo.push({ lambda: new Complex(H[i][i], zero), index: i });
            i += 1;
        }
        return eigenvaluesInfo;
    }

    /**
     * Computes complex eigenvectors based on the Real Schur Form via Back-Substitution.
     * Projects the vectors back into the original space using the orthogonal matrix V.
     * 
     * @static
     * @param {BigFloat[][]} H - Matrix in Real Schur Form.
     * @param {BigFloat[][]} V - Cumulative Orthogonal Transformation Matrix.
     * @param {Array<{lambda: Complex, index: number}>} eigenvaluesInfo - List of extracted eigenvalues.
     * @returns {Array<{eigenvalue: Complex, eigenvector: Array<Complex>}>} - Complete set of Eigenpairs.
     */
    static computeEigenvectors(H, V, eigenvaluesInfo) {
        const n = H.length;
        const result =[];
        
        for (const info of eigenvaluesInfo) {
            const lambda = info.lambda;
            const m = info.index;

            // H_sub = H_local - lambda * I
            const H_sub =[];
            for (let r = 0; r <= m; r++) {
                H_sub.push(new Array(m + 1));
                for (let c = 0; c <= m; c++) {
                    let val = new Complex(H[r][c], zero);
                    if (r === c) val = val.sub(lambda);
                    H_sub[r][c] = val;
                }
            }

            // Gaussian Elimination strictly configured for Upper Hessenberg topologies
            for (let k = 0; k < m; k++) {
                let pivotMag = H_sub[k][k].abs();
                let subMag = H_sub[k + 1][k].abs();

                if (subMag.cmp(pivotMag) > 0) {
                    let temp = H_sub[k];
                    H_sub[k] = H_sub[k + 1];
                    H_sub[k + 1] = temp;
                }

                if (H_sub[k][k].isZero()) continue;

                let multiplier = H_sub[k + 1][k].div(H_sub[k][k]);
                for (let j = k; j <= m; j++) {
                    H_sub[k + 1][j] = H_sub[k + 1][j].sub(multiplier.mul(H_sub[k][j]));
                }
            }

            // Back substitution mathematically isolates nullspace
            const u = new Array(n).fill(null).map(() => new Complex(zero, zero));
            u[m] = new Complex(one, zero);

            for (let k = m - 1; k >= 0; k--) {
                let sum = new Complex(zero, zero);
                for (let j = k + 1; j <= m; j++) {
                    sum = sum.add(H_sub[k][j].mul(u[j]));
                }
                
                if (!H_sub[k][k].isZero()) {
                    u[k] = sum.neg().div(H_sub[k][k]);
                } else {
                    u[k] = new Complex(one, zero); // Handles degenerate nullities safely
                }
            }

            // Reproject logical root vector back via cumulative V projection
            const eigvec = new Array(n).fill(null).map(() => new Complex(zero, zero));
            for (let i_row = 0; i_row < n; i_row++) {
                let sum = new Complex(zero, zero);
                for (let j = 0; j <= m; j++) {
                    if (!u[j].isZero()) {
                        sum = sum.add(u[j].mul(V[i_row][j]));
                    }
                }
                eigvec[i_row] = sum;
            }

            // High-Precision Vector Normalization
            let normSq = zero;
            for (let j = 0; j < n; j++) {
                let mag = eigvec[j].abs();
                normSq = normSq.add(mag.mul(mag));
            }
            let normVec = normSq.sqrt();
            if (!normVec.isZero()) {
                let cNorm = new Complex(normVec, zero);
                for (let j = 0; j < n; j++) {
                    eigvec[j] = eigvec[j].div(cNorm);
                }
            }

            result.push({ eigenvalue: lambda, eigenvector: eigvec });
        }
        
        return result;
    }

}