import * as THREE from 'three'
import * as CANNON from 'cannon-es'


const defaultMaterial = new THREE.MeshBasicMaterial({color: 0x999999})

export class GameObject{
    constructor(geometry, material, mass, shape) {
        this.geometry = geometry;
        this.material = material;

        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.body = new CANNON.Body({mass, shape});

        // Synchronisation Three.JS <-> Cannon-es
        this.updateMeshFromBody();

    }

    initObject(scene, world, goList){
        scene.add(this.mesh);
        world.addBody(this.body);

        goList.push(this);
    }

    setPosition(x, y, z) {
        this.body.position.set(x, y, z);
        this.updateMeshFromBody();
    }


    updateMeshFromBody() {
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
    }

    // Méthode update à appeler dans la boucle principale
    update(dt) {
        this.updateMeshFromBody();
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
    }
}
