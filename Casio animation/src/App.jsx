// import GirlAnimation from "./components/girlAnimation/GirlAnimationUW";
// import TossModelViewer from "./components/toss/TossModelViewer";

import TossModelEditing from "./components/toss/TossModelEditing";
import TossModelViewerRealTime from "./components/toss/TossModelViewerRealTime";

// import CoinTossCasino from "./components/theToss/TheToss";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Coin Toss Game</h1>
      </header>
      <main>
        {/* <TossModelViewer />   */}
        {/* <CardDistributionAnimation/> */}
        {/* <GirlAnimation/> */}
        {/* <TossModelViewerRealTime/> */}
        <TossModelEditing />
      </main>
    </div>
  );
}

export default App;
