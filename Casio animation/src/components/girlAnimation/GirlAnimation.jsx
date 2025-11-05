import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- ANIMATION CONFIGURATION ---
// I'm using your exact configuration
const ANIMATION_PARTS = [
  {
    id: 0,
    start: 0,
    end: 1500,
    repeats: 1,
    speed: 0.1,
    cameraPosition: [0, -0.47, 2.55],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.8, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },
  {
    id: 1,
    start: 2001,
    end: 2700,
    repeats: 1,
    speed: 0.05,
    cameraPosition: [0, -0.47, 2.55],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.8, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },
  {
    id: 2,
    start: 2700,
    end: 3150,
    repeats: 10,
    speed: 0.5,
    cameraPosition: [0, -0.47, 2.55],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.8, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },
  {
    id: 3,
    start: 3150,
    end: 3260,
    repeats: 1,
    speed: 0.05,
    cameraPosition: [0, -0.47, 2.55],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.8, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  }, 
   
  {
    id: 4,
    start: 3261,
    end: 4005,
    repeats: 1,
    speed: 0.2,
    cameraPosition: [0, 1.1, 0],
    cameraFOV: 50,
    objectPosition: [-0.1, 0, -0.1],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
  {
    id: 5,
    start: 4006,
    end: 7000,
    repeats: 1,
    speed: 0.5,
    cameraPosition: [0, 1.1, 0],
    cameraFOV: 50,
    objectPosition: [-0.1, 0, -0.1],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
];

// --- Model Component ---
// This component now only handles loading and playing the animation sequence.
function Model({ modelPath, animationParts, isPlaying, setIsPlaying }) {
  const group = useRef();
  const light = useRef();
  const { scene, animations } = useGLTF(modelPath);
  
  // --- FIX ---
  // Pass `animations || []` to useAnimations. 
  // This prevents an error if `animations` is undefined for a render pass
  // before Suspense has fully managed the async loading.
  const { actions, mixer } = useAnimations(animations || [], group);
  
  const { camera } = useThree();

  // Internal state for managing the sequence
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentPartRepeats, setCurrentPartRepeats] = useState(0);

  // Fix for skinned mesh position (from your original code)
  useEffect(() => {
    if (scene) {
      scene.traverse((object) => {
        if (object.isSkinnedMesh) {
          object.bind(object.skeleton, object.bindMatrix);
          object.skeleton.pose();
        }
      });
    }
  }, [scene]);

  // This effect runs once to set up the scene and animations
  useEffect(() => {
    if (!actions || !mixer) return;

    const allActions = Object.values(actions).filter((action) => action);
    if (allActions.length === 0) return;
    
    // --- Initial Scene Setup (Camera, Model Position, etc.) ---
    const initialPart = animationParts[0];
    camera.position.set(...initialPart.cameraPosition);
    camera.fov = initialPart.cameraFOV;
    if (group.current) {
      group.current.position.set(...initialPart.objectPosition);
      group.current.rotation.set(...initialPart.objectRotation);
      group.current.scale.set(...(initialPart.objectScale || [1, 1, 1]));
    }
    if (light.current) {
      light.current.position.set(...initialPart.lightPosition);
    }
    camera.updateProjectionMatrix();

    // Setup all actions
    allActions.forEach((action) => {
      action.loop = THREE.LoopOnce;
      action.clampWhenFinished = true;
      // Set initial time to the start of the first part
      action.time = animationParts[0].start / 1000;
      // Play the action but keep it paused, ready to go
      action.play().paused = true;
    });

    // Reset sequence state
    setCurrentPartIndex(0);
    setCurrentPartRepeats(0);

  }, [actions, mixer, camera, animationParts]); // Run when actions are ready

  // --- FIX ---
  // This effect reacts to the play/pause button toggle (the `isPlaying` prop)
  useEffect(() => {
    if (!actions) return;
    const allActions = Object.values(actions).filter((action) => action);

    // When isPlaying changes, update the 'paused' state of all actions
    allActions.forEach((action) => {
      // If we are "playing", the action should NOT be paused.
      action.paused = !isPlaying;
    });

  }, [isPlaying, actions]); // Runs whenever isPlaying or actions change

  // This is the core update loop
  useFrame((state, delta) => {
    if (!actions || !mixer) return;

    const allActions = Object.values(actions).filter((action) => action);
    const masterAction = allActions[0];
    if (!masterAction) return;

    const currentPart = animationParts[currentPartIndex];
    if (!currentPart) return;

    // Control speed via mixer.timeScale
    // If isPlaying is false, timeScale is 0, pausing the animation.
    mixer.timeScale = isPlaying ? currentPart.speed : 0;
    mixer.update(delta);

    // --- Camera/Object Lerping ---
    // This smoothly moves the camera and object to the target positions
    // for the current animation part.
    const interpolationFactor = 0.05;
    camera.position.lerp(
      new THREE.Vector3(...currentPart.cameraPosition),
      interpolationFactor
    );
    camera.fov += (currentPart.cameraFOV - camera.fov) * interpolationFactor;
    camera.updateProjectionMatrix();
    if (light.current) {
      light.current.position.lerp(
        new THREE.Vector3(...currentPart.lightPosition),
        interpolationFactor
      );
    }
    if (group.current) {
      group.current.position.lerp(
        new THREE.Vector3(...currentPart.objectPosition),
        interpolationFactor
      );
      const targetRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...currentPart.objectRotation)
      );
      group.current.quaternion.slerp(targetRotation, interpolationFactor);
      const targetScale = new THREE.Vector3(
        ...(currentPart.objectScale || [1, 1, 1])
      );
      group.current.scale.lerp(targetScale, interpolationFactor);
    }
    // --- End Lerping ---


    // Only run the sequencing logic if we are playing
    if (isPlaying) {
      const currentTimeMs = masterAction.time * 1000;
      const segmentEndMs = currentPart.end;
      const isLastPartInConfig = currentPartIndex === animationParts.length - 1;

      // Check if we've reached the end of the current part
      if (currentTimeMs >= segmentEndMs) {
        
        // --- REPEAT LOGIC ---
        if (currentPartRepeats < currentPart.repeats - 1) {
          setCurrentPartRepeats((prev) => prev + 1);
          allActions.forEach((action) => {
            action.reset();
            action.time = currentPart.start / 1000;
            action.paused = false;
            action.play();
          });
        } 
        // --- TRANSITION LOGIC ---
        else if (!isLastPartInConfig) {
          const nextPartIndex = currentPartIndex + 1;
          setCurrentPartIndex(nextPartIndex);
          setCurrentPartRepeats(0);
          allActions.forEach((action) => {
            action.reset();
            action.time = animationParts[nextPartIndex].start / 1000;
            action.paused = false;
            action.play();
          });
        } 
        // --- STOP LOGIC ---
        else {
          // End of the entire sequence
          setIsPlaying(false); // Tell the parent App to stop
          // Reset state for the next time 'Play' is clicked
          setCurrentPartIndex(0);
          setCurrentPartRepeats(0);
          allActions.forEach((action) => {
            // Reset time to the very beginning
            action.time = animationParts[0].start / 1000;
          });
        }
      }
    }
  });

  return (
    <>
      {/* Add a light, as the original component did */}
      <directionalLight ref={light} intensity={1.5} />
      <primitive object={scene} ref={group} dispose={null} />
    </>
  );
}

// ----------------------------------------------------------------------
// --- Main App Component ---
// ----------------------------------------------------------------------
export default function App() {
  // --- IMPORTANT ---
  // Replace this with the correct path to your GLB file
  const GLB_PATH = "girlAnimation/2D ANIMATION.glb"; 

  // Single state to control play/pause
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
      background: "#222"
    }}>
      <div style={{ width: "90%", height: "80%", background: "#000" }}>
        <Canvas>
          <ambientLight intensity={0.8} />
          <Suspense fallback={null}>
            <Model
              modelPath={GLB_PATH}
              animationParts={ANIMATION_PARTS}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying} // Pass the setter down
            />
          </Suspense>
          <OrbitControls />
        </Canvas>
      </div>
      <button
        onClick={handlePlayPause}
        style={{
          fontSize: "24px",
          padding: "15px 30px",
          marginTop: "20px",
          cursor: "pointer",
          borderRadius: "8px",
          border: "none",
          background: isPlaying ? "#f44336" : "#4CAF50", // Red when playing, Green when paused
          color: "white",
          minWidth: "150px"
        }}
      >
        {isPlaying ? "Pause ⏸" : "Play ▶"}
      </button>
    </div>
  );
}