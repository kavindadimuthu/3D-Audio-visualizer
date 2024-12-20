import * as THREE from 'three';
import {GUI} from 'dat.gui';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass';

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	45,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);

const params = {
	red: 1.0,
	green: 1.0,
	blue: 1.0,
	threshold: 0.15,
	strength: 0.5,
	radius: 1.0
}

renderer.outputColorSpace = THREE.SRGBColorSpace;

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
bloomPass.threshold =  0.15;
bloomPass.strength = 0.35;
bloomPass.radius = 1.0;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const outputPass = new OutputPass();
bloomComposer.addPass(outputPass);

camera.position.set(0, -2, 14);
camera.lookAt(0, 0, 0);

const uniforms = {
	u_time: {type: 'f', value: 0.0},
	u_frequency: {type: 'f', value: 0.0},
	u_red: {type: 'f', value: 0.3},
	u_green: {type: 'f', value: 0.1},
	u_blue: {type: 'f', value: 0.8}
}

const mat = new THREE.ShaderMaterial({
	uniforms,
	vertexShader: document.getElementById('vertexshader').textContent,
	fragmentShader: document.getElementById('fragmentshader').textContent
});

// const geo = new THREE.IcosahedronGeometry(4, 30 );
let geo;
let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;

function updateGeoRadius(windowWidth, windowHeight) {
  const radius = Math.min(windowWidth, windowHeight) / 200; // Adjust the divisor as needed
  const detail = Math.floor(radius*8);
  console.log(radius, detail);
  geo = new THREE.IcosahedronGeometry(radius, detail);
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  mesh.material.wireframe = true;

}

// Call the function initially and whenever the canvas size changes
updateGeoRadius(windowWidth, windowHeight);


const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.Audio(listener);

// Load audio by an input file
const audioFileInput = document.getElementById('audioFileInput');
audioFileInput.addEventListener('change', function(event) {
    // clear previuos sound buffer
    sound.stop();
    sound.setBuffer(null);

    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            const context = new (window.AudioContext || window.webkitAudioContext)();
            
            context.decodeAudioData(arrayBuffer, function(buffer) {
                sound.setBuffer(buffer);
                sound.play();
            }, function(error) {
                console.error('Error decoding audio data:', error);
            });
        };
        reader.readAsArrayBuffer(file);
    }
});

const canvas = renderer.domElement;

// Load default audio if no file is uploaded within 5 seconds
setTimeout(() => {
    if (!sound.buffer) {
        const loader = new THREE.AudioLoader();
        loader.load('audio/Beats.mp3', function (buffer) {
            sound.setBuffer(buffer);
            canvas.addEventListener('click', function() {
                sound.play();
            });
        });
    }
}, 1000);

// Volume control
const volumeControl = document.getElementById('volumeControl');
volumeControl.addEventListener('input', function(event) {
    sound.setVolume(event.target.value);
});

const analyser = new THREE.AudioAnalyser(sound, 32);

const gui = new GUI();

const colorsFolder = gui.addFolder('Colors');
colorsFolder.add(params, 'red', 0, 1).onChange(function(value) {
	uniforms.u_red.value = Number(value);
});
colorsFolder.add(params, 'green', 0, 1).onChange(function(value) {
	uniforms.u_green.value = Number(value);
});
colorsFolder.add(params, 'blue', 0, 1).onChange(function(value) {
	uniforms.u_blue.value = Number(value);
});

const bloomFolder = gui.addFolder('Bloom');
bloomFolder.add(params, 'threshold', 0, 1).onChange(function(value) {
	bloomPass.threshold = Number(value);
});
bloomFolder.add(params, 'strength', 0, 3).onChange(function(value) {
	bloomPass.strength = Number(value);
});
bloomFolder.add(params, 'radius', 0, 1).onChange(function(value) {
	bloomPass.radius = Number(value);
});

let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', function(e) {
	let windowHalfX = window.innerWidth / 2;
	let windowHalfY = window.innerHeight / 2;
	mouseX = (e.clientX - windowHalfX) / 100;
	mouseY = (e.clientY - windowHalfY) / 100;
});

const clock = new THREE.Clock();
function animate() {
	camera.position.x += (mouseX - camera.position.x) * .05;
	camera.position.y += (-mouseY - camera.position.y) * 0.5;
	camera.lookAt(scene.position);
	uniforms.u_time.value = clock.getElapsedTime();
	uniforms.u_frequency.value = analyser.getAverageFrequency();
    bloomComposer.render();
	requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', function(updateGeoRadius) {
	let windowWidth = window.innerWidth
	let windowHeight = window.innerHeight
	updateGeoRadius(windowWidth, windowHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
	bloomComposer.setSize(window.innerWidth, window.innerHeight);
});
