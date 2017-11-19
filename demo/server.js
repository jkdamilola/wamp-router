// Workaround for using self signed server certificates.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var websocket  = require('../index')
    , https    = require('https')
    , http    = require('http')
    , fs       = require('fs');

// Create a secure webserver as transport for the WebSocket connections.
var secureTransport = https.createServer({
    key: fs.readFileSync(__dirname + '/config/server.key'),
    cert: fs.readFileSync(__dirname + '/config/server.crt')
}, function (req, res) {
    console.log(req, res);
    res.writeHead(200);
    res.end('Please connect per webSocket!');
});

// Create an unsecure webserver as transport for the WebSocket connections.
var unsecureTransport = http.createServer();
// Create a router which use previously created webserver,
// listen on specified port and path and don't create realms
// automatically when requested. The router constructor itself
// call the webserver.listen method and reject new sessions,
// if the requested realm doesn't exists.
var router = websocket.createRouter({
    httpServer: unsecureTransport,
    port: 8081,
    path: '/wamp',
    autoCreateRealms: true
});

// Create an example realm.
router.createRealm('com.wamp.app');