 /*

Three.js video tutorial explaining the source code

Youtube: https://youtu.be/JhgBwJn1bQw

In the tutorial, we go through the source code of this game. We cover, how to set up a Three.js scene with box objects, how to add lights, how to set up the camera, how to add animation and event handlers. We also add textures with HTML Canvas and learn how to draw 2D shapes in Three.js then how to turn them into extruded geometries.

Comparing to the tutorial this version has some extra features:
- trucks also pop up on the other track
- the extruded geometry also has a texture
- there are trees around the track
- shadows
- the game reacts to window resizing

Check out my YouTube channel for other game tutorials: https://www.youtube.com/channel/UCxhgW0Q5XLvIoXHAfQXg9oQ

*/

window.focus(); // Capture keys right away (by default focus is on editor)
//import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Pick a random value from an array
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// The Pythagorean theorem says that the distance between two points is
// the square root of the sum of the horizontal and vertical distance's square
function getDistance(coordinate1, coordinate2) {
  const horizontalDistance = coordinate2.x - coordinate1.x;
  const verticalDistance = coordinate2.y - coordinate1.y;
  return Math.sqrt(horizontalDistance ** 2 + verticalDistance ** 2);
}

function multiplyVectors(vectors, factor) {
  return vectors.map(vector => {
      return new THREE.Vector2(vector.x * factor, vector.y * factor);
  });
}

function sumVectors(vectors, summation) {
  return vectors.map(vector => {
      return new THREE.Vector2(vector.x + summation, vector.y + summation);
  });
}

function innifyVectors(vectors, summation) {
  return vectors.map(vector => {
      if(vector.x<0 & vector.y<0) return new THREE.Vector2(vector.x - summation, vector.y - summation);
      if(vector.x<0) return new THREE.Vector2(vector.x - summation, vector.y + summation);
      if(vector.y<0) return new THREE.Vector2(vector.x + summation, vector.y - summation);
      return new THREE.Vector2(vector.x + summation, vector.y + summation);
  });
}

function scalePoints(points, newMinX, newMaxX, newMinY, newMaxY) {
  // Calculate the scaling factor
  const scaleFactorX = newMaxX - newMinX;
  const scaleFactorY = newMaxY - newMinY;
  // Scale each point in the list and return as THREE.Vector2
  const scaledPoints = points.map(point => {
      const scaledX = point.x * scaleFactorX + newMinX;
      const scaledY = point.y * scaleFactorY + newMinY;
      return new THREE.Vector2(scaledX, scaledY);
  });

  return scaledPoints;
}

const vehicleColors = [
  0xa52523,
  0xef2d56,
  0x0ad3ff,
  0xff9f1c /*0xa52523, 0xbdb638, 0x78b14b*/
];

const lawnGreen = "#67C240";
const trackColor = "#546E90";
const edgeColor = "#FFFFFF";
const treeCrownColor = 0x498c2c;
const treeTrunkColor = 0x4b3f2f;

const wheelGeometry = new THREE.BoxBufferGeometry(12, 33, 12);
const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
const treeTrunkGeometry = new THREE.BoxBufferGeometry(15, 15, 30);
const treeTrunkMaterial = new THREE.MeshLambertMaterial({
  color: treeTrunkColor
});
const treeCrownMaterial = new THREE.MeshLambertMaterial({
  color: treeCrownColor
});

const config = {
  showHitZones: false,
  shadows: true, // Use shadow
  trees: true, // Add trees to the map
  curbs: false, // Show texture on the extruded geometry
  grid: false // Show grid helper
};

let speed = 0;

const playerAngleInitial = Math.PI;
const playerXInitial = 1500;
const playerYInitial = -1050;
let playerAngleMoved;
let Xdisplace;
let Ydisplace;
let accelerate = false; // Is the player accelerating
let decelerate = false; // Is the player decelerating
let turn_right = false;
let turn_left = false;

let otherVehicles = [];
let ready;
let lastTimestamp;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
}


const scoreElement = document.getElementById("score");
const buttonsElement = document.getElementById("buttons");
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");
const accelerateButton = document.getElementById("accelerate");
const decelerateButton = document.getElementById("decelerate");


