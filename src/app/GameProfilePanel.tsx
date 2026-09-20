// Per-game DPI profile, pushed to OpenMouse Bridge's `/v1/profiles` so it
// keeps applying the moment Bridge sees the game come to the foreground —
// even with this tab closed. There is no browser-side equivalent: only
// Bridge watches running processes, so every profile here is Bridge-backed,
// unlike Desktop's local, localStorage-only game-profiles.ts.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import * as control from "../device/controller";
import type { BridgeGame, BridgeProfile } from "../bridge";
import { bridgeProfiles, saveBridgeProfiles } from "../bridge";
import { fetchGamesCatalog, gameArtwork, type CatalogGame } from "../games-catalog";
import type { ControlSnapshot, SidebarDevice, ToastKind } from "../device/types";
import { t, tp } from "../i18n";
import type { InterfaceLocale } from "../interface-preferences";

const DPI_PRESETS = [400, 800, 1600, 3200, 6400, 8000];
// Typing a custom DPI fires onChange per keystroke; waiting this long before
// pushing to Bridge (and toasting) keeps "1600" from becoming five separate
// saves and five separate toasts.
const CUSTOM_DPI_DEBOUNCE_MS = 600;

type NotifyKind = "enabled" | "updated" | "disabled" | null;

function notifyResult(locale: InterfaceLocale, gameName: string, kind: NotifyKind, ok: boolean): void {
  if (kind === null) return;
  if (!ok) {
    control.pushToast(
      "error",
      t(locale, "bridge.profileSaveFailed"),
      t(locale, "bridge.profileSaveFailedDetail"),
    );
    return;
  }
  const copy: Record<Exclude<NotifyKind, null>, [ToastKind, "bridge.profileEnabledDetail" | "bridge.profileUpdatedDetail" | "bridge.profileDisabledDetail"]> = {
    enabled: ["success", "bridge.profileEnabledDetail"],
    updated: ["success", "bridge.profileUpdatedDetail"],
    disabled: ["info", "bridge.profileDisabledDetail"],
  };
  const [toastKind, detailKey] = copy[kind];
  const titleKey = kind === "enabled" ? "bridge.profileEnabled" : kind === "updated" ? "bridge.profileUpdated" : "bridge.profileDisabled";
  control.pushToast(toastKind, t(locale, titleKey), tp(locale, detailKey, { name: gameName }));
}

function deviceBrand(device: SidebarDevice): string {
  return device.detail.split(" · ")[0] ?? "";
}

function deviceId(device: SidebarDevice): string {
  return `${deviceBrand(device)}:${device.name}`;
}

function matchesGame(profile: BridgeProfile, game: BridgeGame): boolean {
  return profile.application.name.toLowerCase() === game.name.toLowerCase();
}

