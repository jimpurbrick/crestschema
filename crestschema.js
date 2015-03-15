(function(exports){

    function propertiesFromCrestProperties(crestProperties) {
	var result = {};
	for (var name in crestProperties) {
	    if (crestProperties.hasOwnProperty(name)) {
		var crestSchema = crestProperties[name];
		result[name] = 
		    jsonSchemaFromCrestSchema(crestSchema.type,
					      crestSchema,
					      name);
	    }
	}
	return result;
    }

    function requiredPropertiesFromCrestProperties(crestProperties) {
	var result = [];
	for (var name in crestProperties) {
	    if (crestProperties.hasOwnProperty(name)) {
		if (! crestProperties[name].isOptional) {
		    result.push(name);
		}
	    }
	}
	return result;
    }
	
    function jsonSchemaFromCrestSchema(type, crestSchema, id) {
	var result = {};
	result.id = id;
	switch (type) {
	case "Dict":
	case "Ref":
	case "ExternalRef":
	    result.type = "object";
	    result.properties = propertiesFromCrestProperties(crestSchema.subContent);
	    result.required = requiredPropertiesFromCrestProperties(crestSchema.subContent);
	    break;
	case "Array":
	    result.type = "array";
	    result.items = jsonSchemaFromCrestSchema(crestSchema.extraData,
						     crestSchema, 
						     '0');
	    break;
	case "String":
	case "Uri":
	    result.type = "string";
	    break;
	case "Long":
	    result.type = "integer";
	    break;
	}
	return result;
    }

    exports.jsonSchemaFromCrestOptions = function(optionsData) {
	var result = {};
	var options = JSON.parse(optionsData);
	var representations = options['representations'];
	var representationsLength = representations.length;
	for (var i = 0; i < representationsLength; i++) {
	    var representationName = representations[i].acceptType.name; 
	    var crestSchema = JSON.parse(representations[i].acceptType.jsonDumpOfStructure); 
	    jsonSchema = jsonSchemaFromCrestSchema(crestSchema.type,
						   crestSchema,
						   '/');
	    jsonSchema.$schema = "http://json-schema.org/draft-04/schema#";
	    result[representationName] = jsonSchema;
	}
	return result;
    }
})(typeof exports === 'undefined'? this['crestschemaparser']={}:exports);