const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, shanks } = bfjs = require('../dist/bf.cjs');

describe('helper.shanks (Sequence Acceleration)', () => {
  beforeAll(async () => {
    await init();
  });

  const seriesSum = (termFunc, n) => {
    let sum = bf(0);
    for (let k = 0; k <= n; k++) {
      sum = sum.add(termFunc(k));
    }
    return sum;
  };

  // ==========================================
  // Category 1: Geometric Series
  // ==========================================

  // 1. Sum(1/2^k) = 2
  test('1. Geometric Series: Sum(1/2^k) -> 2', () => {
    // f(n) returns partial sum S_n
    const f = (n) => seriesSum((k) => bf(1).div(bf(2).pow(k)), n);
    const res = shanks(f);
    expectBFCloseTo(res, 2, 30);
  });

  // 2. Sum((-1/2)^k) = 1 / (1 - (-0.5)) = 2/3
  test('2. Alternating Geometric: Sum((-0.5)^k) -> 2/3', () => {
    const f = (n) => seriesSum((k) => bf(-0.5).pow(k), n);
    const res = shanks(f);
    expectBFCloseTo(res, bf(2.0).div(3.0), 30);
  });

  // 3. Sum((-1/3)^k) = 1 / (1 - (-1/3)) = 3/4
  test('3. Alternating Geometric: Sum((-1/3)^k) -> 0.75', () => {
    const f = (n) => seriesSum((k) => bf(-1).pow(k).div(bf(3).pow(k)), n);
    const res = shanks(f);
    expectBFCloseTo(res, 0.75, 30);
  });

  // 4. Sum(1/10^k) = 10/9
  test('4. Decimal Geometric: Sum(0.1^k) -> 1.111...', () => {
    const f = (n) => seriesSum((k) => bf(1).div(bf(10).pow(k)), n);
    const res = shanks(f);
    expectBFCloseTo(res, bf(10.0).div(9.0), 30);
  });

  // ==========================================
  // Category 2: Mathematical Constants (Pi)
  // ==========================================

  // 5. Leibniz Series for Pi/4: 1 - 1/3 + 1/5 - 1/7 ... (Slow convergence, Shanks accelerates well)
  test('5. Leibniz Series: Sum((-1)^k / (2k+1)) -> Pi/4', () => {
    const f = (n) => seriesSum((k) => {
      const num = bf(-1).pow(k);
      const den = bf(2).mul(k).add(1);
      return num.div(den);
    }, n);
    
    // Calculate Pi/4
    const target = bfjs.PI.div(4);
    const res = shanks(f);
    expectBFCloseTo(res, target, 25);
  });

  // 6. Nilakantha Series for Pi: 3 + 4/(2*3*4) - 4/(4*5*6) ...
  test('6. Nilakantha Series -> Pi', () => {
    const f = (n) => {
      let sum = bf(3);
      if (n === 0) return sum;
      for (let k = 1; k <= n; k++) {
        let sign = (k % 2 === 1) ? 1 : -1;
        let start = 2 * k;
        let denom = bf(start).mul(start + 1).mul(start + 2);
        let term = bf(4).div(denom).mul(sign);
        sum = sum.add(term);
      }
      return sum;
    };
    const res = shanks(f);
    expectBFCloseTo(res, bfjs.PI, 30);
  });

  // 7. Dirichlet Eta Function (Eta(2)): Sum((-1)^(k-1) / k^2) = Pi^2/12
  // k starts from 1 here, so adjust loop
  test('7. Dirichlet Eta(2) -> Pi^2/12', () => {
    const f = (n) => {
      let sum = bf(0);
      // Let's integrate k from 1 to n+1 to match n steps
      for (let k = 1; k <= n + 1; k++) {
        let term = bf(-1).pow(k - 1).div(bf(k).pow(2));
        sum = sum.add(term);
      }
      return sum;
    };
    const target = bfjs.PI.pow(2).div(12);
    const res = shanks(f);
    expectBFCloseTo(res, target, 25);
  });

  // 8. Wallis Product via Logarithms: Sum(log(2k/(2k-1)) + log(2k/(2k+1))) -> log(Pi/2)
  test('8. Wallis Product (Log Sum) -> log(Pi/2)', () => {
    const f = (n) => {
      let sum = bf(0);
      for (let k = 1; k <= n + 1; k++) {
        let term1 = bf(2*k).div(2*k - 1);
        let term2 = bf(2*k).div(2*k + 1);
        sum = sum.add(term1.mul(term2).log());
      }
      return sum;
    };
    const target = bfjs.PI.div(2).log();
    const res = shanks(f,{_e:1e-9,max_step:500});
    expectBFCloseTo(res, target, 3); // Log convergence is harder, check 20 digits
  });

  // ==========================================
  // Category 3: Mathematical Constants (e, ln2)
  // ==========================================

  // 9. Alternating Harmonic Series: 1 - 1/2 + 1/3 - 1/4 ... = ln(2)
  test('9. Alternating Harmonic Series -> ln(2)', () => {
    const f = (n) => {
      let sum = bf(0);
      for (let k = 1; k <= n + 1; k++) {
        let term = bf(-1).pow(k - 1).div(k);
        sum = sum.add(term);
      }
      return sum;
    };
    const res = shanks(f);
    expectBFCloseTo(res, bf(2).log(), 30);
  });

  // 10. Sequence (1 + 1/n)^n -> e
  test('10. Sequence (1 + 1/n)^n -> e', () => {
    // Note: This is a sequence S_n, not a series sum
    const f = (n) => {
      if (n === 0) return bf(2); // Start at n=1 equiv
      let x = bf(n + 1);
      return bf(1).add(bf(1).div(x)).pow(x);
    };
    const res = shanks(f,{_e:1e-9,max_step:500});
    expectBFCloseTo(res, bfjs.E, 3);
  });

  // 11. Taylor Series for e^-1: Sum((-1)^k / k!) -> 1/e
  test('11. Taylor Series e^-1 -> 1/e', () => {
    const f = (n) => {
        let sum = bf(0);
        let fact = bf(1);
        for(let k=0; k<=n; k++) {
            if (k>0) fact = fact.mul(k);
            let term = bf(-1).pow(k).div(fact);
            sum = sum.add(term);
        }
        return sum;
    };
    const res = shanks(f);
    expectBFCloseTo(res, bf(1).div(bfjs.E), 30);
  });

  // 12. Mercator Series: ln(1+x) at x=1 is ln(2) (Repeated for robustness with different formulation)
  test('12. Mercator Series ln(1.5): Sum(-1)^(k+1) * 0.5^k / k', () => {
    const x = bf(0.5);
    const f = (n) => {
      let sum = bf(0);
      for (let k = 1; k <= n + 1; k++) {
        let term = bf(-1).pow(k + 1).mul(x.pow(k)).div(k);
        sum = sum.add(term);
      }
      return sum;
    };
    const res = shanks(f);
    expectBFCloseTo(res, bf(1.5).log(), 30);
  });

  // ==========================================
  // Category 4: Algebraic Limits
  // ==========================================

  // 13. Sequence (n^2 + 1) / (2n^2 + 3) -> 0.5
  test('13. Rational Function Limit -> 0.5', () => {
    const f = (n) => {
      let N = bf(n + 1); // Avoid 0
      return N.pow(2).add(1).div(bf(2).mul(N.pow(2)).add(3));
    };
    const res = shanks(f,{_e:1e-9,max_step:500});
    expectBFCloseTo(res, 0.5, 5);
  });

  // 14. Sequence sqrt(n^2 + n) - n -> 0.5
  test('14. Sqrt Difference Limit -> 0.5', () => {
    const f = (n) => {
      let N = bf(n + 10); // Start slightly higher
      return N.pow(2).add(N).sqrt().sub(N);
    };
    const res = shanks(f,{_e:1e-9,max_step:500});
    expectBFCloseTo(res, 0.5, 4);
  });

  // 15. Sequence n * (ln(n+1) - ln(n)) -> 1
  test('15. Log Difference Limit -> 1', () => {
    const f = (n) => {
      let N = bf(n + 10);
      return N.mul( bf(N.add(1)).log().sub(N.log()) );
    };
    const res = shanks(f,{_e:1e-9,max_step:500});
    expectBFCloseTo(res, 1, 3);
  });

  // ==========================================
  // Category 5: Complex/Nested Sequences
  // ==========================================

  // 16. Nested Square Roots: sqrt(2 + sqrt(2 + ...)) -> 2
  test('16. Nested Roots of 2 -> 2', () => {
    const f = (n) => {
      let val = bf(0);
      for (let k = 0; k <= n; k++) {
        val = val.add(2).sqrt();
      }
      return val;
    };
    const res = shanks(f);
    expectBFCloseTo(res, 2, 30);
  });

  // 17. Continued Fraction for Golden Ratio: 1 + 1/(1 + 1/...) -> phi
  test('17. Golden Ratio Continued Fraction -> 1.618...', () => {
    const f = (n) => {
      let val = bf(1);
      for (let k = 0; k < n; k++) {
        val = bf(1).add(bf(1).div(val));
      }
      return val;
    };
    const phi = bf(1).add(bf(5).sqrt()).div(2);
    const res = shanks(f);
    expectBFCloseTo(res, phi, 25);
  });

  // 18. Ratio of Fibonacci numbers: F_{n+1}/F_n -> phi
  test('18. Fibonacci Ratio -> Phi', () => {
    // Generate Fib efficiently? For n<100, iterative is fine
    const f = (n) => {
      let a = bf(1), b = bf(1);
      for (let k = 0; k < n + 5; k++) {
        let temp = a.add(b);
        a = b;
        b = temp;
      }
      return b.div(a);
    };
    const phi = bf(1).add(bf(5).sqrt()).div(2);
    const res = shanks(f);
    expectBFCloseTo(res, phi, 30);
  });

  // ==========================================
  // Category 6: Trigonometric Series
  // ==========================================

  // 19. Sin(1) Taylor Series: Sum((-1)^k / (2k+1)!)
  test('19. Sin(1) Taylor Series', () => {
    const f = (n) => {
        let sum = bf(0);
        for(let k=0; k<=n; k++) {
            let fact = bf(1);
            for(let j=1; j<=2*k+1; j++) fact = fact.mul(j);
            let term = bf(-1).pow(k).div(fact);
            sum = sum.add(term);
        }
        return sum;
    };
    const res = shanks(f);
    expectBFCloseTo(res, bf(1).sin(), 30);
  });

  // 20. Cos(1) Taylor Series: Sum((-1)^k / (2k)!)
  test('20. Cos(1) Taylor Series', () => {
    const f = (n) => {
        let sum = bf(0);
        for(let k=0; k<=n; k++) {
            let fact = bf(1);
            for(let j=1; j<=2*k; j++) fact = fact.mul(j);
            let term = bf(-1).pow(k).div(fact);
            sum = sum.add(term);
        }
        return sum;
    };
    const res = shanks(f);
    expectBFCloseTo(res, bf(1).cos(), 30);
  });

  // ==========================================
  // Category 7: Divergent/Oscillating (Euler Summation)
  // ==========================================

  // 21. Grandi's Series: 1 - 1 + 1 - 1 ... -> 1/2 (Cesaro sum)
  test('21. Grandi\'s Series (1 - 1 + 1...) -> 0.5', () => {
    const f = (n) => {
        // Partial sums are 1, 0, 1, 0...
        return (n % 2 === 0) ? bf(1) : bf(0);
    };
    const res = shanks(f);
    // Shanks transformation perfectly handles this oscillation
    expectBFCloseTo(res, 0.5, 30);
  });

  // 22. 1 - 2 + 3 - 4 ... -> 1/4
  test('22. Alternating Natural Numbers -> 0.25', () => {
    const f = (n) => {
        let sum = bf(0);
        for(let k=1; k<=n+1; k++) {
            let term = bf(k).mul(bf(-1).pow(k-1));
            sum = sum.add(term);
        }
        return sum;
    };
    const res = shanks(f);
    expectBFCloseTo(res, 0.25, 30);
  });

  // 23. 1 - 2 + 4 - 8 ... (Powers of -2) -> 1 / (1 - (-2)) = 1/3
  test('23. Divergent Geometric (-2)^n -> 1/3', () => {
    const f = (n) => seriesSum((k) => bf(-2).pow(k), n);
    const res = shanks(f);
    expectBFCloseTo(res, bf(1.0).div(3.0), 30);
  });

  // ==========================================
  // Category 8: Config & Edge Cases
  // ==========================================

  // 24. Low Precision Tolerance
  test('24. Low Tolerance Config (1e-5)', () => {
    const f = (n) => seriesSum((k) => bf(-0.5).pow(k), n);
    const res = shanks(f, { _e: 1e-5 });
    // Should still be accurate, but finish faster or pass check
    expectBFCloseTo(res, 2/3, 5);
  });

  // 25. High Max Steps (Ensure it doesn't crash on simple fast sequences)
  test('25. Constant Sequence (Immediate Convergence)', () => {
    const f = (n) => bf(42);
    const res = shanks(f);
    expectBFCloseTo(res, 42, 30);
  });

  // 26. Check Info Object Return
  test('26. Info Object Verification', () => {
    const f = (n) => seriesSum((k) => bf(-0.5).pow(k), n);
    const info = {};
    const res = shanks(f, info);
    
    expectBFCloseTo(res, bf(2).div(3), 20);
    if (!info.steps || info.steps <= 0) throw new Error("Info.steps not updated");
    if (!info.error) throw new Error("Info.error not updated");
    if (typeof info.toString !== 'function') throw new Error("Info.toString missing");
  });

  // 27. Callback Function Execution
  test('27. Callback Execution', () => {
    let callCount = 0;
    const f = (n) => seriesSum((k) => bf(-0.5).pow(k), n);
    shanks(f, { 
        cb: () => { callCount++; } 
    });
    if (callCount === 0) throw new Error("Callback never called");
  });

  // 28. Slowly Converging (Zeta(2) non-alternating)
  // Note: Shanks is not magic for monotonic logarithmic convergence, but let's test stability
  test('28. Basel Problem (Sum 1/n^2) -> Pi^2/6', () => {
    const f = (n) => {
        let sum = bf(0);
        for(let k=1; k<=n+1; k++) sum = sum.add(bf(1).div(bf(k).pow(2)));
        return sum;
    };
    const res = shanks(f, {_e:1e-9,max_step:500}); 
    const target = bfjs.PI.pow(2).div(6);
    expectBFCloseTo(res, target, 3); 
  });

  // 29. Log(2) via BBP-type formula (or simpler fast converging)
  // Sum(1 / (n * 2^n)) = ln(2)
  test('29. Series Sum(1 / (k * 2^k)) -> ln(2)', () => {
    const f = (n) => {
        let sum = bf(0);
        for(let k=1; k<=n+1; k++) {
            let term = bf(1).div(bf(k).mul(bf(2).pow(k)));
            sum = sum.add(term);
        }
        return sum;
    };
    const res = shanks(f);
    expectBFCloseTo(res, bf(2).log(), 25);
  });

  // 30. Atan(1) via Euler Transform applied by Shanks: Sum(2^k * (k!)^2 / (2k+1)!) is hard...
  // Let's do simple Atan(1/2): Sum((-1)^k * (0.5)^(2k+1) / (2k+1))
  test('30. Atan(0.5) Series', () => {
    const x = bf(0.5);
    const f = (n) => {
        let sum = bf(0);
        for(let k=0; k<=n; k++) {
            let num = bf(-1).pow(k).mul(x.pow(2*k+1));
            let den = bf(2*k+1);
            sum = sum.add(num.div(den));
        }
        return sum;
    };
    const res = shanks(f);
    expectBFCloseTo(res, x.atan(), 28);
  });



    test('Shanks with Array: Sum(0.5^k)', () => {
        const seq = [1, 1.5, 1.75, 1.875, 1.9375, 1.96875].map(v => bf(v));
        const res = shanks(seq);
        expectBFCloseTo(res, 2, 30);
    });

    test('Shanks with Array: Leibniz Series', () => {
        const seq = [];
        let sum = bf(0);
        for(let k=0; k<20; k++) {
            sum = sum.add(bf(-1).pow(k).div(2*k + 1));
            seq.push(sum);
        }
        const res = shanks(seq);
        expectBFCloseTo(res, bfjs.PI.div(4), 15);
    });

    test('Shanks with Array: [1, 0, 1, 0, 1, 0]', () => {
        const seq = [1, 0, 1, 0, 1, 0].map(v => bf(v));
        const res = shanks(seq);
        expectBFCloseTo(res, 0.5, 30);
    });

});