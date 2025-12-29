import { useRef, useEffect, useCallback } from "react";
import type { PitchHistoryEntry, Notation, Accidental } from "@/types";
import { frequencyToMidi, getNoteNames } from "@/lib/noteUtils";

const DISPLAY_DURATION_MS = 10000;
const MIN_MIDI = 36; // C2
const MAX_MIDI = 84; // C6
const MIDI_RANGE = MAX_MIDI - MIN_MIDI;

interface TunerDisplayProps {
  readonly pitchHistory: readonly PitchHistoryEntry[];
  readonly notation: Notation;
  readonly accidental: Accidental;
}

export function TunerDisplay({
  pitchHistory,
  notation,
  accidental,
}: TunerDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    const notes = getNoteNames(notation, accidental);
    const now = Date.now();
    const lineHeight = height / MIDI_RANGE;

    // Draw horizontal lines for each semitone
    ctx.strokeStyle = "#27272a";
    ctx.lineWidth = 1;
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
      const noteIndex = midi % 12;
      const octave = Math.floor(midi / 12) - 1;
      const y = height - (midi - MIN_MIDI) * lineHeight;

      // Highlight C notes
      if (noteIndex === 0) {
        ctx.strokeStyle = "#3f3f46";
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = "#27272a";
        ctx.lineWidth = 1;
      }

      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Draw note labels on left side (only for natural notes and C)
      const isNatural = [0, 2, 4, 5, 7, 9, 11].includes(noteIndex);
      if (isNatural || noteIndex === 0) {
        ctx.fillStyle = noteIndex === 0 ? "#a1a1aa" : "#52525b";
        ctx.fillText(`${notes[noteIndex]}${octave}`, 35, y);
      }
    }

    // Draw pitch history (karaoke-style scrolling)
    if (pitchHistory.length > 0) {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const relevantHistory = pitchHistory.filter(
        (entry) => now - entry.timestamp < DISPLAY_DURATION_MS
      );

      if (relevantHistory.length > 1) {
        ctx.beginPath();
        let started = false;

        for (let i = 0; i < relevantHistory.length; i++) {
          const entry = relevantHistory[i];
          const midi = frequencyToMidi(entry.frequency);

          if (midi < MIN_MIDI || midi > MAX_MIDI) continue;

          const x =
            width - ((now - entry.timestamp) / DISPLAY_DURATION_MS) * (width - 40);
          const y = height - (midi - MIN_MIDI) * lineHeight;

          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      // Draw current position indicator
      const lastEntry = relevantHistory[relevantHistory.length - 1];
      if (lastEntry && now - lastEntry.timestamp < 200) {
        const midi = frequencyToMidi(lastEntry.frequency);
        if (midi >= MIN_MIDI && midi <= MAX_MIDI) {
          const y = height - (midi - MIN_MIDI) * lineHeight;

          // Glowing dot
          const gradient = ctx.createRadialGradient(
            width - 10,
            y,
            0,
            width - 10,
            y,
            20
          );
          gradient.addColorStop(0, "#22c55e");
          gradient.addColorStop(0.5, "rgba(34, 197, 94, 0.3)");
          gradient.addColorStop(1, "rgba(34, 197, 94, 0)");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(width - 10, y, 20, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(width - 10, y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw center line (current time indicator)
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width - 10, 0);
    ctx.lineTo(width - 10, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [pitchHistory, notation, accidental]);

  useEffect(() => {
    let animationId: number;

    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [draw]);

  useEffect(() => {
    const handleResize = () => {
      draw();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-[300px] md:min-h-[400px] rounded-lg border border-zinc-800 overflow-hidden"
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
