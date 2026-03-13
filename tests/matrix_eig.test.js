const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, SparseMatrixCSC, complex } =bfjs= require('../dist/bf.cjs');

describe('SparseMatrixCSC Test Suite 1', () => {
    beforeAll(async () => {
        await init();
    });

   
    /**
     * Helper function: Verifies the characteristic equation A * v = lambda * v.
     * Aggregates all results and errors into a single string for a clean diagnostic report.
     * 
     * @param {SparseMatrixCSC} A - The original matrix.
     * @param {Array<{eigenvalue: Complex, eigenvector: Array<Complex>}>} results - Calculated pairs.
     * @param {number} precision - Decimal places for tolerance.
     */
    const verifyEigenpairs = (A, results, precision = 7) => {
        const n = A.rows;
        const tol = bf(`1e-${precision}`);
        let logOutput = "";
        let failureCount = 0;

        // 1. Generate the Spectrum Header
        logOutput += "========================================================\n";
        logOutput += "DIAGNOSTIC EIGENVALUE SPECTRUM\n";
        logOutput += "========================================================\n";
        results.forEach((p, i) => {
            logOutput += `Pair #${i}: ${p.eigenvalue.toString(10, precision, true)}\n`;
        });
        logOutput += "========================================================\n\n";

        let failureDetails = "";

        // 2. Perform component-wise verification
        results.forEach((pair, pairIndex) => {
            const eigval = pair.eigenvalue;
            const eigvec = pair.eigenvector;
            
            // Calculate A * v using column-wise accumulation (Efficient for CSC)
            const Av = new Array(n).fill(null).map(() => complex(0, 0));
            for (let j = 0; j < n; j++) {
                const vj = eigvec[j];
                if (vj.isZero()) continue;

                const start = A.colPointers[j];
                const end = A.colPointers[j + 1];
                for (let p = start; p < end; p++) {
                    const row = A.rowIndices[p];
                    const val = A.values[p];
                    Av[row] = Av[row].add(vj.mul(val));
                }
            }
            
            // Compare results with lambda * v
            for (let i = 0; i < n; i++) {
                const lambda_v = eigvec[i].mul(eigval);
                const diffRe = Av[i].re.sub(lambda_v.re).abs();
                const diffIm = Av[i].im.sub(lambda_v.im).abs();

                if (diffRe.cmp(tol) > 0 || diffIm.cmp(tol) > 0) {
                    failureCount++;
                    // Only log the first 15 failures to keep the string manageable
                    if (failureCount <= 15) {
                        failureDetails += `[FAILURE] Pair ${pairIndex} at Row ${i}\n`;
                        failureDetails += `          Exp (λv): ${lambda_v.toString(10, precision, true)}\n`;
                        failureDetails += `          Act (Av): ${Av[i].toString(10, precision, true)}\n`;
                    }
                }
            }
        });

        if (failureCount > 0) {
            logOutput += `VERIFICATION FAILURES DETECTED: ${failureCount} mismatches found.\n`;
            logOutput += "--------------------------------------------------------\n";
            logOutput += failureDetails;
            if (failureCount > 15) {
                logOutput += `... and ${failureCount - 15} more component failures.\n`;
            }
            logOutput += "========================================================\n";
            
            // Single log call
            console.log(logOutput);
            
            throw new Error(`Eigenpair verification failed for ${failureCount} components.`);
        }
    };

    test('1. eig returns all real eigenvalues and eigenvectors for a diagonal matrix', () => {
        const A = SparseMatrixCSC.fromDense([[3, 0], [0, 1]]);
        const results = A.eig("1e-15", 100);
        
        expect(results).toHaveLength(2);
        
        // For a diagonal matrix, eigenvalues should be strictly 3 and 1
        expectBFCloseTo(results[0].eigenvalue.re, 3, 10);
        expectBFCloseTo(results[0].eigenvalue.im, 0, 10);
        expectBFCloseTo(results[1].eigenvalue.re, 1, 10);
        expectBFCloseTo(results[1].eigenvalue.im, 0, 10);

        verifyEigenpairs(A, results, 8);
    });

    test('2. eig handles matrices with complex conjugate eigenvalues (Rotation Matrix)', () => {
        // 90-degree rotation matrix, expected eigenvalues are i and -i
        const A = SparseMatrixCSC.fromDense([[0, -1],[1, 0]]);
        const results = A.eig("1e-15", 100);

        expect(results).toHaveLength(2);
        
        // Verify real part is 0, absolute value of imaginary part is 1
        expectBFCloseTo(results[0].eigenvalue.re, 0, 10);
        expectBFCloseTo(results[0].eigenvalue.im.abs(), 1, 10);
        expectBFCloseTo(results[1].eigenvalue.re, 0, 10);
        expectBFCloseTo(results[1].eigenvalue.im.abs(), 1, 10);

        // Imaginary parts should have opposite signs (complex conjugates)
        const sumIm = results[0].eigenvalue.im.add(results[1].eigenvalue.im);
        expectBFCloseTo(sumIm, 0, 10);

        verifyEigenpairs(A, results, 8);
    });

    test('3. eig correctly processes the identity matrix with repeated eigenvalues', () => {
        const A = SparseMatrixCSC.fromDense([[1, 0, 0],[0, 1, 0], [0, 0, 1]]);
        const results = A.eig("1e-15", 100);

        expect(results).toHaveLength(3);
        results.forEach(pair => {
            expectBFCloseTo(pair.eigenvalue.re, 1, 10);
            expectBFCloseTo(pair.eigenvalue.im, 0, 10);
        });
        
        verifyEigenpairs(A, results, 8);
    });

    test('4. eig handles matrices with negative entries (Adapting legacy test)', () => {
        const A = SparseMatrixCSC.fromDense([[-5, 0], [0, -2]]);
        const results = A.eig("1e-15", 100);

        expect(results).toHaveLength(2);
        // Sorted strictly by descending magnitude, -5 should be the first element
        expectBFCloseTo(results[0].eigenvalue.re, -5, 10);
        expectBFCloseTo(results[1].eigenvalue.re, -2, 10);

        verifyEigenpairs(A, results, 8);
    });

    test('5. eig correctly finds zero eigenvalues for a singular matrix', () => {
        // Singular matrix: determinant is 0, expected eigenvalues are 3 and 0
        const A = SparseMatrixCSC.fromDense([[2, 1], [2, 1]]);
        const results = A.eig("1e-15", 100);

        expect(results).toHaveLength(2);
        expectBFCloseTo(results[0].eigenvalue.re, 3, 10);
        expectBFCloseTo(results[1].eigenvalue.re, 0, 10); // Zero eigenvalue

        verifyEigenpairs(A, results, 8);
    });

    test('6. eig accurately extracts eigenvalues from an upper triangular matrix', () => {
        const A = SparseMatrixCSC.fromDense([[4, 1, 3], [0, 2, 5],[0, 0, -1]]);
        const results = A.eig("1e-15", 100);

        expect(results).toHaveLength(3);
        
        // Eigenvalues of an upper triangular matrix are strictly its diagonal elements
        const expectedEigenvalues = [4, 2, -1]; // Sorted by descending magnitude
        for(let i = 0; i < 3; i++){
            expectBFCloseTo(results[i].eigenvalue.re, expectedEigenvalues[i], 10);
            expectBFCloseTo(results[i].eigenvalue.im, 0, 10);
        }

        verifyEigenpairs(A, results, 8);
    });

    test('7. eig successfully solves a 3x3 matrix with both real and complex eigenvalues', () => {
        // Block diagonal matrix, combining real eigenvalue 1 and complex eigenvalues i, -i
        const A = SparseMatrixCSC.fromDense([
            [1, 0,  0],
            [0, 0, -1],[0, 1,  0]
        ]);
        const results = A.eig("1e-15", 100);

        expect(results).toHaveLength(3);
        verifyEigenpairs(A, results, 8);
    });

    test('8. eig returns eigenvalues sorted strictly by descending magnitude', () => {
        const A = SparseMatrixCSC.fromDense([[-10, 0, 0],
            [  0, 2, 0],[  0, 0, 5]
        ]);
        const results = A.eig("1e-15", 100);

        expect(results).toHaveLength(3);
        // Magnitude order: |-10| > |5| > |2|
        expectBFCloseTo(results[0].eigenvalue.re, -10, 10);
        expectBFCloseTo(results[1].eigenvalue.re,   5, 10);
        expectBFCloseTo(results[2].eigenvalue.re,   2, 10);

        verifyEigenpairs(A, results, 8);
    });

    test('9. eig outputs satisfy the characteristic equation A*v = lambda*v for dense asymmetrical matrices', () => {
        // General asymmetric matrix
        const A = SparseMatrixCSC.fromDense([[1, 2], [3, 4]]);
        const results = A.eig("1e-15", 100);

        expect(results).toHaveLength(2);
        
        // We do not hardcode specific eigenvalues to prevent numerical mantissa differences;
        // Instead, we strictly verify that the characteristic equation holds true.
        verifyEigenpairs(A, results, 8);
    });

    test('10. eig throws an error when called on a non-square matrix', () => {
        const A = SparseMatrixCSC.fromDense([[1, 2, 3], [4, 5, 6]]);
        
        expect(() => {
            A.eig();
        }).toThrow("Matrix must be square for Eigenvalue computation.");
    });

    // ============================================================================
    // --- Advanced Diagnostic Tests (Stress Tests for the QR Algorithm) ---
    // ============================================================================

    test('11. eig handles the Grcar matrix (Highly Non-Normal with sensitive complex eigenvalues)', () => {
        // Grcar matrix of size 5. It has -1 on the subdiagonal, 1 on the main diagonal 
        // and 1 on the first 3 superdiagonals. 
        // It is famous for making eigenvalue solvers fail due to extreme sensitivity (large condition number).
        const A = SparseMatrixCSC.fromDense([[ 1,  1,  1,  1,  0],[-1,  1,  1,  1,  1],[ 0, -1,  1,  1,  1],
            [ 0,  0, -1,  1,  1],[ 0,  0,  0, -1,  1]
        ]);
        
        // Use more iterations to give it a chance, but it tests the robustness of the Hessenberg reduction/QR
        const results = A.eig("1e-12", 2000);

        expect(results).toHaveLength(5);
        verifyEigenpairs(A, results, 8);
    });

    test('12. eig handles a Cyclic Permutation Matrix (Stress test for unshifted QR convergence)', () => {
        // A cyclic permutation matrix. Eigenvalues are 1, and complex roots of unity.
        // Without Wilkinson shifts or Rayleigh quotient shifts, a basic QR algorithm 
        // will loop infinitely on this matrix and never converge.
        const A = SparseMatrixCSC.fromDense([
            [0, 1, 0],[0, 0, 1],
            [1, 0, 0]
        ]);
        
        const results = A.eig("1e-12", 1000);
        
        expect(results).toHaveLength(3);
        verifyEigenpairs(A, results, 8);
    });

    test('13. eig handles a Companion Matrix with mixed real and complex roots', () => {
        // Companion matrix for the polynomial: x^3 - x^2 + 2 = 0
        // Expected roots (eigenvalues): -1,  1 + i,  1 - i
        // Asymmetric matrices derived from polynomials often break naive back-substitution.
        const A = SparseMatrixCSC.fromDense([
            [0, 0, -2],
            [1, 0,  0],[0, 1,  1]
        ]);
        
        const results = A.eig("1e-12", 1000);
        
        expect(results).toHaveLength(3);
        verifyEigenpairs(A, results, 8);
    });
    test('14. Grcar Matrix', () => {
        const A = bfjs.gallery.grcar(50);
        const results = A.eig("1e-15", 100);
        verifyEigenpairs(A, results, 14);
    });

});