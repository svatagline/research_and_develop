import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
// --- BLINK: Import useState ---
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- ANIMATION CONFIGURATION ---
// (Your configuration remains the same)
const ANIMATION_PARTS = [
  {
    id: 1,
    start: 0,
    end: 2000, // <-- Changed from 2800 to 5700 for testing
    repeats: 1,
    speed: 0.1,
    cameraPosition: [-1.65, -0.69, -0.15],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.85, -0.2],
    objectRotation: [0.04, -0.21, 1.2],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },

  {
    id: 2,
    start: 2000,
    end: 4000,
    repeats: 10,
    speed: 0.5,
    cameraPosition: [-1.65, -0.69, -0.15],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.85, -0.2],
    objectRotation: [0.04, -0.21, 1.2],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },
];

// --- Model Component ---
function Model({ modelPath, animationParts, isPlaying, setIsPlaying }) {
  const group = useRef();
  const light = useRef();
  const { scene, animations } = useGLTF(modelPath);

  const { actions, mixer } = useAnimations(animations || [], group);
  const { camera } = useThree();

  // Internal state for managing the sequence
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentPartRepeats, setCurrentPartRepeats] = useState(0);

  // --- BLINK: State to hold the eyelid mesh ---
  const [eyelidMesh, setEyelidMesh] = useState(null);

  // Fix for skinned mesh position AND find the eyelid
  useEffect(() => {
    if (scene) {
      let foundEyelid = null;
      scene.traverse((object) => {
        // Skinned mesh fix
        if (object.isSkinnedMesh) {
          object.bind(object.skeleton, object.bindMatrix);
          object.skeleton.pose();
        }

        // --- BLINK: Find the mesh by its name from Blender ---
        // --- FIX: We search for *any* object (Mesh, Group, etc.) ---
        // We also only find the *first* one to avoid conflicts
        if (!foundEyelid && object.name === "eyelid") {
          console.log("Found eyelid object:", object);
          foundEyelid = object;
          // --- BLINK: Start with the eyelid hidden ---
          object.visible = false;
        }
      });

      if (foundEyelid) {
        setEyelidMesh(foundEyelid);
      } else {
        console.warn(
          "Could not find mesh with name 'eyelid'. Blink animation will not play."
        );
      }
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
      action.time = animationParts[0].start / 1000;
      action.play().paused = true;
    });

    // Reset sequence state
    setCurrentPartIndex(0);
    setCurrentPartRepeats(0);
  }, [actions, mixer, camera, animationParts]);

  // This effect reacts to the play/pause button toggle
  useEffect(() => {
    if (!actions) return;
    const allActions = Object.values(actions).filter((action) => action);
    allActions.forEach((action) => {
      action.paused = !isPlaying;
    });
  }, [isPlaying, actions]);

  // This is the core update loop
  useFrame((state, delta) => {
    if (!actions || !mixer) return;

    const allActions = Object.values(actions).filter((action) => action);
    const masterAction = allActions[0];
    if (!masterAction) return;

    const currentPart = animationParts[currentPartIndex];
    if (!currentPart) return;

    // Control speed via mixer.timeScale
    mixer.timeScale = isPlaying ? currentPart.speed : 0;
    mixer.update(delta);

    // --- Camera/Object Lerping ---
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

      // --- BLINK: LOGIC START ---
      // NEW LOGIC: Tie visibility to the current animation part ID
      if (eyelidMesh) {
        const animTimeSec = masterAction.time; // This is the time in seconds

        // --- Priority 1: Force SHOW period (2700ms to 3150ms) ---
        // We check the ID of the current part, which is more reliable than time.
        // Your animation part with id: 2 is the 2700-3150ms segment.
        console.log("test1 currentPart.id", currentPart.id);
        if (currentPart.id === 2) {
          // If we are in the forced-SHOW period, it's always true (visible).
          eyelidMesh.visible = true;
        } else {
          // --- Priority 2: Repeating blink (only if NOT in part 2) ---
          // This logic now only runs when we are outside the 2700-3150ms window.
          const cycleDuration = 2.0;
          const blinkDuration = 0.02;
          const timeInCycle = animTimeSec % cycleDuration;
          const isRepeatingBlink = timeInCycle < blinkDuration;

          eyelidMesh.visible = isRepeatingBlink;
        }
      }
      // --- BLINK: LOGIC END ---

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
          // --- BLINK: Hide eyelid when animation stops ---
          if (eyelidMesh) eyelidMesh.visible = false;
          allActions.forEach((action) => {
            action.time = animationParts[0].start / 1000;
          });
        }
      }
    }
  });

  return (
    <>
      <directionalLight ref={light} intensity={1.5} />
      <primitive object={scene} ref={group} dispose={null} />
    </>
  );
}

// ----------------------------------------------------------------------
// --- Main App Component --- (DESIGN AND TYPO FIXES)
// ----------------------------------------------------------------------
export default function TossModelViewerRealTime() {
  // --- IMPORTANT ---
  // Replace this with the correct path to your GLB file
  const GLB_PATH = "/SingleCoinToss.glb";
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      style={{
        width: "100vw", // <-- Fixed typo, was "10Svw"
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif", // Using a cleaner font
        background: "#111827", // Dark blue-gray background
        color: "white",
        padding: "20px",
        boxSizing: "border-box", // Ensures padding doesn't break layout
      }}
    >
      <h1 style={{ fontWeight: 600, fontSize: "28px", margin: "0 0 16px 0" }}>
        Animation Preview
      </h1>
      <div
        style={{
          width: "100%",
          maxWidth: "1000px", // Set a max width for large screens
          height: "70vh", // Use viewport height
          background: "#1F2937", // Lighter gray background for canvas
          borderRadius: "16px", // Rounded corners
          overflow: "hidden", // Ensures canvas stays inside border
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* --- FIX: Re-added the missing Canvas block --- */}
        <Canvas>
          <ambientLight intensity={0.8} />
          <Suspense fallback={null}>
            <Model
              modelPath={GLB_PATH}
              animationParts={ANIMATION_PARTS}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
            />
          </Suspense>
          <OrbitControls />
        </Canvas>
      </div>
      {/* --- FIX: Moved the button to be *after* the canvas div --- */}
      <button
        onClick={handlePlayPause}
        style={{
          fontSize: "20px",
          fontWeight: 600,
          padding: "12px 24px",
          marginTop: "24px",
          cursor: "pointer",
          borderRadius: "12px",
          border: "none",
          background: isPlaying
            ? "linear-gradient(145deg, #e63946, #c32f3b)"
            : "linear-gradient(145deg, #52b788, #40916c)",
          color: "white",
          minWidth: "150px",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
        }}
        // Add hover and active states inline for simplicity
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "scale(1.03)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
      >
        {isPlaying ? "Pause ⏸" : "Play ▶"}
      </button>
    </div>
  );
}
