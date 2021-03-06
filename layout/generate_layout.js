// Script to generate layout JSON for Cosmic Praise from CAD model coordinates
//
// usage: node generate_layout.js > cosmicpraise.json

var lightTypes = [
    { 
    	group: "base", 
		proto: "kinet", addresses: ["10.0.0.21:6038", "10.0.0.22:6038"], // 2x PDS-500e
	startangle: -Math.PI/8,
      	quad: [[0.052, 0.862, 3.986], [0.02, 1.788, 0], [ 0.482, 1.72, 0 ], [0.27, 0.819, 3.986]], pixels: 1, radialrepeat: 24 
    },
	{ 
		group: "middle-cw", 
		proto: "opc", address: "10.0.0.31:7890", // Beaglebone #1 (Tower Floor)
		ports: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
	  	p0: [0.016, 0.855, 4.143], p1: [-0.82, 0.254, 7.713], pixels: 113, radialrepeat: 12 
	},
	{ 
		group: "middle-ccw", 
		proto: "opc", address: "10.0.0.31:7890", // Beaglebone #1 (Tower Floor)
		ports: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
	  	p0: [0.016, 0.855, 4.143], p1: [0.824, 0.238, 7.702], pixels: 113, radialrepeat: 12 
	},
	{ 
		group: "interior", 
		proto: "opc", address: "10.0.0.31:7890", // Beaglebone #1 (Tower Floor)
		ports: [25, 26, 27],
	  	p0: [0, 0.4, 0], p1: [0, -0.4, 0], pixels: 113, radialrepeat: 3
	},
	{ 
		group: "top-cw", 
		proto: "opc", address: "10.0.0.32:7890", // Beaglebone #2 (Lantern Floor)
		startangle: Math.PI * 1 / 3 - 0.03,
                ports: [22, 20, 19, 16, 14, 12, 11, 8, 6, 4, 3, 0],
	  	p0: [0.552, 0.956, 8.875], p1: [0.582, 0.607, 7.702], pixels: 40, radialrepeat: 12 
	},
	{ 
		group: "top-ccw", 
		proto: "opc", address: "10.0.0.32:7890", // Beaglebone #2 (Lantern Floor)
		startangle: Math.PI * 1 / 2 + 0.03,
                ports: [23, 21, 18, 17, 15, 13, 10, 9, 7, 5, 2, 1],
	  	p0: [0.956, 0.552, 8.875], p1: [0.607, 0.582, 7.702], pixels: 40, radialrepeat: 12 
	},
	{ 
		group: "roofline-even", 
		proto: "opc", address: "10.0.0.32:7890", // Beaglebone #2 (Lantern Floor)
                startangle: 2.1,
		ports: [35, 28, 25],
	  	p0: [-1.204, -0.68, 11.261], p1: [-1.204, 0.68, 11.261], pixels: 70, radialrepeat: 3, arch: 0.5 
	},
	{ 
		group: "roofline-odd", 
		proto: "opc", address: "10.0.0.32:7890", // Beaglebone #2 (Lantern Floor)
                startangle: 2.1,
		ports: [33, 30, 27],
	  	p0: [ -1.1909, -0.7027, 11.261 ], p1: [ -0.0131, -1.3827, 11.261 ], pixels: 70, radialrepeat: 3, arch: 0.5 
	}, 
	{ 	group: "spire", 
		proto: "opc", address: "10.0.0.32:7890", // Beaglebone #2 (Lantern Floor)
		ports: [45, 46, 44, 47],
	  	p0: [0, 0.159, 12.7], pixels: 1, radialrepeat: 30, zrepeat: 16, striplength: 120
	}, 
    { 
    	group: "railing", 
    	proto: "kinet", addresses: ["10.0.0.41:6038", "10.0.0.42:6038"], // 2x PDS-150e
    	startangle: 1.5,
      	quad: [[-1.204, 0.324, 10.011], [-1.204, 0.324, 9.301], [-1.244, 0, 9.301], [-1.244, 0, 10.011]], pixels: 1, radialrepeat: 24 
    },
    { 
    	group: "spotlight", 
    	proto: "kinet", address: "10.0.0.51:6038", // CK Data Enabler
      	point: [0, 0, 12.25], size: 0.4, pixels: 1, radialrepeat: 1 
    }
];

