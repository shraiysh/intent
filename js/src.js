var T = THREE;
var frames = 0, seconds = new Date().getSeconds(), fps;

var scene = new T.Scene();
var camera = new T.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
var controls = new T.OrbitControls( camera );

var renderer = new T.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var room = {
	material : new T.MeshBasicMaterial( { color: 0x00ff00 } ),
	floor : new T.Mesh( new T.BoxGeometry( 70, 1, 70 ), this.material ),

	constructor : function () {
		this.floor.position.set(0, 0, -10);
	},
	addToScene: function (){
		scene.add( this.floor );
	}

}

room.constructor();
room.addToScene();

// camera.position.y = 50;
camera.position.x = 0;
camera.position.y = 25;
camera.position.z = 50;
// camera.position = {x:1, y:25, z:50};
// camera.up = { x: 0, y: 1, z: 0};
var animate = function () {
	requestAnimationFrame( animate );

	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;

	controls.update();
	renderer.render( scene, camera );
	calcFPS();
};

var calcFPS = function () {
	frames++;
	var time = new Date();
	if(time.getSeconds() > seconds){
		fps = frames / ((time.getSeconds() - seconds) + time.getMilliseconds() / 1000);
		seconds = time.getSeconds();
		frames = 0;
		// console.log(fps);
	}
}

animate();