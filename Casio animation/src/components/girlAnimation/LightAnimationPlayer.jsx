import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- GLOBAL CONFIGURATION (Simplified) ---
// We only need the path and default settings, no complex parts array.
const DEFAULT_CONFIG = {
  // Initial camera and model settings (you can adjust these)
  cameraPosition: [0, 0.5, 3],
  cameraFOV: 40,
  objectPosition: [0, 0, 0],
  objectScale: [1, 1, 1],
  lightPosition: [10, 10, 5],
};

// --- Model Component (Simplified for Single Playback) ---
function Model({ modelPath, isPlaying, speed }) {
  const group = useRef();
  const light = useRef();
  const { scene, animations } = useGLTF(modelPath);

  const { actions, mixer } = useAnimations(animations || [], group);
  const { camera } = useThree();

  // Helper to get the main action
  const allActions = actions
    ? Object.values(actions).filter((action) => action)
    : [];
  const masterAction = allActions.length > 0 ? allActions[0] : null;

  // --- Initial Setup and Animation Start ---
  useEffect(() => {
    if (!masterAction) return;

    // --- Initial Scene Setup ---
    camera.position.set(...DEFAULT_CONFIG.cameraPosition);
    camera.fov = DEFAULT_CONFIG.cameraFOV;
    if (group.current) {
      group.current.position.set(...DEFAULT_CONFIG.objectPosition);
      group.current.scale.set(...DEFAULT_CONFIG.objectScale);
    }
    if (light.current) {
      light.current.position.set(...DEFAULT_CONFIG.lightPosition);
    }
    camera.updateProjectionMatrix();

    // Setup all actions
    allActions.forEach((action) => {
      // Set to loop infinitely, as there's no sequence end to track
      action.loop = THREE.LoopRepeat;
      action.clampWhenFinished = false; // Not needed with LoopRepeat
      action.time = 0; // Always start from 0 seconds
      action.play().paused = true;
    });

    // Set initial mixer speed
    mixer.timeScale = speed;
  }, [masterAction, camera, speed]);

  // --- Play/Pause Toggle and Speed Application ---
  useEffect(() => {
    if (!masterAction) return;

    allActions.forEach((action) => {
      // Set pause state for all actions
      action.paused = !isPlaying;
    });

    // Apply global speed to the mixer (which controls all actions)
    mixer.timeScale = speed;
  }, [isPlaying, speed, masterAction, mixer]);

  // --- Main Update Loop ---
  useFrame((state, delta) => {
    if (!mixer) return;

    // Only mixer update is necessary here, as speed is controlled in useEffect
    // If you needed camera/object lerping, it would go here, but for simplicity, we omit it.

    // If you want to allow camera controls even when paused:
    // mixer.update(isPlaying ? delta : 0);

    // If we only update when playing:
    if (isPlaying) {
      mixer.update(delta);
    }
  });

  return (
    <>
      <directionalLight ref={light} intensity={1.5} />
      {/* Use the primitive object with the ref */}
      <primitive object={scene} ref={group} dispose={null} />
    </>
  );
}

// ----------------------------------------------------------------------
// --- Main App Component ---
// ----------------------------------------------------------------------
export default function LightAnimationPlayer() {
  const GLB_PATH = "girlAnimation/2D ANIMATION.glb";

  const [isPlaying, setIsPlaying] = useState(false);
  // Default speed set to 1.0 (normal playback)
  const [speed, setSpeed] = useState(1.0);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (e) => {
    // Convert slider value (string) to number
    setSpeed(parseFloat(e.target.value));
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
        Light Animation Player
      </h1>

      {/* Canvas Container */}
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
          <ambientLight intensity={0.8} />
          <Suspense fallback={null}>
            <Model
              modelPath={GLB_PATH}
              isPlaying={isPlaying}
              speed={speed} // Pass speed prop
            />
          </Suspense>
          {/* Allow user to rotate the model */}
          <OrbitControls />
        </Canvas>
      </div>

      {/* --- Controls Section --- */}
      <div
        style={{
          display: "flex",
          gap: "30px",
          marginTop: "24px",
          alignItems: "center",
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          style={{
            fontSize: "20px",
            fontWeight: 600,
            padding: "12px 24px",
            cursor: "pointer",
            borderRadius: "12px",
            border: "none",
            background: isPlaying
              ? "linear-gradient(145deg, #e63946, #c32f3b)"
              : "linear-gradient(145deg, #52b788, #40916c)",
            color: "white",
            minWidth: "150px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            transition: "all 0.1s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
        >
          {isPlaying ? "Pause ⏸" : "Play ▶"}
        </button>

        {/* Speed Slider Control */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "10px",
            borderRadius: "8px",
            background: "#1F2937",
          }}
        >
          <label
            htmlFor="speed-slider"
            style={{ marginBottom: "8px", fontSize: "14px" }}
          >
            Playback Speed: **{speed.toFixed(2)}x**
          </label>
          <input
            id="speed-slider"
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={speed}
            onChange={handleSpeedChange}
            style={{ width: "200px" }}
          />
        </div>
      </div>
      {/* End Controls Section */}
    </div>
  );
}