setTimeout(() => {
  if (ready) instructionsElement.style.opacity = 1;
  buttonsElement.style.opacity = 1;
}, 4000);

// Initialize ThreeJs
// Set up camera
const aspectRatio = window.innerWidth / window.innerHeight;
const cameraWidth = window.innerWidth/2;
const cameraHeight = cameraWidth / aspectRatio;

const camera = new THREE.OrthographicCamera(
  cameraWidth / -2, // left
  cameraWidth / 2, // right
  cameraHeight / 2, // top
  cameraHeight / -2, // bottom
  50, // near plane
  700 // far plane
);

const trackRadius = 235;
const mapWidth = 10000;
const mapHeight = 10000;
const trackRadius2 = 197;
const trackWidth = 45;
const dim = 6;


const scene = new THREE.Scene();

const playerCar = Car();
const smoke = Smoke();
scene.add(playerCar);
scene.add(smoke);

renderMap(mapWidth, mapHeight * 2); // The map height is higher because we look at the map from an angle

// Set up lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(100, -300, 300);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -3000;
dirLight.shadow.camera.right = 3500;
dirLight.shadow.camera.top = 2500;
dirLight.shadow.camera.bottom = -2500;
dirLight.shadow.camera.near = 100;
dirLight.shadow.camera.far = 5000;
scene.add(dirLight);


// const cameraHelper = new THREE.CameraHelper(dirLight.shadow.camera);
// scene.add(cameraHelper);

if (config.grid) {
  const gridHelper = new THREE.GridHelper(80, 8);
  gridHelper.rotation.x = Math.PI / 2;
  scene.add(gridHelper);
}

// Set up renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
if (config.shadows) renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

reset();

function reset() {

  // Reset position and score
  playerAngleMoved = 0;
  Xdisplace = 0;
  Ydisplace = 0;
  scoreElement.innerText = "Press UP";

  // Remove other vehicles
  otherVehicles.forEach((vehicle) => {
    // Remove the vehicle from the scene
    scene.remove(vehicle.mesh);

    // If it has hit-zone helpers then remove them as well
    if (vehicle.mesh.userData.hitZone1)
      scene.remove(vehicle.mesh.userData.hitZone1);
    if (vehicle.mesh.userData.hitZone2)
      scene.remove(vehicle.mesh.userData.hitZone2);
    if (vehicle.mesh.userData.hitZone3)
      scene.remove(vehicle.mesh.userData.hitZone3);
  });
  otherVehicles = [];

  resultsElement.style.display = "none";

  lastTimestamp = undefined;

  // Place the player's car to the starting position
  movePlayerCar(0);

  // Render the scene
  renderer.render(scene, camera);

  ready = true;
}

function startGame() {
  if (ready) {
    ready = false;
    scoreElement.innerText = '';
    buttonsElement.style.opacity = 1;
    instructionsElement.style.opacity = 0;
    renderer.setAnimationLoop(animation);
  }
}

function positionScoreElement() {
  const arcCenterXinPixels = (trackRadius2 / cameraWidth) * window.innerWidth;
  scoreElement.style.cssText = `
    left: ${window.innerWidth / 2 - arcCenterXinPixels * 1.3}px;
    top: ${window.innerHeight / 2}px
  `;
}


