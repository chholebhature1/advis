export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  author: string;
  role: string;
  publishedAt: string;
  readTime: string;
  personalNote: string;
  whoShouldRead: string;
  keyTakeaways: string[];
  tags: string[];
  sections: BlogSection[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "goal-based-investing-india-blueprint",
    title: "Goal-Based Investing in India: A Practical 2026 Blueprint",
    excerpt:
      "Turn major life goals into measurable monthly action by linking timelines, inflation, and risk capacity to a disciplined portfolio design.",
    coverImage:
      "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1600&q=80",
    author: "Arjun Menon",
    role: "Wealth Planner and Personal Finance Writer",
    publishedAt: "2026-04-01",
    readTime: "12 min read",
    personalNote:
      "I wrote this after a month of reviewing onboarding calls where people had good income and intent, but no clear conversion from goals to monthly action.",
    whoShouldRead:
      "Salaried professionals and young families who want a practical goal-investing structure, not generic fund lists.",
    keyTakeaways: [
      "Start with goal math first, product selection second.",
      "Use time buckets to match volatility with the right horizon.",
      "Track funding ratio monthly to detect slippage early.",
      "Pre-commit rebalancing rules so behavior stays disciplined in volatile markets.",
    ],
    tags: ["Goal Planning", "Asset Allocation", "India Investing"],
    sections: [
      {
        heading: "Why most investment plans fail after six months",
        paragraphs: [
          "Most investors do not fail because they picked bad funds. They fail because their plan was not tied to real goals with target amounts, timelines, and contribution rules. When markets turn noisy, any plan without structure feels optional.",
          "A working goal plan should answer three questions with numbers: how much money is needed, by when, and how much monthly surplus is available. Once these are clear, product selection becomes a second-order decision instead of the starting point.",
        ],
      },
      {
        heading: "Build your goal stack before picking products",
        paragraphs: [
          "Split goals into three buckets: short-term stability goals (under 3 years), medium-term transition goals (3-7 years), and long-term compounding goals (7+ years). This bucket system avoids the common mistake of funding near-term needs with high-volatility assets.",
          "For each goal, adjust target amounts for inflation. A 20 lakh goal today may require meaningfully more in 8-10 years. If this inflation step is skipped, many portfolios appear healthy on paper but are underfunded in reality.",
        ],
        bullets: [
          "Bucket 1 (0-3 years): prioritize capital protection and liquidity",
          "Bucket 2 (3-7 years): balanced growth with controlled drawdown",
          "Bucket 3 (7+ years): equity-heavy compounding with periodic rebalancing",
        ],
      },
      {
        heading: "Translate goals into monthly execution",
        paragraphs: [
          "After target calculation, reverse-engineer monthly investments. Use automatic SIPs for discipline and pair them with quarterly top-ups linked to salary hikes or bonuses. This keeps plan quality high without requiring market predictions.",
          "Track one core metric per goal: funding ratio. Funding ratio is current corpus divided by required corpus adjusted for remaining timeline. It instantly shows whether you are ahead, on track, or behind.",
        ],
      },
      {
        heading: "Risk management that protects behavior",
        paragraphs: [
          "Risk is not only portfolio volatility. Risk is also behavioral: panic exits, delayed re-entry, and random product switching. Build rules in advance for what to do during drawdowns so decision quality does not collapse in stressful periods.",
          "A practical rule is to rebalance only at fixed intervals or when allocation drifts beyond a threshold. This removes emotional timing and systematically buys what is cheaper relative to your target mix.",
        ],
      },
    ],
  },
  {
    slug: "section-80c-planning-without-march-panic",
    title: "Section 80C Planning Without March Panic",
    excerpt:
      "Create a tax-efficient annual investing rhythm that avoids rushed year-end decisions and improves long-term wealth outcomes.",
    coverImage:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80",
    author: "Neha Iyer",
    role: "Tax Planning Coach and Finance Blogger",
    publishedAt: "2026-03-26",
    readTime: "11 min read",
    personalNote:
      "Every March I see investors rush into tax products they barely understand. This post is my repeatable annual system to avoid that stress.",
    whoShouldRead:
      "Anyone using Section 80C who wants better tax outcomes without sacrificing liquidity or portfolio quality.",
    keyTakeaways: [
      "March-only tax planning often reduces decision quality.",
      "Allocate 80C by role: growth, stability, and retirement core.",
      "Review in April, July, October, and December for smoother execution.",
      "Good tax planning should improve both tax outgo and long-term portfolio behavior.",
    ],
    tags: ["Tax Planning", "Section 80C", "Personal Finance"],
    sections: [
      {
        heading: "The hidden cost of last-minute tax saving",
        paragraphs: [
          "March-only tax planning often leads to low-quality choices: locked products selected in haste, over-concentration in a single instrument, and poor alignment with long-term objectives. The tax benefit is achieved, but portfolio efficiency suffers.",
          "A better approach is month-by-month contribution planning. This smooths cashflow impact and allows enough time to compare instruments based on risk, lock-in, liquidity, and expected role in your broader portfolio.",
        ],
      },
      {
        heading: "Use 80C as a planning framework, not a checklist",
        paragraphs: [
          "Treat tax-saving options as tools with distinct behavior. ELSS supports long-term growth with market risk. PPF offers stability and sovereign backing with long lock-in. EPF already covers a portion for salaried investors. The right combination depends on goals and liquidity needs.",
          "Before selecting instruments, decide the purpose of each rupee under 80C: retirement core, long-term growth, or risk reduction. Role-first allocation creates consistency and avoids duplicate exposures.",
        ],
        bullets: [
          "Map existing EPF contribution first before adding new commitments",
          "Use ELSS only if equity volatility fits your risk capacity",
          "Keep emergency corpus separate from tax-saving products",
        ],
      },
      {
        heading: "Annual tax calendar for disciplined execution",
        paragraphs: [
          "Start in April with an annual tax estimate, then schedule monthly contributions. Review in July and October to capture salary changes or bonus income. By December, only small adjustments should remain.",
          "If you are self-employed, pair tax planning with quarterly advance tax milestones. This reduces compliance stress and protects business liquidity planning.",
        ],
      },
      {
        heading: "What good tax planning should look like",
        paragraphs: [
          "Strong tax planning should improve two things simultaneously: lower tax outgo and higher portfolio quality. If your tax strategy increases lock-ins without supporting your goals, it is incomplete.",
          "Use year-end review not to scramble, but to refine. Evaluate whether 80C contributions improved diversification, discipline, and goal funding ratios.",
        ],
      },
    ],
  },
  {
    slug: "investing-during-market-volatility-discipline-over-drama",
    title: "Investing During Market Volatility: Discipline Over Drama",
    excerpt:
      "A practical framework to stay invested through volatility without overreacting to headlines, noise, or short-term drawdowns.",
    coverImage:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80",
    author: "Rohan Bhatia",
    role: "Market Risk Mentor and Long-Term Investor",
    publishedAt: "2026-03-12",
    readTime: "13 min read",
    personalNote:
      "This guide comes from my own playbook during messy market weeks where headlines scream and discipline quietly creates outcomes.",
    whoShouldRead:
      "Investors who stay invested through SIPs but still feel anxiety and decision fatigue during drawdowns.",
    keyTakeaways: [
      "Volatility is expected; panic actions create avoidable damage.",
      "Use a review checklist before reacting to market headlines.",
      "Keep SIPs running and stage fresh capital over fixed dates.",
      "Rebalance by rules, not by fear or excitement.",
    ],
    tags: ["Volatility", "Behavioral Finance", "Risk Management"],
    sections: [
      {
        heading: "Volatility is normal, panic is optional",
        paragraphs: [
          "Market drawdowns are not exceptions; they are part of compounding. What damages long-term outcomes is not volatility itself, but behavior during volatility. Exit-and-wait decisions frequently miss recoveries and reduce return consistency.",
          "An investor needs a stress-tested response plan before volatility appears. Waiting to create a strategy inside drawdowns often leads to emotionally driven choices.",
        ],
      },
      {
        heading: "Separate signal from noise in bad weeks",
        paragraphs: [
          "Not every sharp move requires action. Build a three-layer review process: macro trigger, portfolio impact, and goal impact. If market movement does not change your goal probabilities materially, avoid tactical overreaction.",
          "Use predefined thresholds for review instead of daily monitoring. This reduces overtrading and keeps attention on important variables such as contribution continuity and allocation drift.",
        ],
        bullets: [
          "Review weekly or fortnightly, not every hour",
          "Act only when allocation drift breaches set bands",
          "Document actions and rationale to avoid inconsistent behavior",
        ],
      },
      {
        heading: "How to continue investing when sentiment is weak",
        paragraphs: [
          "SIP continuity is one of the most robust anti-panic tools. During drawdowns, continuing scheduled investments can improve long-run entry prices without requiring market timing skill.",
          "If fear is high, use a staged deployment strategy for fresh lumpsum money. Split capital across fixed dates over 3-6 months to reduce emotional pressure while maintaining participation.",
        ],
      },
      {
        heading: "Rebalancing rules for uncertain markets",
        paragraphs: [
          "A disciplined rebalance process turns volatility into a portfolio maintenance advantage. Rebalance at fixed intervals or when equity-debt mix drifts beyond tolerance ranges.",
          "The objective is not short-term outperformance; it is risk alignment. A portfolio that stays aligned to risk capacity supports better investor behavior and lower regret in turbulent periods.",
        ],
      },
    ],
  },
  {
    slug: "portfolio-diversification-for-indian-households",
    title: "Portfolio Diversification for Indian Households",
    excerpt:
      "Design diversification around household realities: income concentration, goal timelines, liquidity needs, and protection against single-theme risk.",
    coverImage:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
    author: "Meera Kulkarni",
    role: "Household Portfolio Strategist",
    publishedAt: "2026-02-28",
    readTime: "12 min read",
    personalNote:
      "I wrote this after repeatedly seeing households own many products but still carry the same risk from every angle.",
    whoShouldRead:
      "Families building long-term wealth who want true diversification aligned with income, goals, and liquidity needs.",
    keyTakeaways: [
      "Diversification is about distinct risk drivers, not product count.",
      "Protect emergency and near-term goals before maximizing growth assets.",
      "Use core-satellite exposure with strict limits for thematic bets.",
      "Test resilience against shocks to avoid forced selling.",
    ],
    tags: ["Diversification", "Portfolio Design", "Household Finance"],
    sections: [
      {
        heading: "Diversification is more than owning many funds",
        paragraphs: [
          "Many households own 8-12 products and still remain poorly diversified. True diversification is about distinct risk drivers, not product count. If investments react the same way to stress, diversification is only cosmetic.",
          "Start by identifying concentration points: employer dependence, real-estate-heavy net worth, and single-sector equity bias. These concentrations matter more than the number of mutual funds in your app.",
        ],
      },
      {
        heading: "Design around goals and cashflow stability",
        paragraphs: [
          "Households with volatile income need stronger liquidity and lower forced-selling risk. That means preserving a clear emergency reserve and matching near-term goals to lower-volatility assets.",
          "Long-term goals can absorb more growth assets, but only when short-term obligations are protected. A diversified portfolio should reduce the chance that one bad market phase disrupts essential plans.",
        ],
        bullets: [
          "Keep emergency funds outside long-term growth buckets",
          "Align each asset class with a specific goal horizon",
          "Reduce overlap across funds with similar holdings",
        ],
      },
      {
        heading: "Practical diversification framework for 2026",
        paragraphs: [
          "Use a core-satellite approach: core holdings for long-term compounding consistency and selective satellites for tactical themes with strict exposure limits. This balances durability with opportunity.",
          "Review cross-asset correlation annually. A mix that looked diversified in one cycle can become clustered in another. Periodic review preserves quality of diversification over time.",
        ],
      },
      {
        heading: "How to know your portfolio is actually resilient",
        paragraphs: [
          "Test your portfolio against scenarios: equity drawdown, interest-rate shock, and temporary income disruption. A resilient plan should maintain essential goals without distress liquidation.",
          "Measure resilience using simple indicators: liquidity runway, concentration score, and maximum acceptable drawdown. These metrics keep diversification tied to real household outcomes.",
        ],
      },
    ],
  },
];

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
