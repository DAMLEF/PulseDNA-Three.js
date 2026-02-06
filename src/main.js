import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import {lerp} from "three/src/math/MathUtils";
import {Player} from "./Player";
import * as GO from  "./GameObject"
import {GameObject} from "./GameObject";

// =====================
// THREE.JS (VISUEL)
// =====================
const scene = new THREE.Scene()

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
})

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
)
camera.position.set(0, 0, 0)
camera.lookAt(1, 0, 0)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Lumière
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 10, 5)
scene.add(light)

let gameObjects = [];

// Sol (Three / Cannon)
const groundObject = new GO.PlaneObject(150, new THREE.MeshStandardMaterial({ color: 0x808080 }));
groundObject.setPosition(0, -0.05, 0);
groundObject.initObject(scene, world, gameObjects)

// Cube (Three / Cannon)

let vertexShaderCode = "uniform vec3 playerPos;    // position du joueur\n" +
    "uniform float maxDist;     // distance max avant dispersion\n" +
    "uniform float time;        // temps pour animer un peu\n" +
    "varying vec3 vColor;\n" +
    "\n" +
    "float rand(vec3 co){\n" +
    "    return fract(sin(dot(co.xyz ,vec3(12.9898,78.233, 45.164))) * 43758.5453);\n" +
    "}\n" +
    "\n" +
    "    void main() {\n" +
    "    //vec3 newPos = position;\n" +
    "    vec3 newPos = (modelMatrix * vec4(position, 1.0)).xyz;\n" +
    "\n" +
    "    // distance du vertex au joueur\n" +
    "    float dist = distance(playerPos, position);\n" +
    "\n" +
    "    if(dist > maxDist){\n" +
    "        // projection le long de la normale\n" +
    "        vec3 offset = normal * (dist - maxDist);\n" +
    "\n" +
    "        // ajout d'un offset aléatoire\n" +
    "        float r = rand(position);\n" +
    "        offset += (r - 0.5) * 2.0; // décalage -1 à 1\n" +
    "\n" +
    "        // Lerp selon distance pour effet progressif\n" +
    "        float t = clamp((dist - maxDist) / 5.0, 0.0, 1.0);\n" +
    "        newPos = mix(position, position + offset, t);\n" +
    "    }\n" +
    "\n" +
    "    vColor = vec3(dist / maxDist, 0.5, 1.0); // juste pour debug couleur\n" +
    "\n" +
    "    //gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);\n" +
    "\n" +
    "    vec4 mvPosition = viewMatrix * vec4(newPos, 1.0);\n" +
    "    gl_Position = projectionMatrix * mvPosition;\n" +
    "    }"

const testShaderMat = new THREE.ShaderMaterial({
    vertexShader: vertexShaderCode,
    fragmentShader: 'varying vec3 vColor;\n' +
        '\n' +
        'void main() {\n' +
        '    gl_FragColor = vec4(vColor, 1.0);\n' +
        '}',
    uniforms: {
        playerPos: { value: new THREE.Vector3(10,0,0) },
        maxDist: { value: 5 },
        time: { value: 0 }
    },
    side: THREE.DoubleSide,
    color: 0xff0000,
});

const cubeObject = new GO.CubeObject(1, 1, testShaderMat)
cubeObject.initObject(scene, world, gameObjects)
cubeObject.setPosition(5, 15, 5)


// Player Section
const playerGO = new GO.SphereObject(0.5, 1, new THREE.MeshStandardMaterial({ color: 0x0000FF }))
playerGO.setPosition(0, 2, 0);
playerGO.initObject(scene, world, gameObjects)



let p = new Player(camera, renderer.domElement, playerGO);

// =====================
// Système de Debug (Ajout d'une DIV pour visualiser des infos en TR
// =====================

const infoDiv = document.createElement('div')
infoDiv.style.position = 'absolute'
infoDiv.style.top = '10px'
infoDiv.style.left = '10px'
infoDiv.style.color = 'white'
infoDiv.style.backgroundColor = 'rgba(0,0,0,0.5)'
infoDiv.style.padding = '5px'
infoDiv.style.fontFamily = 'monospace'
document.body.appendChild(infoDiv)

// =====================
// BOUCLE
// =====================
const clock = new THREE.Clock()


function animate() {
    requestAnimationFrame(animate)

    const delta = clock.getDelta()
    world.step(1 / 60, delta)

    // Synchronisation Cannon → Three
    for(const go of gameObjects){
        go.update(go);
    }

    renderer.render(scene, camera)

    p.update(delta)

    // ----- Affichage infos DEBUG -----
    infoDiv.innerHTML = `
    Position: x=${playerGO.body.position.x.toFixed(2)}, 
    y=${playerGO.body.position.y.toFixed(2)}, 
    z=${playerGO.body.position.z.toFixed(2)}<br>
    Camera rotation: yaw=${(p.yawRotation*180/Math.PI).toFixed(1)}°, 
    pitch=${(p.pitchRotation*180/Math.PI).toFixed(1)}°`

    testShaderMat.uniforms.playerPos.value.copy(playerGO.body.position);
    testShaderMat.uniforms.time.value = clock.getElapsedTime();

}

animate()