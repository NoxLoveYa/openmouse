// Shown on the Home page only when OpenMouse Bridge is actually reachable —
// i.e. `navigator.hid` is currently Bridge's WebHID shim, not the browser's
// own implementation (see bridge-hid.ts). Confirms the connection and lists
// the games Bridge knows how to detect, which it syncs from the same
// `games.json` Desktop ships (github.com/OpenMouse-Project/Desktop), so this
// list always matches what Desktop's own Games page would show.
import { useEffect, useState, type ReactNode } from "react";
import { Gamepad2 } from "lucide-react";
import { bridgeGames, type BridgeGame, type BridgeStatus } from "../bridge";
import { isBridgeHidActive, subscribeBridgeHidActive } from "../bridge-hid";
import { subscribeBridgeStatus } from "../bridge-status-store";
import { t } from "../i18n";
import type { InterfaceLocale } from "../interface-preferences";

function useBridgeConnection(): { active: boolean; status: BridgeStatus | null; games: BridgeGame[] } {
  const [active, setActive] = useState(isBridgeHidActive());
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [games, setGames] = useState<BridgeGame[]>([]);

  useEffect(() => subscribeBridgeHidActive(setActive), []);
  useEffect(() => subscribeBridgeStatus(setStatus), []);

  useEffect(() => {
    if (!active) return;
    // The games list only changes with a commit to Desktop's repo, not
    // anything a session does — one fetch per connection is plenty, unlike
    // the status poll above.
    const controller = new AbortController();
    void bridgeGames(controller.signal).then(setGames).catch(() => undefined);
    return () => controller.abort();
  }, [active]);

  return { active, status, games };
}

export function BridgeCard({
  locale,
  onSelectGame,
}: {
  locale: InterfaceLocale;
  onSelectGame: (game: BridgeGame) => void;
}): ReactNode {
  const { active, status, games } = useBridgeConnection();
  if (!active) return null;

  return (
    <section className="bridge-card" aria-label={t(locale, "bridge.title")}>
      <div className="bridge-card-header">
        <span className="bridge-card-dot" aria-hidden="true" />
        <span className="bridge-card-title">{t(locale, "bridge.title")}</span>
        <span className="bridge-card-status">
          {t(locale, "bridge.connected")}
          {status?.version ? ` · v${status.version}` : ""}
        </span>
      </div>

      {games.length > 0 ? (
        <div className="bridge-card-games">
          <span className="bridge-card-games-label">{t(locale, "bridge.games")}</span>
          <ul className="bridge-card-games-list">
            {games.map((game) => (
              <li key={game.name}>
                <button type="button" className="bridge-card-game" onClick={() => onSelectGame(game)}>
                  <Gamepad2 size={13} strokeWidth={2} aria-hidden="true" />
                  {game.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
