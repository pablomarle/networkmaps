function shapetools_rotate_x(vertex, angle) {
    let angle_rad = angle/180 * Math.PI;
    let y = vertex[1] * Math.cos(angle_rad) - vertex[2] * Math.sin(angle_rad);
    let z = vertex[1] * Math.sin(angle_rad) + vertex[2] * Math.cos(angle_rad);
    vertex[1] = y;
    vertex[2] = z;
}

function shapetools_rotate_y(vertex, angle) {
    let angle_rad = angle/180 * Math.PI;
    let x = vertex[0] * Math.cos(angle_rad) - vertex[2] * Math.sin(angle_rad);
    let z = vertex[0] * Math.sin(angle_rad) + vertex[2] * Math.cos(angle_rad);
    vertex[0] = x;
    vertex[2] = z;
}

function shapetools_rotate_z(vertex, angle) {
    let angle_rad = angle/180 * Math.PI;
    let x = vertex[0] * Math.cos(angle_rad) - vertex[1] * Math.sin(angle_rad);
    let y = vertex[0] * Math.sin(angle_rad) + vertex[1] * Math.cos(angle_rad);
    vertex[0] = x;
    vertex[1] = y;
}

function shapetools_translate(vertex, px, py, pz) {
    vertex[0] += px;
    vertex[1] += py;
    vertex[2] += pz;
}

function shapetools_generate_as_vertexlist(element) {
    if(element.type === "vertex_list") {
        return element;
    }
    else if(element.type === "cube") {
        return shapetools_generate_cube_as_vertexlist(element)
    }

    else {
        return {
            type: "vertex_list",
            v: [],
            f: [],
            uv: [],
        }
    }
}

function shapetools_generate_cube_as_vertexlist(element) {
    let result = {
        type: "vertex_list",
        v: [],
        f: [],
        uv: [],
    }

    let x1 = -element.sx/2;
    let y1 = 0;
    let z1 = -element.sz/2;
    let x2 = element.sx/2;
    let y2 = element.sy;
    let z2 = element.sz/2;
    
    result.v.push([x1, y1, z1]);
    result.v.push([x2, y1, z1]);
    result.v.push([x2, y1, z2]);
    result.v.push([x1, y1, z2]);
    result.v.push([x1, y2, z1]);
    result.v.push([x2, y2, z1]);
    result.v.push([x2, y2, z2]);
    result.v.push([x1, y2, z2]);

    for(let vertex of result.v) {
        shapetools_rotate_z(vertex, element.rz);
        shapetools_rotate_x(vertex, element.rx);
        shapetools_rotate_y(vertex, element.ry);
        shapetools_translate(vertex, element.px, element.py, element.pz);
    }

    result.f.push([0, 5, 1])
    result.f.push([0, 4, 5])
    result.f.push([1, 6, 2])
    result.f.push([1, 5, 6])
    result.f.push([2, 7, 3])
    result.f.push([2, 6, 7])
    result.f.push([3, 4, 0])
    result.f.push([3, 7, 4])
    result.f.push([3, 1, 2])
    result.f.push([3, 0, 1])
    result.f.push([4, 6, 5])
    result.f.push([4, 7, 6])

    for(let x = 0; x < 6; x++) {
        result.uv.push([ [element.u1, element.v1], [element.u2, element.v2], [element.u2, element.v1]])
        result.uv.push([ [element.u1, element.v1], [element.u1, element.v2], [element.u2, element.v2]])
    }

    return result;
}