var pixelsPerStrip = 120

var center = [0, 0, 0];

var points = [];

function lerp(a, b, s) {
	return a + (b - a) * s;
}

function lerp3(va, vb, s) {
	return [lerp(va[0], vb[0], s), lerp(va[1], vb[1], s), lerp(va[2], vb[2], s)];
}

function rotate(v, r, center) {
	var d = [v[0] - center[0], v[1] - center[1], v[2] - center[2]];
	var s = Math.sin(r);
	var c = Math.cos(r);

	// rotate around z-axis
	var dn = [d[0] * c - d[1] * s, d[0] * s + d[1] * c, d[2]];
	return [dn[0] + center[0], dn[1] + center[1], dn[2] + center[2]];
}

for (var tt = 0; tt < lightTypes.length; tt++) {
	var type = lightTypes[tt];
	var rrepeat = type.radialrepeat ? type.radialrepeat : 1;
	var zrepeat = type.zrepeat ? type.zrepeat : 1;

	for (var zz = 0; zz < zrepeat; zz++) {
		for (var ii = 0; ii < rrepeat; ii++) {
			var r = ii * Math.PI * 2 / rrepeat + ("startangle" in type ? type.startangle : 0);
			for (var pp = 0; pp < type.pixels; pp++) {
				var item = {
					group: type.group,
					protocol: type.proto
				};

				var address = "127.0.0.1:7890";
				if ("address" in type) {
					address = type.address;
				} else if ("addresses" in type) {
					var addrindex = Math.floor(type.addresses.length * (zz * rrepeat + ii) / (zrepeat * rrepeat));
					address = type.addresses[addrindex];
				}
				item.address = address;

				if (type.proto == "opc") {
					var port = 0;
					if ("port" in type) {
						port = type.port;
					} else if ("ports" in type) {
						var portindex = Math.floor(type.ports.length * (zz * rrepeat + ii) / (zrepeat * rrepeat));
						port = type.ports[portindex];
					}
					item.strip = port;
					pixelIndex = pp;
					if ("striplength" in type && type.striplength != type.pixels) {
						pixelIndex = (zz * rrepeat * type.pixels + ii * type.pixels + pp) % type.striplength;
					}
					item.index = port * pixelsPerStrip + pixelIndex;
				} else if (type.proto == "kinet") {
					if ("address" in type) {
						item.index = zz * rrepeat + ii;
					} else if ("addresses" in type) {
						// do a bunch of unnecessary math because Chooch is playing the Spin Doctors and I can't think straight
						//var pixelsPerAddress = zrepeat * rrepeat / type.addresses.length;
						var overallIndex = zz * rrepeat + ii;
						//var addrindex = Math.floor(type.addresses.length * (zz * rrepeat + ii) / (zrepeat * rrepeat));
						//item.index = overallIndex - pixelsPerAddress * addrindex;
                                                item.index = overallIndex
					}
				}

				if ("p0" in type) {
					var p;
					var p0 = rotate(type.p0, r, center);
					if ("p1" in type) {
						var p1 = rotate(type.p1, r, center);
						p = lerp3(p0, p1, pp / type.pixels);
					} else {
						p = p0;
					}
					p[2] = p[2] + 0.15 * zz;
					if ("arch" in type) {
						p[2] = p[2] + (1 - Math.abs(pp - type.pixels/2) / type.pixels/2) * type.arch;
					}
					item.point = p;
				}
				if ("point" in type) {
					item.point = rotate(type.point, r, center);
				}
				if ("quad" in type) {
					item.quad = [
						rotate(type.quad[0], r, center),
						rotate(type.quad[1], r, center),
						rotate(type.quad[2], r, center),
						rotate(type.quad[3], r, center),
					];
				}
				if ("size" in type) {
					item.size = type.size;
				}

				points.push(item);
			}
		}
	}
}

console.log(JSON.stringify(points, null, '\t'));
