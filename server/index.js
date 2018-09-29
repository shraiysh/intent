
console.log("Starting Server");

var app = require('http').createServer();
var io = require('socket.io')(app);
// var fs = require('fs');

app.listen(80);

console.log('Using HTTP Server on port 80.');

var time = 0;
var playerIndex = 0, enemyIndex = 0;
var player1Socket = undefined, player2Socket = undefined;

io.on('connection', function (socket) {
	console.log('Player Connected: ' + socket.id);
	
	// socket.on('private message', function (from, msg) {
	// 	console.log('I received a private message by ', from, ' saying ', msg);
	// });

	socket.on('requestIDS', function (data) {
		if(player1Socket){
			console.log('Player 2 Found.');
			player2Socket = socket;
		} 
		else {
			console.log('Player 1 Found.');
			player1Socket = socket;
		} 
		playerIndex++;
		enemyIndex--;
		socket.emit('processIDS', playerIndex, enemyIndex);
	});

	socket.on('myPlayerDetails', function (details) {
		var enemySocket = (player1Socket === socket)? player2Socket: player1Socket;
		if(enemySocket) enemySocket.emit('myEnemyDetails', details);

	});
});

//Handling Socket disconnect

var tick = function () {
	time++;
	io.emit('message', { time: time });
}

setInterval(tick, 1000);