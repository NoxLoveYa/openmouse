import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CAPTURE_ACTIONS,
  diffSectors,
  formatCaptureMarkdown,
  formatProfileVerificationMarkdown,
  formatProfileWriteProbeBackupMarkdown,
  formatProfileWriteProbeReportMarkdown,
  type SectorBytes,
  type SectorDiff,
} from "../capture-format";
import { captureContext } from "../capture-context";
import { t } from "../i18n";
import type { InterfaceLocale } from "../interface-preferences";

export function CaptureDialog({ open, onClose, locale = "en" }: { open: boolean; onClose: () => void; locale?: InterfaceLocale }): ReactNode {
  const dialog = useRef<HTMLDialogElement>(null);
  const [snapshot, setSnapshot] = useState<Map<number, Uint8Array> | null>(null);
  const [diffs, setDiffs] = useState<SectorDiff[]>([]);
  const [sectors, setSectors] = useState<SectorBytes[]>([]);
  const [selectedActions, setSelectedActions] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open) {
      if (typeof element.showModal === "function") element.showModal();
      else element.setAttribute("open", "");
    } else if (typeof element.close === "function") {
      if (element.open) element.close();
    } else {
      element.removeAttribute("open");
    }
  }, [open]);

  const context = captureContext();
  const probe = context.writeProbe;

  async function takeSnapshot(): Promise<void> {
    if (!context.profiles) {
      setMessage("Connect a Logitech mouse with onboard profiles first.");
      return;
    }
    setMessage("Reading profiles…");
    try {
      const read = await context.profiles.read();
      const next = new Map(read.map((entry) => [entry.sector, entry.bytes]));
      setSnapshot(next);
      setDiffs([]);
      setMessage(`Snapshot taken (${next.size} profiles). Change one setting in G HUB or Onboard Memory Manager, then press Compare.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read profiles.");
    }
  }

  async function compareSnapshot(): Promise<void> {
    if (!context.profiles || !snapshot) {
      setMessage("Take a snapshot first.");
      return;
    }
    setMessage("Re-reading profiles…");
    try {
      const sectorsNow = await context.profiles.read();
      setSectors(sectorsNow.map((entry) => ({
        sector: entry.sector,
        before: snapshot.get(entry.sector) ?? entry.bytes,
        after: entry.bytes,
      })));
      const next = sectorsNow.map((entry) => {
        const before = snapshot.get(entry.sector) ?? entry.bytes;
        const changes = diffSectors(before, entry.bytes, (offset) => context.profiles!.describeOffset(offset));
        if (changes.length === 0) return { sector: entry.sector, changes };
        const reproduced = context.profiles!.reproduce(before, entry.bytes);
        const unreproduced = [...entry.bytes].flatMap((byte, offset) =>
          (reproduced[offset] === byte ? [] : [offset]));
        return { sector: entry.sector, changes, unreproduced };
      });
      setDiffs(next);

      const total = next.reduce((sum, diff) => sum + diff.changes.length, 0);
      const failed = next.reduce((sum, diff) => sum + (diff.unreproduced?.length ?? 0), 0);
      setMessage(total === 0
        ? "No profile bytes changed."
        : failed === 0
          ? `${total} byte(s) changed — write path verified, OpenMouse reproduces this exactly.`
          : `${total} byte(s) changed, ${failed} not reproducible by OpenMouse yet.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read profiles.");
    }
  }

  const changed = diffs.filter((diff) => diff.changes.length > 0);

  return (
    <dialog
      id="capture-dialog"
      ref={dialog}
      className="capture-dialog"
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      onClose={onClose}
    >
      <div className="capture-dialog-body">
        <div className="capture-dialog-head">
          <div>
            <p className="capture-overline">DEVELOPMENT</p>
            <h2 className="capture-title">{t(locale, "cap.title")}</h2>
          </div>
          <button id="capture-close" className="capture-close" type="button" aria-label={t(locale, "cap.closeCapture")} onClick={onClose}>{t(locale, "common.close")}</button>
        </div>

        <small className="capture-lede">
          <strong>Verify a format:</strong> copy a read-only bundle containing the
          memory geometry, full directory, every profile and all CRC results. To map an individual setting,
          snapshot the profiles, change only that setting in G HUB or Onboard Memory Manager, compare, mark the
          change and copy the comparison.
        </small>

        <div className="capture-actions">
          <button
            id="capture-verification"
            type="button"
            className="is-primary"
            disabled={busy}
            onClick={() => {
              if (!context.profiles) {
                setMessage("Connect a Logitech mouse with onboard profiles first.");
                return;
              }
              setBusy(true);
              setMessage("Reading the directory and every profile sector…");
              void context.profiles.readVerification().then(async (verification) => {
                await navigator.clipboard.writeText(formatProfileVerificationMarkdown({
                  ...verification,
                  device: context.device,
                  profileFormat: context.profileFormat,
                }));
                setMessage(`Verification data copied (${verification.profiles.length} profiles, format ${verification.info.profileFormatId}).`);
              }).catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : "Could not collect profile verification data.");
              }).finally(() => setBusy(false));
            }}
          >
            {t(locale, "cap.copyVerification")}
          </button>

          {probe ? (
            <button
              id="capture-write-probe"
              type="button"
              className="capture-probe"
              disabled={busy || probe.supported !== true}
              title={probe.reason}
              onClick={() => {
                if (!probe.supported || !probe.prepare || !probe.run) return;
                setBusy(true);
                setMessage("Reading and copying the recovery backup…");
                void probe.prepare().then(async (backup) => {
                  await navigator.clipboard.writeText(formatProfileWriteProbeBackupMarkdown(backup));
                  const approved = window.confirm(
                    "Recovery backup copied. This test performs six profile-sector erase/write cycles, temporarily changes the profile name, DPI, and polling rate, then restores the exact original after every step. Do not disconnect or power off the mouse. Run the probe now?",
                  );
                  if (!approved) {
                    setMessage("Recovery backup copied. Write probe cancelled before any flash write.");
                    return;
                  }
                  setMessage("Running write probe. Do not disconnect or power off the mouse…");
                  const report = await probe.run!(backup);
                  await navigator.clipboard.writeText(formatProfileWriteProbeReportMarkdown(report));
                  setMessage(report.ok
                    ? "Write probe passed and the original profile was restored. Report copied."
                    : `Write probe failed. Recovery report copied; profile restored: ${report.restored}, mode restored: ${report.modeRestored}.`);
                }).catch((error: unknown) => {
                  setMessage(error instanceof Error ? error.message : "Could not run the profile write probe.");
                }).finally(() => setBusy(false));
              }}
            >
              {t(locale, "cap.verifyWrites")}
            </button>
          ) : null}

          <button id="capture-snapshot" type="button" onClick={() => void takeSnapshot()}>{t(locale, "cap.snapshot")}</button>
          <button id="capture-compare" type="button" onClick={() => void compareSnapshot()}>{t(locale, "cap.compare")}</button>
          <button
            id="capture-reset"
            type="button"
            onClick={() => {
              setSnapshot(null);
              setDiffs([]);
              setSectors([]);
              setSelectedActions(new Set());
              setMessage("Cleared.");
            }}
          >
            {t(locale, "cap.clear")}
          </button>
          <button
            id="capture-copy"
            type="button"
            onClick={() => {
              const markdown = formatCaptureMarkdown({
                device: context.device,
                profileFormat: context.profileFormat,
                actions: [...selectedActions],
                notes,
                diffs,
                sectors,
              });
              void navigator.clipboard.writeText(markdown).then(
                () => setMessage("Capture copied — paste it into a GitHub issue."),
                () => setMessage("Could not copy to the clipboard."),
              );
            }}
          >
            {t(locale, "cap.copyComparison")}
          </button>
          <span id="capture-status" className="capture-status" role="status" aria-live="polite">
            {message}
          </span>
        </div>

        <div id="capture-diff" className="capture-diff">
          {changed.length === 0 ? (
            <p className="capture-empty">
              {diffs.length > 0
                ? "No profile bytes changed — this setting is not stored in a profile."
                : snapshot
                  ? "Snapshot ready. Change one setting in the vendor app, then Compare."
                  : "Snapshot the profiles, change one setting in the vendor app, then Compare."}
            </p>
          ) : (
            changed.map((diff) => (
              <div key={diff.sector} className="capture-sector">
                <div className="capture-sector-head">
                  <strong className="capture-sector-title">
                    Sector {diff.sector} — {diff.changes.length} byte(s)
                  </strong>
                  {diff.unreproduced === undefined ? null : diff.unreproduced.length === 0 ? (
                    <span className="capture-verified">✓ write path verified</span>
                  ) : (
                    <span className="capture-unrepro">
                      ✗ {diff.unreproduced.length} byte(s) not reproducible
                    </span>
                  )}
                </div>
                <div className="capture-changes">
                  {diff.changes.map((change) => (
                    <div key={change.offset} className="capture-change">
                      <code className="capture-offset">
                        0x{change.offset.toString(16).padStart(2, "0")}
                      </code>
                      <code className="capture-bytes">
                        {change.before.toString(16).padStart(2, "0")} → {change.after.toString(16).padStart(2, "0")}
                      </code>
                      <span className={`capture-field${change.field === "checksum" ? " is-checksum" : ""}`}>
                        {change.field ?? "unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <p className="capture-notes-label">{t(locale, "cap.whatChanged")}</p>
          <div id="capture-action-list" className="capture-action-list">
            {CAPTURE_ACTIONS.map((action) => {
              const active = selectedActions.has(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  className={`capture-action-pill${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  style={{
                    borderColor: active ? action.color : undefined,
                    color: active ? action.color : undefined,
                    background: active
                      ? `color-mix(in srgb, ${action.color} 18%, transparent)`
                      : "transparent",
                  }}
                  onClick={() => setSelectedActions((current) => {
                    const next = new Set(current);
                    if (next.has(action.id)) next.delete(action.id);
                    else next.add(action.id);
                    return next;
                  })}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          id="capture-notes"
          className="capture-notes"
          rows={2}
          placeholder={t(locale, "cap.notesPlaceholder")}
          value={notes}
          onChange={(event) => setNotes(event.currentTarget.value)}
        />
      </div>
    </dialog>
  );
}
