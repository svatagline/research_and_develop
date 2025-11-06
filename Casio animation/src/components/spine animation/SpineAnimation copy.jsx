import { useEffect, useRef } from "react";
 
import { SpinePlayer } from "@esotericsoftware/spine-player";

const jsonPath = "animation/girl_1.json";
 const  atlasPath = "animation/girl_1.atlas";
 const  imagePath = "animation/girl_1.png";
export default function SpineAnimationGirl() {
  const spineRef = useRef(null);
  useEffect(() => {
   const spineRoot = spineRef.current
    if (spineRoot) {
      const spinePlayer = new SpinePlayer();
      spinePlayer.load({
         jsonText: jsonPath,
        atlasText: atlasPath,
        texture: imagePath,
      });
      spinePlayer.trackEntry.setAnimation(0, "idle_anim", true);
      spineRoot.appendChild(spinePlayer.canvas);
    }
  }, []);
  return <div id="spine" style={{ width: "800px", height: "600px" }} ref={spineRef}></div>}