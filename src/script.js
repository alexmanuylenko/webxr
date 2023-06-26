import './style.css'
import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// TODO: Move to JSON settings
const SKY_COLOR = 0xffffff 
const GROUND_COLOR = 0xbbbbff
const LIGHT_INTENSITY = 1
const LIGHT_POSITION = new THREE.Vector3(0.5, 1, 0.25)
const HEIGHT_DISTANCE = 1.0
const DIAGONAL_FRONT_DISTANCE = 1.5

let camera, canvas, scene, renderer, mesh, targetMesh
let min = new THREE.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)
let max = new THREE.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE)
let width, height, length, scaleFactor
let center, diag, diagLength, toCameraPosVector, lookAtVector

let mixer //: THREE.AnimationMixer
let modelReady = false
let played = false
let activeAction //: THREE.AnimationAction

const clock = new THREE.Clock()

function setupMobileDebug() {
  // for image tracking we need a mobile debug console as it only works on android
  // This library is very big so only use it while debugging - just comment it out when your app is done
  const containerEl = document.getElementById("console-ui");
  eruda.init({
    container: containerEl
  });
  const devToolEl = containerEl.shadowRoot.querySelector('.eruda-dev-tools');
  devToolEl.style.height = '40%'; // control the height of the dev tool panel
}

function traverseObjectVertices(obj, callback) {
  const front = new Array;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      front.push(obj[i]);
    }
  } else {
    front.push(obj);
  }
  while (front.length > 0) {
    // pop have better performance than shif, and we can go from back in this case
    const obj = front.pop();
    if (obj) {
      if (obj instanceof THREE.Mesh && obj.geometry !== undefined) {
        const vertices = obj.geometry.vertices;
        const vertex = new THREE.Vector3();
        if (vertices === undefined && obj.geometry.attributes !== undefined && "position" in obj.geometry.attributes) {
          const pos = obj.geometry.attributes.position;
          for (let i = 0; i < pos.count * pos.itemSize; i += pos.itemSize) {
            vertex.set(pos.array[i], pos.array[i + 1], pos.array[i + 2]);
            callback(vertex.applyMatrix4(obj.matrixWorld));
          }
        } else {
          for (let i = 0; i < vertices.length; ++i) {
            callback(vertex.copy(vertices[i]).applyMatrix4(obj.matrixWorld));
          }
        }
      }
      if (obj.children !== undefined) {
        for (const child of obj.children) {
          front.push(child);
        }
      }
    }
  }
}

async function setupImageTarget() {
  const img = document.getElementById('img')
  const imgBitmap = await createImageBitmap(img)
  console.log(imgBitmap)
  return imgBitmap
}

function createTargetMesh(texture) {
  var material = new THREE.MeshBasicMaterial( {
    'map': texture,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  })
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array( [
    -1.0, -1.0,  -5.0, // v0
     1.0, -1.0,  -5.0, // v1
     1.0,  1.0,  -5.0, // v2
    -1.0,  1.0,  -5.0, // v3
  ] )
  const indices = [
    0, 1, 2,
    2, 3, 0,
  ]
  const uv = new Float32Array([
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0,
  ])
  geometry.setIndex( indices );
  geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
  geometry.setAttribute( 'uv', new THREE.BufferAttribute( uv, 2 ) );
  return new THREE.Mesh(geometry, material)
}

function createARButton(imgBitmap) {
  //more on image-tracking feature: https://github.com/immersive-web/marker-tracking/blob/main/explainer.md
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"], // notice a new required feature
    trackedImages: [
      {
        image: imgBitmap, // tell webxr this is the image target we want to track
        widthInMeters: 0.7 // in meters what the size of the PRINTED image in the real world
      }
    ],
    //this is for the mobile debug
    optionalFeatures: ["dom-overlay", "dom-overlay-for-handheld-ar"],
    domOverlay: {
      root: document.body
    }
  });
  return button
}

function getMaxDimension(width, height, length) {
  if (width > height) {
    if (width > length) {
      return width
    }
    return length
  }
  if (height > length) {
    return height
  }
  return length
}

