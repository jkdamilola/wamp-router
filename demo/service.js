// Workaround for using self signed server certificates.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var CLogger  = require('node-clogger')
    , autobahn  = require('autobahn');

var logger = new CLogger({name: 'services'});

// Create an example service which return a random integer when called.
// This service maybe runs on a different machine or in the browser.
var serviceA = new autobahn.Connection({
    url: 'ws://localhost:8081/wamp',
    realm: 'com.wamp.app'
});

serviceA.onopen = function (session) {
    session.register('com.wamp.random', function (args, kwargs, details) {
        return Math.floor(Math.random() * Math.pow(2, 53));
    })
    .then(function (registration) {
        logger.info('service with id %d registered.', registration.id);
    })
    .catch(function (err) {
        logger.error('cannot register service!');
        process.exit(2);
    })
    .done();
};

serviceA.onclose = function (reason) {
    logger.info('service closed', reason);
    process.exit(2);
};

setTimeout(function () {
    serviceA.open();
}, 500);

// Create an example service which will populate the
// current datetime every two secundes.
// Clients can subscribe to this topic in the same manner.
var serviceB = new autobahn.Connection({
    url: 'ws://localhost:8081/wamp',
    realm: 'com.wamp.app'
});

serviceB.onopen = function (session) {
    session.subscribe('com.wamp.time', function () {})
    .then(function (subscription) {
        logger.info('subscribed to topic.', subscription.id);

        setInterval(function () {
            session.publish('com.wamp.time', [new Date().getTime()]);
        }, 1927);
    })
    .catch(function (err) {
        logger.error('cannot subscribe to topic!', err);
    })
    .done();
};

serviceB.onclose = function (reason) {
    logger.info('service closed', reason);
    process.exit(2);
};

setTimeout(function () {
    serviceB.open();
}, 500);
