import { useState } from "react";
import Login from "./Login";
import Signup from "./Signup";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div style={{ padding: 20 }}>
      {mode === "login" ? <Login /> : <Signup />}

      <div style={{ marginTop: 20 }}>
        {mode === "login" ? (
          <p>
            Need an account?{" "}
            <button onClick={() => setMode("signup")}>Sign Up</button>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <button onClick={() => setMode("login")}>Login</button>
          </p>
        )}
      </div>
    </div>
  );
}
