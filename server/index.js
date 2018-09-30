
console.log("Starting Server");

var app = require('http').createServer();
var io = require('socket.io')(app);
// var fs = require('fs');

app.listen(80);

console.log('Using HTTP Server on port 80.');

var time = 0;
var playerIndex = 0, enemyIndex = 0;
var player1Socket = undefined, player2Socket = undefined;

var plPos = {x: -50, y: 0, z: -50};
var enPos = {x: +50, y: 0, z: +50};

io.on('connection', function (socket) {
	console.log('Player Connected: ' + socket.id);

	socket.on('requestIDS', function (data) {
		playerIndex++;
		enemyIndex--;
		console.log('Player with id ' + socket.id + ' requested IDs.');
		if(player1Socket){
			console.log('Player 2 Found.');
			player2Socket = socket;
			socket.emit('processIDS', playerIndex, enemyIndex, enPos, plPos);
		} 
		else {
			console.log('Player 1 Found.');
			player1Socket = socket;
			socket.emit('processIDS', playerIndex, enemyIndex, plPos, enPos);
		} 
	});

	socket.on('myPlayerDetails', function (details) {
		var enemySocket = (player1Socket === socket)? player2Socket: player1Socket;
		if(enemySocket) enemySocket.emit('myEnemyDetails', details);

	});

	socket.on('leftClick', function(data) {
		var enemySocket = (player1Socket === socket)? player2Socket: player1Socket;
		if(enemySocket) enemySocket.emit('bulletFired', undefined);
	})
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