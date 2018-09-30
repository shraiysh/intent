var T = THREE;
var frames = 0, lasFrameTime = new Date(), fps;

Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var scene = new Physijs.Scene;
scene.setGravity({x: 0, y: -100, z: 0});
scene.background = new T.Color(0x77aaff);
var camera = new T.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
var EnemyCamera = new T.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var controls = new T.OrbitControls( camera, document );
var renderer = new T.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// socket.on('message', function (data) {
// 	// console.log(data);
// 	console.log('Message from server: ' + data.time);
// 	// socket.emit('my other event', { my: 'data' });
// });

var room = {
	material : Physijs.createMaterial(new T.MeshLambertMaterial(), 0, 0),
	floor : {
		width : 100, length : 100, thickness : 1, yPos: -1.01,
		rows: 10, cols: 10, bMargin: 0.3,
		mesh: Array(this.rows),
	},
	light: new T.PointLight(0xffff00, 0.75, 10000, 2),
	ambLight: new T.AmbientLight(0xffffff),
	// axes: new T.AxesHelper(50),

	init : function () {
		var t = this.floor;
		var bWid = t.width / t.rows, bLen = t.length / t.cols;
		for( var row = 0; row < t.rows; row++ ) {
			t.mesh[row] = [];
			for( var col = 0; col < t.cols; col++ ) {
				t.mesh[row][col] = new Physijs.BoxMesh(
					new T.BoxGeometry( bWid - t.bMargin, t.thickness, bLen - t.bMargin ), 
					this.material, 0);
				t.mesh[row][col].position.set( -t.width/2 + (row - 0.5) * bWid, t.yPos, -t.length/2 + (col - 0.5) * bLen );
				t.mesh[row][col].isWall = true;
			}
		}
		this.light.position.set(0, 15, 0);
		this.addToScene();
	},
	addToScene: function (){
		scene.add(this.light);
		this.floor.mesh.forEach( row => {
			row.forEach( block => {
				scene.add(block);
			})
		})
		// this.light.add(this.axes);
	}
}

var printInfo = false; //Debug only