function getLineMarkings(mapWidth, mapHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth;
  canvas.height = mapHeight;
  const context = canvas.getContext("2d");

  context.fillStyle = trackColor;
  context.fillRect(0, 0, mapWidth, mapHeight);

  context.lineWidth = 2;
  context.strokeStyle = "#E0FFFF";
  context.setLineDash([10, 14]);

  let primaVariante = [new THREE.Vector2(1,0),new THREE.Vector2(0.5126488095238095,0.11205915813424361),new THREE.Vector2(0.371279761904762,0.8589306029579068),new THREE.Vector2(0,1)]
  
  // Create a new shape
  let contex = new THREE.Shape();

  // Move to the starting point
  contex.moveTo(100*dim, -150*dim);

  // Add another straight line
  contex.lineTo(0*dim, -150*dim);
  // Add another straight line
  
  let curve = new THREE.SplineCurve(scalePoints(primaVariante, -150*dim, 0*dim, -150*dim, 0*dim));

  // Get points from the curve and add them to the shape
  let points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    contex.lineTo(points[i].x, points[i].y);
  }
  
  contex.lineTo(-350*dim, 0*dim);

  let curvone = [new THREE.Vector2(0,1),new THREE.Vector2(0.75,0.75),new THREE.Vector2(1,0)];

  curve = new THREE.SplineCurve(scalePoints(curvone, -350*dim, -400*dim, 75*dim, 0*dim));

  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    contex.lineTo(points[i].x, points[i].y);
  }

  contex.lineTo(-400*dim, 75*dim);

  contex.lineTo(-400*dim, 300*dim);

  contex.lineTo(-300*dim, 300*dim);


  let ascari = [new THREE.Vector2(0,1),new THREE.Vector2(0.14174107142857142,0.6407849829351535),new THREE.Vector2(0.359375,0.25170648464163825),new THREE.Vector2(0.5758928571428571,0.19283276450511944),new THREE.Vector2(0.7421875,0.025597269624573427),new THREE.Vector2(1,0)] ;
  
  curve = new THREE.SplineCurve(scalePoints(ascari, -300*dim, 100*dim, 70*dim, 300*dim));
  
  // Get points from the curve and add them to the shape
  
  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    contex.lineTo(points[i].x, points[i].y);
  }
  
  // Add another straight line
  contex.lineTo(100*dim, 70*dim);

  let alboreto = [new THREE.Vector2(0,0),new THREE.Vector2(0.1670386904761905,0.2599544937428897),new THREE.Vector2(0.17522321428571427,0.7457337883959044),new THREE.Vector2(0,1)]

  curve = new THREE.SplineCurve(scalePoints(alboreto, 100*dim, 450*dim, 70*dim, -150*dim));

  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    contex.lineTo(points[i].x, points[i].y);
  }

  contex.lineTo(100*dim, -150*dim);

  // Optionally close the shape
  context.closePath();
  context.stroke();

  return new THREE.CanvasTexture(canvas);
}

function getCurbsTexture(mapWidth, mapHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth;
  canvas.height = mapHeight;
  const context = canvas.getContext("2d");

  context.fillStyle = lawnGreen;
  context.fillRect(0, 0, mapWidth, mapHeight);

  context.lineWidth = 8;
  context.strokeStyle = "#FF0000"; // Red curbs

  const CurbPoints = [
    new THREE.Vector2(mapWidth / 2 - trackRadius2, mapHeight / 2 - trackRadius2),
    new THREE.Vector2(mapWidth / 2 + trackRadius2, mapHeight / 2 - trackRadius2),
    new THREE.Vector2(mapWidth / 2 + trackRadius2, mapHeight / 2 + trackRadius2),
    new THREE.Vector2(mapWidth / 2 - trackRadius2, mapHeight / 2 + trackRadius2),
    new THREE.Vector2(mapWidth / 2 - trackRadius2, mapHeight / 2 - trackRadius2),
  ];

  const spline = new THREE.SplineCurve(CurbPoints);
  const splinePoints = spline.getPoints(1000);

  context.beginPath();
  context.moveTo(splinePoints[0].x, splinePoints[0].y);
  for (let i = 1; i < splinePoints.length; i++) {
    context.lineTo(splinePoints[i].x, splinePoints[i].y);
  }
  context.closePath();
  context.stroke();

  context.lineWidth = 4;
  context.strokeStyle = edgeColor;
  context.stroke();

  return new THREE.CanvasTexture(canvas);
}

