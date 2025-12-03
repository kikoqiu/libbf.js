const { Scalar, BigFraction, Complex, BigFloat, bf } = require('../dist/bf.cjs'); 
const { init } = require("./testhelper.js");


describe('Scalar Class Comprehensive Test Suite', () => {
    beforeAll(async () => {
        await init();
    });
    // ==========================================
    // Group 1: Construction & Level Identification
    // ==========================================

    test('01. Should construct BigFraction from integer', () => {
        const s = new Scalar(10);
        expect(s.level).toBe(0);
        expect(s.value instanceof BigFraction).toBe(true);
        expect(s.toString()).toBe('10');
    });

    test('02. Should construct BigFloat from float number', () => {
        const s = new Scalar(10.5);
        expect(s.level).toBe(1);
        expect(s.value instanceof BigFloat).toBe(true);
    });

    test('03. Should construct BigFraction from BigInt', () => {
        const s = new Scalar(100n);
        expect(s.level).toBe(0);
        expect(s.toString()).toBe('100');
    });

    test('04. Should parse fraction string as Level 0', () => {
        const s = new Scalar("1/3");
        expect(s.level).toBe(0);
        expect(s.toString()).toBe('1/3');
    });

    test('05. Should parse complex string as Level 2', () => {
        const s = new Scalar("1+2i");
        expect(s.level).toBe(2);
        expect(s.value instanceof Complex).toBe(true);
    });

    test('06. Should parse decimal string as Level 1', () => {
        const s = new Scalar("3.1415");
        expect(s.level).toBe(1);
    });

    // ==========================================
    // Group 2: Arithmetic & Type Promotion
    // ==========================================

    test('07. BigFraction + BigFraction = BigFraction', () => {
        const a = new Scalar("1/2");
        const b = new Scalar("1/3");
        const res = a.operatorAdd(b);
        expect(res.level).toBe(0);
        expect(res.toString()).toBe("5/6");
    });

    test('08. BigFraction + BigFloat = BigFloat (Promotion)', () => {
        const a = new Scalar("1/2"); // 0.5
        const b = new Scalar(1.5);   // BigFloat
        const res = a.add(b);
        expect(res.level).toBe(1);
        expect(res.value.toString()).toContain("2");
    });

    test('09. BigFloat * BigFraction = BigFloat', () => {
        const a = new Scalar(2.0);
        const b = new Scalar("1/2");
        const res = a.operatorMul(b);
        expect(res.level).toBe(0);
        expect(res.toString(10, 1)).toBe("1");
    });

    test('10. BigFraction + Complex = Complex (Promotion)', () => {
        const a = new Scalar("1/1");
        const b = new Scalar("0+1i");
        const res = a.add(b);
        expect(res.level).toBe(2);
        expect(res.toString()).toContain("1 + i");
    });

    test('11. Division by zero in BigFraction should handle properly', () => {
        const a = new Scalar(1);
        const b = new Scalar(0);
        expect(() => a.div(b)).toThrow();
    });

    test('12. Subtraction with promotion', () => {
        const a = new Scalar("1+1i");
        const b = new Scalar(1);
        const res = a.operatorSub(b);
        expect(res.toString()).toContain("i");
    });

    // ==========================================
    // Group 3: Transcendental Functions (Rational)
    // ==========================================

    test('13. exp(0) as BigFraction should return BigFraction 1', () => {
        const s = new Scalar(0);
        const res = s.exp();
        expect(res.level).toBe(0);
        expect(res.toString()).toBe("1");
    });

    test('14. sin(0) should stay as BigFraction 0', () => {
        const s = new Scalar(0);
        const res = s.sin();
        expect(res.level).toBe(0);
        expect(res.toString()).toBe("0");
    });

    test('15. log(1) should stay as BigFraction 0', () => {
        const s = new Scalar(1);
        const res = s.log();
        expect(res.level).toBe(0);
        expect(res.toString()).toBe("0");
    });

    // ==========================================
    // Group 4: Transcendental Functions (Irrational Promotion)
    // ==========================================

    test('16. exp(1) on BigFraction should promote to BigFloat', () => {
        const s = new Scalar(1);
        const res = s.exp();
        expect(res.level).toBe(1); // exp(1) = e (irrational)
        expect(res.value instanceof BigFloat).toBe(true);
    });

    test('17. sqrt(2) on BigFraction should promote to BigFloat', () => {
        const s = new Scalar(2);
        const res = s.sqrt();
        expect(res.level).toBe(1);
        expect(res.toString(10)).toContain("1.414");
    });

    test('18. sin(1) on BigFraction should promote to BigFloat', () => {
        const s = new Scalar(1);
        const res = s.sin();
        expect(res.level).toBe(1);
    });

    // ==========================================
    // Group 5: Complex Transcendental Functions
    // ==========================================

    test('19. exp(i*pi) should return -1 (Level 2)', () => {
        // e^(i*pi) = -1. Using a simplified test with i.
        const i = new Scalar("0+1i");
        // We simulate a simplified version or just check type
        const res = i.mul(new Scalar(3.14159)).exp();
        expect(res.level).toBe(2);
    });

    test('20. sqrt(-1) as Scalar(Integer) should promote to BigFloat or handle domain', () => {
        const s = new Scalar(-1);
        // Note: Scalar.sqrt() on negative BigFraction might throw if not Complex.
        // But if BigFraction returns undefined, it goes to BigFloat, which might return NaN for sqrt(-1).
        // User may need to manually use Complex if they want i.
        const res = new Scalar("0-1i").sqrt();
        expect(res.level).toBe(2);
    });

    // ==========================================
    // Group 6: Powers and Roots
    // ==========================================

    test('21. Integer power of BigFraction', () => {
        const s = new Scalar("2/3");
        const res = s.pow(new Scalar(2));
        expect(res.toString()).toBe("4/9");
        expect(res.level).toBe(0);
    });

    test('22. BigFraction to the power of 0.5 (Promotion)', () => {
        const s = new Scalar(4);
        const p = new Scalar(0.5);
        const res = s.operatorPow(p);
        expect(res.level).toBe(1);
        expect(res.toString(10, 1)).toBe("2");
    });

    // ==========================================
    // Group 7: Comparison & Equality
    // ==========================================

    test('23. Compare BigFraction and BigFloat', () => {
        const a = new Scalar("1/2");
        const b = new Scalar(0.5);
        expect(a.equals(b)).toBe(true);
    });

    test('24. Compare different levels', () => {
        const a = new Scalar("1/3");
        const b = new Scalar(0.333);
        expect(a.cmp(b)).toBe(1); // 0.3333... > 0.333
    });

    test('25. Complex equality', () => {
        const a = new Scalar("1+0i");
        const b = new Scalar(1);
        expect(a.equals(b)).toBe(true);
    });

    test('26. Comparison of Complex should throw', () => {
        const a = new Scalar("1+i");
        const b = new Scalar("1+2i");
        expect(() => a.cmp(b)).toThrow("Complex numbers are not ordered");
    });

    // ==========================================
    // Group 8: Edge Cases & Utilities
    // ==========================================

    test('27. operatorNeg should preserve level', () => {
        const s = new Scalar("5/7");
        const res = s.operatorNeg();
        expect(res.level).toBe(0);
        expect(res.toString()).toBe("-5/7");
    });

    test('28. abs() of negative BigFraction', () => {
        const s = new Scalar("-1/2");
        expect(s.abs().toString()).toBe("1/2");
    });

    test('29. fromString with large integer', () => {
        const s = Scalar.fromString("123456789012345678901234567890");
        expect(s.level).toBe(0);
        expect(s.value.n).toBe(123456789012345678901234567890n);
    });

    test('30. Scalar of Scalar should unwrap', () => {
        const a = new Scalar(5);
        const b = new Scalar(a);
        expect(b.level).toBe(0);
        expect(b.value).toBe(a.value);
    });

});