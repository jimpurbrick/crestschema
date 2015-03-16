(function(request, fs, stringify, crestschemaparser) {
    var uris = [];
    var representations = {};

    function nextUri() {
	// HACK! Hope tail recursion makes this OK.
	// TODO: Queuing and concurrent requests.
	if (uris.length > 0) {
	    getRepresentations(uris.pop());
	}
    }

    function getRepresentations(uri) {
	console.log("Requesting " + uri);
	request({ method: 'OPTIONS',
		    uri: uri },
	    function (error, response, body) {

		try {
		    var jsonSchema = crestschemaparser.jsonSchemaFromCrestOptions(body);
		} catch(err) {
		    console.log("Failed to process " + stringify(JSON.parse(body), {space: 4}));
		    throw err;
		}
		for (name in jsonSchema) {
		    if (jsonSchema.hasOwnProperty(name) &&
			(!representations.hasOwnProperty(name))) {
			console.log("Found representation " + name);
			representations[name] = true;
			var fileName = name.replace('application/vnd.ccp.eve.','').replace('+', '.');
			fs.writeFile(fileName, 
				     stringify(jsonSchema[name], {space: 4}), function (err) {
					 if (err) throw err;
				     });

			// HACK! Search GET response for uris.
			// TODO: Use schema to find uris?
			var httpUri = /https?:\/\/[^\"]*/g;
			request(uri, function (error, response, body) {
				uris.push.apply(uris, body.match(httpUri));
				nextUri();
			    });
		    }
		}
	    });
    }
    getRepresentations('https://crest.eveonline.com');

}(require('request'), require('fs'), require('json-stable-stringify'), require('./crestschema')));
