import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
// --- BLINK: Import useState ---
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- ANIMATION CONFIGURATION ---
// (Your configuration remains the same)
const ANIMATION_PARTS = [
  // ... (rest of your ANIMATION_PARTS array)
  {
    id: 1,
    start: 1,
    end: 7000,
    repeats: 1,
    speed: 0.5,
    cameraPosition: [0, 2.1, 0],
    cameraFOV: 50,
    objectPosition: [0, 1, 0.2],
    objectRotation: [-0.1, 1.6, -0.3],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
  {
    id: 2,
    start: 7000,
    end: 8950,
    repeats: 1,
    speed: 0.5,
    cameraPosition: [0, 1.7, 0],
    cameraFOV: 50,
    objectPosition: [0, 0.8, 0.1],
    objectRotation: [0, 1.7, 0],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
  {
    id: 3,
    start: 8950,
    end: 9000,
    repeats: 1,
    speed: 0.03,
    cameraPosition: [0, 2.1, 0],
    cameraFOV: 50,
    objectPosition: [0, 1, 0.2],
    objectRotation: [-0.1, 1.6, -0.3],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
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

  // --- NEW: State to hold references for the dynamically hidden meshes ---
  const [meshReferences, setMeshReferences] = useState({});

  // Fix for skinned mesh position AND find the eyelid AND the dynamic meshes
  useEffect(() => {
    if (scene) {
      let foundEyelid = null;
      const refs = {};

      // The names we need to find and store
      const targetMeshNames = [
        "toss lower close hand",
        "first fingure",
        "second fingure",
        "toss lower open hand",
      ];

      scene.traverse((object) => {
        // Skinned mesh fix
        if (object.isSkinnedMesh) {
          object.bind(object.skeleton, object.bindMatrix);
          object.skeleton.pose();
        }

        // --- BLINK: Find the eyelid mesh ---
        if (!foundEyelid && object.name === "eyelid") {
          console.log("Found eyelid object:", object);
          foundEyelid = object;
          object.visible = false;
        }

        // --- NEW: Find and store the target meshes ---
        if (targetMeshNames.includes(object.name)) {
          console.log(`Found dynamic mesh: ${object.name}`);
          // Store the object reference keyed by its name
          refs[object.name] = object;
          // IMPORTANT: Start all these meshes as VISIBLE (default state)
          object.visible = true;
        }
      });

      if (foundEyelid) {
        setEyelidMesh(foundEyelid);
      } else {
        console.warn(
          "Could not find mesh with name 'eyelid'. Blink animation will not play."
        );
      }

      // Store all found dynamic mesh references
      setMeshReferences(refs);
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

    // --- NEW: Dynamic Mesh Visibility Logic ---
    if (Object.keys(meshReferences).length > 0) {
      const {
        "toss lower close hand": closeHand,
        "first fingure": firstFingure,
        "second fingure": secondFingure,
        "toss lower open hand": openHand,
      } = meshReferences;

      // Reset visibility to true before applying phase-specific rules
      // (This makes sure that parts not mentioned in the current phase are visible)
      if (closeHand) closeHand.visible = true;
      if (firstFingure) firstFingure.visible = true;
      if (secondFingure) secondFingure.visible = true;
      if (openHand) openHand.visible = true;

      if (currentPart.id === 1) {
        // if ANIMATION_PART id = 1 hide "toss lower close hand" named mesh
        if (closeHand) {
          closeHand.visible = false;
        }
      } else if (currentPart.id === 2) {
        // if ANIMATION_PARTS id = 2 hide "first fingure","second fingure","toss lower open hand" named mesh
        if (firstFingure) {
          firstFingure.visible = false;
        }
        if (secondFingure) {
          secondFingure.visible = false;
        }
        if (openHand) {
          openHand.visible = false;
        }
      }
      // For any other part (e.g., id=3), all meshes will remain visible
      // because they were reset to `true` at the start of this block.
    }
    // --- END Dynamic Mesh Visibility Logic ---

    // Only run the sequencing logic if we are playing
    if (isPlaying) {
      const currentTimeMs = masterAction.time * 1000;
      const segmentEndMs = currentPart.end;
      const isLastPartInConfig = currentPartIndex === animationParts.length - 1;

      // --- BLINK: LOGIC START (Your existing blink logic) ---
      if (eyelidMesh) {
        const animTimeSec = masterAction.time;

        if (currentPart.id === 2) {
          eyelidMesh.visible = true;
        } else {
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
          // --- NEW: Ensure all dynamic meshes are VISIBLE when stopped/reset ---
          Object.values(meshReferences).forEach((mesh) => {
            if (mesh) mesh.visible = true;
          });
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
// --- Main App Component --- (No changes needed here)
// ----------------------------------------------------------------------
export default function TossModelViewerRealTime() {
  // ... (rest of your component)
  // ... (rest of your component)
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
