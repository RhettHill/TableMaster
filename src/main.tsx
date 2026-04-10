import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/Homepage";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./routes";
import "./index.css";
import GameLobby from "./pages/GameLobby";
import GameSession from "./pages/GameSession";
import InvitePage from "./pages/InvitePage";
import ProfilePage from "./pages/ProfilePage";
import PlansPage from "./pages/PlansPage";
import CalendarPage from "./pages/CalanderPage";
import { SceneSettings, GameSettings } from "./store/gameStore";
import { Token, VisibilityMode } from "./types/Types";
import CustomSystemBuilder from "./pages/CustomSytemBuilder";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        // Public landing page — no auth required
        path: "home",
        element: <HomePage />,
      },
      {
        path: "plans",
        element: <PlansPage />,
      },
      {
        // Dashboard — protected, redirects to /home if not authed
        index: true,
        path: "/",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "game/:gameId/system-builder",
        element: (
          <ProtectedRoute>
            <CustomSystemBuilder />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "game/:gameId",
        element: (
          <ProtectedRoute>
            <GameLobby />
          </ProtectedRoute>
        ),
      },
      {
        path: "game/:gameId/play",
        element: (
          <ProtectedRoute>
            <GameSession />
          </ProtectedRoute>
        ),
      },
      {
        path: "invite/:code",
        element: (
          <ProtectedRoute>
            <InvitePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "calendar",
        element: (
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        ),
      },
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
