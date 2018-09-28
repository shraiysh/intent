var T = THREE;
var frames = 0, lasFrameTime = new Date(), fps;

var scene = new T.Scene();
var camera = new T.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new T.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var room = {
	material : new T.MeshPhongMaterial(),
	floor : {
		width : 100, length : 100, thickness : 1, yPos: -10,
		rows: 1000, cols: 1000, bMargin: 0.03,
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
				t.mesh[row][col] = new T.Mesh(new T.BoxGeometry(
					bWid - t.bMargin, t.thickness, bLen - t.bMargin
				), this.material);
				t.mesh[row][col].position.set(
					-t.width/2 + (row - 0.5) * bWid, t.yPos, -t.length/2 + (col - 0.5) * bLen 
				);
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
		scene.background = new T.Color(0x77aaff);
	}
}

var printInfo = false; //Debug only

var player = {
	material : new T.MeshPhongMaterial( { color: 0x00ff00 , transparent : true} ),
	dubba : new T.Mesh( new T.BoxGeometry(1, 2, 1), undefined ),
	flag: Array(5).fill(false), 
	keyIndexMap: [['a', 0], ['s', 1], ['d', 2], ['w', 3], ['e', 4], ['q', 5]],
	speed: 0.05, camera: undefined,
	maxSize : new T.Vector3 ( 6, 12,  6), minSize : new T.Vector3 ( 1, 2, 1 ),
	clones : Array(0),
	clone: {
		isAlive: false
	}, //A Definition for a clone, use an array of objects of this type to implement clones
	cloneEffect: {
		mesh: new T.Mesh( new THREE.SphereGeometry( 5, 32, 32 ), 
			new THREE.MeshBasicMaterial({color: 0x0000ff, transparent: true, opacity: 0.5})),
		cloning: false, 
		cloneTime: 1, //Seconds
		cloneStartingTime: undefined,
		startCloning: function(player) {
			var oParams = player.dubba.geometry.parameters; // Object parameters
			var cParams = player.clone.dubba.geometry.parameters // Clone parameters
			
			if( oParams.width - cParams.width > player.minSize.x &&
				oParams.height - cParams.height > player.minSize.y &&
				oParams.depth - cParams.depth > player.minSize.z 
			) {
				player.clone.dubba.add(player.cloneEffect.mesh);
				player.cloneEffect.cloning = true;
				player.cloneEffect.cloneStartingTime = new Date(); 
				this.createClone(player);
			}
			else {
				console.log("TOO SMALL");
				// Make a sound of unable to create clone coz of less size.
			}
		},
		createClone: function(player) {
			var oParams = player.dubba.geometry.parameters; // Object parameters
			var cParams = player.clone.dubba.geometry.parameters // Clone parameters
			player.clones[player.clones.length] = player.dubba.clone();
			player.clones[player.clones.length-1].geometry = new T.BoxGeometry(player.minSize.x, player.minSize.y, player.minSize.z );
			player.clones[player.clones.length-1].position.set ( 
				player.dubba.position.x,
				player.dubba.position.y,
				player.dubba.position.z
			);
			if(!player.clones[player.clones.length-1].isAlive) {
				player.clones[player.clones.length-1].isAlive = true;
				scene.add(player.clones[player.clones.length-1]);
			}
			player.dubba.geometry = new T.BoxGeometry(
				oParams.width - cParams.width,
				oParams.height - cParams.height,
				oParams.depth - cParams.depth
			);
		},
		continueCloning: function(player) {
			//Assumes Key state is already checked
			var c = player.cloneEffect;
			if(c.cloning){
				var time = new Date();
				var delT = (time.getSeconds() - c.cloneStartingTime.getSeconds()) 
					+ (time.getMilliseconds() - c.cloneStartingTime.getMilliseconds())/1000;
				if(delT > c.cloneTime){
					//Cloning Completed, Place a form there
					c.cloning = false;
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
	motionEffect: {
		isMoving : false,
		updateSizeStartTime : undefined,
		updateSizeAfter : 0.01, // seconds
		factor : new T.Vector3 ( 1, 1, 1 ),
		movingOpacity : 0.7,
		stopOpacity : 0.05,
		startMoving : function ( player ) {
			this.isMoving = true;
			this.updateSizeStartTime = new Date();
		},
		moving : function ( player , dT) {
			// Opacity
			player.material.opacity = this.movingOpacity;

			// Player Position
			if( !this.isMoving ) this.startMoving( player );
			var lookVector = new T.Vector3(-player.camera.position.x, 0,-player.camera.position.z).normalize();
			var left = new T.Vector3(lookVector.z, 0, - lookVector.x); //left = y cross lookVector
			var disp = new T.Vector3();

			if(player.flag[0]) disp.add(left);
			if(player.flag[3]) disp.add(lookVector);
			if(player.flag[2]) disp.add(left.negate());
			if(player.flag[1]) disp.add(lookVector.negate());

			disp.normalize().multiplyScalar(dT * player.speed);
			player.dubba.position.add(disp);

			// Player size
			var oParams = player.dubba.geometry.parameters;
			if ( oParams.width < player.maxSize.x || oParams.height < player.maxSize.y || oParams.depth < player.maxSize.z) {
				var time = new Date();
				var delT = (time.getSeconds() - this.updateSizeStartTime.getSeconds()) 
					+ (time.getMilliseconds() - this.updateSizeStartTime.getMilliseconds())/1000;
				if( delT > this.updateSizeAfter ) {
					var possibleWidth = oParams.width * ( 1 + delT * this.factor.x);
					var possibleHeight = oParams.height * ( 1 + delT * this.factor.y);
					var possibleDepth = oParams.depth * ( 1 + delT * this.factor.z);
					player.dubba.geometry = new T.BoxGeometry ( 
						possibleWidth < player.maxSize.x ? possibleWidth : player.maxSize.x,
						possibleHeight < player.maxSize.y ? possibleHeight : player.maxSize.y,
						possibleDepth < player.maxSize.z ? possibleDepth : player.maxSize.z
					);
					this.updateSizeStartTime = new Date();
				}
			}
		},			
		stop : function ( player ) {
			player.material.opacity = this.stopOpacity;
			this.isMoving = false;
			this.updateSizeStartTime = undefined;
		}
	},
	init : function (camera) {
		this.camera = camera;
		this.dubba.material = this.material;
		document.addEventListener("keydown", this.onKeyDown, false);
		document.addEventListener("keyup", this.onKeyUp, false);
		this.addToScene();
		this.dubba.add(this.camera);
		this.camera.position.set(0, 6, 15);
		//This is the list of properties that will be copied to the clone
		this.clone.dubba = this.dubba.clone();
	},
	addToScene: function () {
		scene.add(this.dubba);
	},
	update: function (dT) {
		player.camera.lookAt( player.dubba.position );
		if( this.flag[0] | this.flag[1] | this.flag[2] | this.flag[3] ) {
			this.motionEffect.moving( player, dT );
		}
		else this.motionEffect.stop( player );

		if(this.flag[4]){
			if(this.cloneEffect.cloning) this.cloneEffect.continueCloning(this);
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
	}
}

room.init();
player.init(camera);
var controls = new THREE.OrbitControls( camera, document );

var animate = function () {
	requestAnimationFrame( animate );

	controls.update();
	
	var dT = calcFPS();
	player.update(dT);
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

animate();