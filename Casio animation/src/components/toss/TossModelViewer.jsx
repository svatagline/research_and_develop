import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

//================================================================//
//  Constants
//================================================================//
const STOP_AFTER_MS = 10000;
const RESUME_DELAY_MS = 5000;
const RESUME_SPEED = 1;
const ZOOM_DURATION_S = 1.5;

// --- MODIFIED: Added a fixed end position for the animation ---
const INITIAL_ZOOM_LEVEL = 3;    
const STATIC_CAMERA_POSITION = new THREE.Vector3(-2.89, 4.21, 0.06);
const ANIMATION_END_POSITION = new THREE.Vector3(-0.33, 0.78, -0.05); // Your new position

//================================================================//
//  CameraPositionTracker (Unchanged)
//================================================================//
const CameraPositionTracker = ({ onPositionChange }) => {
  const { camera } = useThree();
  const lastPosition = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!lastPosition.current.equals(camera.position)) {
      lastPosition.current.copy(camera.position);
      onPositionChange({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      });
    }
  });
  return null;
};

//================================================================//
//  Model Viewer Component (MODIFIED)
//================================================================//
const ModelViewer = ({ url, speed, isAnimating, onAnimationEnd, initialPosition, controlsRef }) => {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions, mixer } = useAnimations(animations, group);
  const finishedCount = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;
    const allActions = Object.values(actions);
    allActions.forEach((action) => {
      action.time = 0.1;
      action.paused = true;
      action.play();
    });
  }, [actions]);

  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;
    const allActions = Object.values(actions);

    if (isAnimating) {
      finishedCount.current = 0;

      gsap.to(camera.position, {
        x: initialPosition.x,
        y: initialPosition.y,
        z: initialPosition.z,
        duration: 0.75,
        ease: "power2.out",
      });
      
      allActions.forEach((action) => {
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.setEffectiveTimeScale(speed);
        action.paused = false;
        action.play();
      });

      const stopTimer = setTimeout(() => {
        allActions.forEach((action) => (action.paused = true));

        const resumeTimer = setTimeout(() => {
          // --- MODIFIED: Animate to the new ANIMATION_END_POSITION ---
          // This replaces the old relative zoom logic.
          gsap.to(camera.position, {
            x: ANIMATION_END_POSITION.x,
            y: ANIMATION_END_POSITION.y,
            z: ANIMATION_END_POSITION.z,
            duration: ZOOM_DURATION_S,
            ease: "power2.inOut",
            onUpdate: () => {
              if (controlsRef.current) {
                controlsRef.current.update();
              }
            },
          });
          
          allActions.forEach((action) => {
            action.paused = false;
            action.setEffectiveTimeScale(RESUME_SPEED);
          });
        }, RESUME_DELAY_MS);
        return () => clearTimeout(resumeTimer);
      }, STOP_AFTER_MS);
      return () => clearTimeout(stopTimer);
    }
  }, [actions, isAnimating, speed, camera, initialPosition, onAnimationEnd, controlsRef]);

  useEffect(() => {
    if (!mixer || !onAnimationEnd || !isAnimating) return;
    const handleFinished = (e) => {
      if (e.action.isRunning()) return;
      finishedCount.current += 1;
      if (finishedCount.current >= animations.length) {
        onAnimationEnd();
      }
    };
    mixer.addEventListener("finished", handleFinished);
    return () => mixer.removeEventListener("finished", handleFinished);
  }, [mixer, onAnimationEnd, isAnimating, animations.length]);

  return <primitive ref={group} object={scene} dispose={null} />;
};

