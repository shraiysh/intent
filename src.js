var T = THREE;
var frames = 0, lasFrameTime = new Date(), fps;

var scene = new T.Scene();
var camera = new T.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new T.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var room = {
	material : new T.MeshPhongMaterial(),
	floor : new T.Mesh( new T.BoxGeometry( 100, 1, 100 ), undefined ),
	light: new T.PointLight(0xffffff, 0.75, 10000, 2),
	ambLight: new T.AmbientLight(0xffffff),
	axes: new T.AxesHelper(50),

	init : function () {
		this.floor.material = this.material;
		this.floor.position.set(0, -10, 0);
		this.light.position.set(0, 15, 0);
		this.addToScene();
	},
	addToScene: function (){
		scene.add(this.light);
		this.light.add(this.axes);
		scene.add(this.floor);
	}
}

var printInfo = false;

var player = {
	material : new T.MeshPhongMaterial( { color: 0x00ff00 } ),
	dubba : new T.Mesh( new T.BoxGeometry(1, 2, 1), undefined ),
	flag: Array(4).fill(false), //flags for each input key, true => Key is down and vice versa
	// 0 - a
	// 1 - s
	// 2 - d
	// 3 - w
	speed: 0.05, camera: undefined,

	init : function (camera) {
		this.camera = camera;
		this.dubba.material = this.material;
		document.addEventListener("keydown", this.onKeyDown, false);
		document.addEventListener("keyup", this.onKeyUp, false);
		this.addToScene();
		this.dubba.add(this.camera);
		this.camera.position.set(0, 1, 2);
	},
	addToScene: function () {
		scene.add(this.dubba);
	},
	update: function (dT) {
		var lookVector = new T.Vector3(
			-camera.position.x, 0,
			-camera.position.z).normalize();
		if(printInfo) {
			console.log("this.dubba.position = ", this.dubba.position);
			console.log("camera.position = ", camera.position);
			printInfo = false;
		}
		var left = new T.Vector3(lookVector.z, 0, - lookVector.x); //left = y cross lookVector
		var disp = new T.Vector3();

		if(this.flag[0]) disp.add(left);
		if(this.flag[3]) disp.add(lookVector);
		if(this.flag[2]) disp.add(left.negate());
		if(this.flag[1]) disp.add(lookVector.negate());

		disp.normalize().multiplyScalar(dT * this.speed);
		player.dubba.position.add(disp);
	},

	onKeyDown : function (event) {
		switch(event.key){
			case 'a':
				player.flag[0] = true; break;
			case 's':
				player.flag[1] = true; break;
			case 'd':
				player.flag[2] = true; break;
			case 'w':
				player.flag[3] = true; break;
		}
	},
	onKeyUp : function (event) {
		switch(event.key){
			case 'a':
				player.flag[0] = false; break;
			case 's':
				player.flag[1] = false; break;
			case 'd':
				player.flag[2] = false; break;
			case 'w':
				player.flag[3] = false; break;
		}
	}
}

room.init();
player.init(camera);
var controls = new THREE.OrbitControls( camera, document );

camera.position.set(0, 2, 5);

var animate = function () {
	requestAnimationFrame( animate );

	controls.update();
	camera.lookAt( player.dubba.position );
	renderer.render( scene, camera );
	var dT = calcFPS();
	player.update(dT);
};

var calcFPS = function () {
	frames++;
	var time = new Date();
	var dT = time.getMilliseconds() - lasFrameTime.getMilliseconds();
	if(dT < 0){
		fps = frames / (1 + 0.001 * time.getMilliseconds());
		frames = 0;
		dT += 1000;
		// console.log(fps);s
	}
	lasFrameTime = time;
	return dT;
}

animate();