import {
    OrbitControls,
    TransformControls, // ✨ 1. Import TransformControls
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
    start: 0,
    end: 2599,
    repeats: 1,
    speed: 0.2,
    cameraPosition: [0, -0.5, 4.5],
    cameraFOV: 40,
    objectPosition: [0, -1.5, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },
  {
    id: 2,
    start: 2600,
    end: 3310,
    repeats: 5,
    speed: 0.5,
  cameraPosition: [0, -0.5, 4.5],
    cameraFOV: 40,
    objectPosition: [0, -1.5, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },
  {
    id: 3,
    start: 3281,
    end: 4100,
    repeats: 1,
    speed: 0.1,
    cameraPosition: [0, -0.5, 4.5],
    cameraFOV: 40,
    objectPosition: [0, -1.5, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [10, 10, 5],
  },
  {
    id: 4,
    start: 4100,
    end: Infinity,
    repeats: 1,
    speed: 0.1,
    cameraPosition: [0, 1.1, 0],
    cameraFOV: 50,
    objectPosition: [-0.1,  0, 0],
    objectRotation: [0, 0, 0],
    objectScale: [1, 1, 1],
    lightPosition: [0, 10, 0],
  },
];

const END_HOLD_TIME_MS = 4300;
const ANIMATION_STATE = { INITIAL: "initial", PLAYING: "playing" };

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
  onPlaybackStateChange, // ✨ 1. Receive callback to report state
}) {
  const group = useRef();
  const light = useRef();
  const { scene, animations } = useGLTF(modelPath);
  const { actions, mixer } = useAnimations(animations, group);
  const { camera } = useThree();

  const allActions = Object.values(actions).filter((action) => action);
  const masterAction = allActions[0];

  const [sequenceState, setSequenceState] = useState(ANIMATION_STATE.INITIAL);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentPartRepeats, setCurrentPartRepeats] = useState(0);

  // ✨ 2. Wrapper function to update state and notify the parent
  const setAndReportSequenceState = useCallback((newState) => {
      setSequenceState(newState);
      onPlaybackStateChange?.(newState === ANIMATION_STATE.PLAYING);
    }, [onPlaybackStateChange]);


  useEffect(() => {
    if (!actions || !masterAction) return;

    const initialPart = animationParts[0];
    camera.position.set(...initialPart.cameraPosition);
    camera.fov = initialPart.cameraFOV;
    group.current.position.set(...initialPart.objectPosition);
    group.current.rotation.set(...initialPart.objectRotation);
    group.current.scale.set(...(initialPart.objectScale || [1, 1, 1]));
    if (light.current) light.current.position.set(...initialPart.lightPosition);
    camera.updateProjectionMatrix();

    allActions.forEach((action) => {
      action.reset().play();
      action.time = END_HOLD_TIME_MS / 1000;
      action.loop = THREE.LoopOnce;
      action.clampWhenFinished = true;
    });

    onReady?.();

    // ✨ 3. Add the 'stopPlay' function to the global controls
    window.gltfAnimationControls = {
      startPlay: () => {
        allActions.forEach(
          (action) => (action.time = animationParts[0].start / 1000)
        );
        setCurrentPartIndex(0);
        setCurrentPartRepeats(0);
        setAndReportSequenceState(ANIMATION_STATE.PLAYING);
      },
      stopPlay: () => {
        setAndReportSequenceState(ANIMATION_STATE.INITIAL);
      },
    };

    return () => {
      if (window.gltfAnimationControls) delete window.gltfAnimationControls;
      allActions.forEach((action) => action.stop());
    };
  }, [actions, masterAction, camera, onReady, setAndReportSequenceState]);


  useFrame((state, delta) => {
    if (!mixer || !masterAction) return;
    
    // ... (rest of the useFrame logic is unchanged)
    
    const currentPart = animationParts[currentPartIndex];
    if (!currentPart) return;

    const isLastPartInConfig = currentPartIndex === animationParts.length - 1;
    const interpolationFactor = 0.05;

    if (!isUserControllingCamera) {
      camera.position.lerp(new THREE.Vector3(...currentPart.cameraPosition), interpolationFactor);
      camera.fov += (currentPart.cameraFOV - camera.fov) * interpolationFactor;
      camera.updateProjectionMatrix();
      if (light.current) light.current.position.lerp(new THREE.Vector3(...currentPart.lightPosition), interpolationFactor);

      if (isObjectLocked) {
        group.current.position.lerp(new THREE.Vector3(...currentPart.objectPosition), interpolationFactor);
        const targetRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...currentPart.objectRotation));
        group.current.quaternion.slerp(targetRotation, interpolationFactor);
        const targetScale = new THREE.Vector3(...(currentPart.objectScale || [1, 1, 1]));
        group.current.scale.lerp(targetScale, interpolationFactor);
      }
    }

    if (onStateUpdate) {
      const eulerRotation = new THREE.Euler().setFromQuaternion(group.current.quaternion, 'YXZ');
      onStateUpdate({
        target: { index: currentPartIndex, ...currentPart },
        actual: {
          cameraPos: camera.position.toArray(),
          cameraFov: camera.fov,
          objectPos: group.current.position.toArray(),
          objectRot: [eulerRotation.x, eulerRotation.y, eulerRotation.z],
          objectScale: group.current.scale.toArray(),
          lightPos: light.current ? light.current.position.toArray() : [0, 0, 0],
        },
      });
    }

    mixer.timeScale = sequenceState === ANIMATION_STATE.PLAYING ? currentPart.speed : 0;
    mixer.update(delta);

    if (sequenceState === ANIMATION_STATE.PLAYING) {
      const currentTimeMs = masterAction.time * 1000;
      const segmentEndMs = isLastPartInConfig && currentPart.end === Infinity ? masterAction._clip.duration * 1000 : currentPart.end;
      if (currentTimeMs >= segmentEndMs) {
        if (currentPartRepeats < currentPart.repeats - 1) {
          setCurrentPartRepeats((prev) => prev + 1);
          allActions.forEach((action) => (action.time = currentPart.start / 1000));
        } else if (!isLastPartInConfig) {
          const nextPartIndex = currentPartIndex + 1;
          setCurrentPartIndex(nextPartIndex);
          setCurrentPartRepeats(0);
          allActions.forEach((action) => (action.time = animationParts[nextPartIndex].start / 1000));
        } else {
          // ✨ 4. Use the wrapper function here as well
          setAndReportSequenceState(ANIMATION_STATE.INITIAL);
          allActions.forEach((action) => (action.time = END_HOLD_TIME_MS / 1000));
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
              handlePartUpdate("objectRotation", [rotation.x, rotation.y, rotation.z,]);
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
// --- Helper UI Components (No major changes) ---
// ----------------------------------------------------------------------
const InfoDisplay = ({ label, value }) => {
    const formattedValue = Array.isArray(value) ? value.map((v) => v.toFixed(2)).join(", ") : "N/A";
    const handleCopy = () => navigator.clipboard.writeText(`[${value.join(", ")}]`);
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0", fontSize: "12px" }}>
        <span>{label}:</span>
        <code style={{ background: "#333", padding: "2px 5px", borderRadius: "3px", flexGrow: 1, textAlign: "left", marginLeft: '10px' }}>
          [{formattedValue}]
        </code>
        <button onClick={handleCopy} style={{ marginLeft: "5px", fontSize: "10px", padding: "2px 4px", cursor: "pointer" }}> 📋 </button>
      </div>
    );
  };
  
  const VectorInput = ({ label, value, onChange }) => {
    const handleChange = (axisIndex, eventVal) => {
      const newValue = [...(value || [0,0,0])];
      newValue[axisIndex] = parseFloat(eventVal) || 0;
      onChange(newValue);
    };
    return (
      <div style={{ margin: "10px 0", fontSize: "12px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>{label}</label>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {["X", "Y", "Z"].map((axis, index) => (
            <div key={axis} style={{ display: "flex", alignItems: "center", flex: 1, marginRight: index < 2 ? '5px' : 0 }}>
              <span style={{ marginRight: "4px", color: '#aaa' }}>{axis}:</span>
              <input type="number" step="0.1" value={(value || [0,0,0])[index]} onChange={(e) => handleChange(index, e.target.value)}
                style={{ width: "100%", boxSizing: 'border-box', backgroundColor: "#20232a", color: "white", border: "1px solid #555", borderRadius: "3px", padding: '4px' }}/>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const NumberInput = ({ label, value, onChange, step = 1, min, max }) => (
      <div style={{ margin: "10px 0", fontSize: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>{label}</label>
          <input type="number" value={value} step={step} min={min} max={max} onChange={(e) => onChange(parseFloat(e.target.value))}
           style={{ width: "100%", boxSizing: 'border-box', backgroundColor: "#20232a", color: "white", border: "1px solid #555", borderRadius: "3px", padding: '4px' }}/>
      </div>
  )
  

// ----------------------------------------------------------------------
// --- Main Viewer Component ---
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// --- Main Viewer Component (Updated with Stop Button UI) ---
// ----------------------------------------------------------------------
export default function ModelViewer() {
  const GLB_PATH = "girlAnimation/girlAnimation.glb";
  const [isReady, setIsReady] = useState(false);
  const [isUserControllingCamera, setIsUserControllingCamera] = useState(false);
  const [animationParts, setAnimationParts] = useState(INITIAL_ANIMATION_PARTS);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);

  const [isObjectLocked, setIsObjectLocked] = useState(true);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [transformMode, setTransformMode] = useState("translate");
  
  // ✨ 1. Add state to track if the animation is playing
  const [isPlaying, setIsPlaying] = useState(false);

  const [sceneState, setSceneState] = useState({
    target: { index: 0, ...INITIAL_ANIMATION_PARTS[0] },
    actual: { cameraPos: [0, 0, 0], cameraFov: 0, objectPos: [0, 0, 0], objectRot: [0, 0, 0], objectScale: [1,1,1], lightPos: [0, 0, 0] },
  });

  const handleModelReady = useCallback(() => setIsReady(true), []);
  const handleStateUpdate = useCallback((data) => setSceneState(data), []);

  const handlePlayButtonClick = useCallback(() => {
    window.gltfAnimationControls?.startPlay();
  }, []);

  // ✨ 2. Handler for the new Stop button
  const handleStopButtonClick = useCallback(() => {
    window.gltfAnimationControls?.stopPlay();
  }, []);

  const handlePartUpdate = (property, newValue) => {
    setAnimationParts(parts => parts.map((part, index) =>
      index === selectedPartIndex ? { ...part, [property]: newValue } : part
    ));
  };

  const selectedPart = animationParts[selectedPartIndex];

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "space-around" }}>
      {/* LEFT CONTROL PANEL */}
      <div style={{ width: "350px", padding: "15px", backgroundColor: "#282c34", color: "white", overflowY: "auto", flexShrink: 0, fontFamily: "sans-serif" }}>
       
        {/* ... (The top part of the UI is unchanged) ... */}
        <h3 style={{ margin: "0 0 15px 0", color: "#61dafb", textAlign: 'center' }}>Animation Controls</h3>

        <div className="control-section">
          <h4 style={{ margin: "0 0 10px 0", color: "#8FBC8F" }}> ⚙️ Edit Animation Part</h4>
          <select value={selectedPartIndex} onChange={(e) => setSelectedPartIndex(parseInt(e.target.value, 10))}
            style={{ width: "100%", padding: "8px", backgroundColor: "#20232a", color: "white", border: "1px solid #555", borderRadius: "3px" }}>
            {animationParts.map((part, index) => ( <option key={part.id} value={index}> Animation Part {index + 1} </option> ))}
          </select>
          
          {selectedPart && <>
            <VectorInput label="Camera Position" value={selectedPart.cameraPosition} onChange={(v) => handlePartUpdate("cameraPosition", v)} />
            <NumberInput label="Camera FOV" value={selectedPart.cameraFOV} onChange={(v) => handlePartUpdate("cameraFOV", v)} />
            <VectorInput label="Object Position" value={selectedPart.objectPosition} onChange={(v) => handlePartUpdate("objectPosition", v)} />
            <VectorInput label="Object Rotation" value={selectedPart.objectRotation} onChange={(v) => handlePartUpdate("objectRotation", v)} />
            <VectorInput label="Object Scale" value={selectedPart.objectScale} onChange={(v) => handlePartUpdate("objectScale", v)} />
            <VectorInput label="Light Position" value={selectedPart.lightPosition} onChange={(v) => handlePartUpdate("lightPosition", v)} />
          </>}

          <div style={{ marginTop: '20px', border: '1px solid #555', padding: '10px', borderRadius: '5px' }}>
              <button onClick={() => setIsObjectLocked(prev => !prev)} style={{ width: '100%', padding: '8px', cursor: 'pointer', backgroundColor: isObjectLocked ? '#D2691E' : '#2E8B57', color: 'white', border: 'none', borderRadius: '3px', marginBottom: '10px' }}>
                {isObjectLocked ? '🔓 Unlock Object Controls' : '🔒 Lock Object Controls'}
              </button>
              {!isObjectLocked && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {['translate', 'rotate', 'scale'].map(mode => (
                    <button key={mode} onClick={() => setTransformMode(mode)} style={{ flex: 1, padding: '6px', cursor: 'pointer', backgroundColor: transformMode === mode ? '#61dafb' : '#444', color: 'white', border: '1px solid #555', textTransform: 'capitalize' }}>
                      {mode}
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>
        
        <hr style={{ borderColor: "#555", margin: "20px 0" }} />

        <div className="display-section">
          <h4 style={{ margin: "10px 0", color: "#FFD700" }}> 📊 Actual Scene State (Part {sceneState.target.index + 1})</h4>
          <InfoDisplay label="Cam Pos" value={sceneState.actual.cameraPos} />
          <p style={{ margin: "4px 0", fontSize: "12px" }}> Cam FOV: {sceneState.actual.cameraFov.toFixed(2)} </p>
          <InfoDisplay label="Obj Pos" value={sceneState.actual.objectPos} />
          <InfoDisplay label="Obj Rot" value={sceneState.actual.objectRot} />
          <InfoDisplay label="Obj Scale" value={sceneState.actual.objectScale} />
          <InfoDisplay label="Light Pos" value={sceneState.actual.lightPos} />
        </div>
        
        {/* ✨ 3. Conditionally render Play or Stop button */}
        <div style={{ marginTop: "20px" }}>
            {isPlaying ? (
                <button onClick={handleStopButtonClick} style={{ padding: "12px 20px", fontSize: "16px", border: "none", borderRadius: "5px", cursor: "pointer", backgroundColor: "#DC143C", color: "white", width: "100%" }}>
                    ⏹️ Stop Animation
                </button>
            ) : (
                <button onClick={handlePlayButtonClick} disabled={!isReady} style={{ padding: "12px 20px", fontSize: "16px", border: "none", borderRadius: "5px", cursor: isReady ? "pointer" : "not-allowed", backgroundColor: isReady ? "#4CAF50" : "#888", color: "white", width: "100%" }}>
                    {isReady ? "▶️ Run Sequence" : "Loading..."}
                </button>
            )}
        </div>

      </div>

      {/* CANVAS CONTAINER */}
      <div style={{ width: "500px", height: "500px", border: "solid" }}>
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
            // ✨ 4. Pass the state setter to the Model component
            onPlaybackStateChange={setIsPlaying}
          />
          <OrbitControls
            enabled={!isDraggingObject}
            onStart={() => setIsUserControllingCamera(true)}
            onEnd={() => setIsUserControllingCamera(false)}
          />
        </Canvas>
      </div>
    </div>
  );
}