class Player {
	constructor(camera, position, color) {
		this.uid = undefined;
		this.material = Physijs.createMaterial( new T.MeshPhongMaterial( { color: color , transparent: true} ), 0, 1);
		this.imageMaterial = new T.MeshPhongMaterial( { color: color , transparent: true} );
		this.dubba = new Physijs.BoxMesh( new T.BoxGeometry(1, 2, 1), undefined, 1 );
		this.flag = Array(5).fill(false);
		this.keyIndexMap = [['a', 0], ['s', 1], ['d', 2], ['w', 3], ['e', 4], ['q', 5], [' ', 6]];
		this.speed = 35;
		this.camOffset = 3;
		this.camera = camera;
		this.minSize = new T.Vector3 ( 1, 2, 1 );
		this.clones = Array(0);	// Every element contains an isAlive after it's created
		this.cloneSize = new T.Vector3( 1, 2, 1 );
		this.cloneEffect = {
			mesh: new T.Mesh( new THREE.SphereGeometry( 5, 32, 32 ), 
				new THREE.MeshBasicMaterial({color: 0x0000ff, transparent: true, opacity: 0.5})),
			isCloning: false, 
			cloneTime: 1, //Seconds
			cloneStartingTime: undefined,
			startCloning: function(player) {			
				if( player.dubba.scale.x > 2 && player.dubba.scale.y > 2 && player.dubba.scale.z > 2) {
					player.cloneEffect.isCloning = true;
					player.cloneEffect.cloneStartingTime = new Date(); 
					this.createClone(player);
				}
				else {
					console.log("TOO SMALL");
					// Make a sound of unable to create clone coz of less size.
				}
			},
			createClone: function(player) {
				var lookVector = new T.Vector3(-player.camera.position.x, 0, -player.camera.position.z);
					// .multiplyScalar(player.dubba.scale.length());
				var clone = player.dubba.clone();

				clone.scale.set(1,1,1); 
				clone.position.add(lookVector);
				if(!clone.isAlive) {
					clone.isAlive = true;
					scene.add(clone);
				}
				clone.add(player.cloneEffect.mesh);
				player.dubba.scale.set( player.dubba.scale.x / 2, player.dubba.scale.y / 2, player.dubba.scale.z / 2 );	
				player.clones.push(clone);
			},
			continueCloning: function(player) {
				//Assumes Key state is already checked
				var c = player.cloneEffect;
				if(c.isCloning){
					var time = new Date();
					var delT = (time.getSeconds() - c.cloneStartingTime.getSeconds()) 
						+ (time.getMilliseconds() - c.cloneStartingTime.getMilliseconds())/1000;
					if(delT > c.cloneTime){
						//Cloning Completed, Place a form there
						c.isCloning = false;
						player.clones[player.clones.length-1].remove(c.mesh);
					}
					else{
						var r = (delT / c.cloneTime);
						c.mesh.scale.x = c.mesh.scale.y = c.mesh.scale.z = r;
						c.mesh.material.opacity = 1 - r;
					}
				}
			},
		};
		this.teleport = {
			teleporting: false,
			teleport: function(player) {
				if(player.clones.length === 0) return;
				var index = Math.floor ( Math.random () * player.clones.length );
				if(player.clones[index].isAlive) {
					var p1 = player.dubba.position;
					var p2 = player.clones[index].position;
					var temp = new T.Vector3(p1.x, p1.y, p1.z);
					p1.set(p2.x, p2.y, p2.z);
					p2.set(temp.x, temp.y, temp.z);
				}
			},
		};
		this.motionEffect= {
			isMoving : false,
			factor : 0.001,		// Factor with which size is to be increased with movement
			movingOpacity : 0.7,
			stopOpacity : 0.5,
			maxScale : 10 * 1.732,

			moving : function ( player , dT) {
				// Opacity
				player.material.opacity = this.movingOpacity;

				// Player Position
				if( !this.isMoving ) this.isMoving = true;
				var lookVector = new T.Vector3(-player.camera.position.x, 0,-player.camera.position.z).normalize();
				var left = new T.Vector3(lookVector.z, 0, - lookVector.x); //left = y cross lookVector
				var disp = new T.Vector3();

				if(player.flag[0]) disp.add(left);
				if(player.flag[3]) disp.add(lookVector);
				if(player.flag[2]) disp.add(left.negate());
				if(player.flag[1]) disp.add(lookVector.negate());

				disp.normalize().multiplyScalar(player.speed);
				if(player.flag[6]) disp.y = player.speed;

				// Player size
				if ( player.dubba.scale.length() < this.maxScale) {
					player.dubba.scale.addScalar(dT * this.factor);
				}

				player.dubba.setLinearVelocity(disp);
				
			},			
			stop : function ( player ) {
				player.material.opacity = this.stopOpacity;
				this.isMoving = false;
				this.updateSizeStartTime = undefined;
				player.dubba.setLinearVelocity(new T.Vector3(0, 0, 0));
			}
		};
		this.init(position);
	}
	init (position) {
		this.dubba.material = this.material;
		this.dubba.add(this.camera);
		this.camera.position.set(0, 2, 5);
		if(position) this.dubba.position.set(position.x, position.y, position.z);
		this.addToScene();
	}
	addToScene () {
		scene.add( this.dubba );
	}
	update (dT) {
		this.dubba.rotation.set(0, 0, 0);
		var t = new T.Vector3(this.dubba.position.x, this.dubba.position.y + this.camOffset, this.dubba.position.z);
		this.camera.lookAt( t );
		if( this.flag[0] | this.flag[1] | this.flag[2] | this.flag[3] | this.flag[6]) {
			this.motionEffect.moving( this, dT );
		}
		else this.motionEffect.stop( this );

		if(this.flag[4]){
			if(this.cloneEffect.isCloning) this.cloneEffect.continueCloning(this);
			else this.cloneEffect.startCloning(this);
		}
		else this.cloneEffect.continueCloning(this);
		
		if(this.flag[5]) {
			if(!this.teleport.teleporting) {
				this.teleport.teleport(this);
				this.teleport.teleporting = true;
			}
		}
		else this.teleport.teleporting = false;

		//Send Camera location, player location and flags to the server
		if(this.uid > 0){
			var details = {};
			details.id = this.uid;
			details.flag = this.flag;
			details.camPos = this.camera.position;
			details.playerPos = this.dubba.position;

			socket.emit('myPlayerDetails', details);
		}
	}
}

