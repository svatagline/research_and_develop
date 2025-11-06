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
        premultipliedAlpha: true,
        background: "#f0f0f0",
        viewport: { padLeft: 0, padRight: 0, padTop: 0, padBottom: 0 },
        
        // Using the real animation name from your screenshots
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

  // !! NEW, REUSABLE FUNCTION !!
  const setLipExpression = (lipSlotName) => {
    if (!player) {
      console.log("Player not loaded yet");
      return;
    }

    try {
      const skeleton = player.skeleton;

      // 1. Hide ALL other lip expressions
      for (const slot of ALL_LIP_SLOTS) {
        skeleton.setAttachment(slot, null);
      }

      // 2. Show ONLY the one we want
      // We assume the attachment name is the same as the slot name
      // (e.g., "happy_lips" slot uses "happy_lips" attachment)
      skeleton.setAttachment(lipSlotName, lipSlotName);

      console.log(`Attachment set to: ${lipSlotName}`);

    } catch (error) {
      // This error will happen if the attachment (image) name is
      // different from the slot name.
      console.error(`Error setting attachment: ${lipSlotName}`, error);
    }
  };

  return (
    <div>
      <div 
        ref={containerRef} 
        style={{ width: '500px', height: '500px' }} // <-- ADJUST SIZE AS NEEDED
      />
      
      {/* !! NEW BUTTONS !! */}
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

      {/* You can even add a button to go back to normal */}
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