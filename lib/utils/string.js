function multiIndexOf(s, m) {
    let result = [];
    let i = s.indexOf(m);
    while(i !== -1) {
        result.push(i);
        i = s.indexOf(m, i+1);
    }
    return result;
}

function findLineWith(s, m, i_start, i_end) {
    let lindex = s.indexOf(m, i_start);
    if((lindex === -1) || (lindex >= i_end))
        return null;
    let lindex_end = s.indexOf("\r\n", lindex);
    if(lindex_end === -1)
        lindex_end = i_end;
    return s.substring(lindex, lindex_end);
}

function removeDoubleQuote(s) {
    if(s.length === 0) return s;
    if(s[0] === "\"") {
        if((s.length > 2) && (s[s.length-1] === "\""))
            return s.substr(1, s.length-2);
        return null;
    }
    return s;
}

module.exports = {
    multiIndexOf,
    findLineWith,
    removeDoubleQuote
};