function getMiddleIsland() {
  let primaVariante = [new THREE.Vector2(1,0),new THREE.Vector2(0.5126488095238095,0.11205915813424361),new THREE.Vector2(0.371279761904762,0.8589306029579068),new THREE.Vector2(0,1)]
  
  // Create a new shape
  let islandMiddle = new THREE.Shape();

  // Move to the starting point
  islandMiddle.moveTo(-500*dim, -150*dim);

  // Add another straight line
  islandMiddle.lineTo(0*dim, -150*dim);
  // Add another straight line
  
  let curve = new THREE.SplineCurve(scalePoints(primaVariante, -150*dim, 0*dim, -150*dim, 0*dim));

  // Get points from the curve and add them to the shape
  let points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    islandMiddle.lineTo(points[i].x, points[i].y);
  }
  
  islandMiddle.lineTo(-350*dim, 0*dim);

  let curvone = [new THREE.Vector2(0,1),new THREE.Vector2(0.75,0.75),new THREE.Vector2(1,0)];

  curve = new THREE.SplineCurve(scalePoints(curvone, -350*dim, -400*dim, 75*dim, 0*dim));

  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    islandMiddle.lineTo(points[i].x, points[i].y);
  }

  islandMiddle.lineTo(-400*dim, 75*dim);

  islandMiddle.lineTo(-400*dim, 300*dim);

  islandMiddle.lineTo(-300*dim, 300*dim);


  let ascari = [new THREE.Vector2(0,1),new THREE.Vector2(0.14174107142857142,0.6407849829351535),new THREE.Vector2(0.359375,0.25170648464163825),new THREE.Vector2(0.5758928571428571,0.19283276450511944),new THREE.Vector2(0.7421875,0.025597269624573427),new THREE.Vector2(1,0)] ;
  
  curve = new THREE.SplineCurve(scalePoints(ascari, -300*dim, 100*dim, 70*dim, 300*dim));
  
  // Get points from the curve and add them to the shape
  
  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    islandMiddle.lineTo(points[i].x, points[i].y);
  }
  
  // Add another straight line
  islandMiddle.lineTo(100*dim, 70*dim);

  let alboreto =  [new THREE.Vector2(0,0),new THREE.Vector2(0.5520833333333334,0.15927189988623447),new THREE.Vector2(0.5494791666666667,0.7861205915813425),new THREE.Vector2(0,1)] 

  curve = new THREE.SplineCurve(scalePoints(alboreto, 600*dim, 750*dim, 70*dim, -150*dim));

  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    islandMiddle.lineTo(points[i].x, points[i].y);
  }

  islandMiddle.lineTo(500*dim, -150*dim);

  // Optionally close the shape
  islandMiddle.closePath();

  return islandMiddle;
}

