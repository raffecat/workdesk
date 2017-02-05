#!/usr/bin/env node

var fs = require('fs');
var express = require('express');
var http = require('http');
var low = require('lowdb');

var devMode = ~process.argv.indexOf('--dev');
var port = devMode ? 443 : 8000;

var app = express();
app.use(express.static(__dirname));

var server = http.Server(app);
var io = require('socket.io').listen(server, {
    origins: devMode ? '*:*' : 'desk.raffe.io:*',
    'log level': devMode ? 3 : 2
});

var db = low('db.json');
var users = db.get('users');
var sessions = db.get('sessions');

users.get('1').update({ username: 'pomke', password: 'foo' });
users.get('2').update({ username: 'mario', password: 'foo' });

console.log("mario:", users.find({ username: 'mario' }).value());

io.sockets.on('connection', function (socket) {

    socket.on('login', function (data) {
        // find matching user.
        var user = users.find({ username: data.username }).value();
        return socket.emit( 'auth', user && user.password == data.password );
    });

    socket.on('load', function (data) {
    });

});

server.listen(port, function(){
  console.log('listening on *:'+port);
});
