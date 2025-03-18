function isASN(asn_string) {
	if(typeof asn_string !== "string")
		return false;

	let asn_split = asn_string.split(".");
	if((asn_split.length === 1) && (asn_split[0] !== "") && (!isNaN(asn_split[0])) && (asn_split[0] >= 0) && (asn_split[0] < (65536*65536)))
		return true;
	if((asn_split.length === 2) && 
		(!isNaN(asn_split[0])) && (asn_split[0] >= 0) && (asn_split[0] < 65536) && 
		(!isNaN(asn_split[1])) && (asn_split[1] >= 0) && (asn_split[1] < 65536))
		return true;

	return false;
}

function isIPv4Address(ip_string) {
	if(typeof ip_string !== "string")
		return false;

	// Split per octet
	let ip_split =	ip_string.split(".");
	if(ip_split.length !== 4)
		return false;

	// Check if every part is a number between 0 and 255
	for(let x = 0; x < 4; x++) {
		if((ip_split[x] === "") || isNaN(ip_split[x]) || (ip_split[x] < 0) || (ip_split[x] > 255))
			return false;
	}

	return true;
}

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

function isIPv6Address(ip_string) {
	let ip_doublesplit = ip_string.split("::")

	if(ip_doublesplit.length === 1) {
		// In this case, there is no :: so it's an unpacked IPv6. Expect 8 digits
		let ip = ipv6SectionToList(ip_doublesplit[0]);
		if((ip === undefined) || (ip.length != 8))
			return false;

		return true;
	}
	else if (ip_doublesplit.length === 2) {
		// Packed IPv6. ceck left and right sides
		let left = ipv6SectionToList(ip_doublesplit[0]);
		let right = ipv6SectionToList(ip_doublesplit[1]);

		if((left === undefined) || (right === undefined) || (left.length + right.length > 8))
			return false;

		return true;
	}

	return false;
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

function check_ifnaming(value) {
    // Function to check if a string is a valid ifnaming representation (eg Ethernet{1-32}/{1-4} )
    if(resolve_ifnaming(value) == null)
        return false
    return true;
}

function resolve_ifnaming_addstring(current, newstring) {
    let result = [];
    for (let x = 0; x < current.length; x++) {
        result.push(current[x] + newstring);
    }

    return result;
}

function resolve_ifnaming_addrange(current, range) {
    let result = [];

    for (let x = 0; x < current.length; x++) {
        for(let y = range[0]; y < (range[1]+1); y++)
            result.push(current[x] + y);
    }

    return result;
}

function resolve_ifnaming(value) {
    // Function to check if a string is a valud ifnaming representation (eg Ethernet{1-32}/{1-4} )
    let stringsplit = [""];
    let mode = 1;
    let tempstring = "";
    let tempnum = 0;
    let lownum = 0;
    for(let x = 0; x < value.length; x++) {
        let charcode = value.charCodeAt(x);
        if (mode == 1) {
            if(value[x] === "{") {
                stringsplit = resolve_ifnaming_addstring(stringsplit, tempstring);
                tempstring = "";
                mode = 2;
                continue
            }

            if( !((charcode > 32) && (charcode < 48)) &&
                !((charcode > 57) && (charcode < 127))
                )
                return null;

            tempstring = tempstring + value[x];
        }
        else if(mode == 2) {
            if(value[x] == "-") {
                mode = 3;
                lownum = tempnum;
                tempnum = 0;
            }
            else if( !((charcode > 47) && (charcode < 58))) {
                return null;
            }
            else
                tempnum = tempnum*10+charcode - 48;
        }
        else if(mode == 3) {
            if(value[x] == "}") {
                if(lownum > tempnum)
                    return null;
                mode = 1;
                stringsplit = resolve_ifnaming_addrange(stringsplit, [lownum, tempnum]);
                tempnum = 0;
            }
            else if( !((charcode > 47) && (charcode < 58))) {
                return null;
            }
            else
                tempnum = tempnum*10+charcode - 48;
        }
    }

    if(mode != 1)
        return null;

    stringsplit = resolve_ifnaming_addstring(stringsplit, tempstring);

    return stringsplit;
}

function resolve_dev_ifnaming(ifnaming) {
	if (! Array.isArray(ifnaming))
		return null;

	let result = [];
	for(let x = 0; x < ifnaming.length; x++) {
		let partial = resolve_ifnaming(ifnaming[x]);
		if(partial == null)
			return null;
		result = result + partial;
	}

	return result;
}

module.exports = {
	isASN: isASN,
	isIPv4Address: isIPv4Address,
	getIPv4Interface: getIPv4Interface,
	isIPv6Address: isIPv6Address,
	getIPv6Interface: getIPv6Interface,
	resolve_ifnaming: resolve_ifnaming,
	resolve_dev_ifnaming: resolve_dev_ifnaming,
	check_ifnaming: check_ifnaming,
};