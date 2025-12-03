const { Poly, X, O, poly,polyStr, BigFloat, Scalar,Complex } = require('../dist/bf.cjs');
const { init } = require("./testhelper.js");

// Helper to normalize strings for comparison (removes spaces)
const expectStr = (p, str) => {
    const normalize = s => s.replace(/\s+/g, '');
    const actual = normalize(p.toString());
    const expected = normalize(str);
    expect(actual).toEqual(expected);
};

describe('Poly Class Comprehensive Test Suite (Non-Transcendental)', () => {
    beforeAll(async () => {
        await init();
    });

    // --- 1. Construction & Representation (5 Tests) ---

    test('01. Construct from Factory (Scalar & X)', () => {
        expectStr(poly(5), "5");
        expectStr(X(), "1X");
    });

    test('02. Construct from Dense Array', () => {
        // 1 + 0X + 2X^2
        expectStr(poly([1, 0, 2]), "1 + 2X^2");
    });

    test('03. Construct from String', () => {
        expectStr(polyStr("1 + 2X - 3X^2"), "1 + 2X + -3X^2");
    });

    test('04. Construct with Order (Big O)', () => {
        const p = polyStr("1 + X").add(O(5));
        expectStr(p, "1 + 1X + O(X^5)");
    });

    test('05. Zero Polynomials', () => {
        expectStr(poly(0), "0");
        expectStr(O(3), "O(X^3)");
    });

    // --- 2. Exact Arithmetic (+, -, *, /) (10 Tests) ---

    test('06. Exact Addition', () => {
        const p1 = polyStr("1 + X");
        const p2 = polyStr("2 - X");
        expectStr(p1.add(p2), "3");
    });

    test('07. Exact Subtraction', () => {
        const p1 = X(2).add(1); // X^2 + 1
        const p2 = X(2);        // X^2
        expectStr(p1.sub(p2), "1");
    });

    test('08. Exact Multiplication', () => {
        // (X + 1)(X - 1) = X^2 - 1
        const p1 = X().add(1);
        const p2 = X().sub(1);
        expectStr(p1.mul(p2), "-1 + 1X^2");
    });

    test('09. Exact Multiplication (Scalar)', () => {
        expectStr(X().mul(5), "5X");
        expectStr(polyStr("1+X").mul(2), "2 + 2X");
    });

    test('10. Euclidean Division (Exact)', () => {
        // (X^2 + 2X + 1) / (X + 1) = X + 1
        const num = X(2).add(X().mul(2)).add(1);
        const den = X().add(1);
        expectStr(num.div(den), "1 + 1X");
    });

    test('11. Euclidean Division with Scalar', () => {
        expectStr(polyStr("6X^2 + 3").div(3), "1 + 2X^2"); // "1 + 2X^2" normalized
    });

    test('12. Exact Power (Integer)', () => {
        // (1+X)^2 = 1 + 2X + X^2
        expectStr(polyStr("1+X").pow(2), "1 + 2X + 1X^2");
    });

    test('13. Zero Property in Mul', () => {
        expectStr(X().mul(0), "0");
    });

    test('14. Commutative Addition', () => {
        const p1 = poly([1, 2, 3]);
        const p2 = poly([4, 5]);
        expectStr(p1.add(p2), p2.add(p1).toString());
    });

    test('15. Chain Operations', () => {
        // (X + 1) * X + 2 = X^2 + X + 2
        expectStr(X().add(1).mul(X()).add(2), "2 + 1X + 1X^2");
    });

    // --- 3. Order Propagation (O(X^n) Logic) (10 Tests) ---

    test('16. Order Addition (Min Rule)', () => {
        // O(X^3) + O(X^5) = O(X^3)
        expectStr(O(3).add(O(5)), "O(X^3)");
    });

    test('17. Polynomial + Order Truncation', () => {
        // (1 + X + X^2) + O(X^2) = 1 + X + O(X^2)
        const p = polyStr("1 + X + X^2").add(O(2));
        expectStr(p, "1 + 1X + O(X^2)");
    });

    test('18. Order Multiplication (Add Orders)', () => {
        // X * O(X^3) = O(X^4)
        expectStr(X().mul(O(3)), "O(X^4)");
    });

    test('19. Order Multiplication (Two Series)', () => {
        // O(X^2) * O(X^3) = O(X^5)
        expectStr(O(2).mul(O(3)), "O(X^5)");
    });

    test('20. Mixed Multiplication Truncation', () => {
        // (1 + X + O(X^2)) * (1 - X) 
        // = 1 - X + X - X^2 + O(X^2) - O(X^3)
        // = 1 - X^2 + O(X^2) -> 1 + O(X^2)
        const p1 = polyStr("1+X").add(O(2));
        const p2 = polyStr("1-X");
        expectStr(p1.mul(p2), "1 + O(X^2)");
    });

    test('21. Order Division (Shift)', () => {
        // O(X^5) / X = O(X^4)
        expectStr(O(5).div(X()), "O(X^4)");
    });

    test('22. Absorbing Higher Terms', () => {
        // (X + X^5) + O(X^3) -> X + O(X^3)
        expectStr(polyStr("X + X^5").add(O(3)), "1X + O(X^3)");
    });

    test('23. Zero with Order', () => {
        // 0 + O(X^2)
        expectStr(poly(0).add(O(2)), "O(X^2)");
    });

    test('24. High Precision Preservation', () => {
        // (1 + O(X^10)) + (1 + O(X^5)) = 2 + O(X^5)
        const p1 = poly(1).add(O(10));
        const p2 = poly(1).add(O(5));
        expectStr(p1.add(p2), "2 + O(X^5)");
    });

    test('25. Negative Order handling (Mul)', () => {
        // Logic check: (1 + O(X^2)) * (1 + O(X^2)) = 1 + O(X^2)
        expectStr(poly(1).add(O(2)).pow(2), "1 + O(X^2)", BigFloat);
    });

    // --- 4. Series Division & Inversion (8 Tests) ---

    test('26. Geometric Series (1 / (1-X))', () => {
        // 1 / (1-X) = 1 + X + X^2 + X^3 + O(X^4)
        const res = poly(1).add(O(4)).div(polyStr("1-X", BigFloat));
        expectStr(res, "1 + 1X + 1X^2 + 1X^3 + O(X^4)");
    });

    test('27. Inverse of (1+X)', () => {
        // 1 / (1+X) = 1 - X + X^2 - X^3 ...
        const res = poly(1).add(O(3)).div(polyStr("1+X", BigFloat));
        expectStr(res, "1 + -1X + 1X^2 + O(X^3)");
    });

    test('28. Rational Function Expansion', () => {
        // (1+X) / (1-X) = (1+X)(1+X+X^2...) = 1 + 2X + 2X^2 ...
        const num = poly("1+X").add(O(3));
        const den = poly("1-X");
        expectStr(num.div(den), "1 + 2X + 2X^2 + O(X^3)");
    });

    test('29. Division with Scalar in Denom', () => {
        // 1 / (2-X) = 1/2 + 1/4 X + ...
        // Using O(3)
        const res = poly(1).add(O(3)).div(poly("2-X"));
        expectStr(res, "0.5 + 0.25X + 0.125X^2 + O(X^3)");
    });

    test('30. X / (1+X)', () => {
        // X * (1 - X + X^2) = X - X^2 + X^3
        const res = X().add(O(4)).div(poly("1+X"));
        expectStr(res, "1X + -1X^2 + 1X^3 + O(X^4)");
    });

    test('31. Series Division Cancellation', () => {
        // (X + X^2) / X = 1 + X
        // (X + X^2 + O(X^4)) / X = 1 + X + O(X^3)
        const num = polyStr("X + X^2").add(O(4));
        expectStr(num.div(X()), "1 + 1X + O(X^3)");
    });

    test('31.1 Division', () => {
        let res=poly("1").div(X(1));
        expectStr(res, "1X^-1");  
    });

    test('31.2 Division', () => {
        let res=poly("1").div(poly("1+X+X^2+O(X^5)"));
        expectStr(res, "1+-1X+1X^3+-1X^4+O(X^5)");  
    });

    test('31.3 Division', () => {
        let res=poly("X^2+O(X^5)").div(poly("1+X+X^2+O(X^5)"));
        expectStr(res, "1X^2+-1X^3+O(X^5)");
    });
    
    test('32.1 Basic Identity', () => {
        // 1 / 1 = 1
        let res = poly("1").div(poly("1"));
        expectStr(res, "1");
    });

    test('32.2 Basic Scalar Division', () => {
        // 2X / 2 = X
        let res = poly("2X").div(poly("2"));
        expectStr(res, "1X");
    });

    test('32.3 Monomial Division (Exact)', () => {
        // X^2 / X = X
        let res = poly("X^2").div(X(1));
        expectStr(res, "1X");
    });

    test('32.4 Polynomial Exact Division', () => {
        // (X^2 - 1) / (X - 1) = X + 1
        let p0=poly("X^2+-1");
        let p1=poly("X+-1");
        let res = p0.div(p1);
        expectStr(res, "1+1X"); // Sorted: 1 + 1X
    });

    test('32.5 Trinomial Exact Division', () => {
        // (X^2 + 2X + 1) / (X + 1) = X + 1
        let res = poly("X^2+2X+1").div(poly("X+1"));
        expectStr(res, "1+1X");
    });

    // ==========================================
    // Group 2: Laurent Series (Negative Powers)
    // ==========================================

    test('32.6 Reciprocal of X', () => {
        // 1 / X = X^-1
        let res = poly("1").div(X(1));
        expectStr(res, "1X^-1");
    });

    test('32.7 Negative Power Result', () => {
        // X / X^3 = X^-2
        let res = X(1).div(X(3));
        expectStr(res, "1X^-2");
    });

    test('32.8 Laurent Polynomial', () => {
        // (X + 1) / X = 1 + X^-1
        let res = poly("X+1").div(X(1));
        expectStr(res, "1X^-1+1"); // Sorted ascending (-1, 0)
    });

    test('32.9 Division by Negative Power', () => {
        // 1 / X^-1 = X
        let res = poly("1").div(poly("X^-1"));
        expectStr(res, "1X");
    });

    test('32.10 Complex Laurent', () => {
        // (X^2 + 1) / X^2 = 1 + X^-2
        let res = poly("X^2+1").div(X(2));
        expectStr(res, "1X^-2+1");
    });

    // ==========================================
    // Group 3: Series Expansion (Implicit Limits)
    // Inputs are Exact, but result is infinite series
    // ==========================================

    test('32.11 Geometric Series 1/(1-X)', () => {
        // 1 / (1 - X) = 1 + X + X^2 + ... (Exact inputs trigger limit)
        // Checks the first few terms
        let res = poly("1").div(poly("1+-1X"));
        // Note: Default limit is usually around 100, checking start
        let s = res.toString();
        expect(s.startsWith("1 + 1X + 1X^2 + 1X^3")).toBe(true);
        expect(res.o).not.toBe(Infinity); // Should be truncated
    });

    test('32.12 Geometric Series 1/(1+X)', () => {
        // 1 / (1 + X) = 1 - X + X^2 - ...
        let res = poly("1").div(poly("1+X"));
        let s = res.toString();
        expect(s.startsWith("1 + -1X + 1X^2 + -1X^3")).toBe(true);
    });

    test('32.13 Scaled Geometric Series', () => {
        // 1 / (2 - X) = 1/2 + 1/4X + 1/8X^2 ...
        let res = poly("1").div(poly("2+-1X"));
        // Assuming BigFloat toString default precision
        expect(res.eval(0).toString(10,-1,true)).toBe("0.5"); 
    });

    // ==========================================
    // Group 4: Truncated Series (O(X^n) Inputs)
    // ==========================================

    test('32.14 Inverse with Truncation', () => {
        // 1 / (1 - X + O(X^4)) = 1 + X + X^2 + X^3 + O(X^4)
        let res = poly("1").div(poly("1+-1X+O(X^4)"));
        expectStr(res, "1+1X+1X^2+1X^3+O(X^4)");
    });

    test('32.15 Division with Remainder Truncation', () => {
        // 1 / (1 + X + X^2 + O(X^5)) -> 1 - X + O(X^2) check
        // Actual: 1 - X + X^3 - X^4 + O(X^5)
        let res = poly("1").div(poly("1+X+X^2+O(X^5)"));
        expectStr(res, "1+-1X+1X^3+-1X^4+O(X^5)");
    });

    test('32.16 Shifted Truncation (A has O)', () => {
        // (X + O(X^4)) / (1 - X) = X + X^2 + X^3 + O(X^4)
        let res = poly("X+O(X^4)").div(poly("1+-1X"));
        expectStr(res, "1X+1X^2+1X^3+O(X^4)");
    });

    test('32.17 Double Truncation', () => {
        // (1 + O(X^3)) / (1 + O(X^3)) = 1 + O(X^3)
        // Min order logic: min(3-0, 3+0-0) = 3
        let res = poly("1+O(X^3)").div(poly("1+O(X^3)"));
        expectStr(res, "1+O(X^3)");
    });

    test('32.18 Order Reduction by Denominator Valuation', () => {
        // O(X^5) / X = O(X^4)
        let res = Poly.O(5).div(X(1));
        expectStr(res, "O(X^4)");
    });

    test('32.19 Order Calculation Check (Prompt Example)', () => {
        // (X^2 + O(X^5)) / (1 + X + X^2 + O(X^5))
        // Expect: 1X^2 - 1X^3 + O(X^5)
        // Logic: vA=2, vB=0. a=5, b=5. ResOrder = min(5-0, 5+2-0) = 5.
        // Expansion of 1/(1+X+X^2) is 1-X+0X^2+X^3...
        // Multiply by X^2: X^2-X^3...
        let res = poly("X^2+O(X^5)").div(poly("1+X+X^2+O(X^5)"));
        expectStr(res, "1X^2+-1X^3+O(X^5)");
    });

    // ==========================================
    // Group 5: Complex and Special Coefficients
    // ==========================================

    test('32.20 Imaginary Unit Division', () => {
        // i / X = iX^-1
        let res = poly("i",Scalar);
        res=res.div(X(1,Scalar));
        expectStr(res, "iX^-1"); // Assuming 'i' is preserved or 0+1i
    });

    test('32.21 Division resulting in i', () => {
        // (iX) / X = i
        let res = poly("iX",Complex);
        res=res.div(X(1,Complex));
        expectStr(res, "i");
    });

    test('32.22 Negative Scalar', () => {
        // 1 / -1 = -1
        let res = poly("1").div(poly("-1"));
        expectStr(res, "-1");
    });

    // ==========================================
    // Group 6: Advanced/Edge Cases
    // ==========================================

    test('32.23 Gap Polynomial Division', () => {
        // (X^4 - 1) / (X^2 + 1) = X^2 - 1
        let res = poly("X^4+-1").div(poly("X^2+1"));
        expectStr(res, "-1+1X^2"); // Sorted
    });

    test('32.24 Series with Gap', () => {
        // 1 / (1 - X^2) = 1 + X^2 + X^4 ... (Truncated)
        let res = poly("1").div(poly("1+-1X^2+O(X^6)"));
        expectStr(res, "1+1X^2+1X^4+O(X^6)");
    });

    test('32.25 Valuation Shift', () => {
        // 1 / X^2 = X^-2. 
        // If we have O term: 1 / (X^2 + O(X^5))
        // vB=2, b=5. vA=0, a=Inf.
        // Order = min(Inf, 5 + 0 - 4) = 1. Wait: 5 + 0 - 2*2 = 1.
        // Result: X^-2 + O(X^1)
        let res = poly("1").div(poly("X^2+O(X^5)"));
        expectStr(res, "1X^-2+O(X^1)");
    });

    test('32.26 High Power Division', () => {
        // X^100 / X^98 = X^2
        let res = X(100).div(X(98));
        expectStr(res, "1X^2");
    });

    test('32.27 Negative Power in Numerator', () => {
        // X^-2 / X = X^-3
        let res = poly("X^-2").div(X(1));
        expectStr(res, "1X^-3");
    });

    test('32.28 Fraction Coefficients', () => {
        // X / 0.5 = 2X
        let res = X(1).div(poly("0.5"));
        // Depends on coefficient string representation, assuming 2 or 2.0
        let s = res.toString();
        expect(s).toMatch(/2(\.0+)?X/);
    });

    test('32.29 Laurent Series Expansion', () => {
        // 1 / (X - X^2) = 1/X(1-X) = X^-1 * (1+X+...) = X^-1 + 1 + X...
        // Truncated at O(X^2)
        let res = poly("1").div(poly("X+-1X^2+O(X^4)"));
        // Order: min(Inf, 4 + 0 - 2*1) = 2.
        expectStr(res, "1X^-1+1+1X+O(X^2)");
    });

    test('32.30 Exact Zero Division Error', () => {
        // 1 / 0 -> Error
        expect(() => {
            poly("1").div(poly("0"));
        }).toThrow("Division by zero");
    });

    test('33. Negative Powers (Laurent)', () => {
        let res=poly(1).add(O(2)).div(X());
        expectStr(res, "1X^-1 + O(X^1)");    
    });

    // --- 5. Power (Series & Fractional) (8 Tests) ---

    test('34. Sqrt(1+X) via powSeries', () => {
        // (1+X)^0.5 = 1 + 0.5X - 0.125X^2 + O(X^3)
        const p = polyStr("1+X").add(O(3));
        const res = p.powSeries(1, 2);
        expectStr(res, "1 + 0.5X + -0.125X^2 + O(X^3)");
    });

    test('35. Inverse Sqrt(1+X)', () => {
        // (1+X)^(-0.5) = 1 - 0.5X + 0.375X^2 ...
        const p = polyStr("1+X").add(O(3));
        const res = p.powSeries(-1, 2);
        expectStr(res, "1 + -0.5X + 0.375X^2 + O(X^3)");
    });

    test('36. Cube Root (1+X)^(1/3)', () => {
        // 1 + 1/3 X - 1/9 X^2
        const p = polyStr("1+X").add(O(3));
        const res = p.powSeries(1, 3);
        // 1/3 = 0.333..., 1/9 = 0.111...
        // We match pattern roughly or use toString which outputs decimals
        const str = res.toString();
        expect(str).toContain("0.33333(3)"); 
        expect(str).toContain("X");
        expect(str).toContain("X^2");
    });

    test('37. Square via powSeries (Check Consistency)', () => {
        // (1+X)^2 via series should match exact (truncated)
        const p = polyStr("1+X").add(O(3));
        expectStr(p.powSeries(2), "1 + 2X + 1X^2 + O(X^3)");
    });

    test('38. Non-Unit Constant Term Power', () => {
        // (4+X)^0.5 = 2 * (1 + X/4)^0.5 = 2 * (1 + X/8 - X^2/128...)
        // = 2 + 0.25X - 0.015625X^2
        const p = polyStr("4+X").add(O(3));
        const res = p.powSeries(1, 2);
        expectStr(res, "2 + 0.25X + -0.015625X^2 + O(X^3)");
    });

    test('39. Fractional Power of X term (Requires Valuation check)', () => {
        // (X^2 + O(X^4))^0.5 = X * (1 + O(X^2))^0.5 = X * (1 + O(X^2)) = X + O(X^3)
        const p = X(2).add(O(4)); 
        const res = p.powSeries(1, 2);
        expectStr(res, "1X + O(X^3)"); 
    });

    test('40. Error on Non-Integer Result Degree', () => {
        // X^0.5 -> X^(1/2) not supported
        const p = X().add(O(2));
        expect(() => p.powSeries(1, 2)).toThrow(/integer/);
    });

    test('41. Series Power requires Order', () => {
        const p = polyStr("1+X"); // Exact
        expect(() => p.powSeries(1, 2)).toThrow(/series/);
    });

    // --- 6. Calculus (Deriv & Integ) (6 Tests) ---

    test('42. Derivative of Polynomial', () => {
        // d/dx (1 + 3X + 5X^2) = 3 + 10X
        expectStr(polyStr("1 + 3X + 5X^2").deriv(), "3 + 10X");
    });

    test('43. Derivative with Order', () => {
        // d/dx (X^2 + O(X^5)) = 2X + O(X^4)
        expectStr(X(2).add(O(5)).deriv(), "2X + O(X^4)");
    });

    test('44. Derivative of Constant', () => {
        expectStr(poly(10).deriv(), "0");
    });

    test('45. Integration of Polynomial', () => {
        // int (3X^2) = X^3
        expectStr(polyStr("3X^2").integ(), "1X^3");
    });

    test('46. Integration with Order', () => {
        // int (1 + O(X^3)) = X + O(X^4)
        expectStr(poly(1).add(O(3)).integ(), "1X + O(X^4)");
    });

    test('47. Fundamental Theorem Check', () => {
        // deriv(integ(P)) = P (if const term was 0)
        const p = polyStr("X + X^2");
        expectStr(p.integ().deriv(), "1X + 1X^2");
    });

    // --- 7. Evaluation & Misc (3 Tests) ---

    test('48. Eval at Number', () => {
        // P = X^2 + 1 at x=2 -> 5
        const p = X(2).add(1);
        expect(p.eval(2).toString()).toEqual("5");
    });

    test('49. Eval at 0', () => {
        const p = polyStr("5 + 2X + X^10");
        expect(p.eval(0).toString()).toEqual("5");
    });

    test('50. Eval with BigFloat input', () => {
        // X + 0.5 at 0.5 -> 1.0
        const p = X().add(poly(0.5));
        // Assuming global bf() is available or handled by eval
        expect(p.eval(0.5).toString()).toMatch(/1(\.0+)?/);
    });

});