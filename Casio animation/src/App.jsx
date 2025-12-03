import React from "react";
// Assuming react-router-dom is available, we use HashRouter for simplicity in embedded environments
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import GirlAnimation from "./components/girlAnimation/GirlAnimation";
import ModelViewer from "./components/girlAnimation/girlAnimationUW";
import TossModelEditing from "./components/toss/TossModelEditing";
import TossModelViewerRealTime from "./components/toss/TossModelViewerRealTime";
import LightAnimationPlayer from "./components/girlAnimation/LightAnimationPlayer";
import SnakeTest from "./components/SnakeTest";

// Renaming ModelViewer (from girlAnimationUW) to GirlAnimationLight for contextual clarity
const GirlAnimationLight = () => (
  <div className="p-4 text-center bg-light shadow rounded-3 mb-3">
    <h2 className="h4 fw-bold text-primary">Girl Animation (Light/UW)</h2>
    <p className="mt-2 text-muted">
      This simulates the ModelViewer/girlAnimationUW component.
    </p>
  </div>
);

// --- Main Application Component ---

function AppContent() {
  return (
    // Replaced Tailwind classes with Bootstrap 5 classes
    <div className="d-flex flex-column min-vh-100 bg-light">
      <header className="py-3 shadow-sm bg-white">
        <div className="container px-4 d-flex justify-content-between align-items-center">
          <h1 className="h3 fw-bold text-dark mb-0">Coin Toss App</h1>
          <nav className="d-flex gap-2">
            {/* Bootstrap Button Styling for Links */}
            <Link to="/GirlAnimation" className="btn btn-primary btn-sm shadow">
              Girl Animation
            </Link>

            <Link
              to="/LightAnimationPlayer"
              className="btn btn-danger btn-sm shadow"
            >
              Light Animation Player
            </Link>
            <Link to="/ModelViewer" className="btn btn-success btn-sm shadow">
              ModelViewer
            </Link>
            <Link to="/SnakeTest" className="btn btn-success btn-sm shadow">
              SnakeTest
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow-1 p-4 d-flex justify-content-center align-items-center">
        <div className="w-100" style={{ maxWidth: "800px" }}>
          <Routes>
            {/* The default path '/' will also show the main GirlAnimation */}
            <Route path="/" element={<GirlAnimation />} />

            {/* Defined Routes */}
            <Route path="/GirlAnimation" element={<GirlAnimation />} />
            <Route
              path="/GirlAnimation-light"
              element={<GirlAnimationLight />}
            />

            {/* Other potential routes */}
            <Route path="/ModelViewer" element={<ModelViewer />} />
            <Route
              path="/LightAnimationPlayer"
              element={<LightAnimationPlayer />}
            />
            <Route path="/SnakeTest" element={<SnakeTest />} />
          </Routes>
        </div>
      </main>
      <footer className="py-3 text-center text-sm text-muted border-top">
        React Router Example with Bootstrap
      </footer>
    </div>
  );
}

// Wrap the main content with HashRouter
export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
