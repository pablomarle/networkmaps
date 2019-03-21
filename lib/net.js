function getIPv4Interface(ip_string) {
	if(typeof(ip_string) !== "string")
		return undefined;

	// Split on ip/mask
	let ip_mask_split = ip_string.split("/");
	if(ip_mask_split.length !== 2)
		return undefined;

	// Check the mask is valid
	let mask = ip_mask_split[1];
	if(isNaN(mask) || (mask < 0) || (mask > 32))
		return undefined
	mask = parseInt(mask);

	// Check if ip is valid
	let ip_split =	ip_mask_split[0].split(".");
	if(ip_split.length !== 4)
		return undefined;

	let ip = []

	for(let x = 0; x < 4; x++) {
		if(isNaN(ip_split[x]) || (ip_split[x] < 0) || (ip_split[x] > 255))
			return undefined

		ip.push(parseInt(ip_split[x]));
	}

	return {ip: ip, mask: mask}
}

function ipv6SectionToList(ipv6_section_string) {
	if(ipv6_section_string === "")
		return [0];

	let section = [];

	let ip_split = ipv6_section_string.split(":");

	for(let x = 0; x < ip_split.length; x++) {
		let hexnum = "0x" + ip_split[x];
		if(isNaN(hexnum) || (hexnum < 0) || (hexnum > 0xffff))
			return undefined

		section.push(parseInt(hexnum));
	}

	return section;
}

function getIPv6Interface(ip_string) {
	if(typeof(ip_string) !== "string")
		return undefined;

	// Split on ip/mask
	let ip_mask_split = ip_string.split("/");
	if(ip_mask_split.length !== 2)
		return undefined;

	// Check the mask is valid
	let mask = ip_mask_split[1];
	if(isNaN(mask) || (mask < 0) || (mask > 128))
		return undefined
	mask = parseInt(mask);

	let ip_doublesplit = ip_mask_split[0].split("::")

	if(ip_doublesplit.length === 1) {
		// In this case, there is no :: so it's an unpacked IPv6. Expect 8 digits
		let ip = ipv6SectionToList(ip_doublesplit[0]);
		if((ip === undefined) || (ip.length != 8))
			return undefined;

		return {ip: ip, mask: mask}
	}
	else if (ip_doublesplit.length === 2) {
		// Packed IPv6. ceck left and right sides
		let left = ipv6SectionToList(ip_doublesplit[0]);
		let right = ipv6SectionToList(ip_doublesplit[1]);

		if((left === undefined) || (right === undefined) || (left.length + right.length > 8))
			return undefined;

		let ip = [];
		for(let x = 0; x < left.length; x++)
			ip.push(left[x]);
		for(let x = 0; x < 8-(left.length + right.length); x++)
			ip.push(0);
		for(let x = 0; x < right.length; x++)
			ip.push(right[x]);

		return {ip: ip, mask: mask}
	}

	return undefined;
}

module.exports = {
	getIPv4Interface: getIPv4Interface,
	getIPv6Interface: getIPv6Interface,
};