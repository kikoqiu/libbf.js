const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, Vector, SparseMatrixCSC } = require('../dist/bf.cjs');

describe('SparseMatrixCSC and Vector Operations Test Suite', () => {
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
    // 1. Vector Basics (Tests 1 - 10)
    // ==========================================

    test('1. Vector initializes correctly from size and array', () => {
        const v1 = new Vector(3);
        expectVecCloseTo(v1, [0, 0, 0]);

        const v2 = new Vector([1.5, 2.5, 3.5]);
        expectVecCloseTo(v2,[1.5, 2.5, 3.5]);
    });

    test('2. Vector get and set operations', () => {
        const v = new Vector(3);
        v.set(1, bf(4.2));
        expectBFCloseTo(v.get(1), bf(4.2), 20);
        expectBFCloseTo(v.get(0), bf(0), 20);
    });

    test('3. Vector addition computes correctly', () => {
        const v1 = new Vector([1, 2, 3]);
        const v2 = new Vector([4, 5, 6]);
        const res = v1.add(v2);
        expectVecCloseTo(res, [5, 7, 9]);
    });

    test('4. Vector subtraction computes correctly', () => {
        const v1 = new Vector([5, 5, 5]);
        const v2 = new Vector([1, 2, 3]);
        const res = v1.sub(v2);
        expectVecCloseTo(res, [4, 3, 2]);
    });

    test('5. Vector scalar multiplication (scale)', () => {
        const v = new Vector([1, -2, 3]);
        const res = v.scale(2.5);
        expectVecCloseTo(res, [2.5, -5, 7.5]);
    });

    test('6. Vector dot product', () => {
        const v1 = new Vector([1, 2, 3]);
        const v2 = new Vector([4, -5, 6]);
        // 1*4 + 2*(-5) + 3*6 = 4 - 10 + 18 = 12
        const dot = v1.dot(v2);
        expectBFCloseTo(dot, bf(12), 20);
    });

    test('7. Vector L2 norm', () => {
        const v = new Vector([3, 4]); // 3^2 + 4^2 = 25 -> sqrt = 5
        expectBFCloseTo(v.norm(), bf(5), 20);
    });

    test('8. Vector dimension mismatch throws error on add', () => {
        const v1 = new Vector([1, 2]);
        const v2 = new Vector([1, 2, 3]);
        expect(() => v1.add(v2)).toThrow();
    });

    test('9. Vector clone creates an independent copy', () => {
        const v1 = new Vector([1, 2, 3]);
        const v2 = v1.clone();
        v2.set(0, 99);
        expectBFCloseTo(v1.get(0), bf(1), 20); // Original intact
        expectBFCloseTo(v2.get(0), bf(99), 20);
    });

    test('10. Vector toArray conversion', () => {
        const v = new Vector([1, 2]);
        const arr = v.toArray();
        expect(Array.isArray(arr)).toBe(true);
        expect(arr[0].equals(bf(1))).toBe(true);
    });

    // ==========================================
    // 2. SparseMatrixCSC Init & Basics (Tests 11 - 17)
    // ==========================================

    test('11. SparseMatrix fromCOO aggregates duplicates correctly', () => {
        const rows = [0, 0, 1];
        const cols = [0, 0, 1];
        const vals =[2, 3, 4]; // (0,0) will be 2+3=5
        const mat = SparseMatrixCSC.fromCOO(2, 2, rows, cols, vals);
        
        expectMatCloseTo(mat, [
            [5, 0],
            [0, 4]
        ]);
        expect(mat.nnz).toBe(2);
    });

    test('12. SparseMatrix fromDense builds correct sparse structure', () => {
        const dense = [
            [1, 0, 2],
            [0, 3, 0],
            [4, 0, 5]
        ];
        const mat = SparseMatrixCSC.fromDense(dense);
        expect(mat.nnz).toBe(5);
        expectBFCloseTo(mat.get(2, 2), bf(5), 20);
    });

    test('13. SparseMatrix toDense exports correct 2D array', () => {
        const dense = [[1, 2], [3, 4]];
        const mat = SparseMatrixCSC.fromDense(dense);
        const out = mat.toDense();
        expectBFCloseTo(out[1][0], bf(3), 20); // row 1, col 0
    });

    test('14. SparseMatrix get() retrieves via binary search', () => {
        const mat = SparseMatrixCSC.fromDense([[0, 0, 1], [0, 2, 0]]);
        expectBFCloseTo(mat.get(0, 2), bf(1), 20);
        expectBFCloseTo(mat.get(1, 1), bf(2), 20);
        expectBFCloseTo(mat.get(0, 0), bf(0), 20); // Empty value
    });

    test('15. SparseMatrix set() modifies and structurally inserts', () => {
        const mat = SparseMatrixCSC.fromDense([[1, 0], [0, 0]]);
        mat.set(0, 0, 9); // Modify existing
        mat.set(1, 1, 5); // Insert structural new
        expectMatCloseTo(mat, [[9, 0], [0, 5]]);
    });

    test('16. SparseMatrix transpose flips rows and cols', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2, 3],
            [4, 5, 6]
        ]);
        const T = mat.transpose();
        expect(T.rows).toBe(3);
        expect(T.cols).toBe(2);
        expectMatCloseTo(T, [[1, 4],
            [2, 5],
            [3, 6]
        ]);
    });

    test('17. SparseMatrix prune removes explicit zeros', () => {
        const mat = SparseMatrixCSC.fromDense([[1, 0], [0, 2]]);
        mat.set(0, 0, 0); // Inject explicit zero into structure
        mat.prune();
        expect(mat.nnz).toBe(1); // Only the `2` should remain
        expectBFCloseTo(mat.get(0, 0), bf(0), 20);
    });

    // ==========================================
    // 3. SparseMatrixCSC Arithmetic (Tests 18 - 24)
    // ==========================================

    test('18. Matrix addition (A + B) with same sparsity pattern', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 2]]);
        const B = SparseMatrixCSC.fromDense([[3, 0], [0, 4]]);
        const C = A.add(B);
        expectMatCloseTo(C, [[4, 0], [0, 6]]);
    });

    test('19. Matrix addition (A + B) merges different sparsity patterns', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [0, 0]]);
        const B = SparseMatrixCSC.fromDense([[0, 3], [4, 0]]);
        const C = A.add(B);
        expectMatCloseTo(C, [[1, 5], [4, 0]]);
    });

    test('20. Matrix subtraction (A - B)', () => {
        const A = SparseMatrixCSC.fromDense([[5, 0], [0, 5]]);
        const B = SparseMatrixCSC.fromDense([[2, 0], [0, 3]]);
        const C = A.sub(B);
        expectMatCloseTo(C, [[3, 0], [0, 2]]);
    });

    test('21. Matrix subtraction self (A - A = 0) prunes structurally', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4]]);
        const C = A.sub(A);
        expect(C.nnz).toBe(0); // Two-pointer merge skips exact zeros
        expectMatCloseTo(C, [[0, 0],[0, 0]]);
    });

    test('22. Matrix multiplication by Identity (A * I = A)', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4]]);
        const I = SparseMatrixCSC.fromDense([[1, 0], [0, 1]]);
        const C = A.mul(I);
        expectMatCloseTo(C, [[1, 2], [3, 4]]);
    });

    test('23. Matrix multiplication general case (Gustavson SpGEMM)', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0, 2],
            [0, 3, 0]
        ]); // 2x3
        const B = SparseMatrixCSC.fromDense([
            [1, 2],[0, 1],
            [4, 0]
        ]); // 3x2
        
        // C = A * B
        //[1*1+2*4, 1*2+2*0] -> [9, 2]
        // [3*0,     3*1]     ->[0, 3]
        const C = A.mul(B);
        expect(C.rows).toBe(2);
        expect(C.cols).toBe(2);
        expectMatCloseTo(C, [
            [9, 2],
            [0, 3]
        ]);
    });

    test('24. Matrix multiplication incompatible dimensions throws', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2]]);
        const B = SparseMatrixCSC.fromDense([[1, 2]]);
        expect(() => A.mul(B)).toThrow(); // cols(2) != rows(1)
    });

    // ==========================================
    // 4. Matrix-Vector & Complex Interactions (Tests 25 - 30)
    // ==========================================

    test('25. Matrix-Vector multiplication (SpMV) with Vector class', () => {
        const A = SparseMatrixCSC.fromDense([[1, -1],
            [2,  3]
        ]);
        const x = new Vector([2, 1]);
        const y = A.mulVec(x);
        // y =[ (1*2 - 1*1), (2*2 + 3*1) ] = [1, 7]
        expectVecCloseTo(y, [1, 7]);
    });

    test('26. Matrix-Vector multiplication (SpMV) with Array', () => {
        const A = SparseMatrixCSC.fromDense([
            [0, 2, 0],
            [1, 0, 3]
        ]);
        const y = A.mulVec([1, 2, 1]);
        // y =[ 2*2, 1*1 + 3*1 ] = [4, 4]
        expectVecCloseTo(y, [4, 4]);
    });

    test('27. SpMV skips zero vector elements optimally', () => {
        const A = SparseMatrixCSC.fromDense([[1, 999], [2, 999]]);
        // By multiplying with 0 on the dense column, those 999s shouldn't matter
        const y = A.mulVec([5, 0]);
        expectVecCloseTo(y, [5, 10]);
    });

    test('28. SpMV incompatible dimensions throws error', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2]]); // 1x2
        expect(() => A.mulVec([1])).toThrow(); // Vec length 1 != Cols 2
    });

    test('29. Associative property A * (B * v) == (A * B) * v', () => {
        const A = SparseMatrixCSC.fromDense([
            [1, 0],
            [2, 1]
        ]);
        const B = SparseMatrixCSC.fromDense([
            [0, -1],
            [1,  2]
        ]);
        const v = new Vector([1, 2]);

        // Left path: A * (B * v)
        const Bv = B.mulVec(v);
        const y1 = A.mulVec(Bv);

        // Right path: (A * B) * v
        const AB = A.mul(B);
        const y2 = AB.mulVec(v);

        // Verify equality
        for (let i = 0; i < y1.length; i++) {
            expect(y1.get(i).equals(y2.get(i))).toBe(true);
        }
    });

    test('30. Deep Clone Matrix modifies safely', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0], [0, 2]]);
        const B = A.clone();
        
        B.set(0, 0, 99);
        // Ensure A is untouched
        expectBFCloseTo(A.get(0, 0), bf(1), 20);
        expectBFCloseTo(B.get(0, 0), bf(99), 20);
    });


    // ==========================================
    // 5. getDiagonal() Tests (Tests 31 - 40)
    // ==========================================

    test('31. getDiagonal extracts fully populated diagonal from square matrix', () => {
        const mat = SparseMatrixCSC.fromDense([[1, 2, 3],
            [4, 5, 6],[7, 8, 9]
        ]);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag, [1, 5, 9]);
    });

    test('32. getDiagonal extracts correctly when some diagonal elements are zero', () => {
        const mat = SparseMatrixCSC.fromDense([[1, 2, 0],
            [3, 0, 4],[0, 5, 6]
        ]);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag,[1, 0, 6]);
    });

    test('33. getDiagonal returns all zeros for an empty matrix', () => {
        const mat = SparseMatrixCSC.fromDense([[0, 0],
            [0, 0]
        ]);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag, [0, 0]);
    });

    test('34. getDiagonal handles rectangular matrices (rows > cols)', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2],
            [3, 4],[5, 6]
        ]);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag, [1, 4]); // min(3, 2) = 2 elements
    });

    test('35. getDiagonal handles rectangular matrices (cols > rows)', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2, 3],[4, 5, 6]
        ]);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag,[1, 5]); // min(2, 3) = 2 elements
    });

    test('36. getDiagonal returns all zeros for an off-diagonal-only matrix', () => {
        const mat = SparseMatrixCSC.fromDense([
            [0, 1, 2],[3, 0, 4],
            [5, 6, 0]
        ]);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag, [0, 0, 0]);
    });

    test('37. getDiagonal extracts from a 1x1 matrix', () => {
        const mat = SparseMatrixCSC.fromDense([[42]]);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag, [42]);
    });

    test('38. getDiagonal handles negative values correctly', () => {
        const mat = SparseMatrixCSC.fromDense([
            [-1, 2],[3, -4]
        ]);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag,[-1, -4]);
    });

    test('39. getDiagonal preserves BigFloat floating point precision', () => {
        const mat = SparseMatrixCSC.fromDense([[1.123456789, 0],[0, 9.87654321]
        ]);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag,[1.123456789, 9.87654321]);
    });

    test('40. getDiagonal reflects structural modifications via set()', () => {
        const mat = SparseMatrixCSC.fromDense([
            [0, 2],
            [3, 0]
        ]);
        mat.set(0, 0, 99);
        mat.set(1, 1, 88);
        const diag = mat.getDiagonal();
        expectVecCloseTo(diag, [99, 88]);
    });

    // ==========================================
    // 6. trace() Tests (Tests 41 - 50)
    // ==========================================

    test('41. trace computes sum of diagonal for square matrix', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ]);
        expectBFCloseTo(mat.trace(), bf(15), 20); // 1 + 5 + 9 = 15
    });

    test('42. trace properly cancels out negative diagonal elements', () => {
        const mat = SparseMatrixCSC.fromDense([
            [10, 2],
            [3, -10]
        ]);
        expectBFCloseTo(mat.trace(), bf(0), 20); // 10 + (-10) = 0
    });

    test('43. trace of an identity matrix equals its dimension', () => {
        const mat = SparseMatrixCSC.fromDense([[1, 0, 0],
            [0, 1, 0],[0, 0, 1]
        ]);
        expectBFCloseTo(mat.trace(), bf(3), 20);
    });

    test('44. trace of an empty matrix is zero', () => {
        const mat = SparseMatrixCSC.fromDense([
            [0, 0],[0, 0]
        ]);
        expectBFCloseTo(mat.trace(), bf(0), 20);
    });

    test('45. trace of an off-diagonal-only matrix is zero', () => {
        const mat = SparseMatrixCSC.fromDense([
            [0, 1, 2],
            [3, 0, 4],
            [5, 6, 0]
        ]);
        expectBFCloseTo(mat.trace(), bf(0), 20);
    });

    test('46. trace of rectangular matrix (rows > cols) computes up to min dimension', () => {
        const mat = SparseMatrixCSC.fromDense([
            [2, 0],
            [0, 3],[0, 0]
        ]);
        expectBFCloseTo(mat.trace(), bf(5), 20); // 2 + 3
    });

    test('47. trace of rectangular matrix (cols > rows) computes up to min dimension', () => {
        const mat = SparseMatrixCSC.fromDense([
            [4, 0, 0],
            [0, 5, 0]
        ]);
        expectBFCloseTo(mat.trace(), bf(9), 20); // 4 + 5
    });

    test('48. trace of a 1x1 matrix equals its single element', () => {
        const mat = SparseMatrixCSC.fromDense([[-42.5]]);
        expectBFCloseTo(mat.trace(), bf(-42.5), 20);
    });

    test('49. trace preserves high precision in addition', () => {
        const mat = SparseMatrixCSC.fromDense([
            ["1.5555555555", 0],[0, "2.4444444445"]
        ]);
        expectBFCloseTo(mat.trace(), bf(4.0), 20); // 1.5555555555 + 2.4444444445 = 4.0
    });

    test('50. trace is unaffected by modifying off-diagonal elements', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 0],
            [0, 2]
        ]);
        mat.set(0, 1, 999);
        mat.set(1, 0, 888);
        expectBFCloseTo(mat.trace(), bf(3), 20); // Still 1 + 2 = 3
    });

    // ==========================================
    // 7. norm1() Tests (Tests 51 - 60)
    // ==========================================

    test('51. norm1 computes maximum absolute column sum (basic)', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 5],
            [2, 3]
        ]);
        // Col 0: 1+2=3, Col 1: 5+3=8. Max is 8.
        expectBFCloseTo(mat.norm1(), bf(8), 20);
    });

    test('52. norm1 uses absolute values for negative elements', () => {
        const mat = SparseMatrixCSC.fromDense([
            [-5, -1],
            [-2, -8]
        ]);
        // Col 0: |-5| + |-2| = 7. Col 1: |-1| + |-8| = 9. Max is 9.
        expectBFCloseTo(mat.norm1(), bf(9), 20);
    });

    test('53. norm1 of an empty matrix is zero', () => {
        const mat = SparseMatrixCSC.fromDense([[0, 0, 0],
            [0, 0, 0]
        ]);
        expectBFCloseTo(mat.norm1(), bf(0), 20);
    });

    test('54. norm1 finds max correctly when first column is the largest', () => {
        const mat = SparseMatrixCSC.fromDense([
            [10, 1, 1],[10, 2, 2]
        ]);
        // Col 0: 20, Col 1: 3, Col 2: 3. Max is 20.
        expectBFCloseTo(mat.norm1(), bf(20), 20);
    });

    test('55. norm1 finds max correctly when last column is the largest', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2, 10],
            [1, 2, 10]
        ]);
        // Col 0: 2, Col 1: 4, Col 2: 20. Max is 20.
        expectBFCloseTo(mat.norm1(), bf(20), 20);
    });

    test('56. norm1 handles rectangular matrices (rows > cols)', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2],
            [3, 4],
            [5, 6]
        ]);
        // Col 0: 1+3+5=9. Col 1: 2+4+6=12. Max is 12.
        expectBFCloseTo(mat.norm1(), bf(12), 20);
    });

    test('57. norm1 handles rectangular matrices (cols > rows)', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 5, 2],
            [2, 6, 3]
        ]);
        // Col 0: 3, Col 1: 11, Col 2: 5. Max is 11.
        expectBFCloseTo(mat.norm1(), bf(11), 20);
    });

    test('58. norm1 of a 1x1 matrix is the absolute value of the element', () => {
        const mat = SparseMatrixCSC.fromDense([[-99.9]]);
        expectBFCloseTo(mat.norm1(), bf(99.9), 20);
    });

    test('59. norm1 preserves BigFloat precision on column sums', () => {
        const mat = SparseMatrixCSC.fromDense([
            ["0.1", "0.2"],["0.2", "0.4"]
        ]);
        // Col 0: 0.3, Col 1: 0.6. Max is 0.6.
        expectBFCloseTo(mat.norm1(), bf("0.6"), 20);
    });

    test('60. norm1 is unaffected by structural explicit zeros', () => {
        const mat = SparseMatrixCSC.fromDense([[1, 2],
            [3, 4]
        ]);
        mat.set(0, 0, 0); // Inject explicit zero into col 0
        // Col 0 is now: 0 + 3 = 3. Col 1 is: 2 + 4 = 6. Max is 6.
        expectBFCloseTo(mat.norm1(), bf(6), 20);
    });




    // ==========================================
    // 8. normInf() Tests (Tests 61 - 70)
    // ==========================================

    test('61. normInf computes maximum absolute row sum (basic)', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2],
            [3, 4]
        ]);
        // Row 0: 1+2=3. Row 1: 3+4=7. Max is 7.
        expectBFCloseTo(mat.normInf(), bf(7), 20);
    });

    test('62. normInf uses absolute values for negative elements', () => {
        const mat = SparseMatrixCSC.fromDense([
            [-5, -2],
            [-1, -8]
        ]);
        // Row 0: |-5|+|-2|=7. Row 1: |-1|+|-8|=9. Max is 9.
        expectBFCloseTo(mat.normInf(), bf(9), 20);
    });

    test('63. normInf of an empty matrix is zero', () => {
        const mat = SparseMatrixCSC.fromDense([[0, 0],
            [0, 0]
        ]);
        expectBFCloseTo(mat.normInf(), bf(0), 20);
    });

    test('64. normInf finds max correctly when first row is the largest', () => {
        const mat = SparseMatrixCSC.fromDense([
            [10, 10],
            [1, 2],[1, 2]
        ]);
        // Row 0: 20, Row 1: 3, Row 2: 3. Max is 20.
        expectBFCloseTo(mat.normInf(), bf(20), 20);
    });

    test('65. normInf finds max correctly when last row is the largest', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2],
            [1, 2],
            [10, 10]
        ]);
        // Row 0: 3, Row 1: 3, Row 2: 20. Max is 20.
        expectBFCloseTo(mat.normInf(), bf(20), 20);
    });

    test('66. normInf handles rectangular matrices (rows > cols)', () => {
        const mat = SparseMatrixCSC.fromDense([[1, 5],
            [2, 6],
            [3, 2]
        ]);
        // Row sums: 6, 8, 5. Max is 8.
        expectBFCloseTo(mat.normInf(), bf(8), 20);
    });

    test('67. normInf handles rectangular matrices (cols > rows)', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2, 3],
            [4, 5, 6]
        ]);
        // Row sums: 6, 15. Max is 15.
        expectBFCloseTo(mat.normInf(), bf(15), 20);
    });

    test('68. normInf of a 1x1 matrix is the absolute value of the element', () => {
        const mat = SparseMatrixCSC.fromDense([["-77.7"]]);
        expectBFCloseTo(mat.normInf(), bf("77.7"), 20);
    });

    test('69. normInf preserves BigFloat precision on row sums', () => {
        const mat = SparseMatrixCSC.fromDense([
            ["0.1", "0.2"],["0.2","0.4"]
        ]);
        // Row sums: 0.3, 0.6. Max is 0.6.
        expectBFCloseTo(mat.normInf(), bf("0.6"), 20);
    });

    test('70. normInf is unaffected by structural explicit zeros', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 2],[3, 4]
        ]);
        mat.set(1, 0, 0); // Inject explicit zero into row 1
        // Row 0: 1+2=3. Row 1: 0+4=4. Max is 4.
        expectBFCloseTo(mat.normInf(), bf(4), 20);
    });

    // ==========================================
    // 9. normF() Tests (Tests 71 - 80)
    // ==========================================

    test('71. normF computes Frobenius norm correctly for basic matrices', () => {
        const mat = SparseMatrixCSC.fromDense([
            [3, 0],
            [0, 4]
        ]);
        // sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5
        expectBFCloseTo(mat.normF(), bf(5), 20);
    });

    test('72. normF computes correctly with negative elements', () => {
        const mat = SparseMatrixCSC.fromDense([
            [-3, 0],
            [0, -4]
        ]);
        // sqrt((-3)^2 + (-4)^2) = 5
        expectBFCloseTo(mat.normF(), bf(5), 20);
    });

    test('73. normF of an empty matrix is zero', () => {
        const mat = SparseMatrixCSC.fromDense([[0, 0],
            [0, 0]
        ]);
        expectBFCloseTo(mat.normF(), bf(0), 20);
    });

    test('74. normF of an identity matrix is the square root of dimension', () => {
        const mat = SparseMatrixCSC.fromDense([
            [1, 0, 0],
            [0, 1, 0],[0, 0, 1]
        ]);
        // sqrt(1^2 + 1^2 + 1^2) = sqrt(3)
        expectBFCloseTo(mat.normF(), bf(3).sqrt(), 20);
    });

    test('75. normF handles rectangular matrices (rows > cols)', () => {
        const mat = SparseMatrixCSC.fromDense([[1, 1],
            [1, 1],
            [1, 1]
        ]);
        // sqrt(6 * 1^2) = sqrt(6)
        expectBFCloseTo(mat.normF(), bf(6).sqrt(), 20);
    });

    test('76. normF handles rectangular matrices (cols > rows)', () => {
        const mat = SparseMatrixCSC.fromDense([
            [2, 2, 2],
            [2, 2, 2]
        ]);
        // 6 elements of 2 => sqrt(6 * 4) = sqrt(24)
        expectBFCloseTo(mat.normF(), bf(24).sqrt(), 20);
    });

    test('77. normF of a 1x1 matrix is the absolute value of its element', () => {
        const mat = SparseMatrixCSC.fromDense([[-12.34]]);
        expectBFCloseTo(mat.normF(), bf(12.34), 20);
    });

    test('78. normF preserves high precision for fractional elements', () => {
        const mat = SparseMatrixCSC.fromDense([
            ["0.1", "0.2"]
        ]);
        // sqrt(0.01 + 0.04) = sqrt(0.05)
        expectBFCloseTo(mat.normF(), bf("0.05").sqrt(), 20);
    });

    test('79. normF scales correctly for large numbers (avoids naive overflow issues if BigFloat handles it)', () => {
        const mat = SparseMatrixCSC.fromDense([
            [3000, 0],[0, 4000]
        ]);
        // sqrt(9,000,000 + 16,000,000) = sqrt(25,000,000) = 5000
        expectBFCloseTo(mat.normF(), bf(5000), 20);
    });

    test('80. normF ignores explicit structural zeros', () => {
        const mat = SparseMatrixCSC.fromDense([[3, 4]]);
        mat.set(0, 1, 0); // Change the '4' to an explicit structural zero
        // Remaining matrix is effectively [[3, 0]], normF = 3
        expectBFCloseTo(mat.normF(), bf(3), 20);
    });

    // ==========================================
    // 10. solveLowerTriangular() Tests (Tests 81 - 90)
    // ==========================================

    test('81. solveLowerTriangular solves identity matrix system (x = b)', () => {
        const L = SparseMatrixCSC.fromDense([
            [1, 0],[0, 1]
        ]);
        const b = new Vector([3.5, 4.2]);
        const x = L.solveLowerTriangular(b);
        expectVecCloseTo(x,[3.5, 4.2]);
    });

    test('82. solveLowerTriangular solves basic 2x2 lower triangular system', () => {
        const L = SparseMatrixCSC.fromDense([[2, 0],
            [1, 2]
        ]);
        const b = new Vector([4, 4]);
        // 2*x0 = 4 => x0 = 2
        // 1*x0 + 2*x1 = 4 => 2 + 2*x1 = 4 => x1 = 1
        const x = L.solveLowerTriangular(b);
        expectVecCloseTo(x, [2, 1]);
    });

    test('83. solveLowerTriangular solves 3x3 lower triangular system', () => {
        const L = SparseMatrixCSC.fromDense([
            [1, 0, 0],
            [2, 3, 0],
            [4, 5, 6]
        ]);
        const b = new Vector([1, 8, 32]);
        // x0 = 1
        // 2*1 + 3*x1 = 8 => x1 = 2
        // 4*1 + 5*2 + 6*x2 = 32 => 14 + 6*x2 = 32 => x2 = 3
        const x = L.solveLowerTriangular(b);
        expectVecCloseTo(x, [1, 2, 3]);
    });

    test('84. solveLowerTriangular throws error if matrix is not square', () => {
        const L = SparseMatrixCSC.fromDense([
            [1, 0],
            [2, 3],
            [4, 5]
        ]);
        const b = new Vector([1, 2]);
        expect(() => L.solveLowerTriangular(b)).toThrow("Matrix must be square.");
    });

    test('85. solveLowerTriangular throws error on dimension mismatch with RHS', () => {
        const L = SparseMatrixCSC.fromDense([
            [1, 0],
            [2, 3]
        ]);
        const b = new Vector([1, 2, 3]); // b has length 3, L is 2x2
        expect(() => L.solveLowerTriangular(b)).toThrow("Dimension mismatch.");
    });

    test('86. solveLowerTriangular throws error for singular matrix (zero on diagonal)', () => {
        const L = SparseMatrixCSC.fromDense([
            [0, 0],[1, 2]
        ]);
        const b = new Vector([4, 4]);
        expect(() => L.solveLowerTriangular(b)).toThrow(/Singular matrix/);
    });

    test('87. solveLowerTriangular supports pure Arrays as RHS input', () => {
        const L = SparseMatrixCSC.fromDense([
            [2, 0],
            [1, 2]
        ]);
        const x = L.solveLowerTriangular([4, 4]); // Passing raw array
        expectVecCloseTo(x, [2, 1]);
    });

    test('88. solveLowerTriangular works correctly with negative values', () => {
        const L = SparseMatrixCSC.fromDense([[-2, 0],
            [ 3, -4]
        ]);
        const b = new Vector([6, -1]);
        // -2*x0 = 6 => x0 = -3
        // 3*(-3) - 4*x1 = -1 => -9 - 4*x1 = -1 => -4*x1 = 8 => x1 = -2
        const x = L.solveLowerTriangular(b);
        expectVecCloseTo(x, [-3, -2]);
    });

    test('89. solveLowerTriangular solves highly sparse matrices efficiently', () => {
        const L = SparseMatrixCSC.fromDense([
            [2, 0, 0],
            [0, 2, 0], // Missed off-diagonal dependency between x1 and x0
            [1, 0, 2]
        ]);
        const b = new Vector([4, 4, 6]);
        // x0 = 2
        // 2*x1 = 4 => x1 = 2
        // 1*2 + 0*x1 + 2*x2 = 6 => x2 = 2
        const x = L.solveLowerTriangular(b);
        expectVecCloseTo(x, [2, 2, 2]);
    });

    test('90. solveLowerTriangular preserves BigFloat accuracy', () => {
        const L = SparseMatrixCSC.fromDense([["0.1", "0"],
            ["0.2", "0.4"]
        ]);
        const b = new Vector(["0.05", "0.5"]);
        // 0.1 * x0 = 0.05 => x0 = 0.5
        // 0.2*0.5 + 0.4*x1 = 0.5 => 0.1 + 0.4*x1 = 0.5 => 0.4*x1 = 0.4 => x1 = 1.0
        const x = L.solveLowerTriangular(b);
        expectVecCloseTo(x, ["0.5", "1.0"]);
    });
});