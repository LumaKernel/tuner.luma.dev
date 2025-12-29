interface ControlPanelProps {
  readonly onSave: () => void;
}

export function ControlPanel({ onSave }: ControlPanelProps) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onSave}
        className="px-6 py-3 rounded-lg font-medium text-lg transition-all bg-blue-600 hover:bg-blue-700 text-white"
      >
        保存 (30秒)
      </button>
    </div>
  );
}