function getOuterField() {
  let outerShape = new THREE.Shape();
  
  // Define points for the outer shape
  const outerPoints = [
    new THREE.Vector2(-mapWidth, -mapHeight ),
    new THREE.Vector2(mapWidth , -mapHeight ),
    new THREE.Vector2(mapWidth , mapWidth ),
    new THREE.Vector2(-mapWidth , mapHeight ),
    new THREE.Vector2(-mapWidth , -mapHeight )
  ];

  for (let i = 0; i < outerPoints.length; i++) {
    outerShape.lineTo(outerPoints[i].x, outerPoints[i].y);
  }
  outerShape.closePath();
  
  // Create splines
  // Create a new shape
  let innerPath = new THREE.Shape();
  
  // Move to the starting point
  innerPath.moveTo(600*dim, -200*dim);
  
  // Add another straight line
  innerPath.lineTo(0, -200*dim);
  
  let primaVariante = [new THREE.Vector2(1,0),new THREE.Vector2(0.5126488095238095,0.11205915813424361),new THREE.Vector2(0.371279761904762,0.8589306029579068),new THREE.Vector2(0,1)]
  
  let curve = new THREE.SplineCurve(scalePoints(primaVariante, -200*dim, -50*dim, -200*dim, -50*dim));
  
  // Get points from the curve and add them to the shape
  let points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    innerPath.lineTo(points[i].x, points[i].y);
  }

  innerPath.lineTo(-400*dim, -50*dim);
  
  let curvone = [new THREE.Vector2(0,1),new THREE.Vector2(0.75,0.75),new THREE.Vector2(1,0)];

  curve = new THREE.SplineCurve(scalePoints(curvone, -400*dim, -500*dim, 50*dim, -50*dim));

  // Get points from the curve and add them to the shape
  
  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    innerPath.lineTo(points[i].x, points[i].y);
  }

  innerPath.lineTo(-500*dim, 50*dim);

  // Add a straight line to the shape
  innerPath.lineTo(-500*dim, 400*dim);

  let lesmo1 = [new THREE.Vector2(0,1),new THREE.Vector2(0.25,0.25),new THREE.Vector2(1,0)];

  curve = new THREE.SplineCurve(scalePoints(lesmo1, -500*dim, -400*dim, 400*dim, 300*dim));

  // Get points from the curve and add them to the shape
  
  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    innerPath.lineTo(points[i].x, points[i].y);
  }

  innerPath.lineTo(-300*dim, 400*dim);

  let lesmo2 = [new THREE.Vector2(0,1),new THREE.Vector2(0.75,0.75),new THREE.Vector2(1,0)];

  curve = new THREE.SplineCurve(scalePoints(lesmo2, -300*dim, -200*dim, 300*dim, 400*dim));

  // Get points from the curve and add them to the shape
  
  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    innerPath.lineTo(points[i].x, points[i].y);
  }
  
  let ascari = [new THREE.Vector2(0,1),new THREE.Vector2(0.14174107142857142,0.6407849829351535),new THREE.Vector2(0.359375,0.25170648464163825),new THREE.Vector2(0.5758928571428571,0.19283276450511944),new THREE.Vector2(0.7421875,0.025597269624573427),new THREE.Vector2(1,0)] ;
  
  curve = new THREE.SplineCurve(scalePoints(ascari, -200*dim, 200*dim, 150*dim, 300*dim));
  
  // Get points from the curve and add them to the shape
  
  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    innerPath.lineTo(points[i].x, points[i].y);
  }

  // Add a straight line to the shape
  innerPath.lineTo(200*dim, 150*dim);

  let alboreto =  [new THREE.Vector2(0,0),new THREE.Vector2(0.5520833333333334,0.15927189988623447),new THREE.Vector2(0.5494791666666667,0.7861205915813425),new THREE.Vector2(0,1)] 

  curve = new THREE.SplineCurve(scalePoints(alboreto, 600*dim, 900*dim, 150*dim, -200*dim));

  points = curve.getPoints(50); // 50 points on the curve
  for (let i = 0; i < points.length; i++) {
    innerPath.lineTo(points[i].x, points[i].y);
  }

  // Optionally close the shape
  innerPath.closePath();


  // Add inner path as a hole in the outer shape
  outerShape.holes.push(innerPath);

  return outerShape;
}

