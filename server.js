#!/usr/bin/node --harmony

process.chdir(__dirname); // for init script.

var fs = require('fs');
var http = require('http');
var database = require('./db');

var devMode = ~process.argv.indexOf('--dev');

var db = database("tcp://workdesk:foo123@localhost/workdesk");

var server = http.createServer();
var io = require('socket.io').listen(server, {
    origins: devMode ? '*:*' : 'desk.pangur.com.au:*',
    'log level': devMode ? 3 : 2
});
var port = devMode ? 443 : 7000;

var users = db.get('users');
var sessions = db.get('sessions');

users.get('1').update({ username: 'pomke', password: 'foo' });
users.get('2').update({ username: 'mario', password: 'foo' });

users.find({ username: 'mario' }).attrs(function (err, attrs) {
    console.log("mario:", err, attrs);
});

users.get('2').attrs(function (err, attrs) {
    console.log("mario has:", err, attrs);
});

io.sockets.on('connection', function (socket) {

    socket.on('login', function (data) {
        // find matching user.
        users.find({ username: u.username }).attrs(function (err, attrs) {
            if (err) {
                console.log("users.find:", err);
                return socket.emit( 'auth', null );
            }
            // reply with auth status.
            return socket.emit( 'auth', attrs && attrs.password == data.password );
        });
    });

    socket.on('load', function (data) {
    });

});

server.listen(port);


function first(array, predicate, notFound) {
    for (var i=0,n=this.length||0;i<n;i++) {
        if (predicate(this[i])) return this[i];
    }
    return notFound;
}
