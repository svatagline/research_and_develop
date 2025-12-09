import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
// --- BLINK: Import useState ---
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- ANIMATION CONFIGURATION ---
const standPose = {
  id: 0,
  start: 0,
  end: 2350,
  repeats: 1,
  speed: 0.3,
  cameraPosition: [0, -0.47, 2.55],
  cameraFOV: 40,
  objectPosition: [-0.2, -0.8, 0],
  objectRotation: [0, 0, 0],
  objectScale: [1, 1, 1],
  lightPosition: [10, 15, 8],
};

const ANIMATION_PARTS = [
  {
    ...standPose,
    id: 0,
    repeats: 2,
  },
  {
    id: 1,
    start: 3001,
    end: 4000,
    repeats: 1,
    speed: 0.3,
    cameraPosition: [0, -0.47, 2.55],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.8, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 15, 8],
  },
  {
    id: 2,
    start: 4001,
    end: 4600,
    repeats: 10,
    speed: 1,
    cameraPosition: [0, -0.47, 2.55],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.8, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 15, 8],
  },
  {
    id: 3,
    start: 4600,
    end: 5500,
    repeats: 1,
    speed: 0.3,
    cameraPosition: [0, -0.47, 2.55],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.8, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 15, 8],
  },
  {
    ...standPose,
    id: 4,
    repeats: 2,
  },
  // {

  //   id: 4,
  //   start: 0,
  //   end: 3000,
  //   repeats: 1,
  //   speed: 0.05,
  //   cameraPosition: [0, -0.47, 2.55],
  //   cameraFOV: 40,
  //   objectPosition: [-0.2, -0.8, 0],
  //   objectRotation: [0, 0, 0],
  //   objectScale: [1, 1, 1],
  //   lightPosition: [10, 15, 8],
  // },

  {
    id: 5,
    start: 6000,
    end: 9000,
    repeats: 1,
    speed: 0.2,
    cameraPosition: [0, 1.1, 0],
    cameraFOV: 50,
    objectPosition: [-0.1, 0, -0.1],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 15],
  },
  {
    id: 6,
    start: 9000,
    end: 11000,
    repeats: 1,
    speed: 0.5,
    cameraPosition: [0, 1.1, 0],
    cameraFOV: 50,
    objectPosition: [-0.1, 0, -0.1],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 15],
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

  // State to hold the eyelid mesh
  const [eyelidMesh, setEyelidMesh] = useState(null);

  // Helper to get all valid actions
  const allActions = actions
    ? Object.values(actions).filter((action) => action)
    : [];
  const masterAction = allActions.length > 0 ? allActions[0] : null;

  // Fix for skinned mesh position AND find the eyelid
  useEffect(() => {
    if (scene) {
      let foundEyelid = null;
      // let foundRightHair = null;
      scene.traverse((object) => {
        // Skinned mesh fix
        if (object.isSkinnedMesh) {
          object.bind(object.skeleton, object.bindMatrix);
          object.skeleton.pose();
        }

        // Find the eyelid mesh
        if (!foundEyelid && object.name === "eyelid") {
          console.log("Found eyelid object:", object);
          foundEyelid = object;
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
    if (!masterAction) return;

    const initialPart = animationParts[0];

    // --- Initial Scene Setup (Camera, Model Position, etc.) ---
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
      // CRITICAL: Set initial time based on config
      action.time = initialPart.start / 1000;
      action.play().paused = true;
    });

    // Reset sequence state
    setCurrentPartIndex(0);
    setCurrentPartRepeats(0);
  }, [masterAction, camera, animationParts]);

  // This effect reacts to the play/pause button toggle
  useEffect(() => {
    if (!masterAction) return;
    const currentPart = animationParts[currentPartIndex];

    // Play/Pause ALL actions
    allActions.forEach((action) => {
      action.paused = !isPlaying;
    });

    // Control the mixer's time scale
    mixer.timeScale = isPlaying ? currentPart.speed : 0;
  }, [isPlaying, masterAction, mixer, currentPartIndex, animationParts]);

  // This is the core update loop
  useFrame((state, delta) => {
    if (!masterAction) return;

    const currentPart = animationParts[currentPartIndex];
    if (!currentPart) return;

    // Control speed via mixer.timeScale (handles playing and paused state)
    if (isPlaying) {
      mixer.timeScale = currentPart.speed;
    } else {
      mixer.timeScale = 0;
    }
    mixer.update(delta); // Updates time for ALL actions

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
      if (eyelidMesh) {
        const animTimeSec = masterAction.time;
        // Priority 1: Force SHOW period (Part ID 2)
        if (currentPartIndex === 2) {
          eyelidMesh.visible = true;
        } else if (currentPartIndex > 2) {
          eyelidMesh.visible = false;
        } else {
          // Priority 2: Repeating blink for all other parts
          const cycleDuration = 2.0;
          const blinkDuration = 0.02;
          const timeInCycle = animTimeSec % cycleDuration;
          if (currentPartIndex == 2) {
            eyelidMesh.visible = timeInCycle < blinkDuration;
          }
        }
      }
      // --- BLINK: LOGIC END ---

      // Check if we've reached the end of the current part
      if (currentTimeMs >= segmentEndMs) {
        // --- REPEAT LOGIC ---
        if (currentPartRepeats < currentPart.repeats - 1) {
          setCurrentPartRepeats((prev) => prev + 1);
          // Apply reset to ALL actions for synchronized repeat
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

          const nextPart = animationParts[nextPartIndex];
          // Apply reset to ALL actions for synchronized transition
          allActions.forEach((action) => {
            action.reset();
            action.time = nextPart.start / 1000;
            action.paused = false;
            action.play();
          });
        }
        // --- STOP LOGIC ---
        else {
          // End of the entire sequence
          setIsPlaying(false);
          const initialPart = animationParts[0];

          // Reset state for the next time 'Play' is clicked
          setCurrentPartIndex(0);
          setCurrentPartRepeats(0);

          if (eyelidMesh) eyelidMesh.visible = false;

          // Ensure ALL actions are reset to the beginning of the sequence
          allActions.forEach((action) => {
            action.time = initialPart.start / 1000;
            action.paused = true;
          });
        }
      }
    }
  });

  return (
    <>
      <directionalLight ref={light} intensity={5.5} />
      <primitive object={scene} ref={group} dispose={null} />
    </>
  );
}

// ----------------------------------------------------------------------
// --- Main App Component ---
// ----------------------------------------------------------------------
export default function GirlAnimation() {
  const GLB_PATH = "girlAnimation/2D ANIMATION RESET.glb";
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        background: "#111827",
        color: "white",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ fontWeight: 600, fontSize: "28px", margin: "0 0 16px 0" }}>
        Animation Preview
      </h1>
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          height: "70vh",
          background: "#1F2937",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Canvas>
          <ambientLight intensity={1.8} />
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
