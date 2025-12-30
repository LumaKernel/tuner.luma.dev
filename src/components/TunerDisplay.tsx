import { useMemo } from "react";
import type { PitchHistoryEntry, Notation, Accidental } from "@/types";
import { frequencyToMidi, getNoteNames } from "@/lib/noteUtils";

const DISPLAY_DURATION_MS = 10000;
const MIN_MIDI = 36; // C2
const MAX_MIDI = 84; // C6
const MIDI_RANGE = MAX_MIDI - MIN_MIDI;

// SVG viewBox dimensions
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 480;
const LABEL_WIDTH = 40;
const RIGHT_MARGIN = 10;

interface TunerDisplayProps {
  readonly pitchHistory: readonly PitchHistoryEntry[];
  readonly notation: Notation;
  readonly accidental: Accidental;
}

interface GridLine {
  readonly midi: number;
  readonly noteIndex: number;
  readonly octave: number;
  readonly y: number;
  readonly isC: boolean;
  readonly isNatural: boolean;
}

function midiToY(midi: number): number {
  return VIEW_HEIGHT - ((midi - MIN_MIDI) / MIDI_RANGE) * VIEW_HEIGHT;
}

function timestampToX(timestamp: number, now: number): number {
  const age = now - timestamp;
  const progress = age / DISPLAY_DURATION_MS;
  return VIEW_WIDTH - RIGHT_MARGIN - progress * (VIEW_WIDTH - LABEL_WIDTH - RIGHT_MARGIN);
}

// Gap threshold: if time between consecutive points exceeds this, start a new segment
const GAP_THRESHOLD_MS = 200;

interface PathPoint {
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
}

function buildPitchPath(
  entries: readonly PitchHistoryEntry[],
  now: number
): string {
  const points: readonly PathPoint[] = entries
    .filter((entry) => {
      const age = now - entry.timestamp;
      if (age >= DISPLAY_DURATION_MS) return false;
      const midi = frequencyToMidi(entry.frequency);
      return midi >= MIN_MIDI && midi <= MAX_MIDI;
    })
    .map((entry) => ({
      x: timestampToX(entry.timestamp, now),
      y: midiToY(frequencyToMidi(entry.frequency)),
      timestamp: entry.timestamp,
    }));

  if (points.length < 2) return "";

  // Build path with gaps: start new segment when time gap exceeds threshold
  return points
    .map((point, i) => {
      const prevPoint = points[i - 1];
      const isNewSegment =
        i === 0 ||
        (prevPoint && point.timestamp - prevPoint.timestamp > GAP_THRESHOLD_MS);
      return `${isNewSegment ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function GridLines({
  notation,
  accidental,
}: {
  readonly notation: Notation;
  readonly accidental: Accidental;
}) {
  const { lines, notes } = useMemo(() => {
    const noteNames = getNoteNames(notation, accidental);
    const gridLines: GridLine[] = [];

    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
      const noteIndex = midi % 12;
      const octave = Math.floor(midi / 12) - 1;
      const isC = noteIndex === 0;
      const isNatural = [0, 2, 4, 5, 7, 9, 11].includes(noteIndex);

      gridLines.push({
        midi,
        noteIndex,
        octave,
        y: midiToY(midi),
        isC,
        isNatural,
      });
    }

    return { lines: gridLines, notes: noteNames };
  }, [notation, accidental]);

  return (
    <g className="grid-lines">
      {lines.map((line) => (
        <g key={line.midi}>
          <line
            x1={LABEL_WIDTH}
            y1={line.y}
            x2={VIEW_WIDTH}
            y2={line.y}
            stroke={line.isC ? "#3f3f46" : "#27272a"}
            strokeWidth={line.isC ? 2 : 1}
          />
          {(line.isNatural || line.isC) && (
            <text
              x={LABEL_WIDTH - 5}
              y={line.y}
              textAnchor="end"
              dominantBaseline="middle"
              fill={line.isC ? "#a1a1aa" : "#52525b"}
              fontSize="12"
              fontFamily="system-ui, sans-serif"
            >
              {notes[line.noteIndex]}
              {line.octave}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

function CurrentIndicator({
  entry,
  now,
}: {
  readonly entry: PitchHistoryEntry | undefined;
  readonly now: number;
}) {
  if (!entry || now - entry.timestamp >= 200) {
    return null;
  }

  const midi = frequencyToMidi(entry.frequency);
  if (midi < MIN_MIDI || midi > MAX_MIDI) {
    return null;
  }

  const x = VIEW_WIDTH - RIGHT_MARGIN;
  const y = midiToY(midi);

  return (
    <g className="current-indicator">
      {/* Glow effect */}
      <circle cx={x} cy={y} r={20} fill="url(#glow-gradient)" />
      {/* Solid dot */}
      <circle cx={x} cy={y} r={6} fill="#22c55e" />
    </g>
  );
}

function TimeIndicator() {
  return (
    <line
      x1={VIEW_WIDTH - RIGHT_MARGIN}
      y1={0}
      x2={VIEW_WIDTH - RIGHT_MARGIN}
      y2={VIEW_HEIGHT}
      stroke="#3f3f46"
      strokeWidth={2}
      strokeDasharray="5 5"
    />
  );
}

export function TunerDisplay({
  pitchHistory,
  notation,
  accidental,
}: TunerDisplayProps) {
  // Calculate now once per render - updates come from pitchHistory changes
  const now = Date.now();

  const pathD = buildPitchPath(pitchHistory, now);
  const lastEntry = pitchHistory[pitchHistory.length - 1];

  return (
    <div className="h-full w-full rounded-lg border overflow-hidden bg-card">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="glow-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="50%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#0a0a0a" />

        {/* Grid lines with labels */}
        <GridLines notation={notation} accidental={accidental} />

        {/* Time indicator (current position line) */}
        <TimeIndicator />

        {/* Pitch history path */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#22c55e"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Current pitch indicator */}
        <CurrentIndicator entry={lastEntry} now={now} />
      </svg>
    </div>
  );
}