export function GameProfilePanel({
  snapshot,
  game,
  onBack,
}: {
  snapshot: ControlSnapshot;
  game: BridgeGame;
  onBack: () => void;
}): ReactNode {
  const locale = snapshot.preferences.locale;
  const devices = snapshot.devices;

  const [catalogEntry, setCatalogEntry] = useState<CatalogGame | null>(null);
  const [dpi, setDpi] = useState<number | null>(null);
  const [customDpi, setCustomDpiText] = useState("");
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [autoApply, setAutoApply] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedForGame = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchGamesCatalog(controller.signal)
      .then((catalog) => {
        const match = catalog.find((entry) => entry.name.toLowerCase() === game.name.toLowerCase());
        setCatalogEntry(match ?? null);
      })
      .catch(() => setCatalogEntry(null));
    return () => controller.abort();
  }, [game.name]);

  useEffect(() => {
    if (loadedForGame.current === game.name) return;
    loadedForGame.current = game.name;
    const controller = new AbortController();
    void bridgeProfiles(controller.signal).then((profiles) => {
      const existing = profiles.find((profile) => matchesGame(profile, game));
      if (!existing) {
        setAutoApply(false);
        setDpi(null);
        setCustomDpiText("");
        setTargetIndex(devices.length > 0 ? 0 : null);
        return;
      }
      setAutoApply(true);
      setDpi(existing.settings.dpi ?? null);
      setCustomDpiText(existing.settings.dpi != null && !DPI_PRESETS.includes(existing.settings.dpi)
        ? String(existing.settings.dpi)
        : "");
      const matchedDevice = devices.findIndex((device) => deviceId(device) === existing.device.id);
      setTargetIndex(matchedDevice !== -1 ? matchedDevice : devices.length > 0 ? 0 : null);
    }).catch(() => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.name]);

  async function persist(
    next: { dpi: number | null; targetIndex: number | null; autoApply: boolean },
    notify: NotifyKind,
  ): Promise<void> {
    const target = next.targetIndex !== null ? devices[next.targetIndex] : undefined;
    setSaving(true);
    let ok = true;
    try {
      const profiles = await bridgeProfiles();
      const withoutThis = profiles.filter((profile) => !matchesGame(profile, game));
      if (next.autoApply && target) {
        const profile: BridgeProfile = {
          application: { name: game.name, executable: game.executables[0] ?? "", path: "" },
          device: { id: deviceId(target), name: target.name },
          settings: { dpi: next.dpi, pollingRateHz: null },
        };
        await saveBridgeProfiles([...withoutThis, profile]);
      } else {
        await saveBridgeProfiles(withoutThis);
      }
    } catch {
      // Bridge being briefly unreachable shouldn't block the form; the next
      // successful save (or the next page load's re-fetch) reconciles state
      // — but the user still needs to know THIS attempt didn't land.
      ok = false;
    } finally {
      setSaving(false);
    }
    notifyResult(locale, game.name, notify, ok);
  }

  const customDpiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (customDpiTimer.current !== null) clearTimeout(customDpiTimer.current);
  }, []);

  function pickDpi(value: number): void {
    setDpi(value);
    setCustomDpiText("");
    if (autoApply) void persist({ dpi: value, targetIndex, autoApply: true }, "updated");
  }

  function commitCustomDpi(raw: string): void {
    setCustomDpiText(raw);
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value) || value <= 0) return;
    setDpi(value);
    if (!autoApply) return;
    if (customDpiTimer.current !== null) clearTimeout(customDpiTimer.current);
    customDpiTimer.current = setTimeout(() => {
      void persist({ dpi: value, targetIndex, autoApply: true }, "updated");
    }, CUSTOM_DPI_DEBOUNCE_MS);
  }

  function selectTarget(index: number): void {
    setTargetIndex(index);
    if (autoApply) void persist({ dpi, targetIndex: index, autoApply: true }, "updated");
  }

  function toggleAutoApply(): void {
    const next = !autoApply;
    setAutoApply(next);
    void persist({ dpi, targetIndex, autoApply: next }, next ? "enabled" : "disabled");
  }

  const artwork = catalogEntry ? gameArtwork(catalogEntry) : null;

  return (
    <div className="game-profile-page">
      <button type="button" className="game-profile-back" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        {t(locale, "bridge.games")}
      </button>

      <div className="game-profile-layout">
        <div className="game-profile-side">
          <div className="game-profile-art" style={artwork ? undefined : { background: "linear-gradient(160deg, var(--ui-accent-soft), var(--surface-panel))" }}>
            {artwork ? (
              <img src={artwork} alt={game.name} loading="lazy" draggable={false} />
            ) : (
              <Gamepad2 size={40} strokeWidth={1.5} aria-hidden="true" />
            )}
          </div>
          <div className="game-profile-name-card">
            <span className="game-profile-name-label">PROFILE</span>
            <span className="game-profile-name">{game.name}</span>
          </div>
        </div>

        <div className="game-profile-settings">
          <section className="game-profile-section">
            <span className="game-profile-section-label">TARGET DEVICE</span>
            {devices.length === 0 ? (
              <p className="game-profile-empty">No devices detected yet.</p>
            ) : (
              <ul className="game-profile-devices">
                {devices.map((device, index) => (
                  <li key={device.index} className="game-profile-device-row">
                    <span className="game-profile-device-icon" aria-hidden="true">?</span>
                    <span className="game-profile-device-text">
                      <span className="game-profile-device-name">{device.name}</span>
                      <span className="game-profile-device-brand">{deviceBrand(device)}</span>
                    </span>
                    <button
                      type="button"
                      className={`game-profile-select${targetIndex === index ? " is-selected" : ""}`}
                      onClick={() => selectTarget(index)}
                    >
                      {targetIndex === index ? "Selected" : "Select"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="game-profile-section">
            <span className="game-profile-section-label">DPI</span>
            <span className="game-profile-section-title">Sensitivity</span>
            <div className="game-profile-dpi-grid">
              {DPI_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`game-profile-dpi-preset${dpi === preset ? " is-selected" : ""}`}
                  onClick={() => pickDpi(preset)}
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>
            <span className="game-profile-section-label game-profile-dpi-custom-label">DPI</span>
            <input
              type="number"
              className="game-profile-dpi-custom"
              placeholder="e.g. 1600"
              value={customDpi}
              onChange={(event) => commitCustomDpi(event.currentTarget.value)}
            />
          </section>

          <section className="game-profile-section game-profile-auto-apply">
            <div className="game-profile-auto-apply-text">
              <span className="game-profile-auto-apply-title">Apply automatically</span>
              <span className="game-profile-auto-apply-body">
                Push this profile to your mouse the moment {game.name} is detected running.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoApply}
              className={`game-profile-toggle${autoApply ? " is-on" : ""}`}
              disabled={saving || targetIndex === null}
              onClick={toggleAutoApply}
            >
              <span className="game-profile-toggle-thumb" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
