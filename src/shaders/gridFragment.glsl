uniform vec3 uPlayerPos;
uniform float uHideDistance;

uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveFrequency;

varying vec3 vWorldPos;
varying vec2 vUv;

void main() {

    float dist = distance(vWorldPos, uPlayerPos);

    if(dist < uHideDistance) {
        discard;
    }

    float wave = sin(
        vUv.y * uWaveFrequency +
        uTime * uWaveSpeed
    );

    float intensity = wave * 0.5 + 0.5;

    vec3 neonColor = vec3(1.0, 1.0, 1.0) * intensity;

    gl_FragColor = vec4(neonColor, intensity);
}