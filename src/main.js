import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import {lerp} from "three/src/math/MathUtils";

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import {Player} from "./Player";
import * as GO from  "./GameObject"
import * as GM from "./GameManager"


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

const groundObject = new GO.PlaneObject(10, new THREE.MeshStandardMaterial({ color: 0x808080 }));
groundObject.setPosition(0, -1, 0);

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
        uMinDistance: { value: 15.0 },   // x
        uMaxDistance: { value: 35.0 },  // y
        uExplosionStrength: { value: 2.0 }
    },
    side: THREE.DoubleSide,
    color: 0xff0000,
});

const cubeObject = new GO.CubeObject(1, 1, testShaderMat)
cubeObject.initObject(scene, world, gameObjects)
cubeObject.setPosition(3, 15, 3)

// Test néon

let tubeOffset = 8
let tubeGridSize = 75
let gridLastCenter = {x: 0, y: 0, z: 0}

const geometryNeon = new THREE.CylinderGeometry(0.02, 0.02, tubeGridSize, 32)
const materialNeon = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,        // couleur néon
    emissiveIntensity: 1,      // puissance lumineuse
    toneMapped: false,          // important pour garder l’intensité
    transparent: true
})

materialNeon.onBeforeCompile = (shader) => {

    // ---- Uniforms custom
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uPlayerPos = { value: new THREE.Vector3() };
    shader.uniforms.uHideDistance = { value: 5.0 };
    shader.uniforms.uWaveSpeed = { value: 2.0 };
    shader.uniforms.uWaveFrequency = { value: 10.0 };

    // ---- Ajouter varyings
    shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vWorldPos;
        varying vec2 vUvCustom;
        `
    );

    shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        #include <project_vertex>
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vUvCustom = uv;
        `
    );

    // ---- Modifier fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform float uTime;
        uniform vec3 uPlayerPos;
        uniform float uHideDistance;
        uniform float uWaveSpeed;
        uniform float uWaveFrequency;

        varying vec3 vWorldPos;
        varying vec2 vUvCustom;
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>

        float dist = distance(vWorldPos, uPlayerPos);

        if(dist < uHideDistance){
            discard;
        }

        float wave = sin(
            vUvCustom.y * uWaveFrequency +
            uTime * uWaveSpeed
        );
        
        //float wave = sin(uTime * uWaveSpeed + vWorldPos.y * uWaveFrequency);

        float intensity = wave * 0.5 + 0.5;
        intensity = pow(intensity, 2.0);


        // masque progressif
        float mask = smoothstep(0.0, 0.8, intensity);
        mask = pow(mask, 0.1); // plus douce et plus longue
    
        // couleur gris/blanc constante
        vec3 baseColor = vec3(0.9);
    
        // on garde le tube lumineux
        diffuseColor.rgb = baseColor;

        // disparition progressive via alpha
        diffuseColor.a *= mask;
        
        // emissive suit le masque
        totalEmissiveRadiance *= mask;
        `
    );

    // on garde une référence pour update plus tard
    materialNeon.userData.shader = shader;
};

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength
    0.4,  // radius
    0.85  // threshold
);

composer.addPass(bloomPass);

const bokehPass = new BokehPass(scene, camera, {
    focus: 2.0,      // tout devient flou après 5 unités
    aperture: 0.0005,  // très fort flou
    maxblur: 1    // flou max
});

composer.addPass(bokehPass);


const tubeGroup = new THREE.Group();
scene.add(tubeGroup)


function getSnappedCenter(position) {
    return new THREE.Vector3(
        Math.floor(position.x / tubeOffset) * tubeOffset,
        Math.floor(position.y / tubeOffset) * tubeOffset,
        Math.floor(position.z / tubeOffset) * tubeOffset
    );
}

function createGrid(center){
    let tube = null;

    while(tubeGroup.children.length > 0){
        tube = tubeGroup.children[0];
        tubeGroup.remove(tube);

        // bien nettoyer GPU
        tube.geometry.dispose();
        tube.material.dispose();
    }


    for(let x = 0; x < tubeGridSize; x+= tubeOffset) {
        for (let y = 0; y < tubeGridSize / 3; y+= tubeOffset) {

            tube = new THREE.Mesh(geometryNeon, materialNeon)
            tube.position.set(center.x + x - tubeGridSize / 2, y, center.z)
            tube.rotation.x = Math.PI / 2.0;

            tubeGroup.add(tube)

        }
    }

    for(let z = 0; z < tubeGridSize; z += tubeOffset) {
        for (let y = 0; y < tubeGridSize / 3; y+= tubeOffset) {

            tube = new THREE.Mesh(geometryNeon, materialNeon)
            tube.position.set(center.x, y, center.z + z - tubeGridSize / 2)
            tube.rotation.z = Math.PI / 2.0;

            tubeGroup.add(tube)


        }
    }

    for(let x = 0; x < tubeGridSize; x += tubeOffset) {
        for (let z = 0; z < tubeGridSize; z += tubeOffset) {

            tube = new THREE.Mesh(geometryNeon, materialNeon)
            tube.position.set(center.x + x - tubeGridSize / 2, 0, center.z + z  - tubeGridSize / 2)

            tubeGroup.add(tube)


        }
    }
}



// Player Section
const playerGO = new GO.SphereObject(0.5, 1, new THREE.MeshStandardMaterial({ color: 0x0000FF }))
playerGO.setPosition(0, 2, 0);

const loader = new GLTFLoader()

let p = new Player(camera, renderer.domElement, playerGO, scene, world, gameObjects, loader);

createGrid(playerGO.body.position)

// Game Manager
const gm = new GM.GameManager();

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

let gridOffset = 0;
let playerCellPos;

function animate() {
    requestAnimationFrame(animate)

    const delta = clock.getDelta()
    world.step(1 / 60, delta)

    // Synchronisation Cannon → Three
    for(const go of gameObjects){
        go.update(go);
        // TODO: Remove les go si ils sont trop bas (en chute libre)
    }

    p.update(delta, world)

    gm.update(scene, world, gameObjects, testShaderMat);

    //renderer.render(scene, camera)
    composer.render(delta);

    // Actualisez la grille
    playerCellPos = getSnappedCenter(p.getPlayerCell());
    gridOffset = (Math.abs(gridLastCenter.x - playerCellPos.x) + Math.abs(gridLastCenter.y - playerCellPos.y) +
        Math.abs(gridLastCenter.z - playerCellPos.z));

    if(gridOffset > 5){
        createGrid(getSnappedCenter(playerCellPos));
        gridLastCenter = playerCellPos;
    }

    // ----- Affichage infos DEBUG -----
    infoDiv.innerHTML = `
    FPS: ${(1 / delta).toFixed(5)} <br>, 
    Position: x=${playerGO.body.position.x.toFixed(2)}, 
    y=${playerGO.body.position.y.toFixed(2)}, 
    z=${playerGO.body.position.z.toFixed(2)}<br>
    Camera rotation: yaw=${(p.yawRotation*180/Math.PI).toFixed(1)}°, 
    pitch=${(p.pitchRotation*180/Math.PI).toFixed(1)}°<br>
    Velocity : x =${playerGO.body.velocity.x.toFixed(1)} y=${playerGO.body.velocity.y.toFixed(1)} z=${playerGO.body.velocity.z.toFixed(1)}`



    testShaderMat.uniforms.uPlayerPosition.value.copy(playerGO.body.position);

    if (materialNeon.userData.shader) {
        materialNeon.userData.shader.uniforms.uTime.value = clock.getElapsedTime();
        materialNeon.userData.shader.uniforms.uPlayerPos.value.copy(playerGO.body.position);
    }

}

animate()