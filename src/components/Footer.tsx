import Link from "next/link";

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-finance-border/50 bg-finance-bg py-14 mt-auto">
      <div className="mx-auto px-6 max-w-6xl">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div>
            <h4 className="text-finance-text font-semibold text-xl mb-4">Pravix Wealth Management</h4>
            <p className="text-finance-dim text-sm leading-relaxed max-w-xs">
              Wealth planning for every Indian.
            </p>
          </div>
          <div>
            <h5 className="text-finance-text font-semibold text-sm uppercase tracking-[0.14em] mb-4">Company</h5>
            <ul className="space-y-2 text-sm text-finance-dim">
              <li><Link href="/" className="hover:text-finance-text">About Us</Link></li>
              <li><Link href="#why-goals" className="hover:text-finance-text">Philosophy</Link></li>
              <li><Link href="/learn" className="hover:text-finance-text">Learn</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-finance-text font-semibold text-sm uppercase tracking-[0.14em] mb-4">Resources</h5>
            <ul className="space-y-2 text-sm text-finance-dim">
              <li><Link href="#insights" className="hover:text-finance-text">Market Insights</Link></li>
              <li><Link href="/dashboard" className="hover:text-finance-text">Dashboard</Link></li>
              <li><Link href="/onboarding" className="hover:text-finance-text">Get Guidance</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-finance-text font-semibold text-sm uppercase tracking-[0.14em] mb-4">Legal</h5>
            <ul className="space-y-2 text-sm text-finance-dim">
              <li><Link href="#" className="hover:text-finance-text">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-finance-text">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-finance-text">Disclosures</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-finance-border/40 text-xs text-finance-dim leading-relaxed">
          <p className="mb-2">
            <strong className="text-finance-muted">Disclaimer:</strong> Pravix Wealth Management provides educational and informational content. It is not personalized investment advice.
          </p>
          <p>
            Investments in securities are subject to market risks. Read all related documents carefully and consult a certified financial advisor before making investment decisions.
          </p>
          <p className="mt-4">&copy; {new Date().getFullYear()} Pravix Wealth Management. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
