const { Poly, X, O, poly, bf, polyStr,Scalar,frac } = require('../dist/bf.cjs');
const { init } = require("./testhelper.js");

// Tolerance comparison function (Lambda)
// Assumes the objects returned by bf() support .sub(), .abs(), and .cmp()
const isClose = (a, b) => {
    // If a coefficient is undefined in Poly, treat it as 0
    const valA = a === undefined ? new Scalar(bf(0)) : new Scalar(a);
    const valB = b === undefined ? new Scalar(bf(0)) : new Scalar(b);
    return valA.sub(valB).abs().isAlmostZero();    
};

// Helper test function: compares a Poly object with its string representation
const expectStr = (p, str) => {
    const expected = polyStr(str);
    // Use the equals method, passing the lambda for loose comparison
    const isEqual = p.equals(expected, isClose);
    
    if (!isEqual) {
        throw new Error(`\nExpected: ${str}\nReceived: ${p.toString()}\n`);
    }
};

// Helper test function: compares two Poly objects (used for identity verification)
const expectPoly = (p1, p2) => {
    const isEqual = p1.equals(p2, isClose);
    if (!isEqual) {
        throw new Error(`\nPoly mismatch.\nP1: ${p1.toString()}\nP2: ${p2.toString()}\n`);
    }
}

