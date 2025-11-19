import {
  OrbitControls,
  TransformControls,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- INITIAL ANIMATION CONFIGURATION ---
const INITIAL_ANIMATION_PARTS = [
  {
    id: 1,
    start: 2700,
    end: 5700, // <-- Changed from 2800 to 5700 for testing
    repeats: 1,
    speed: 0.1,
    cameraPosition: [0, -0.57, 2.55],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.8, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },

  {
    id: 2,
    start: 2801,
    end: 3150,
    repeats: 10,
    speed: 0.5,
    cameraPosition: [0, -0.57, 2.55],
    cameraFOV: 40,
    objectPosition: [-0.2, -0.8, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },
  {
    id: 3,
    start: 3050,
    end: 3080,
    repeats: 1,
    speed: 0.02,
    cameraPosition: [-0.15, 0.15, 0.09],
    cameraFOV: 50,
    objectPosition: [-0.1, 0, -0.1],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
  {
    id: 4,
    start: 3080,
    end: 4005,
    repeats: 1,
    speed: 0.2,
    cameraPosition: [0, 1.1, 0.1],
    cameraFOV: 50,
    objectPosition: [-0.1, 0, -0.1],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
  {
    id: 5,
    start: 4005,
    end: 7000,
    repeats: 1,
    speed: 0.5,
    cameraPosition: [0, 1.1, 0.1],
    cameraFOV: 50,
    objectPosition: [-0.1, 0, -0.1],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
];

const END_HOLD_TIME_MS = 200;
const ANIMATION_STATE = { INITIAL: "initial", PLAYING: "playing" };

// ----------------------------------------------------------------------
// --- Model Component ---
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// --- Model Component ---
// ----------------------------------------------------------------------
function Model({
  modelPath,
  onReady,
  onStateUpdate,
  isUserControllingCamera,
  animationParts,
  isObjectLocked,
  setIsDraggingObject,
  handlePartUpdate,
  transformMode,
  onPlaybackStateChange,
}) {
  const group = useRef();
  const light = useRef();
  const { scene, animations } = useGLTF(modelPath);
  const { actions, mixer } = useAnimations(animations, group);
  const { camera } = useThree();

  // Fix for skinned mesh position
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

  const allActions = Object.values(actions).filter((action) => action);
  const masterAction = allActions[0];

  const [sequenceState, setSequenceState] = useState(ANIMATION_STATE.INITIAL);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentPartRepeats, setCurrentPartRepeats] = useState(0);

  const setAndReportSequenceState = useCallback(
    (newState) => {
      setSequenceState(newState);
      onPlaybackStateChange?.(newState === ANIMATION_STATE.PLAYING);
    },
    [onPlaybackStateChange]
  );

  useEffect(() => {
    if (!actions || !masterAction) return;

    // --- Initial Scene Setup (Camera, Model Position, etc.) ---
    const initialPart = animationParts[0];
    camera.position.set(...initialPart.cameraPosition);
    camera.fov = initialPart.cameraFOV;
    group.current.position.set(...initialPart.objectPosition);
    group.current.rotation.set(...initialPart.objectRotation);
    group.current.scale.set(...(initialPart.objectScale || [1, 1, 1]));
    if (light.current) light.current.position.set(...initialPart.lightPosition);
    camera.updateProjectionMatrix();

    allActions.forEach((action) => {
      action.loop = THREE.LoopOnce;
      action.clampWhenFinished = true;
    });

    masterAction.time = END_HOLD_TIME_MS / 1000;

    onReady?.();

    // --- Global Controls Setup ---
    window.gltfAnimationControls = {
      startPlay: () => {
        allActions.forEach((action) => {
          action.time = animationParts[0].start / 1000;
          action.reset().play();
          action.paused = false;
        });
        setCurrentPartIndex(0);
        setCurrentPartRepeats(0);
        setAndReportSequenceState(ANIMATION_STATE.PLAYING);
      },
      stopPlay: () => {
        allActions.forEach((action) => {
          action.paused = true;
        });
        setAndReportSequenceState(ANIMATION_STATE.INITIAL);
      },
    };

    return () => {
      if (window.gltfAnimationControls) delete window.gltfAnimationControls;
      allActions.forEach((action) => action.stop());
    };
  }, [
    actions,
    masterAction,
    camera,
    onReady,
    setAndReportSequenceState,
    animationParts,
  ]);

  useFrame((state, delta) => {
    if (!mixer || !masterAction) return;

    mixer.timeScale =
      sequenceState === ANIMATION_STATE.PLAYING
        ? animationParts[currentPartIndex].speed
        : 0;
    mixer.update(delta);

    const currentPart = animationParts[currentPartIndex];
    if (!currentPart) return;

    const isLastPartInConfig = currentPartIndex === animationParts.length - 1;
    const interpolationFactor = 0.05;

    if (!isUserControllingCamera) {
      camera.position.lerp(
        new THREE.Vector3(...currentPart.cameraPosition),
        interpolationFactor
      );
      camera.fov += (currentPart.cameraFOV - camera.fov) * interpolationFactor;
      camera.updateProjectionMatrix();
      if (light.current)
        light.current.position.lerp(
          new THREE.Vector3(...currentPart.lightPosition),
          interpolationFactor
        );

      if (isObjectLocked) {
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
    }

    if (onStateUpdate) {
      const eulerRotation = new THREE.Euler().setFromQuaternion(
        group.current.quaternion,
        "YXZ"
      );
      onStateUpdate({
        target: { index: currentPartIndex, ...currentPart },
        actual: {
          cameraPos: camera.position.toArray(),
          cameraFov: camera.fov,
          objectPos: group.current.position.toArray(),
          objectRot: [eulerRotation.x, eulerRotation.y, eulerRotation.z],
          objectScale: group.current.scale.toArray(),
          lightPos: light.current
            ? light.current.position.toArray()
            : [0, 0, 0],
        },
      });
    }

    if (sequenceState === ANIMATION_STATE.PLAYING) {
      const currentTimeMs = masterAction.time * 1000;
      const segmentEndMs =
        isLastPartInConfig && currentPart.end === Infinity
          ? masterAction._clip.duration * 1000
          : currentPart.end;

      if (currentTimeMs >= segmentEndMs) {
        // --- ✨ REPEAT LOGIC FIX ---
        // This logic now fully resets all animation tracks
        if (currentPartRepeats < currentPart.repeats - 1) {
          setCurrentPartRepeats((prev) => prev + 1);
          allActions.forEach((action) => {
            action.reset(); // <-- THE FIX
            action.time = currentPart.start / 1000;
            action.paused = false; // <-- THE FIX
            action.play(); // <-- THE FIX
          });
          // --- ✨ TRANSITION LOGIC FIX ---
          // This logic also fully resets all animation tracks
        } else if (!isLastPartInConfig) {
          const nextPartIndex = currentPartIndex + 1;
          setCurrentPartIndex(nextPartIndex);
          setCurrentPartRepeats(0);
          allActions.forEach((action) => {
            action.reset(); // <-- THE FIX
            action.time = animationParts[nextPartIndex].start / 1000;
            action.paused = false; // <-- THE FIX
            action.play(); // <-- THE FIX
          });
        } else {
          // --- STOP LOGIC ---
          setAndReportSequenceState(ANIMATION_STATE.INITIAL);
          allActions.forEach(
            (action) => (action.time = END_HOLD_TIME_MS / 1000)
          );
        }
      }
    }
  });

  return (
    <>
      <directionalLight ref={light} intensity={1.5} />
      {!isObjectLocked && group.current && (
        <TransformControls
          object={group.current}
          mode={transformMode}
          onDraggingChanged={(event) => setIsDraggingObject(!!event.value)}
          onMouseUp={() => {
            if (group.current) {
              const { position, rotation, scale } = group.current;
              handlePartUpdate("objectPosition", position.toArray());
              handlePartUpdate("objectRotation", [
                rotation.x,
                rotation.y,
                rotation.z,
              ]);
              handlePartUpdate("objectScale", scale.toArray());
            }
          }}
        />
      )}
      <primitive object={scene} ref={group} dispose={null} />
    </>
  );
}

// ----------------------------------------------------------------------
// --- Helper UI Components ---
// ----------------------------------------------------------------------
const InfoDisplay = ({ label, value }) => {
  const formattedValue = Array.isArray(value)
    ? value.map((v) => v.toFixed(2)).join(", ")
    : "N/A";
  const handleCopy = () =>
    navigator.clipboard.writeText(`[${value.join(", ")}]`);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "4px 0",
        fontSize: "12px",
      }}
    >
      <span>{label}:</span>
      <code
        style={{
          background: "#333",
          padding: "2px 5px",
          borderRadius: "3px",
          flexGrow: 1,
          textAlign: "left",
          marginLeft: "10px",
        }}
      >
        [{formattedValue}]
      </code>
      <button
        onClick={handleCopy}
        style={{
          marginLeft: "5px",
          fontSize: "10px",
          padding: "2px 4px",
          cursor: "pointer",
        }}
      >
        📋
      </button>
    </div>
  );
};

const VectorInput = ({ label, value, onChange }) => {
  const handleChange = (axisIndex, eventVal) => {
    const newValue = [...(value || [0, 0, 0])];
    newValue[axisIndex] = parseFloat(eventVal) || 0;
    onChange(newValue);
  };
  return (
    <div style={{ margin: "10px 0", fontSize: "12px" }}>
      <label style={{ display: "block", marginBottom: "4px" }}>{label}</label>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {["X", "Y", "Z"].map((axis, index) => (
          <div
            key={axis}
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              marginRight: index < 2 ? "5px" : 0,
            }}
          >
            <span style={{ marginRight: "4px", color: "#aaa" }}>{axis}:</span>
            <input
              type="number"
              step="0.1"
              value={(value || [0, 0, 0])[index]}
              onChange={(e) => handleChange(index, e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#20232a",
                color: "white",
                border: "1px solid #555",
                borderRadius: "3px",
                padding: "4px",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const NumberInput = ({ label, value, onChange, step = 1, min, max }) => (
  <div style={{ margin: "10px 0", fontSize: "12px" }}>
    <label style={{ display: "block", marginBottom: "4px" }}>{label}</label>
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: "#20232a",
        color: "white",
        border: "1px solid #555",
        borderRadius: "3px",
        padding: "4px",
      }}
    />
  </div>
);

// ----------------------------------------------------------------------
// --- Main Viewer Component ---
// ----------------------------------------------------------------------
export default function ModelViewer() {
  const GLB_PATH = "girlAnimation/2D ANIMATION.glb";
  const [isReady, setIsReady] = useState(false);
  const [isUserControllingCamera, setIsUserControllingCamera] = useState(false);
  const [animationParts, setAnimationParts] = useState(INITIAL_ANIMATION_PARTS);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);

  const [isObjectLocked, setIsObjectLocked] = useState(true);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [transformMode, setTransformMode] = useState("translate");
  const [isPlaying, setIsPlaying] = useState(false);

  const [sceneState, setSceneState] = useState({
    target: { index: 0, ...INITIAL_ANIMATION_PARTS[0] },
    actual: {
      cameraPos: [0, 0, 0],
      cameraFov: 0,
      objectPos: [0, 0, 0],
      objectRot: [0, 0, 0],
      objectScale: [1, 1, 1],
      lightPos: [0, 0, 0],
    },
  });

  const handleModelReady = useCallback(() => setIsReady(true), []);
  const handleStateUpdate = useCallback((data) => setSceneState(data), []);

  const handlePlayButtonClick = useCallback(() => {
    window.gltfAnimationControls?.startPlay();
  }, []);

  const handleStopButtonClick = useCallback(() => {
    window.gltfAnimationControls?.stopPlay();
  }, []);

  const handlePartUpdate = (property, newValue) => {
    setAnimationParts((parts) =>
      parts.map((part, index) =>
        index === selectedPartIndex ? { ...part, [property]: newValue } : part
      )
    );
  };

  const selectedPart = animationParts[selectedPartIndex];

  return (
    <div>
      <div
        style={{
          display: "flex",
          width: "90vw",
          aspectRatio: "2.23",
          alignItems: "center",
          justifyContent: "space-around",
          border: "solid red 2px",
        }}
      >
        {/* CANVAS CONTAINER */}
        <Canvas>
          <ambientLight intensity={0.8} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          <Model
            modelPath={GLB_PATH}
            onReady={handleModelReady}
            onStateUpdate={handleStateUpdate}
            isUserControllingCamera={isUserControllingCamera}
            animationParts={animationParts}
            isObjectLocked={isObjectLocked}
            setIsDraggingObject={setIsDraggingObject}
            handlePartUpdate={handlePartUpdate}
            transformMode={transformMode}
            onPlaybackStateChange={setIsPlaying}
          />
          <OrbitControls
            enabled={!isDraggingObject}
            onStart={() => setIsUserControllingCamera(true)}
            onEnd={() => setIsUserControllingCamera(false)}
          />
        </Canvas>
        <div style={{ position: "absolute", bottom: "0", right: "0" }}>
          {isPlaying ? (
            <button
              onClick={handleStopButtonClick}
              style={{
                fontSize: "16px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                backgroundColor: "#DC143C",
                color: "white",
              }}
            >
              ⏹️
            </button>
          ) : (
            <button
              onClick={handlePlayButtonClick}
              disabled={!isReady}
              style={{
                fontSize: "16px",
                border: "none",
                borderRadius: "5px",
                cursor: isReady ? "pointer" : "not-allowed",
                backgroundColor: isReady ? "#4CAF50" : "#888",
                color: "white",
              }}
            >
              {isReady ? "▶️" : "..."}
            </button>
          )}
        </div>
      </div>

      {/* LEFT CONTROL PANEL */}
      <div
        style={{
          width: "350px",
          padding: "15px",
          backgroundColor: "#282c34",
          color: "white",
          overflowY: "auto",
          flexShrink: 0,
          fontFamily: "sans-serif",
        }}
      >
        <h3
          style={{
            margin: "0 0 15px 0",
            color: "#61dafb",
            textAlign: "center",
          }}
        >
          Animation Controls
        </h3>

        <div className="control-section">
          <h4 style={{ margin: "0 0 10px 0", color: "#8FBC8F" }}>
            ⚙️ Edit Animation Part
          </h4>
          <select
            value={selectedPartIndex}
            onChange={(e) => setSelectedPartIndex(parseInt(e.target.value, 10))}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#20232a",
              color: "white",
              border: "1px solid #555",
              borderRadius: "3px",
            }}
          >
            {animationParts.map((part, index) => (
              <option key={part.id} value={index}>
                Animation Part {index + 1}
              </option>
            ))}
          </select>

          {selectedPart && (
            <>
              <div
                style={{
                  border: "1px solid #555",
                  borderRadius: "4px",
                  padding: "0 10px",
                  margin: "15px 0",
                }}
              >
                <h5 style={{ margin: "10px 0", color: "#aaa" }}>
                  Playback Controls
                </h5>
                <NumberInput
                  label="Start Time (ms)"
                  value={selectedPart.start}
                  step={10}
                  onChange={(v) => handlePartUpdate("start", v)}
                />
                <NumberInput
                  label="End Time (ms)"
                  value={selectedPart.end}
                  step={10}
                  onChange={(v) => handlePartUpdate("end", v)}
                />
                <NumberInput
                  label="Repeats"
                  value={selectedPart.repeats}
                  step={1}
                  min={1}
                  onChange={(v) => handlePartUpdate("repeats", v)}
                />
                <NumberInput
                  label="Speed (0.1 - 5)"
                  value={selectedPart.speed}
                  step={0.1}
                  min={0.1}
                  max={5}
                  onChange={(v) => handlePartUpdate("speed", v)}
                />
              </div>

              <div
                style={{
                  border: "1px solid #555",
                  borderRadius: "4px",
                  padding: "0 10px",
                  margin: "15px 0",
                }}
              >
                <h5 style={{ margin: "10px 0", color: "#aaa" }}>
                  Scene Controls
                </h5>
                <VectorInput
                  label="Camera Position"
                  value={selectedPart.cameraPosition}
                  onChange={(v) => handlePartUpdate("cameraPosition", v)}
                />
                <NumberInput
                  label="Camera FOV"
                  value={selectedPart.cameraFOV}
                  onChange={(v) => handlePartUpdate("cameraFOV", v)}
                />
                <VectorInput
                  label="Object Position"
                  value={selectedPart.objectPosition}
                  onChange={(v) => handlePartUpdate("objectPosition", v)}
                />
                <VectorInput
                  label="Object Rotation"
                  value={selectedPart.objectRotation}
                  onChange={(v) => handlePartUpdate("objectRotation", v)}
                />
                <VectorInput
                  label="Object Scale"
                  value={selectedPart.objectScale}
                  onChange={(v) => handlePartUpdate("objectScale", v)}
                />
                <VectorInput
                  label="Light Position"
                  value={selectedPart.lightPosition}
                  onChange={(v) => handlePartUpdate("lightPosition", v)}
                />
              </div>
            </>
          )}

          <div
            style={{
              marginTop: "20px",
              border: "1px solid #555",
              padding: "10px",
              borderRadius: "5px",
            }}
          >
            <button
              onClick={() => setIsObjectLocked((prev) => !prev)}
              style={{
                width: "100%",
                padding: "8px",
                cursor: "pointer",
                backgroundColor: isObjectLocked ? "#D2691E" : "#2E8B57",
                color: "white",
                border: "none",
                borderRadius: "3px",
                marginBottom: "10px",
              }}
            >
              {isObjectLocked
                ? "🔓 Unlock Object Controls"
                : "🔒 Lock Object Controls"}
            </button>
            {!isObjectLocked && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {["translate", "rotate", "scale"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTransformMode(mode)}
                    style={{
                      flex: 1,
                      padding: "6px",
                      cursor: "pointer",
                      backgroundColor:
                        transformMode === mode ? "#61dafb" : "#444",
                      color: "white",
                      border: "1px solid #555",
                      textTransform: "capitalize",
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <hr style={{ borderColor: "#555", margin: "20px 0" }} />

        <div className="display-section">
          <h4 style={{ margin: "10px 0", color: "#FFD700" }}>
            📊 Actual Scene State (Part {sceneState.target.index + 1})
          </h4>
          <InfoDisplay label="Cam Pos" value={sceneState.actual.cameraPos} />
          <p style={{ margin: "4px 0", fontSize: "12px" }}>
            Cam FOV: {sceneState.actual.cameraFov.toFixed(2)}
          </p>
          <InfoDisplay label="Obj Pos" value={sceneState.actual.objectPos} />
          <InfoDisplay label="Obj Rot" value={sceneState.actual.objectRot} />
          <InfoDisplay
            label="Obj Scale"
            value={sceneState.actual.objectScale}
          />
          <InfoDisplay label="Light Pos" value={sceneState.actual.lightPos} />
        </div>

        <div style={{ marginTop: "20px" }}>
          {isPlaying ? (
            <button
              onClick={handleStopButtonClick}
              style={{
                padding: "12px 20px",
                fontSize: "16px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                backgroundColor: "#DC143C",
                color: "white",
                width: "100%",
              }}
            >
              ⏹️ Stop Animation
            </button>
          ) : (
            <button
              onClick={handlePlayButtonClick}
              disabled={!isReady}
              style={{
                padding: "12px 20px",
                fontSize: "16px",
                border: "none",
                borderRadius: "5px",
                cursor: isReady ? "pointer" : "not-allowed",
                backgroundColor: isReady ? "#4CAF50" : "#888",
                color: "white",
                width: "100%",
              }}
            >
              {isReady ? "▶️ Run Sequence" : "Loading..."}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
