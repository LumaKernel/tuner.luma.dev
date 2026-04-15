# 実行中タスク

**出典:** `tasks/inserted-tasks.md` 1行目

## 対象タスク

保存(n分)←こちらの保存時間についても、bpmと同様にローカル設定保存をいくつかできて、チップボタンのようなものを押すだけで、すぐ呼び出せるようにしよう。(6個などで固定でよいだろう)

## 計画

### テスト計画

- `src/lib/durationUtils.ts` を新規作成し、保存時間プリセットのバリデーション・フォーマット用ユーティリティを実装
- `src/lib/durationUtils.test.ts` にテストを追加
- sanitizeDurationPresets のテスト（無効値、個数不足、正常系）

### ストーリー計画

- UI変更あり: ControlPanel に BpmPresetButtons と同様のプリセットチップボタンを追加
- プリセット設定モーダルを追加（値のカスタマイズ用）

### 実装方針

1. **constants/audio.ts**: `DURATION_PRESETS_DEFAULT` を追加（例: [15, 30, 60, 90, 120, 180]秒）
2. **types/index.ts**: `Settings` に `durationPresets: readonly number[]` を追加
3. **hooks/useSettings.tsx**: `sanitizeDurationPresets` と defaultSettings への追加
4. **lib/durationUtils.ts**: フォーマット関数・バリデーション関数
5. **components/ControlPanel.tsx**: プリセットチップボタン + 設定モーダル（BPMプリセットと同じパターン）
6. **App.tsx**: durationPresets の wiring
