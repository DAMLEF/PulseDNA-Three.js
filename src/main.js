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

let vertexShaderCode = `

    varying float vExplodeFactor;

    uniform vec3 uPlayerPosition;
    uniform float uMinDistance;
    uniform float uMaxDistance;
    uniform float uExplosionStrength;

    void main() {

        vec4 worldPos = modelMatrix * vec4(position, 1.0);

        float dist = distance(worldPos.xyz, uPlayerPosition);

        float t = clamp((dist - uMinDistance) / (uMaxDistance - uMinDistance), 0.0, 1.0);

        vec3 explodeOffset = normal * t * uExplosionStrength;

        vec4 displacedPosition = worldPos + vec4(explodeOffset, 0.0);

        gl_Position = projectionMatrix * viewMatrix * displacedPosition;

        vExplodeFactor = t;
    }
  `;

const testShaderMat = new THREE.ShaderMaterial({
    vertexShader: vertexShaderCode,
    fragmentShader: `
    varying float vExplodeFactor;

    void main() {

        vec3 baseColor = vec3(0.6, 0.6, 0.7);
        vec3 explodedColor = vec3(1.0, 0.4, 0.2);

        vec3 finalColor = mix(baseColor, explodedColor, vExplodeFactor);

        gl_FragColor = vec4(finalColor, 1.0);
    }`,
    uniforms: {
        uPlayerPosition: { value: new THREE.Vector3() },
        uMinDistance: { value: 3.0 },   // x
        uMaxDistance: { value: 15.0 },  // y
        uExplosionStrength: { value: 2.0 }
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
    pitch=${(p.pitchRotation*180/Math.PI).toFixed(1)}°<br>
    Velocity : x =${playerGO.body.velocity.x.toFixed(1)} y=${playerGO.body.velocity.y.toFixed(1)} z=${playerGO.body.velocity.z.toFixed(1)}`

    testShaderMat.uniforms.uPlayerPosition.value.copy(playerGO.body.position);


}

animate()