describe('Poly Transcendental Functions Test Suite', () => {
    beforeAll(async () => {
        await init();
    });

    // Generic variable: a small quantity x with a specified order.
    // Many transcendental functions require infinite series truncation, so O(n) must be included.
    let x; 
    
    beforeEach(() => {
        // Define variable x with a default precision of order 6
        x = X().add(O(6)); 
    });

    // --- 1. Exponential (exp) [1-8] ---

    test('01. exp(0) -> 1', () => {
        // e^0 = 1
        const p = O(5).exp(); // 0 + O(x^5)
        expectStr(p, "1 + O(X^5)");
    });

    test('02. exp(x) basic expansion', () => {
        // e^x = 1 + x + x^2/2 + x^3/6 + x^4/24 + x^5/120
        // 1/2=0.5, 1/6≈0.1666..., 1/24≈0.04166..., 1/120≈0.00833...
        // Construct the expected Poly manually for easier comparison
        const expected = poly(1).add(x)
            .add(x.pow(2).mul(poly(1).div(2)))
            .add(x.pow(3).mul(poly(1).div(6)))
            .add(x.pow(4).mul(poly(1).div(24)))
            .add(x.pow(5).mul(poly(1).div(120)));
            
        expectPoly(x.exp(), expected);
    });

    test('03. exp(-x)', () => {
        const nx = x.neg();
        const res = nx.exp(); // 1 - x + x^2/2 - x^3/6 ...
        
        // Verify that the coefficient of x^1 is -1
        const coeffs = res.denseCoefs;
        expect(isClose(coeffs[1], bf(-1))).toBe(true);
    });

    test('04. Identity: exp(x) * exp(-x) = 1', () => {
        const p1 = x.exp();
        const p2 = x.neg().exp();
        const res = p1.mul(p2);
        expectStr(res, "1 + O(X^6)");
    });

    test('05. Identity: exp(2x) = (exp(x))^2', () => {
        const lhs = x.mul(poly(2)).exp(); // e^(2x)
        const rhs = x.exp().pow(2);       // (e^x)^2
        expectPoly(lhs, rhs);
    });

    test('06. exp(x^2)', () => {
        // e^(x^2) = 1 + x^2 + x^4/2 + O(x^6)
        const x2 = X(2).add(O(6));
        const res = x2.exp();
        // Check if odd-degree terms are 0
        const coeffs = res.denseCoefs;
        expect(isClose(coeffs[1], bf(0))).toBe(true); // x
        expect(isClose(coeffs[3], bf(0))).toBe(true); // x^3
        expect(isClose(coeffs[2], bf(1))).toBe(true); // x^2
    });

    test('07. exp(c + x) = e^c * e^x', () => {
        // exp(1 + x)
        const c = poly(1);
        const p = c.add(x); // 1 + x + O(6)
        const res = p.exp();
        
        const expected = x.exp().mul(poly(1).exp()); // e * e^x
        expectPoly(res, expected);
    });

    test('08. exp(log(1+x)) = 1+x', () => {
        // Inverse verification
        const inner = poly(1).add(x).log();
        const res = inner.exp();
        expectStr(res, "1 + 1X + O(X^6)");
    });


    // --- 2. Logarithm (log) [9-16] ---

    test('09. log(1) -> 0', () => {
        const p = poly(1).add(O(5)).log();
        expectStr(p, "O(X^5)"); // 0
    });

    test('10. log(1+x) basic expansion', () => {
        // x - x^2/2 + x^3/3 - x^4/4 + x^5/5
        const p = poly(1).add(x);
        const res = p.log();
        
        const expected = x
            .sub(x.pow(2).mul(poly("0.5")))
            .add(x.pow(3).mul(poly("1").div(poly("3"))))
            .sub(x.pow(4).mul(poly("0.25")))
            .add(x.pow(5).mul(poly("0.2")));

        expectPoly(res, expected);
    });

    test('11. log(1-x)', () => {
        // -x - x^2/2 - x^3/3 ...
        const p = poly(1).sub(x);
        const res = p.log();
        const c = res.denseCoefs;
        expect(isClose(c[1], bf(-1))).toBe(true);
        expect(isClose(c[2], bf(-0.5))).toBe(true);
    });

    test('12. Identity: log((1+x)^2) = 2 * log(1+x)', () => {
        const base = poly(1).add(x);
        const lhs = base.pow(2).log();
        const rhs = base.log().mul(poly(2));
        expectPoly(lhs, rhs);
    });

    test('13. Identity: log(exp(x)) = x', () => {
        const inner = x.exp();
        const res = inner.log();
        expectStr(res, "1X + O(X^6)");
    });

    test('14. log(1/ (1+x)) = -log(1+x)', () => {
        // log((1+x)^-1)
        const term = poly(1).add(x);
        // Use series inversion: 1/(1+x)
        const inv = poly(1).add(O(6)).div(term); 
        
        const lhs = inv.log();
        const rhs = term.log().neg();
        expectPoly(lhs, rhs);
    });

    test('15. log(e * (1+x)) = 1 + log(1+x)', () => {
        // ln(e) = 1
        const e = poly(1).exp(); // e scalar wrapped in poly
        const term = poly(1).add(x);
        
        const lhs = e.mul(term).log();
        const rhs = poly(1).add(term.log());
        expectPoly(lhs, rhs);
    });

    test('16. Derivative of log(1+x) is 1/(1+x)', () => {
        const f = poly(1).add(x).log();
        const df = f.deriv(); // 1 - x + x^2 - x^3 ...
        
        const inv = poly(1).add(O(5)).div(poly(1).add(X())); // 1/(1+x)
        
        // Compare up to O(5)
        expectPoly(df, inv);
    });


    // --- 3. Sine & Cosine (sin/cos) [17-26] ---

    test('17. sin(0) -> 0', () => {
        expectStr(O(5).sin(), "O(X^5)");
    });

    test('18. cos(0) -> 1', () => {
        expectStr(O(5).cos(), "1 + O(X^5)");
    });

    test('19. sin(x) odd symmetry', () => {
        // sin(-x) = -sin(x)
        const lhs = x.neg().sin();
        const rhs = x.sin().neg();
        expectPoly(lhs, rhs);
    });

    test('20. cos(x) even symmetry', () => {
        // cos(-x) = cos(x)
        const lhs = x.neg().cos();
        const rhs = x.cos();
        expectPoly(lhs, rhs);
    });

    test('21. Identity: sin^2(x) + cos^2(x) = 1', () => {
        const s = x.sin();
        const c = x.cos();
        const res = s.mul(s).add(c.mul(c));
        expectStr(res, "1 + O(X^6)");
    });

    test('22. Identity: sin(2x) = 2sin(x)cos(x)', () => {
        const lhs = x.mul(poly(2)).sin();
        const rhs = x.sin().mul(x.cos()).mul(poly(2));
        expectPoly(lhs, rhs);
    });

    test('23. Identity: cos(2x) = cos^2(x) - sin^2(x)', () => {
        const lhs = x.mul(poly(2)).cos();
        const s = x.sin();
        const c = x.cos();
        const rhs = c.mul(c).sub(s.mul(s));
        expectPoly(lhs, rhs);
    });

    test('24. sin(x) coefficients', () => {
        // x - x^3/6 + x^5/120
        const s = x.sin();
        const c = s.denseCoefs;
        console.log(s.toString());
        expect(isClose(c[0], bf(0))).toBe(true);
        expect(isClose(c[1], bf(1))).toBe(true);
        expect(isClose(c[2], bf(0))).toBe(true);
        expect(isClose(c[3], frac(-1.0,6.0))).toBe(true);
    });

    test('25. cos(x) coefficients', () => {
        // 1 - x^2/2 + x^4/24
        const cPoly = x.cos();
        const c = cPoly.denseCoefs;
        expect(isClose(c[0], bf(1))).toBe(true);
        expect(isClose(c[1], bf(0))).toBe(true);
        expect(isClose(c[2], bf(-0.5))).toBe(true);
    });

    test('26. Derivative of sin(x) is cos(x)', () => {
        // d/dx sin(x) = cos(x)
        // Note: Differentiation reduces the order by 1, so the order needs to be adjusted during comparison.
        const s = X().add(O(7)).sin(); // O(7)
        const ds = s.deriv(); // O(6)
        
        const c = X().add(O(6)).cos();
        expectPoly(ds, c);
    });


    // --- 4. Tangent (tan) [27-31] ---

    test('27. tan(0) -> 0', () => {
        expectStr(O(5).tan(), "O(X^5)");
    });

    test('28. tan(x) basic expansion', () => {
        // x + x^3/3 + 2x^5/15
        const t = x.tan();
        const c = t.denseCoefs;
        expect(isClose(c[1], bf(1))).toBe(true);
        expect(isClose(c[3], frac(1.0,3.0))).toBe(true);
    });

    test('29. tan(-x) = -tan(x)', () => {
        const lhs = x.neg().tan();
        const rhs = x.tan().neg();
        expectPoly(lhs, rhs);
    });

    test('30. Identity: tan(x) = sin(x) / cos(x)', () => {
        const lhs = x.tan();
        const rhs = x.sin().div(x.cos());
        expectPoly(lhs, rhs);
    });

    test('31. Identity: 1 + tan^2(x) = 1/cos^2(x) (sec^2)', () => {
        const t = x.tan();
        const lhs = poly(1).add(t.mul(t));
        
        const c = x.cos();
        const rhs = poly(1).add(O(6)).div(c.mul(c));
        
        expectPoly(lhs, rhs);
    });


    // --- 5. Inverse Trig (asin, acos, atan) [32-39] ---

    test('32. asin(0) -> 0', () => {
        expectStr(O(5).asin(), "O(X^5)");
    });

    test('33. asin(x) expansion', () => {
        // x + x^3/6 + 3x^5/40
        const as = x.asin();
        const c = as.denseCoefs;
        expect(isClose(c[1], bf(1))).toBe(true);
        expect(isClose(c[3], frac(1.0,6.0))).toBe(true);
    });

    test('34. Identity: sin(asin(x)) = x', () => {
        const inner = x.asin();
        const res = inner.sin();
        expectStr(res, "1X + O(X^6)");
    });

    test('35. atan(0) -> 0', () => {
        expectStr(O(5).atan(), "O(X^5)");
    });

    test('36. atan(x) expansion', () => {
        // x - x^3/3 + x^5/5 (Gregory series)
        const at = x.atan();
        const c = at.denseCoefs;
        expect(isClose(c[1], bf(1))).toBe(true);
        expect(isClose(c[3], frac(-1.0,3.0))).toBe(true);
        expect(isClose(c[5], bf("0.2"))).toBe(true);
    });

    test('37. Identity: tan(atan(x)) = x', () => {
        const inner = x.atan();
        const res = inner.tan();
        expectStr(res, "1X + O(X^6)");
    });

    test('38. Identity: atan(x) + atan(-x) = 0', () => {
        const p1 = x.atan();
        const p2 = x.neg().atan();
        expectStr(p1.add(p2), "O(X^6)");
    });

    test('39. Identity: asin(x) + acos(x) = PI/2', () => {
        // Verify the constant term
        const sum = x.asin().add(x.acos());
        const halfPi = bf(Math.PI).div(bf(2));
        const c0 = sum.denseCoefs[0];
        expect(isClose(c0, halfPi)).toBe(true);
        
        // Verify higher-order terms are 0
        const c1 = sum.denseCoefs[1] || bf(0);
        expect(isClose(c1, bf(0))).toBe(true);
    });


    // --- 6. Power Series (powSeries) [40-46] ---

    test('40. (1+x)^2 via powSeries matches mul', () => {
        const p = poly(1).add(x);
        const res = p.powSeries(2);
        const expected = p.mul(p);
        expectPoly(res, expected);
    });

    test('41. (1+x)^0.5 (Sqrt expansion)', () => {
        // 1 + x/2 - x^2/8 + x^3/16 ...
        const p = poly(1).add(x);
        const sqrt = p.powSeries(1, 2);
        
        const c = sqrt.denseCoefs;
        expect(isClose(c[1], bf(0.5))).toBe(true);
        expect(isClose(c[2], bf(-0.125))).toBe(true);
    });

    test('42. Identity: sqrt(1+x) * sqrt(1+x) = 1+x', () => {
        const p = poly(1).add(x);
        const sqrt = p.powSeries(1, 2);
        const res = sqrt.mul(sqrt);
        expectPoly(res, p);
    });

    test('43. (1+x)^-1 (Geometric series)', () => {
        // 1 - x + x^2 - x^3 ...
        const p = poly(1).add(x);
        const inv = p.powSeries(-1);
        
        const c = inv.denseCoefs;
        expect(isClose(c[0], bf(1))).toBe(true);
        expect(isClose(c[1], bf(-1))).toBe(true);
        expect(isClose(c[2], bf(1))).toBe(true);
    });

    test('44. (1+x)^-2', () => {
        // 1 - 2x + 3x^2 ...
        const p = poly(1).add(x);
        const res = p.powSeries(-2);
        
        const c = res.denseCoefs;
        expect(isClose(c[1], bf(-2))).toBe(true);
        expect(isClose(c[2], bf(3))).toBe(true);
    });

    test('45. powSeries with scalar multiplier: (4+x)^0.5', () => {
        // sqrt(4+x) = 2 * sqrt(1 + x/4) = 2(1 + x/8 - x^2/128...)
        // = 2 + x/4 - x^2/64
        const p = poly(4).add(x);
        const res = p.powSeries(1, 2);
        
        const c = res.denseCoefs;
        expect(isClose(c[0], bf(2))).toBe(true); // sqrt(4)
        expect(isClose(c[1], bf(0.25))).toBe(true);
    });

    test('46. Cube root (1+x)^(1/3)', () => {
        // 1 + x/3 - x^2/9 + 5x^3/81
        const p = poly(1).add(x);
        const res = p.powSeries(1, 3);
        const c = res.denseCoefs;
        expect(isClose(c[1], frac(1.0,3.0))).toBe(true);
    });


    // --- 7. Composition & Mixed [47-50] ---

    test('47. exp(sin(x))', () => {
        // e^(x - x^3/6) = 1 + (x - x^3/6) + 1/2(x - x^3/6)^2
        // = 1 + x + x^2/2 - x^3/8 (approx)
        // Check first few terms
        const inner = x.sin();
        const res = inner.exp();
        const c = res.denseCoefs;
        expect(isClose(c[0], bf(1))).toBe(true);
        expect(isClose(c[1], bf(1))).toBe(true); // x
        expect(isClose(c[2], bf(0.5))).toBe(true); // x^2/2
    });

    test('48. sin(tan(x))', () => {
        const inner = x.tan();
        const res = inner.sin();
        // x + x^3/6 ...
        // check linear term
        const c = res.denseCoefs;
        expect(isClose(c[1], bf(1))).toBe(true);
    });

    test('49. Identity: exp(atan(x)) vs expanded', () => {
        // Just validity check, no crash
        const res = x.atan().exp();
        expect(res.degs.length).toBeGreaterThan(0);
    });

    test('50. High order check', () => {
        // Ensure high order calculations don't crash
        const highX = X().add(O(20));
        const res = highX.sin();
        expect(res.o).toBe(20);
        // Coefficient 19 should exist (odd function)
        // 19! is huge, but BigFloat handles it
        const c19 = res.denseCoefs[19];
        expect(c19).toBeDefined();
    });

});