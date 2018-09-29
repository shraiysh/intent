
console.log("Starting Server");

var app = require('http').createServer();
var io = require('socket.io')(app);
// var fs = require('fs');

app.listen(80);

console.log('Using HTTP Server on port 80.');

var time = 0;

io.on('connection', function (socket) {
	console.log('Player Connected: ' + socket.id);

	socket.on('private message', function (from, msg) {
		console.log('I received a private message by ', from, ' saying ', msg);
	});
});

var tick = function () {
	time++;
	io.emit('message', { time: time });
}

setInterval(tick, 1000);