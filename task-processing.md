## 実行中タスク

**出典:** `tasks/inserted-tasks.md`

カードコンポーネントのパディング不均衡解消・クリッカブル領域修正・ポインターカーソル表示

### 問題分析

- `Card` (`data-slot="card"`) に `py-6` → 上下 1.5rem
- `CardContent` (`data-slot="card-content"`) に AudioToolsPanel が `pt-4` を追加 → 上に追加 1rem
- 結果: 上 2.5rem / 下 1.5rem でアンバランス
- カード全体ではなく内部の `<button>` のみがクリッカブル → カード領域をタップしても開閉しない
- ポインターカーソルが表示されない

### 修正方針

1. **パディング修正:** Card の `py-6` を活かしつつ、CardContent の `pt-4` を除去。Card 自体のパディングで十分
2. **クリッカブル領域:** Card 全体をクリッカブルにする。`onClick` を Card に移動し、`cursor-pointer` を追加
3. **カーソル:** `cursor-pointer` を Card に追加

### テスト計画

- この変更は純粋なUIスタイル変更のため、新規ユニットテストは不要
- 既存のStorybookがあれば確認（AudioToolsPanelのストーリー有無を確認）

### ストーリー計画

- AudioToolsPanelのストーリーがなければ作成を検討（ただしhooks依存が重いため今回はスコープ外）
