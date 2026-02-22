import * as GO from  "./GameObject"

export class GameManager{
    constructor(){
        this.platformDuration = 5;  // In sec

        this.platformLength = 20;
        this.platformWidth = 8;

        this.offsetPlatform = 20

        this.currentEndXPosition = 5;

        this.platforms = []
    }

    update(scene, world, gameObjects, platformMaterial){
        let platform;
        if(this.platforms.length === 0){
            platform = new GO.BoxObject(this.platformLength, 2, this.platformWidth , 0, platformMaterial);
            platform.setPosition(this.currentEndXPosition + 2 * this.offsetPlatform, -1, 0)
            platform.initObject(scene, world, gameObjects, 2)

            // TODO: Z random

            this.platforms.push(platform);
        }
    }
}