/**
 * マイク自動選択ロジック
 *
 * 環境: マイクの一覧（順番関係なし）のことを環境と呼ぶ。deviceIdの集合で表す。
 *
 * 自動選択の優先順位:
 * 1. 現在の環境に合致する選ばれたマイク情報があればそれを自動選択
 * 2. 直近の選択履歴から最新のものから順にチェックして、最初に存在するものを自動選択
 * 3. それらもなければ、現在の利用可能なマイクの最初のものを自動選択
 */

/**
 * 環境を表すキー（deviceIdのソート済み配列をJSON化）
 */
export type EnvironmentKey = string & { readonly __brand: "EnvironmentKey" };

/**
 * 環境ごとの選択履歴
 */
export type EnvironmentMicSelection = Readonly<Record<EnvironmentKey, string>>;

/**
 * 直近の選択履歴（最新が先頭）
 */
export type RecentMicSelections = readonly string[]; // deviceIds

/**
 * マイク選択の永続化データ
 */
export type MicSelectionState = {
  readonly environmentSelections: EnvironmentMicSelection;
  readonly recentSelections: RecentMicSelections;
};

/**
 * deviceIdの配列から環境キーを生成
 * 順番を無視してソートしてからJSON化
 */
export function createEnvironmentKey(
  deviceIds: readonly string[],
): EnvironmentKey {
  const sorted = [...deviceIds].sort();
  return JSON.stringify(sorted) as EnvironmentKey;
}

/**
 * 環境キーからdeviceIdの配列に復元
 */
export function parseEnvironmentKey(key: EnvironmentKey): readonly string[] {
  return JSON.parse(key) as readonly string[];
}

/**
 * 2つの環境が同じかどうかを判定
 */
export function isSameEnvironment(
  deviceIds1: readonly string[],
  deviceIds2: readonly string[],
): boolean {
  return createEnvironmentKey(deviceIds1) === createEnvironmentKey(deviceIds2);
}

/**
 * 自動選択するマイクを決定する
 *
 * @param availableDeviceIds 現在利用可能なデバイスIDの配列
 * @param state 選択履歴の状態
 * @param fallbackDeviceId デフォルトで選択するdeviceId（通常は最初のデバイス）
 * @returns 選択すべきdeviceId、または利用可能なデバイスがない場合はnull
 */
export function selectMicrophone(
  availableDeviceIds: readonly string[],
  state: MicSelectionState,
  fallbackDeviceId: string | null,
): string | null {
  if (availableDeviceIds.length === 0) {
    return null;
  }

  const availableSet = new Set(availableDeviceIds);
  const currentEnvKey = createEnvironmentKey(availableDeviceIds);

  // 1. 現在の環境に合致する選ばれたマイク情報があればそれを自動選択
  const environmentSelection = state.environmentSelections[currentEnvKey];
  if (
    environmentSelection !== undefined &&
    availableSet.has(environmentSelection)
  ) {
    return environmentSelection;
  }

  // 2. 直近の選択履歴から最新のものから順にチェックして、最初に存在するものを自動選択
  for (const deviceId of state.recentSelections) {
    if (availableSet.has(deviceId)) {
      return deviceId;
    }
  }

  // 3. それらもなければ、fallbackを自動選択（fallbackがnullまたは利用不可なら最初のデバイス）
  if (fallbackDeviceId !== null && availableSet.has(fallbackDeviceId)) {
    return fallbackDeviceId;
  }

  return availableDeviceIds[0] ?? null;
}

/**
 * ユーザーがマイクを明示的に選択した時に状態を更新する
 *
 * @param state 現在の状態
 * @param availableDeviceIds 現在利用可能なデバイスIDの配列
 * @param selectedDeviceId 選択されたdeviceId
 * @param maxRecentSelections 直近の選択履歴の最大件数
 * @returns 更新後の状態
 */
export function recordMicSelection(
  state: MicSelectionState,
  availableDeviceIds: readonly string[],
  selectedDeviceId: string,
  maxRecentSelections = 10,
): MicSelectionState {
  const currentEnvKey = createEnvironmentKey(availableDeviceIds);

  // 環境ごとの選択を更新
  const newEnvironmentSelections: EnvironmentMicSelection = {
    ...state.environmentSelections,
    [currentEnvKey]: selectedDeviceId,
  };

  // 直近の選択履歴を更新（重複を除去して先頭に追加）
  const filteredRecent = state.recentSelections.filter(
    (id) => id !== selectedDeviceId,
  );
  const newRecentSelections: RecentMicSelections = [
    selectedDeviceId,
    ...filteredRecent,
  ].slice(0, maxRecentSelections);

  return {
    environmentSelections: newEnvironmentSelections,
    recentSelections: newRecentSelections,
  };
}

/**
 * 空の状態を生成
 */
export function createEmptyMicSelectionState(): MicSelectionState {
  return {
    environmentSelections: {} as EnvironmentMicSelection,
    recentSelections: [],
  };
}

/**
 * 状態をサニタイズ（不正なデータを修正）
 */
export function sanitizeMicSelectionState(data: unknown): MicSelectionState {
  if (data === null || typeof data !== "object") {
    return createEmptyMicSelectionState();
  }

  const obj = data as Record<string, unknown>;

  // environmentSelectionsのサニタイズ
  let environmentSelections: EnvironmentMicSelection =
    {} as EnvironmentMicSelection;
  if (
    obj.environmentSelections !== null &&
    typeof obj.environmentSelections === "object"
  ) {
    const envSel = obj.environmentSelections as Record<string, unknown>;
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(envSel)) {
      if (typeof value === "string") {
        sanitized[key] = value;
      }
    }
    environmentSelections = sanitized as EnvironmentMicSelection;
  }

  // recentSelectionsのサニタイズ
  let recentSelections: RecentMicSelections = [];
  if (Array.isArray(obj.recentSelections)) {
    recentSelections = obj.recentSelections.filter(
      (item): item is string => typeof item === "string",
    );
  }

  return {
    environmentSelections,
    recentSelections,
  };
}
