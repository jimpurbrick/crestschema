(function(https, stringify, crestschemaparser) {

var data = "";

var request = https.request({hostname: 'crest.eveonline.com', 
			     method: 'OPTIONS',
			     headers: {
	    'Content-Length': 0
	}},
    function(response) {
	response.on('data', function(chunk) {
		data += chunk;
	    });
	response.on('end', function() {
		process.stdout.write(data);
		process.stdout.write(stringify(crestschemaparser.jsonSchemaFromCrestOptions(data), {space: 4}));
	    });
    });

request.end();

}(require('https'), require('json-stable-stringify'), require('./crestschema')));