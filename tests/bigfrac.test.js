const { BigFraction } = require('../dist/bf.cjs'); // Adjust import path as needed

describe('BigFraction Class Comprehensive Test Suite', () => {

    // ==========================================
    // Group 1: Construction & Normalization
    // ==========================================

    test('01. Constructor should create a simple fraction', () => {
        const f = new BigFraction(1, 2);
        expect(f.n).toBe(1n);
        expect(f.d).toBe(2n);
        expect(f.toString()).toBe('1/2');
    });

    test('02. Constructor should automatically simplify fractions (GCD)', () => {
        // 2/4 -> 1/2
        const f = new BigFraction(2n, 4n);
        expect(f.toString()).toBe('1/2');
        
        // 100/25 -> 4
        const f2 = new BigFraction(100, 25);
        expect(f2.toString()).toBe('4');
    });

    test('03. Constructor should normalize signs (denominator is always positive)', () => {
        // 1/-2 -> -1/2
        const f1 = new BigFraction(1, -2);
        expect(f1.n).toBe(-1n);
        expect(f1.d).toBe(2n);

        // -1/-2 -> 1/2
        const f2 = new BigFraction(-1, -2);
        expect(f2.toString()).toBe('1/2');
    });

    test('04. Constructor should handle zero correctly', () => {
        const f = new BigFraction(0, 5); // 0/5 -> 0/1
        expect(f.isZero()).toBe(true);
        expect(f.n).toBe(0n);
        expect(f.d).toBe(1n);
    });

    test('05. Constructor should copy from another BigFraction instance', () => {
        const original = new BigFraction(3, 4);
        const copy = new BigFraction(original);
        expect(copy.toString()).toBe('3/4');
        expect(copy).not.toBe(original); // Ensure it's a new reference
    });

    // ==========================================
    // Group 2: Basic Arithmetic
    // ==========================================

    test('06. [add] should sum two fractions correctly', () => {
        const a = new BigFraction(1, 2);
        const b = new BigFraction(1, 3);
        // 1/2 + 1/3 = 5/6
        expect(a.add(b).toString()).toBe('5/6');
    });

    test('07. [sub] should subtract fractions correctly', () => {
        const a = new BigFraction(1, 2);
        const b = new BigFraction(1, 3);
        // 1/2 - 1/3 = 1/6
        expect(a.sub(b).toString()).toBe('1/6');
    });

    test('08. [mul] should multiply fractions', () => {
        const a = new BigFraction(2, 3);
        const b = new BigFraction(3, 4);
        // (2/3) * (3/4) = 6/12 = 1/2
        expect(a.mul(b).toString()).toBe('1/2');
    });

    test('09. [div] should divide fractions', () => {
        const a = new BigFraction(1, 2);
        const b = new BigFraction(1, 4);
        // (1/2) / (1/4) = 4/2 = 2
        expect(a.div(b).toString()).toBe('2');
    });

    test('10. Arithmetic should accept mixed input types (number/string)', () => {
        const a = new BigFraction(1, 2);
        // 1/2 + 2 = 5/2
        expect(a.add(2).toString()).toBe('5/2');
        // 1/2 * "4" = 2
        expect(a.mul("4").toString()).toBe('2');
    });

    // ==========================================
    // Group 3: Advanced Math Operations
    // ==========================================

    test('11. [pow] should handle positive exponents', () => {
        const f = new BigFraction(2, 3);
        // (2/3)^3 = 8/27
        expect(f.pow(3).toString()).toBe('8/27');
    });

    test('12. [pow] should handle negative exponents', () => {
        const f = new BigFraction(2, 3);
        // (2/3)^-2 = (3/2)^2 = 9/4
        expect(f.pow(-2).toString()).toBe('9/4');
    });

    test('13. [pow] should handle zero exponent', () => {
        const f = new BigFraction(123, 456);
        expect(f.pow(0).toString()).toBe('1');
    });

    test('14. [sqrt] should return integer square root (floor logic)', () => {
        expect(new BigFraction(16).sqrt().toString()).toBe('4');
        expect(new BigFraction(4).sqrt().toString()).toBe('2');
    });

    test('15. [floor] should round down correctly for positive and negative', () => {
        const pos = new BigFraction(5, 2); // 2.5
        expect(pos.floor().toString()).toBe('2');

        const neg = new BigFraction(-5, 2); // -2.5 -> floor is -3
        expect(neg.floor().toString()).toBe('-3');
        
        const exact = new BigFraction(4, 2); // 2.0
        expect(exact.floor().toString()).toBe('2');
    });

    // ==========================================
    // Group 4: String Parsing & Formatting
    // ==========================================

    test('16. [fromString] should parse simple integers', () => {
        const f = BigFraction.fromString("123");
        expect(f.toString()).toBe('123');
    });

    test('17. [fromString] should parse fraction strings', () => {
        const f =  BigFraction.fromString("10/20");
        expect(f.toString()).toBe('1/2');
    });

    test('18. [fromString] should parse decimal strings', () => {
        let f = BigFraction.fromString("1.5"); // 15/10 -> 3/2
        expect(f.toString()).toBe('3/2');
        
        f=BigFraction.fromString("-0.25"); // -25/100 -> -1/4
        expect(f.toString()).toBe('-1/4');
    });

    test('19. [toString] should handle integer output vs fraction output', () => {
        const integer = new BigFraction(10, 2);
        expect(integer.toString()).toBe('5');
        
        const frac = new BigFraction(1, 3);
        expect(frac.toString()).toBe('1/3');
    });

    test('20. [toString]', () => {
        const f = new BigFraction(1, 3);
        expect(f.toString()).toBe('1/3');
        
        const f2 = new BigFraction(1, 2);
        expect(f2.toString()).toBe('1/2');
    });

    // ==========================================
    // Group 5: Comparisons
    // ==========================================

    test('21. [cmp] should return -1, 0, or 1', () => {
        const a = new BigFraction(1, 2);
        const b = new BigFraction(3, 4);
        
        expect(a.cmp(b)).toBe(-1); // 1/2 < 3/4
        expect(b.cmp(a)).toBe(1);  // 3/4 > 1/2
        expect(a.cmp(new BigFraction(1,2))).toBe(0); // 1/2 == 0.5
    });

    test('22. Operator methods (Less, Greater, Equal)', () => {
        const a = new BigFraction(1, 3);
        const b = new BigFraction(1, 2);
        
        expect(a.operatorLess(b)).toBe(true);
        expect(b.operatorGreater(a)).toBe(true);
        expect(a.operatorEqual(a)).toBe(true);
        expect(a.operatorEqual(b)).toBe(false);
    });

    test('23. Operator comparison edge cases (LessEqual, GreaterEqual)', () => {
        const a = new BigFraction(5, 1);
        const b = new BigFraction(5, 1);
        
        expect(a.operatorLessEqual(b)).toBe(true);
        expect(a.operatorGreaterEqual(b)).toBe(true);
        expect(a.operatorNotEqual(b)).toBe(false);
    });

    // ==========================================
    // Group 6: Utils & Edge Cases
    // ==========================================

    test('24. [neg] should negation fraction', () => {
        const f = new BigFraction(1, 3);
        expect(f.neg().toString()).toBe('-1/3');
        expect(f.neg().neg().toString()).toBe('1/3');
    });

    test('25. [abs] should return absolute value', () => {
        const f = new BigFraction(-5, 2);
        expect(f.abs().toString()).toBe('5/2');
    });

    test('26. [toNumber] should convert to JavaScript number', () => {
        const f = new BigFraction(1, 2);
        expect(f.toNumber()).toBeCloseTo(0.5);
    });

    test('27. [isNaN] should detect invalid state (zero denominator)', () => {
        const valid = new BigFraction(1, 2);
        expect(valid.isNaN()).toBe(false);

        // While constructor tries to avoid this, if we manually create one
        // or force it via arithmetic that might produce it (if safeguards fail)
        const invalid = new BigFraction(1, 0); 
        expect(invalid.isNaN()).toBe(true);
    });

    test('28. [isZero] should detect zero numerator', () => {
        const z = new BigFraction(0, 100);
        expect(z.isZero()).toBe(true);
        
        const nz = new BigFraction(1, 100);
        expect(nz.isZero()).toBe(false);
    });

    test('29. Division by zero should throw Error', () => {
        const a = new BigFraction(5);
        const zero = new BigFraction(0);
        expect(() => a.div(zero)).toThrow("Division by zero");
    });

    test('30. Operator aliases/getters should function correctly', () => {
        // These are getters returning bound functions (e.g. `operatorAdd`)
        const a = new BigFraction(1, 2);
        const b = new BigFraction(1, 2);
        
        // Use the alias property
        const result = a.operatorAdd(b); 
        expect(result.toString()).toBe('1');
        
        const neg = a.operatorNeg();
        expect(neg.toString()).toBe('-1/2');
    });



});

