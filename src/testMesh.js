import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })

renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

camera.position.set(0, 1.5, 3)

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
scene.add(light)

const loader = new GLTFLoader()

let mixer
let actions = {}
let currentAction
let model

function loadAnimations() {

    loader.load('/assets/models/idle.glb', (idleGltf) => {

        const idleClip = idleGltf.animations[1]
        actions["Idle"] = mixer.clipAction(idleClip)

        console.log(idleGltf.animations)

        loader.load('/assets/models/sprint.glb', (sprintGltf) => {

            const sprintClip = sprintGltf.animations[1]
            actions["Sprint"] = mixer.clipAction(sprintClip)

            actions["Idle"].play()
            currentAction = actions["Idle"]

        })
    })
}

loader.load('/assets/models/character.glb', (gltf) => {

    model = gltf.scene
    scene.add(model)

    console.log("Animations trouvées :", gltf.animations)
    console.log("Scene :", gltf.scene)

    mixer = new THREE.AnimationMixer(model)

    loadAnimations()
})




function fadeToAction(name, duration = 0.3) {

    const newAction = actions[name]

    if (currentAction !== newAction) {

        currentAction.fadeOut(duration)

        newAction
            .reset()
            .fadeIn(duration)
            .play()

        currentAction = newAction
    }
}

window.addEventListener("keydown", (e) => {
    if (e.key === "Shift") {
        fadeToAction("Sprint")
    }
})

window.addEventListener("keyup", (e) => {
    if (e.key === "Shift") {
        fadeToAction("Idle")
    }
})

const clock = new THREE.Clock()

function animate() {

    requestAnimationFrame(animate)

    const delta = clock.getDelta()

    if (mixer) mixer.update(delta)

    renderer.render(scene, camera)

}

animate()