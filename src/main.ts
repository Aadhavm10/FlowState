import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import vertexShader from './shaders/vertex.vs.glsl';
import fragmentShader from './shaders/fragment.fs.glsl';
import './style.css';
import './ui/styles/song-list.css';

// NEW: Import Music System
import { App as MusicApp } from './app';

const App = () => {
  // Audio
  let audioContext: AudioContext,
    analyser: AnalyserNode,
    source: MediaElementAudioSourceNode;
  const meshSegments = 128;
  const fftSize = meshSegments * 4;
  let dataArray = new Uint8Array(fftSize / 2); // Initialize with proper size
  const audio = new Audio();
  const container = document.getElementById('app');
  container?.appendChild(audio);

  // NEW: Music System instance
  let musicApp: MusicApp;

  // Scene
  const scene = new THREE.Scene();
  const aspect = window.innerWidth / window.innerHeight;
  const fov = 75;
  const near = 0.1;
  const far = 1000;

  // Renderer & Effect composer
  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('canvas') as HTMLCanvasElement,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // renderer.setClearColor(0x111111);
  renderer.physicallyCorrectLights = true;
  // renderer.outputEncoding = THREE.sRGBEncoding;

  let renderScene;
  const composer = new EffectComposer(renderer);

  const clock = new THREE.Clock();
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  // camera.position.set(0, 30, 50);
  camera.position.set(0, 50, 30);

  // Parent camera to obj so we can spin the object and move camera
  const cameraPole = new THREE.Object3D();
  scene.add(cameraPole);
  cameraPole.add(camera);

  // Add mouse controls
  const controls = new OrbitControls(camera, renderer.domElement);
  // controls.autoRotateSpeed = .5;

  // variables
  const uniforms = {
    u_resolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      type: 'v2',
    },
    u_time: {
      type: 'f',
      value: 0.0,
    },
    u_mouse: { value: { x: 0, y: 0 } },
    u_data_arr: { type: `float[${meshSegments}]`, value: dataArray },
    u_amplitude: { value: 2.0 },
  };

  // Mouse interaction variables
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let mouseWorldPos = new THREE.Vector3();
  let planeMesh: THREE.Points;

  function setupEvents() {
    const canvasContainer = document.getElementById(
      'webgl',
    ) as HTMLCanvasElement;

    // Handle file upload
    const fileInput = document.getElementById('fileIn');
    fileInput?.addEventListener('change', async function (event) {
      const el = event.target as HTMLInputElement;
      if (el && el.files) {
        const file = el.files[0];

        // Use AudioBridge if Music system is initialized
        if (musicApp) {
          const bridge = musicApp.getAudioBridge();
          bridge.loadFile(file);
        } else {
          // Fallback to original behavior
          audio.src = URL.createObjectURL(file);
          audio.load();
        }
      }
    });

    // Setup audio context when file is loaded
    audio.onloadeddata = () => {
      setupAudioContext();
    };

    audio.addEventListener('play', () => {
      // controls.autoRotate = true;
      audioContext.resume();
      audio.play();
    });

    audio.addEventListener('pause', () => {
      controls.autoRotate = false;
    });

    canvasContainer.addEventListener('mousemove', (event) => {
      uniforms.u_mouse.value.x = event.clientX;
      uniforms.u_mouse.value.y = event.clientY;

      // Update raycaster for 3D mouse position
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Raycast to a plane at y=0 to get world position
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -8);
      raycaster.ray.intersectPlane(plane, mouseWorldPos);
    });

    const loadDefaultButton = document.getElementById('load-default');
    loadDefaultButton?.addEventListener('click', () => {
      loadDefaultSong();
    });

    // NEW: Hook up UI file upload to AudioBridge
    const vizFileInput = document.getElementById('viz-file-input');
    vizFileInput?.addEventListener('change', async function (event) {
      const el = event.target as HTMLInputElement;
      if (el && el.files && musicApp) {
        const file = el.files[0];
        const bridge = musicApp.getAudioBridge();
        bridge.loadFile(file);
        musicApp.getActions().setPlaying(true);
      }
    });

    // NEW: Hook up UI load sample to AudioBridge
    const vizLoadSample = document.getElementById('viz-load-sample');
    vizLoadSample?.addEventListener('click', () => {
      if (musicApp) {
        const bridge = musicApp.getAudioBridge();
        bridge.loadUrl('./song.mp3');
        musicApp.getActions().setPlaying(true);
      } else {
        loadDefaultSong();
      }
    });

    // Update canvas if window is resized
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.position.set(0, 40, 40);
    });
  }

  // play
  function init() {
    audio.controls = true;

    const geometry = new THREE.PlaneGeometry(
      meshSegments / 2,
      meshSegments / 2,
      meshSegments,
      meshSegments,
    );

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader,
      fragmentShader,
      wireframe: true,
      blending: THREE.AdditiveBlending,
    });

    planeMesh = new THREE.Points(geometry, material);
    // const planeMesh = new THREE.Mesh(geometry, material);
    planeMesh.rotation.x = Math.PI / 2;
    planeMesh.position.y = 8;
    planeMesh.scale.x *= 2;
    planeMesh.scale.y *= 2;
    scene.add(planeMesh);

    render();
  }

  function setupAudioContext() {
    if (audioContext) return; // Already initialized

    audioContext = new window.AudioContext();

    // exposes audio time and frequency data
    analyser = audioContext.createAnalyser();
    analyser.fftSize = meshSegments * 4; // sampling rate

    // array holding 8-bit integers representing frequencies
    // analyser.frequencyBinCount is equal to fftSize / 2
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    // Initialize Music System
    // The AudioBridge will handle connecting the audio element to the analyser
    initializeMusicSystem();
  }

  // Initialize Music System
  async function initializeMusicSystem() {
    try {
      console.log('Initializing Music System...');
      musicApp = new MusicApp(audioContext, analyser, audio);
      await musicApp.initialize();
      console.log('Music System ready!');
    } catch (error) {
      console.error('Failed to initialize Music System:', error);
      // Continue without music features
    }
  }

  function render() {
    // Check if audio is playing
    const isPlaying = !audio.paused && audio.currentTime > 0;

    if (isPlaying) {
      // PLAYING: Use audio data (current behavior)
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      }

      // Animate camera when playing
      cameraPole.rotateY(0.001);
      cameraPole.rotateZ(0.001);
      cameraPole.position.x = -50 * Math.sin(audio.currentTime / 10);
      cameraPole.position.z = 25 * Math.sin(audio.currentTime / 15);
      cameraPole.position.y = 5 * (Math.sin(audio.currentTime / 10) + 1);
    } else {
      // NOT PLAYING: Use mouse interaction
      // Create wave effect based on distance from mouse position
      const halfSegments = meshSegments / 2;

      for (let i = 0; i < dataArray.length; i++) {
        // Map index to position in the mesh grid
        // The shader uses positions from -halfSegments to +halfSegments
        const gridSize = 64; // Match shader's data array size
        const x = (i % gridSize) - (gridSize / 2);
        const y = Math.floor(i / gridSize) - (gridSize / 2);

        // Calculate distance from mouse world position
        // Account for mesh scaling (scale.x *= 2, scale.y *= 2)
        const dx = (x * 1.5) - mouseWorldPos.x;
        const dy = (y * 1.5) - mouseWorldPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Create a falloff effect - closer to mouse = higher value
        const maxDistance = 30;
        const falloff = Math.max(0, 1 - (distance / maxDistance));

        // Set data value based on proximity (0-255 range like audio data)
        // Use exponential falloff for sharper effect
        dataArray[i] = Math.floor(Math.pow(falloff, 1.5) * 255);
      }
    }

    // Update uniforms
    uniforms.u_time.value = clock.getElapsedTime();
    uniforms.u_data_arr.value = dataArray;

    controls.update();
    // renderer.render(scene, camera);
    composer.render();
    requestAnimationFrame(render);
  }

  function loadDefaultSong() {
    if (musicApp) {
      const bridge = musicApp.getAudioBridge();
      bridge.loadUrl('./song.mp3');
    } else {
      audio.src = './song.mp3';
      audio.load();
    }
  }

  function postProcessing() {
    renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3,
      0.5,
      0.01,
    );

    composer.addPass(renderScene);
    composer.addPass(bloomPass);
  }

  setupEvents();
  postProcessing();
  init();

  // Initialize audio context immediately to load Music UI
  setupAudioContext();
};

App();
