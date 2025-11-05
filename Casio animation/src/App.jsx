import GirlAnimation from "./components/girlAnimation/GirlAnimation";
// import GirlAnimation from "./components/girlAnimation/GirlAnimationUW";
// import TossModelViewer from "./components/toss/TossModelViewer";

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
        <GirlAnimation/>
   
      </main>
    </div>
  );
}

export default App;
