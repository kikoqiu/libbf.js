const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, Vector, SparseMatrixCSC } = require('../dist/bf.cjs');

describe('SparseMatrixCSC Test Suite 1', () => {
    beforeAll(async () => {
        await init();
    });

    const expectVecCloseTo = (vec, arr, digits = 20) => {
        expect(vec.length).toBe(arr.length);
        for (let i = 0; i < vec.length; i++) {
            expectBFCloseTo(vec.get(i), bf(arr[i]), digits);
        }
    };

    const expectMatCloseTo = (mat, arr2D, digits = 20) => {
        expect(mat.rows).toBe(arr2D.length);
        const dense = mat.toDense();
        for (let i = 0; i < mat.rows; i++) {
            for (let j = 0; j < mat.cols; j++) {
                expectBFCloseTo(dense[i][j], bf(arr2D[i][j]), digits);
            }
        }
    };

    // ==========================================
    // 11. solveUpperTriangular() Tests (Tests 91 - 100)
    // ==========================================

    test('91. solveUpperTriangular solves identity matrix system (x = b)', () => {
        const U = SparseMatrixCSC.fromDense([
            [1, 0],
            [0, 1]
        ]);
        const b = new Vector([3.5, 4.2]);
        const x = U.solveUpperTriangular(b);
        expectVecCloseTo(x,[3.5, 4.2]);
    });

    test('92. solveUpperTriangular solves basic 2x2 upper triangular system', () => {
        const U = SparseMatrixCSC.fromDense([
            [2, 1],
            [0, 2]
        ]);
        const b = new Vector([4, 4]);
        // 2*x1 = 4 => x1 = 2
        // 2*x0 + 1*x1 = 4 => 2*x0 + 2 = 4 => x0 = 1
        const x = U.solveUpperTriangular(b);
        expectVecCloseTo(x, [1, 2]);
    });

    test('93. solveUpperTriangular solves 3x3 upper triangular system', () => {
        const U = SparseMatrixCSC.fromDense([
            [1, 2, 3],
            [0, 4, 5],[0, 0, 6]
        ]);
        const b = new Vector([14, 23, 18]);
        // 6*x2 = 18 => x2 = 3
        // 4*x1 + 5*3 = 23 => 4*x1 = 8 => x1 = 2
        // 1*x0 + 2*2 + 3*3 = 14 => x0 + 4 + 9 = 14 => x0 = 1
        const x = U.solveUpperTriangular(b);
        expectVecCloseTo(x, [1, 2, 3]);
    });

    test('94. solveUpperTriangular throws error if matrix is not square', () => {
        const U = SparseMatrixCSC.fromDense([
            [1, 2],
            [0, 3],
            [0, 0]
        ]);
        const b = new Vector([1, 2]);
        expect(() => U.solveUpperTriangular(b)).toThrow("Matrix must be square.");
    });

    test('95. solveUpperTriangular throws error on dimension mismatch with RHS', () => {
        const U = SparseMatrixCSC.fromDense([
            [1, 2],
            [0, 3]
        ]);
        const b = new Vector([1, 2, 3]);
        expect(() => U.solveUpperTriangular(b)).toThrow("Dimension mismatch.");
    });

    test('96. solveUpperTriangular throws error for singular matrix (zero on diagonal)', () => {
        const U = SparseMatrixCSC.fromDense([[1, 2],
            [0, 0]
        ]);
        const b = new Vector([4, 4]);
        expect(() => U.solveUpperTriangular(b)).toThrow(/Singular matrix/);
    });

    test('97. solveUpperTriangular supports pure Arrays as RHS input', () => {
        const U = SparseMatrixCSC.fromDense([
            [2, 1],[0, 2]
        ]);
        const x = U.solveUpperTriangular([4, 4]); // Passing raw array
        expectVecCloseTo(x, [1, 2]);
    });

    test('98. solveUpperTriangular works correctly with negative values', () => {
        const U = SparseMatrixCSC.fromDense([
            [-2,  3],
            [ 0, -4]
        ]);
        const b = new Vector([12, 8]);
        // -4*x1 = 8 => x1 = -2
        // -2*x0 + 3*(-2) = 12 => -2*x0 - 6 = 12 => -2*x0 = 18 => x0 = -9
        const x = U.solveUpperTriangular(b);
        expectVecCloseTo(x, [-9, -2]);
    });

    test('99. solveUpperTriangular handles missing off-diagonal dependencies correctly', () => {
        const U = SparseMatrixCSC.fromDense([[2, 0, 1],
            [0, 2, 0],
            [0, 0, 2]
        ]);
        const b = new Vector([5, 4, 6]);
        // x2 = 3
        // x1 = 2
        // 2*x0 + 3 = 5 => x0 = 1
        const x = U.solveUpperTriangular(b);
        expectVecCloseTo(x, [1, 2, 3]);
    });

    test('100. solveUpperTriangular preserves BigFloat accuracy', () => {
        const U = SparseMatrixCSC.fromDense([
            [0.1, 0.2],
            [0.0, 0.4]
        ]);
        const b = new Vector([0.05, 0.4]);
        // 0.4*x1 = 0.4 => x1 = 1.0
        // 0.1*x0 + 0.2*1.0 = 0.05 => 0.1*x0 = -0.15 => x0 = -1.5
        const x = U.solveUpperTriangular(b);
        expectVecCloseTo(x,[-1.5, 1.0]);
    });

    // ==========================================
    // 12. solveCG() Tests (Tests 101 - 110)
    // ==========================================

    test('101. solveCG solves identity matrix system exactly', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const b = new Vector([3, 4]);
        const x = A.solveCG(b);
        expectVecCloseTo(x,[3, 4]);
    });

    test('102. solveCG solves a 2x2 Symmetric Positive Definite (SPD) system', () => {
        const A = SparseMatrixCSC.fromDense([[3, 1],
            [1, 2]
        ]);
        const b = new Vector([5, 5]);
        // 3x + y = 5, x + 2y = 5 => x = 1, y = 2
        const x = A.solveCG(b);
        expectVecCloseTo(x, [1, 2], 10);
    });

    test('103. solveCG solves a 3x3 SPD system', () => {
        const A = SparseMatrixCSC.fromDense([
            [4, 1, 0],
            [1, 4, 1],
            [0, 1, 4]
        ]);
        const b = new Vector([5, 6, 5]);
        // Solution should be [1, 1, 1]
        const x = A.solveCG(b);
        expectVecCloseTo(x, [1, 1, 1], 10);
    });

    test('104. solveCG throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2],[2, 1], [0, 0]]);
        expect(() => A.solveCG([1, 2])).toThrow("Matrix must be square for CG.");
    });

    test('105. solveCG accepts plain arrays for RHS vector b', () => {
        const A = SparseMatrixCSC.fromDense([[2, 0], [0, 2]]);
        const x = A.solveCG([6, 8]);
        expectVecCloseTo(x, [3, 4], 10);
    });

    test('106. solveCG converges for well-conditioned systems within dimension iterations', () => {
        const A = SparseMatrixCSC.fromDense([
            [5, 2],
            [2, 5]
        ]);
        const b = new Vector([12, 9]); // Sol: x=2, y=1
        // Default maxIter is matrix dimension (2). Should converge exactly.
        const x = A.solveCG(b);
        expectVecCloseTo(x, [2, 1], 10);
    });

    test('107. solveCG works with negative values in RHS', () => {
        const A = SparseMatrixCSC.fromDense([
            [4, 1],
            [1, 3]
        ]);
        const b = new Vector([-3, -9]); // Sol: 4x+y = -3, x+3y = -9 => x=0, y=-3
        const x = A.solveCG(b);
        expectVecCloseTo(x, [0, -3], 10);
    });

    test('108. solveCG returns zero vector if RHS is zero', () => {
        const A = SparseMatrixCSC.fromDense([[2, 1], [1, 2]]);
        const x = A.solveCG([0, 0]);
        expectVecCloseTo(x, [0, 0], 15);
    });

    test('109. solveCG accepts custom BigFloat tolerance', () => {
        const A = SparseMatrixCSC.fromDense([[3, 1], [1, 2]]);
        const b = new Vector([5, 5]);
        // Use a looser tolerance "1e-5"
        const x = A.solveCG(b, "1e-5");
        expectVecCloseTo(x, [1, 2], 4);
    });

    test('110. solveCG stops early if maxIter is reached before convergence', () => {
        const A = SparseMatrixCSC.fromDense([[3, 1], [1, 2]]);
        const b = new Vector([5, 5]);
        // Force it to stop at 0 iterations (solution remains initial guess 0)
        const x = A.solveCG(b, "1e-15", 0);
        expectVecCloseTo(x,[0, 0], 10);
    });

    // ==========================================
    // 13. getJacobiPreconditioner() Tests (Tests 111 - 120)
    // ==========================================

    test('111. getJacobiPreconditioner returns 1s for identity matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0],[0, 1]]);
        const M_inv = A.getJacobiPreconditioner();
        expectVecCloseTo(M_inv, [1, 1]);
    });

    test('112. getJacobiPreconditioner returns inverse of positive diagonals', () => {
        const A = SparseMatrixCSC.fromDense([[2, 1], [3, 4]]);
        const M_inv = A.getJacobiPreconditioner();
        // 1/2 = 0.5, 1/4 = 0.25
        expectVecCloseTo(M_inv, [0.5, 0.25]);
    });

    test('113. getJacobiPreconditioner handles negative diagonal elements', () => {
        const A = SparseMatrixCSC.fromDense([[-5, 0], [0, -10]]);
        const M_inv = A.getJacobiPreconditioner();
        expectVecCloseTo(M_inv,["-0.2", "-0.1"]);
    });

    test('114. getJacobiPreconditioner falls back to 1.0 for explicitly zero diagonals', () => {
        const A = SparseMatrixCSC.fromDense([[0, 1], [1, 2]]);
        const M_inv = A.getJacobiPreconditioner();
        // Index 0 is 0 -> fallback to 1.0. Index 1 is 2 -> 0.5.
        expectVecCloseTo(M_inv, [1.0, 0.5]);
    });

    test('115. getJacobiPreconditioner handles rectangular matrix (rows < cols)', () => {
        const A = SparseMatrixCSC.fromDense([[4, 1, 0],
            [1, 5, 2]
        ]); // min dim is 2
        const M_inv = A.getJacobiPreconditioner();
        expectVecCloseTo(M_inv,["0.25", "0.2"]);
    });

    test('116. getJacobiPreconditioner handles rectangular matrix (rows > cols)', () => {
        const A = SparseMatrixCSC.fromDense([
            [8, 1],
            [1, 4],
            [2, 2]
        ]); // min dim is 2
        const M_inv = A.getJacobiPreconditioner();
        expectVecCloseTo(M_inv, [0.125, 0.25]);
    });

    test('117. getJacobiPreconditioner ignores off-diagonal elements entirely', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, 999],[-999, 5]
        ]);
        const M_inv = A.getJacobiPreconditioner();
        expectVecCloseTo(M_inv, ["0.5", "0.2"]);
    });

    test('118. getJacobiPreconditioner on an empty matrix returns an empty vector', () => {
        const A = SparseMatrixCSC.fromDense([]);
        const M_inv = A.getJacobiPreconditioner();
        expect(M_inv.length).toBe(0);
    });

    test('119. getJacobiPreconditioner preserves BigFloat precision for fractional diagonals', () => {
        const A = SparseMatrixCSC.fromDense([[0.125, 0], [0, 0.5]]);
        const M_inv = A.getJacobiPreconditioner();
        // 1 / 0.125 = 8, 1 / 0.5 = 2
        expectVecCloseTo(M_inv,[8, 2]);
    });

    test('120. getJacobiPreconditioner works when diagonals are structural explicit zeros', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4]]);
        A.set(0, 0, 0); // set A[0,0] = 0 explicitly
        const M_inv = A.getJacobiPreconditioner();
        // Since A[0,0] is zero, fallback is 1.0. A[1,1] is 4, inverse is 0.25.
        expectVecCloseTo(M_inv,[1.0, 0.25]);
    });

    // ==========================================
    // 14. solveBiCGSTAB() Tests (Tests 121 - 130)
    // ==========================================

    test('121. solveBiCGSTAB solves identity matrix system exactly', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const x = A.solveBiCGSTAB([5, -7]);
        expectVecCloseTo(x, [5, -7], 10);
    });

    test('122. solveBiCGSTAB solves a non-symmetric 2x2 system', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 2],
            [3, 4]
        ]);
        const b = new Vector([5, 11]);
        // x + 2y = 5, 3x + 4y = 11 => x = 1, y = 2
        const x = A.solveBiCGSTAB(b);
        expectVecCloseTo(x,[1, 2], 10);
    });

    test('123. solveBiCGSTAB solves a 3x3 non-symmetric system', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, -1,  0],
            [1,  2, -1],
            [0,  1,  2]
        ]);
        const b = new Vector([1, 2, 3]);
        // Sol: x0 = 1, x1 = 1, x2 = 1
        const x = A.solveBiCGSTAB(b);
        expectVecCloseTo(x,[1, 1, 1], 10);
    });

    test('124. solveBiCGSTAB throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4], [5, 6]]);
        expect(() => A.solveBiCGSTAB([1, 2])).toThrow("Matrix must be square for BiCGSTAB.");
    });

    test('125. solveBiCGSTAB accepts plain arrays for RHS vector b', () => {
        const A = SparseMatrixCSC.fromDense([[4, 1],[1, 3]]);
        const x = A.solveBiCGSTAB([-3, -9]); // x=0, y=-3
        expectVecCloseTo(x, [0, -3], 10);
    });

    test('126. solveBiCGSTAB works correctly with a supplied Jacobi preconditioner', () => {
        const A = SparseMatrixCSC.fromDense([
            [10, 1],[ 2, 8]
        ]);
        const b = new Vector([11, 10]); // x=1, y=1
        const precond = A.getJacobiPreconditioner();
        const x = A.solveBiCGSTAB(b, "1e-15", 10, precond);
        expectVecCloseTo(x, [1, 1], 10);
    });

    test('127. solveBiCGSTAB returns zero vector if RHS is zero', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4]]);
        const x = A.solveBiCGSTAB([0, 0]);
        expectVecCloseTo(x,[0, 0], 15);
    });

    test('128. solveBiCGSTAB stops at custom maxIter', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2],[3, 4]]);
        const b = new Vector([5, 11]);
        // 0 iterations means it stays at initial guess 0
        const x = A.solveBiCGSTAB(b, "1e-15", 0);
        expectVecCloseTo(x, [0, 0], 10);
    });

    test('129. solveBiCGSTAB supports custom tolerance parameter', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4]]);
        const b = new Vector([5, 11]);
        const x = A.solveBiCGSTAB(b, "1e-5");
        expectVecCloseTo(x, [1, 2], 4);
    });

    test('130. solveBiCGSTAB solves larger poorly scaled systems reliably', () => {
        const A = SparseMatrixCSC.fromDense([
            [100, 1, 0],
            [1, 100, 1],[0, 1, 100]
        ]);
        const b = new Vector([101, 102, 101]);
        // Sol: x0 = 1, x1 = 1, x2 = 1
        const x = A.solveBiCGSTAB(b);
        expectVecCloseTo(x, [1, 1, 1], 10);
    });

    // ==========================================
    // 15. syrk() Tests (Tests 131 - 140)
    // ==========================================

    test('131. syrk computes A * A^T for identity matrix (yields identity)', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const C = A.syrk();
        expectMatCloseTo(C, [[1, 0], [0, 1]]);
    });

    test('132. syrk computes A * A^T for basic 2x2 matrix', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 2],
            [3, 4]
        ]);
        // A * A^T = [[1*1+2*2, 1*3+2*4],[3*1+4*2, 3*3+4*4]] = [[5, 11], [11, 25]]
        const C = A.syrk();
        expectMatCloseTo(C, [[5, 11], [11, 25]]);
    });

    test('133. syrk computes correctly for rectangular matrix (rows > cols)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 2],
            [3, 4],
            [5, 6]
        ]);
        // Result should be 3x3 symmetric matrix
        const C = A.syrk();
        expect(C.rows).toBe(3);
        expect(C.cols).toBe(3);
        expectMatCloseTo(C, [[5, 11, 17],
            [11, 25, 39],[17, 39, 61]
        ]);
    });

    test('134. syrk computes correctly for rectangular matrix (cols > rows)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 2, 3],
            [4, 5, 6]
        ]);
        // Result should be 2x2 symmetric matrix
        const C = A.syrk();
        expect(C.rows).toBe(2);
        expect(C.cols).toBe(2);
        expectMatCloseTo(C, [
            [14, 32],[32, 77]
        ]);
    });

    test('135. syrk of an all-zeros matrix remains zero', () => {
        const A = SparseMatrixCSC.fromDense([[0, 0],[0, 0]]);
        const C = A.syrk();
        expectMatCloseTo(C, [[0, 0], [0, 0]]);
        expect(C.nnz).toBe(0);
    });

    test('136. syrk handles negative elements correctly (squares become positive)', () => {
        const A = SparseMatrixCSC.fromDense([[-1, -2], [3, -4]]);
        const C = A.syrk();
        // Row 0 dot Row 0: (-1)^2 + (-2)^2 = 5
        // Row 0 dot Row 1: -1*3 + -2*-4 = 5
        // Row 1 dot Row 1: 3^2 + (-4)^2 = 25
        expectMatCloseTo(C, [[5, 5],[5, 25]]);
    });

    test('137. syrk on a 1xN row vector produces a 1x1 matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2, 3]]);
        const C = A.syrk();
        expect(C.rows).toBe(1);
        expect(C.cols).toBe(1);
        expectMatCloseTo(C, [[14]]); // 1+4+9
    });

    test('138. syrk on an Nx1 column vector produces an NxN matrix', () => {
        const A = SparseMatrixCSC.fromDense([[2], [3]]);
        const C = A.syrk();
        expect(C.rows).toBe(2);
        expect(C.cols).toBe(2);
        expectMatCloseTo(C, [[4, 6], [6, 9]]);
    });

    test('139. syrk computes correctly for a diagonal matrix', () => {
        const A = SparseMatrixCSC.fromDense([[2, 0], [0, 3]]);
        const C = A.syrk();
        expectMatCloseTo(C, [[4, 0], [0, 9]]);
    });

    test('140. syrk preserves BigFloat accuracy', () => {
        const A = SparseMatrixCSC.fromDense([[0.5, 0], [0, 0.25]]);
        const C = A.syrk();
        expectMatCloseTo(C, [[0.25, 0],[0, 0.0625]]);
    });

    // ==========================================
    // 16. ger() Tests (Tests 141 - 150)
    // ==========================================

    test('141. ger computes A + x * y^T for an all-zeros matrix', () => {
        const A = SparseMatrixCSC.fromDense([[0, 0], [0, 0]]);
        const x = new Vector([1, 2]);
        const y = new Vector([3, 4]);
        // x * y^T = [[3, 4], [6, 8]]
        const C = A.ger(x, y);
        expectMatCloseTo(C, [[3, 4],[6, 8]]);
    });

    test('142. ger computes A + x * y^T for a basic 2x2 matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 1], [1, 1]]);
        const x = [1, 2];
        const y = [3, 4];
        // 1 + 3=4, 1 + 4=5; 1 + 6=7, 1 + 8=9
        const C = A.ger(x, y);
        expectMatCloseTo(C, [[4, 5],[7, 9]]);
    });

    test('143. ger accepts Vector instances for x and y', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const x = new Vector([2, 2]);
        const y = new Vector([3, 3]);
        const C = A.ger(x, y);
        expectMatCloseTo(C, [[7, 6], [6, 7]]);
    });

    test('144. ger handles rectangular matrices and vectors', () => {
        const A = SparseMatrixCSC.fromDense([[0, 0, 0],[0, 0, 0]]);
        const x = [1, 2];       // length = 2 (rows)
        const y = [3, 4, 5];    // length = 3 (cols)
        const C = A.ger(x, y);
        expectMatCloseTo(C, [[3, 4, 5],
            [6, 8, 10]
        ]);
    });

    test('145. ger throws error if x length does not match matrix rows', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const x = [1, 2, 3];
        const y = [1, 2];
        expect(() => A.ger(x, y)).toThrow("Dimension mismatch for GER: x must match rows, y must match cols.");
    });

    test('146. ger throws error if y length does not match matrix cols', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0],[0, 1]]);
        const x = [1, 2];
        const y = [1];
        expect(() => A.ger(x, y)).toThrow("Dimension mismatch for GER: x must match rows, y must match cols.");
    });

    test('147. ger efficiently skips structural explicit zeros in vectors', () => {
        const A = SparseMatrixCSC.fromDense([[1, 1], [1, 1]]);
        const x = [1, 0];
        const y = [0, 2];
        // x * y^T = [[0, 2], [0, 0]]
        // C = [[1, 3], [1, 1]]
        const C = A.ger(x, y);
        expectMatCloseTo(C, [[1, 3], [1, 1]]);
    });

    test('148. ger works with negative vector elements', () => {
        const A = SparseMatrixCSC.fromDense([[5, 5], [5, 5]]);
        const x = [-1, -2];
        const y = [3, -4];
        // x * y^T = [[-3, 4], [-6, 8]]
        const C = A.ger(x, y);
        expectMatCloseTo(C, [[2, 9], [-1, 13]]);
    });

    test('149. ger preserves sparsity if resulting update is zero', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4]]);
        const x =[0, 0];
        const y = [0, 0];
        const C = A.ger(x, y);
        expectMatCloseTo(C, [[1, 2], [3, 4]]);
    });

    test('150. ger preserves BigFloat accuracy', () => {
        const A = SparseMatrixCSC.fromDense([["0.1", "0.2"],["0.3", "0.4"]]);
        const x = ["0.5", "0.6"];
        const y =["0.7", "0.8"];
        const C = A.ger(x, y);
        // x*y^T = [[0.35, 0.40],[0.42, 0.48]]
        expectMatCloseTo(C, [["0.45", "0.60"],["0.72", "0.88"]]);
    });

    // ==========================================
    // 17. trsm() Tests (Tests 151 - 160)
    // ==========================================

    test('151. trsm solves A * X = B for identity lower triangular matrix', () => {
        const L = SparseMatrixCSC.fromDense([[1, 0],[0, 1]]);
        const B = SparseMatrixCSC.fromDense([[5, 6], [7, 8]]);
        const X = L.trsm(B, true);
        expectMatCloseTo(X, [[5, 6], [7, 8]]);
    });

    test('152. trsm solves A * X = B for basic lower triangular matrix', () => {
        const L = SparseMatrixCSC.fromDense([[2, 0], [1, 2]]);
        const B = SparseMatrixCSC.fromDense([[4, 8], [4, 6]]);
        // Col 0: 2x=4 => 2, 1*2+2y=4 => 1
        // Col 1: 2x=8 => 4, 1*4+2y=6 => 1
        const X = L.trsm(B, true);
        expectMatCloseTo(X, [[2, 4],[1, 1]]);
    });

    test('153. trsm solves A * X = B for basic upper triangular matrix (lower=false)', () => {
        const U = SparseMatrixCSC.fromDense([[2, 1], [0, 2]]);
        const B = SparseMatrixCSC.fromDense([[4, 6], [4, 8]]);
        const X = U.trsm(B, false);
        expectMatCloseTo(X, [[1, 1], [2, 4]]);
    });

    test('154. trsm works with rectangular B matrix (cols > rows)', () => {
        const L = SparseMatrixCSC.fromDense([[2, 0], [1, 2]]);
        const B = SparseMatrixCSC.fromDense([[4, 8, 2],[4, 6, 1]]);
        const X = L.trsm(B, true);
        expect(X.rows).toBe(2);
        expect(X.cols).toBe(3);
        expectMatCloseTo(X, [[2, 4, 1], [1, 1, 0]]);
    });

    test('155. trsm throws error if A is not square', () => {
        const L = SparseMatrixCSC.fromDense([[1, 0], [2, 3], [4, 5]]);
        const B = SparseMatrixCSC.fromDense([[1], [1], [1]]);
        expect(() => L.trsm(B, true)).toThrow("Matrix must be square for TRSM.");
    });

    test('156. trsm throws error if A rows and B rows mismatch', () => {
        const L = SparseMatrixCSC.fromDense([[1, 0], [2, 3]]);
        const B = SparseMatrixCSC.fromDense([[1, 2], [3, 4], [5, 6]]);
        expect(() => L.trsm(B, true)).toThrow("Dimension mismatch: A rows must match B rows.");
    });

    test('157. trsm throws error for singular A matrix (zero on diagonal)', () => {
        const L = SparseMatrixCSC.fromDense([[0, 0], [1, 2]]);
        const B = SparseMatrixCSC.fromDense([[4, 8], [4, 6]]);
        expect(() => L.trsm(B, true)).toThrow(/Singular matrix/);
    });

    test('158. trsm gracefully handles empty B matrix (zero columns)', () => {
        const L = SparseMatrixCSC.fromDense([[2, 0], [1, 2]]);
        const B = SparseMatrixCSC.fromDense([[],[]]); // 2x0 matrix
        const X = L.trsm(B, true);
        expect(X.rows).toBe(2);
        expect(X.cols).toBe(0);
        expect(X.nnz).toBe(0);
    });

    test('159. trsm works correctly with negative elements', () => {
        const L = SparseMatrixCSC.fromDense([[-2, 0], [3, -4]]);
        const B = SparseMatrixCSC.fromDense([[6, -2], [-1, 7]]);
        const X = L.trsm(B, true);
        expectMatCloseTo(X, [[-3, 1], [-2, -1]]);
    });

    test('160. trsm preserves BigFloat accuracy and sparse format structure', () => {
        const L = SparseMatrixCSC.fromDense([["0.1", 0], ["0.2", "0.4"]]);
        const B = SparseMatrixCSC.fromDense([["0.05", 0],["0.5", "0"]]);
        const X = L.trsm(B, true);
        expectMatCloseTo(X, [["0.5", 0], ["1.0", 0]]);
        // Column 1 should be completely empty in the CSC structure
        expect(X.nnz).toBe(2);
    });

    // ==========================================
    // 18. lu() Tests (Tests 161 - 170)
    // ==========================================

    test('161. lu computes exact factors for identity matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const { L, U } = A.lu();
        expectMatCloseTo(L, [[1, 0], [0, 1]]);
        expectMatCloseTo(U, [[1, 0],[0, 1]]);
    });

    test('162. lu computes exact factors for basic 2x2 matrix', () => {
        const A = SparseMatrixCSC.fromDense([
            [4, 3],
            [6, 3]
        ]);
        const { L, U } = A.lu();
        // L = [[1, 0], [1.5, 1]], U = [[4, 3], [0, -1.5]]
        expectMatCloseTo(L, [[1, 0], [1.5, 1]]);
        expectMatCloseTo(U, [[4, 3], [0, -1.5]]);
        
        // Reconstruct A = L * U
        const LU = L.mul(U);
        expectMatCloseTo(LU, [[4, 3],[6, 3]]);
    });

    test('163. lu computes exact factors for 3x3 matrix without permutations', () => {
        const A = SparseMatrixCSC.fromDense([[2,  1,  1],
            [4, -6,  0],[-2, 7,  2]
        ]);
        const { L, U } = A.lu();
        const LU = L.mul(U);
        expectMatCloseTo(LU, [
            [2,  1,  1],
            [4, -6,  0],
            [-2, 7,  2]
        ]);
    });

    test('164. lu throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4],[5, 6]]);
        expect(() => A.lu()).toThrow("Square matrix required for LU factorization.");
    });

    test('165. lu throws error if a zero pivot is encountered (no pivoting)', () => {
        const A = SparseMatrixCSC.fromDense([
            [0, 1],
            [1, 0]
        ]);
        expect(() => A.lu()).toThrow(/Zero pivot encountered/);
    });

    test('166. lu enforces explicit unit diagonals on L matrix', () => {
        const A = SparseMatrixCSC.fromDense([
            [10, 2],[5,  6]
        ]);
        const { L } = A.lu();
        const L_dense = L.toDense();
        expectBFCloseTo(L_dense[0][0], bf(1), 20);
        expectBFCloseTo(L_dense[1][1], bf(1), 20);
    });

    test('167. lu enforces strict zero patterns for upper and lower regions', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, 3],
            [4, 7]
        ]);
        const { L, U } = A.lu();
        const L_dense = L.toDense();
        const U_dense = U.toDense();
        
        // L must be strictly lower triangular (top right is 0)
        expectBFCloseTo(L_dense[0][1], bf(0), 20);
        // U must be strictly upper triangular (bottom left is 0)
        expectBFCloseTo(U_dense[1][0], bf(0), 20);
    });

    test('168. lu handles fully populated non-zero matrices correctly', () => {
        const A = SparseMatrixCSC.fromDense([
            [-1, -2, 3],
            [2,  1, -1],
            [-3, 4,  2]
        ]);
        const { L, U } = A.lu();
        const LU = L.mul(U);
        expectMatCloseTo(LU, [
            [-1, -2, 3],[2,  1, -1],
            [-3, 4,  2]
        ]);
    });

    test('169. lu handles diagonal matrices gracefully', () => {
        const A = SparseMatrixCSC.fromDense([[5, 0], [0, 8]]);
        const { L, U } = A.lu();
        expectMatCloseTo(L, [[1, 0], [0, 1]]);
        expectMatCloseTo(U, [[5, 0], [0, 8]]);
    });

    test('170. lu preserves BigFloat exact precision throughout steps', () => {
        const A = SparseMatrixCSC.fromDense([
            ["0.1",  "0.2"],["0.3", "-0.4"]
        ]);
        const { L, U } = A.lu();
        // L = [[1, 0], [3, 1]]
        // U = [[0.1, 0.2], [0, -1.0]]
        expectMatCloseTo(L, [[1, 0], [3, 1]]);
        expectMatCloseTo(U, [["0.1", "0.2"], ["0", "-1.0"]]);
    });


    // ==========================================
    // 19. cholesky() Tests (Tests 171 - 180)
    // ==========================================

    test('171. cholesky computes exact L factor for identity matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const L = A.cholesky();
        expectMatCloseTo(L, [[1, 0], [0, 1]]);
    });

    test('172. cholesky computes exact L factor for a 2x2 SPD matrix', () => {
        const A = SparseMatrixCSC.fromDense([[4, 12],
            [12, 45]
        ]);
        const L = A.cholesky();
        // L * L^T = A => L = [[2, 0], [6, 3]]
        expectMatCloseTo(L, [[2, 0], [6, 3]]);
    });

    test('173. cholesky computes exact L factor for a 3x3 SPD matrix', () => {
        const A = SparseMatrixCSC.fromDense([[25, 15, -5],
            [15, 18,  0],[-5,  0, 11]
        ]);
        const L = A.cholesky();
        // L = [[5, 0, 0], [3, 3, 0],[-1, 1, 3]]
        expectMatCloseTo(L, [
            [5, 0, 0],[3, 3, 0],
            [-1, 1, 3]
        ]);
    });

    test('174. cholesky reconstructs the original matrix via L * L^T', () => {
        const A = SparseMatrixCSC.fromDense([
            [4, 2],[2, 10]
        ]);
        const L = A.cholesky();
        const A_reconstructed = L.syrk(); // L * L^T
        expectMatCloseTo(A_reconstructed, [[4, 2], [2, 10]]);
    });

    test('175. cholesky throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [2, 1], [0, 0]]);
        expect(() => A.cholesky()).toThrow("Square matrix required for LU factorization.");
    });

    test('176. cholesky throws error if matrix is not positive definite (negative diagonal)', () => {
        const A = SparseMatrixCSC.fromDense([
            [-4, 2],[ 2, 4]
        ]);
        expect(() => A.cholesky()).toThrow(/not symmetric positive definite/);
    });

    test('177. cholesky throws error if zero pivot encountered (singular matrix)', () => {
        const A = SparseMatrixCSC.fromDense([
            [0, 0],[0, 1]
        ]);
        expect(() => A.cholesky()).toThrow(/Zero pivot encountered/);
    });

    test('178. cholesky handles a purely diagonal SPD matrix correctly', () => {
        const A = SparseMatrixCSC.fromDense([[9, 0],[0, 16]]);
        const L = A.cholesky();
        expectMatCloseTo(L, [[3, 0], [0, 4]]);
    });

    test('179. cholesky ensures output is strictly lower triangular', () => {
        const A = SparseMatrixCSC.fromDense([[4, 2], [2, 5]]);
        const L = A.cholesky();
        const L_dense = L.toDense();
        expectBFCloseTo(L_dense[0][1], bf(0), 20); // Top right must be 0
    });

    test('180. cholesky preserves BigFloat accuracy for fractional positive definite matrices', () => {
        const A = SparseMatrixCSC.fromDense([
            ["0.25", "0.15"],["0.15", "0.18"]
        ]);
        const L = A.cholesky();
        // L = [[0.5, 0], [0.3, 0.3]]
        expectMatCloseTo(L, [["0.5", 0],["0.3", "0.3"]]);
    });

    // ==========================================
    // 20. solve() Tests (Tests 181 - 190)
    // ==========================================

    test('181. solve computes correct solution for identity matrix (x = b)', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const b = new Vector([3, 4]);
        const x = A.solve(b);
        expectVecCloseTo(x, [3, 4]);
    });

    test('182. solve computes correct solution for 2x2 linear system', () => {
        const A = SparseMatrixCSC.fromDense([
            [4, 3],[6, 3]
        ]);
        const b = new Vector([10, 12]);
        // 4x + 3y = 10, 6x + 3y = 12 => x = 1, y = 2
        const x = A.solve(b);
        expectVecCloseTo(x, [1, 2]);
    });

    test('183. solve computes correct solution for 3x3 linear system', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, 1, 1],[4, 1, 0],
            [-2, 2, 1]
        ]);
        const b = new Vector([4, 5, 1]);
        // Sol: x0 = 1, x1 = 1, x2 = 1
        const x = A.solve(b);
        expectVecCloseTo(x,[1, 1, 1]);
    });

    test('184. solve accepts pure Arrays as RHS input', () => {
        const A = SparseMatrixCSC.fromDense([[2, 0],
            [1, 2]
        ]);
        const x = A.solve([4, 4]); // Passing raw array
        // 2x = 4 => x=2, 2 + 2y = 4 => y=1
        expectVecCloseTo(x, [2, 1]);
    });

    test('185. solve throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4], [5, 6]]);
        expect(() => A.solve([1, 2])).toThrow("Square matrix required for LU factorization.");
    });

    test('186. solve throws error if matrix is singular (fails LU decomposition)', () => {
        const A = SparseMatrixCSC.fromDense([[1, 1], [1, 1]]);
        expect(() => A.solve([2, 2])).toThrow(/Zero pivot encountered/);
    });

    test('187. solve throws error on dimension mismatch with RHS', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4]]);
        expect(() => A.solve([1, 2, 3])).toThrow("Dimension mismatch."); // Thrown in solveLowerTriangular
    });

    test('188. solve handles negative numbers correctly in matrix and RHS', () => {
        const A = SparseMatrixCSC.fromDense([
            [-2,  1],[ 1, -2]
        ]);
        const b = new Vector([-1, 2]);
        // -2x + y = -1, x - 2y = 2 => x = 0, y = -1
        const x = A.solve(b);
        expectVecCloseTo(x, [0, -1]);
    });

    test('189. solve handles zero vector RHS correctly (returns zero vector)', () => {
        const A = SparseMatrixCSC.fromDense([[3, 2], [1, 4]]);
        const b = new Vector([0, 0]);
        const x = A.solve(b);
        expectVecCloseTo(x, [0, 0]);
    });

    test('190. solve preserves BigFloat accuracy for ill-conditioned sparse systems', () => {
        const A = SparseMatrixCSC.fromDense([[0.0001, 1.0],
            [1.0,    1.0]
        ]);
        const b = new Vector([1.0, 2.0]);
        const x = A.solve(b);
        // Solution should be approximately [1.0001, 0.9999]
        // Exact: x = 1 / 0.9999, y = (0.9998) / 0.9999
        // Just verify A * x = b
        const check = A.mulVec(x);
        expectVecCloseTo(check,[1.0, 2.0]);
    });

    // ==========================================
    // 21. det() Tests (Tests 191 - 200)
    // ==========================================

    test('191. det computes determinant of identity matrix as 1', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        expectBFCloseTo(A.det(), bf(1), 20);
    });

    test('192. det computes determinant of basic 2x2 matrix', () => {
        const A = SparseMatrixCSC.fromDense([[4, 3],
            [6, 3]
        ]);
        // 4*3 - 3*6 = 12 - 18 = -6
        expectBFCloseTo(A.det(), bf(-6), 20);
    });

    test('193. det computes determinant of 3x3 matrix', () => {
        const A = SparseMatrixCSC.fromDense([[2, -1, 0],
            [-1, 2, -1],[0, -1, 2]
        ]);
        // det = 4
        expectBFCloseTo(A.det(), bf(4), 20);
    });

    test('194. det computes determinant of diagonal matrix', () => {
        const A = SparseMatrixCSC.fromDense([[5, 0, 0],[0, 2, 0], [0, 0, 3]]);
        // 5 * 2 * 3 = 30
        expectBFCloseTo(A.det(), bf(30), 20);
    });

    test('195. det throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2]]);
        expect(() => A.det()).toThrow("Square matrix required for determinant.");
    });

    test('196. det throws zero pivot error for singular matrices (due to pivoting constraints)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 2],
            [2, 4]
        ]);
        expect(() => A.det()).toThrow(/Zero pivot encountered/);
    });

    test('197. det correctly computes negative determinants without precision loss', () => {
        const A = SparseMatrixCSC.fromDense([[1, 5],
            [5, 1]
        ]);
        // 1 - 25 = -24
        expectBFCloseTo(A.det(), bf(-24), 20);
    });

    test('198. det computes determinant of an upper triangular matrix (product of diagonals)', () => {
        const A = SparseMatrixCSC.fromDense([[2, 9, 4],
            [0, 3, 5],
            [0, 0, 4]
        ]);
        // 2 * 3 * 4 = 24
        expectBFCloseTo(A.det(), bf(24), 20);
    });

    test('199. det preserves high precision computations with BigFloat', () => {
        const A = SparseMatrixCSC.fromDense([["0.1", "0.2"],
            ["0.3", "0.4"]
        ]);
        // 0.04 - 0.06 = -0.02
        expectBFCloseTo(A.det(), bf("-0.02"), 20);
    });

    test('200. det of a 1x1 matrix is the element itself', () => {
        const A = SparseMatrixCSC.fromDense([[-42.5]]);
        expectBFCloseTo(A.det(), bf(-42.5), 20);
    });

    // ==========================================
    // 22. logDet() Tests (Tests 201 - 210)
    // ==========================================

    test('201. logDet computes log-determinant of identity matrix as 0', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        expectBFCloseTo(A.logDet(), bf(0), 20);
    });

    test('202. logDet computes log-determinant of a diagonal matrix', () => {
        const A = SparseMatrixCSC.fromDense([[10, 0], [0, 10]]);
        // log(100) = log(10) + log(10)
        expectBFCloseTo(A.logDet(), bf(10).log().mul(2), 20);
    });

    test('203. logDet computes correctly for 2x2 matrix', () => {
        const A = SparseMatrixCSC.fromDense([
            [4, 2],
            [1, 3]
        ]);
        // det = 12 - 2 = 10, logDet = log(10)
        expectBFCloseTo(A.logDet(), bf(10).log(), 20);
    });

    test('204. logDet takes absolute value of determinant internally (handles negative det)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 5],
            [5, 1]
        ]);
        // det = -24, logDet should be log(24)
        expectBFCloseTo(A.logDet(), bf(24).log(), 20);
    });

    test('205. logDet throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4],[5, 6]]);
        expect(() => A.logDet()).toThrow("Square matrix required for logDet.");
    });

    test('206. logDet throws error for singular matrices (due to pivoting constraints)', () => {
        const A = SparseMatrixCSC.fromDense([[2, 4], [1, 2]]);
        expect(() => A.logDet()).toThrow(/Zero pivot encountered/);
    });

    test('207. logDet correctly matches log(abs(det(A))) for small matrices', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, -1, 0],[-1, 2, -1],
            [0, -1, 2]
        ]);
        // det = 4
        expectBFCloseTo(A.logDet(), A.det().abs().log(), 20);
    });

    test('208. logDet of a 1x1 matrix matches log(abs(val))', () => {
        const A = SparseMatrixCSC.fromDense([[-7.389056]]);
        expectBFCloseTo(A.logDet(), bf(7.389056).log(), 10);
    });

    test('209. logDet preserves BigFloat fractional precision', () => {
        const A = SparseMatrixCSC.fromDense([[0.5, 0],
            [0, 0.5]
        ]);
        // log(0.25)
        expectBFCloseTo(A.logDet(), bf(0.25).log(), 20);
    });

    test('210. logDet handles scaling correctly avoiding naive det() overflow issues logically', () => {
        // If we compute det() for a huge matrix, it might overflow.
        // BigFloat can handle huge numbers, but logDet conceptually computes via sum of logs.
        const A = SparseMatrixCSC.fromDense([[100, 0], [0, 100]]);
        const expectedLog = bf(100).log().mul(2); // 2 * log(100)
        expectBFCloseTo(A.logDet(), expectedLog, 20);
    });


    // ==========================================
    // 23. inv() Tests (Tests 211 - 220)
    // ==========================================

    test('211. inv computes exact inverse for identity matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const invA = A.inv();
        expectMatCloseTo(invA, [[1, 0], [0, 1]]);
    });

    test('212. inv computes correct inverse for a 2x2 matrix', () => {
        const A = SparseMatrixCSC.fromDense([
            [4, 7],[2, 6]
        ]);
        // det = 24 - 14 = 10
        // inv = [[0.6, -0.7], [-0.2, 0.4]]
        const invA = A.inv();
        expectMatCloseTo(invA, [["0.6", "-0.7"], ["-0.2", "0.4"]]);
    });

    test('213. inv computes correct inverse for a 3x3 diagonal matrix', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, 0, 0],
            [0, 4, 0],
            [0, 0, 5]
        ]);
        const invA = A.inv();
        expectMatCloseTo(invA, [
            ["0.5", 0, 0],[0, "0.25", 0],
            [0, 0, "0.2"]
        ]);
    });

    test('214. inv throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2, 3],[4, 5, 6]]);
        expect(() => A.inv()).toThrow("Matrix must be square to compute inverse.");
    });

    test('215. inv throws error if matrix is singular (zero pivot)', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [2, 4]]);
        expect(() => A.inv()).toThrow(/Zero pivot encountered/);
    });

    test('216. inv correctly handles negative values', () => {
        const A = SparseMatrixCSC.fromDense([
            [-1, -2],
            [ 3,  4]
        ]);
        // det = -4 - (-6) = 2
        // inv = [[2, 1],[-1.5, -0.5]]
        const invA = A.inv();
        expectMatCloseTo(invA, [[2, 1], [-1.5, -0.5]]);
    });

    test('217. inv verifies property A * inv(A) = I', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, -1, 0],[-1, 2, -1],
            [0, -1, 2]
        ]);
        const invA = A.inv();
        const I = A.mul(invA);
        expectMatCloseTo(I, [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ], 10);
    });

    test('218. inv of an upper triangular matrix is upper triangular', () => {
        const A = SparseMatrixCSC.fromDense([[2, 1], [0, 2]]);
        const invA = A.inv();
        const denseInv = invA.toDense();
        expectBFCloseTo(denseInv[1][0], bf(0), 20); // strictly upper
        expectMatCloseTo(invA, [[0.5, -0.25], [0, 0.5]]);
    });

    test('219. inv preserves BigFloat precision for fractional matrices', () => {
        const A = SparseMatrixCSC.fromDense([["0.1", "0.2"], ["0.3", "0.4"]]);
        // det = 0.04 - 0.06 = -0.02
        // inv = [[-20, 10], [15, -5]]
        const invA = A.inv();
        expectMatCloseTo(invA, [[-20, 10], [15, -5]]);
    });

    test('220. inv twice returns the original matrix: inv(inv(A)) == A', () => {
        const A = SparseMatrixCSC.fromDense([[3, 1], [5, 2]]);
        const invA = A.inv();
        const invInvA = invA.inv();
        expectMatCloseTo(invInvA, [[3, 1], [5, 2]], 10);
    });

    // ==========================================
    // 24. pinv() Tests (Tests 221 - 230)
    // ==========================================

    test('221. pinv computes pseudoinverse of a square invertible matrix (equals inv)', () => {
        const A = SparseMatrixCSC.fromDense([[4, 7], [2, 6]]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [[0.6, -0.7], [-0.2, 0.4]], 10);
    });

    test('222. pinv computes pseudoinverse of a tall matrix (full column rank)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 0],
            [0, 1],
            [0, 0]
        ]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [
            [1, 0, 0],[0, 1, 0]
        ]);
    });

    test('223. pinv computes pseudoinverse of a wide matrix (full row rank)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 0, 0],
            [0, 1, 0]
        ]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [
            [1, 0],
            [0, 1],[0, 0]
        ]);
    });

    test('224. pinv computes pseudoinverse of an Nx1 column vector', () => {
        const A = SparseMatrixCSC.fromDense([[2],[0], [0]]);
        const pInvA = A.pinv();
        // A^+ = (A^T A)^-1 A^T = (4)^-1 * [2 0 0] = [0.5 0 0]
        expectMatCloseTo(pInvA, [[0.5, 0, 0]]);
    });

    test('225. pinv computes pseudoinverse of a 1xN row vector', () => {
        const A = SparseMatrixCSC.fromDense([[0, 4, 0]]);
        const pInvA = A.pinv();
        // A^+ = A^T (A A^T)^-1 = [0 4 0]^T * (16)^-1 = [[0], [0.25], [0]]
        expectMatCloseTo(pInvA, [[0], [0.25], [0]]);
    });

    test('226. pinv verifies property A * A^+ * A = A', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4], [5, 6]]);
        const pInvA = A.pinv();
        const res = A.mul(pInvA).mul(A);
        expectMatCloseTo(res, [[1, 2], [3, 4],[5, 6]], 10);
    });

    test('227. pinv verifies property A^+ * A * A^+ = A^+', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2, 3], [4, 5, 6]]);
        const pInvA = A.pinv();
        const res = pInvA.mul(A).mul(pInvA);
        const expectedDense = pInvA.toDense();
        expectMatCloseTo(res, expectedDense, 10);
    });

    test('228. pinv throws error for tall rank-deficient matrices (Normal Equations approach limit)', () => {
        const A = SparseMatrixCSC.fromDense([[1, 1], [1, 1], [1, 1]]);
        // A^T A will be singular [[3, 3], [3, 3]]
        expect(() => A.pinv()).toThrow(/Zero pivot encountered/);
    });

    test('229. pinv handles negative values correctly', () => {
        const A = SparseMatrixCSC.fromDense([[-1, 0], [0, -2],[0, 0]]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [[-1, 0, 0],[0, -0.5, 0]]);
    });

    test('230. pinv preserves precision for fractional matrices', () => {
        const A = SparseMatrixCSC.fromDense([[0.5, 0],[0, 0.25], [0, 0]]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [[2, 0, 0],[0, 4, 0]]);
    });

    // ==========================================
    // 25. qr() Tests (Tests 231 - 240)
    // ==========================================

    test('231. qr computes exact Q and R for identity matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const { Q, R } = A.qr();
        expectMatCloseTo(Q, [[1, 0], [0, 1]]);
        expectMatCloseTo(R, [[1, 0], [0, 1]]);
    });

    test('232. qr computes Q and R for a basic 2x2 matrix', () => {
        const A = SparseMatrixCSC.fromDense([[0, 1], [1, 0]]);
        const { Q, R } = A.qr();
        expectMatCloseTo(Q, [[0, 1], [1, 0]]);
        expectMatCloseTo(R, [[1, 0], [0, 1]]);
    });

    test('233. qr verifies reconstruction A = Q * R', () => {
        const A = SparseMatrixCSC.fromDense([[12, -51,   4],
            [ 6, 167, -68],[-4,  24, -41]
        ]);
        const { Q, R } = A.qr();
        const QR = Q.mul(R);
        expectMatCloseTo(QR, [[12, -51,   4],
            [ 6, 167, -68],
            [-4,  24, -41]
        ], 10);
    });

    test('234. qr verifies Q is orthogonal (Q^T * Q = I)', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, 3],[1, 4],
            [5, 2]
        ]);
        const { Q } = A.qr();
        const QtQ = Q.transpose().mul(Q);
        expectMatCloseTo(QtQ, [[1, 0], [0, 1]], 10);
    });

    test('235. qr handles tall rectangular matrix (m > n)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, -1],
            [1,  0],[1,  1]
        ]);
        const { Q, R } = A.qr();
        expect(Q.rows).toBe(3);
        expect(Q.cols).toBe(2);
        expect(R.rows).toBe(2);
        expect(R.cols).toBe(2);
        const QR = Q.mul(R);
        expectMatCloseTo(QR, [[1, -1],[1, 0], [1, 1]], 10);
    });

    test('236. qr ensures R matrix is strictly upper triangular', () => {
        const A = SparseMatrixCSC.fromDense([[4, 3], [3, 2]]);
        const { R } = A.qr();
        const rDense = R.toDense();
        expectBFCloseTo(rDense[1][0], bf(0), 20); // Bottom left must be 0
    });

    test('237. qr handles linearly dependent columns gracefully (R diagonal is 0)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 2],
            [2, 4]
        ]);
        const { Q, R } = A.qr();
        const QR = Q.mul(R);
        expectMatCloseTo(QR, [[1, 2], [2, 4]], 10);
        
        // Due to linear dependence, the second diagonal of R should be 0
        const rDense = R.toDense();
        expectBFCloseTo(rDense[1][1], bf(0), 10);
    });

    // ==========================================
    // 23. inv() Tests (Tests 211 - 220)
    // ==========================================

    test('211. inv computes exact inverse for identity matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const invA = A.inv();
        expectMatCloseTo(invA, [[1, 0], [0, 1]]);
    });

    test('212. inv computes correct inverse for a 2x2 matrix', () => {
        const A = SparseMatrixCSC.fromDense([
            [4, 7],[2, 6]
        ]);
        // det = 24 - 14 = 10
        // inv = [[0.6, -0.7], [-0.2, 0.4]]
        const invA = A.inv();
        expectMatCloseTo(invA, [["0.6", "-0.7"], ["-0.2", "0.4"]]);
    });

    test('213. inv computes correct inverse for a 3x3 diagonal matrix', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, 0, 0],
            [0, 4, 0],
            [0, 0, 5]
        ]);
        const invA = A.inv();
        expectMatCloseTo(invA, [
            ["0.5", 0, 0],[0, "0.25", 0],
            [0, 0, "0.2"]
        ]);
    });

    test('214. inv throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2, 3],[4, 5, 6]]);
        expect(() => A.inv()).toThrow("Matrix must be square to compute inverse.");
    });

    test('215. inv throws error if matrix is singular (zero pivot)', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [2, 4]]);
        expect(() => A.inv()).toThrow(/Zero pivot encountered/);
    });

    test('216. inv correctly handles negative values', () => {
        const A = SparseMatrixCSC.fromDense([
            [-1, -2],
            [ 3,  4]
        ]);
        // det = -4 - (-6) = 2
        // inv = [[2, 1],[-1.5, -0.5]]
        const invA = A.inv();
        expectMatCloseTo(invA, [[2, 1], [-1.5, -0.5]]);
    });

    test('217. inv verifies property A * inv(A) = I', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, -1, 0],[-1, 2, -1],
            [0, -1, 2]
        ]);
        const invA = A.inv();
        const I = A.mul(invA);
        expectMatCloseTo(I, [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ], 10);
    });

    test('218. inv of an upper triangular matrix is upper triangular', () => {
        const A = SparseMatrixCSC.fromDense([[2, 1], [0, 2]]);
        const invA = A.inv();
        const denseInv = invA.toDense();
        expectBFCloseTo(denseInv[1][0], bf(0), 20); // strictly upper
        expectMatCloseTo(invA, [[0.5, -0.25], [0, 0.5]]);
    });

    test('219. inv preserves BigFloat precision for fractional matrices', () => {
        const A = SparseMatrixCSC.fromDense([["0.1", "0.2"], ["0.3", "0.4"]]);
        // det = 0.04 - 0.06 = -0.02
        // inv = [[-20, 10], [15, -5]]
        const invA = A.inv();
        expectMatCloseTo(invA, [[-20, 10], [15, -5]]);
    });

    test('220. inv twice returns the original matrix: inv(inv(A)) == A', () => {
        const A = SparseMatrixCSC.fromDense([[3, 1], [5, 2]]);
        const invA = A.inv();
        const invInvA = invA.inv();
        expectMatCloseTo(invInvA, [[3, 1], [5, 2]], 10);
    });

    // ==========================================
    // 24. pinv() Tests (Tests 221 - 230)
    // ==========================================

    test('221. pinv computes pseudoinverse of a square invertible matrix (equals inv)', () => {
        const A = SparseMatrixCSC.fromDense([[4, 7], [2, 6]]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [[0.6, -0.7], [-0.2, 0.4]], 10);
    });

    test('222. pinv computes pseudoinverse of a tall matrix (full column rank)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 0],
            [0, 1],
            [0, 0]
        ]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [
            [1, 0, 0],[0, 1, 0]
        ]);
    });

    test('223. pinv computes pseudoinverse of a wide matrix (full row rank)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 0, 0],
            [0, 1, 0]
        ]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [
            [1, 0],
            [0, 1],[0, 0]
        ]);
    });

    test('224. pinv computes pseudoinverse of an Nx1 column vector', () => {
        const A = SparseMatrixCSC.fromDense([[2],[0], [0]]);
        const pInvA = A.pinv();
        // A^+ = (A^T A)^-1 A^T = (4)^-1 * [2 0 0] = [0.5 0 0]
        expectMatCloseTo(pInvA, [[0.5, 0, 0]]);
    });

    test('225. pinv computes pseudoinverse of a 1xN row vector', () => {
        const A = SparseMatrixCSC.fromDense([[0, 4, 0]]);
        const pInvA = A.pinv();
        // A^+ = A^T (A A^T)^-1 = [0 4 0]^T * (16)^-1 = [[0], [0.25], [0]]
        expectMatCloseTo(pInvA, [[0], [0.25], [0]]);
    });

    test('226. pinv verifies property A * A^+ * A = A', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4], [5, 6]]);
        const pInvA = A.pinv();
        const res = A.mul(pInvA).mul(A);
        expectMatCloseTo(res, [[1, 2], [3, 4],[5, 6]], 10);
    });

    test('227. pinv verifies property A^+ * A * A^+ = A^+', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2, 3], [4, 5, 6]]);
        const pInvA = A.pinv();
        const res = pInvA.mul(A).mul(pInvA);
        const expectedDense = pInvA.toDense();
        expectMatCloseTo(res, expectedDense, 10);
    });

    test('228. pinv throws error for tall rank-deficient matrices (Normal Equations approach limit)', () => {
        const A = SparseMatrixCSC.fromDense([[1, 1], [1, 1], [1, 1]]);
        // A^T A will be singular [[3, 3], [3, 3]]
        expect(() => A.pinv()).toThrow(/Zero pivot encountered/);
    });

    test('229. pinv handles negative values correctly', () => {
        const A = SparseMatrixCSC.fromDense([[-1, 0], [0, -2],[0, 0]]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [[-1, 0, 0],[0, -0.5, 0]]);
    });

    test('230. pinv preserves precision for fractional matrices', () => {
        const A = SparseMatrixCSC.fromDense([[0.5, 0],[0, 0.25], [0, 0]]);
        const pInvA = A.pinv();
        expectMatCloseTo(pInvA, [[2, 0, 0],[0, 4, 0]]);
    });

    // ==========================================
    // 25. qr() Tests (Tests 231 - 240)
    // ==========================================

    test('231. qr computes exact Q and R for identity matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const { Q, R } = A.qr();
        expectMatCloseTo(Q, [[1, 0], [0, 1]]);
        expectMatCloseTo(R, [[1, 0], [0, 1]]);
    });

    test('232. qr computes Q and R for a basic 2x2 matrix', () => {
        const A = SparseMatrixCSC.fromDense([[0, 1], [1, 0]]);
        const { Q, R } = A.qr();
        expectMatCloseTo(Q, [[0, 1], [1, 0]]);
        expectMatCloseTo(R, [[1, 0], [0, 1]]);
    });

    test('233. qr verifies reconstruction A = Q * R', () => {
        const A = SparseMatrixCSC.fromDense([[12, -51,   4],
            [ 6, 167, -68],[-4,  24, -41]
        ]);
        const { Q, R } = A.qr();
        const QR = Q.mul(R);
        expectMatCloseTo(QR, [[12, -51,   4],
            [ 6, 167, -68],
            [-4,  24, -41]
        ], 10);
    });

    test('234. qr verifies Q is orthogonal (Q^T * Q = I)', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, 3],[1, 4],
            [5, 2]
        ]);
        const { Q } = A.qr();
        const QtQ = Q.transpose().mul(Q);
        expectMatCloseTo(QtQ, [[1, 0], [0, 1]], 10);
    });

    test('235. qr handles tall rectangular matrix (m > n)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, -1],
            [1,  0],[1,  1]
        ]);
        const { Q, R } = A.qr();
        expect(Q.rows).toBe(3);
        expect(Q.cols).toBe(2);
        expect(R.rows).toBe(2);
        expect(R.cols).toBe(2);
        const QR = Q.mul(R);
        expectMatCloseTo(QR, [[1, -1],[1, 0], [1, 1]], 10);
    });

    test('236. qr ensures R matrix is strictly upper triangular', () => {
        const A = SparseMatrixCSC.fromDense([[4, 3], [3, 2]]);
        const { R } = A.qr();
        const rDense = R.toDense();
        expectBFCloseTo(rDense[1][0], bf(0), 20); // Bottom left must be 0
    });

    test('237. qr handles linearly dependent columns gracefully (R diagonal is 0)', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 2],
            [2, 4]
        ]);
        const { Q, R } = A.qr();
        const QR = Q.mul(R);
        expectMatCloseTo(QR, [[1, 2], [2, 4]], 10);
        
        // Due to linear dependence, the second diagonal of R should be 0
        const rDense = R.toDense();
        expectBFCloseTo(rDense[1][1], bf(0), 10);
    });

    test('238. qr correctly processes negative values without sign errors', () => {
        const A = SparseMatrixCSC.fromDense([[-3, 4], [0, -5]]);
        const { Q, R } = A.qr();
        const QR = Q.mul(R);
        expectMatCloseTo(QR, [[-3, 4], [0, -5]], 10);
    });

    test('239. qr on a single column matrix yields normalized vector in Q and norm in R', () => {
        const A = SparseMatrixCSC.fromDense([[3], [4]]);
        const { Q, R } = A.qr();
        expectMatCloseTo(Q, [[0.6], [0.8]], 10);
        expectMatCloseTo(R, [[5]], 10);
    });

    test('240. qr preserves sparsity pattern effectively for diagonal inputs', () => {
        const A = SparseMatrixCSC.fromDense([[5, 0], [0, 9]]);
        const { Q, R } = A.qr();
        expectMatCloseTo(Q, [[1, 0], [0, 1]]);
        expectMatCloseTo(R, [[5, 0], [0, 9]]);
    });

    // ==========================================
    // 26. eigen() & svd() Tests (Tests 241 - 250)
    // ==========================================

    test('241. eigen computes dominant eigenvalue of diagonal matrix', () => {
        const A = SparseMatrixCSC.fromDense([[5, 0], [0, 2]]);
        const { eigenvalue } = A.eigen();
        expectBFCloseTo(eigenvalue, bf(5), 10);
    });

    test('242. eigen computes dominant eigenvector (A * v = lambda * v)', () => {
        const A = SparseMatrixCSC.fromDense([
            [2, 1],
            [1, 2]
        ]);
        // Eigenvalues: 3 and 1. Dominant is 3.
        const { eigenvalue, eigenvector } = A.eigen();
        expectBFCloseTo(eigenvalue, bf(3), 10);
        
        const Av = A.mulVec(eigenvector);
        const lambdaV = eigenvector.scale(eigenvalue);
        for(let i=0; i<Av.length; i++) {
            expectBFCloseTo(Av.get(i), lambdaV.get(i), 10);
        }
    });

    test('243. eigen throws error if matrix is not square', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2, 3], [4, 5, 6]]);
        expect(() => A.eigen()).toThrow("Matrix must be square for Eigenvalue computation.");
    });

    test('244. eigen stops at max iterations even if not converged strictly', () => {
        const A = SparseMatrixCSC.fromDense([[0, 1], [-1, 0]]); // Complex eigenvalues, power method won't converge
        const { eigenvalue } = A.eigen("1e-15", 5); 
        // We just ensure it runs and stops safely without infinite loop
        expect(eigenvalue).toBeDefined(); 
    });

    test('245. eigen handles matrices with negative entries', () => {
        const A = SparseMatrixCSC.fromDense([[-5, 0], [0, -2]]);
        // Absolute dominant is -5 (depending on implementation, Power Iteration targets magnitude)
        // With shift or pure Rayleigh, it finds -5 or diverges sign. Our method tracks Rayleigh.
        const { eigenvalue, eigenvector } = A.eigen("1e-10", 100);
        const Av = A.mulVec(eigenvector);
        const lambdaV = eigenvector.scale(eigenvalue);
        
        // Asserting A*v = lambda*v instead of exact value ensures numerical robustness
        for(let i=0; i<Av.length; i++) {
            expectBFCloseTo(Av.get(i), lambdaV.get(i), 10);
        }
    });

    test('246. svd computes dominant singular value for diagonal matrix', () => {
        const A = SparseMatrixCSC.fromDense([[3, 0], [0, -4]]);
        const { singularValue } = A.svd();
        // Singular values are 4 and 3. Dominant is 4.
        expectBFCloseTo(singularValue, bf(4), 10);
    });

    test('247. svd computes dominant singular value for a tall rectangular matrix', () => {
        const A = SparseMatrixCSC.fromDense([[0, 2], [0, 0], [0, 0]]);
        const { singularValue } = A.svd();
        expectBFCloseTo(singularValue, bf(2), 10);
    });

    test('248. svd computes dominant singular value for a wide rectangular matrix', () => {
        const A = SparseMatrixCSC.fromDense([[0, 0, 5], [0, 0, 0]]);
        const { singularValue } = A.svd();
        expectBFCloseTo(singularValue, bf(5), 10);
    });

    test('249. svd result validates A * v = sigma * u', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4], [5, 6]]);
        const { singularValue, u, v } = A.svd("1e-15", 1000);
        
        const Av = A.mulVec(v);
        const sigmaU = u.scale(singularValue);
        for(let i=0; i<Av.length; i++) {
            expectBFCloseTo(Av.get(i), sigmaU.get(i), 8);
        }
    });

    test('250. svd result validates A^T * u = sigma * v', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2],[3, 4]]);
        const { singularValue, u, v } = A.svd("1e-15", 1000);
        
        const At_u = A.transpose().mulVec(u);
        const sigmaV = v.scale(singularValue);
        for(let i=0; i<At_u.length; i++) {
            expectBFCloseTo(At_u.get(i), sigmaV.get(i), 8);
        }
    });
});