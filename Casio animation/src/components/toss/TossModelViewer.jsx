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
    end: 1000,
    repeats: 1,
    speed: 0.5,
    cameraPosition: [0, 3.3, 0],
    cameraFOV: 50,
    objectPosition: [-0.1, 1, 0.2],
    objectRotation: [-0.1, 1.61, -0.3],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
  {
    id: 2,
    start: 1001,
    end: 2700,
    repeats: 1,
    speed: 0.1,
    cameraPosition: [0, 3.3, 0],
    cameraFOV: 50,
    objectPosition: [-0.1, 1, 0.2],
    objectRotation: [-0.1, 1.61, -0.3],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
];

function Model({ modelPath, animationParts, isPlaying, setIsPlaying }) {
  const group = useRef();
  const light = useRef();
  const { scene, animations } = useGLTF(modelPath);

  const { actions, mixer } = useAnimations(animations || [], group);
  const { camera } = useThree();

  // --- FIX 1: Use Refs for immediate updates in the loop ---
  const indexRef = useRef(0);
  const repeatsRef = useRef(0);

  // We keep state for UI triggers, but we won't rely on it inside useFrame
  const [currentPartIndex, setCurrentPartIndex] = useState(0);

  const [tossLowerCloseHand, setTossLowerCloseHand] = useState(null);
  const [tossLowerOpenHand, setTossLowerOpenHand] = useState(null);

  useEffect(() => {
    if (scene) {
      let tossLowerOpenHandFound = null;
      let tossLowerCloseHandFound = null;
      scene.traverse((object) => {
        if (object.isSkinnedMesh) {
          object.bind(object.skeleton, object.bindMatrix);
          object.skeleton.pose();
        }
        // Note: Ensure exact naming matches your Blender file
        if (object.userData.name === "toss lower open hand") {
          tossLowerOpenHandFound = object;
        }
        if (object.userData.name === "toss lower close hand") {
          tossLowerCloseHandFound = object;
          object.visible = false;
        }
      });
      setTossLowerOpenHand(tossLowerOpenHandFound);
      setTossLowerCloseHand(tossLowerCloseHandFound);
    }
  }, [scene]);

  // Initial Setup
  useEffect(() => {
    if (!actions || !mixer) return;
    const allActions = Object.values(actions).filter((action) => action);
    if (allActions.length === 0) return;

    const initialPart = animationParts[0];

    // Reset Refs
    indexRef.current = 0;
    repeatsRef.current = 0;
    setCurrentPartIndex(0);

    // Camera & Object Setup
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

    allActions.forEach((action) => {
      action.loop = THREE.LoopOnce;
      action.clampWhenFinished = true;
      action.time = animationParts[0].start / 1000;
      action.play().paused = true;
    });
  }, [actions, mixer, camera, animationParts]);

  // Play/Pause Toggle
  useEffect(() => {
    if (!actions) return;
    const allActions = Object.values(actions).filter((action) => action);
    allActions.forEach((action) => {
      action.paused = !isPlaying;
    });
  }, [isPlaying, actions]);

  // --- CORE LOOP ---
  useFrame((state, delta) => {
    if (!actions || !mixer) return;

    const allActions = Object.values(actions).filter((action) => action);
    const masterAction = allActions[0];
    if (!masterAction) return;

    // --- FIX 2: Read from Ref, not State ---
    const currentIndex = indexRef.current;
    const currentRepeats = repeatsRef.current;
    const currentPart = animationParts[currentIndex]; // Get config based on Ref

    if (!currentPart) return;

    // Mixer Update
    mixer.timeScale = isPlaying ? currentPart.speed : 0;
    mixer.update(delta);

    // Lerping (Camera/Position)
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
      group.current.scale.lerp(
        new THREE.Vector3(...(currentPart.objectScale || [1, 1, 1])),
        interpolationFactor
      );
    }

    // Logic
    if (isPlaying) {
      const currentTimeMs = masterAction.time * 1000;
      const segmentEndMs = currentPart.end;
      const isLastPartInConfig = currentIndex === animationParts.length - 1;

      // Debugging Log (Now this will show 1, then 2 correctly)
      console.log("Current Part ID:", currentPart.id);

      // --- Hand Visibility Logic ---
      if (currentPart.id === 1) {
        if (tossLowerCloseHand) tossLowerCloseHand.visible = false;
        if (tossLowerOpenHand) tossLowerOpenHand.visible = true;
      }
      if (currentPart.id === 2) {
        if (tossLowerCloseHand) tossLowerCloseHand.visible = true;
        if (tossLowerOpenHand) tossLowerOpenHand.visible = false;
      }

      // --- Sequence Logic ---
      if (currentTimeMs >= segmentEndMs) {
        // REPEAT LOGIC
        if (currentRepeats < currentPart.repeats - 1) {
          // Update Ref immediately
          repeatsRef.current = currentRepeats + 1;

          allActions.forEach((action) => {
            action.reset();
            action.time = currentPart.start / 1000;
            action.paused = false;
            action.play();
          });
        }
        // TRANSITION LOGIC
        else if (!isLastPartInConfig) {
          const nextIndex = currentIndex + 1;

          // --- FIX 3: Update Ref IMMEDIATELY so next frame knows we switched ---
          indexRef.current = nextIndex;
          repeatsRef.current = 0;

          // Update State (just for UI/Re-renders if needed)
          setCurrentPartIndex(nextIndex);

          allActions.forEach((action) => {
            action.reset();
            // Set time to start of NEXT part
            action.time = animationParts[nextIndex].start / 1000;
            action.paused = false;
            action.play();
          });
        }
        // STOP LOGIC
        else {
          setIsPlaying(false);
          indexRef.current = 0;
          repeatsRef.current = 0;
          setCurrentPartIndex(0);

          // Optional: Reset to start
          allActions.forEach((action) => {
            action.reset();
            action.time = animationParts[0].start / 1000;
            action.paused = true;
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
  const GLB_PATH = "SingleCoinToss.glb";
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
