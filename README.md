# crestschema
Utilities for working with EVE Online's CREST API using JSON Schema.

To generate JSON schema from the CREST production API from the command line,
first clone the repo then use this command:

```
    npm install
```
You will need to make a .env file in the root directory with this information
from EVE's SSO authentication process:

```
AUTH_TOKEN=...
REFRESH_TOKEN=...
```

An example of this is provided with this repo in env.sample.


If you are unsure of how to implement EVE's OAUTH flow to get the access tokens
I would recommend using postman to get the tokens initially.


After config is done, you only need to enter either of these commands into your
CLI from the root folder:

```
node crestschemaspider.js
npm start
```
