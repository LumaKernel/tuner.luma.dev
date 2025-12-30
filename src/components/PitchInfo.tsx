import { Card, CardContent } from "@/components/ui/card";
import type { PitchData, Notation, Accidental } from "@/types";
import {
  frequencyToCents,
  getNoteNameWithoutOctave,
  frequencyToOctave,
} from "@/lib/noteUtils";

type PitchInfoProps = {
  readonly pitch: PitchData;
  readonly notation: Notation;
  readonly accidental: Accidental;
};

export function PitchInfo({ pitch, notation, accidental }: PitchInfoProps) {
  const hasFrequency = pitch.frequency !== null;
  const frequency = pitch.frequency ?? 0;
  const cents = hasFrequency ? frequencyToCents(frequency) : 0;
  const noteName = hasFrequency
    ? getNoteNameWithoutOctave(frequency, notation, accidental)
    : "--";
  const octave = hasFrequency ? frequencyToOctave(frequency) : "";

  const centsDisplay = cents >= 0 ? `+${cents}` : `${cents}`;
  const centsColor =
    Math.abs(cents) < 5
      ? "text-green-500"
      : Math.abs(cents) < 15
        ? "text-yellow-500"
        : "text-red-500";

  const meterColor =
    Math.abs(cents) < 5
      ? "bg-green-500"
      : Math.abs(cents) < 15
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-4">
          {/* Note display */}
          <div className="flex items-baseline gap-1">
            <span className="text-5xl md:text-6xl font-bold tracking-tight">
              {noteName}
            </span>
            <span className="text-2xl md:text-3xl text-muted-foreground">
              {octave}
            </span>
          </div>

          {/* Frequency and cents */}
          <div className="text-right">
            <div className="text-2xl md:text-3xl font-mono">
              {hasFrequency ? frequency.toFixed(1) : "---.-"}
              <span className="text-sm text-muted-foreground ml-1">Hz</span>
            </div>
            <div className={`text-lg font-mono ${centsColor}`}>
              {hasFrequency ? centsDisplay : "---"}
              <span className="text-sm text-muted-foreground ml-1">cents</span>
            </div>
          </div>
        </div>

        {/* Cents meter */}
        <div className="mt-3 relative h-2 bg-muted rounded-full overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-0.5 h-full bg-border" />
          </div>
          {hasFrequency && (
            <div
              className={`absolute top-0 h-full w-3 rounded-full transition-all duration-75 ${meterColor}`}
              style={{
                left: `calc(50% + ${(cents / 50) * 50}% - 6px)`,
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
