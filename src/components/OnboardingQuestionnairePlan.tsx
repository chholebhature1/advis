import {
  ONBOARDING_QUESTIONNAIRE_FLOW,
  getOnboardingTotalEstimatedMinutes,
} from "@/lib/onboarding/questionnaire-flow";

export default function OnboardingQuestionnairePlan() {
  const totalMinutes = getOnboardingTotalEstimatedMinutes();

  return (
    <section className="mt-10 rounded-2xl border border-finance-border bg-finance-panel p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-finance-muted">Production Questionnaire Flow</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-finance-text">Screen-by-screen onboarding plan</h2>
          <p className="mt-2 text-sm text-finance-muted">
            This flow is generated from typed config and mapped to the production schema.
          </p>
        </div>
        <span className="rounded-full border border-finance-border bg-finance-surface px-3 py-1 text-xs font-semibold text-finance-text">
          {ONBOARDING_QUESTIONNAIRE_FLOW.length} screens - ~{totalMinutes} min
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {ONBOARDING_QUESTIONNAIRE_FLOW.map((screen, index) => (
          <article key={screen.id} className="rounded-xl border border-finance-border bg-finance-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-finance-muted">
              Step {index + 1}: {screen.id.replaceAll("_", " ")}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-finance-text">{screen.title}</h3>
            <p className="mt-2 text-sm text-finance-muted">{screen.description}</p>

            <ul className="mt-3 space-y-1.5 text-sm text-finance-text">
              {screen.fields.slice(0, 4).map((field) => (
                <li key={field.key}>
                  - {field.label}
                  <span className="text-finance-muted"> ({field.mapsTo.table}.{field.mapsTo.column})</span>
                </li>
              ))}
              {screen.fields.length > 4 ? (
                <li className="text-finance-muted">+ {screen.fields.length - 4} more fields</li>
              ) : null}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}