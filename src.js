var T = THREE;
var frames = 0, lasFrameTime = new Date(), fps;

Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var scene = new Physijs.Scene;
scene.setGravity({x: 0, y: 0, z: 0});
scene.background = new T.Color(0x77aaff);
var camera = new T.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var controls = new T.OrbitControls( camera, document );
var renderer = new T.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var room = {
	material : Physijs.createMaterial(new T.MeshLambertMaterial(), 0, 0),
	floor : {
		width : 100, length : 100, thickness : 1, yPos: -10,
		rows: 10, cols: 10, bMargin: 0.3,
		mesh: Array(this.rows),
	},
	light: new T.PointLight(0xffffff, 0.75, 10000, 2),
	ambLight: new T.AmbientLight(0xffffff),
	axes: new T.AxesHelper(50),

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
		this.light.add(this.axes);
	}
}

var printInfo = false; //Debug only

var player = {
	material : Physijs.createMaterial( new T.MeshPhongMaterial( { color: 0x00ff00 , transparent: true} ), 0, 1),
	imageMaterial : new T.MeshPhongMaterial( { color: 0x00ff00 , transparent: true} ),
	dubba : new Physijs.BoxMesh( new T.BoxGeometry(1, 2, 1), undefined, 1 ),
	flag: Array(5).fill(false), 
	keyIndexMap: [['a', 0], ['s', 1], ['d', 2], ['w', 3], ['e', 4], ['q', 5]],
	speed: 15, camera: undefined,
	minSize : new T.Vector3 ( 1, 2, 1 ),
	clones : Array(0),	// Every element contains an isAlive after it's created
	cloneSize : new T.Vector3( 1, 2, 1 ),
	cloneEffect: {
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
			clone.add(player.cloneEffect.mesh);
			
			clone.scale.set(1,1,1); 
			clone.position.add(lookVector);
			if(!clone.isAlive) {
				clone.isAlive = true;
				scene.add(clone);
			}
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
	},
	
	teleport : {
		teleporting: false,
		teleport: function(player) {
			var index = Math.floor ( Math.random () * player.clones.length );
			if(player.clones[index].isAlive) {
				var p1 = player.dubba.position;
				var p2 = player.clones[index].position;
				var temp = new T.Vector3(p1.x, p1.y, p1.z);
				p1.set(p2.x, p2.y, p2.z);
				p2.set(temp.x, temp.y, temp.z);
			}
		},
	},
	motionEffect: {
		isMoving : false,
		factor : 0.01,		// Factor with which size is to be increased with movement
		movingOpacity : 0.7,
		stopOpacity : 0.5,
		maxScale : new T.Vector3( 10, 10, 10 ),

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
			player.dubba.setLinearVelocity(disp);

			// Player size
			if ( player.dubba.scale.length() < this.maxScale.length()) 
				player.dubba.scale.addScalar(dT * this.factor);
		},			
		stop : function ( player ) {
			player.material.opacity = this.stopOpacity;
			this.isMoving = false;
			this.updateSizeStartTime = undefined;
			player.dubba.setLinearVelocity(new T.Vector3(0, 0, 0));
		}
	},
	init : function (camera) {
		this.camera = camera;
		this.dubba.material = this.material;
		document.addEventListener("keydown", this.onKeyDown, false);
		document.addEventListener("keyup", this.onKeyUp, false);
		document.addEventListener("mousedown", this.onMouseDown, false);
		this.dubba.add(this.camera);
		this.dubba.inertia = Infinity; // Disables rotation on all collisions
		this.camera.position.set(0, 2, 5);
		this.addToScene();

		//This is the list of properties that will be copied to the clone
	},
	addToScene: function () {
		scene.add( this.dubba );
		// scene.add( this.motionEffect.image );
	},
	update: function (dT) {
		player.camera.lookAt( player.dubba.position );
		if( this.flag[0] | this.flag[1] | this.flag[2] | this.flag[3] ) {
			this.motionEffect.moving( player, dT );
		}
		else this.motionEffect.stop( player );

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
	},
	keyHandling: function(event, val) {
		player.keyIndexMap.filter((item) => item[0] === event.key )
			.forEach((item) => player.flag[item[1]] = val);
	},
	onKeyDown : function (event) {
		player.keyHandling(event, true);
	},
	onKeyUp : function (event) {
		player.keyHandling(event, false);
	},
	onMouseDown: function(event) {
		if(event.button === 0){ //First Click
			var dir = new T.Vector3();
			var pos = new T.Vector3();
			player.dubba.getWorldPosition(pos);
			camera.getWorldDirection( dir );
			bulletMgr.createBullet(dir, pos, player.dubba.scale.x);
		}
	}
}

var bulletMgr = {
	bullets: [],
	newBullet: function(scale) {
		return {
			mesh: new Physijs.SphereMesh( 
				new T.SphereGeometry( scale/10, 13, 13 ), 
				Physijs.createMaterial(new T.MeshBasicMaterial({ color: 0xff0000 }), 0, 0), 1),
			speed: 15
		};
	},
	createBullet: function(direction, location, scale) {
		var temp = this.newBullet(scale);
		direction.multiplyScalar(2);
		location.add(direction);
		temp.mesh.position.set(location.x, location.y, location.z);
		direction.multiplyScalar(temp.speed);
		this.bullets.push(temp);
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
player.init(camera);
animate();