describe('BigFraction Constructor & Number Parsing Tests', () => {

    // 1. Test Simple Dyadic Rational (0.5)
    // 0.5 is exactly representable in binary as 1 * 2^-1
    test('1. Should correctly parse simple float 0.5 to 1/2', () => {
        const f = new BigFraction(0.5);
        expect(f.n).toBe(1n);
        expect(f.d).toBe(2n);
        expect(f.toString()).toBe('1/2');
    });

    // 2. Test Negative Float (-0.25)
    // -0.25 is exactly -1/4
    test('2. Should correctly parse negative float -0.25 to -1/4', () => {
        const f = new BigFraction(-0.25);
        expect(f.n).toBe(-1n);
        expect(f.d).toBe(4n);
        expect(f.toString()).toBe('-1/4');
    });

    // 3. Test Complex Dyadic Rational (0.625)
    // 0.625 is 5/8. This verifies the mantissa/exponent logic works for non-unit numerators.
    test('3. Should correctly parse 0.625 to 5/8', () => {
        const f = new BigFraction(0.625);
        expect(f.toString()).toBe('5/8');
    });

    // 4. Test Mixed Number (1.5)
    // 1.5 is 3/2. This verifies the implicit leading 1 in the mantissa logic.
    test('4. Should correctly parse mixed number 1.5 to 3/2', () => {
        const f = new BigFraction(1.5);
        expect(f.n).toBe(3n);
        expect(f.d).toBe(2n);
    });

    // 5. Test Integer passed as Number
    // Should take the integer fast path, not the float bitwise path (optimization check)
    test('5. Should treat integer numbers as integers (42)', () => {
        const f = new BigFraction(42);
        expect(f.n).toBe(42n);
        expect(f.d).toBe(1n);
        expect(f.toString()).toBe('42');
    });

    // 6. Test Zero Handling
    // 0 should become 0/1.
    test('6. Should handle zero (0) correctly', () => {
        const f = new BigFraction(0);
        expect(f.isZero()).toBe(true);
        expect(f.d).toBe(1n);
    });

    // 7. Test Negative Zero (-0)
    // IEEE 754 has -0. It should be normalized to 0/1 (standard zero).
    test('7. Should normalize negative zero (-0) to standard zero', () => {
        const f = new BigFraction(-0);
        expect(f.isZero()).toBe(true);
        expect(f.n).toBe(0n);
        expect(f.d).toBe(1n);
    });

    // 8. Test Tiny Number (Subnormal/Small)
    // 2^-10 (0.0009765625) -> 1/1024
    test('8. Should handle small powers of two (2^-10)', () => {
        const val = Math.pow(2, -10); // 1/1024
        const f = new BigFraction(val);
        expect(f.toString()).toBe('1/1024');
    });

    // 9. Test Invalid Numbers (Infinity / NaN)
    // These should result in the class's representation of NaN (0/0)
    test('9. Should handle Infinity and NaN safely', () => {
        const inf = new BigFraction(Infinity);
        expect(inf.isNaN()).toBe(true);
        expect(inf.d).toBe(0n);

        const nan = new BigFraction(NaN);
        expect(nan.isNaN()).toBe(true);
    });

    // 10. Test String Fallback Compatibility
    // Ensure that adding float support didn't break string parsing
    test('10. Should still support string inputs correctly', () => {
        const s1 = new BigFraction("0.5"); // String parsing path
        const n1 = new BigFraction(0.5);   // Float parsing path
        
        // They should result in the same math value
        expect(s1.cmp(n1)).toBe(0);
        expect(s1.toString()).toBe('1/2');
    });
});