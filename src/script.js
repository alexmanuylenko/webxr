import './style.css'
import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// TODO: Move to settings config file, unique for each page/model or JSON:
const MESH_MODEL_FILE_NAME_URL = "https://alexmanuylenko.github.io/webxr-assets/fire_scene.glb"
const TEXTURE_MARKER_IMAGE_FILE_NAME_URL = 'https://raw.githubusercontent.com/alexmanuylenko/webxr-assets/master/fire_marker.jpg'
const SKY_COLOR = 0xffffff 
const GROUND_COLOR = 0xbbbbff
const LIGHT_INTENSITY = 1
const LIGHT_POSITION = new THREE.Vector3(0.5, 1, 0.25)
const HEIGHT_DISTANCE = 1.0
const DIAGONAL_FRONT_DISTANCE = 1.5
const TARGET_MESH_DISTANCE = 3.0
const DEFAULT_HUD_POSITION = new THREE.Vector3(0.0, 1.5, -5.0)
const HUD_POSITION = new THREE.Vector3(0.0, 1.5, -5.0)

// Mesh model processing (centring) parameters:
const MESH_MODEL_SCALE = new THREE.Vector3(0.5, 0.5, 0.5)
const MESH_MODEL_ROTATE = new THREE.Vector3(0.0, 0.0, 0.0)
const MESH_MODEL_TRANSLATE = new THREE.Vector3(0.0, -0.2, 0.0) 

let camera, canvas, scene, renderer, mesh, targetMesh
let min = new THREE.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)
let max = new THREE.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE)
let width, height, length, scaleFactor
let center, diag, diagLength, toCameraPosVector, lookAtVector

let mixer //: THREE.AnimationMixer
let modelReady = false
let played = false
let activeAction //: THREE.AnimationAction

let targetMeshVisible = true

let hudCanvas, hudCtx, hudTexture, hudPlane
let hudCustom1, hudCustom2, hudCustom3
let hudTimer = performance || Date
let hudMsActive = false
let hudMsStart = hudTimer.now()
let hudMsEnd = hudTimer.now()
let hudMsGraphData = new Array(32).fill(0)
let hudMs = 0
let hudDisplayRefreshDelay = 100
let hudFpsLastTime = hudTimer.now()
let hudFpsFrames = 0
let hudFpsGraphData = new Array(32).fill(0)

let hudCamera, hudScene

const clock = new THREE.Clock()

function createHud(_scene, _camera) {
  hudScene = _scene
  hudCamera = _camera;
  if (hudCamera.parent === null) {
    hudScene.add(hudCamera);
  }

  // hudCanvas = document.querySelector('canvas.webgl')
  hudCanvas = document.createElement("canvas")
  hudCanvas.width = 64
  hudCanvas.height = 64

  hudCtx = hudCanvas.getContext("2d")
  hudTexture = new THREE.Texture(hudCanvas)
  
  const hudMaterial = new THREE.MeshBasicMaterial({
    map: hudTexture,
    depthTest: false,
    transparent: true,
  })
  
  const hudGeometry = new THREE.PlaneGeometry(1, 1, 1, 1)

  hudPlane = new THREE.Mesh(hudGeometry, hudMaterial)
  hudPlane.position.x = DEFAULT_HUD_POSITION.x
  hudPlane.position.y = DEFAULT_HUD_POSITION.y
  hudPlane.position.z = DEFAULT_HUD_POSITION.z
  hudPlane.renderOrder = 9999

  hudCamera.add(hudPlane)
  camera.add(hudPlane)
}

function setHudEnabled(enabled) {
  hudPlane.visible = enabled
}

function setHudX(val) {
  hudPlane.position.x = val
}

function setHudY(val) {
  hudPlane.position.y = val
}

function setHudZ(val) {
  hudPlane.position.z = val
}

function setHudCustom1(val) {
  hudCustom1 = val
}

function setHudCustom2(val) {
  hudCustom2 = val
}

function setHudCustom3(val) {
  hudCustom3 = val
}

function startHudTimer() {
  hudMsActive = true
  hudMsStart = hudTimer.now()
}

function endHudTimer() {
  hudMsEnd = hudTimer.now()
  hudMs = ((hudMsEnd - hudMsStart) * 100) / 100
}

function addToHud(object3d) {
  hudCamera.add(object3d)
  camera.add(object3d)
}

