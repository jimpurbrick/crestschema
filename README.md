# crestschema
Utilities for working with EVE Online's CREST API using JSON Schema.

To generate JSON schema from the CREST production API from the command line:

    npm install request fs json-stable-stringify extend
    node crestschemaspider.js https://crest.eveonline.com [header:value]...

Additional command line arguments are added to each request as headers.

To use the crestschema library in a browser:

    <script src="crestschema.js"></script>
    <script>
        crestschema.jsonSchemaFromCrestOptions(someOptionsBodyFromCrest);
    </script>