import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- PHASE CONFIGURATION ---
// Define the speeds and hand position for each phase. You can directly edit these values.
// handPosition is now an array of [x, y, z] coordinates.
const PHASE_CONFIGS = {
    1: { // Phase 1: 0ms - 2000ms
        speeds: { hand: 1.02, 'card.003': 1, 'card.004': 1 },
        handPosition: [-0.1, 0.2, 0.2], // Example: Position with X offset
    },
    2: { // Phase 2: 2000ms - end
        speeds: { hand:1.1, 'card.003': 1,  'card.004': 1},
        handPosition: [0.1, 0.5, 0.2], // Example: Original position
    },
};

const changePhaseAfter = 1500
// const PHASE_CONFIGS = {
//     1: { // Phase 1: 0ms - 2000ms
//         speeds: { hand: 0.82, 'card.004': 0.8, 'card.003': 0.8 },
//         handPosition: [-0.1, 0.2, 0.2], // Example: Position with X offset
//     },
//     2: { // Phase 2: 2000ms - end
//         speeds: { hand:0.5, 'card.004': 0.4362, 'card.003': 0.8 },
//         handPosition: [0.1, 0.5, 0.2], // Example: Original position
//     },
// };

/**
 * CardAnimation component that loads and controls a GLTF animation.
 * It now reacts to phase changes to control the hand's position and animation speeds.
 */
function CardAnimation({ play, restart, speeds, cardImages, handPosition }) {
  const group = useRef();
  const handOffsetGroup = useRef();

  // Load the GLB model and its animations
  const { scene, animations } = useGLTF("/cards/ademo2.glb");
  // useAnimations hook to get access to the animation actions
  const { actions, mixer } = useAnimations(animations, group);

  // This useEffect applies the image textures with text overlay to the card materials.
  useEffect(() => {
    if (!scene || !cardImages) return;

    const textureLoader = new THREE.TextureLoader();

    scene.traverse((object) => {
      // We are looking for the MESH that has the material.
      if (object.isMesh && object.material && object.material.name === 'Material001') {
        // Now, check if its PARENT group is one of the cards we want to texture.
        const parent = object.parent;

        if (parent && cardImages.hasOwnProperty(parent.name)) {
          // --- BUG FIX: Clone the material to ensure it's unique per card ---
          const material = object.material.clone();
          object.material = material; // Assign the unique material back to this mesh

          const imagePath = `/cards/${cardImages[parent.name]}`;
          console.log(`SUCCESS: Applying texture to parent "${parent.name}"`);

          textureLoader.load(imagePath, (texture) => {
            // --- Create a canvas to combine image and text ---
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size to match the image
            canvas.width = texture.image.width;
            canvas.height = texture.image.height;

            // 1. Draw the card image
            ctx.drawImage(texture.image, 0, 0);

            // 2. Configure text style (example)
            // ctx.fillStyle = 'white';
            // ctx.font = 'bold 48px Arial';
            // ctx.textAlign = 'center';
            // ctx.fillText('YOUR TEXT', canvas.width / 2, canvas.height / 2);

            // Create a new texture from the canvas
            const canvasTexture = new THREE.CanvasTexture(canvas);
            canvasTexture.flipY = false;
            canvasTexture.colorSpace = THREE.SRGBColorSpace;

            // Apply the new combined texture
            material.map = canvasTexture;
            material.needsUpdate = true;
          });
        }
      }
    });

  }, [scene, cardImages]); // Depend on scene and cardImages.

  // This useEffect is dedicated to updating animation speeds based on the current phase.
  useEffect(() => {
    if (!actions || !Object.keys(actions).length) return;

    for (const action of Object.values(actions)) {
      const clipName = action.getClip().name.toLowerCase();
      let speedApplied = false;

      for (const [objectName, speed] of Object.entries(speeds)) {
        if (clipName.includes(objectName.toLowerCase())) {
          action.timeScale = speed;
          speedApplied = true;
          break;
        }
      }
      if (!speedApplied) {
        action.timeScale = 1;
      }
    }
  }, [speeds, actions]);

  // This useEffect handles finding the 'hand' object, re-parenting it for offset control,
  // and updating its position based on the handPosition prop (which changes with the phase).
  useEffect(() => {
    if (!scene) return;
    const objectNameToMove = "hand";

    // Step 1: Find and re-parent the hand object ONCE.
    if (!handOffsetGroup.current) {
        scene.traverse((object) => {
            if (object.name === objectNameToMove && object.parent && !object.parent.userData.isOffsetGroup) {
                console.log(`Found "${objectNameToMove}" for the first time. Reparenting...`);
                
                const offsetGroup = new THREE.Group();
                offsetGroup.userData.isOffsetGroup = true;
                
                // Store the group in the ref for future updates
                handOffsetGroup.current = offsetGroup;

                // Move the offset group to the original object's parent
                if (object.parent) {
                    object.parent.add(offsetGroup);
                }
                
                // Move the object into the new controlling group
                offsetGroup.add(object);
                
                // Reset the object's LOCAL position relative to its new parent.
                object.position.set(0, 0, 0);
            }
        });
    }

    // Step 2: Apply the position whenever the handPosition prop changes.
    if (handOffsetGroup.current && handPosition) {
        console.log(`Applying new hand position for the current phase: [${handPosition.join(', ')}]`);
        // The base X position is -10.1. We add the current offset to it.
        handOffsetGroup.current.position.set(...handPosition);
    }

  }, [scene, handPosition]); // This effect re-runs when the scene loads OR when handPosition changes.

  // This useEffect handles the core animation controls: play, pause, and restart.
  useEffect(() => {
    if (!actions || !Object.keys(actions).length) {
      return;
    }

    if (restart) {
      Object.values(actions).forEach((action) => {
        action.reset().play();
      });
    } else {
      Object.values(actions).forEach((action) => {
        if (play) {
          if (!action.isRunning()) {
            action.play();
          }
          action.paused = false;
        } else {
          action.paused = true;
        }
      });
    }
  }, [play, restart, actions]);

  // This useEffect runs once to configure all animations.
  useEffect(() => {
    if (!actions || !Object.keys(actions).length) return;

    Object.values(actions).forEach((action) => {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    });

    return () => {
      mixer.stopAllAction();
    };
  }, [actions, mixer]);

  return <primitive ref={group} object={scene} scale={1.5} />;
}


