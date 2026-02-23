import * as GO from  "./GameObject"
import * as THREE from "three";

export class GameManager{
    constructor(scene, loader){
        this.platformDuration = 10000;  // In ms
        this.spawnDelayBetweenPlatform = this.platformDuration / 2;  // In ms

        this.platformLength = 20;
        this.platformWidth = 8;

        this.offsetXPlatform = 20;
        this.offsetZPlatform = 15;

        this.upgradeOffsetX = 2;
        this.upgradeOffsetZ = 2;



        this.currentEndXPosition = 5;
        this.currentEndZPosition = 0;

        this.platforms = []

        // Upgrade Hero Section
        this.speedBoostPerUpgrade = 4

        this.distanceToUpgrade = 1.8;


        // DNA Mesh Gestion
        this.dnaMesh;
        loader.load('/assets/models/dna_hologram.glb', (gltf) => {

            gltf.scene.scale.set(3, 3, 3)


            this.dnaMesh = gltf.scene;
            this.dnaMesh.rotation.y = Math.PI / 2;
            this.dnaMesh.rotation.x = Math.PI / 2;

            this.dnaMesh.traverse((child) => {
                if (child.isMesh) {

                    child.material.emissive = new THREE.Color(0xffcc88)
                    child.material.emissiveIntensity = 1.5

                }
            })


        })

    }

    update(delta, scene, world, gameObjects, platformMaterial, player){
        let platform;

        // Script pour ajouter une nouvelle plateforme
        if(this.platforms.length <= 2){
            let createNewPlatform = true;
            if(this.platforms.length > 0 && Date.now() - this.platforms[this.platforms.length - 1].startAppearance < this.spawnDelayBetweenPlatform){
                createNewPlatform = false;
            }

            if(createNewPlatform){
                platform = new GO.BoxObject(this.platformLength, 2, this.platformWidth , 0, platformMaterial);

                let newZ = this.currentEndZPosition +  Math.floor(Math.random() * (2 * this.offsetZPlatform + 1)) - this.offsetZPlatform;
                let newX = this.currentEndXPosition + 2 * this.offsetXPlatform;


                platform.setPosition(newX, -1.5, newZ)
                platform.initObject(scene, world, gameObjects, 2)

                let newDNAGroup = new THREE.Group()
                if(this.dnaMesh !== undefined){
                    let newUpgradeDNA = this.dnaMesh.clone()

                    let xUpgrade = newX + Math.floor(Math.random() * (2 * this.platformLength/3 + 1)) - this.platformLength/3;
                    let yUpgrade = 1;
                    let zUpgrade = newZ + Math.floor(Math.random() * (2 * this.platformWidth/2 + 1)) - this.platformWidth/2;

                    newDNAGroup.position.set(xUpgrade, yUpgrade, zUpgrade);

                    newDNAGroup.add(newUpgradeDNA)
                    scene.add(newDNAGroup)
                }
                else{
                    // On le place OOB pour éviter au joueur de récupérer une upgrade invisible
                    newDNAGroup.position.set(-1000000, 0, -10000)
                }

                this.platforms.push({platform: platform, startAppearance: Date.now(), upgradeDna: newDNAGroup});

                this.currentEndZPosition = newZ;
                this.currentEndXPosition = newX;

                this.offsetXPlatform += this.upgradeOffsetX;
                this.offsetZPlatform += this.upgradeOffsetZ;
            }

        }

        // Suppression des plateformes trop ancienne
        let to_remove = false
        for(let p = 0; p < this.platforms.length; p++){

            // Update des Upgrades DNA
            this.platforms[p].upgradeDna.rotation.y += 3 * delta

            // Test de distance avec les upgrades pour améliorer le joueur
            if (this.platforms[p].upgradeDna.position.distanceTo(player.gameObject.mesh.position) <= 1.8){
                this.platforms[p].upgradeDna.position.set(-1000, 0, -1000)

                player.upgradeSpeed(this.speedBoostPerUpgrade);
            }


            if(Date.now() - this.platforms[p].startAppearance >= this.platformDuration){
                this.platforms[p].platform.deleteObject(scene, world, gameObjects)

                to_remove = true;
            }
        }

        if(to_remove){
            scene.remove(this.platforms[0].upgradeDna)
            this.platforms.splice(0, 1);
        }





    }
}