function updateHud() {
  hudTexture.needsUpdate = true;

  const now = hudTimer.now();
  const dt = now - hudFpsLastTime;
  hudFpsFrames++;
  if (now > hudFpsLastTime + hudDisplayRefreshDelay) {
    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);

    //FPS
    hudFpsLastTime = now;
    var FPS = ((((hudFpsFrames * 1000) / dt) * 100) / 100).toFixed(2);
    hudFpsFrames = 0;

    hudFpsGraphData.push(FPS);
    if (hudFpsGraphData.length >= 32) {
      hudFpsGraphData.shift();
    }
    var ratio = Math.max.apply(null, hudFpsGraphData);

    hudCtx.strokeStyle = "#035363";
    for (var i = 0; i < 32; i++) {
      hudCtx.beginPath();
      hudCtx.moveTo(i, 16);
      hudCtx.lineTo(i, 16 - (hudFpsGraphData[i] / ratio) * 16);
      hudCtx.stroke();
    }

    hudCtx.font = "13px Calibri";
    hudCtx.fillStyle = "#00cc00";
    hudCtx.fillText(FPS, 1, 13);

    //MS
    if (hudMsActive) {
      hudMsGraphData.push(hudMs);
      if (hudMsGraphData.length >= 32) {
        hudMsGraphData.shift();
      }
      ratio = Math.max.apply(null, hudMsGraphData);
      hudCtx.strokeStyle = "#f35363";
      for (var i = 0; i < 32; i++) {
        hudCtx.beginPath();
        hudCtx.moveTo(i + 32, 16);
        hudCtx.lineTo(i + 32, 16 - (hudMsGraphData[i] / ratio) * 16);
        hudCtx.stroke();
      }
      hudCtx.font = "13px Calibri";
      hudCtx.fillStyle = "#00ccff";
      hudCtx.fillText(hudMs.toFixed(2), 33, 13);
    }

    //Custom
    if (hudCustom1) {
      hudCtx.font = "11px";
      hudCtx.fillStyle = "#ffffff";
      hudCtx.fillText(hudCustom1, 0, 29);
    }
    if (hudCustom2) {
      hudCtx.font = "11px";
      hudCtx.fillStyle = "#ffffff";
      hudCtx.fillText(hudCustom2, 0, 45);
    }
    if (hudCustom3) {
      hudCtx.font = "11px";
      hudCtx.fillStyle = "#ffffff";
      hudCtx.fillText(hudCustom3, 0, 61);
    }
  }
}

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
    -1.0, -1.0,  0.0, // v0
     1.0, -1.0,  0.0, // v1
     1.0,  1.0,  0.0, // v2
    -1.0,  1.0,  0.0, // v3
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