/**
 * Main App component to render the 3D scene and UI controls.
 * Now manages animation phases.
 */
export default function CardDistributionAnimation() {
  const [play, setPlay] = useState(false);
  const [restart, setRestart] = useState(false);
  const [phase, setPhase] = useState(1);
  const phaseTimerRef = useRef(null);
  
  // Get the config for the current phase from the global constant.
  const currentConfig = PHASE_CONFIGS[phase];

  // State to hold the image paths for the card textures
  const [cardImages, setCardImages] = useState({
    'Cube': "king.png",
    'Cube3': "spades_as.png",
    'Cube4': "heart_jh.png",
    'Cube1': "king.png",
    'Cube2': "king.png",
  });

  const handlePlay = () => {
    setRestart(false);
    setPlay(true);
  };

  const handlePause = () => {
    setPlay(false);
    // If we pause, clear any scheduled phase transition
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
    }
  };

  const handleRestart = () => {
    // Clear any existing timer to prevent conflicts
    if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
    }
    
    // 1. Reset to Phase 1
    console.log("Restarting: Entering Phase 1");
    setPhase(1);
    
    // 2. Trigger animation restart
    setRestart(true);
    setPlay(true);
    
    // 3. Schedule the transition to Phase 2 after 2000ms
    phaseTimerRef.current = setTimeout(() => {
        console.log("Timer fired: Transitioning to Phase 2");
        setPhase(2);
    }, changePhaseAfter);
    
    // 4. Reset the restart flag shortly after it's been set
    setTimeout(() => setRestart(false), 100);
  };
  
  return (
    <>
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 1, display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'sans-serif' }}>
        {/* --- Main Controls --- */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePlay}>▶ Play</button>
          <button onClick={handlePause}>⏸ Pause</button>
          <button onClick={handleRestart}>🔄 Restart</button>
        </div>

        {/* --- Phase and Speed Info --- */}
        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '12px', borderRadius: '8px', color: 'white' }}>
            <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #555', paddingBottom: '5px' }}>
                Current Phase: {phase}
            </h3>
            <h4 style={{ margin: '0 0 10px 0' }}>Animation Speeds</h4>
            {Object.entries(currentConfig.speeds).map(([name, currentSpeed]) => (
              <div key={name} style={{ marginBottom: '5px', fontSize: '14px' }}>
                <span style={{ minWidth: '95px', display: 'inline-block' }}>{name}: </span>
                <span>{currentSpeed}x</span>
              </div>
            ))}
            <div style={{ marginTop: '10px' }}>
              <span style={{ minWidth: '95px', display: 'inline-block' }}>Hand Position: </span>
              <span>{JSON.stringify(currentConfig.handPosition)}</span>
            </div>
        </div>
      </div>

      <Canvas camera={{ position: [0, 5, 15], fov: 45 }} style={{width:"100vw", height:"100vh"}}>
        <color attach="background" args={["#202020"]} />
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={2.5} castShadow />
        <axesHelper args={[5]} />
        <gridHelper args={[20, 20]} />
        <Suspense fallback={null}>
          <CardAnimation 
            play={play} 
            restart={restart} 
            speeds={currentConfig.speeds}
            handPosition={currentConfig.handPosition}
            cardImages={cardImages} 
          />
        </Suspense>
        <OrbitControls />
      </Canvas>
    </>
  );
}

