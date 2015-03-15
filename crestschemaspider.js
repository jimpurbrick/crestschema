(function(https, crestschemaparser) {

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
		process.stdout.write(JSON.stringify(crestschemaparser.jsonSchemaFromCrestOptions(data), null, 4));
	    });
    });

request.end();

}(require('https'), require('./crestschema')));