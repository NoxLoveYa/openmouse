// Bridge can push a saved profile's DPI/polling rate over native HID only
// for brands it has a driver for (currently Pulsar, plus whatever the
// bundled Node helper covers — see OpenMouse-Bridge's drivers/mod.rs). For
// every other brand it deliberately does nothing but fire an OS notification
// telling the user to "open OpenMouse to apply it to this mouse" (see
// service.rs's Ok(false) branch) — this control panel, with a live WebHID
// connection, has a driver for every supported brand. This hook is that
// fallback: while a tab is open and Bridge is connected, it watches Bridge's
// own idea of the active profile and, when the profile targets the device
// currently open in this tab, applies it the same way any manual control
// would.
//
// There is no separate "default profile" concept here: Bridge has one
// (`/v1/default-profile`), but nothing writes to it, and the product intent
// is simpler — when the matched game closes and Bridge's activeProfile goes
// back to null, this restores whatever DPI/polling rate the mouse was
// actually using right before the profile was applied, captured the moment
// it was.
import { useEffect, useRef } from "react";
import * as control from "../device/controller";
import type { BridgeProfile } from "../bridge";
import { subscribeBridgeStatus } from "../bridge-status-store";
import { t } from "../i18n";
import type { ControlSnapshot } from "../device/types";

function signature(profile: BridgeProfile): string {
  return `${profile.application.name}|${profile.device.name}|${profile.settings.dpi}|${profile.settings.pollingRateHz}`;
}

interface PriorSettings {
  dpi: number | null;
  pollingRateHz: number | null;
}

export function useBridgeProfileApplier(snapshot: ControlSnapshot): void {
  const locale = snapshot.preferences.locale;
  const statusRef = useRef(snapshot.status);
  statusRef.current = snapshot.status;
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const appliedSignature = useRef<string | null>(null);
  const priorSettings = useRef<PriorSettings | null>(null);

  useEffect(() => subscribeBridgeStatus((bridge) => {
    const status = statusRef.current;
    const profile = bridge?.activeProfile ?? null;

    if (!profile || !status || profile.device.name !== status.name) {
      // Nothing (recognized) is active for this mouse right now. If we were
      // the one who applied a profile, put back what was there before it.
      if (appliedSignature.current !== null && priorSettings.current) {
        const prior = priorSettings.current;
        appliedSignature.current = null;
        priorSettings.current = null;
        let restoredAnything = false;
        if (prior.dpi != null) restoredAnything = control.applyDpiValue(prior.dpi) || restoredAnything;
        if (prior.pollingRateHz != null) {
          control.applyPollingRate(prior.pollingRateHz);
          restoredAnything = true;
        }
        if (restoredAnything) {
          control.pushToast("info", t(localeRef.current, "bridge.profileRestored"));
        }
      }
      return;
    }

    const sig = signature(profile);
    if (sig === appliedSignature.current) return;

    // First profile applied for this mouse since it was last "idle" —
    // remember what to go back to.
    if (appliedSignature.current === null) {
      priorSettings.current = { dpi: status.dpi ?? null, pollingRateHz: status.pollingRateHz ?? null };
    }
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
      control.pushToast("info", t(localeRef.current, "bridge.profileAppliedHere"), profile.application.name);
    }
  }), []);
}
