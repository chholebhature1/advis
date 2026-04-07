"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

type FormData = {
  name: string;
  location: string;
  email: string;
  mobile: string;
  maritalStatus: string;
  financialGoal: string;
  goals: string[];
  priorities: string[];
  pref1: string;
  pref2: string;
  pref3: string;
};

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "", location: "", email: "", mobile: "", maritalStatus: "",
    financialGoal: "Retirement Planning", goals: [], priorities: [], pref1: "Mutual Funds", pref2: "Direct Equity", pref3: "Gold"
  });

  const goalOptions = [
    "Retirement Planning",
    "Children's Education",
    "Home Purchase",
    "Emergency Fund",
    "Wealth Creation",
    "Tax Saving",
    "Travel / Lifestyle",
    "Business Investment",
    "Debt Repayment",
  ];

  const priorityOptions = [
    "Capital Protection",
    "Aggressive Growth",
    "Regular Income",
    "Tax Efficiency",
    "Liquidity",
    "Global Diversification",
  ];

  const updateForm = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSelection = (field: "goals" | "priorities", value: string) => {
    setFormData(prev => {
      const exists = prev[field].includes(value);
      const updated = exists ? prev[field].filter(item => item !== value) : [...prev[field], value];
      return { ...prev, [field]: updated };
    });
  };

  const nextStep = () => setStep(p => Math.min(p + 1, 2));
  const prevStep = () => setStep(p => Math.max(p - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      nextStep();
      return;
    }

    const payload: FormData = {
      ...formData,
      financialGoal: formData.goals.length > 0 ? formData.goals[0] : formData.financialGoal,
    };
    
    setIsSubmitting(true);
    // Simulate API call and recommendation engine processing
    setTimeout(() => {
      // Store in URL or local storage for the dashboard
      // In a real app we'd use a state manager, context, or backend
      localStorage.setItem("pravix_user_data", JSON.stringify(payload));
      router.push("/dashboard");
    }, 2000);
  };

  const baseInputClass =
    "w-full rounded-lg border border-finance-border bg-[#090d1b] px-4 py-3 text-finance-text placeholder:text-finance-dim focus:outline-none focus:border-finance-accent transition-colors";

  return (
    <div className="rounded-2xl border border-finance-border/70 bg-[linear-gradient(145deg,rgba(28,33,52,0.86),rgba(17,21,36,0.84))] p-6 md:p-8 shadow-[0_22px_80px_rgba(0,0,0,0.45)]">
      <div className="mb-8 flex gap-2">
        <div className={`h-[3px] flex-1 rounded-full ${step >= 1 ? "bg-finance-accent" : "bg-finance-border"}`} />
        <div className={`h-[3px] flex-1 rounded-full ${step >= 2 ? "bg-finance-accent" : "bg-finance-border"}`} />
      </div>

      <form onSubmit={handleSubmit} className="min-h-[400px] flex flex-col">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold flex items-center gap-3 text-finance-text">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-finance-accent text-[10px] font-bold text-[#060914]">01</span>
                  Identity &amp; Contact
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.14em] text-finance-dim font-medium">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => updateForm("name", e.target.value)}
                      className={baseInputClass}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.14em] text-finance-dim font-medium">Location</label>
                    <input
                      required
                      type="text"
                      value={formData.location}
                      onChange={e => updateForm("location", e.target.value)}
                      className={baseInputClass}
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.14em] text-finance-dim font-medium">Email Address</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => updateForm("email", e.target.value)}
                    className={baseInputClass}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.14em] text-finance-dim font-medium">Mobile Number</label>
                  <input
                    required
                    type="tel"
                    value={formData.mobile}
                    onChange={e => updateForm("mobile", e.target.value)}
                    className={baseInputClass}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.14em] text-finance-dim font-medium">Marital Status</label>
                  <select
                    required
                    value={formData.maritalStatus}
                    onChange={e => updateForm("maritalStatus", e.target.value)}
                    className={`${baseInputClass} appearance-none`}
                  >
                    <option value="" disabled>Select status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Married with Kids">Married with Kids</option>
                  </select>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold flex items-center gap-3 text-finance-text">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-finance-accent text-[10px] font-bold text-[#060914]">02</span>
                  Goals &amp; Preferences
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-semibold text-finance-text">What are your goals?</h3>
                    <p className="mt-1 text-finance-muted">Select one or more financial goals you want to work towards.</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {goalOptions.map(goal => {
                      const selected = formData.goals.includes(goal);

                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => toggleSelection("goals", goal)}
                          className={`flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-all ${
                            selected
                              ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                              : "border-finance-border bg-[#0a1022]/70 text-finance-text hover:border-finance-border-soft"
                          }`}
                        >
                          <span className="text-base md:text-lg font-medium">{goal}</span>
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${selected ? "border-emerald-300 bg-emerald-400 text-[#06211a]" : "border-finance-border text-finance-dim"}`}>
                            {selected ? <Check className="h-4 w-4" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-sm text-finance-dim">{formData.goals.length} goal{formData.goals.length === 1 ? "" : "s"} selected</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-finance-border">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-finance-dim font-medium">Question 2: What matters most to you?</p>

                  <div className="grid gap-3 md:grid-cols-2">
                    {priorityOptions.map(priority => {
                      const selected = formData.priorities.includes(priority);

                      return (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => toggleSelection("priorities", priority)}
                          className={`rounded-xl border px-4 py-3 text-left text-sm md:text-base transition-all ${
                            selected
                              ? "border-finance-accent bg-finance-accent/12 text-finance-text"
                              : "border-finance-border bg-[#0a1022]/70 text-finance-muted hover:border-finance-border-soft"
                          }`}
                        >
                          {priority}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-finance-border">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-finance-dim font-medium">Question 3: Investment Preferences (Rank Top 3)</p>

                  {["pref1", "pref2", "pref3"].map((field, idx) => (
                    <div key={field} className="flex items-center gap-4">
                      <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-[#090d1b] border border-finance-border rounded-full text-sm text-finance-muted">{idx + 1}</span>
                      <select
                        value={formData[field as keyof FormData]}
                        onChange={e => updateForm(field as keyof FormData, e.target.value)}
                        className={`flex-1 ${baseInputClass} appearance-none`}
                      >
                        <option value="Mutual Funds">Mutual Funds</option>
                        <option value="Direct Equity">Direct Equity (Stocks)</option>
                        <option value="Fixed Deposits / Bonds">Fixed Deposits / Bonds</option>
                        <option value="Gold">Gold</option>
                        <option value="Real Estate">Real Estate</option>
                      </select>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-8 mt-8 flex justify-between border-t border-finance-border/70">
          {step > 1 ? (
            <button type="button" onClick={prevStep} className="px-6 py-3 rounded-lg border border-finance-border hover:border-finance-border-soft hover:bg-finance-surface text-finance-muted font-medium transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}
          
          <button type="submit" disabled={isSubmitting} className="px-8 py-3 rounded-lg bg-[linear-gradient(180deg,#9EA0FF,#7E82F8)] hover:brightness-105 text-[#090c19] font-semibold transition-all flex items-center gap-2 disabled:opacity-70 shadow-[0_8px_25px_rgba(126,130,248,0.35)]">
            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : step === 1 ? <>Continue <ArrowRight className="w-4 h-4" /></> : "Generate Blueprint"}
          </button>
        </div>
      </form>
    </div>
  );
}
