#!/usr/bin/node

process.chdir(__dirname); // for init script.

var fs = require('fs');
var http = require('http');
var server = http.createServer();

var devMode = ~process.argv.indexOf('--dev');

var io = require('socket.io').listen(server, {
    origins: devMode ? '*:*' : 'desk.pangur.com.au:*',
    'log level': devMode ? 3 : 2
});
var port = devMode ? 443 : 7000;

var users = [
    { username: 'pomke', password: 'foo' },
    { username: 'raffe', password: 'foo' }
];

var sessions = {};

io.sockets.on('connection', function (socket) {

    socket.on('login', function (data) {
        // find matching user.
        var user = first(users, function (u) {
            return u.username == data.username;
        });
        // reply with auth status.
        return socket.emit( 'auth', user && user.password == data.password );
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
