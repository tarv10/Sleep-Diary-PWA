import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 72;
const VISIBLE_COUNT = 5;
const DRUM_HEIGHT = VISIBLE_COUNT * ITEM_HEIGHT;
const CENTER_OFFSET = Math.floor(VISIBLE_COUNT / 2) * ITEM_HEIGHT;
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const DECELERATION = 0.94;
const MIN_VELOCITY = 0.3;

function curvedDelta(dy: number, itemHeight: number): number {
  const normalized = dy / itemHeight;
  const curved = Math.sign(normalized) * Math.pow(Math.abs(normalized), 1.4);
  return curved * itemHeight;
}

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
  const [hourAlignOffset, setHourAlignOffset] = useState(() => {
    const n = normalizeMinutes(parseTime(value));
    return -(n % 60) / 60;
  });
  const hourAlignRef = useRef(hourAlignOffset);
  const hourAlignFrame = useRef<number>(0);
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
      cancelAnimationFrame(hourAlignFrame.current);
    };
  }, []);

  const animateHourAlign = useCallback((fromOffset: number, targetOffset: number) => {
    let current = fromOffset;
    const animate = () => {
      current += (targetOffset - current) * 0.18;
      if (Math.abs(targetOffset - current) < 0.005) {
        hourAlignRef.current = targetOffset;
        setHourAlignOffset(targetOffset);
        return;
      }
      hourAlignRef.current = current;
      setHourAlignOffset(current);
      hourAlignFrame.current = requestAnimationFrame(animate);
    };
    animate();
  }, []);

  const startHourAlign = useCallback((snappedMinutes: number) => {
    const n = normalizeMinutes(snappedMinutes);
    const minuteFrac = (n % 60) / 60;
    const target = -minuteFrac;
    animateHourAlign(hourAlignRef.current, target);
  }, [animateHourAlign]);

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
        startHourAlign(target);
        return;
      }
      totalMinutesRef.current = current;
      setTotalMinutes(current);
      animFrame.current = requestAnimationFrame(animate);
    };
    animate();
  }, [startHourAlign]);

  const handleTouchStart = useCallback((drum: "hour" | "minute") => (e: React.TouchEvent) => {
    cancelAnimationFrame(animFrame.current);
    cancelAnimationFrame(hourAlignFrame.current);
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
    const curved = curvedDelta(dy, ITEM_HEIGHT);
    const scale = isDragging.current === "hour" ? 30 / ITEM_HEIGHT : 7.5 / ITEM_HEIGHT;
    const newTotal = dragStartMinutes.current - curved * scale;

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
    const amplified = Math.sign(vel) * Math.pow(Math.abs(vel), 1.3);
    if (Math.abs(amplified) > 0.1) {
      snapAndAnimate(totalMinutesRef.current, amplified, drum);
    } else {
      const snapped = Math.round(totalMinutesRef.current / 15) * 15;
      animateToTarget(totalMinutesRef.current, snapped);
    }
  }, [snapAndAnimate, animateToTarget]);

  const handleWheel = useCallback((drum: "hour" | "minute") => (e: React.WheelEvent) => {
    e.preventDefault();
    cancelAnimationFrame(animFrame.current);
    cancelAnimationFrame(hourAlignFrame.current);
    const scale = drum === "hour" ? 30 / ITEM_HEIGHT : 7.5 / ITEM_HEIGHT;
    const delta = e.deltaY * scale;
    const newTotal = totalMinutesRef.current + delta;
    const snapped = Math.round(newTotal / 15) * 15;
    animateToTarget(totalMinutesRef.current, snapped);
  }, [animateToTarget]);

  const handleConfirm = () => {
    cancelAnimationFrame(animFrame.current);
    cancelAnimationFrame(hourAlignFrame.current);
    const snapped = Math.round(totalMinutes / 15) * 15;
    onChange(formatTime(snapped));
    onClose();
  };

  const norm = normalizeMinutes(totalMinutes);
  const hour24 = Math.floor(norm / 60);
  const currentHourFrac = hour24 + (norm % 60) / 60 + hourAlignOffset;
  const currentMinuteQ = (norm % 60) / 15;

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

        <div className="relative flex items-center justify-center gap-5 px-4 py-4">
          <Drum
            type="hour"
            totalMinutes={totalMinutes}
            currentValue={currentHourFrac}
            items={HOURS_24}
            onTouchStart={handleTouchStart("hour")}
            onWheel={handleWheel("hour")}
          />

          <div className="relative select-none" style={{ height: DRUM_HEIGHT, width: 8 }}>
            <div
              className="absolute inset-x-0 flex items-end justify-center pb-[13px] text-4xl font-light text-foreground/20 leading-none"
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
  const minuteInHour = norm % 60;
  const minuteProgress = minuteInHour / 60;

  const isHour = type === "hour";

  return (
    <div
      className="relative overflow-hidden touch-none select-none rounded-lg"
      style={{ height: DRUM_HEIGHT, width: type === "hour" ? 88 : 72 }}
      onTouchStart={onTouchStart}
      onWheel={onWheel}
      data-testid={`drum-${type}`}
    >
      <div className="absolute inset-0 pointer-events-none z-0 rounded-lg" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 100%)" }} />

      <div className="absolute left-0 top-0 bottom-0 pointer-events-none z-10" style={{ width: 1, background: "linear-gradient(to bottom, transparent 10%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.12) 60%, transparent 90%)" }} />
      <div className="absolute right-0 top-0 bottom-0 pointer-events-none z-10" style={{ width: 1, background: "linear-gradient(to bottom, transparent 10%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 60%, transparent 90%)" }} />

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
          if (hourVal === ownerHour24) {
            opacity = 1;
          } else {
            const nextHour = (ownerHour24 + 1) % 24;
            const prevHour = (ownerHour24 - 1 + 24) % 24;
            if (hourVal === nextHour) {
              const fade = minuteProgress > 0.85 ? (minuteProgress - 0.85) / 0.15 : 0;
              opacity = 0.1 + fade * 0.25;
            } else if (hourVal === prevHour) {
              const fade = minuteProgress < 0.15 ? (0.15 - minuteProgress) / 0.15 : 0;
              opacity = 0.1 + fade * 0.25;
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
            className={cn("absolute inset-x-0 flex items-end justify-center", isHour ? "pb-[10px]" : "pb-[9px]")}
            style={{
              height: ITEM_HEIGHT,
              transform: `translateY(${y}px) scale(${scale})`,
              opacity,
              willChange: "transform, opacity",
            }}
          >
            <span className={cn(
              "tabular-nums text-foreground leading-none",
              isHour ? "text-6xl font-semibold" : "text-4xl font-light"
            )}>
              {items[itemIndex].toString().padStart(2, "0")}
            </span>
          </div>
        );
      })}

    </div>
  );
}