async function init() {
  canvas = document.querySelector('canvas.webgl')

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, 
    window.innerWidth / window.innerHeight,
    0.01,
    40
  );
  camera.matrixAutoUpdate = false;

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true

  const light = new THREE.HemisphereLight(SKY_COLOR, GROUND_COLOR, LIGHT_INTENSITY)
  light.position.set(LIGHT_POSITION.x, LIGHT_POSITION.y, LIGHT_POSITION.z)
  scene.add(light)

  const loader = new GLTFLoader()

  loader.load("https://alexmanuylenko.github.io/webxr-assets/fire_scene.glb", function(gltf) {
    mesh = gltf.scene;
 
    mixer = new THREE.AnimationMixer(mesh)
    activeAction = mixer.clipAction(gltf.animations[0])
    console.log('Active action: ' + activeAction)

    traverseObjectVertices(mesh, (vertex) => { 
      min.x = Math.min(min.x, vertex.x)
      min.y = Math.min(min.y, vertex.y)
      min.z = Math.min(min.z, vertex.z)
    
      max.x = Math.max(max.x, vertex.x)
      max.y = Math.max(max.y, vertex.y)
      max.z = Math.max(max.z, vertex.z)
    })

    center = new THREE.Vector3((min.x + max.x) / 2.0, (min.y + max.y) / 2.0, (min.z + max.z) / 2.0)
    diag = new THREE.Vector3(max.x - min.x, max.y - min.y, max.z - min.z)
    diagLength = diag.length()

    width = Math.abs(max.x - min.x)
    height = Math.abs(max.y - min.y)
    length = Math.abs(max.z - min.z)
    scaleFactor = getMaxDimension(width, height, length);

    //mesh.matrixAutoUpdate = false; // important we have to set this to false because we'll update the position when we track an image
    mesh.visible = false;
    scene.add(mesh);
    modelReady = true

    var textureLoader = new THREE.TextureLoader()
    textureLoader.load('https://raw.githubusercontent.com/alexmanuylenko/webxr-assets/master/fire_marker.jpg', (texture) => {
  
      var targetMesh = createTargetMesh(texture)
      targetMesh.visible = true
      scene.add(targetMesh);
    
      var imgBitmap = setupImageTarget()
      const button = createARButton(imgBitmap)
      document.body.appendChild(button);
    })  
  });

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function play() {
    if (!activeAction) {
      console.log('No active action')
      return
    }
    
    console.log('Active action in animate: ' + activeAction)
    activeAction.reset()
    activeAction.fadeIn(1)
    activeAction.play()

    played = true
}

function animate() {
  renderer.setAnimationLoop(render)
}

async function updateCamera(pose) {
  if (!pose) { return }
  let view = pose.views[0]
    
  // Use the view's transform matrix and projection matrix to configure the THREE.camera.
  camera.matrix.fromArray(view.transform.matrix)
  camera.projectionMatrix.fromArray(view.projectionMatrix)
  camera.updateMatrixWorld(true)

  lookAtVector = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
  toCameraPosVector = new THREE.Vector3(camera.position.x - center.x, camera.position.y - center.y, camera.position.z - center.z)

  console.log('camera pos: (' + camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z + ')')
  console.log('camera up: (' + camera.up.x + ', ' + camera.up.y + ', ' + camera.up.z + ')')
  console.log('lookAtVector: (' + lookAtVector.x + ', ' + lookAtVector.y + ', ' + lookAtVector.z + ')')
  console.log('toCameraPosVector: (' + toCameraPosVector.x + ', ' + toCameraPosVector.y + ', ' + toCameraPosVector.z + ')')
}

async function updateMesh() {
  let newPosition = new THREE.Vector3(
    camera.position.x - HEIGHT_DISTANCE * height * camera.up.x + DIAGONAL_FRONT_DISTANCE * diagLength * lookAtVector.x,
    camera.position.y - HEIGHT_DISTANCE * height * camera.up.y + DIAGONAL_FRONT_DISTANCE * diagLength * lookAtVector.y,
    camera.position.z - HEIGHT_DISTANCE * height * camera.up.z + DIAGONAL_FRONT_DISTANCE * diagLength * lookAtVector.z,
  )
  
  mesh.position.set(newPosition.x, newPosition.y, newPosition.z)
}

async function showMesh() {
  mesh.visible = true
}

async function hideMesh() {
  mesh.visible = false
}

async function renderFrame(timestamp, frame) {
  if (!played) play()
  if (modelReady) mixer.update(clock.getDelta())

  if (!frame) { 
    return 
  }

  let referenceSpace = renderer.xr.getReferenceSpace()
  let pose = frame.getViewerPose(referenceSpace)
  updateCamera(pose)
  updateMesh()

  //checking if there are any images we track
  const results = frame.getImageTrackingResults()
  
  //if we have more than one image the results are an array 
  for (const result of results) {
    // The result's index is the image's position in the trackedImages array specified at session creation
    const imageIndex = result.index;

    //checking the state of the tracking
    const state = result.trackingState;
    console.log(state);

    if (state == "tracked") {
      console.log("Image target has been found")
      showMesh()
    } else if (state == "emulated") {
      // hideMesh()
      console.log("Image target no longer seen")
    }
  }
}

async function render(timestamp, frame) {
  renderFrame(timestamp, frame)
  renderer.render(scene, camera)
}

setupMobileDebug()
init()
animate()
