var CConf             = require('node-cconf')
    , util            = require('./util')
    , logger          = util.logger()
    , parser          = util.parser()
    , randomid        = util.randomid
    , Realm           = require('./realm')
    , Session         = require('./session')
    , WebSocketServer = require('ws').Server
    , q               = require('q')
    , inherits        = require('util').inherits
    , http            = require('http')
    , _               = require('lodash');

function Router(opts) {
    var self = this;

    var config = new CConf('router', [], {
        'path'             : '/wamp',
        'autoCreateRealms' : true
    })
    .load(opts || {});

    logger.info('router option for auto-creating realms is', config.getValue('autoCreateRealms') ? 'set' : 'not set');

    var server = config.getValue('httpServer');
    if (!server) {
        server = http.createServer(function (req, res) {
            res.writeHead(200);
            res.end('This is a WAMP transport. Please connect over webSocket!');
        });
    }

    server.on('error', function (err) {
        logger.error('httpServer error:', err.stack);
    });

    var port = config.getValue('port');
    if (port) {
        server.listen(port, function () {
            logger.info('bound and listen at:', port);
        });
    }

    WebSocketServer.call(self, {
        'server' : server,
        'path'   : config.getValue('path')
    });

    self.on('error', function (err) {
        logger.error('webSocketServer error:', err.stack);
    });

    self.on('connection', function (socket) {
        logger.info('incoming socket connection');

        var session = new Session(socket, self.roles);

        session.on('attach', function (realm, defer) {
            try {
                logger.debug('attaching session to realm', realm);
                self.realm(realm).addSession(session);
                defer.resolve();
            } catch (err) {
                defer.reject(err);
            }
        });

        session.on('close', function (defer) {
            try {
                logger.debug('removing & cleaning session from realm', session.realm);
                self.realm(session.realm).cleanup(session).removeSession(session);
                defer.resolve();
            } catch (err) {
                defer.reject(err);
            }
        });

        session.on('subscribe', function (uri, defer) {
            try {
                defer.resolve(self.realm(session.realm).subscribe(uri, session));
            } catch (err) {
                defer.reject(err);
            }
        });

        session.on('unsubscribe', function (id, defer) {
            try {
                self.realm(session.realm).unsubscribe(id, session);
                defer.resolve();
            } catch (err) {
                defer.reject(err);
            }
        });

        session.on('publish', function (uri, defer) {
            try {
                defer.resolve(self.realm(session.realm).topic(uri));
            } catch (err) {
                defer.reject(err);
            }
        });

        session.on('register', function (uri, defer) {
            try {
                defer.resolve(self.realm(session.realm).register(uri, session));
            } catch (err) {
                defer.reject(err);
            }
        });

        session.on('unregister', function (id, defer) {
            try {
                self.realm(session.realm).unregister(id, session);
                defer.resolve();
            } catch (err) {
                defer.reject(err);
            }
        });

        session.on('call', function (uri, defer) {
            try {
                defer.resolve(self.realm(session.realm).procedure(uri));
            } catch (err) {
                defer.reject(err);
            }
        });

        session.on('yield', function (id, defer) {
            try {
                defer.resolve(self.realm(session.realm).yield(id));
            } catch (err) {
                defer.reject(err);
            }
        });
    });

    self.config = config;
    self.server = server;
    self.realms = {};
}

inherits(Router, WebSocketServer);

Router.prototype.__defineGetter__('roles', function () {
    return {
        broker: {},
        dealer: {}
    };
});

Router.prototype.close = function() {
    var self = this;

    return q.fcall(function () {
        _.forOwn(self.realms, function (realm) {
            realm.close(1008, 'wamp.error.system_shutdown');
        });
    })
    .then(function () {
        self.server.close();
        Router.super_.prototype.close.call(self);
    })
    .timeout(500, 'wamp.error.system_shutdown_timeout');
};

Router.prototype.realm = function(uri) {
    var self = this;

    if (parser.isUri(uri)) {
        var realms = self.realms
            , autoCreateRealms = self.config.getValue('autoCreateRealms');

        if (!realms[uri]) {
            if (autoCreateRealms) {
                realms[uri] = new Realm();
                logger.info('new realm created', uri);
            } else {
                throw new Error('wamp.error.no_such_realm');
            }
        }

        return realms[uri];
    } else {
        throw new TypeError('wamp.error.invalid_uri');
    }
};

Router.prototype.createRealm = function(uri) {
    var self = this;

    if (parser.isUri(uri)) {
        var realms = self.realms;
        if (!realms[uri]) {
            realms[uri] = new Realm();
            logger.info('new realm created', uri);
        } else {
            throw new Error('wamp.error.realm_already_exists');
        }
    } else {
        throw new TypeError('wamp.error.invalid_uri');
    }
};

module.exports.Router = Router;

module.exports.createRouter = function (opts) {
    return new Router(opts);
};
