import { BigFloat, bf, zero, one, decimalPrecision, getEpsilon, ode15s } from "./bf.js";

/**
 * High-performance 1D Parabolic and Elliptic PDE Solver (Equivalent to MATLAB's pdepe).
 * Solves equations of the form:
 * c(x,t,u,Du/Dx) * Du/Dt = x^(-m) * D/Dx( x^m * f(x,t,u,Du/Dx) ) + s(x,t,u,Du/Dx)
 * 
 * NOTE: All user-provided functions (pdefun, icfun, bcfun) MUST return `BigFloat` 
 * or `Array<BigFloat>` objects directly. No implicit type conversion is performed.
 * 
 * @param {number|string} m - Symmetry parameter: 0 (slab), 1 (cylinder), 2 (sphere).
 * @param {Function} pdefun - Equation definitions: {c, f, s} = pdefun(x, t, u, dudx)
 * @param {Function} icfun - Initial conditions: u0 = icfun(x)
 * @param {Function} bcfun - Boundary conditions: {pl, ql, pr, qr} = bcfun(xl, ul, xr, ur, t)
 * @param {Array<number|string|BigFloat>} xmesh - Spatial grid points[x_0, x_1, ..., x_N]
 * @param {Array<number|string|BigFloat>} tspan - Time output points[t_0, t_1, ..., t_M]
 * @param {Object} [info={}] - Configuration and Status object forwarded to ode15s.
 *        @param {number|string|BigFloat}[info._e="1e-5"] - Absolute Tolerance.
 *        @param {number|string|BigFloat}[info._re="1e-4"] - Relative Tolerance.
 *        @param {number}[info.max_step=10000000] - Maximum number of steps allowed.
 *        @param {number}[info.max_time=10000000] - Maximum execution time in milliseconds.
 *        @param {Function}[info.cb] - Optional callback per accepted ODE step: cb(t, y).
 *        @param {number}[info.progress] - Log progress every info.progress*100%.
 *        @param {number}[info.progressCb] - progress call back progressCb(pos:Number,t,y)
 *        @param {boolean}[info.estimate_error] - Enable global error estimation tracking.
 * 
 * @returns {Array<Array<BigFloat|Array<BigFloat>>>} - Solution 3D Array strictly returning BigFloat instances.
 */
