const https = require('https');
const http = require('http');

function get_configuration(base_url, callback) {
    let requests = null;

    if(base_url.startsWith("http://"))
        requests = http;
    else if(base_url.startsWith("https://"))
        requests = https;
    else
        return null;

    requests.get(base_url + "/.well-known/openid-configuration", {timeout:5000}, (res) => {
        const status_code = res["statusCode"];
        const contentType = res.headers['content-type'];

        let error;
        if (status_code !== 200) {
            error = `Request Failed.\nStatus Code: ${status_code}`;
        } else if (!/^application\/json/.test(contentType)) {
            error = `Invalid content-type.\nExpected application/json but received ${contentType}`;
        }
        if (error) {
            console.error(error.message);
            // Consume response data to free up memory
            res.resume();
            callback(error);
            return;
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);
                callback(null, parsedData);
            } catch (e) {
                console.error(e.message);
                callback(error)
            }
        });
    }).on('error', (e) => {
        callback(`Got error: ${e.message}`)
    });
}

function authenticate(redirect_uri, openid_config, code, client_id, secret, callback) {
    let request_data = `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}&client_id=${client_id}`;
    
    if(openid_config.token_endpoint.startsWith("http://"))
        requests = http;
    else if(openid_config.token_endpoint.startsWith("https://"))
        requests = https;

    if(secret)
        request_data += `&client_secret=${secret}`;

    let req = requests.request(openid_config.token_endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded",},
    }, (res) => {
        const status_code = res["statusCode"];
        const contentType = res.headers['content-type'];

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            let error;
            if (!/^application\/json/.test(contentType)) {
                error = `Invalid content-type.\nExpected application/json but received ${contentType}`;
            }
            if (error) {
                console.error(error.message);
                // Consume response data to free up memory
                callback(`TokenEndpoint error: ${error}`);
                return;
            }

            try {
                const parsedData = JSON.parse(rawData);
                if("error" in parsedData) {
                    callback(`TokenEndpoint error: ${parsedData.error}`);
                    return;
                }
                userInfo(openid_config, parsedData, callback);

            } catch (e) {
                callback(error)
            }
        });        
    }).on('error', (e) => {
        callback(`TokenEndpoint error: ${e.message}`)
    });

    req.write(request_data);
    req.end();

}

function userInfo(openid_config, token_data, callback) {
    requests.get(openid_config.userinfo_endpoint, {headers: {Authorization: `Bearer ${token_data.access_token}`}}, (res) => {
        const status_code = res["statusCode"];
        const contentType = res.headers['content-type'];

        let error;
        if (status_code !== 200) {
            error = `Request Failed.\nStatus Code: ${status_code}`;
        } else if (!/^application\/json/.test(contentType)) {
            error = `Invalid content-type.\nExpected application/json but received ${contentType}`;
        }
        if (error) {
            console.error(error.message);

            res.resume();
            callback(`UserInfo error: ${error}`);
            return;
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            let parsedData;
            try {
                parsedData = JSON.parse(rawData);
            } catch (e) {
                console.error(e.message);
                callback(error)
                return;
            }
            callback(null, {
                name: parsedData.given_name,
                lastname: parsedData.family_name,
                email: parsedData.email,
            });
        });
    }).on('error', (e) => {
        callback(`UserInfo error: ${e.message}`)
    });
}

module.exports = {
    get_configuration: get_configuration,
    authenticate: authenticate,
}