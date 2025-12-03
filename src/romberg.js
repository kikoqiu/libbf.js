import * as bfjs from "./bf.js";

/**
 * High-precision Numerical Integration using Romberg's Method.
 * 
 * This function estimates the definite integral of `f` over the interval `[_a, _b]` 
 * using Richardson extrapolation applied to the Trapezoidal rule.
 * It iteratively refines the interval width and the order of the polynomial approximation 
 * to achieve high precision with relatively few function evaluations.
 *
 * @param {Function} f - The integrand function.
 *        Must accept a BigFloat argument (x) and return a BigFloat result (f(x)).
 *
 * @param {number|string|BigFloat} _a - The lower limit of integration.
 * @param {number|string|BigFloat} _b - The upper limit of integration.
 *
 *
 * @param {Object} [info={}] - Configuration and Status object.
 *        Configures execution parameters and stores statistical data during/after execution.
 * @param {number} [info._e=1e-30] - Absolute Error Tolerance.
 *        The integration stops when the estimated absolute error falls below this threshold.

 * @param {number} [info._re=info._e] - Relative Error Tolerance.
 *        The integration stops when the estimated relative error falls below this threshold.
 *        (Condition: error <= _e || rerror <= _re)
 *        // --- Input Configuration Properties ---
 * @param {number} [info.max_step=25] - Maximum number of interval halving steps (rows in the Romberg table).
 *        Note: The number of function evaluations grows exponentially (2^steps).
 * @param {number} [info.max_acc=12] - Maximum extrapolation order (columns in the Romberg table).
 *        Limits the depth of Richardson extrapolation to prevent numerical instability from high-order polynomials.
 * @param {number} [info.max_time=60000] - Maximum execution time in milliseconds.
 * @param {Function} [info.cb] - Optional callback function executed after each row of the table is computed.
 * @param {boolean} [info.debug] - Optional flag to enable debug logging to the console.
 *
 *        // --- Output Status Properties (Updated during execution) ---
 * @param {BigFloat|null} info.result - The final calculated integral.
 *        Returns a BigFloat if converged, or null if failed.
 * @param {BigFloat} info.lastresult - The best estimate of the integral from the most recent iteration.
 * @param {string} info.eff_result - String representation of the result based on effective precision.
 * @param {number} info.steps - Current iteration number (row index `m`).
 *        Corresponds to dividing the interval into 2^(steps-1) segments.
 * @param {number} info.exectime - Elapsed execution time in milliseconds.
 * @param {BigFloat} info.error - Estimated absolute error.
 *        Calculated as the difference between the two most accurate extrapolations in the current row.
 * @param {BigFloat} info.rerror - Estimated relative error (`error / lastresult`).
 * @param {number} info.eff_decimal_precision - Estimated number of significant decimal digits.
 *        Calculated as `-log10(rerror)`.
 * @param {Function} info.toString - Helper method.
 *        Returns a formatted string containing steps, error, result, and execution time.
 *
 * @returns {BigFloat|null} 
 *        Returns the BigFloat integral value if tolerances are met.
 *        Returns `null` if `max_step` or `max_time` is reached without convergence.
 */
export function romberg(f,_a,_b,info={}){
    let max_step=info.max_step||25,
        max_acc=info.max_acc||12,
        max_time=info.max_time||60000;
    let _e  = info._e ?? 1e-30;
    let _re = info._re ?? _e;
    if(typeof(_e)!='number'|| typeof(_re)!='number' || typeof(info)!="object"){
        throw new Error("arguments error");
    }
    let start_time=new Date().getTime();
    info.toString=function(){
        return `lastresult=${this.lastresult}, 
        effective_result=${this.eff_result},
        steps=${this.steps}/${max_step}, 
        error=${this.error.toString(10,3)},
        rerror=${this.rerror.toString(10,3)},
        eff_decimal_precision=${this.eff_decimal_precision}, 	  
        exectime=${this.exectime}/${max_time}`
        };

    let a=bfjs.bf(_a),b=bfjs.bf(_b),e=bfjs.bf(_e),re=bfjs.bf(_re);

    let sign=b.cmp(a);
    if(sign<0){
        let tmp=a;
        a=b;
        b=tmp;
    }
    var updateInfo=()=>{
        if(info.rerror.isZero()){
            info.eff_decimal_precision=bfjs.decimal_precision();
        }else{
            info.eff_decimal_precision=Math.floor(-info.rerror.log().f64()/Math.log(10));
        }
        if(info.eff_decimal_precision<=0){
            info.eff_decimal_precision=0;
            info.eff_result='';
        }else{
            if(info.eff_decimal_precision>bfjs.decimal_precision()){
                info.eff_result=info.lastresult.toString(10);
            }else{
                info.eff_result=info.lastresult.toString(10,info.eff_decimal_precision);
            }		
        }
    };

    const f0p5=bfjs.bf(0.5);  
    const b_a_d=b.sub(a).mul(f0p5);
    let T=[0,b_a_d.mul(f(a).add(f(b)))];
    for(let m=2;m<=max_step;++m){  
        let Tm=[];    
        let sum=bfjs.bf(0);
        for(let i=0;i<2**(m-2)/*do not overflow*/;++i){
        sum.setadd(sum,f(a.add(b_a_d.mul(i*2+1))));
        }
        Tm[1]=T[1].mul(f0p5).add(b_a_d.mul(sum));
        b_a_d.setmul(b_a_d,f0p5);
        for(let j=2;j<=max_acc && j<=m;++j){
        let c=bfjs.bf(4**(j-1)),c1=bfjs.bf(4**(j-1)-1);
        Tm[j]=Tm[j-1].mul(c).sub(T[j-1]).div(c1);
        }
        let err=Tm[Tm.length-1].sub(T[T.length-1]).abs();
        let rerr;
        if(!Tm[Tm.length-1].isZero()){
            rerr=err.div(Tm[Tm.length-1].abs());
        }else{
            rerr=err;
        }
        if(!!info.debug && m>5){    	
            console.log('R['+m+']='+Tm[4]);
            console.log(err.toString(10,3));
        }

        info.exectime=new Date().getTime()-start_time;
        info.lastresult=Tm[Tm.length-1];
        if(sign<0){
            info.lastresult=info.lastresult.neg();
        }
        info.steps=m;
        info.error=err;
        info.rerror=rerr; 

        if(m>5 && (err.cmp(e)<=0 || rerr.cmp(re)<=0)){
            info.result=info.lastresult;
            updateInfo();
            return info.result;
        }else if(m==max_step || info.exectime>max_time){
            updateInfo();
            info.result=null;
            return info.result;
        }

        if(info.cb){
            updateInfo();
            info.cb();
        }
        T=Tm;
    }
}

export {romberg as integral};