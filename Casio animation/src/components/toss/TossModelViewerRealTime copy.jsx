import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// --- 1. INITIAL CONFIGURATION ---
const GLB_PATH = "/SingleCoinToss.glb";

const INITIAL_CONFIG = [
  {
    id: 1,
    range: [0.0, 2.0],
    repeats: 1,
    speed: 0.5,
    objectPosition: [-1.4, 0, 0],
    cameraConfig: { position: [-3.5, 6.3, -0.18], fov: 15 },
  },
  {
    id: 2,
    range: [2.0, 5],
    repeats: 1,
    speed: 0.5,
    objectPosition: [-1.4, 0, 0],
    cameraConfig: { position: [-3.5, 6.3, -0.18], fov: 15 },
  },
];

// --- 2. CAMERA HANDLER ---
const CameraHandler = ({ config }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (!config) return;

    // console.log("📸 Updating Camera:", config.position);

    // Update Position
    camera.position.set(
      config.position[0],
      config.position[1],
      config.position[2]
    );

    // Update FOV
    camera.fov = config.fov;
    camera.updateProjectionMatrix();
  }, [config]); // Dependency ensures update when State Reference changes

  return null;
};

// --- 3. MODEL COMPONENT ---
const Model = ({
  url,
  isPlaying,
  setIsPlaying,
  partIndex,
  setPartIndex,
  config,
  allParts,
}) => {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions, names } = useAnimations(animations, group);

  const loopCounter = useRef(0);
  const masterActionName = useRef(null);

  // A. INIT
  useEffect(() => {
    if (names.length === 0) return;
    let longestDuration = 0;
    let longestName = names[0];

    names.forEach((name) => {
      const clip = animations.find((a) => a.name === name);
      if (clip.duration > longestDuration) {
        longestDuration = clip.duration;
        longestName = name;
      }
      const action = actions[name];
      action.reset().play();
      action.paused = true;
    });
    masterActionName.current = longestName;
    if (actions[longestName]) actions[longestName].time = allParts[0].range[0];
  }, [names, actions, animations, allParts]);

  // B. PLAY/PAUSE
  useEffect(() => {
    names.forEach((name) => {
      if (actions[name]) actions[name].paused = !isPlaying;
    });
  }, [isPlaying, actions, names]);

  // C. PART SWITCH
  useEffect(() => {
    if (config) {
      loopCounter.current = 0;
      names.forEach((name) => {
        if (actions[name]) actions[name].time = config.range[0];
      });
    }
  }, [partIndex, actions, names]);

  // D. GAME LOOP
  useFrame(() => {
    if (!masterActionName.current || !isPlaying || !config) return;
    const driver = actions[masterActionName.current];
    names.forEach((name) => {
      if (actions[name]) actions[name].timeScale = config.speed;
    });

    if (driver.time >= config.range[1]) {
      if (loopCounter.current < config.repeats - 1) {
        loopCounter.current += 1;
        names.forEach((name) => (actions[name].time = config.range[0]));
      } else {
        const nextIndex = partIndex + 1;
        if (nextIndex < allParts.length) {
          setPartIndex(nextIndex);
        } else {
          setIsPlaying(false);
          names.forEach((name) => {
            actions[name].paused = true;
            actions[name].time = config.range[1];
          });
        }
      }
    }
  });

  return (
    <primitive
      ref={group}
      object={scene}
      scale={2}
      position={config.objectPosition}
    />
  );
};

