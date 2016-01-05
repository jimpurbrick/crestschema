/*!
 * crestschemaspider
 * https://github.com/jimpurbrick/crestschema
 *
 * Copyright 2015, Jim Purbrick (http://jimpurbrick.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */

/*
 * A node application which crawls the CREST API finding all reachable
 * representations and saving them as JSON schema.
 */

/*jslint todo: true, vars: true, forin: true, plusplus: true, bitwise: true, eqeq: true, maxerr: 50, indent: 4, node: true */

(function (request, fs, stringify, extend, crestschemaparser) {

    'use strict';

    var uriRegex = /^https?:\/\/\S+$/;
    var foundUris = [];
    var requestedUris = {};
    var foundRepresentations = {};
    var requestedRepresentations = {};

    function findUris(schema, instance) {
        if (instance === undefined) {
            throw new TypeError;
        }
        var result = [];
        var property;
        switch (schema.type) {
        case 'object':
            for (property in schema.properties) {
                try {
                    result = result.concat(
                        findUris(schema.properties[property], instance[property]));
                } catch (err) {
                    // TODO: Report error if property is required.
                }
            }
            break;
        case 'array':
            // Assume array items are homogenous,
            // so only add uris found in first instance.
            try {
                result = result.concat(findUris(schema.items, instance[0]));
            } catch (err) {
                // Empty arrays are legitimate.
            }
            break;
        case 'string':
            if (uriRegex.test(instance)
                    && !requestedUris.hasOwnProperty(instance)) {
                console.log('Found uri ' + stringify(instance));
                result.push(instance);
            }
            break;
        }
        return result;
    }

    function nextUri(headers) {
        if (foundUris.length > 0) {
            getRepresentations(foundUris.pop(), headers);
        }
    }

    function getRepresentations(uri, headers) {
        console.log("Requesting " + stringify(uri));
        requestedUris[uri] = true;
        request(
            {
                method: 'OPTIONS',
                uri: uri,
                headers: extend(
                    {'Accept': 'application/vnd.ccp.eve.Options-v1+json'},
                    headers
                )
            },
            function (error, response, body) {
                var jsonSchema;

                if (error || !response) {
                    nextUri(headers);
                    return;
                }

                try {
                    jsonSchema =
                        crestschemaparser.jsonSchemaFromCrestOptions(body);
                } catch (err) {
                    nextUri(headers);
                    return;
                }

                ['GET', 'PUT', 'POST'].map(function (verb) {
                    var name;
                    for (name in jsonSchema[verb]) {
                        if (jsonSchema[verb].hasOwnProperty(name)
                                && (!foundRepresentations
                                    .hasOwnProperty(name))) {
                            foundRepresentations[name] = true;
                            console.log("Found representation " +
                                stringify(name));
                            fs.writeFile(
                                name.replace(
                                    'application/vnd.ccp.eve.',
                                    ''
                                )
                                    .replace('+', '.'),
                                stringify(jsonSchema[verb][name], {space: 4})
                            );
                        }
                    }
                });

                // TODO: request each representation when CREST
                // content negotiation is fixed.
                request(
                    {uri: uri, headers: headers},
                    function (error, response, body) {
                        var name;
                        if (error) {
                            nextUri(headers);
                            return;
                        }
                        name = response.headers['content-type'].split(';')[0];
                        if (!requestedRepresentations.hasOwnProperty(name)
                                && jsonSchema.GET.hasOwnProperty(name)) {
                            requestedRepresentations[name] = true;
                            console.log('Finding uris in ' + name);
                            foundUris = foundUris.concat(
                                findUris(jsonSchema.GET[name],
                                    JSON.parse(body))
                            );
                        }
                        nextUri(headers);
                    }
                );
                nextUri(headers);
            }
        );
    }

    var index = 1; // Usage: node crestschemaspider.js authtoken refreshtoken authuri rooturi
    var authToken = process.argv[++index];
    var refreshToken = process.argv[++index];
    var authUri = process.argv[++index];
    var rootUri = process.argv[++index];

    request(
        {
            method: 'POST',
            uri: authUri,
            headers: {
                'Authorization': 'Basic ' + authToken
            },
            form: {
                'grant_type': 'refresh_token',
                'refresh_token': refreshToken
            }
        },
        function(error, response, body) {
            if (error || !response) {
                process.exit(1);
            }
            var headers = {'Authorization': 'Bearer ' + JSON.parse(body).access_token};
            getRepresentations(rootUri, headers);
        }
    );
}(
    require('request'),
    require('fs'),
    require('json-stable-stringify'),
    require('extend'),
    require('./crestschema')
));
