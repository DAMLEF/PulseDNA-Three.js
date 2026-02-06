import * as THREE from 'three';

// On construit notre scène et notre caméra
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

// Structure de rendu
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );

// Ajoute la scène des rendus à la page Web
document.body.appendChild( renderer.domElement );

// Éléments nécessaires pour les meshs (cube)
const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );

const lineMaterial = new THREE.LineBasicMaterial( { color: 0x0000ff } );

const points = [];
points.push( new THREE.Vector3( -1, -1, 10 ) );
points.push( new THREE.Vector3( 0, 0, 0) );
//points.push( new THREE.Vector3( 10, 0, 0 ) );

const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );

const line = new THREE.Line( lineGeometry, lineMaterial );

// On ajoute nos éléments à la scène
scene.add( cube );
scene.add( line );

camera.position.z = 5;

// Boucle de rendu principale
function animate() {
    renderer.render( scene, camera );

    // Opérations
    cube.rotation.x += 0.5;
    cube.rotation.y += 0.01;
}

renderer.setAnimationLoop( animate );