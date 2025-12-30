interface ChannelVolume {
  readonly rms: number;
  readonly dB: number;
  readonly peak: number;
  readonly peakDb: number;
}

interface VolumeLevel {
  readonly left: ChannelVolume;
  readonly right: ChannelVolume;
  readonly mono: ChannelVolume;
  readonly isStereo: boolean;
}

interface VolumeLevelProps {
  readonly volume: VolumeLevel | null;
}

const MIN_DB = -60;
const MAX_DB = 0;

// dBを0-1の範囲に正規化
function normalizeDb(db: number): number {
  const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
  return (clamped - MIN_DB) / (MAX_DB - MIN_DB);
}

// ゲージの色を決定（緑→黄→赤）
function getGaugeGradient(): string {
  return "linear-gradient(to right, #22c55e 0%, #22c55e 60%, #eab308 75%, #ef4444 90%, #ef4444 100%)";
}

interface ChannelGaugeProps {
  readonly label: string;
  readonly channel: ChannelVolume;
}

function ChannelGauge({ label, channel }: ChannelGaugeProps) {
  const level = normalizeDb(channel.dB);
  const peakLevel = normalizeDb(channel.peakDb);
  const displayDb = channel.dB > MIN_DB ? channel.dB.toFixed(1) : "-∞";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-4 shrink-0">{label}</span>
      <div className="relative flex-1 h-4 bg-muted rounded overflow-hidden">
        {/* グラデーション背景（薄く表示） */}
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: getGaugeGradient() }}
        />
        {/* 実際のレベル */}
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-75"
          style={{
            width: `${level * 100}%`,
            background: getGaugeGradient(),
          }}
        />
        {/* ピークインジケーター */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white/80 transition-[left] duration-75"
          style={{ left: `${peakLevel * 100}%` }}
        />
        {/* dB目盛り */}
        <div className="absolute inset-0 flex items-center justify-between px-1">
          <span className="text-[8px] text-white/50 mix-blend-difference">-60</span>
          <span className="text-[8px] text-white/50 mix-blend-difference">-40</span>
          <span className="text-[8px] text-white/50 mix-blend-difference">-20</span>
          <span className="text-[8px] text-white/50 mix-blend-difference">0</span>
        </div>
      </div>
      <span className="text-xs font-mono w-14 text-right shrink-0">
        {displayDb} dB
      </span>
    </div>
  );
}

export function VolumeLevel({ volume }: VolumeLevelProps) {
  if (!volume) {
    return (
      <div className="space-y-1 opacity-50">
        <ChannelGauge
          label="L"
          channel={{ rms: 0, dB: MIN_DB, peak: 0, peakDb: MIN_DB }}
        />
        <ChannelGauge
          label="R"
          channel={{ rms: 0, dB: MIN_DB, peak: 0, peakDb: MIN_DB }}
        />
      </div>
    );
  }

  // ステレオかモノラルかで表示を変える
  if (volume.isStereo) {
    return (
      <div className="space-y-1">
        <ChannelGauge label="L" channel={volume.left} />
        <ChannelGauge label="R" channel={volume.right} />
      </div>
    );
  }

  // モノラルの場合
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-4 shrink-0">M</span>
        <div className="relative flex-1 h-5 bg-muted rounded overflow-hidden">
          {/* グラデーション背景（薄く表示） */}
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: getGaugeGradient() }}
          />
          {/* 実際のレベル */}
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-75"
            style={{
              width: `${normalizeDb(volume.mono.dB) * 100}%`,
              background: getGaugeGradient(),
            }}
          />
          {/* ピークインジケーター */}
          <div
            className="absolute inset-y-0 w-0.5 bg-white/80 transition-[left] duration-75"
            style={{ left: `${normalizeDb(volume.mono.peakDb) * 100}%` }}
          />
          {/* dB目盛り */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            <span className="text-[8px] text-white/50 mix-blend-difference">-60</span>
            <span className="text-[8px] text-white/50 mix-blend-difference">-40</span>
            <span className="text-[8px] text-white/50 mix-blend-difference">-20</span>
            <span className="text-[8px] text-white/50 mix-blend-difference">0</span>
          </div>
        </div>
        <span className="text-xs font-mono w-14 text-right shrink-0">
          {volume.mono.dB > MIN_DB ? volume.mono.dB.toFixed(1) : "-∞"} dB
        </span>
      </div>
    </div>
  );
}
