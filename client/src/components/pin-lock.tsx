import { useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSettings, setUnlocked } from "@/lib/storage";

interface PinLockProps {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const settings = getSettings();

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);

    if (next.length === 4) {
      if (next === settings.pin) {
        setUnlocked(true);
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 600);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      <div className="text-center mb-16">
        <h1 className="text-base font-medium text-muted-foreground mb-10 uppercase tracking-[0.2em]">
          Sleep
        </h1>
        <div className="flex gap-5 justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200",
                i < pin.length
                  ? error
                    ? "bg-destructive scale-110"
                    : "bg-primary"
                  : "bg-muted"
              )}
              data-testid={`pin-dot-${i}`}
            />
          ))}
        </div>
        {error && (
          <p className="text-xs text-destructive mt-4 transition-opacity">
            Incorrect PIN
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-x-10 gap-y-5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            className="w-18 h-18 rounded-full flex items-center justify-center text-2xl font-light text-foreground active:bg-muted/30 transition-colors"
            style={{ width: "72px", height: "72px" }}
            data-testid={`pin-key-${digit}`}
          >
            {digit}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit("0")}
          className="w-18 h-18 rounded-full flex items-center justify-center text-2xl font-light text-foreground active:bg-muted/30 transition-colors"
          style={{ width: "72px", height: "72px" }}
          data-testid="pin-key-0"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-18 h-18 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/30 transition-colors"
          style={{ width: "72px", height: "72px" }}
          data-testid="pin-key-delete"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