// --- 4. MAIN COMPONENT ---
const AnimationPlayer = () => {
  const [animationParts, setAnimationParts] = useState(INITIAL_CONFIG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [partIndex, setPartIndex] = useState(0);

  // --- FIX: DEEP COPY UPDATE LOGIC ---
  const updateConfig = (field, subField, value, index = 0) => {
    setAnimationParts((prevParts) => {
      // 1. Deep Clone the Array
      const newParts = [...prevParts];

      // 2. Deep Clone the Active Part
      const activePart = {
        ...newParts[partIndex],
        cameraConfig: { ...newParts[partIndex].cameraConfig }, // Clone Camera Object
        objectPosition: [...newParts[partIndex].objectPosition], // Clone Object Position Array
      };

      if (field === "cameraConfig") {
        if (subField === "position") {
          // Clone the position array specifically
          const newPos = [...activePart.cameraConfig.position];
          newPos[index] = parseFloat(value);
          activePart.cameraConfig.position = newPos;
        } else {
          activePart.cameraConfig[subField] = parseFloat(value);
        }
      } else if (field === "objectPosition") {
        activePart.objectPosition[index] = parseFloat(value);
      }

      newParts[partIndex] = activePart;
      return newParts; // Return NEW reference, triggering re-render
    });
  };

  const currentConfig = animationParts[partIndex];

  const handleTogglePlay = () => {
    if (!isPlaying && partIndex === animationParts.length - 1) {
      setPartIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.playerContainer}>
        <div style={styles.canvasWrapper}>
          <Canvas>
            <ambientLight intensity={2} />
            <directionalLight position={[5, 10, 5]} intensity={1} />

            <Model
              url={GLB_PATH}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              partIndex={partIndex}
              setPartIndex={setPartIndex}
              config={currentConfig}
              allParts={animationParts}
            />

            <CameraHandler config={currentConfig.cameraConfig} />
            <OrbitControls makeDefault />
          </Canvas>
        </div>

        <div style={styles.controlsOverlay}>
          <button onClick={handleTogglePlay} style={styles.playButton}>
            {partIndex === animationParts.length - 1 && !isPlaying
              ? "REPLAY ↻"
              : isPlaying
              ? "PAUSE ⏸"
              : "PLAY ▶"}
          </button>
          <div style={styles.badge}>Active: Part {partIndex + 1}</div>
        </div>
      </div>

      {/* FORM UI */}
      <div style={styles.formContainer}>
        <h3>⚙️ Config (Part {partIndex + 1})</h3>

        <div style={styles.section}>
          <h4>📷 Camera Position</h4>
          <div style={styles.row}>
            <label>X:</label>
            <input
              type="number"
              step="0.5"
              value={currentConfig.cameraConfig.position[0]}
              onChange={(e) =>
                updateConfig("cameraConfig", "position", e.target.value, 0)
              }
            />
          </div>
          <div style={styles.row}>
            <label>Y:</label>
            <input
              type="number"
              step="0.5"
              value={currentConfig.cameraConfig.position[1]}
              onChange={(e) =>
                updateConfig("cameraConfig", "position", e.target.value, 1)
              }
            />
          </div>
          <div style={styles.row}>
            <label>Z:</label>
            <input
              type="number"
              step="0.5"
              value={currentConfig.cameraConfig.position[2]}
              onChange={(e) =>
                updateConfig("cameraConfig", "position", e.target.value, 2)
              }
            />
          </div>

          <h4>👁 Camera FOV</h4>
          <div style={styles.row}>
            <input
              type="range"
              min="10"
              max="100"
              value={currentConfig.cameraConfig.fov}
              onChange={(e) =>
                updateConfig("cameraConfig", "fov", e.target.value)
              }
            />
            <span>{currentConfig.cameraConfig.fov}</span>
          </div>
        </div>

        <hr style={{ borderColor: "#ddd", margin: "15px 0" }} />

        <div style={styles.section}>
          <h4>📦 Object Position</h4>
          <div style={styles.row}>
            <label>X:</label>
            <input
              type="number"
              step="0.1"
              value={currentConfig.objectPosition[0]}
              onChange={(e) =>
                updateConfig("objectPosition", null, e.target.value, 0)
              }
            />
          </div>
          <div style={styles.row}>
            <label>Y:</label>
            <input
              type="number"
              step="0.1"
              value={currentConfig.objectPosition[1]}
              onChange={(e) =>
                updateConfig("objectPosition", null, e.target.value, 1)
              }
            />
          </div>
          <div style={styles.row}>
            <label>Z:</label>
            <input
              type="number"
              step="0.1"
              value={currentConfig.objectPosition[2]}
              onChange={(e) =>
                updateConfig("objectPosition", null, e.target.value, 2)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    width: "100vw",
    margin: "20px auto",
    fontFamily: "sans-serif",
  },
  playerContainer: {
    flex: "2 1 1600px",
    position: "relative",
    aspectRatio: "2 / 1",
    backgroundColor: "#ccc",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid #999",
  },
  canvasWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  controlsOverlay: {
    position: "absolute",
    bottom: "20px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    zIndex: 10,
    pointerEvents: "none",
  },
  playButton: {
    pointerEvents: "auto",
    padding: "10px 30px",
    fontSize: "16px",
    fontWeight: "bold",
    color: "white",
    backgroundColor: "#222",
    border: "2px solid #555",
    borderRadius: "30px",
    cursor: "pointer",
    minWidth: "140px",
  },
  badge: {
    color: "#000",
    fontSize: "12px",
    fontWeight: "bold",
    background: "rgba(255,255,255,0.5)",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  formContainer: {
    flex: "1 1 300px",
    backgroundColor: "#f9f9f9",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #ddd",
    maxHeight: "450px",
    overflowY: "auto",
  },
  section: { marginBottom: "10px" },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
  },
};

export default AnimationPlayer;
