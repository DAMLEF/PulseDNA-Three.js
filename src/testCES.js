import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import {lerp} from "three/src/math/MathUtils";

// =====================
// THREE.JS (VISUEL)
// =====================
const scene = new THREE.Scene()

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

// Sol (Three)
const groundGeometry = new THREE.PlaneGeometry(150, 150)
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 })
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
groundMesh.rotation.x = -Math.PI / 2
scene.add(groundMesh)

// Cube (Three)
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 })
const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial)
scene.add(cubeMesh)




// Création du plane overlay
const overlayGeometry = new THREE.PlaneGeometry(2, 2);
const overlayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,      // ignore le depth buffer
    depthWrite: false,     // ne bloque rien derrière
    uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;

        void main() {
            // Dégradé vertical
            vec3 color = mix(vec3(0.0,0.2,0.5), vec3(0.0,0.5,1.0), vUv.y);

            // Distorsion simple avec sin
            float offset = sin(vUv.y*10.0 + uTime*5.0) * 0.02 * uSpeed;
            color.r += offset;

            gl_FragColor = vec4(color, 0.3); // alpha léger
        }
    `
});
const overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
overlayMesh.frustumCulled = false; // toujours visible
overlayMesh.renderOrder = 999;      // toujours render last
camera.add(overlayMesh);

// =====================
// CANNON-ES (PHYSIQUE)
// =====================
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
})

// Sol (Cannon)
const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(
        new CANNON.Vec3(75, 0.1, 75)
    ),
    position: new CANNON.Vec3(0, -0.05, 0) // on met le dessus à y=0
})
//groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(groundBody)

// Cube (Cannon)
const cubeBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
    position: new CANNON.Vec3(1, 5, 1),
})
world.addBody(cubeBody)

// =====================

// =====================
// TEST DE CAMÉRA
// =====================
let playerSphere = new THREE.SphereGeometry(0.5, 32, 32)
let playerCubeMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF })
let playerSphereMesh = new THREE.Mesh(playerSphere, playerCubeMaterial)

playerSphereMesh.position.set(0, 0, 0);
scene.add(playerSphereMesh)

let playerSphereBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(0.5),
    position: new CANNON.Vec3(0, 0, 0),
})

world.addBody(playerSphereBody)

class PlayerController{

    constructor(camera, domElement, body) {
        this.camera = camera;
        this.dE = domElement;

        this.tps = true;

        this.body = body;

        this.cameraDistance = 6.;
        this.cameraHeight = 2.;

        this.yawRotation = 0;
        this.pitchRotation = 0.1;

        this.yawObject = new THREE.Object3D()
        this.pitchObject = new THREE.Object3D()

        this.forwardCamera = {x: Math.cos(this.yawRotation), z: Math.sin(this.yawRotation)}

        //this.yawObject.add(this.pitchObject)
        //this.pitchObject.add(this.camera)

        this.cameraSensitivity = 0.002;

        this.speed = 5
        this.keys = {}



        this.initPointerLock();
        this.initMouseMove();
        this.initKeyboard();

        this.yawObject.position.set(0, 1.6, 0)
        scene.add(this.yawObject);

    }

    initPointerLock() {
        this.dE.addEventListener('click', () => {
            this.dE.requestPointerLock()
        })
    }

    initMouseMove(){
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement !== this.dE) return

            this.yawRotation -= event.movementX * this.cameraSensitivity
            //this.pitchRotation -= event.movementY * this.cameraSensitivity

            // Limite verticale (évite de retourner la tête)
            const maxPitch = Math.PI / 2 - 0.01
            this.pitchRotation = Math.max(-maxPitch, Math.min(maxPitch, this.pitchRotation))

            this.updateCamera()
    })
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true
        })
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false
        })
    }


    updateCamera(){
        this.yawObject.rotation.y = this.yawRotation
        this.pitchObject.rotation.z = this.pitchRotation

        console.log(this.yawRotation + " " + this.pitchRotation);


        let camX = this.body.position.x - Math.cos(this.yawRotation) * Math.cos(this.pitchRotation) * this.cameraDistance;
        let camY = this.body.position.y + Math.sin(this.pitchRotation) * this.cameraDistance + this.cameraHeight;
        let camZ = this.body.position.z - Math.sin(this.yawRotation) * Math.cos(this.pitchRotation) * this.cameraDistance;

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(this.body.position.x, this.body.position.y, this.body.position.z);
        //this.camera.rotation.set(this.pitchRotation, this.yawRotation, 0);
        }

    update(dt) {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        right.normalize();

        const moveDirection = new THREE.Vector3(0, 0, 0);
        let validMove = false;

        //const direction = new THREE.Vector3(this.body.position.x - this.camera.position.x, 0, this.body.position.z - this.camera.position.z)
        //direction.normalize()

        if (this.keys['KeyW']){
            moveDirection.add(forward)
            validMove = true;
        }

        if (this.keys['KeyS']){
            validMove = true;
            moveDirection.sub(forward)
        }
        if (this.keys['KeyA']){
            validMove = true;
            moveDirection.sub(right)
        }
        if (this.keys['KeyD']){
            validMove = true;
            moveDirection.add(right)
        }




        if (this.keys['KeyF']){
            this.speed = 30
        }
        else{
            this.speed = 5
        }



        //direction.applyAxisAngle(
        //    new THREE.Vector3(0, 1, 0),
        //    this.yawRotation
        //)





        let velocity = new CANNON.Vec3(0, 0, 0)

        if (validMove) {

            // TODO: Ajouter le y velocity

            moveDirection.normalize()

            velocity = new CANNON.Vec3(moveDirection.x * this.speed,
                moveDirection.y * this.speed + this.body.velocity.y, moveDirection.z * this.speed)



        }

        const speedFactor = this.body.velocity.length();
        this.cameraDistance = 6 + speedFactor * 0.05;

        this.camera.fov = lerp(70, 95, speedFactor / 30);
        this.camera.updateProjectionMatrix();

        this.body.velocity.copy(velocity);
        playerSphereMesh.position.copy(this.body.position);

        this.yawObject.position.copy(this.body.position)
        this.yawObject.position.y += 1;

        playerSphereMesh.quaternion.copy(this.body.quaternion)

        this.updateCamera()

        console.log("Update position : " + this.body.position + " ");
    }


}

let pc = new PlayerController(camera, renderer.domElement, playerSphereBody);


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

function updateOverlay(deltaTime) {
    // uTime pour le mouvement
    overlayMaterial.uniforms.uTime.value += deltaTime;

    // uSpeed = proportion de la vitesse du joueur
    const v = pc.body.velocity;
    const horizontalSpeed = Math.sqrt(v.x*v.x + v.z*v.z);
    overlayMaterial.uniforms.uSpeed.value = horizontalSpeed / 30;
}

function animate() {
    requestAnimationFrame(animate)

    const delta = clock.getDelta()
    world.step(1 / 60, delta)

    // Synchronisation Cannon → Three
    cubeMesh.position.copy(cubeBody.position)
    cubeMesh.quaternion.copy(cubeBody.quaternion)

    renderer.render(scene, camera)

    pc.update(delta)

    // ----- Affichage infos DEBUG -----
    infoDiv.innerHTML = `
    Position: x=${playerSphereBody.position.x.toFixed(2)}, 
    y=${playerSphereBody.position.y.toFixed(2)}, 
    z=${playerSphereBody.position.z.toFixed(2)}<br>
    Camera rotation: yaw=${(pc.yawRotation*180/Math.PI).toFixed(1)}°, 
    pitch=${(pc.pitchRotation*180/Math.PI).toFixed(1)}°`

    updateOverlay(delta)
    
}

animate()