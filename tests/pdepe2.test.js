const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, pdepe } = require('../dist/bf.cjs');

// Helper function: Generate linearly spaced array
function linspace(start, end, n) {
    const arr =[];
    const step = (end - start) / (n - 1);
    for (let i = 0; i < n; i++) arr.push(start + step * i);
    return arr;
}

// Global execution config as requested
const testInfo = { _e: "1e-3", _re: "1e-2", progress: undefined };

describe('pdepe solver tests', () => {
    let bf_zero, bf_one, bf_half;
    let bs_pdefun;
    
    const r_val = 0.05, q_val = 0.0, sigma_val = 0.2, K = 100;

    beforeAll(async () => {
        await init(); // Must wait for WASM/BigFloat core init
        bf_zero = bf(0);
        bf_one = bf(1);
        bf_half = bf("0.5");

        // Factory for standard Black-Scholes PDE mapped for pdepe (backward time inverted to forward)
        const createBSPDE = (r_v, q_v, sig_v) => {
            const r_bf = bf(r_v); 
            const q_bf = bf(q_v); 
            const sigSq = bf(sig_v * sig_v);
            
            return (S, tau, u, dudx) => {
                // pdepe always provides u and dudx as arrays even for D=1
                const V = u[0];
                const dVdS = dudx[0];
                
                // f = 0.5 * sigma^2 * S^2 * V_S
                const f = bf_half.mul(sigSq).mul(S).mul(S).mul(dVdS);
                // s = (r - q - sigma^2) * S * V_S - r * V
                const s = r_bf.sub(q_bf).sub(sigSq).mul(S).mul(dVdS).sub(r_bf.mul(V));
                
                return { c: bf_one, f, s };
            };
        };
        
        bs_pdefun = createBSPDE(r_val, q_val, sigma_val);
    });
    

    // ==========================================
    // Part II: Financial Engineering & Option Pricing (11 - 32)
    // ==========================================
    describe('Financial Engineering: Option Pricing and Rate Models', () => {
        const S_mesh = linspace(1e-4, 150, 61); // Avoiding singularity at S=0
        const T_span = linspace(0, 1.0, 11); // Time to maturity from 0 to 1 year

        // 11-13: European Call Options
        test('11. European Call Option (ATM)', () => {
            const icfun = (S) => bf(Math.max(S.f64() - K, 0));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero,                               // V(0,t) = 0
                pr: ur[0].sub(Sr.sub(bf(K).mul(bf(Math.exp(-r_val * tau.f64()))))), qr: bf_zero // V(Smax,t) = Smax - K*e^-rt
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, S_mesh, T_span, testInfo);
            const S_100_idx = S_mesh.findIndex(s => Math.abs(s - 100) < 1);
            // Black-Scholes Call ATM closed-form solution is approx 10.45
            expectBFCloseTo(sol[10][S_100_idx], 10.45, 1);
        });

        test('12. European Call Option (ITM)', () => {
            const icfun = (S) => bf(Math.max(S.f64() - 80, 0)); // K=80 (S=100 is ITM)
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero, pr: ur[0].sub(Sr.sub(bf(80 * Math.exp(-r_val * tau.f64())))), qr: bf_zero
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, S_mesh, T_span, testInfo);
            const S_100_idx = S_mesh.findIndex(s => Math.abs(s - 100) < 1);
            expect(sol[10][S_100_idx].f64()).toBeGreaterThan(20); // Intrinsic value 20 + time value
        });

        test('13. European Call Option (OTM)', () => {
            const icfun = (S) => bf(Math.max(S.f64() - 120, 0)); // K=120 (S=100 is OTM)
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero, pr: ur[0].sub(Sr.sub(bf(120 * Math.exp(-r_val * tau.f64())))), qr: bf_zero
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, S_mesh, T_span, testInfo);
            const S_100_idx = S_mesh.findIndex(s => Math.abs(s - 100) < 1);
            expect(sol[10][S_100_idx].f64()).toBeLessThan(5); 
        });

        // 14-16: European Put Options
        test.skip('14. European Put Option (ATM)', () => {
            const icfun = (S) => bf(Math.max(K - S.f64(), 0));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0].sub(bf(K).mul(bf(Math.exp(-r_val * tau.f64())))), ql: bf_zero, // V(0,t) = K*e^-rt
                pr: ur[0], qr: bf_zero                                                   // V(Smax,t) = 0
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, S_mesh, T_span, testInfo);
            const S_100_idx = S_mesh.findIndex(s => Math.abs(s - 100) < 1);
            // Put-Call Parity: P = C - S + K*e^-rt => P ≈ 10.45 - 100 + 100*0.9512 = 5.57
            expectBFCloseTo(sol[10][S_100_idx], 5.57, 1);
        });

        test.skip('15. European Put Option (ITM)', () => {
            const icfun = (S) => bf(Math.max(120 - S.f64(), 0)); // K=120
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0].sub(bf(120 * Math.exp(-r_val * tau.f64()))), ql: bf_zero, pr: ur[0], qr: bf_zero
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, S_mesh, T_span, testInfo);
            const S_100_idx = S_mesh.findIndex(s => Math.abs(s - 100) < 1);
            expect(sol[10][S_100_idx].f64()).toBeGreaterThan(15);
        });

        test.skip('16. European Put Option (OTM)', () => {
            const icfun = (S) => bf(Math.max(80 - S.f64(), 0)); // K=80
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0].sub(bf(80 * Math.exp(-r_val * tau.f64()))), ql: bf_zero, pr: ur[0], qr: bf_zero
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, S_mesh, T_span, testInfo);
            const S_100_idx = S_mesh.findIndex(s => Math.abs(s - 100) < 1);
            expect(sol[10][S_100_idx].f64()).toBeLessThan(2);
        });

        // 17-18: Continuous Dividend Yield Options
        test('17. European Call with Continuous Dividend', () => {
            const div_q = 0.03;
            const r_bf = bf(0.05), q_bf = bf(div_q), sigSq = bf(0.2*0.2);
            const pde_div = (S, tau, u, dudx) => {
                const f = bf_half.mul(sigSq).mul(S).mul(S).mul(dudx[0]);
                const s = r_bf.sub(q_bf).sub(sigSq).mul(S).mul(dudx[0]).sub(r_bf.mul(u[0]));
                return { c: bf_one, f, s };
            }; 
            const icfun = (S) => bf(Math.max(S.f64() - 100, 0));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero, 
                pr: ur[0].sub(Sr.mul(bf(Math.exp(-div_q*tau.f64()))).sub(bf(100*Math.exp(-r_val*tau.f64())))), qr: bf_zero
            });
            const sol = pdepe(0, pde_div, icfun, bcfun, S_mesh, T_span, testInfo);
            expect(sol[10][S_mesh.findIndex(s=>Math.abs(s-100)<1)].f64()).toBeLessThan(10.45); // Value should drop due to dividend
        });

        test.skip('18. European Put with Continuous Dividend', () => {
            const div_q = 0.03;
            const r_bf = bf(0.05), q_bf = bf(div_q), sigSq = bf(0.2*0.2);
            const pde_div = (S, tau, u, dudx) => {
                const f = bf_half.mul(sigSq).mul(S).mul(S).mul(dudx[0]);
                const s = r_bf.sub(q_bf).sub(sigSq).mul(S).mul(dudx[0]).sub(r_bf.mul(u[0]));
                return { c: bf_one, f, s };
            }; 
            const icfun = (S) => bf(Math.max(100 - S.f64(), 0));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0].sub(bf(100*Math.exp(-r_val*tau.f64()))), ql: bf_zero, pr: ur[0], qr: bf_zero
            });
            const sol = pdepe(0, pde_div, icfun, bcfun, S_mesh, T_span, testInfo);
            expect(sol[10][S_mesh.findIndex(s=>Math.abs(s-100)<1)].f64()).toBeGreaterThan(5.57); // Put value increases with dividend
        });

        // 19-20: Digital / Binary Options
        test('19. Digital/Binary Call Option (Cash-or-Nothing)', () => {
            const icfun = (S) => bf(S.f64() > K ? 1 : 0); // Discontinuous step function
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero, pr: ur[0].sub(bf(Math.exp(-r_val * tau.f64()))), qr: bf_zero
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, S_mesh, T_span, testInfo);
            expect(sol[10][S_mesh.findIndex(s=>Math.abs(s-100)<1)].f64()).toBeLessThan(1.0);
        });

        test('20. Digital/Binary Put Option', () => {
            const icfun = (S) => bf(S.f64() < K ? 1 : 0);
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0].sub(bf(Math.exp(-r_val * tau.f64()))), ql: bf_zero, pr: ur[0], qr: bf_zero
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, S_mesh, T_span, testInfo);
            expect(sol[10][S_mesh.findIndex(s=>Math.abs(s-100)<1)].f64()).toBeGreaterThan(0.0);
        });

        // 21-22: Barrier Options
        test.skip('21. Up-and-Out Barrier Call Option', () => {
            const H = 130; 
            const mesh = linspace(1e-4, H, 51); // Spatial grid truncated at Barrier H
            const icfun = (S) => bf(Math.max(S.f64() - K, 0));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero, pr: ur[0], qr: bf_zero // Strict Dirichlet boundary: ur = 0 at H
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, mesh, T_span, testInfo);
            const S_100_idx = mesh.findIndex(s => Math.abs(s - 100) < 2);
            expect(sol[10][S_100_idx].f64()).toBeLessThan(10.45); // Knock-out reduces option premium
        });

        test.skip('22. Down-and-Out Barrier Put Option', () => {
            const B = 70; 
            const mesh = linspace(B, 150, 51); // Grid starts exactly at Barrier B
            const icfun = (S) => bf(Math.max(K - S.f64(), 0));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero, pr: ur[0], qr: bf_zero // Dirichlet: ul = 0 at B
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, mesh, T_span, testInfo);
            expect(sol).toBeDefined();
        });

        // 23: Local Volatility
        test('23. Option Pricing with Local Volatility (CEV-like)', () => {
            // sigma(S) = 0.2 * (S/100)^-0.5
            const r_bf = bf(0.05);
            const localVolPDE = (S, tau, u, dudx) => {
                const volSq = bf(0.04).mul(bf(100).div(S)); 
                const f = bf_half.mul(volSq).mul(S).mul(S).mul(dudx[0]);
                const s = r_bf.sub(volSq).mul(S).mul(dudx[0]).sub(r_bf.mul(u[0]));
                return { c: bf_one, f, s };
            };
            const icfun = (S) => bf(Math.max(S.f64() - K, 0));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero, pr: ur[0].sub(Sr.sub(bf(K*Math.exp(-r_val*tau.f64())))), qr: bf_zero
            });
            const sol = pdepe(0, localVolPDE, icfun, bcfun, linspace(10, 200, 41), T_span, testInfo);
            expect(sol).toBeDefined();
        });

        // 24: Power Options
        test.skip('24. Power Option Pricing', () => {
            const icfun = (S) => bf(Math.max(Math.pow(S.f64(), 2) - K, 0));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero, pr: ur[0].sub(Sr.mul(Sr).mul(bf(Math.exp((r_val+0.04)*tau.f64())))), qr: bf_zero
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, S_mesh, [0, 0.5], testInfo);
            expect(sol).toBeDefined();
        });

        // 25: Log Contracts
        test('25. Log Contract Pricing', () => {
            const icfun = (S) => bf(Math.log(S.f64()));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0].sub(bf(Math.log(Sl.f64()))), ql: bf_zero, pr: ur[0].sub(bf(Math.log(Sr.f64()))), qr: bf_zero
            });
            const sol = pdepe(0, bs_pdefun, icfun, bcfun, linspace(10, 150, 31), T_span, testInfo);
            expect(sol).toBeDefined();
        });

        // 26-28: Interest Rate Models
        const a_v = 0.1, b_v = 0.05, sig_v = 0.01;
        const vasicekPDE = (r_rt, tau, u, dudx) => {
            const f = bf_half.mul(bf(sig_v*sig_v)).mul(dudx[0]);
            const drift = bf(a_v).mul(bf(b_v).sub(r_rt));
            const s = drift.mul(dudx[0]).sub(r_rt.mul(u[0]));
            return { c: bf_one, f, s };
        };

        test('26. Vasicek Zero-Coupon Bond Pricing', () => {
            const r_mesh = linspace(0.0, 0.2, 41);
            const icfun = (r_rt) => bf_one; // ZCB terminal payoff is 1
            const bcfun = (rl, ul, rr, ur, tau) => ({
                pl: bf_zero, ql: bf_one, pr: bf_zero, qr: bf_one // Neumann P_r = 0 (simplified approximation)
            });
            const sol = pdepe(0, vasicekPDE, icfun, bcfun, r_mesh, linspace(0, 5.0, 11), testInfo); 
            const r_5pct_idx = r_mesh.findIndex(r => Math.abs(r - 0.05) < 0.001);
            expect(sol[10][r_5pct_idx].f64()).toBeLessThan(1.0); // Discounting ensures bond value < 1
        });

        test('27. CIR (Cox-Ingersoll-Ross) Zero-Coupon Bond Pricing', () => {
            const cirPDE = (r_rt, tau, u, dudx) => {
                const f = bf_half.mul(bf(sig_v*sig_v)).mul(r_rt).mul(dudx[0]);
                const drift = bf(a_v).mul(bf(b_v).sub(r_rt)).sub(bf_half.mul(bf(sig_v*sig_v)));
                const s = drift.mul(dudx[0]).sub(r_rt.mul(u[0]));
                return { c: bf_one, f, s };
            };
            const icfun = (r_rt) => bf_one;
            const bcfun = (rl, ul, rr, ur, tau) => ({
                pl: bf_zero, ql: bf_one, pr: bf_zero, qr: bf_one 
            });
            const sol = pdepe(0, cirPDE, icfun, bcfun, linspace(0.001, 0.2, 31), [0, 2.0], testInfo);
            expect(sol).toBeDefined();
        });

        test('28. Option on Vasicek Bond (Call Option)', () => {
            const icfun = (r_rt) => bf(Math.max(0.95 - r_rt.f64()*2, 0)); // Mock intrinsic payoff
            const bcfun = (rl, ul, rr, ur, tau) => ({
                pl: bf_zero, ql: bf_one, pr: bf_zero, qr: bf_one 
            });
            const sol = pdepe(0, vasicekPDE, icfun, bcfun, linspace(0.0, 0.2, 21), [0, 1.0], testInfo);
            expect(sol).toBeDefined();
        });

        // 29-32: Advanced Models and Systems (D > 1)
        test('29. CEV Model Call Option (Variable Coefficient Diffusion)', () => {
            const r_bf = bf(0.05);
            const cevPDE = (S, tau, u, dudx) => {
                const S_f = Math.max(S.f64(), 1e-4);
                const localVolSq = 0.04 * Math.pow(S_f, -1.0); // sigma^2 * S^(2beta-2) with beta=0.5
                const f = bf_half.mul(bf(localVolSq)).mul(S).mul(S).mul(dudx[0]);
                const s = r_bf.sub(bf(localVolSq)).mul(S).mul(dudx[0]).sub(r_bf.mul(u[0]));
                return { c: bf_one, f, s };
            };
            const icfun = (S) => bf(Math.max(S.f64() - K, 0));
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: ul[0], ql: bf_zero, pr: ur[0].sub(Sr.sub(bf(K*Math.exp(-r_val*tau.f64())))), qr: bf_zero
            });
            const sol = pdepe(0, cevPDE, icfun, bcfun, linspace(10, 200, 31), T_span, testInfo);
            expect(sol).toBeDefined();
        });

        test.skip('30. Multi-State Financial Variables (Put-Call Parity verified simultaneously)', () => {
            const r_bf = bf(0.05), sigSq = bf(0.2*0.2);
            const pdefun = (S, tau, u, dudx) => {
                // System D=2: u[0]=Call, u[1]=Put
                const f0 = bf_half.mul(sigSq).mul(S).mul(S).mul(dudx[0]);
                const f1 = bf_half.mul(sigSq).mul(S).mul(S).mul(dudx[1]);
                const s0 = r_bf.sub(sigSq).mul(S).mul(dudx[0]).sub(r_bf.mul(u[0]));
                const s1 = r_bf.sub(sigSq).mul(S).mul(dudx[1]).sub(r_bf.mul(u[1]));
                return { c: [bf_one, bf_one], f: [f0, f1], s:[s0, s1] };
            };
            const icfun = (S) =>[bf(Math.max(S.f64() - K, 0)), bf(Math.max(K - S.f64(), 0))]; 
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                pl: [ul[0], ul[1].sub(bf(K*Math.exp(-r_val*tau.f64())))], 
                ql:[bf_zero, bf_zero],
                pr: [ur[0].sub(Sr.sub(bf(K*Math.exp(-r_val*tau.f64())))), ur[1]], 
                qr:[bf_zero, bf_zero]
            });
            const sol = pdepe(0, pdefun, icfun, bcfun, S_mesh, T_span, testInfo);
            const S_100_idx = S_mesh.findIndex(s => Math.abs(s - 100) < 1);
            
            const call_val = sol[10][S_100_idx][0].f64();
            const put_val = sol[10][S_100_idx][1].f64();
            // Verifying Call - Put = S - K*e^(-rt)
            expect(call_val - put_val).toBeCloseTo(100 - 100 * Math.exp(-0.05), 1);
        });

        test('31. Regime-Switching Black-Scholes System (Coupled PDEs)', () => {
            // D=2 System modeling jump-diffusions between two volatility regimes
            const sig1 = 0.15, sig2 = 0.30;
            const lam12 = 0.5, lam21 = 0.5; // Transition rates
            const r_bf = bf(0.05);

            const pdefun = (S, tau, u, dudx) => {
                const f0 = bf_half.mul(bf(sig1*sig1)).mul(S).mul(S).mul(dudx[0]);
                const f1 = bf_half.mul(bf(sig2*sig2)).mul(S).mul(S).mul(dudx[1]);
                
                // Regime 1 source with coupling terms
                const drift0 = r_bf.sub(bf(sig1*sig1)).mul(S).mul(dudx[0]).sub(r_bf.mul(u[0]));
                const jump0 = bf(lam12).mul(u[1].sub(u[0])); // Jump to Regime 2
                const s0 = drift0.add(jump0);
                
                // Regime 2 source with coupling terms
                const drift1 = r_bf.sub(bf(sig2*sig2)).mul(S).mul(dudx[1]).sub(r_bf.mul(u[1]));
                const jump1 = bf(lam21).mul(u[0].sub(u[1])); // Jump to Regime 1
                const s1 = drift1.add(jump1);
                
                return { c: [bf_one, bf_one], f: [f0, f1], s: [s0, s1] };
            };

            const icfun = (S) =>[bf(Math.max(S.f64() - 100, 0)), bf(Math.max(S.f64() - 100, 0))];
            const bcfun = (Sl, ul, Sr, ur, tau) => {
                const asymp = Sr.sub(bf(100*Math.exp(-0.05*tau.f64())));
                return {
                    pl: [ul[0], ul[1]], 
                    ql: [bf_zero, bf_zero],
                    pr: [ur[0].sub(asymp), ur[1].sub(asymp)], 
                    qr: [bf_zero, bf_zero]
                };
            };
            
            const sol = pdepe(0, pdefun, icfun, bcfun, linspace(1e-4, 200, 51), linspace(0, 1.0, 11), testInfo);
            expect(sol[10][0].length).toBe(2);
            
            const S_100_idx = 25;
            const v1 = sol[10][S_100_idx][0].f64(); // Option val in calm market
            const v2 = sol[10][S_100_idx][1].f64(); // Option val in volatile market
            
            // Volatile regime usually guarantees a higher option premium
            expect(v2).toBeGreaterThanOrEqual(v1);
        });

        test('32. Tsiveriotis-Fernandes Convertible Bond Pricing System', () => {
            // D=2: u[0] = Total CB value, u[1] = Cash-only debt part
            const rc = 0.02; // Credit spread
            const r_bf = bf(0.05);
            const r_plus_rc = bf(0.05 + rc);
            const sigSq = bf(0.2 * 0.2);
            
            const pdefun = (S, tau, u, dudx) => {
                const f0 = bf_half.mul(sigSq).mul(S).mul(S).mul(dudx[0]);
                const f1 = bf_half.mul(sigSq).mul(S).mul(S).mul(dudx[1]);
                
                // s0 = r*S*V_S - r*V - rc*B (CB discounting utilizes cash-only part)
                const s0 = r_bf.mul(S).mul(dudx[0]).sub(r_bf.mul(u[0])).sub(bf(rc).mul(u[1]));
                // s1 = r*S*B_S - (r+rc)*B (Pure debt drops with risky rate)
                const s1 = r_bf.mul(S).mul(dudx[1]).sub(r_plus_rc.mul(u[1]));
                
                return { c:[bf_one, bf_one], f: [f0, f1], s: [s0, s1] };
            };
            
            const Face = 100; // Face value
            const CR = 1.0;   // Conversion ratio
            
            // IC: max(Face, ConversionValue), Debt = Face
            const icfun = (S) =>[bf(Math.max(Face, CR * S.f64())), bf(Face)]; 
            
            const bcfun = (Sl, ul, Sr, ur, tau) => ({
                // S->0: CB behaves exactly like pure debt
                pl: [ul[0].sub(ul[1]), ul[1].sub(bf(Face * Math.exp(-(0.05+rc)*tau.f64())))],
                ql: [bf_zero, bf_zero],
                // S->inf: CB completely translates to equity profile
                pr: [ur[0].sub(Sr.mul(bf(CR))), ur[1]], 
                qr: [bf_zero, bf_one] // Derivative of debt value to S tends to 0
            });
            
            const sol = pdepe(0, pdefun, icfun, bcfun, linspace(1e-4, 300, 51), linspace(0, 1.0, 11), testInfo);
            expect(sol[10][0].length).toBe(2);
            
            // The convertible bond value must fundamentally dominate the underlying risky cash debt
            const S_mid_idx = 25;
            expect(sol[10][S_mid_idx][0].f64()).toBeGreaterThanOrEqual(sol[10][S_mid_idx][1].f64());
        });
    });
});