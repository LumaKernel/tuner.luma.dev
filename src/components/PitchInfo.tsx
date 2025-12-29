import type { PitchData, Notation, Accidental } from "@/types";
import {
  frequencyToCents,
  getNoteNameWithoutOctave,
  frequencyToOctave,
} from "@/lib/noteUtils";

interface PitchInfoProps {
  readonly pitch: PitchData;
  readonly notation: Notation;
  readonly accidental: Accidental;
  readonly movableDo: boolean;
  readonly baseNote: number;
}

export function PitchInfo({
  pitch,
  notation,
  accidental,
  movableDo,
  baseNote,
}: PitchInfoProps) {
  const hasFrequency = pitch.frequency !== null;
  const frequency = pitch.frequency ?? 0;
  const cents = hasFrequency ? frequencyToCents(frequency) : 0;
  const noteName = hasFrequency
    ? getNoteNameWithoutOctave(frequency, notation, accidental, movableDo, baseNote)
    : "--";
  const octave = hasFrequency ? frequencyToOctave(frequency) : "";

  const centsDisplay = cents >= 0 ? `+${cents}` : `${cents}`;
  const centsColor =
    Math.abs(cents) < 5
      ? "text-green-500"
      : Math.abs(cents) < 15
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
      <div className="flex items-center justify-between gap-4">
        {/* Note display */}
        <div className="flex items-baseline gap-1">
          <span className="text-5xl md:text-6xl font-bold tracking-tight">
            {noteName}
          </span>
          <span className="text-2xl md:text-3xl text-zinc-400">{octave}</span>
        </div>

        {/* Frequency and cents */}
        <div className="text-right">
          <div className="text-2xl md:text-3xl font-mono">
            {hasFrequency ? frequency.toFixed(1) : "---.-"}
            <span className="text-sm text-zinc-500 ml-1">Hz</span>
          </div>
          <div className={`text-lg font-mono ${centsColor}`}>
            {hasFrequency ? centsDisplay : "---"}
            <span className="text-sm text-zinc-500 ml-1">cents</span>
          </div>
        </div>
      </div>

      {/* Cents meter */}
      <div className="mt-3 relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-0.5 h-full bg-zinc-600" />
        </div>
        {hasFrequency && (
          <div
            className={`absolute top-0 h-full w-3 rounded-full transition-all duration-75 ${
              Math.abs(cents) < 5
                ? "bg-green-500"
                : Math.abs(cents) < 15
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{
              left: `calc(50% + ${(cents / 50) * 50}% - 6px)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