function renderMap(mapWidth, mapHeight) {
  const lineMarkingsTexture = getLineMarkings(mapWidth, mapHeight);

  const planeGeometry = new THREE.PlaneBufferGeometry(mapWidth, mapHeight);
  const planeMaterial = new THREE.MeshLambertMaterial({
    map: lineMarkingsTexture
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.receiveShadow = true;
  plane.matrixAutoUpdate = false;
  scene.add(plane);

  const islandMiddle = getMiddleIsland();
  const outerField = getOuterField();

  const curbsTexture = getCurbsTexture(mapWidth, mapHeight);
  curbsTexture.offset = new THREE.Vector2(0.5, 0.5);
  curbsTexture.repeat.set(1 / mapWidth, 1 / mapHeight);

  const fieldGeometry = new THREE.ExtrudeBufferGeometry(
    [islandMiddle, outerField],
    { depth: 6, bevelEnabled: false }
  );

  const fieldMesh = new THREE.Mesh(fieldGeometry, [
    new THREE.MeshLambertMaterial({
      color: !config.curbs && lawnGreen,
      map: config.curbs && curbsTexture
    }),
    new THREE.MeshLambertMaterial({ color: 0x808080 }) // Gray track
  ]);
  fieldMesh.receiveShadow = true;
  fieldMesh.matrixAutoUpdate = false;
  scene.add(fieldMesh);

  if (config.trees) {
    const positions = [
      { x: trackRadius2 * 1.3, y: 0 },
      { x: trackRadius2 * 1.3, y: trackRadius2 * 1.9 },
      { x: trackRadius2 * 0.8, y: trackRadius2 * 2 },
      { x: trackRadius2 * 1.8, y: trackRadius2 * 2 },
      { x: -trackRadius2, y: trackRadius2 * 2 },
      { x: -trackRadius2 * 2, y: trackRadius2 * 1.8 },
      { x: trackRadius2 * 0.8, y: -trackRadius2 * 2 },
      { x: trackRadius2 * 1.8, y: -trackRadius2 * 2 },
      { x: -trackRadius2, y: -trackRadius2 * 2 },
      { x: -trackRadius2 * 2, y: -trackRadius2 * 1.8 },
      { x: trackRadius2 * 0.6, y: -trackRadius2 * 2.3 },
      { x: trackRadius2 * 1.5, y: -trackRadius2 * 2.4 },
      { x: -trackRadius2 * 0.7, y: -trackRadius2 * 2.4 },
      { x: -trackRadius2 * 1.5, y: -trackRadius2 * 1.8 },
      { x:1500, y:-800},
      { x:1550, y:-1300},
      { x:1300, y:-800},
      { x:1700, y:-1300},
      { x:1000, y:-1300},
      { x:800, y:-800},
      { x:-200, y:-80},
      { x:-400, y:-60},
      { x:2000, y:-1350},
      { x:2150, y:-1325},
      { x:3800, y:-750},
      { x:3500, y:-800},
      { x:3800, y:200},
      { x:3600, y:220},
    ];

    positions.forEach(pos => {
      const tree = Tree();
      tree.position.set(pos.x, pos.y, 0);
      scene.add(tree);
    });
  }
}


function getCarFrontTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 64, 32);

  context.fillStyle = "#666666";
  context.fillRect(8, 8, 48, 24);

  return new THREE.CanvasTexture(canvas);
}

function getCarSideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 128, 32);

  context.fillStyle = "#666666";
  context.fillRect(10, 8, 38, 24);
  context.fillRect(58, 8, 60, 24);

  return new THREE.CanvasTexture(canvas);
}

function Smoke() {
  let smoke = new THREE.Group()
  let smokeright1 = new THREE.Mesh(
    new THREE.SphereBufferGeometry(10, 64, 32),
    new THREE.MeshLambertMaterial({ color: 0x999999 })
  );
  let smokeleft1 = new THREE.Mesh(
    new THREE.SphereBufferGeometry(10, 64, 32),
    new THREE.MeshLambertMaterial({ color: 0x999999 })
  );
  smokeleft1.position.y = 20
  smoke.add(smokeright1)
  smoke.add(smokeleft1)
  return smoke
}

function Car() {
  const car = new THREE.Group();

  const color = pickRandom(vehicleColors);

  const main = new THREE.Mesh(
    new THREE.BoxBufferGeometry(60, 30, 15),
    new THREE.MeshLambertMaterial({ color })
  );
  main.position.z = 12;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);

  const carFrontTexture = getCarFrontTexture();
  carFrontTexture.center = new THREE.Vector2(0.5, 0.5);
  carFrontTexture.rotation = Math.PI / 2;

  const carBackTexture = getCarFrontTexture();
  carBackTexture.center = new THREE.Vector2(0.5, 0.5);
  carBackTexture.rotation = -Math.PI / 2;

  const carLeftSideTexture = getCarSideTexture();
  carLeftSideTexture.flipY = false;

  const carRightSideTexture = getCarSideTexture();

  const cabin = new THREE.Mesh(new THREE.BoxBufferGeometry(33, 24, 12), [
    new THREE.MeshLambertMaterial({ map: carFrontTexture }),
    new THREE.MeshLambertMaterial({ map: carBackTexture }),
    new THREE.MeshLambertMaterial({ map: carLeftSideTexture }),
    new THREE.MeshLambertMaterial({ map: carRightSideTexture }),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), // top
    new THREE.MeshLambertMaterial({ color: 0xffffff }) // bottom
  ]);
  cabin.position.x = -6;
  cabin.position.z = 25.5;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add(cabin);

  const backWheel = new Wheel();
  backWheel.position.x = -18;
  car.add(backWheel);

  const frontWheel = new Wheel();
  frontWheel.position.x = 18;
  car.add(frontWheel);

  if (config.showHitZones) {
    car.userData.hitZone1 = HitZone();
    car.userData.hitZone2 = HitZone();
  }

  return car;
}


