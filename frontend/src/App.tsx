import Sidebar from "./components/Sidebar";
import { Outlet } from "react-router-dom";
import { CompanionProvider } from "./components/Companion/CompanionProvider";
import CompanionDock from "./components/Companion/CompanionDock";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <CompanionProvider>
        <div className="bg-black text-stone-300 min-h-screen flex flex-col">
          <Sidebar />
          <div className="flex-1 relative">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </div>
        <CompanionDock />
      </CompanionProvider>
    </ErrorBoundary>
  );
}
