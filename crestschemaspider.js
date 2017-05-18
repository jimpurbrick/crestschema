/*!

  node crestschemaspider.js zMD1JZkvZPOggDgapyTjD7DO0ftu7zVZJUI0I4Bh5YQnN09vkWBQgfWVW2kSgSGsbfNKEwDd_1qV3z20RMCuLg2 FNnXUZNB2GbmcswzbOYqHvSIuSwZC_JZmDxttyW8BMo4dQDaffTieBWCfsXG5dESBdQ6TqMw9iy4mWqk6PAY8ECCIVAPT1mpFPudJiAi5zsWk7ZuXmm9EOL_RPby4GyBJZb3TX5wKARduuVuH-8xRYGM2-A9qS0CFDYEyyPPj_pDdF3KixUu7vaMZ1s9Re98jy7PjSCalgBMKoo6cl0vkLIPNJ0cZjeLRRGTZUeGzqg2qftC6fpL4oCHdM73tRVKqWQeRT5xpNXgFGkmBVNxDF5jKFWAD-L5tDAkFVBYXNmF_XDK3V0tBGdtP9rFNVE88ratPTeyvJBkAoq8qYtpQk9Tn27_aDk1RwDbIDbyxA-rivJ0gBhIAmCQ3H9iiCiS0 https://login.eveonline.com/oauth/verify https://crest-tq.eveonline.com/decode
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
require('dotenv').config();
var request = require('request');
var fs = require('fs');
var stringify = require('json-stable-stringify');
var extend = require('extend');
var crestschemaparser = require('./crestschema');

var logFile = fs.createWriteStream('log.txt', { flags: 'w' });
//Debugging/loggin and formatting of error messages
require('request-debug')(request, function(type, data, r) {
    if (type = 'response' && data.statusCode > 400) {
      var errorMessage =
        `\n
         Request:  ${stringify(r.uri.href)} \n
         Method: ${stringify(r.uri.method)} \n
         Headers: ${stringify(r.uri.method)} \n
         StatusCode: ${stringify(data.statusCode)} \n
         Response: ${stringify(data.body)} \n
         ----------------------------------------------------------------------`
      logFile.write(errorMessage);
      console.log(errorMessage);
    }
});


var authToken = process.env.AUTH_TOKEN;
var refreshToken = process.env.REFRESH_TOKEN;
var authUri = 'https://login.eveonline.com/oauth/token';
var rootUri = 'https://crest-tq.eveonline.com';


function run(request, fs, stringify, extend, crestschemaparser) {

    'use strict';

    var uriRegex = /^https?:\/\/(?!\S+\.jpg|\S+\.png)\S+$/;
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
                //console.log('Found uri ' + stringify(instance));
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
        //console.log("Requesting " + stringify(uri));
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
                    //console.log(`Requested URI error: \n ${error}` || `No response from ${uri}`)
                    nextUri(headers);
                    return;
                }

                try {
                  if (response.statusCode > 400) {
                    nextUri(headers);
                    return;
                  } else {
                    jsonSchema =
                    crestschemaparser.jsonSchemaFromCrestOptions(body);
                  }
                } catch (err) {
                    //console.log(`Response: \n ${stringify(response)} \n Body : \n ${body} \n \n Error : \n ${err} \n`)
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
                            //console.log("Found representation " + stringify(name));
                            fs.writeFile(
                                './schema/' + name.replace(
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
                            //console.log('Finding uris in ' + name);
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
                console.log(error || `No Response from ${authUri}`)
                process.exit(1);
            }
            var headers = {'Authorization': 'Bearer ' + JSON.parse(body).access_token};
            getRepresentations(rootUri, headers);
        }
    );
};

run(request, fs, stringify, extend, crestschemaparser)
