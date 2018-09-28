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
	material : new T.MeshLambertMaterial(),
	floor : {
		width : 100, length : 100, thickness : 1, yPos: -10,
		rows: 10, cols: 10, bMargin: 0.03,
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
					this.material, 0.1);
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
	material : new T.MeshPhongMaterial( { color: 0x00ff00 , transparent: true} ),
	imageMaterial : new T.MeshPhongMaterial( { color: 0x00ff00 , transparent: true} ),
	dubba : new Physijs.BoxMesh( new T.BoxGeometry(1, 2, 1), undefined, 10 ),
	cloneEffect: {
		mesh: new T.Mesh( new THREE.SphereGeometry( 5, 32, 32 ), 
			new THREE.MeshBasicMaterial({color: 0x0000ff, transparent: true, opacity: 0.5})),
		isCloning: false, 
		cloneTime: 1, //Seconds
		cloneStartingTime: undefined,
		startCloning: function(player) {
			player.clone.dubba.add(player.cloneEffect.mesh);
			player.cloneEffect.isCloning = true;
			player.cloneEffect.cloneStartingTime = new Date(); 
			this.createClone(player);
		},
		createClone: function(player) {
			player.clone.dubba.translateX( player.dubba.position.x - player.clone.dubba.position.x );
			player.clone.dubba.translateY( player.dubba.position.y - player.clone.dubba.position.y );
			player.clone.dubba.translateZ( player.dubba.position.z - player.clone.dubba.position.z );
			if(!player.clone.isAlive) {
				player.clone.isAlive = true;
				scene.add(player.clone.dubba);
			}
		},
		continueCloning: function(player) {
			//Assumes Key state is already checked
			var c = player.cloneEffect;
			if(c.isCloning){
				var time = new Date();
				var delT = (time.getSeconds() - c.cloneStartingTime.getSeconds()) 
					+ (time.getMilliseconds() - c.cloneStartingTime.getMilliseconds())/1000;
				if(delT > c.cloneTime){
					c.isCloning = false;
					player.clone.dubba.remove(c.mesh);
				}
				else{
					var r = (delT / c.cloneTime);
					c.mesh.scale.x = c.mesh.scale.y = c.mesh.scale.z = r;
					c.mesh.material.opacity = 1 - r;
				}
			}
		},
	},
	flag: Array(6).fill(false), 
	keyIndexMap: [['a', 0], ['s', 1], ['d', 2], ['w', 3], ['e', 4], ['z', 5]],
	speed: 20, camera: undefined,
	clone: {
		isAlive: false
	}, //A Definition for a clone, use an array of objects of this type to implement clones
	teleport : {
		teleporting: false,
		teleport: function(player) {
			if(player.clone.isAlive) {
				var p1 = player.dubba.position;
				var p2 = player.clone.dubba.position;
				var temp = new T.Vector3(p1.x, p1.y, p1.z);
				p1.set(p2.x, p2.y, p2.z);
				p2.set(temp.x, temp.y, temp.z);
			}
		},
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
		this.clone.dubba = this.dubba.clone();
	},
	addToScene: function () {
		scene.add( this.dubba );
		// scene.add( this.motionEffect.image );
	},
	update: function (dT) {
		// this.dubba.setAngularVelocity ( new THREE.Vector3( 0, 0, 0 ) );
		this.camera.lookAt(new T.Vector3(player.dubba.position.x, 
									player.dubba.position.y + 2,
									player.dubba.position.z));
		var moved = this.flag[0] | this.flag[1] | this.flag[2] | this.flag[3];

    	if(moved) {
			var lookVector = new T.Vector3(-this.camera.position.x, 0,-this.camera.position.z).normalize();
			var left = new T.Vector3(lookVector.z, 0, - lookVector.x); //left = y cross lookVector
			var disp = new T.Vector3();
	    	if(this.flag[0]) disp.add(left);
			if(this.flag[3]) disp.add(lookVector);
			if(this.flag[2]) disp.add(left.negate());
			if(this.flag[1]) disp.add(lookVector.negate());
			disp.normalize().multiplyScalar(this.speed);
    		player.dubba.setLinearVelocity(disp);
    	}
    	else this.dubba.setLinearVelocity(new T.Vector3(0, 0, 0));

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
			bulletMgr.createBullet(dir, pos);
		}
	}
}

var bulletMgr = {
	bullets: [],
	newBullet: function() {
		return {
			mesh: new Physijs.SphereMesh( 
				new T.SphereGeometry( 0.1, 3, 3 ), 
				new T.MeshBasicMaterial({ color: 0xff0000 }), 1),
			speed: 15
		};
	},
	createBullet: function(direction, location) {
		var temp = this.newBullet();
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