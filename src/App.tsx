import { HelmetProvider } from "react-helmet-async";
import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <div>
      <HelmetProvider>
        <Outlet />
      </HelmetProvider>
    </div>
  );
}
