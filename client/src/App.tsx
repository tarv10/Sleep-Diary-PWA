import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { PenLine, List, BarChart3, MoreHorizontal } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { getSettings, isUnlocked, seedIfEmpty } from "@/lib/storage";
import PinLock from "@/components/pin-lock";
import LogPage from "@/pages/log";
import HistoryPage from "@/pages/history";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";

const tabs = [
  { path: "/", match: ["/", "/log/"], label: "Log", icon: PenLine },
  { path: "/history", match: ["/history"], label: "History", icon: List },
  { path: "/dashboard", match: ["/dashboard"], label: "Stats", icon: BarChart3 },
  { path: "/settings", match: ["/settings"], label: "More", icon: MoreHorizontal },
];

function App() {
  const [location, navigate] = useLocation();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    seedIfEmpty();
    const settings = getSettings();
    if (settings.pinEnabled && !isUnlocked()) {
      setLocked(true);
    }
  }, []);

  if (locked) {
    return (
      <>
        <PinLock onUnlock={() => setLocked(false)} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Switch>
          <Route path="/">{() => <LogPage />}</Route>
          <Route path="/log/:date">
            {(params) => <LogPage initialDate={params.date} />}
          </Route>
          <Route path="/history" component={HistoryPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/settings" component={SettingsPage} />
        </Switch>
      </main>

      <nav
        className="flex-shrink-0 border-t border-border/10 bg-background"
        style={{
          paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const active = tab.match.some(
              (m) => location === m || (m.endsWith("/") && m !== "/" && location.startsWith(m))
            ) || (tab.path === "/" && location === "/");

            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-0.5 min-w-[4rem] py-1.5"
                data-testid={`nav-${tab.label.toLowerCase()}`}
              >
                <tab.icon
                  className={cn(
                    "w-[20px] h-[20px] transition-colors duration-150",
                    active ? "text-primary" : "text-muted-foreground/40"
                  )}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-150",
                    active ? "text-primary" : "text-muted-foreground/30"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Toaster />
    </div>
  );
}

export default App;
