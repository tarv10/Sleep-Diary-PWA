import { useState, useEffect } from "react";
import { Download, Trash2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  getSettings,
  saveSettings,
  getAllEntries,
  exportToCSV,
  clearAllData,
  seedIfEmpty,
  setUnlocked,
} from "@/lib/storage";
import { toDateString, addDays } from "@/lib/sleepUtils";
import type { AppSettings } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettingsState] = useState<AppSettings>(getSettings());
  const [pinStep, setPinStep] = useState<"idle" | "enter" | "confirm">("idle");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [exportStart, setExportStart] = useState(
    addDays(toDateString(new Date()), -30)
  );
  const [exportEnd, setExportEnd] = useState(toDateString(new Date()));
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const entries = getAllEntries();
  const exportCount = entries.filter(
    (e) => e.date >= exportStart && e.date <= exportEnd
  ).length;

  const handlePinToggle = (checked: boolean) => {
    if (checked) {
      setPinStep("enter");
      setNewPin("");
      setConfirmPin("");
      setPinError("");
    } else {
      const updated = { ...settings, pinEnabled: false, pin: null };
      saveSettings(updated);
      setSettingsState(updated);
      setUnlocked(true);
      setPinStep("idle");
      toast({ title: "PIN disabled" });
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pinStep === "enter") {
      const next = newPin + digit;
      setNewPin(next);
      if (next.length === 4) {
        setTimeout(() => setPinStep("confirm"), 200);
      }
    } else if (pinStep === "confirm") {
      const next = confirmPin + digit;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === newPin) {
          const updated = { ...settings, pinEnabled: true, pin: newPin };
          saveSettings(updated);
          setSettingsState(updated);
          setUnlocked(true);
          setPinStep("idle");
          toast({ title: "PIN enabled" });
        } else {
          setPinError("PINs don't match");
          setTimeout(() => {
            setConfirmPin("");
            setPinError("");
          }, 800);
        }
      }
    }
  };

  const handlePinDelete = () => {
    if (pinStep === "enter") {
      setNewPin(newPin.slice(0, -1));
    } else if (pinStep === "confirm") {
      setConfirmPin(confirmPin.slice(0, -1));
      setPinError("");
    }
  };

  const cancelPinSetup = () => {
    setPinStep("idle");
    setNewPin("");
    setConfirmPin("");
    setPinError("");
  };

  const handleExport = () => {
    const toExport = entries.filter(
      (e) => e.date >= exportStart && e.date <= exportEnd
    );
    if (toExport.length === 0) {
      toast({ title: "No entries in selected range" });
      return;
    }
    const csv = exportToCSV(toExport);
    const blob = new Blob([csv], { type: "text/csv" });
    const file = new File(
      [blob],
      `sleep-diary-${exportStart}-to-${exportEnd}.csv`,
      { type: "text/csv" }
    );

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: "Sleep Diary Export" });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "CSV downloaded" });
    }
  };

  const handleClear = () => {
    clearAllData();
    setSettingsState(getSettings());
    setShowClearConfirm(false);
    toast({ title: "All data cleared" });
  };

  return (
    <div className="px-5 pt-6 pb-24">
      <h1 className="text-2xl font-medium mb-8 tracking-tight">Settings</h1>

      <Section label="Security">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {settings.pinEnabled ? (
              <Lock className="w-4 h-4 text-primary" />
            ) : (
              <Unlock className="w-4 h-4 text-muted-foreground/40" />
            )}
            <span className="text-base text-foreground">PIN Lock</span>
          </div>
          <Switch
            checked={settings.pinEnabled}
            onCheckedChange={handlePinToggle}
            data-testid="switch-pin"
          />
        </div>

        {pinStep !== "idle" && (
          <div className="py-4 border-t border-border/10">
            <div className="text-xs text-muted-foreground mb-4">
              {pinStep === "enter"
                ? "Enter a 4-digit PIN"
                : "Confirm your PIN"}
            </div>

            <div className="flex gap-3 justify-center mb-6">
              {[0, 1, 2, 3].map((i) => {
                const val = pinStep === "enter" ? newPin : confirmPin;
                return (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      i < val.length
                        ? pinError
                          ? "bg-destructive"
                          : "bg-primary"
                        : "bg-muted/40"
                    }`}
                  />
                );
              })}
            </div>

            {pinError && (
              <p className="text-xs text-destructive text-center mb-4">
                {pinError}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => handlePinDigit(d)}
                  className="h-12 rounded-md flex items-center justify-center text-lg font-light text-foreground active:bg-muted/20 transition-colors"
                  data-testid={`settings-pin-${d}`}
                >
                  {d}
                </button>
              ))}
              <button
                onClick={cancelPinSetup}
                className="h-12 rounded-md flex items-center justify-center text-xs text-muted-foreground active:bg-muted/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePinDigit("0")}
                className="h-12 rounded-md flex items-center justify-center text-lg font-light text-foreground active:bg-muted/20 transition-colors"
                data-testid="settings-pin-0"
              >
                0
              </button>
              <button
                onClick={handlePinDelete}
                className="h-12 rounded-md flex items-center justify-center text-xs text-muted-foreground active:bg-muted/20 transition-colors"
              >
                Del
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section label="Export">
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground/40 uppercase tracking-wider block mb-1">
                From
              </label>
              <input
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground tabular-nums focus:outline-none [color-scheme:dark] border-b border-border/15 pb-1"
                data-testid="input-export-start"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground/40 uppercase tracking-wider block mb-1">
                To
              </label>
              <input
                type="date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground tabular-nums focus:outline-none [color-scheme:dark] border-b border-border/15 pb-1"
                data-testid="input-export-end"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground/40">
              {exportCount} {exportCount === 1 ? "entry" : "entries"}
            </span>
            <Button
              onClick={handleExport}
              disabled={exportCount === 0}
              size="sm"
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </Section>

      <Section label="Data">
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-3 py-4 text-sm text-destructive/70 w-full text-left"
            data-testid="button-clear-data"
          >
            <Trash2 className="w-4 h-4" />
            Clear all data
          </button>
        ) : (
          <div className="py-4">
            <p className="text-sm text-foreground mb-3">
              This will permanently delete all entries and settings.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClear}
                data-testid="button-confirm-clear"
              >
                Delete everything
              </Button>
            </div>
          </div>
        )}
      </Section>

      <div className="mt-12 text-center">
        <p className="text-[10px] text-muted-foreground/20 uppercase tracking-[0.2em]">
          Sleep Diary v1.0
        </p>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-1">
        {label}
      </div>
      <div className="border-b border-border/8">{children}</div>
    </div>
  );
}
