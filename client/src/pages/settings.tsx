import { useState, useEffect } from "react";
import { Download, Trash2, Lock, Unlock, Clock, Plus, X, GripVertical } from "lucide-react";
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
  generateId,
} from "@/lib/storage";
import { toDateString, addDays } from "@/lib/sleepUtils";
import { InlineTimePicker } from "@/components/time-picker";
import { cn } from "@/lib/utils";
import type { AppSettings, FactorDefinition } from "@shared/schema";

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

      <Section label="Defaults">
        <div className="py-3 space-y-0">
          <SettingsTimeRow
            label="Bedtime"
            value={settings.defaultBedtime}
            onChange={(v) => {
              const updated = { ...settings, defaultBedtime: v };
              saveSettings(updated);
              setSettingsState(updated);
            }}
            testId="input-default-bedtime"
          />
          <SettingsTimeRow
            label="Fell asleep"
            value={settings.defaultSleepTime}
            onChange={(v) => {
              const updated = { ...settings, defaultSleepTime: v };
              saveSettings(updated);
              setSettingsState(updated);
            }}
            testId="input-default-sleep-time"
          />
          <SettingsTimeRow
            label="Woke up"
            value={settings.defaultWakeTime}
            onChange={(v) => {
              const updated = { ...settings, defaultWakeTime: v };
              saveSettings(updated);
              setSettingsState(updated);
            }}
            testId="input-default-wake-time"
            noBorder
          />
        </div>
      </Section>

      <Section label="Factors">
        <div className="py-2 space-y-0">
          {settings.factors.map((factor, idx) => (
            <FactorRow
              key={factor.id}
              factor={factor}
              isFirst={idx === 0}
              onUpdate={(updated) => {
                const factors = settings.factors.map((f) =>
                  f.id === factor.id ? updated : f
                );
                const s = { ...settings, factors };
                saveSettings(s);
                setSettingsState(s);
              }}
              onDelete={() => {
                const factors = settings.factors.filter((f) => f.id !== factor.id);
                const s = { ...settings, factors };
                saveSettings(s);
                setSettingsState(s);
                toast({ title: `Removed "${factor.label}"` });
              }}
            />
          ))}
          <AddFactorButton
            onAdd={(factor) => {
              const factors = [...settings.factors, factor];
              const s = { ...settings, factors };
              saveSettings(s);
              setSettingsState(s);
              toast({ title: `Added "${factor.label}"` });
            }}
          />
        </div>
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

function FactorRow({
  factor,
  isFirst,
  onUpdate,
  onDelete,
}: {
  factor: FactorDefinition;
  isFirst: boolean;
  onUpdate: (f: FactorDefinition) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(factor.label);
  const [factorType, setFactorType] = useState<"boolean" | "integer">(factor.type);

  const handleSave = () => {
    if (!label.trim()) return;
    onUpdate({ ...factor, label: label.trim(), type: factorType });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={cn("py-3", !isFirst && "border-t border-border/8")}>
        <div className="space-y-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Factor name"
            className="w-full bg-transparent text-sm text-foreground focus:outline-none border-b border-border/20 pb-1"
            autoFocus
            data-testid={`input-factor-label-${factor.id}`}
          />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFactorType("boolean")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-colors",
                factorType === "boolean"
                  ? "bg-zone-substance/20 text-zone-substance"
                  : "text-muted-foreground/40"
              )}
              data-testid={`button-type-boolean-${factor.id}`}
            >
              Switch
            </button>
            <button
              onClick={() => setFactorType("integer")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-colors",
                factorType === "integer"
                  ? "bg-zone-substance/20 text-zone-substance"
                  : "text-muted-foreground/40"
              )}
              data-testid={`button-type-integer-${factor.id}`}
            >
              Counter
            </button>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => {
                setEditing(false);
                setLabel(factor.label);
                setFactorType(factor.type);
              }}
              className="text-xs text-muted-foreground/50 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-destructive/70 px-3 py-1.5"
              data-testid={`button-delete-factor-${factor.id}`}
            >
              Delete
            </button>
            <button
              onClick={handleSave}
              className="text-xs text-zone-substance px-3 py-1.5"
              data-testid={`button-save-factor-${factor.id}`}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between py-3",
        !isFirst && "border-t border-border/8"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm text-foreground/80 truncate">{factor.label}</span>
        <span className="text-[10px] text-muted-foreground/30">
          {factor.type === "integer" ? "counter" : "switch"}
        </span>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="text-[10px] text-zone-substance-muted/50 uppercase tracking-wider px-2 py-1"
        data-testid={`button-edit-factor-${factor.id}`}
      >
        Edit
      </button>
    </div>
  );
}

function AddFactorButton({ onAdd }: { onAdd: (f: FactorDefinition) => void }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [factorType, setFactorType] = useState<"boolean" | "integer">("boolean");

  const handleAdd = () => {
    if (!label.trim()) return;
    const id = label.trim().toLowerCase().replace(/\s+/g, "_") + "_" + generateId().slice(-4);
    onAdd({ id, label: label.trim(), type: factorType });
    setLabel("");
    setFactorType("boolean");
    setAdding(false);
  };

  if (adding) {
    return (
      <div className="py-3 border-t border-border/8">
        <div className="space-y-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Factor name"
            className="w-full bg-transparent text-sm text-foreground focus:outline-none border-b border-border/20 pb-1"
            autoFocus
            data-testid="input-new-factor-label"
          />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFactorType("boolean")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-colors",
                factorType === "boolean"
                  ? "bg-zone-substance/20 text-zone-substance"
                  : "text-muted-foreground/40"
              )}
              data-testid="button-new-type-boolean"
            >
              Switch
            </button>
            <button
              onClick={() => setFactorType("integer")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-colors",
                factorType === "integer"
                  ? "bg-zone-substance/20 text-zone-substance"
                  : "text-muted-foreground/40"
              )}
              data-testid="button-new-type-integer"
            >
              Counter
            </button>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => {
                setAdding(false);
                setLabel("");
              }}
              className="text-xs text-muted-foreground/50 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!label.trim()}
              className={cn(
                "text-xs px-3 py-1.5",
                label.trim() ? "text-zone-substance" : "text-muted-foreground/20"
              )}
              data-testid="button-add-factor-confirm"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="flex items-center gap-2 py-3 border-t border-border/8 w-full"
      data-testid="button-add-factor"
    >
      <Plus className="w-3.5 h-3.5 text-zone-substance-muted/40" />
      <span className="text-xs text-zone-substance-muted/40">Add factor</span>
    </button>
  );
}

function SettingsTimeRow({
  label,
  value,
  onChange,
  testId,
  noBorder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  noBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        !noBorder && "border-b border-border/8"
      )}
      data-testid={testId}
    >
      <span className="text-sm text-foreground/50">{label}</span>
      <InlineTimePicker value={value} onChange={onChange} fadeBg="#0D1117" testId={`${testId}-picker`} />
    </div>
  );
}
