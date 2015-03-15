(function(https, fs, stringify, crestschemaparser) {

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
		var jsonSchema = crestschemaparser.jsonSchemaFromCrestOptions(data);
		for (name in jsonSchema) {
		    if (jsonSchema.hasOwnProperty(name)) {
			var fileName = name.replace('application/vnd.ccp.eve.','').replace('+', '.') + '.schema';
			fs.writeFile(fileName, 
				     stringify(jsonSchema[name], {space: 4}), function (err) {
					 if (err) throw err;
				     });
		    }
		}
	    });
    });

request.end();

}(require('https'), require('fs'), require('json-stable-stringify'), require('./crestschema')));