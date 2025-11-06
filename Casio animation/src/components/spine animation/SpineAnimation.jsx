// src/App.js

import { useEffect, useRef, useState } from 'react';
// Import the official SpinePlayer library
import { SpinePlayer } from '@esotericsoftware/spine-player';
import '@esotericsoftware/spine-player/dist/spine-player.css'; // Import the player's CSS
 

//==================================================
// SpinePlayer Component (using @esotericsoftware/spine-player)
//==================================================

const SpinePlayerComponent = ({
  jsonPath = "/animation/girl_1.json",
  atlasPath = "/animation/girl_1.atlas",
  imagePath = "/animation/girl_1.png", // Note: This library doesn't need this prop, it finds the PNG from the .atlas
  animationName = "Angry_1" // Use the correct name we found!
}) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ensure this runs only once
    if (playerRef.current || !containerRef.current) {
      return;
    }

    // Create the player config
    const config = {
      jsonUrl: jsonPath,
      atlasUrl: atlasPath,
      animation: animationName, // Set the default animation
      premultipliedAlpha: false,
      backgroundColor: "#00000000", // Transparent background
      showControls: false, // We are making our own controls
      autoPlay: true, // Start playing automatically
      success: (player) => {
        setIsLoading(false);
        setIsPlaying(true);
      },
      error: (player, error) => {
        console.error("Spine Player Error:", error);
        setIsLoading(false);
      }
    };

    // 1. Create a new SpinePlayer instance
    const player = new SpinePlayer(containerRef.current, config);
    playerRef.current = player; // Save the instance

    // 2. Cleanup function
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };

  }, [jsonPath, atlasPath, animationName]); // Re-run if paths change

  // --- Control Handlers ---

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {isLoading && <div style={{ padding: '20px' }}>Loading...</div>}
      
      {/* This div is the target for the SpinePlayer.
        The @esotericsoftware/spine-player will create its canvas *inside* this div.
      */}
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '500px', 
          border: '1px solid red', // Debug border
          display: isLoading ? 'none' : 'block'
        }}
      />

      {/* --- Controls --- */}
      <div className="controls" style={{ marginTop: '10px', opacity: isLoading ? 0.5 : 1 }}>
        <button onClick={handlePlay} disabled={isPlaying || isLoading}>
          Play
        </button>
        <button onClick={handlePause} disabled={!isPlaying || isLoading} style={{ marginLeft: '10px' }}>
          Pause
        </button>
      </div>
    </div>
  );
};


//==================================================
// Main App Component
//==================================================

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h2>Spine Animation Player</h2>
        <SpinePlayerComponent 
          // Use the absolute paths (starting with /)
          jsonPath="/animation/girl_1.json"
          atlasPath="/animation/girl_1.atlas"
          
          // Use the correct animation name from your console
          animationName="Angry_1" 
        />
      </header>
    </div>
  );
}

export default App;