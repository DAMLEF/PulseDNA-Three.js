uniform vec3 playerPos;    // position du joueur
uniform float maxDist;     // distance max avant dispersion
uniform float time;        // temps pour animer un peu
varying vec3 vColor;

float rand(vec3 co){
    return fract(sin(dot(co.xyz ,vec3(12.9898,78.233, 45.164))) * 43758.5453);
}

    void main() {
    //vec3 newPos = position;
    vec3 newPos = (modelMatrix * vec4(position, 1.0)).xyz;

    // distance du vertex au joueur
    float dist = distance(playerPos, position);

    if(dist > maxDist){
        // projection le long de la normale
        vec3 offset = normal * (dist - maxDist);

        // ajout d'un offset aléatoire
        float r = rand(position);
        offset += (r - 0.5) * 2.0; // décalage -1 à 1

        // Lerp selon distance pour effet progressif
        float t = clamp((dist - maxDist) / 5.0, 0.0, 1.0);
        newPos = mix(position, position + offset, t);
    }

    vColor = vec3(dist / maxDist, 0.5, 1.0); // juste pour debug couleur

    //gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);

    vec4 mvPosition = viewMatrix * vec4(newPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    }