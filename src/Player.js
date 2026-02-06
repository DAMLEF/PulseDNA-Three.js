import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import {lerp} from "three/src/math/MathUtils";

export class Player{

    constructor(camera, domElement, gameObject) {
        this.camera = camera;
        this.dE = domElement;

        this.tps = true;

        this.gameObject = gameObject;

        this.cameraDistance = 6.;
        this.cameraHeight = 2.;

        this.yawRotation = 0;
        this.pitchRotation = 0.1;

        this.yawObject = new THREE.Object3D()
        this.pitchObject = new THREE.Object3D()

        //this.yawObject.add(this.pitchObject)
        //this.pitchObject.add(this.camera)

        this.cameraSensitivity = 0.002;

        this.speed = 5
        this.keys = {}

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

        const body = this.gameObject.body;

        let camX = body.position.x - Math.cos(this.yawRotation) * Math.cos(this.pitchRotation) * this.cameraDistance;
        let camY = body.position.y + Math.sin(this.pitchRotation) * this.cameraDistance + this.cameraHeight;
        let camZ = body.position.z - Math.sin(this.yawRotation) * Math.cos(this.pitchRotation) * this.cameraDistance;

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(body.position.x, body.position.y, body.position.z);
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

        const body = this.gameObject.body;



        let velocity = new CANNON.Vec3(0, 0, 0)

        if (validMove) {

            moveDirection.normalize()

            velocity = new CANNON.Vec3(moveDirection.x * this.speed,
                moveDirection.y * this.speed + body.velocity.y, moveDirection.z * this.speed)

        }
        else{
            velocity = new CANNON.Vec3(0, body.velocity.y, 0)
        }

        const speedFactor = body.velocity.length();
        this.cameraDistance = 6 + speedFactor * 0.05;

        this.camera.fov = lerp(70, 95, speedFactor / 30);
        this.camera.updateProjectionMatrix();

        body.velocity.copy(velocity);

        this.gameObject.updateMeshFromBody();

        this.updateCamera()

    }


}
