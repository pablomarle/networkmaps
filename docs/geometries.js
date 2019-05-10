// Collection of functions to generate geometries

function createPrysm() {
	let steps = 32;
	let v = [];
	let f = [];
	let uv = [];

	for(let x = 0; x < steps+1; x++) {
		let a_i = -x * 2 * Math.PI / steps;
		v.push([
			.5 * Math.cos(a_i),
			0,
			.5 * Math.sin(a_i)
		]);
	}
	for(let x = 0; x < steps+1; x++) {
		let a_i = -x * 2 * Math.PI / steps;
		v.push([
			0,
			1,
			0
		]);
	}

	for(let x = 0; x < steps; x++) {
		f.push([x, x+1, (steps+1)+x+1]);
		f.push([x, (steps+1)+x+1, (steps+1)+x]);
		uv.push([[x/steps, 1], [(x+1)/steps, 1], [(x+1)/steps, 0]])
		uv.push([[x/steps, 1], [(x+1)/steps, 0], [x/steps, 0]])
	}
	for(let x = 2; x < steps; x++) {
		f.push([0, x, x-1]);
		uv.push([[0,0],[0,0],[0,0]]);
	}
	return {
		v: [v],
		f: [f],
		uv: [uv]
	}
}

function createSphere() {
	let v = [];
	let f = [];
	let uv = [];
	let steps = 16; 
	for(let j = 0; j < ((steps/2)+1); j++) {
		let a_j = Math.PI/2 - j*2*Math.PI / steps
		for(let i = 0; i < steps + 1; i++) {
			let a_i = -i * 2 * Math.PI / steps;
			v.push([
				.5 * Math.cos(a_i) * Math.cos(a_j),
				.5 + -.5 * Math.sin(a_j),
				.5 * Math.sin(a_i) * Math.cos(a_j)
			])
		}
	}

	for(let j = 0; j < ((steps/2)); j++) {
		for(let i = 0; i < steps; i++) {
			f.push([j*(steps+1)+i, j*(steps+1)+i+1, (j+1)*(steps+1)+i+1]);
			f.push([j*(steps+1)+i, (j+1)*(steps+1)+i+1, (j+1)*(steps+1)+i]);
			uv.push([ 
				[i/steps+.5, j*2/steps], 
				[(i+1)/steps+.5, j*2/steps], 
				[(i+1)/steps+.5, (j+1)*2/steps] 
				]);
			uv.push([ 
				[i/steps+.5, j*2/steps], 
				[(i+1)/steps+.5, (j+1)*2/steps], 
				[i/steps+.5, (j+1)*2/steps] 
				]);
		}
	}


	return {
		v: [v],
		f: [f],
		uv: [uv]
	}
}

function add(target, source) {
	if((source.v.length == 2) && (target.v.length == 1)) {
		target.v.push([]);
		target.f.push([]);
		target.uv.push([]);
	}
	if((target.v.length == 2) && (source.v.length == 1)) {
		source.v.push([]);
		source.f.push([]);
		source.uv.push([]);
	}

	for(let y = 0; y < source.v.length; y++) {
		let base_index = target.v[y].length;

		for(let x = 0; x < source.v[y].length; x++) {
			target.v[y].push(source.v[y][x]);
		}
		for(let x = 0; x < source.f[y].length; x++) {
			target.f[y].push([base_index + source.f[y][x][0], base_index + source.f[y][x][1], base_index + source.f[y][x][2]]);
		}
		for(let x = 0; x < source.uv.length; x++) {
			target.uv[y].push(source.uv[y][x]);
		}
	}

	return target;
}