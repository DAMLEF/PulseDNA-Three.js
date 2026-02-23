import * as THREE from 'three'
import * as CANNON from 'cannon-es'


const defaultMaterial = new THREE.MeshBasicMaterial({color: 0x999999})

export class GameObject{
    constructor(geometry, material, mass, shape) {
        this.geometry = geometry;
        this.material = material;

        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.body = new CANNON.Body({mass, shape});

        this.fixRotation = false;

        // Synchronisation Three.JS <-> Cannon-es
        this.updateMeshFromBody();
    }

    initObject(scene, world, goList){
        scene.add(this.mesh);
        world.addBody(this.body);

        goList.push(this);
    }

    deleteObject(scene, world, goList){
        world.removeBody(this.body);
        scene.remove(this.mesh);
        goList.filter(x => x !== this)

    }

    setPosition(x, y, z) {
        this.body.position.set(x, y, z);
        this.updateMeshFromBody();
    }

    setFixRotation(fix){
        this.fixRotation = fix;
    }


    updateMeshFromBody() {
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
    }


    FixUpdateMeshFromBody() {
        // Copier la position
        let realMeshPos = new THREE.Vector3(this.body.position.x, this.body.position.y, this.body.position.z);

        this.mesh.position.copy(realMeshPos)

        // Orientation uniquement sur l'axe Y (yaw)
        // Calculer la direction du joueur
        const dir = new THREE.Vector3(this.body.velocity.x, 0, this.body.velocity.z)

        if (dir.lengthSq() > 0.0001) { // éviter NaN quand le joueur est immobile
            dir.normalize()
            const targetQuat = new THREE.Quaternion()
            targetQuat.setFromUnitVectors(new THREE.Vector3(0,0,1), dir)
            this.mesh.quaternion.slerp(targetQuat, 0.2) // smooth rotation
        }
    }

    // Méthode update à appeler dans la boucle principale
    update(dt) {
        if(this.fixRotation){
            this.FixUpdateMeshFromBody();
        }
        else{
            this.updateMeshFromBody();
        }

    }
}

export class CubeObject extends GameObject {
    constructor(size, mass, material = defaultMaterial) {
        const geometry = new THREE.BoxGeometry(size, size, size);

        const halfSize = size / 2;


        const shape = new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, halfSize));

        super(geometry, material, mass, shape);
    }
}

export class BoxObject extends GameObject {
    constructor(width, height, depth, mass, material = defaultMaterial) {
        const geometry = new THREE.BoxGeometry(width, height, depth);

        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));

        super(geometry, material, mass, shape);
    }
}

export class SphereObject extends GameObject {
    constructor(radius, mass, material = defaultMaterial) {
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const shape = new CANNON.Sphere(radius);

        super(geometry, material, mass, shape);
    }
}

export class PlaneObject extends GameObject {
    constructor(size, material = defaultMaterial) {
        const geometry = new THREE.PlaneGeometry(size, size);

        const halfSize = size / 2;

        const shape = new CANNON.Box(
                new CANNON.Vec3(halfSize, 1, halfSize)
            )

        super(geometry, material, 0, shape);

        // On aligne le mesh à la verticale

        // On empêche le mouvement de gravité (plateforme fixe).
        this.body.type = CANNON.Body.STATIC;

    }

    update(dt) {
        super.update(dt);
        this.mesh.rotation.x = -Math.PI / 2
        this.mesh.position.set(this.body.position.x, this.body.position.y + 1, this.body.position.z)
    }
}

