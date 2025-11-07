import { SpinePlayer } from '@esotericsoftware/spine-player';
import '@esotericsoftware/spine-player/dist/spine-player.css';
import { useEffect, useRef, useState } from 'react';

// Your file paths
const JSON_PATH = "animation/girl_1.json";
const ATLAS_PATH = "animation/girl_1.atlas";
const IMAGE_PATH = "animation/girl_1.png";

// A list of all possible lip slots, based on your JSON
// This helps us turn OFF all other lips
const ALL_LIP_SLOTS = [
  "normal_lips",
  "happy_lips",
  "sad_lips",
  "angry_lips",
  "thinking_lips",
  "irritated_lips",
  "smiling_lips"
];

// ... (imports remain the same)

function GirlAnimation() {
  const containerRef = useRef(null);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    let playerInstance; 

  if (containerRef.current) {
      playerInstance = new SpinePlayer(containerRef.current, {
        jsonUrl: JSON_PATH,
        atlasUrl: ATLAS_PATH,
        pngUrl: IMAGE_PATH,
        
        // !! ALL THREE SETTINGS !!
        background: "transparent",  // 1. Tell Spine to clear to transparent
        alpha: true,                // 2. Tell Browser to create a transparent canvas
        premultipliedAlpha: false,  // 3. Match your asset export (keep as false for now)

        viewport: { padLeft: 0, padRight: 0, padTop: 0, padBottom: 0 },
        animation: "Idle_normal", 
      });
      
      setPlayer(playerInstance);
    }
    
    return () => {
      if (playerInstance) {
        playerInstance.dispose();
      }
    };
  }, []);

  // ... (setLipExpression function remains the same) ...

  const setLipExpression = (lipSlotName) => {
    if (!player) {
      console.log("Player not loaded yet");
      return;
    }

    try {
      const skeleton = player.skeleton;
      for (const slot of ALL_LIP_SLOTS) {
        skeleton.setAttachment(slot, null);
      }
      skeleton.setAttachment(lipSlotName, lipSlotName);
      console.log(`Attachment set to: ${lipSlotName}`);
    } catch (error) {
      console.error(`Error setting attachment: ${lipSlotName}`, error);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', textAlign: 'center' }}>
      
      <div 
        ref={containerRef} 
        style={{ width: '500px', height: '500px' }}
      />
      
      {/* ... (buttons remain the same) ... */}
      <button 
        onClick={() => setLipExpression("happy_lips")} 
        style={{ marginTop: '10px', marginRight: '10px', padding: '10px 20px', fontSize: '16px' }}
      >
        Make Happy
      </button>

      <button 
        onClick={() => setLipExpression("sad_lips")} 
        style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px' }}
      >
        Make Sad
      </button>

      <button 
        onClick={() => setLipExpression("normal_lips")} 
        style={{ marginTop: '10px', marginLeft: '10px', padding: '10px 20px', fontSize: '16px' }}
      >
        Make Normal
      </button>
    </div>
  );
}

export default GirlAnimation;