//================================================================//
//  Main Application Component (Unchanged from last version)
//================================================================//
const TossModelViewer = () => {
  const controlsRef = useRef();
  //const glbFiles = ["/head.glb", "/tail.glb"]; 
  const glbFiles = ["/tail.glb", "/tail.glb"]; 
  const [currentFile, setCurrentFile] = useState(glbFiles[0]);
  const [fileName, setFileName] = useState("");
  const [speed, setSpeed] = useState(0.4);
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const getInitialPosition = () => {
    const pos = STATIC_CAMERA_POSITION.clone().multiplyScalar(1 / INITIAL_ZOOM_LEVEL);
    return { x: pos.x, y: pos.y, z: pos.z };
  };

  const [initialCamPos] = useState(getInitialPosition());
  const [currentCamPos, setCurrentCamPos] = useState(initialCamPos);

  useEffect(() => {
    if (currentFile) setFileName(currentFile.split("/").pop());
  }, [currentFile]);

  const toggleModel = () => {
    setCurrentFile((prev) => (prev === glbFiles[0] ? glbFiles[1] : glbFiles[0]));
    setIsAnimating(false);
  };

  const toggleControls = () => setControlsEnabled(!controlsEnabled);
  const startAnimation = () => !isAnimating && setIsAnimating(true);
  const handleAnimationEnd = useCallback(() => {
    console.log(`Animation finished for: ${fileName}`);
    setIsAnimating(false);
  }, [fileName]);

  const handleCopyPosition = () => {
    const posString = `[${currentCamPos.x.toFixed(2)}, ${currentCamPos.y.toFixed(2)}, ${currentCamPos.z.toFixed(2)}]`;
    navigator.clipboard.writeText(posString).then(
      () => alert(`Position copied!\n${posString}`),
      () => alert("Failed to copy position.")
    );
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        backgroundColor: "#282c34",
      }}
    >
      <Canvas camera={{ position: [initialCamPos.x, initialCamPos.y, initialCamPos.z] }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        {currentFile && (
          <ModelViewer
            key={currentFile}
            url={currentFile}
            speed={speed}
            isAnimating={isAnimating}
            onAnimationEnd={handleAnimationEnd}
            initialPosition={initialCamPos} 
            controlsRef={controlsRef}
          />
        )}
        <OrbitControls ref={controlsRef} enabled={controlsEnabled} />
        <CameraPositionTracker onPositionChange={setCurrentCamPos} />
      </Canvas>
      {/*... All UI elements below this remain unchanged ...*/}
      {fileName && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            color: "white",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: "5px",
            borderRadius: "4px",
          }}
        >
          Model: **{fileName}**
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: "100px",
          left: "50%",
          transform: "translateX(-50%)",
          color: "white",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: "8px 15px",
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <span>
          {`Camera: [X: ${currentCamPos.x.toFixed(2)}, Y: ${currentCamPos.y.toFixed(2)}, Z: ${currentCamPos.z.toFixed(2)}]`}
        </span>
        <button
          onClick={handleCopyPosition}
          style={{
            padding: "4px 8px",
            border: "1px solid white",
            background: "transparent",
            color: "white",
            cursor: "pointer",
          }}
        >
          Copy
        </button>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          zIndex: 10,
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: "12px",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <label
            htmlFor="speed-slider"
            style={{ color: "white", marginRight: "10px", minWidth: "150px" }}
          >
            Speed Multiplier:
          </label>
          <input
            id="speed-slider"
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
          <span style={{ color: "white", marginLeft: "10px", width: "40px" }}>
            {speed.toFixed(1)}x
          </span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "10px",
          zIndex: 10,
        }}
      >
        <button onClick={toggleModel} style={{ padding: "10px", width: "150px" }}>
          Toggle Model
        </button>
        <button onClick={startAnimation} disabled={isAnimating} style={{ padding: "10px", width: "150px" }}>
          {isAnimating ? "Animating..." : "Play Animation"}
        </button>
        <button onClick={toggleControls} style={{ padding: "10px", width: "150px" }}>
          {controlsEnabled ? "Disable Controls" : "Enable Controls"}
        </button>
      </div>
    </div>
  );
};

export default TossModelViewer;