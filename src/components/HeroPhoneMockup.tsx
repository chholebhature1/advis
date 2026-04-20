"use client";

import { useEffect, useId, useMemo, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type GoalSlide = {
  id: string;
  title: string;
  targetValue: number;
  baseCurrentValue: number;
  growthPerSecond: number;
  reassurance: string;
  deadlineLabel: string;
  runwayLabel: string;
};

const inrFormatter = new Intl.NumberFormat("en-IN");

const ANIMATION_STEP_MS = 110;
const CHART_POINT_COUNT = 30;
const CHART_WIDTH = 286;
const CHART_HEIGHT = 132;
const CHART_X_START = 8;
const CHART_X_STEP = 9.25;
const CHART_BASELINE_Y = 122;

const BASE_PORTFOLIO_VALUE = 1854200;
const BASE_TARGET_VALUE = 3500000;
const BASE_NET_DEPOSITS = 1490000;
const GROWTH_PER_SECOND = 29;
const BASE_MONTHLY_STEP = 12000;
const GOAL_SLIDE_INTERVAL_SECONDS = 4.4;

const GOAL_SLIDES: GoalSlide[] = [
  {
    id: "child-education",
    title: "Child Education 2034",
    targetValue: 3500000,
    baseCurrentValue: 1495000,
    growthPerSecond: 9,
    reassurance: "You are on track this month. Every disciplined step builds family security.",
    deadlineLabel: "07 May",
    runwayLabel: "education goal runway",
  },
  {
    id: "family-home",
    title: "Family Home 2031",
    targetValue: 6800000,
    baseCurrentValue: 2240000,
    growthPerSecond: 11,
    reassurance: "Steady savings plus SIP discipline are reducing your home-purchase stress each quarter.",
    deadlineLabel: "12 May",
    runwayLabel: "home down-payment runway",
  },
  {
    id: "retirement",
    title: "Retirement Freedom 2045",
    targetValue: 9500000,
    baseCurrentValue: 2860000,
    growthPerSecond: 13,
    reassurance: "Compounding is working for you. Staying consistent now protects long-term lifestyle freedom.",
    deadlineLabel: "18 May",
    runwayLabel: "retirement compounding runway",
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toLinePath(points: Point[]): string {
  if (points.length === 0) {
    return "";
  }

  const [first, ...rest] = points;
  return `M${first.x} ${first.y} ${rest.map((point) => `L${point.x} ${point.y}`).join(" ")}`;
}

function toAreaPath(topPoints: Point[], bottomPoints: Point[]): string {
  if (topPoints.length === 0 || bottomPoints.length === 0) {
    return "";
  }

  const topPath = toLinePath(topPoints);
  const reversedBottom = [...bottomPoints].reverse();
  const bottomPath = reversedBottom.map((point) => `L${point.x} ${point.y}`).join(" ");

  return `${topPath} ${bottomPath} Z`;
}

function formatCompactInr(value: number): string {
  if (value >= 10000000) {
    return `Rs ${(value / 10000000).toFixed(2)}Cr`;
  }

  if (value >= 100000) {
    return `Rs ${(value / 100000).toFixed(1)}L`;
  }

  return `Rs ${inrFormatter.format(value)}`;
}

export default function HeroPhoneMockup() {
  const [visible, setVisible] = useState(false);
  const [animationTick, setAnimationTick] = useState(0);

  const gradientSuffix = useId().replace(/:/g, "");

  useEffect(() => {
    const entranceTimer = setTimeout(() => {
      setVisible(true);
    }, 260);

    return () => {
      clearTimeout(entranceTimer);
    };
  }, []);

  useEffect(() => {
    const animationTimer = setInterval(() => {
      setAnimationTick((currentTick) => currentTick + 1);
    }, ANIMATION_STEP_MS);

    return () => {
      clearInterval(animationTimer);
    };
  }, []);

  const elapsedSeconds = animationTick * (ANIMATION_STEP_MS / 1000);
  const totalValue = Math.round(BASE_PORTFOLIO_VALUE + elapsedSeconds * GROWTH_PER_SECOND);
  const gainValue = totalValue - BASE_NET_DEPOSITS;
  const gainPct = (gainValue / BASE_NET_DEPOSITS) * 100;

  const projectedValue = Math.round(totalValue + (BASE_TARGET_VALUE - totalValue) * 0.26);
  const monthlyStep = Math.round(BASE_MONTHLY_STEP + Math.sin(elapsedSeconds * 0.9) * 380);

  const goalRingRadius = 22;
  const goalRingCircumference = 2 * Math.PI * goalRingRadius;

  const goalSlides = useMemo(
    () =>
      GOAL_SLIDES.map((goal, index) => {
        const oscillation = Math.sin(elapsedSeconds * 0.9 + index * 0.8) * 850;
        const currentValue = Math.max(0, Math.round(goal.baseCurrentValue + elapsedSeconds * goal.growthPerSecond + oscillation));
        const goalProgress = clamp((currentValue / goal.targetValue) * 100, 0, 100);

        return {
          ...goal,
          currentValue,
          goalProgress,
          ringOffset: goalRingCircumference - (goalRingCircumference * goalProgress) / 100,
        };
      }),
    [elapsedSeconds, goalRingCircumference],
  );

  const activeGoalIndex = Math.floor(elapsedSeconds / GOAL_SLIDE_INTERVAL_SECONDS) % goalSlides.length;
  const activeGoal = goalSlides[activeGoalIndex];

  const { livePath, targetPath, confidenceBandPath, liveFillPath, latestPoint } = useMemo(() => {
    const livePoints: Point[] = [];
    const targetPoints: Point[] = [];
    const upperBandPoints: Point[] = [];
    const lowerBandPoints: Point[] = [];

    for (let index = 0; index < CHART_POINT_COUNT; index += 1) {
      const x = Number((CHART_X_START + index * CHART_X_STEP).toFixed(2));
      const trendBase = 98 - index * 2.1;

      const liveWave =
        Math.sin(index * 0.53 + elapsedSeconds * 1.12) * 3.8 +
        Math.cos(index * 0.27 + elapsedSeconds * 0.86) * 2.3;
      const lift = Math.min(elapsedSeconds * 0.16, 11);
      const liveY = clamp(trendBase + liveWave - lift, 18, 118);

      const requiredGap = 9 - Math.min(elapsedSeconds * 0.02, 3.5);
      const targetY = clamp(trendBase - requiredGap + Math.sin(index * 0.17 + elapsedSeconds * 0.35) * 0.8, 14, 112);

      const bandSpread = 5.2 + Math.sin(index * 0.4 + elapsedSeconds * 0.72) * 1.1;
      const upperBandY = clamp(liveY - bandSpread, 10, 110);
      const lowerBandY = clamp(liveY + bandSpread, 24, CHART_BASELINE_Y);

      livePoints.push({ x, y: Number(liveY.toFixed(2)) });
      targetPoints.push({ x, y: Number(targetY.toFixed(2)) });
      upperBandPoints.push({ x, y: Number(upperBandY.toFixed(2)) });
      lowerBandPoints.push({ x, y: Number(lowerBandY.toFixed(2)) });
    }

    return {
      livePath: toLinePath(livePoints),
      targetPath: toLinePath(targetPoints),
      confidenceBandPath: toAreaPath(upperBandPoints, lowerBandPoints),
      liveFillPath: toAreaPath(
        livePoints,
        livePoints.map((point) => ({ x: point.x, y: CHART_BASELINE_Y })),
      ),
      latestPoint: livePoints[livePoints.length - 1],
    };
  }, [elapsedSeconds]);

  return (
    <div
      className="relative flex w-full min-h-[330px] items-center justify-center sm:min-h-[500px] lg:min-h-[560px] xl:min-h-[620px]"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "36px",
          width: "338px",
          height: "42px",
          background: "radial-gradient(circle at center, rgba(17,42,90,0.36), rgba(17,42,90,0.04) 74%)",
          borderRadius: "999px",
          filter: "blur(10px)",
          transform: "rotate(-7deg)",
          opacity: 0.72,
        }}
      />

      <div
        className="hero-floor-glow"
        style={{
          bottom: "48px",
          width: "238px",
          height: "18px",
          background: "radial-gradient(circle at center, rgba(111,151,255,0.26), rgba(111,151,255,0) 70%)",
          borderRadius: "999px",
          filter: "blur(2px)",
          opacity: 0.78,
        }}
      />

      <div
        className="hero-ambient-glow"
        style={{
          position: "absolute",
          top: "84px",
          right: "22px",
          width: "210px",
          height: "210px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(129,170,255,0.34) 0%, rgba(129,170,255,0.07) 46%, rgba(129,170,255,0) 74%)",
          filter: "blur(4px)",
          pointerEvents: "none",
        }}
      />

      <div className="relative flex h-[660px] w-[350px] items-center justify-center origin-center scale-[0.92] sm:scale-[0.7] md:scale-[0.78] lg:scale-[0.75] xl:scale-[0.86] 2xl:scale-[0.94]">
        <div
          className="hero-phone-float"
          style={{
            position: "relative",
            width: "338px",
            height: "650px",
            transform: "perspective(1450px) rotateX(5deg) rotateY(-15deg) rotateZ(7deg)",
            transformOrigin: "50% 58%",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.65s ease",
            willChange: "transform",
            transformStyle: "preserve-3d",
            filter: "drop-shadow(0 34px 42px rgba(12,30,76,0.24))",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-10px",
              right: "-14px",
              bottom: "-4px",
              left: "6px",
              background: "linear-gradient(145deg, #4b72dc 0%, #2c4ea8 46%, #6b8ff0 100%)",
              borderRadius: "56px",
              border: "1px solid #355cbc",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.6), inset -6px -9px 12px rgba(19,46,112,0.35), 22px 28px 44px rgba(12,29,68,0.3)",
              transform: "translateZ(-16px)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "0",
                right: "18%",
                width: "48%",
                height: "14px",
                background: "rgba(193,220,255,0.68)",
                borderRadius: "14px 14px 0 0",
              }}
            />
            <div style={{ position: "absolute", top: "132px", left: "-4px", width: "7px", height: "34px", background: "#4b72dc", borderRadius: "4px", border: "1px solid #355cbc" }} />
            <div style={{ position: "absolute", top: "184px", left: "-4px", width: "7px", height: "58px", background: "#4b72dc", borderRadius: "4px", border: "1px solid #355cbc" }} />
            <div style={{ position: "absolute", top: "254px", left: "-4px", width: "7px", height: "58px", background: "#4b72dc", borderRadius: "4px", border: "1px solid #355cbc" }} />
            <div style={{ position: "absolute", top: "194px", right: "-4px", width: "7px", height: "82px", background: "#4b72dc", borderRadius: "4px", border: "1px solid #355cbc" }} />
          </div>

          <div
            style={{
              position: "absolute",
              top: "16px",
              right: "-16px",
              width: "18px",
              height: "610px",
              borderRadius: "0 34px 34px 0",
              background: "linear-gradient(180deg, #2b4f9d 0%, #1d3776 52%, #3f67bf 100%)",
              boxShadow: "inset -1px 0 1px rgba(255,255,255,0.35), inset 2px 0 5px rgba(7,20,45,0.42)",
              transform: "skewY(-4deg) translateZ(-8px)",
              opacity: 0.9,
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "2px",
              width: "8px",
              height: "606px",
              borderRadius: "18px 0 0 18px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.62), rgba(255,255,255,0.08))",
              opacity: 0.6,
              transform: "translateZ(8px)",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(160deg, #f4f8ff 0%, #dde9ff 48%, #ffffff 100%)",
              borderRadius: "50px",
              border: "1px solid #7f9dcc",
              boxShadow: "-6px -5px 18px rgba(255,255,255,0.76), 7px 10px 18px rgba(18,46,104,0.16), inset 1px 1px 2px rgba(255,255,255,0.92), inset -1px -1px 3px rgba(60,87,132,0.24)",
              overflow: "visible",
              transform: "translateZ(0)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "7px",
                borderRadius: "43px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                background: "linear-gradient(180deg, #f8fbff 0%, #edf3ff 100%)",
                border: "1px solid rgba(26,58,117,0.2)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.5), inset 0 -14px 20px rgba(43,92,255,0.08)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  left: "16px",
                  right: "16px",
                  zIndex: 30,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#22395f", letterSpacing: "0.2px" }}>9:41</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "1px", height: "10px" }}>
                    <span style={{ display: "block", width: "2px", height: "4px", background: "#22395f", borderRadius: "1px" }} />
                    <span style={{ display: "block", width: "2px", height: "6px", background: "#22395f", borderRadius: "1px" }} />
                    <span style={{ display: "block", width: "2px", height: "8px", background: "#22395f", borderRadius: "1px" }} />
                    <span style={{ display: "block", width: "2px", height: "10px", background: "#22395f", borderRadius: "1px" }} />
                  </div>
                  <div style={{ width: "18px", height: "10px", border: "1.3px solid #22395f", borderRadius: "3px", position: "relative" }}>
                    <div style={{ position: "absolute", top: "1px", left: "1px", width: "12px", height: "6px", background: "#22395f", borderRadius: "1px" }} />
                    <div style={{ position: "absolute", right: "-3px", top: "2px", width: "2px", height: "4px", background: "#22395f", borderRadius: "0 1px 1px 0" }} />
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "122px",
                  height: "34px",
                  borderRadius: "999px",
                  background: "#05070d",
                  zIndex: 31,
                  boxShadow: "inset 0 1px 2px rgba(255,255,255,0.12), 0 3px 7px rgba(0,0,0,0.35)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "120px",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0))",
                  pointerEvents: "none",
                }}
              />

              <div
                className="hero-glass-sheen"
                style={{
                  position: "absolute",
                  top: "-24%",
                  left: "-44%",
                  width: "70%",
                  height: "170%",
                  background: "linear-gradient(110deg, rgba(255,255,255,0) 24%, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0) 67%)",
                  transform: "rotate(9deg)",
                  pointerEvents: "none",
                  mixBlendMode: "screen",
                  opacity: 0.68,
                }}
              />

              <div style={{ padding: "58px 18px 0", position: "relative", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "10px", letterSpacing: "0.18em", fontWeight: 700, textTransform: "uppercase", color: "#5e7fb3" }}>Pravix Strategy Navigator</p>
                    <h3 style={{ margin: "3px 0 0", fontSize: "17px", lineHeight: 1.2, fontWeight: 800, color: "#122c52" }}>Family Wealth Strategy</h3>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 9px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#205eb8",
                      background: "rgba(80,138,255,0.12)",
                      border: "1px solid rgba(80,138,255,0.24)",
                    }}
                  >
                    <span className="hero-live-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2b5cff" }} />
                    Live sync
                  </span>
                </div>
              </div>

              <div
                style={{
                  margin: "12px 18px 0",
                  borderRadius: "20px",
                  background: "linear-gradient(145deg, #2b5cff 0%, #1f49d4 62%, #1a3ba6 100%)",
                  padding: "14px 14px 12px",
                  color: "#f6fbff",
                  boxShadow: "0 16px 28px rgba(26,62,170,0.32)",
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      display: "flex",
                      width: `${goalSlides.length * 100}%`,
                      transform: `translateX(-${(100 / goalSlides.length) * activeGoalIndex}%)`,
                      transition: "transform 720ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    {goalSlides.map((goal) => (
                      <div key={goal.id} style={{ width: `${100 / goalSlides.length}%`, flexShrink: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ margin: 0, fontSize: "10px", letterSpacing: "0.12em", fontWeight: 700, textTransform: "uppercase", color: "rgba(234,244,255,0.9)" }}>Primary goal</p>
                            <h4 style={{ margin: "3px 0 0", fontSize: "15px", fontWeight: 800, lineHeight: 1.2 }}>{goal.title}</h4>
                          </div>

                          <div style={{ position: "relative", width: "56px", height: "56px" }}>
                            <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
                              <circle cx="28" cy="28" r={goalRingRadius} stroke="rgba(255,255,255,0.24)" strokeWidth="6" fill="none" />
                              <circle
                                cx="28"
                                cy="28"
                                r={goalRingRadius}
                                stroke="#8de4ff"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={goalRingCircumference}
                                strokeDashoffset={goal.ringOffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span
                              style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 800,
                              }}
                            >
                              {Math.round(goal.goalProgress)}%
                            </span>
                          </div>
                        </div>

                        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          <div>
                            <p style={{ margin: 0, fontSize: "10px", color: "rgba(234,244,255,0.84)" }}>Current</p>
                            <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700 }}>{formatCompactInr(goal.currentValue)}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontSize: "10px", color: "rgba(234,244,255,0.84)" }}>Target</p>
                            <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700 }}>{formatCompactInr(goal.targetValue)}</p>
                          </div>
                        </div>

                        <div style={{ marginTop: "10px", width: "100%", height: "6px", borderRadius: "999px", background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${goal.goalProgress}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, #98f2ff 0%, #d5fbff 100%)",
                              borderRadius: "999px",
                            }}
                          />
                        </div>

                        <p style={{ margin: "8px 0 0", fontSize: "11px", lineHeight: 1.35, color: "rgba(236,246,255,0.95)" }}>
                          {goal.reassurance}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "8px", display: "flex", justifyContent: "center", gap: "5px" }}>
                  {goalSlides.map((goal, index) => (
                    <span
                      key={goal.id}
                      style={{
                        width: index === activeGoalIndex ? "18px" : "6px",
                        height: "6px",
                        borderRadius: "999px",
                        background: index === activeGoalIndex ? "#d5fbff" : "rgba(213,251,255,0.42)",
                        transition: "all 380ms ease",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div
                style={{
                  margin: "12px 18px 0",
                  borderRadius: "18px",
                  border: "1px solid #d6e4ff",
                  background: "#f6f9ff",
                  padding: "12px 12px 10px",
                  boxShadow: "0 8px 20px rgba(43,92,255,0.1)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: "#6789b8" }}>Live wealth vs goal path</p>
                    <p style={{ margin: "4px 0 0", fontSize: "22px", lineHeight: 1, fontWeight: 800, color: "#132b4f" }}>
                      Rs {inrFormatter.format(totalValue)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "999px",
                        border: "1px solid #b7d1ff",
                        background: "#e8f1ff",
                        color: "#2b5cff",
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "4px 8px",
                      }}
                    >
                      +{gainPct.toFixed(2)}%
                    </span>
                    <p style={{ margin: "6px 0 0", fontSize: "10px", color: "#6f86a8", fontWeight: 600 }}>
                      Projected {formatCompactInr(projectedValue)}
                    </p>
                  </div>
                </div>

                <svg width="100%" height="132" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`heroLiveFill-${gradientSuffix}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2b5cff" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#2b5cff" stopOpacity="0.04" />
                    </linearGradient>
                    <linearGradient id={`heroBandFill-${gradientSuffix}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8ab9ff" stopOpacity="0.26" />
                      <stop offset="100%" stopColor="#8ab9ff" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  <rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} rx="10" fill="#f8fbff" />

                  {[24, 48, 72, 96, 120].map((lineY) => (
                    <line key={lineY} x1="0" y1={lineY} x2={CHART_WIDTH} y2={lineY} stroke="#d6e2f4" strokeWidth="1" />
                  ))}

                  <path d={confidenceBandPath} fill={`url(#heroBandFill-${gradientSuffix})`} />
                  <path d={liveFillPath} fill={`url(#heroLiveFill-${gradientSuffix})`} />

                  <path
                    d={targetPath}
                    fill="none"
                    stroke="#6f86a8"
                    strokeWidth="2.1"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={livePath}
                    fill="none"
                    stroke="#2b5cff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <circle className="hero-live-pulse" cx={latestPoint.x} cy={latestPoint.y} r="6" fill="rgba(43,92,255,0.45)" />
                  <circle cx={latestPoint.x} cy={latestPoint.y} r="3.6" fill="#2b5cff" />
                </svg>

                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#6983a9", fontSize: "10px", fontWeight: 700 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "14px", height: "2px", background: "#2b5cff", borderRadius: "2px" }} /> Wealth live
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "14px", height: "2px", background: "#6f86a8", borderRadius: "2px", borderTop: "1px dashed #6f86a8" }} /> Required path
                    </span>
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#2d62c8" }}>Confidence band</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "7px", padding: "10px 18px 0" }}>
                {[
                  { title: "Risk fit", value: "Moderate" },
                  { title: "Diversified", value: "8 funds" },
                  { title: "SIP streak", value: "14 months" },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      borderRadius: "12px",
                      border: "1px solid #d6e3ff",
                      background: "#ffffff",
                      padding: "8px 7px",
                      textAlign: "center",
                      boxShadow: "0 5px 12px rgba(43,92,255,0.08)",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7d93b2", fontWeight: 700 }}>{item.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#15335c", fontWeight: 800 }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div
                style={{
                  margin: "10px 18px 0",
                  borderRadius: "14px",
                  border: "1px solid #d4e2ff",
                  background: "#ffffff",
                  padding: "11px 12px",
                  boxShadow: "0 8px 16px rgba(43,92,255,0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <p style={{ margin: 0, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: "#6788b9" }}>Next strategic action</p>
                  <span style={{ borderRadius: "999px", background: "#edf4ff", border: "1px solid #caddff", padding: "3px 7px", fontSize: "9px", color: "#2b5cff", fontWeight: 800 }}>
                    AI verified
                  </span>
                </div>
                <p style={{ margin: "5px 0 0", fontSize: "11px", lineHeight: 1.4, color: "#2f4b72", fontWeight: 600 }}>
                  Invest Rs {inrFormatter.format(monthlyStep)} before {activeGoal.deadlineLabel} to stay ahead of your {activeGoal.runwayLabel}.
                </p>
                <div style={{ marginTop: "7px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", color: "#2457aa", fontWeight: 800 }}>Trust score 94/100</span>
                  <span style={{ fontSize: "10px", color: "#6f86a8", fontWeight: 700 }}>Stress-free planning</span>
                </div>
              </div>

              <div style={{ marginTop: "auto", padding: "12px 18px 14px" }}>
                <div
                  style={{
                    borderRadius: "14px",
                    border: "1px solid #d4e2ff",
                    background: "rgba(255,255,255,0.92)",
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {[
                    { label: "Home", active: true },
                    { label: "Goals", active: false },
                    { label: "AI", active: false },
                    { label: "Profile", active: false },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "5px",
                          border: item.active ? "1px solid #2b5cff" : "1px solid #c9d8f2",
                          background: item.active ? "#2b5cff" : "#f3f7ff",
                        }}
                      />
                      <span style={{ fontSize: "9px", fontWeight: item.active ? 800 : 700, color: item.active ? "#1e4dc7" : "#91a3bf" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: "linear-gradient(160deg, rgba(255,255,255,0) 68%, rgba(255,255,255,0.28) 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes phoneFloat {
          0%,
          100% {
            transform: perspective(1450px) rotateX(5deg) rotateY(-15deg) rotateZ(7deg) translateY(0px);
          }
          50% {
            transform: perspective(1450px) rotateX(6deg) rotateY(-17deg) rotateZ(7.4deg) translateY(-9px);
          }
        }

        @keyframes ambientPulse {
          0%,
          100% {
            opacity: 0.72;
            transform: scale(1);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.04);
          }
        }

        @keyframes glassSweep {
          0%,
          100% {
            transform: translateX(0) rotate(9deg);
            opacity: 0.62;
          }
          50% {
            transform: translateX(18px) rotate(9deg);
            opacity: 0.86;
          }
        }

        @keyframes livePulse {
          0% {
            transform: scale(0.85);
            opacity: 0.7;
          }
          70% {
            transform: scale(1.8);
            opacity: 0;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        @keyframes liveBlink {
          0%,
          100% {
            opacity: 0.45;
          }
          50% {
            opacity: 1;
          }
        }

        .hero-phone-float {
          animation: phoneFloat 5.4s ease-in-out infinite;
        }

        .hero-live-pulse {
          animation: livePulse 1.8s ease-out infinite;
          transform-origin: center;
        }

        .hero-live-dot {
          animation: liveBlink 1.6s ease-in-out infinite;
        }

        .hero-ambient-glow {
          animation: ambientPulse 4.6s ease-in-out infinite;
        }

        .hero-glass-sheen {
          animation: glassSweep 5.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
