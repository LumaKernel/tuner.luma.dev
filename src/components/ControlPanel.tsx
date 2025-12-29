interface ControlPanelProps {
  readonly isActive: boolean;
  readonly onToggle: () => void;
  readonly onSave: () => void;
}

export function ControlPanel({
  isActive,
  onToggle,
  onSave,
}: ControlPanelProps) {
  return (
    <div className="flex gap-3 justify-center">
      <button
        onClick={onToggle}
        className={`
          px-6 py-3 rounded-lg font-medium text-lg transition-all
          ${
            isActive
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }
        `}
      >
        {isActive ? "停止" : "開始"}
      </button>

      <button
        onClick={onSave}
        disabled={!isActive}
        className={`
          px-6 py-3 rounded-lg font-medium text-lg transition-all
          ${
            isActive
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
          }
        `}
      >
        保存 (30秒)
      </button>
    </div>
  );
}
