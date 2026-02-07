import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 72;
const VISIBLE_COUNT = 5;
const DRUM_HEIGHT = VISIBLE_COUNT * ITEM_HEIGHT;
const CENTER_OFFSET = Math.floor(VISIBLE_COUNT / 2) * ITEM_HEIGHT;
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
const MINUTES = [0, 15, 30, 45];
const DECELERATION = 0.94;
const MIN_VELOCITY = 0.3;

function normalizeMinutes(m: number): number {
  return ((m % 1440) + 1440) % 1440;
}

function parseTime(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(totalMinutes: number): string {
  const norm = normalizeMinutes(totalMinutes);
  const h = Math.floor(norm / 60);
  const m = Math.round(norm % 60);
  const snappedM = Math.round(m / 15) * 15;
  const finalM = snappedM === 60 ? 0 : snappedM;
  const finalH = snappedM === 60 ? (h + 1) % 24 : h;
  return `${finalH.toString().padStart(2, "0")}:${finalM.toString().padStart(2, "0")}`;
}

function to12Hour(hour24: number): number {
  const h = hour24 % 12;
  return h === 0 ? 12 : h;
}

function getAmPm(hour24: number): string {
  return hour24 < 12 ? "am" : "pm";
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  label?: string;
}

export default function TimePicker({ value, onChange, onClose, label }: TimePickerProps) {
  const [totalMinutes, setTotalMinutes] = useState(() => parseTime(value));
  const totalMinutesRef = useRef(totalMinutes);
  const isDragging = useRef<"hour" | "minute" | null>(null);
  const dragStartY = useRef(0);
  const dragStartMinutes = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const animFrame = useRef<number>(0);

  useEffect(() => {
    totalMinutesRef.current = totalMinutes;
  }, [totalMinutes]);

  useEffect(() => {
    setTotalMinutes(parseTime(value));
    totalMinutesRef.current = parseTime(value);
  }, [value]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrame.current);
    };
  }, []);

  const snapAndAnimate = useCallback((fromMinutes: number, vel: number, drum: "hour" | "minute") => {
    const scale = drum === "hour" ? 30 : 7.5;
    const pixelVelocity = vel;
    let currentMinutes = fromMinutes;
    let currentVelocity = pixelVelocity * scale / ITEM_HEIGHT;

    const animate = () => {
      currentVelocity *= DECELERATION;
      currentMinutes += currentVelocity;

      if (Math.abs(currentVelocity) < MIN_VELOCITY) {
        const snapped = Math.round(currentMinutes / 15) * 15;
        animateToTarget(currentMinutes, snapped);
        return;
      }

      totalMinutesRef.current = currentMinutes;
      setTotalMinutes(currentMinutes);
      animFrame.current = requestAnimationFrame(animate);
    };

    animate();
  }, []);

  const animateToTarget = useCallback((from: number, target: number) => {
    let current = from;
    const animate = () => {
      current += (target - current) * 0.2;
      if (Math.abs(target - current) < 0.5) {
        totalMinutesRef.current = target;
        setTotalMinutes(target);
        return;
      }
      totalMinutesRef.current = current;
      setTotalMinutes(current);
      animFrame.current = requestAnimationFrame(animate);
    };
    animate();
  }, []);

  const handleTouchStart = useCallback((drum: "hour" | "minute") => (e: React.TouchEvent) => {
    cancelAnimationFrame(animFrame.current);
    isDragging.current = drum;
    dragStartY.current = e.touches[0].clientY;
    dragStartMinutes.current = totalMinutesRef.current;
    lastY.current = e.touches[0].clientY;
    lastTime.current = Date.now();
    velocity.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();

    const y = e.touches[0].clientY;
    const dy = y - dragStartY.current;
    const scale = isDragging.current === "hour" ? 30 / ITEM_HEIGHT : 7.5 / ITEM_HEIGHT;
    const newTotal = dragStartMinutes.current - dy * scale;

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0 && dt < 100) {
      velocity.current = (lastY.current - y) / dt;
    }
    lastY.current = y;
    lastTime.current = now;

    totalMinutesRef.current = newTotal;
    setTotalMinutes(newTotal);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    const drum = isDragging.current;
    isDragging.current = null;

    const vel = velocity.current;
    if (Math.abs(vel) > 0.1) {
      snapAndAnimate(totalMinutesRef.current, vel, drum);
    } else {
      const snapped = Math.round(totalMinutesRef.current / 15) * 15;
      animateToTarget(totalMinutesRef.current, snapped);
    }
  }, [snapAndAnimate, animateToTarget]);

  const handleWheel = useCallback((drum: "hour" | "minute") => (e: React.WheelEvent) => {
    e.preventDefault();
    cancelAnimationFrame(animFrame.current);
    const scale = drum === "hour" ? 30 / ITEM_HEIGHT : 7.5 / ITEM_HEIGHT;
    const delta = e.deltaY * scale;
    const newTotal = totalMinutesRef.current + delta;
    const snapped = Math.round(newTotal / 15) * 15;
    animateToTarget(totalMinutesRef.current, snapped);
  }, [animateToTarget]);

  const handleConfirm = () => {
    cancelAnimationFrame(animFrame.current);
    const snapped = Math.round(totalMinutes / 15) * 15;
    onChange(formatTime(snapped));
    onClose();
  };

  const norm = normalizeMinutes(totalMinutes);
  const hour24 = Math.floor(norm / 60);
  const currentHour12 = to12Hour(hour24);
  const hour12Index = HOURS_12.indexOf(currentHour12);
  const currentHourFrac = hour12Index + (norm % 60) / 60;
  const currentMinuteQ = (norm % 60) / 15;
  const ampm = getAmPm(hour24);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) { handleConfirm(); } }}
      data-testid="time-picker-overlay"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-[#161b22] rounded-t-2xl border-t border-border/20 pb-safe animate-in slide-in-from-bottom duration-200 select-none"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {label && (
          <div className="text-center pt-5 pb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zone-sleep-muted font-medium">
              {label}
            </span>
          </div>
        )}

        <div className="relative flex items-center justify-center gap-0 px-4 py-4">
          <Drum
            type="hour"
            totalMinutes={totalMinutes}
            currentValue={currentHourFrac}
            items={HOURS_12}
            onTouchStart={handleTouchStart("hour")}
            onWheel={handleWheel("hour")}
          />

          <div className="relative select-none -mx-2" style={{ height: DRUM_HEIGHT }}>
            <div
              className="absolute inset-x-0 flex items-center justify-center text-5xl font-light text-foreground/20"
              style={{ top: CENTER_OFFSET, height: ITEM_HEIGHT }}
            >
              :
            </div>
          </div>

          <Drum
            type="minute"
            totalMinutes={totalMinutes}
            currentValue={currentMinuteQ}
            items={MINUTES}
            onTouchStart={handleTouchStart("minute")}
            onWheel={handleWheel("minute")}
          />

          <div className="ml-1">
            <AmPmDrum totalMinutes={totalMinutes} />
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-md bg-zone-sleep/20 text-zone-sleep text-sm font-medium tracking-wide uppercase transition-colors active:bg-zone-sleep/30 select-none"
            data-testid="button-time-confirm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface DrumProps {
  type: "hour" | "minute";
  totalMinutes: number;
  currentValue: number;
  items: number[];
  onTouchStart: (e: React.TouchEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
}

