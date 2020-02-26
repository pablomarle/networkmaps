function $WGL_V3(x,y,z) {return [x,y,z]}
function $WGL_F3(x,y,z) {return [x,y,z]}
function $WGL_V2(x,y) {return [x,y]}

function updateDeviceLBGeometry(meshgroup, base_sx, base_sy, base_sz, back_factor_x, back_factor_y) {
		let v1 = [];
		let f1 = [];
		let uv1 = [];
		let v2 = [];
		let f2 = [];
		let uv2 = [];
		let sx = 1, h = 1, sz = 1;
		let fxt = (1-back_factor_x)*.5;
		v1.push($WGL_V3(-sx*.45, h, sz*.45)); 
		v1.push($WGL_V3(sx*.45, h, sz*.45)); 
		v1.push($WGL_V3(sx*.45*back_factor_x, h*back_factor_y, -sz*.45)); 
		v1.push($WGL_V3(-sx*.45*back_factor_x, h*back_factor_y, -sz*.45))
		f1.push($WGL_F3(0,1,2)); f1.push($WGL_F3(0,2,3))
		uv1.push([$WGL_V2(0,1), $WGL_V2(1,1), $WGL_V2(1-fxt,0)])
		uv1.push([$WGL_V2(0,1), $WGL_V2(1-fxt,0), $WGL_V2(fxt,0)])
		v1.push($WGL_V3(-sx*.45, 0, sz*.45))
		v1.push($WGL_V3(sx*.45, 0, sz*.45))
		v1.push($WGL_V3(sx*.45*back_factor_x, h*(1-back_factor_y), -sz*.45))
		v1.push($WGL_V3(-sx*.45*back_factor_x, h*(1-back_factor_y), -sz*.45))
		f1.push($WGL_F3(4,6,5)); f1.push($WGL_F3(4,7,6))
		uv1.push([$WGL_V2(0,1), $WGL_V2(1-fxt,0), $WGL_V2(1,1)])
		uv1.push([$WGL_V2(0,1), $WGL_V2(fxt,0), $WGL_V2(1-fxt,0)])

		v2.push($WGL_V3(-sx*.45, h, sz*.45)); 
		v2.push($WGL_V3(sx*.45, h, sz*.45)); 
		v2.push($WGL_V3(sx*.45*back_factor_x, h*back_factor_y, -sz*.45)); 
		v2.push($WGL_V3(-sx*.45*back_factor_x, h*back_factor_y, -sz*.45))
		v2.push($WGL_V3(-sx*.5, h, sz*.5)); 
		v2.push($WGL_V3(sx*.5, h, sz*.5)); 
		v2.push($WGL_V3(sx*.5*back_factor_x, h*back_factor_y, -sz*.5)); 
		v2.push($WGL_V3(-sx*.5*back_factor_x, h*back_factor_y, -sz*.5))
		v2.push($WGL_V3(-sx*.5, 0, sz*.5)); 
		v2.push($WGL_V3(sx*.5, 0, sz*.5)); 
		v2.push($WGL_V3(sx*.5*back_factor_x, h*(1-back_factor_y), -sz*.5)); 
		v2.push($WGL_V3(-sx*.5*back_factor_x, h*(1-back_factor_y), -sz*.5))
		v2.push($WGL_V3(-sx*.45, 0, sz*.45)); 
		v2.push($WGL_V3(sx*.45, 0, sz*.45)); 
		v2.push($WGL_V3(sx*.45*back_factor_x, h*(1-back_factor_y), -sz*.45)); 
		v2.push($WGL_V3(-sx*.45*back_factor_x, h*(1-back_factor_y), -sz*.45))
		for(let x = 0; x < 12; x+=4) {
			f2.push($WGL_F3(x+0,x+5,x+1)); f2.push($WGL_F3(x+0,x+4,x+5))
			f2.push($WGL_F3(x+1,x+6,x+2)); f2.push($WGL_F3(x+1,x+5,x+6))
			f2.push($WGL_F3(x+2,x+7,x+3)); f2.push($WGL_F3(x+2,x+6,x+7))
			f2.push($WGL_F3(x+3,x+4,x+0)); f2.push($WGL_F3(x+3,x+7,x+4))
			if(x == 4) {
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,h), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sx,h)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,h), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sz,h)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,h), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sx,h)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,h), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,h), $WGL_V2(sz,h)])
			}
			else {
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,sz*.05), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sz*.05),  $WGL_V2(sx,sz*.05)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,sx*.05), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sx*.05),  $WGL_V2(sz,sx*.05)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sx,sz*.05), $WGL_V2(sx,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sz*.05),  $WGL_V2(sx,sz*.05)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(sz,sx*.05), $WGL_V2(sz,0)])
				uv2.push([$WGL_V2(0,0), $WGL_V2(0,sx*.05),  $WGL_V2(sz,sx*.05)])
			}
		}
		return {v1: v1, f1:f1, uv1: uv1, v2: v2, f2:f2, uv2: uv2}
}