const INLINE_ITEM_HEIGHT = 36;
const INLINE_VISIBLE = 3;
const INLINE_DRUM_HEIGHT = INLINE_VISIBLE * INLINE_ITEM_HEIGHT;
const INLINE_CENTER = Math.floor(INLINE_VISIBLE / 2) * INLINE_ITEM_HEIGHT;

interface InlineTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  fadeBg?: string;
  testId?: string;
  color?: string;
}

export function InlineTimePicker({ value, onChange, fadeBg = "#0D1117", testId, color }: InlineTimePickerProps) {
  const [totalMinutes, setTotalMinutes] = useState(() => parseTime(value));
  const totalMinutesRef = useRef(totalMinutes);
  const [hourAlignOffset, setHourAlignOffset] = useState(() => {
    const n = normalizeMinutes(parseTime(value));
    return -(n % 60) / 60;
  });
  const hourAlignRef = useRef(hourAlignOffset);
  const hourAlignFrame = useRef<number>(0);
  const isDragging = useRef<"hour" | "minute" | null>(null);
  const userTouched = useRef(false);
  const [settled, setSettled] = useState(false);
  const dragStartY = useRef(0);
  const dragStartMinutes = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const animFrame = useRef<number>(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    totalMinutesRef.current = totalMinutes;
  }, [totalMinutes]);

  useEffect(() => {
    const incoming = parseTime(value);
    if (Math.abs(normalizeMinutes(totalMinutesRef.current) - normalizeMinutes(incoming)) > 1) {
      setTotalMinutes(incoming);
      totalMinutesRef.current = incoming;
      const n = normalizeMinutes(incoming);
      const offset = -(n % 60) / 60;
      hourAlignRef.current = offset;
      setHourAlignOffset(offset);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrame.current);
      cancelAnimationFrame(hourAlignFrame.current);
    };
  }, []);

  const emitChange = useCallback((minutes: number) => {
    onChangeRef.current(formatTime(minutes));
  }, []);

  const animateHourAlign = useCallback((fromOffset: number, targetOffset: number) => {
    let current = fromOffset;
    const animate = () => {
      current += (targetOffset - current) * 0.18;
      if (Math.abs(targetOffset - current) < 0.005) {
        hourAlignRef.current = targetOffset;
        setHourAlignOffset(targetOffset);
        return;
      }
      hourAlignRef.current = current;
      setHourAlignOffset(current);
      hourAlignFrame.current = requestAnimationFrame(animate);
    };
    animate();
  }, []);

  const startHourAlign = useCallback((snappedMinutes: number) => {
    const n = normalizeMinutes(snappedMinutes);
    const minuteFrac = (n % 60) / 60;
    const target = -minuteFrac;
    animateHourAlign(hourAlignRef.current, target);
  }, [animateHourAlign]);

  const snapAndAnimate = useCallback((fromMinutes: number, vel: number, drum: "hour" | "minute") => {
    const scale = drum === "hour" ? 30 : 7.5;
    let currentMinutes = fromMinutes;
    let currentVelocity = vel * scale / INLINE_ITEM_HEIGHT;

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
      current += (target - current) * 0.25;
      if (Math.abs(target - current) < 0.5) {
        totalMinutesRef.current = target;
        setTotalMinutes(target);
        emitChange(target);
        startHourAlign(target);
        if (userTouched.current) setSettled(true);
        return;
      }
      totalMinutesRef.current = current;
      setTotalMinutes(current);
      animFrame.current = requestAnimationFrame(animate);
    };
    animate();
  }, [emitChange, startHourAlign]);

  const handleTouchStart = useCallback((drum: "hour" | "minute") => (e: React.TouchEvent) => {
    cancelAnimationFrame(animFrame.current);
    cancelAnimationFrame(hourAlignFrame.current);
    isDragging.current = drum;
    dragStartY.current = e.touches[0].clientY;
    dragStartMinutes.current = totalMinutesRef.current;
    lastY.current = e.touches[0].clientY;
    lastTime.current = Date.now();
    velocity.current = 0;
    userTouched.current = true;
    setSettled(false);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();

      const y = e.touches[0].clientY;
      const dy = y - dragStartY.current;
      const curved = curvedDelta(dy, INLINE_ITEM_HEIGHT);
      const scale = isDragging.current === "hour" ? 30 / INLINE_ITEM_HEIGHT : 7.5 / INLINE_ITEM_HEIGHT;
      const newTotal = dragStartMinutes.current - curved * scale;

      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0 && dt < 100) {
        velocity.current = (lastY.current - y) / dt;
      }
      lastY.current = y;
      lastTime.current = now;

      totalMinutesRef.current = newTotal;
      setTotalMinutes(newTotal);
    };

    const onEnd = () => {
      if (!isDragging.current) return;
      const drum = isDragging.current;
      isDragging.current = null;

      const vel = velocity.current;
      const amplified = Math.sign(vel) * Math.pow(Math.abs(vel), 1.3);
      if (Math.abs(amplified) > 0.1) {
        snapAndAnimate(totalMinutesRef.current, amplified, drum);
      } else {
        const snapped = Math.round(totalMinutesRef.current / 15) * 15;
        animateToTarget(totalMinutesRef.current, snapped);
      }
    };

    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [snapAndAnimate, animateToTarget]);

  const handleWheel = useCallback((drum: "hour" | "minute") => (e: React.WheelEvent) => {
    cancelAnimationFrame(animFrame.current);
    cancelAnimationFrame(hourAlignFrame.current);
    userTouched.current = true;
    setSettled(false);
    const scale = drum === "hour" ? 30 / INLINE_ITEM_HEIGHT : 7.5 / INLINE_ITEM_HEIGHT;
    const delta = e.deltaY * scale;
    const newTotal = totalMinutesRef.current + delta;
    const snapped = Math.round(newTotal / 15) * 15;
    animateToTarget(totalMinutesRef.current, snapped);
  }, [animateToTarget]);

  const norm = normalizeMinutes(totalMinutes);
  const hour24 = Math.floor(norm / 60);
  const currentHourFrac = hour24 + (norm % 60) / 60 + hourAlignOffset;
  const currentMinuteQ = (norm % 60) / 15;

  const fadeTop = `linear-gradient(to bottom, ${fadeBg} 0%, ${fadeBg}cc 30%, transparent 100%)`;
  const fadeBottom = `linear-gradient(to top, ${fadeBg} 0%, ${fadeBg}cc 30%, transparent 100%)`;

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center gap-0 select-none touch-none"
      data-testid={testId}
    >
      <InlineDrum
        type="hour"
        totalMinutes={totalMinutes}
        currentValue={currentHourFrac}
        items={HOURS_24}
        onTouchStart={handleTouchStart("hour")}
        onWheel={handleWheel("hour")}
        fadeTop={fadeTop}
        fadeBottom={fadeBottom}
        color={color}
        settled={settled}
      />

      <div className="relative select-none" style={{ height: INLINE_DRUM_HEIGHT, width: 8 }}>
        <div
          className="absolute inset-x-0 flex items-end justify-center pb-[6px] text-lg font-light leading-none text-foreground/25"
          style={{ top: INLINE_CENTER, height: INLINE_ITEM_HEIGHT }}
        >
          :
        </div>
      </div>

      <InlineDrum
        type="minute"
        totalMinutes={totalMinutes}
        currentValue={currentMinuteQ}
        items={MINUTES}
        onTouchStart={handleTouchStart("minute")}
        onWheel={handleWheel("minute")}
        fadeTop={fadeTop}
        fadeBottom={fadeBottom}
        color={color}
        settled={settled}
      />
    </div>
  );
}

