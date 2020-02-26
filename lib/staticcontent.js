const fs = require('fs').promises;

function find_content_type(path) {
	let path_split = path.split("/");
	let filename = path_split[path_split.length-1];
	let file_extension = filename.split(".");
	let extension = "bin";
	if(file_extension.length > 1)
		extension = file_extension[file_extension.length-1];
	let content_type = "application/octet-stream";

	if(extension == "txt")
		content_type = "text/plain";
	else if(extension == "html")
		content_type = "text/html";
	else if(extension == "png")
		content_type = "image/png";
	else if((extension == "jpg") || (extension == "jpeg"))
		content_type = "image/jpeg";
	else if(extension == "gif")
		content_type = "image/gif";
	else if(extension == "js")
		content_type = "text/javascript";
	else if(extension == "css")
		content_type = "text/css";
	else if(extension == "json")
		content_type = "application/json";
	else if(extension == "ico")
		content_type = "image/vnd.microsoft.icon";

	return content_type;
}

async function get_file(path, sendresponse, sessionid) {
	let content_type = find_content_type(path);
	try {
		let data = await fs.readFile(path);
		sendresponse(200, content_type, data, sessionid, null, 86400);
	}
	catch (err) {
		sendresponse(404, "text/plain", "Not Found", sessionid);
		console.log("404");
	}
}

function get(url, sendresponse, sessionid) {
	let url_split = url.split("/");
	if(url_split.length <= 2)
		sendresponse(404, "text/plain", "Not Found", sessionid);

	let path = url_split.slice(2).join("/");

	get_file("html/static/" + path, sendresponse, sessionid);
}

module.exports = {
	get: get,
	get_file: get_file,
};