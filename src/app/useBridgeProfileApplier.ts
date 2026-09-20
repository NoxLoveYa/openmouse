// Bridge can push a saved profile's DPI/polling rate over native HID only
// for brands it has a driver for (currently Pulsar, plus whatever the
// bundled Node helper covers — see OpenMouse-Bridge's drivers/mod.rs). For
// every other brand it deliberately does nothing but fire an OS notification
// telling the user to "open OpenMouse to apply it to this mouse" (see
// service.rs's Ok(false) branch) — this control panel, with a live WebHID
// connection, has a driver for every supported brand. This hook is that
// fallback: while a tab is open and Bridge is connected, it polls Bridge's
// own idea of the active profile and, when the profile targets the device
// currently open in this tab, applies it the same way any manual control
// would.
import { useEffect, useRef } from "react";
import * as control from "../device/controller";
import { bridgeStatus, type BridgeProfile } from "../bridge";
import { isBridgeHidActive, subscribeBridgeHidActive } from "../bridge-hid";
import { t } from "../i18n";
import type { ControlSnapshot } from "../device/types";

// Matches the cadence Bridge itself debounces foreground-app switches on
// (service.rs's PROFILE_DEBOUNCE), so this doesn't lag noticeably behind
// Bridge's own native path for the brands it does cover.
const POLL_MS = 3000;

function signature(profile: BridgeProfile): string {
  return `${profile.application.name}|${profile.device.name}|${profile.settings.dpi}|${profile.settings.pollingRateHz}`;
}

export function useBridgeProfileApplier(snapshot: ControlSnapshot): void {
  const locale = snapshot.preferences.locale;
  const statusRef = useRef(snapshot.status);
  statusRef.current = snapshot.status;
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const appliedSignature = useRef<string | null>(null);

  useEffect(() => {
    let active = isBridgeHidActive();
    const unsubscribe = subscribeBridgeHidActive((next) => { active = next; });

    const timer = setInterval(() => {
      if (!active) return;
      const status = statusRef.current;
      if (!status) return;
      void bridgeStatus().then((bridge) => {
        const profile = bridge.activeProfile;
        if (!profile || profile.device.name !== status.name) return;
        const sig = signature(profile);
        if (sig === appliedSignature.current) return;
        appliedSignature.current = sig;

        let appliedAnything = false;
        if (profile.settings.dpi != null) {
          appliedAnything = control.applyDpiValue(profile.settings.dpi) || appliedAnything;
        }
        if (profile.settings.pollingRateHz != null) {
          control.applyPollingRate(profile.settings.pollingRateHz);
          appliedAnything = true;
        }
        if (appliedAnything) {
          control.pushToast(
            "info",
            t(localeRef.current, "bridge.profileAppliedHere"),
            profile.application.name,
          );
        }
      }).catch(() => undefined);
    }, POLL_MS);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);
}
