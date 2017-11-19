#WAMP Router#

A [WAMP](http://wamp.ws)-Router implementation for [node.js](http://nodejs.org).
At the moment, WAMP basic profile in the roles of dealer and broker are supported.
For client connections: publish/subscribe and remote procedure register/call,
[AutobahnJS](http://autobahn.ws/js) can be used.

##Install Dependencies##

```
npm install
```

##Basic Usage##

``` Javascript
var http       = require('http')
    , CLogger  = require('node-clogger');

var websocket  = require('./index')
    , autobahn = require('autobahn');

// Create a new router with given options. In this example, the options are the
// default values.
var router = websocket.createRouter({
    httpServer: http.createServer(),                    // Nodes http or https server can be used.
                                                        // httpServer.listen() will be called from
                                                        // within router constructor.

    port: 3000,                                         // The url for client connections will be:
    path: '/wamp',                                 // ws://localhost:3000/wamp.

    autoCreateRealms: true,                             // If set to false, an exception will be thrown
                                                        // on connecting to a non-existent realm.

    logger: new CLogger({name: 'wamp-ws-router'})     // Must be an instance of 'node-clogger'.
});

var client = new autobahn.Connection({
    url: 'ws://localhost:3000/wamp',
    realm: 'com.wamp.app'
});

client.onopen = function (session) {
    // do pub/sub or some procedure calls...
};

client.open();
```
