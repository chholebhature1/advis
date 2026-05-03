import React, { useMemo, useState, useEffect } from "react";

type DebugPanelProps = {
  rawAnswers?: any;
  apiPayload?: any;
  snapshot?: any;
  explanation?: any;
  forceShow?: boolean;
};

export default function DebugPanel({ rawAnswers, apiPayload, snapshot, explanation, forceShow = false }: DebugPanelProps) {
  const isDev = process.env.NODE_ENV === "development";
  const [visible, setVisible] = useState<boolean>(isDev || forceShow);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    userInput: true,
    apiPayload: true,
    snapshot: true,
    allocation: true,
  });

  useEffect(() => {
    if (isDev) {
      // Log snapshot for quick inspection when dev
      // eslint-disable-next-line no-console
      console.log("[DebugPanel] snapshot:", snapshot);
    }
  }, [isDev, snapshot]);

  if (!isDev && !forceShow) return null;

  const toggleSection = (k: string) =>
    setExpandedSections((s) => ({ ...s, [k]: !s[k] }));

  const safeStringify = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const keyComputedValues = useMemo(() => {
    return {
      sipOriginal: snapshot?.sipOriginal ?? null,
      requiredSip: snapshot?.requiredSip ?? null,
      projectedCorpus: snapshot?.projectedCorpus ?? null,
      feasibility: snapshot?.decision?.feasibility ?? snapshot?.isFeasible ?? null,
      gapAmount: snapshot?.gapAmount ?? snapshot?.decision?.gapAmount ?? null,
    };
  }, [snapshot]);

  const allocation = useMemo(() => {
    return {
      equity: snapshot?.allocation?.equity ?? null,
      debt: snapshot?.allocation?.debt ?? null,
      gold: snapshot?.allocation?.gold ?? null,
      liquid: snapshot?.allocation?.liquid ?? null,
      total:
        (Number(snapshot?.allocation?.equity ?? 0) || 0) +
        (Number(snapshot?.allocation?.debt ?? 0) || 0) +
        (Number(snapshot?.allocation?.gold ?? 0) || 0) +
        (Number(snapshot?.allocation?.liquid ?? 0) || 0),
    };
  }, [snapshot]);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-w-[95vw] max-h-[70vh] overflow-hidden rounded-lg border border-[#cfdcff] bg-white/95 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 border-b border-[#e6eefc] px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded bg-[#eef6ff] flex items-center justify-center text-sm font-semibold text-[#2b5cff]">DBG</div>
          <div>
            <p className="text-xs font-semibold text-[#0a1930]">DEBUG INSPECTION PANEL</p>
            <p className="text-[11px] text-[#5f7396]">Onboarding → API → Engine (read-only)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVisible((v) => !v)}
            className="text-xs text-[#5f7396] hover:text-[#2b5cff]"
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {visible && (
        <div className="max-h-[60vh] overflow-auto p-3 text-sm text-[#0a1930]">
          <section className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold">SECTION 1 — USER INPUT</h4>
              <button onClick={() => toggleSection("userInput")} className="text-xs text-[#5f7396]">{expandedSections.userInput ? "Collapse" : "Expand"}</button>
            </div>
            {expandedSections.userInput && (
              <div className="rounded border border-[#edf4ff] bg-[#fafcff] p-2">
                <pre className="font-mono text-xs whitespace-pre-wrap">{safeStringify(rawAnswers ?? "(no raw answers)")}</pre>
              </div>
            )}
          </section>

          <section className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold">SECTION 2 — API PAYLOAD</h4>
              <button onClick={() => toggleSection("apiPayload")} className="text-xs text-[#5f7396]">{expandedSections.apiPayload ? "Collapse" : "Expand"}</button>
            </div>
            {expandedSections.apiPayload && (
              <div className="rounded border border-[#edf4ff] bg-[#fafcff] p-2">
                <pre className="font-mono text-xs whitespace-pre-wrap">{safeStringify(apiPayload ?? "(no api payload)")}</pre>
              </div>
            )}
          </section>

          <section className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold">SECTION 3 — SNAPSHOT (ENGINE OUTPUT)</h4>
              <button onClick={() => toggleSection("snapshot")} className="text-xs text-[#5f7396]">{expandedSections.snapshot ? "Collapse" : "Expand"}</button>
            </div>
            {expandedSections.snapshot && (
              <div className="rounded border border-[#edf4ff] bg-[#fafcff] p-2">
                <pre className="font-mono text-xs whitespace-pre-wrap">{safeStringify({
                  sipOriginal: keyComputedValues.sipOriginal,
                  requiredSip: keyComputedValues.requiredSip,
                  projectedCorpus: keyComputedValues.projectedCorpus,
                  feasibility: keyComputedValues.feasibility,
                  gapAmount: keyComputedValues.gapAmount,
                  explanation: explanation ?? null,
                })}</pre>
              </div>
            )}
          </section>

          <section className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold">SECTION 4 — ALLOCATION</h4>
              <button onClick={() => toggleSection("allocation")} className="text-xs text-[#5f7396]">{expandedSections.allocation ? "Collapse" : "Expand"}</button>
            </div>
            {expandedSections.allocation && (
              <div className="rounded border border-[#edf4ff] bg-[#fafcff] p-2">
                <pre className="font-mono text-xs whitespace-pre-wrap">{safeStringify(allocation)}</pre>
              </div>
            )}
          </section>

          <div className="mt-2 text-[11px] text-[#5f7396]">
            <p>Read-only. No network or business logic changes.</p>
          </div>
        </div>
      )}
    </div>
  );
}