function HitZone() {
  const hitZone = new THREE.Mesh(
    new THREE.CylinderGeometry(20, 20, 60, 30),
    new THREE.MeshLambertMaterial({ color: 0xff0000 })
  );
  hitZone.position.z = 25;
  hitZone.rotation.x = Math.PI / 2;

  scene.add(hitZone);
  return hitZone;
}

function Wheel() {
  const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheel.position.z = 6;
  wheel.castShadow = false;
  wheel.receiveShadow = false;
  return wheel;
}

function Tree() {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
  trunk.position.z = 10;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.matrixAutoUpdate = false;
  tree.add(trunk);

  const treeHeights = [45, 60, 75];
  const height = pickRandom(treeHeights);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(height / 2, 30, 30),
    treeCrownMaterial
  );
  crown.position.z = height / 2 + 30;
  crown.castShadow = true;
  crown.receiveShadow = false;
  tree.add(crown);

  return tree;
}

accelerateButton.addEventListener("mousedown", function () {
  startGame();
  accelerate = true;
});
decelerateButton.addEventListener("mousedown", function () {
  startGame();
  decelerate = true;
});
accelerateButton.addEventListener("mouseup", function () {
  accelerate = false;
});
decelerateButton.addEventListener("mouseup", function () {
  decelerate = false;
});
window.addEventListener("keydown", function (event) {
  if (event.key == "ArrowUp") {
    startGame();
    accelerate = true;
    return;
  }
  if (event.key == "ArrowDown") {
    decelerate = true;
    return;
  }
  if (event.key == "ArrowRight") {
    turn_right = true;
    return;
  }
  if (event.key == "ArrowLeft") {
    turn_left = true;
    return;
  }
  if (event.key == "R" || event.key == "r") {
    reset();
    return;
  }
});
window.addEventListener("keyup", function (event) {
  if (event.key == "ArrowUp") {
    accelerate = false;
    return;
  }
  if (event.key == "ArrowDown") {
    decelerate = false;
    return;
  }
  if (event.key == "ArrowRight") {
    turn_right = false;
    return;
  }
  if (event.key == "ArrowLeft") {
    turn_left = false;
    return;
  }
});

function animation(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    return;
  }

  const timeDelta = timestamp - lastTimestamp;

  movePlayerCar(timeDelta);

  //hitDetection();

  renderer.render(scene, camera);
  lastTimestamp = timestamp;
}

function movePlayerCar(timeDelta) {
  const playerSpeed = getPlayerSpeed(timeDelta);
  if (turn_left)
    playerAngleMoved += timeDelta * 2e-2 * (1/playerSpeed)**1/3;
  if (turn_right)
    playerAngleMoved -= timeDelta * 2e-2 * (1/playerSpeed)**1/3;
  if (playerAngleMoved>.1)
    playerAngleMoved = .1;

  const totalPlayerAngle = playerAngleInitial + playerAngleMoved;
  Xdisplace += Math.cos(totalPlayerAngle) * playerSpeed;
  Ydisplace += Math.sin(totalPlayerAngle) * playerSpeed;
  const playerX = playerXInitial + Xdisplace;
  const playerY = playerYInitial + Ydisplace;
  
  playerCar.position.x = playerX;
  playerCar.position.y = playerY;
  
  camera.position.set(playerX+playerX*1e-3, playerY+playerY*1e-3, 300);
  camera.lookAt(playerX, playerY, 0);
  playerCar.rotation.z = totalPlayerAngle;



  smoke.position.x = playerX+25-(Xdisplace*1e-3);
  smoke.position.y = playerY+10-(Ydisplace*1e-3);
  smoke.rotation.z = totalPlayerAngle;
  if (speed<2 & accelerate){
    smoke.visible = true
    smoke.scaleFactorX = 1/speed
    smoke.scaleFactorY = 1/speed
  } 
  else smoke.visible = false
}

