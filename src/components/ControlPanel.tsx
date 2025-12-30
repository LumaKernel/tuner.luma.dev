import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ControlPanelProps {
  readonly onSave: () => void;
}

export function ControlPanel({ onSave }: ControlPanelProps) {
  return (
    <div className="flex justify-center">
      <Button onClick={onSave} size="lg">
        <Save />
        保存 (30秒)
      </Button>
    </div>
  );
}