function Drum({ type, totalMinutes, currentValue, items, onTouchStart, onWheel }: DrumProps) {
  const count = items.length;
  const intIndex = Math.floor(currentValue);
  const fraction = currentValue - intIndex;

  const renderCount = VISIBLE_COUNT + 4;
  const halfRender = Math.floor(renderCount / 2);

  const norm = normalizeMinutes(totalMinutes);
  const ownerHour24 = Math.floor(norm / 60);
  const ownerHour12 = to12Hour(ownerHour24);
  const minuteInHour = norm % 60;
  const minuteProgress = minuteInHour / 60;

  const isHour = type === "hour";

  return (
    <div
      className="relative overflow-hidden touch-none select-none"
      style={{ height: DRUM_HEIGHT, width: type === "hour" ? 88 : 72 }}
      onTouchStart={onTouchStart}
      onWheel={onWheel}
      data-testid={`drum-${type}`}
    >
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-20"
        style={{
          height: CENTER_OFFSET,
          background: "linear-gradient(to bottom, #161b22 0%, #161b22cc 40%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
        style={{
          height: CENTER_OFFSET,
          background: "linear-gradient(to top, #161b22 0%, #161b22cc 40%, transparent 100%)",
        }}
      />

      {Array.from({ length: renderCount }, (_, i) => {
        const offset = i - halfRender;
        const itemIndex = ((intIndex + offset) % count + count) % count;
        const y = (offset - fraction) * ITEM_HEIGHT + CENTER_OFFSET;

        if (y < -ITEM_HEIGHT || y > DRUM_HEIGHT + ITEM_HEIGHT) return null;

        const distFromCenter = Math.abs(offset - fraction);
        const scale = Math.max(0.7, 1 - distFromCenter * 0.08);

        let opacity: number;

        if (isHour) {
          const hourVal = items[itemIndex];
          if (hourVal === ownerHour12) {
            opacity = 1;
          } else {
            const nextHour12 = to12Hour((ownerHour24 + 1) % 24);
            const prevHour12 = to12Hour((ownerHour24 - 1 + 24) % 24);
            if (hourVal === nextHour12) {
              const fade = minuteProgress > 0.75 ? (minuteProgress - 0.75) * 4 : 0;
              opacity = 0.12 + fade * 0.5;
            } else if (hourVal === prevHour12) {
              const fade = minuteProgress < 0.25 ? (0.25 - minuteProgress) * 4 : 0;
              opacity = 0.12 + fade * 0.5;
            } else {
              opacity = 0.08;
            }
          }
        } else {
          opacity = Math.max(0.08, 1 - distFromCenter * 0.4);
        }

        return (
          <div
            key={i}
            className="absolute inset-x-0 flex items-center justify-center"
            style={{
              height: ITEM_HEIGHT,
              transform: `translateY(${y}px) scale(${scale})`,
              opacity,
              willChange: "transform, opacity",
            }}
          >
            <span className={cn(
              "tabular-nums text-foreground",
              isHour ? "text-6xl font-semibold" : "text-4xl font-light"
            )}>
              {isHour
                ? items[itemIndex].toString()
                : items[itemIndex].toString().padStart(2, "0")
              }
            </span>
          </div>
        );
      })}

    </div>
  );
}

const AMPM_ITEMS = ["am", "pm"];
const AMPM_ITEM_HEIGHT = ITEM_HEIGHT;
const AMPM_DRUM_HEIGHT = DRUM_HEIGHT;
const AMPM_CENTER = CENTER_OFFSET;

function AmPmDrum({ totalMinutes }: { totalMinutes: number }) {
  const norm = normalizeMinutes(totalMinutes);
  const scrollPos = ((norm - 360) % 1440 + 1440) % 1440 / 720;

  const isAM = norm < 720;

  const nearestAm = Math.round(scrollPos / 2) * 2;
  const nearestPm = Math.round((scrollPos - 1) / 2) * 2 + 1;

  const items = [
    { label: "am", pos: nearestAm, active: isAM },
    { label: "pm", pos: nearestPm, active: !isAM },
  ];

  return (
    <div
      className="relative overflow-hidden touch-none select-none"
      style={{ height: AMPM_DRUM_HEIGHT, width: 36 }}
    >
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-20"
        style={{
          height: AMPM_CENTER,
          background: "linear-gradient(to bottom, #161b22 0%, #161b22cc 40%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
        style={{
          height: AMPM_CENTER,
          background: "linear-gradient(to top, #161b22 0%, #161b22cc 40%, transparent 100%)",
        }}
      />

      {items.map(({ label, pos, active }) => {
        const dist = pos - scrollPos;
        const y = dist * AMPM_ITEM_HEIGHT + AMPM_CENTER;

        if (y < -AMPM_ITEM_HEIGHT || y > AMPM_DRUM_HEIGHT + AMPM_ITEM_HEIGHT) return null;

        const absDist = Math.abs(dist);
        const spatial = Math.max(0.08, 1 - absDist * 0.6);
        const opacity = active ? spatial : spatial * 0.15;
        const scale = Math.max(0.7, 1 - absDist * 0.08);

        return (
          <div
            key={label}
            className="absolute inset-x-0 flex items-center justify-center"
            style={{
              height: AMPM_ITEM_HEIGHT,
              transform: `translateY(${y}px) scale(${scale})`,
              opacity,
              transition: "opacity 0.6s ease",
              willChange: "transform, opacity",
            }}
          >
            <span className="text-lg font-medium text-white">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
