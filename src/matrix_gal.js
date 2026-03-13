import { SparseMatrixCSC } from "./bf";

export const gallery = {
    /**
     * Generates an n-by-n Grcar matrix.
     * A Grcar matrix is a Toeplitz matrix with -1 on the subdiagonal, 
     * 1 on the main diagonal, and 1 on the first three superdiagonals.
     * 
     * @param {number} n - The dimension of the square matrix.
     * @returns {SparseMatrixCSC}
     */
    grcar(n) {
        const rowIdx = [], colIdx = [], vals =[];
        for (let i = 0; i < n; i++) {
            if (i > 0) {
                rowIdx.push(i); colIdx.push(i - 1); vals.push(-1);
            }
            rowIdx.push(i); colIdx.push(i); vals.push(1);
            for (let k = 1; k <= 3; k++) {
                if (i + k < n) {
                    rowIdx.push(i); colIdx.push(i + k); vals.push(1);
                }
            }
        }
        return SparseMatrixCSC.fromCOO(n, n, rowIdx, colIdx, vals);
    },

    /**
     * Generates a 2D Poisson block tridiagonal matrix of size N = n^2.
     * This arises from the 5-point finite difference approximation of the Poisson equation.
     * 
     * @param {number} n - The grid dimension (the resulting matrix is n^2 by n^2).
     * @returns {SparseMatrixCSC}
     */
    poisson(n) {
        const rowIdx = [], colIdx = [], vals =[];
        const N = n * n;
        for (let i = 0; i < N; i++) {
            rowIdx.push(i); colIdx.push(i); vals.push(4); // Main diagonal
            if (i % n !== 0) { // Left neighbor
                rowIdx.push(i); colIdx.push(i - 1); vals.push(-1);
            }
            if (i % n !== n - 1) { // Right neighbor
                rowIdx.push(i); colIdx.push(i + 1); vals.push(-1);
            }
            if (i >= n) { // Top neighbor
                rowIdx.push(i); colIdx.push(i - n); vals.push(-1);
            }
            if (i < N - n) { // Bottom neighbor
                rowIdx.push(i); colIdx.push(i + n); vals.push(-1);
            }
        }
        return SparseMatrixCSC.fromCOO(N, N, rowIdx, colIdx, vals);
    },

    /**
     * Generates an n-by-n Tridiagonal matrix.
     * Default generates a typical 1D finite difference matrix: sub=-1, diag=2, sup=-1.
     * 
     * @param {number} n - Dimension of the matrix.
     * @param {number}[c=-1] - Subdiagonal value.
     * @param {number} [d=2] - Main diagonal value.
     * @param {number} [e=-1] - Superdiagonal value.
     * @returns {SparseMatrixCSC}
     */
    tridiag(n, c = -1, d = 2, e = -1) {
        const rowIdx = [], colIdx = [], vals =[];
        for (let i = 0; i < n; i++) {
            if (i > 0) {
                rowIdx.push(i); colIdx.push(i - 1); vals.push(c);
            }
            rowIdx.push(i); colIdx.push(i); vals.push(d);
            if (i < n - 1) {
                rowIdx.push(i); colIdx.push(i + 1); vals.push(e);
            }
        }
        return SparseMatrixCSC.fromCOO(n, n, rowIdx, colIdx, vals);
    },

    /**
     * Generates the n-by-n Clement matrix.
     * A tridiagonal matrix with zero on the main diagonal and known eigenvalues.
     * 
     * @param {number} n - Dimension of the matrix.
     * @returns {SparseMatrixCSC}
     */
    clement(n) {
        const rowIdx = [], colIdx = [], vals =[];
        for (let i = 0; i < n - 1; i++) {
            // Subdiagonal
            rowIdx.push(i + 1); colIdx.push(i); vals.push(n - (i + 1));
            // Superdiagonal
            rowIdx.push(i); colIdx.push(i + 1); vals.push(i + 1);
        }
        // Even though diagonal is 0, we explicitly set the size to n-by-n via fromCOO parameters.
        return SparseMatrixCSC.fromCOO(n, n, rowIdx, colIdx, vals);
    },

    /**
     * Generates an n-by-n min(i, j) symmetric positive definite matrix.
     * A_ij = min(i, j) where indices are 1-based.
     * 
     * @param {number} n - Dimension of the matrix.
     * @returns {SparseMatrixCSC}
     */
    minij(n) {
        const rowIdx = [], colIdx = [], vals =[];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rowIdx.push(i); colIdx.push(j); vals.push(Math.min(i + 1, j + 1));
            }
        }
        return SparseMatrixCSC.fromCOO(n, n, rowIdx, colIdx, vals);
    },

    /**
     * Generates an n-by-n Lehmer matrix.
     * A symmetric positive definite matrix where A_ij = min(i,j) / max(i,j).
     * 
     * @param {number} n - Dimension of the matrix.
     * @returns {SparseMatrixCSC}
     */
    lehmer(n) {
        const rowIdx = [], colIdx = [], vals =[];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rowIdx.push(i); colIdx.push(j);
                vals.push(Math.min(i + 1, j + 1) / Math.max(i + 1, j + 1));
            }
        }
        return SparseMatrixCSC.fromCOO(n, n, rowIdx, colIdx, vals);
    },

    /**
     * Generates the Pei matrix.
     * A symmetric matrix where A_ij = 1, except A_ii = alpha + 1.
     * 
     * @param {number} n - Dimension of the matrix.
     * @param {number}[alpha=1] - Scalar to add to the main diagonal.
     * @returns {SparseMatrixCSC}
     */
    pei(n, alpha = 1) {
        const rowIdx = [], colIdx = [], vals =[];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rowIdx.push(i); colIdx.push(j);
                vals.push(i === j ? alpha + 1 : 1);
            }
        }
        return SparseMatrixCSC.fromCOO(n, n, rowIdx, colIdx, vals);
    },

    /**
     * Generates an n-by-n Hilbert matrix.
     * A notoriously ill-conditioned matrix where A_ij = 1 / (i + j - 1). (1-based indices)
     * 
     * @param {number} n - Dimension of the matrix.
     * @returns {SparseMatrixCSC}
     */
    hilb(n) {
        const rowIdx = [], colIdx =[], vals =[];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rowIdx.push(i); colIdx.push(j); vals.push(1 / (i + j + 1));
            }
        }
        return SparseMatrixCSC.fromCOO(n, n, rowIdx, colIdx, vals);
    },

    /**
     * Generates a Circulant matrix from a given vector.
     * 
     * @param {number[]} v - The first row of the matrix.
     * @returns {SparseMatrixCSC}
     */
    circul(v) {
        const n = v.length;
        const rowIdx = [], colIdx = [], vals =[];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rowIdx.push(i); colIdx.push(j);
                // Circulant shift logic
                vals.push(v[(j - i + n) % n]);
            }
        }
        return SparseMatrixCSC.fromCOO(n, n, rowIdx, colIdx, vals);
    }
};