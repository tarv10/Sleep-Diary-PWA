import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 56;
const VISIBLE_COUNT = 5;
const DRUM_HEIGHT = VISIBLE_COUNT * ITEM_HEIGHT;
const CENTER_OFFSET = Math.floor(VISIBLE_COUNT / 2) * ITEM_HEIGHT;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
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
    const scale = drum === "hour" ? 60 : 15;
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
    const scale = isDragging.current === "hour" ? 60 / ITEM_HEIGHT : 15 / ITEM_HEIGHT;
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
    const scale = drum === "hour" ? 60 / ITEM_HEIGHT : 15 / ITEM_HEIGHT;
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
  const currentHour = norm / 60;
  const currentMinuteQ = (norm % 60) / 15;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) { handleConfirm(); } }}
      data-testid="time-picker-overlay"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-[#161b22] rounded-t-2xl border-t border-border/20 pb-safe animate-in slide-in-from-bottom duration-200"
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

        <div className="flex items-center justify-center gap-0 px-8 py-4">
          <Drum
            type="hour"
            totalMinutes={totalMinutes}
            currentValue={currentHour}
            items={HOURS}
            onTouchStart={handleTouchStart("hour")}
            onWheel={handleWheel("hour")}
          />

          <div className="text-3xl font-light text-foreground/30 px-2 select-none">:</div>

          <Drum
            type="minute"
            totalMinutes={totalMinutes}
            currentValue={currentMinuteQ}
            items={MINUTES}
            onTouchStart={handleTouchStart("minute")}
            onWheel={handleWheel("minute")}
          />
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-md bg-zone-sleep/20 text-zone-sleep text-sm font-medium tracking-wide uppercase transition-colors active:bg-zone-sleep/30"
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

function Drum({ type, currentValue, items, onTouchStart, onWheel }: DrumProps) {
  const count = items.length;
  const intIndex = Math.floor(currentValue);
  const fraction = currentValue - intIndex;

  const renderCount = VISIBLE_COUNT + 4;
  const halfRender = Math.floor(renderCount / 2);

  return (
    <div
      className="relative overflow-hidden flex-1 touch-none select-none"
      style={{ height: DRUM_HEIGHT }}
      onTouchStart={onTouchStart}
      onWheel={onWheel}
      data-testid={`drum-${type}`}
    >
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 border-y border-zone-sleep/15"
        style={{ top: CENTER_OFFSET, height: ITEM_HEIGHT }}
      />

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
        const opacity = Math.max(0.05, 1 - distFromCenter * 0.35);
        const scale = Math.max(0.7, 1 - distFromCenter * 0.08);

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
            <span className="text-3xl font-light tabular-nums text-foreground">
              {items[itemIndex].toString().padStart(2, "0")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
