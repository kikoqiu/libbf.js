/*
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
#include <stdlib.h>
#include <stdio.h>
#include <inttypes.h>
#include <math.h>
#include <string.h>
#include <sys/time.h>

#include "libbf.h"

#ifndef EM_PORT_API
#   if defined(__EMSCRIPTEN__)
#       include <emscripten.h>
#       if defined(__cplusplus)
#           define EM_PORT_API(rettype) extern "C" rettype EMSCRIPTEN_KEEPALIVE
#       else
#           define EM_PORT_API(rettype) rettype EMSCRIPTEN_KEEPALIVE
#       endif
#   else
#       if defined(__cplusplus)
#           define EM_PORT_API(rettype) extern "C" rettype
#       else
#           define EM_PORT_API(rettype) rettype
#       endif
#   endif
#endif


static bf_context_t bf_ctx;


static void *my_bf_realloc(void *opaque, void *ptr, size_t size)
{
	if(ptr && size<=0){
		free(ptr);
		return 0;
	}
    return realloc(ptr, size);
}


EM_PORT_API (void) init_context_() {
    bf_context_init(&bf_ctx, my_bf_realloc, NULL);
}
EM_PORT_API (const bf_t*) new_(int ref) {
    bf_t *ret=realloc(0, sizeof(bf_t));
	bf_init(&bf_ctx,ret);
	return ret;
}
EM_PORT_API (void) delete_(bf_t* bf) {
	bf_delete(bf);
	free(bf);//realloc(bf,0);
}



EM_PORT_API (int) is_finite_(const bf_t* bf) {
	return bf_is_finite(bf);
}
EM_PORT_API (int) is_nan_(const bf_t* bf) {
	return bf_is_nan(bf);
}
EM_PORT_API (int) is_zero_(const bf_t* bf) {
	return bf_is_zero(bf);
}


EM_PORT_API (int) set_(bf_t* r,const bf_t *a) {
	return bf_set(r,a);
}
EM_PORT_API (int) set_number_(bf_t* a,double b) {
	return bf_set_float64(a,b);
}
EM_PORT_API (double) get_number_(const bf_t* a, bf_rnd_t rnd_mode) {
	double ret=NAN;
	bf_get_float64(a,&ret,rnd_mode);
	return ret;
}
EM_PORT_API (int) cmp_(const bf_t* a,const bf_t *b) {
	return bf_cmp(a,b);
}

/* number of bits per base 10 digit */
#define BITS_PER_DIGIT 3.32192809488736234786
EM_PORT_API (double) bits_(double n_digits) {
	return ceil(n_digits * BITS_PER_DIGIT);
}


EM_PORT_API (int) calc(char method,bf_t* r,bf_t* a, bf_t *b ,double prec, bf_flags_t flags) {
	switch(method){
		case '+':
			return bf_add(r,a,b,prec,flags);
		case '-':
			return bf_sub(r,a,b,prec,flags);
		case '*':
			return bf_mul(r,a,b,prec,flags);
		case '/':
			return bf_div(r,a,b,prec,flags);		
		case '|':
			return bf_logic_or(r,a,b);
		case '^':
			return bf_logic_xor(r,a,b);
		case '&':
			return bf_logic_and(r,a,b);
		
		case 's':
			return bf_sqrt(r,a,prec,flags);			
		case 'm':
			return bf_sqrtrem(r,a,b);			
		case 'r':
			return bf_round(r,prec,flags);
		case 'i':
			return bf_rint(r,flags);
		case 'n':
			bf_neg(r);
			return 0;
		case 'b':
			r->sign = 0;
			return 0;
		case 'g':
			 if (bf_is_nan(a) || bf_is_zero(a)) {
				bf_set(r, a);
			} else {
				bf_set_si(r, 1 - 2 * a->sign);
			}
			return 0;
		/* transcendental functions */
		case '2':
			return bf_const_log2(r,prec,flags);
		case '3':
			return bf_const_pi(r,prec,flags);
		case 'E':
			return bf_exp(r,a,prec,flags);
		case 'L':
			return bf_log(r,a,prec,flags);
		case 'P':
			return bf_pow(r,a,b,prec,flags);
		case 'C':
			return bf_cos(r,a,prec,flags);
		case 'S':
			return bf_sin(r,a,prec,flags);
		case 'T':
			return bf_tan(r,a,prec,flags);
		case '4':
			return bf_atan(r,a,prec,flags);
		case '5':
			return bf_atan2(r,a,b,prec,flags);
		case '6':
			return bf_asin(r,a,prec,flags);
		case '7':
			return bf_acos(r,a,prec,flags);		
			
			
		case 'z': /* MIN_VALUE */
		case 'Z': /* MAX_VALUE */
			{
				slimb_t e_range, e;
				e_range = (limb_t)1 << (bf_get_exp_bits(flags) - 1);
				bf_set_ui(r, 1);
				if (method == 'z') {
					e = -e_range + 2;
					if (flags & BF_FLAG_SUBNORMAL)
						e -= prec - 1;
					bf_mul_2exp(r, e, prec, flags);
				} else {
					bf_mul_2exp(r, prec, prec,
								flags);
					bf_add_si(r, r, -1, prec, flags);
					bf_mul_2exp(r, e_range - prec, prec,flags);
				}
			}
			return 0;
		case 'y': /* EPSILON */
			bf_set_ui(r, 1);
			bf_mul_2exp(r, 1 - prec,prec, flags);
			return 0;
	} 
	return BF_ST_INVALID_OP;
}



EM_PORT_API (int) calc2(char method,bf_t* r,bf_t* a, bf_t *b ,double prec, bf_flags_t flags, int rnd_mode,bf_t* q) {
	switch(method){	
		case '%':
			return bf_rem(r,a,b,prec,flags,rnd_mode);	
		case 'd':
			return bf_divrem(q,r,a,b,prec,flags,rnd_mode);
		/*case 'q':
			return bf_remquo(pq,r,a,b,prec,flags,rnd_mode);*/
	} 
	return BF_ST_INVALID_OP;
}


EM_PORT_API(int) atof_(bf_t *a, const char *str, int radix,
            double prec, bf_flags_t flags){
	return bf_atof(a,str,0,radix,prec,flags);
}

/*EM_PORT_API(int) atoi_(bf_t *a, const char *str, int radix,
            double prec, bf_flags_t flags){
	slimb_t expo;
	return bf_atof2(a,&expo,str,0,radix,BF_PREC_INF,flags|BF_ATOF_EXPONENT);
}*/
	
EM_PORT_API(char *)ftoa_(size_t *plen, const bf_t *a, int radix, double prec,
              bf_flags_t flags){
	return bf_ftoa(plen,a,radix,prec,flags);
}



