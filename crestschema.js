(function (exports) {

    'use strict';

    function propertiesFromCrestProperties(crestProperties) {
        var result = {};
        var name;
        var crestSchema;
        for (name in crestProperties) {
            if (crestProperties.hasOwnProperty(name)) {
                crestSchema = crestProperties[name];
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
        var name;
        for (name in crestProperties) {
            if (crestProperties.hasOwnProperty(name)) {
                if (!crestProperties[name].isOptional) {
                    result.push(name);
                }
            }
        }
        return result;
    }

    function jsonSchemaFromCrestSchema(type, crestSchema, id) {
        var result = {};
        result.id = id;
        if (crestSchema.description) {
            result.description = crestSchema.description;
        }
        switch (type) {
        case "Array":
            result.type = "array";
            result.items = jsonSchemaFromCrestSchema(
                crestSchema.extraData,
                crestSchema,
                '0'
            );
            break;
        case "String":
        case "Uri":
            result.type = "string";
            break;
        case "Long":
            result.type = "integer";
            break;
        case "Dict":
        case "Ref":
        case "ExternalRef":
        default: // 'Collection of...', 'vnd.ccp.eve...'
            result.type = "object";
            result.properties =
                propertiesFromCrestProperties(crestSchema.subContent);
            result.required =
                requiredPropertiesFromCrestProperties(crestSchema.subContent);
            break;
        }
        return result;
    }

    exports.jsonSchemaFromCrestOptions = function (optionsData) {
        var result = {
            GET: {},
            PUT: {},
            POST: {},
            OPTIONS: {}
        };
        var options = JSON.parse(optionsData);
        options.representations.map(function (representation) {
            ['acceptType', 'contentType'].map(function (type) {
                var crestSchema;
                var jsonSchema;
                if (representation.hasOwnProperty(type)) {
                    crestSchema = JSON.parse(
                        representation[type].jsonDumpOfStructure
                    );
                    jsonSchema = jsonSchemaFromCrestSchema(
                        crestSchema.type,
                        crestSchema,
                        '/'
                    );
                    jsonSchema.$schema =
                        "http://json-schema.org/draft-04/schema#";
                    result[representation.verb][representation[type].name] =
                        jsonSchema;
                }
            });
        });
        return result;
    };
})(typeof exports === 'undefined'? this['crestschemaparser']={}:exports);