var addInputListeners = function(playerObject){
	var keyHandling = function (event, val) {
		playerObject.keyIndexMap.filter((item) => item[0] === event.key )
			.forEach((item) => playerObject.flag[item[1]] = val);
	}
	var onKeyDown = function (event) {
		keyHandling(event, true);
	}
	var onKeyUp = function (event) {
		keyHandling(event, false);
	}
	var onMouseDown = function (event) {
		if(event.button === 0){ //First Click
			var dir = new T.Vector3();
			var pos = new T.Vector3();
			playerObject.camera.getWorldPosition(pos);
			dir = new T.Vector3(-playerObject.camera.position.x, -playerObject.camera.position.y,-playerObject.camera.position.z);
			dir.y += playerObject.camOffset;
			bulletMgr.createBullet(dir, pos, playerObject.dubba.scale.x);
		}
	}

	document.addEventListener("keydown", onKeyDown, false);
	document.addEventListener("keyup", onKeyUp, false);
	document.addEventListener("mousedown", onMouseDown, false);
}

//Receive Camera location, player location and flags from the server
//And set enemy state to the received state 


var enemy = new Player(EnemyCamera, undefined, 0xff0000);
var player = new Player(camera, undefined, 0x00ff00);
// player.addToScene();

var socket = io('http://localhost');
socket.on('processIDS', function (plID, enID, plPos, enPos) {
	player.uid = plID;
	enemy.uid = enID;
	player.dubba.position.set(plPos.x, plPos.y, plPos.z);
    player.dubba.__dirtyPosition = true;
	enemy.dubba.position.set(enPos.x, enPos.y, enPos.z);
    enemy.dubba.__dirtyPosition = true;
	if(plID && enID) console.log('ID Reception Succeeded:', plID, enID);
});

socket.on('myEnemyDetails', function(details){
	enemy.flag = details.flag;
	enemy.camera.position.set(details.camPos.x, details.camPos.y, details.camPos.z);
	enemy.dubba.position.set(details.playerPos.x, details.playerPos.y, details.playerPos.z);
    enemy.dubba.__dirtyPosition = true;
});

socket.emit('requestIDS', undefined);

var bulletMgr = {
	bullets: [],
	newBullet: function(scale) {
		return {
			mesh: new Physijs.SphereMesh( 
				new T.SphereGeometry( scale/10, 3, 3 ), 
				Physijs.createMaterial(new T.MeshBasicMaterial({ color: 0xff0000 }), 0, 0), 1),
			speed: 35
		};
	},
	createBullet: function(direction, location, scale) {
		var temp = this.newBullet(scale);
		temp.mesh.position.set(location.x, location.y, location.z);
    	temp.mesh.__dirtyPosition = true;
		direction.multiplyScalar(temp.speed);
		this.bullets.push(temp);
		temp.mesh.addEventListener('collision', function( other_object, rel_velocity, rel_rotation, normal ) {
			if(other_object.isWall){
				scene.remove(other_object);
			}
    	});
		scene.add(temp.mesh);
		temp.mesh.setLinearVelocity(direction);
	},
	update: function (){
		//If a bullet is too far away, remove it from the scene
		//Handle bullet collision to destroy tiles and damage players
		//Maybe use event handlers for this
	}
};

var animate = function () {
	requestAnimationFrame( animate );

	controls.update();
	
	var dT = calcFPS();
	player.update(dT);
	enemy.update(dT);
	scene.simulate();
	renderer.render( scene, camera );
};

var calcFPS = function () {
	frames++;
	var time = new Date();
	var dT = time.getMilliseconds() - lasFrameTime.getMilliseconds();
	if(dT < 0){
		dT += 1000;
		fps = frames / (1 + 0.001 * time.getMilliseconds());
		frames = 0;
		// console.log(fps);
	}
	lasFrameTime = time;
	return dT;
}

room.init();
addInputListeners(player);
animate();
