import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import {lerp} from "three/src/math/MathUtils";

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export class Player{

    constructor(camera, domElement, gameObject, scene, world, goList, loader) {


        // Accès au monde
        this.camera = camera;
        this.dE = domElement;
        // --------------

        // Type de caméra
        this.tps = true;

        // GameObject du Joueur
        this.gameObject = gameObject;
        this.gameObject.setFixRotation(true);

        this.gameObject.body.addEventListener("collide", (e) => {

            if(e.contact.ni.y !== 0) {
                this.isGrounded = true;
            }
            else{
                this.isGrounded = false;
            }
        });

        // Redéfinition du Mesh du joueur (à l'aide des fichiers glb)
        this.mixer = null;     // Structure pour gérer les animations
        this.animations = {};
        this.currentAnimation;

                // Chargement du personnage
        loader.load('/assets/models/character.glb', (gltf) => {

            // Retirer l'ancien mesh
            delete gameObject.mesh

            // Le personnage devient le nouveau mesh du joueur
            gameObject.mesh = gltf.scene

            this.mixer = new THREE.AnimationMixer(gameObject.mesh)


            this.loadAnimations(loader)

            this.gameObject.initObject(scene, world, goList)
        })

        // Camera Settings
        this.cameraDistance = 6.;
        this.cameraHeight = 2.;

        this.yawRotation = 0;
        this.pitchRotation = 0.1;

        this.yawObject = new THREE.Object3D()
        this.pitchObject = new THREE.Object3D()

        //this.yawObject.add(this.pitchObject)
        //this.pitchObject.add(this.camera)

        this.cameraSensitivity = 0.002;

        // -----------------------------------------

        // Paramètres physiques

        this.speed = 5

        this.jumpHeight = 20;
        this.timeToApex = 5;
        this.fallMultiplier = 2.5;

        // -----------------------------------------

        this.keys = {}

        // Calculs physiques dérivés
        this.gravity = (2 * this.jumpHeight) / (this.timeToApex ** 2);
        this.jumpVelocity = this.gravity * this.timeToApex;

        this.isGrounded = false;
        this.jumpRequest = false;

        // Initialisation des callbacks
        this.initPointerLock();
        this.initMouseMove();
        this.initKeyboard();


    }

    initPointerLock() {
        this.dE.addEventListener('click', () => {
            this.dE.requestPointerLock()
        })
    }

    initMouseMove(){
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement !== this.dE) return

            this.cameraMovement(event)
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

    cameraMovement(event) {

        this.yawRotation -= event.movementX * this.cameraSensitivity
        //this.pitchRotation -= event.movementY * this.cameraSensitivity

        // Limite verticale (évite de retourner la tête)
        const maxPitch = Math.PI / 2 - 0.01
        this.pitchRotation = Math.max(-maxPitch, Math.min(maxPitch, this.pitchRotation))

        this.updateCamera()
    }

    updateCamera(){
        this.yawObject.rotation.y = this.yawRotation
        this.pitchObject.rotation.z = this.pitchRotation

        const body = this.gameObject.body;

        let camX = body.position.x - Math.cos(this.yawRotation) * Math.cos(this.pitchRotation) * this.cameraDistance;
        let camY = body.position.y + Math.sin(this.pitchRotation) * this.cameraDistance + this.cameraHeight;
        let camZ = body.position.z - Math.sin(this.yawRotation) * Math.cos(this.pitchRotation) * this.cameraDistance;

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(body.position.x, body.position.y, body.position.z);
        //this.camera.rotation.set(this.pitchRotation, this.yawRotation, 0);
    }

    update(dt, world) {
        if(this.mixer != null){
            this.mixer.update(dt)
        }

        // Gestion du mouvement du joueur

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

        if(this.keys['Space']){
            if(this.gameObject.body.velocity.y < 0.5 && this.isGrounded){
                this.jumpRequest = true;
            }
        }

        const from = this.gameObject.body.position;
        const to = new CANNON.Vec3(
            this.gameObject.body.position.x,
            this.gameObject.body.position.y - 0.5,
            this.gameObject.body.position.z
        );

        let animationSprintSpeed = 1
        if (this.keys['KeyF']){
            this.speed = 30
            animationSprintSpeed = 3;
        }
        else{
            this.speed = 5
        }

        this.handleJump(dt)

        const body = this.gameObject.body;

        let velocity = new CANNON.Vec3(0, 0, 0)

        if (validMove) {
            if(this.isGrounded){
                this.fadeToAnimation("Sprint", 0.3, animationSprintSpeed)
            }
            else{
                this.fadeToAnimation("Fall")
            }

            moveDirection.normalize()

            velocity = new CANNON.Vec3(moveDirection.x * this.speed,
                moveDirection.y * this.speed + body.velocity.y, moveDirection.z * this.speed)

        }
        else{
            if(this.isGrounded){
                this.fadeToAnimation("Idle")
            }
            else{
                this.fadeToAnimation("Fall")
            }


            velocity = new CANNON.Vec3(0, body.velocity.y, 0)
        }

        const speedFactor = body.velocity.length();
        this.cameraDistance = 6 + speedFactor * 0.05;

        this.camera.fov = lerp(70, 95, speedFactor / 30);
        this.camera.updateProjectionMatrix();

        body.velocity.copy(velocity);

        this.gameObject.FixUpdateMeshFromBody();

        this.updateCamera()
    }

    handleJump(dt){
        if(this.isGrounded && this.jumpRequest){
            this.isGrounded = false;
            this.jumpRequest = false;

            this.gameObject.body.velocity.y = this.jumpVelocity;
        }

        if(this.gameObject.body.velocity.y > 0.5){
            this.gameObject.body.velocity.y -= this.gravity *  this.fallMultiplier * dt
        }

    }

    fadeToAnimation(name, duration = 0.3, animationSpeed = 1) {

        const newAction = this.animations[name]

        if(newAction === undefined){
            return;
        }

        newAction.timeScale = animationSpeed;

        if (this.currentAnimation !== newAction) {

            if(this.currentAnimation !== undefined){
                this.currentAnimation.fadeOut(duration)
            }


            newAction
                .reset()
                .fadeIn(duration)
                .play()

            this.currentAnimation = newAction
        }
    }


    loadAnimations(loader){
        loader.load('/assets/models/idle.glb', (idleGltf) => {

            const idleClip = idleGltf.animations[1]
            this.animations["Idle"] = this.mixer.clipAction(idleClip)


            loader.load('/assets/models/sprint.glb', (sprintGltf) => {

                const sprintClip = sprintGltf.animations[1]
                this.animations["Sprint"] = this.mixer.clipAction(sprintClip)

                loader.load('/assets/models/fall.glb', (fallGltf) => {
                    const fallClip = fallGltf.animations[1]
                    this.animations["Fall"] = this.mixer.clipAction(fallClip)

                    this.animations["Idle"].play()
                    this.currentAnimation = this.animations["Idle"]
                })

            })
        })
    }

    getPlayerPos(){
        return this.gameObject.body.position;
    }

    getPlayerCell() {
        let playerPos = this.getPlayerPos();

        return {
            x: Math.floor(playerPos.x),
            y: Math.floor(playerPos.y),
            z: Math.floor(playerPos.z)
        };
    }

}
