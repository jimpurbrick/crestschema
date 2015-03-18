(function(request, fs, stringify, crestschemaparser) {

    var uriRegex = /^https?:\/\/\S+$/;
    var uris = [];
    var representations = {};
    var requested = {};

    function findUris(schema, instance) {
	var result = [];
	if (!schema || !instance) {
	    return result; // TODO: error...
	}
	switch(schema.type) {
	case 'object':
	    for (property in schema.properties) {
		result = result.concat(findUris(schema.properties[property], instance[property]));
	    }
	    break;
	case 'array':
	    // Assume array items are homogenous, so only add uris found in first instance.
	    result = result.concat(findUris(schema.items, instance[0]));
	    break;
	case 'string':
	    if (uriRegex.test(instance) && !requested.hasOwnProperty(instance)) {
		console.log('Found uri ' + stringify(instance));
		result.push(instance);
	    }
	    break;
	}
	return result;
    }

    function nextUri() {
	if (uris.length > 0) {
	    getRepresentations(uris.pop());
	}
    }

    function getRepresentations(uri) {
	console.log("Requesting " + stringify(uri));
	requested[uri] = true;
	request({ method: 'OPTIONS',
		    uri: uri,
		    headers: {
		    'Accept': 'application/vnd.ccp.eve.Options-v1+json'
			}
	    },
	    function (error, response, body) {

		// TODO: remove this when CREST content negotiation works and we get 406 errors.
		if (!response || ! response.headers['content-type'] == 'application/vnd.ccp.eve.Options-v1+json') {
		    nextUri();
		    return;
		}

		var name;
		var jsonSchema;
		try {
		    jsonSchema = crestschemaparser.jsonSchemaFromCrestOptions(body);
		} catch(err) {
		    nextUri();
		    return;
		}

		if (! jsonSchema) {
		    nextUri();
		    return;
		}

		for (name in jsonSchema) {
		    if (jsonSchema.hasOwnProperty(name) &&
			(!representations.hasOwnProperty(name))) {
			console.log("Found representation " + stringify(name));
			var fileName = name.replace('application/vnd.ccp.eve.','').replace('+', '.');
			fs.writeFile(fileName, 
				     stringify(jsonSchema[name], {space: 4}), function (err) {
					 if (err) throw err;
				     });
		    }
		}

		// TODO: request each representation when CREST content negotiation is fixed.
		request(uri,
			function (error, response, body) {
			    name = response.headers['content-type'].split(';')[0];
			    if(!representations.hasOwnProperty(name) && jsonSchema.hasOwnProperty(name)) {
				representations[name] = true;
				uris = uris.concat(findUris(jsonSchema[name], JSON.parse(body)));
			    }
			    nextUri();
			});
		nextUri();
	    });
    }
    getRepresentations('https://crest.eveonline.com');

}(require('request'), require('fs'), require('json-stable-stringify'), require('./crestschema')));
