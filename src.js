var T = THREE;
var frames = 0, seconds = new Date().getSeconds(), fps;

var scene = new T.Scene();
var camera = new T.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
var controls = new T.OrbitControls( camera );

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

var player = {
	material : new T.MeshPhongMaterial( { color: 0x00ff00 } ),
	dubba : new T.Mesh( new T.BoxGeometry(1, 2, 1), undefined ),
	flagRelX: 0, flagRelZ: 0,
	speed: 200,

	init : function () {
		this.dubba.material = this.material;
		document.addEventListener("keydown", this.onKeyDown, false);
		document.addEventListener("keyup", this.onKeyUp, false);
		this.addToScene();
	},
	addToScene: function () {
		scene.add(this.dubba);
	},
	onKeyDown: function (event) {
		// console.log("Key Downed -----------");
		if(event.key === 'a' && this.flagRelX === 0){
			this.flagRelX = -1; 
		} else if(event.key === 's') {
			this.flagRelZ = +1; 
		} else if(event.key === 'd') {
			this.flagRelX = +1; 
		} else if(event.key === 'w') {
			this.flagRelZ = -1; 
		}
	},
	onKeyUp: function (event) {
		// console.log("Key Upped >>>>");
		if(event.key === 'a'){
			this.flagRelX = 0; 
		} else if(event.key === 's') {
			this.flagRelZ = 0; 
		} else if(event.key === 'd') {
			this.flagRelX = 0; 
		} else if(event.key === 'w') {
			this.flagRelZ = 0; 
		}
	},
	update: function (dT) {
		// console.log("up");
		if(this.flagRelX !== 0) console.log("YAY");
		player.dubba.translateOnAxis({
			x: dT * this.flagRelX, 
			y: 0, 
			z: dT * this.flagRelZ
		}, this.speed);
	}
}

room.init();
player.init();

camera.position.set(0, 2, 5);

var animate = function () {
	requestAnimationFrame( animate );

	controls.update();
	renderer.render( scene, camera );
	var dT = calcFPS();
	player.update(dT);
};

var calcFPS = function () {
	frames++;
	var time = new Date();
	var dT = (time.getSeconds() - seconds) + time.getMilliseconds() / 1000;
	if(dT > 1){
		fps = frames / dT;
		seconds = time.getSeconds();
		frames = 0;
		// console.log(fps);
	}
	return dT;
}

animate();