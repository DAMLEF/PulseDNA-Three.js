

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
