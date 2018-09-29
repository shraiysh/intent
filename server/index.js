
console.log("Starting Server");

var app = require('http').createServer();
var io = require('socket.io')(app);
// var fs = require('fs');

app.listen(80);

console.log('Using HTTP Server on port 80.');

var time = 0;
var playerIndex = 0, enemyIndex = 0;
var player1Socket = undefined, player2Socket = undefined;
var pl1plPos, pl1enPos;

io.on('connection', function (socket) {
	console.log('Player Connected: ' + socket.id);

	socket.on('requestIDS', function (player1playerPos, player1enemyPos) {
		console.log('Player with id ' + socket.id + ' requested IDs.');
		if(player1Socket){
			console.log('Player 2 Found.');
			player2Socket = socket;
		} 
		else {
			console.log('Player 1 Found.');
			pl1plPos = player1playerPos;
			pl1enPos = player1enemyPos;
			player1Socket = socket;
		} 
		playerIndex++;
		enemyIndex--;
		socket.emit('processIDS', playerIndex, enemyIndex, player1playerPos, player1enemyPos);
	});

	socket.on('myPlayerDetails', function (details) {
		var enemySocket = (player1Socket === socket)? player2Socket: player1Socket;
		if(enemySocket) enemySocket.emit('myEnemyDetails', details);

	});
});


io.on('disconnect', function (socket) {
	console.log('Player Disconnected: ' + socket.id);
	if(player1Socket === socket){
		console.log('Player 1 disconnected.');
		player1Socket = undefined;
	} 
	else if(player2Socket === socket){
		console.log('Player 2 disconnected.');
		player2Socket = undefined;
	} 
	playerIndex--;
	enemyIndex++;
});

//Handling Socket disconnect

var tick = function () {
	time++;
	io.emit('message', { time: time });
}

setInterval(tick, 1000);