function getPlayerSpeed(timeDelta) {
  if (accelerate & speed === 0) speed = 1e-10;
  if (decelerate & speed === 0) speed = 0;
  if (accelerate) speed += 1e-3 * timeDelta;
  if (decelerate) speed -= 2.5e-3 * timeDelta;
  return speed;
}

function getHitZonePosition(center, angle, clockwise, distance) {
  const directionAngle = angle + clockwise ? -Math.PI / 2 : +Math.PI / 2;
  return {
    x: center.x + Math.cos(directionAngle) * distance,
    y: center.y + Math.sin(directionAngle) * distance
  };
}

function hitDetection() {
  const playerHitZone1 = getHitZonePosition(
    playerCar.position,
    playerAngleInitial + playerAngleMoved,
    true,
    15
  );

  const playerHitZone2 = getHitZonePosition(
    playerCar.position,
    playerAngleInitial + playerAngleMoved,
    true,
    -15
  );

  if (config.showHitZones) {
    playerCar.userData.hitZone1.position.x = playerHitZone1.x;
    playerCar.userData.hitZone1.position.y = playerHitZone1.y;

    playerCar.userData.hitZone2.position.x = playerHitZone2.x;
    playerCar.userData.hitZone2.position.y = playerHitZone2.y;
  }

  const hit = otherVehicles.some((vehicle) => {
    if (vehicle.type == "car") {
      const vehicleHitZone1 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        15
      );

      const vehicleHitZone2 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        -15
      );

      if (config.showHitZones) {
        vehicle.mesh.userData.hitZone1.position.x = vehicleHitZone1.x;
        vehicle.mesh.userData.hitZone1.position.y = vehicleHitZone1.y;

        vehicle.mesh.userData.hitZone2.position.x = vehicleHitZone2.x;
        vehicle.mesh.userData.hitZone2.position.y = vehicleHitZone2.y;
      }

      // The player hits another vehicle
      if (getDistance(playerHitZone1, vehicleHitZone1) < 40) return true;
      if (getDistance(playerHitZone1, vehicleHitZone2) < 40) return true;

      // Another vehicle hits the player
      if (getDistance(playerHitZone2, vehicleHitZone1) < 40) return true;
    }

    if (vehicle.type == "truck") {
      const vehicleHitZone1 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        35
      );

      const vehicleHitZone2 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        0
      );

      const vehicleHitZone3 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        -35
      );

      if (config.showHitZones) {
        vehicle.mesh.userData.hitZone1.position.x = vehicleHitZone1.x;
        vehicle.mesh.userData.hitZone1.position.y = vehicleHitZone1.y;

        vehicle.mesh.userData.hitZone2.position.x = vehicleHitZone2.x;
        vehicle.mesh.userData.hitZone2.position.y = vehicleHitZone2.y;

        vehicle.mesh.userData.hitZone3.position.x = vehicleHitZone3.x;
        vehicle.mesh.userData.hitZone3.position.y = vehicleHitZone3.y;
      }

      // The player hits another vehicle
      if (getDistance(playerHitZone1, vehicleHitZone1) < 40) return true;
      if (getDistance(playerHitZone1, vehicleHitZone2) < 40) return true;
      if (getDistance(playerHitZone1, vehicleHitZone3) < 40) return true;

      // Another vehicle hits the player
      if (getDistance(playerHitZone2, vehicleHitZone1) < 40) return true;
    }
  });

  if (hit) {
    if (resultsElement) resultsElement.style.display = "flex";
    renderer.setAnimationLoop(null); // Stop animation loop
  }
}

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  // Adjust camera
  const newAspectRatio = window.innerWidth / window.innerHeight;
  const adjustedCameraHeight = cameraWidth / newAspectRatio;

  camera.top = adjustedCameraHeight / 2;
  camera.bottom = adjustedCameraHeight / -2;
  camera.updateProjectionMatrix(); // Must be called after change

  // Reset renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);

  const pixelRatio = Math.min(window.devicePixelRatio, 2)
  renderer.setPixelRatio(pixelRatio)
});