interface InlineDrumProps {
  type: "hour" | "minute";
  totalMinutes: number;
  currentValue: number;
  items: number[];
  onTouchStart: (e: React.TouchEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  fadeTop: string;
  fadeBottom: string;
  color?: string;
  settled?: boolean;
}

function InlineDrum({ type, totalMinutes, currentValue, items, onTouchStart, onWheel, fadeTop, fadeBottom, color, settled }: InlineDrumProps) {
  const count = items.length;
  const intIndex = Math.floor(currentValue);
  const fraction = currentValue - intIndex;

  const renderCount = INLINE_VISIBLE + 4;
  const halfRender = Math.floor(renderCount / 2);

  const norm = normalizeMinutes(totalMinutes);
  const ownerHour24 = Math.floor(norm / 60);
  const minuteInHour = norm % 60;
  const minuteProgress = minuteInHour / 60;

  const isHour = type === "hour";

  return (
    <div
      className="relative overflow-hidden touch-none select-none rounded-md"
      style={{ height: INLINE_DRUM_HEIGHT, width: isHour ? 44 : 36 }}
      onTouchStart={onTouchStart}
      onWheel={onWheel}
      data-testid={`inline-drum-${type}`}
    >
      <div className="absolute inset-0 pointer-events-none z-0 rounded-md" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)" }} />

      <div className="absolute left-0 top-0 bottom-0 pointer-events-none z-10" style={{ width: 1, background: "linear-gradient(to bottom, transparent 10%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0.10) 60%, transparent 90%)" }} />
      <div className="absolute right-0 top-0 bottom-0 pointer-events-none z-10" style={{ width: 1, background: "linear-gradient(to bottom, transparent 10%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 60%, transparent 90%)" }} />

      <div className="absolute inset-x-0 top-0 pointer-events-none z-20" style={{ height: INLINE_CENTER, background: fadeTop }} />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none z-20" style={{ height: INLINE_CENTER, background: fadeBottom }} />

      {Array.from({ length: renderCount }, (_, i) => {
        const offset = i - halfRender;
        const itemIndex = ((intIndex + offset) % count + count) % count;
        const y = (offset - fraction) * INLINE_ITEM_HEIGHT + INLINE_CENTER;

        if (y < -INLINE_ITEM_HEIGHT || y > INLINE_DRUM_HEIGHT + INLINE_ITEM_HEIGHT) return null;

        const distFromCenter = Math.abs(offset - fraction);
        const scale = Math.max(0.7, 1 - distFromCenter * 0.08);

        let opacity: number;

        if (isHour) {
          const hourVal = items[itemIndex];
          if (hourVal === ownerHour24) {
            opacity = 1;
          } else {
            const nextHour = (ownerHour24 + 1) % 24;
            const prevHour = (ownerHour24 - 1 + 24) % 24;
            if (hourVal === nextHour) {
              const fade = minuteProgress > 0.85 ? (minuteProgress - 0.85) / 0.15 : 0;
              opacity = 0.1 + fade * 0.25;
            } else if (hourVal === prevHour) {
              const fade = minuteProgress < 0.15 ? (0.15 - minuteProgress) / 0.15 : 0;
              opacity = 0.1 + fade * 0.25;
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
            className={cn("absolute inset-x-0 flex items-end justify-center", isHour ? "pb-[4px]" : "pb-[3px]")}
            style={{
              height: INLINE_ITEM_HEIGHT,
              transform: `translateY(${y}px) scale(${scale})`,
              opacity,
              willChange: "transform, opacity",
            }}
          >
            <span
              className={cn(
                "tabular-nums leading-none text-foreground",
                isHour ? "text-2xl font-semibold" : "text-lg font-light"
              )}
              style={
                color && distFromCenter < 0.5
                  ? {
                      color: settled ? `color-mix(in srgb, ${color} 65%, white)` : undefined,
                      transition: settled ? "color 1.8s ease-in" : "color 0.15s ease-out",
                    }
                  : undefined
              }
            >
              {items[itemIndex].toString().padStart(2, "0")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