async function init() {
  canvas = document.querySelector('canvas.webgl')

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, 
    window.innerWidth / window.innerHeight,
    0.01,
    40
  );
  camera.matrixAutoUpdate = true;
  if (camera.parent === null) {
    scene.add(camera);
  }

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true

  const light = new THREE.HemisphereLight(SKY_COLOR, GROUND_COLOR, LIGHT_INTENSITY)
  light.position.set(LIGHT_POSITION.x, LIGHT_POSITION.y, LIGHT_POSITION.z)
  scene.add(light)

  createHud(scene, camera)
  setHudX(HUD_POSITION.x)
  setHudY(HUD_POSITION.y)
  setHudZ(HUD_POSITION.z)

  const loader = new GLTFLoader()

  loader.load(MESH_MODEL_FILE_NAME_URL, function(gltf) {
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
    scaleFactor = Math.max(width, Math.max(height, length))
    let rScaleFactor = 1.0 / scaleFactor
    
    mesh.scale.set(MESH_MODEL_SCALE.x * rScaleFactor, MESH_MODEL_SCALE.y * rScaleFactor, MESH_MODEL_SCALE.z * rScaleFactor)
    mesh.rotateX(MESH_MODEL_ROTATE.x)
    mesh.rotateY(MESH_MODEL_ROTATE.y)
    mesh.rotateZ(MESH_MODEL_ROTATE.z)
    mesh.translateX(MESH_MODEL_TRANSLATE.x)
    mesh.translateY(MESH_MODEL_TRANSLATE.y)
    mesh.translateZ(MESH_MODEL_TRANSLATE.z)

    //mesh.matrixAutoUpdate = false; // important we have to set this to false because we'll update the position when we track an image
    mesh.visible = false;
    scene.add(mesh);
    modelReady = true

    var textureLoader = new THREE.TextureLoader()
    textureLoader.load(TEXTURE_MARKER_IMAGE_FILE_NAME_URL, async function(texture) {
  
      targetMesh = createTargetMesh(texture)
      targetMesh.visible = false
      scene.add(targetMesh);
    
      var imgBitmap = await setupImageTarget()
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
      console.log('Play: No active action')
      return
    }
    console.log('Play: Active action: ' + activeAction)
    
    activeAction.reset()
    activeAction.fadeIn(1)
    activeAction.play()

    played = true
}

function stop() {
  if (!activeAction) {
    console.log('Stop: No active action')
    return
  }
  console.log('Stop: Active action: ' + activeAction)

  activeAction.fadeOut(1)
  activeAction.stop()
  activeAction.reset()

  played = false
}

async function updateFromCamera() {
  lookAtVector = new THREE.Vector3(0.0, 0.0, -1.0).applyQuaternion(camera.quaternion)
  lookAtVector = lookAtVector.normalize()
  toCameraPosVector = new THREE.Vector3(camera.position.x - center.x, camera.position.y - center.y, camera.position.z - center.z)

  camera.up = new THREE.Vector3(0.0, 1.0, 0.0).applyQuaternion(camera.quaternion)
  
  console.log('camera pos: (' + camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z + ')')
  console.log('camera up: (' + camera.up.x + ', ' + camera.up.y + ', ' + camera.up.z + ')')
  console.log('lookAtVector: (' + lookAtVector.x + ', ' + lookAtVector.y + ', ' + lookAtVector.z + ')')
  console.log('toCameraPosVector: (' + toCameraPosVector.x + ', ' + toCameraPosVector.y + ', ' + toCameraPosVector.z + ')')
}

async function updateMesh() {
  // TODO
  // let newPosition = new THREE.Vector3(
  //   camera.position.x - HEIGHT_DISTANCE * height * camera.up.x + DIAGONAL_FRONT_DISTANCE * diagLength * lookAtVector.x,
  //   camera.position.y - HEIGHT_DISTANCE * height * camera.up.y + DIAGONAL_FRONT_DISTANCE * diagLength * lookAtVector.y,
  //   camera.position.z - HEIGHT_DISTANCE * height * camera.up.z + DIAGONAL_FRONT_DISTANCE * diagLength * lookAtVector.z,
  // )
  
  // mesh.position.set(newPosition.x, newPosition.y, newPosition.z)
  // mesh.lookAt(camera.position)
  // mesh.up = camera.up
}

async function updateMeshByPose(pose) {
  let position = new THREE.Vector3(
    pose.transform.position.x + MESH_MODEL_TRANSLATE.x, 
    pose.transform.position.y + MESH_MODEL_TRANSLATE.y, 
    pose.transform.position.z + MESH_MODEL_TRANSLATE.z)
  let lookAt = new THREE.Vector3(0.0, 1.0, 0.0).applyQuaternion(pose.transform.orientation) 
  lookAt = lookAt.normalize()
  let target = new THREE.Vector3(
    position.x + lookAt.x,
    position.y + lookAt.y,
    position.z + lookAt.z
  )
  mesh.position.set(position.x, position.y, position.z)
  mesh.lookAt(target)
  mesh.up = new THREE.Vector3(0.0, 0.0, -1.0).applyQuaternion(pose.transform.orientation) // just for some case
  // mesh.matrix.fromArray(pose.transform.matrix);
}

async function updateTargetMesh() {
  let newPosition = new THREE.Vector3(
    camera.position.x + TARGET_MESH_DISTANCE * lookAtVector.x,
    camera.position.y + TARGET_MESH_DISTANCE * lookAtVector.y,
    camera.position.z + TARGET_MESH_DISTANCE * lookAtVector.z,
  )

  targetMesh.position.set(newPosition.x, newPosition.y, newPosition.z)
  targetMesh.lookAt(camera.position)
  targetMesh.up = camera.up
}

async function showMesh() {
  mesh.visible = true
}

async function hideMesh() {
  mesh.visible = false
}

async function showTargetMesh() {
  targetMesh.visible = true
}

async function hideTargetMesh() {
  targetMesh.visible = false
}

async function update() {
  updateFromCamera()
  updateMesh()
  updateTargetMesh()
}

async function renderFrame(timestamp, frame) {
  if (!frame) { 
    return 
  }

  const referenceSpace = renderer.xr.getReferenceSpace();

  showTargetMesh()
  if (!targetMeshVisible) {
    hideTargetMesh()
  }

  targetMeshVisible = true

  //checking if there are any images we track
  const results = frame.getImageTrackingResults()
  
  //if we have more than one image the results are an array 
  for (const result of results) {
    // The result's index is the image's position in the trackedImages array specified at session creation
    const imageIndex = result.index;

    // Get the pose of the image relative to a reference space.
    const pose = frame.getPose(result.imageSpace, referenceSpace);

    //checking the state of the tracking
    const state = result.trackingState;
    console.log(state);

    if (state == "tracked") {
      console.log("Image target has been found")
      targetMeshVisible = false
      if (!played) play()
      if (modelReady) mixer.update(clock.getDelta())
      updateMeshByPose(pose)
      showMesh()
    } else if (state == "emulated") {
      if (played) stop()
      hideMesh()
      console.log("Image target no longer seen")
    }
  }
}

async function mainLoop(timestamp, frame) {
  startHudTimer()
  update()
  updateHud()
  renderFrame(timestamp, frame)
  renderer.render(scene, camera)
  endHudTimer()
}

function main() {
  renderer.setAnimationLoop(mainLoop)
}

setupMobileDebug()
init()
main()