export function pdepe(m, pdefun, icfun, bcfun, xmesh, tspan, info = {}) {
    // 1. Core Configuration & Geometry Validation
    const safe_bf = (n) => (n instanceof BigFloat) ? n : bf(n);
    const m_val = parseInt(m.toString(), 10);
    const m_plus_1 = bf(m_val + 1);
    
    const N = xmesh.length;
    if (N < 3) throw new Error("pdepe: xmesh must contain at least 3 spatial points.");

    const X = xmesh.map(safe_bf);
    const tspan_bf = tspan.map(safe_bf);
    
    // Dynamic Pre-calculated Tolerances & Global Constants Hoisting
    const prec = decimalPrecision();
    const eps = getEpsilon();
    
    const bf_0_5 = bf("0.5");
    const bf_2 = bf("2");
    const bf_3 = bf("3");
    
    const h_min_tol = bf("1e4").mul(eps);
    const zero_tol = bf("1e-" + Math.floor(prec * 0.9)); 
    const q_zero_tol = bf("1e-" + Math.floor(prec * 0.8)); // Dirichlet BC evaluation threshold

    // Check if origin symmetry mechanism is triggered (Cylinder & Sphere at x=0)
    const is_sym_left = m_val > 0 && X[0].cmp(zero) === 0;

    // Geometry caching to prevent inner-loop GC overhead
    const Xmid = new Array(N - 1);
    const dx = new Array(N - 1);
    const pre_inv_dx = new Array(N - 1);

    for (let i = 0; i < N - 1; i++) {
        Xmid[i] = X[i].add(X[i + 1]).mul(bf_0_5);
        dx[i] = X[i + 1].sub(X[i]);
        pre_inv_dx[i] = one.div(dx[i]);
    }

    const pre_inv_dx_2 = new Array(N - 1);
    for (let i = 1; i < N - 1; i++) {
        pre_inv_dx_2[i] = one.div(dx[i - 1].add(dx[i]));
    }

    // Geometry Exponents mapped for symmetry parameter (m)
    const powM = (x_bf) => {
        if (m_val === 0) return one;
        if (m_val === 1) return x_bf;
        if (m_val === 2) return x_bf.mul(x_bf);
        return x_bf.pow(m_val);
    };

    const powMp1 = (x_bf) => {
        if (m_val === 0) return x_bf;
        if (m_val === 1) return x_bf.mul(x_bf);
        return x_bf.pow(m_val + 1);
    };

    const powM_X = X.map(powM);
    const powM_Xmid = Xmid.map(powM);

    // Control Volume Formulations (Protects against origin singularities when m > 0)
    const V = new Array(N);
    const pre_inv_V = new Array(N);
    for (let i = 0; i < N; i++) {
        let left_edge = (i === 0) ? X[0] : Xmid[i - 1];
        let right_edge = (i === N - 1) ? X[N - 1] : Xmid[i];
        V[i] = powMp1(right_edge).sub(powMp1(left_edge)).div(m_plus_1);
        pre_inv_V[i] = one.div(V[i]);
    }

    // 2. Wrap User Functions - Blindly trusting user returns BigFloat / Array<BigFloat>
    const toArr = (val) => Array.isArray(val) ? val : [val];

    const _pdefun = (x_bf, t_bf, u_bf, dudx_bf) => {
        let res = pdefun(x_bf, t_bf, u_bf, dudx_bf);
        return { c: toArr(res.c), f: toArr(res.f), s: toArr(res.s) };
    };
    
    const _bcfun = (xl, ul, xr, ur, t) => {
        let res = bcfun(xl, ul, xr, ur, t);
        return { pl: toArr(res.pl), ql: toArr(res.ql), pr: toArr(res.pr), qr: toArr(res.qr) };
    };

    // Extract Initial State and Infer Equation Dimensions (D)
    let U0_flat =[];
    let D = 0;
    for (let i = 0; i < N; i++) {
        let u0_res = toArr(icfun(X[i]));
        if (i === 0) D = u0_res.length;
        for (let d = 0; d < D; d++) U0_flat.push(u0_res[d]);
    }

    const getU = (Y, i) => Y.slice(i * D, (i + 1) * D);

    // 3. Method of Lines (MOL) Core Assembly with Differential-Algebraic (DAE) Integration Map
    const ode_sys = (t, Y) => {
        let dY = new Array(N * D);
        let M = new Array(N * D);

        // a. Compute Interface Fluxes (F_mid)
        let F_mid = new Array(N - 1);
        for (let i = 0; i < N - 1; i++) {
            let u_L = getU(Y, i);
            let u_R = getU(Y, i + 1);
            let u_mid = new Array(D);
            let dudx_mid = new Array(D);
            
            for (let d = 0; d < D; d++) {
                u_mid[d] = u_L[d].add(u_R[d]).mul(bf_0_5);
                dudx_mid[d] = u_R[d].sub(u_L[d]).mul(pre_inv_dx[i]);
            }
            F_mid[i] = _pdefun(Xmid[i], t, u_mid, dudx_mid).f;
        }

        // b. Point-wise Node Properties and Interior PDE Formulation
        let C_node = new Array(N);
        let S_node = new Array(N);

        for (let i = 0; i < N; i++) {
            let u_node = getU(Y, i);
            let dudx_node = new Array(D);
            
            if (i === 0) {
                let u_R = getU(Y, 1);
                for (let d = 0; d < D; d++) dudx_node[d] = u_R[d].sub(u_node[d]).mul(pre_inv_dx[0]);
            } else if (i === N - 1) {
                let u_L = getU(Y, N - 2);
                for (let d = 0; d < D; d++) dudx_node[d] = u_node[d].sub(u_L[d]).mul(pre_inv_dx[N - 2]);
            } else {
                let u_L = getU(Y, i - 1);
                let u_R = getU(Y, i + 1);
                for (let d = 0; d < D; d++) dudx_node[d] = u_R[d].sub(u_L[d]).mul(pre_inv_dx_2[i]);
            }

            let pde_res = _pdefun(X[i], t, u_node, dudx_node);
            C_node[i] = pde_res.c;
            S_node[i] = pde_res.s;

            // Compute Interior Points
            if (i > 0 && i < N - 1) {
                for (let d = 0; d < D; d++) {
                    let flux_R = powM_Xmid[i].mul(F_mid[i][d]);
                    let flux_L = powM_Xmid[i - 1].mul(F_mid[i - 1][d]);
                    let flux_diff = flux_R.sub(flux_L).mul(pre_inv_V[i]);
                    
                    let c_val = C_node[i][d];
                    
                    // Pure BigFloat precision evaluation without losing precision
                    if (c_val.abs().cmp(zero_tol) < 0) {
                        c_val = c_val.sign() >= 0 ? zero_tol : zero_tol.neg();
                    }
                    
                    M[i * D + d] = c_val;
                    dY[i * D + d] = flux_diff.add(S_node[i][d]);
                }
            }
        }

        // c. Boundary Conditions Blending
        let bc_res = _bcfun(X[0], getU(Y, 0), X[N - 1], getU(Y, N - 1), t);

        // -- Left Boundary --
        if (is_sym_left) {
            for (let d = 0; d < D; d++) {
                // Zero Flux enforced for origin in cylinder/sphere mappings
                let flux_R = powM_Xmid[0].mul(F_mid[0][d]);
                let flux_L = zero; 
                let flux_diff = flux_R.sub(flux_L).mul(pre_inv_V[0]);
                
                let c_val = C_node[0][d];
                if (c_val.abs().cmp(zero_tol) < 0) {
                    c_val = c_val.sign() >= 0 ? zero_tol : zero_tol.neg();
                }
                
                M[d] = c_val;
                dY[d] = flux_diff.add(S_node[0][d]);
            }
        } else {
            for (let d = 0; d < D; d++) {
                if (bc_res.ql[d].abs().cmp(q_zero_tol) <= 0) {
                    // Exact Algebraic Dirichlet Constraints -> M(d)=0
                    M[d] = zero;
                    dY[d] = bc_res.pl[d];
                } else {
                    let f_L = bc_res.pl[d].neg().div(bc_res.ql[d]);
                    let flux_R = powM_Xmid[0].mul(F_mid[0][d]);
                    let flux_L = powM_X[0].mul(f_L);
                    let flux_diff = flux_R.sub(flux_L).mul(pre_inv_V[0]);
                    
                    let c_val = C_node[0][d];
                    if (c_val.abs().cmp(zero_tol) < 0) {
                        c_val = c_val.sign() >= 0 ? zero_tol : zero_tol.neg();
                    }
                    
                    M[d] = c_val;
                    dY[d] = flux_diff.add(S_node[0][d]);
                }
            }
        }

        // -- Right Boundary --
        let offset = (N - 1) * D;
        for (let d = 0; d < D; d++) {
            if (bc_res.qr[d].abs().cmp(q_zero_tol) <= 0) {
                // Exact Algebraic Dirichlet Constraints -> M(d)=0
                M[offset + d] = zero;
                dY[offset + d] = bc_res.pr[d];
            } else {
                let f_R = bc_res.pr[d].neg().div(bc_res.qr[d]);
                let flux_R = powM_X[N - 1].mul(f_R);
                let flux_L = powM_Xmid[N - 2].mul(F_mid[N - 2][d]);
                let flux_diff = flux_R.sub(flux_L).mul(pre_inv_V[N - 1]);
                
                let c_val = C_node[N - 1][d];
                if (c_val.abs().cmp(zero_tol) < 0) {
                    c_val = c_val.sign() >= 0 ? zero_tol : zero_tol.neg();
                }
                
                M[offset + d] = c_val;
                dY[offset + d] = flux_diff.add(S_node[N - 1][d]);
            }
        }

        return { M: M, f: dY };
    };

    // 4. Stiff ODE Global Integration setup
    const tmpInfo=Object.assign({
        _e: "1e-5",
        _re: "1e-4",
        max_step: 10000000,
        max_time: 10000000
    }, info);
    Object.assign(info, tmpInfo);
    
    // Inject custom high-performance graph-colored sparse Jacobian algorithm for MOL PDE
    // Reduces O(N^2) evaluation scaling directly down to O(1) via 3-color structural perturbation
    if (!info.Jacobian) {
        const jacobian_eps = bf("1e-" + Math.max(Math.floor(prec / 2), 8));
        
        info.Jacobian = (t_val, y_val, f_val) => {
            let rowIdx =[];
            let colIdx = [];
            let vals =[];
            
            for (let color = 0; color < 3; color++) {
                for (let d = 0; d < D; d++) {
                    let y_pert = [...y_val];
                    let deltas = new Array(N).fill(zero);
                    let has_pert = false;
                    
                    // Perturb all independent structural blocks simultaneously
                    for (let i = color; i < N; i += 3) {
                        let j = i * D + d;
                        let delta = y_val[j].abs().mul(jacobian_eps);
                        if (delta.cmp(jacobian_eps) < 0) delta = jacobian_eps;
                        deltas[i] = delta;
                        y_pert[j] = y_pert[j].add(delta);
                        has_pert = true;
                    }
                    if (!has_pert) continue;
                    
                    let res_pert = ode_sys(t_val, y_pert);
                    let f_pert = res_pert.f;
                    
                    for (let i = color; i < N; i += 3) {
                        let j = i * D + d;
                        let inv_delta = one.div(deltas[i]);
                        
                        // Limit dependent residual checks to mathematically adjacent physical nodes only
                        let start_node = Math.max(0, i - 1);
                        let end_node = Math.min(N - 1, i + 1);
                        
                        for (let node = start_node; node <= end_node; node++) {
                            for (let d_aff = 0; d_aff < D; d_aff++) {
                                let r = node * D + d_aff;
                                let diff = f_pert[r].sub(f_val[r]).mul(inv_delta);
                                if (!diff.isZero()) {
                                    rowIdx.push(r);
                                    colIdx.push(j);
                                    vals.push(diff);
                                }
                            }
                        }
                    }
                }
            }
            return { rowIdx, colIdx, vals };
        };
    }

    // Execute full span sweep
    let res = ode15s(ode_sys,[tspan_bf[0], tspan_bf[tspan_bf.length - 1]], U0_flat, info);
    info.Jacobian = undefined; // Clean up Jacobian reference to prevent memory leaks in long-running applications
    if (!res) throw new Error("pdepe: Underlying ode15s integration failed catastrophically.");

    let ode_t = res.t;
    let ode_y = res.y;
    let ode_dy = res.dy; // Fast & mathematically exact derivatives evaluated directly by BDF integrator

    // 5. Piecewise Cubic Hermite Interpolation (Continuous dense output exactly matching tspan)
    let sol =[];
    let k = 0;

    for (let ts of tspan_bf) {
        while (k < ode_t.length - 2 && ode_t[k + 1].cmp(ts) < 0) k++;

        let t0 = ode_t[k], t1 = ode_t[k + 1];
        let y0 = ode_y[k], y1 = ode_y[k + 1];
        let dy0 = ode_dy[k], dy1 = ode_dy[k + 1];
        
        let h = t1.sub(t0);
        let state_at_ts = new Array(N * D);
        
        if (ts.cmp(t0) === 0 || h.abs().cmp(h_min_tol) <= 0) {
            state_at_ts = y0;
        } else if (ts.cmp(t1) === 0) {
            state_at_ts = y1;
        } else {
            // High-fidelity continuous spline evaluation mimicking interior ODE structural dynamics
            let s = ts.sub(t0).div(h);
            let s2 = s.mul(s), s3 = s2.mul(s);
            
            let h00 = one.sub(bf_3.mul(s2)).add(bf_2.mul(s3));
            let h01 = bf_3.mul(s2).sub(bf_2.mul(s3));
            let h10 = h.mul(s.sub(bf_2.mul(s2)).add(s3));
            let h11 = h.mul(s3.sub(s2));
            
            for (let j = 0; j < N * D; j++) {
                state_at_ts[j] = h00.mul(y0[j]).add(h01.mul(y1[j]))
                                    .add(h10.mul(dy0[j])).add(h11.mul(dy1[j]));
            }
        }

        // 6. Formatting output to strictly parallel MATLAB multidimensional array expectations
        let grid_out =[];
        for (let i = 0; i < N; i++) {
            let eq_out =[];
            for (let d = 0; d < D; d++) {
                eq_out.push(state_at_ts[i * D + d]);
            }
            grid_out.push(D === 1 ? eq_out[0] : eq_out);
        }
        sol.push(grid_out);
    }

    return sol;
}