const { multiIndexOf, findLineWith, removeDoubleQuote } = require('./string');

function findContent(s, i_start, i_end) {
    let lindex = s.indexOf("\r\n\r\n");
    if((lindex === -1) || (lindex >= i_end))
        return null;
    return lindex + 4;
}

function process_multipart_formdata(content_type, body) {
    let result = {};

    if(content_type === undefined)
        return null;
    
    let sct = content_type.split(";");
    if((sct.length < 2) || (sct[0] !== "multipart/form-data"))
        return null;

    let boundary = null;
    for(let x = 0; x < sct.length; x++) {
        let sct_2 = sct[x].trim().split("=");
        if((sct_2.length === 2) && (sct_2[0] === "boundary"))
            boundary = sct_2[1];
    }
    if(boundary === null) return null;

    let boundary_index = multiIndexOf(body, "--" + boundary);
    for(let x = 0; x < boundary_index.length-1; x++) {
        // Find file name and parameter name in content-disposition
        let filename = null, name = null;
        let cd = findLineWith(body, "Content-Disposition: form-data", boundary_index[x], boundary_index[x+1]);
        let scd = cd.split(";");
        for(let y = 1; y < scd.length; y++) {
            let scd_2 = scd[y].trim().split("=");
            if((scd_2.length === 2) && (scd_2[0] === "filename"))
                filename = removeDoubleQuote(scd_2[1]);
            if((scd_2.length === 2) && (scd_2[0] === "name"))
                name = removeDoubleQuote(scd_2[1]);
        }
        if(name === null)
            return null;

        // Find the start and end index of the file contents
        let cindex = findContent(body, boundary_index[x], boundary_index[x+1]);

        result[name] = {
            filename: filename,
            content_index_start: cindex,
            content_index_end: boundary_index[x+1] - 2,
        }
    }

    return result;
}

module.exports = {
    process_multipart_formdata,
    findContent
};