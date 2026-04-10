"use client";

import { useEffect, useState } from "react";

/* ────────────────────────────────────────────────
   Exact Match Animated Phone Mockup
   ──────────────────────────────────────────────── */
export default function HeroPhoneMockup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative w-full flex justify-center items-center"
      style={{
        minHeight: "600px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── Global Scaler wrapper ── */}
      <div style={{ transform: "scale(0.85)", position: "relative", width: "350px", height: "680px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        
        {/* ── Floor Shadow ── */}
        <div
          style={{
            position: "absolute",
            bottom: "-30px", // Adjusted for inner centering
            width: "300px",
            height: "20px",
            background: "#8EB0E8",
            borderRadius: "50%",
            filter: "blur(6px)",
            opacity: 0.6,
            transform: "rotate(-10deg) translateX(-10px)",
          }}
        />

        {/* Wrapper holding the phone at a fixed angle */}
        <div
          style={{
            position: "relative",
            transform: "rotate(13deg)",
            transformOrigin: "center center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.6s ease",
            width: "350px",
            height: "680px",
          }}
        >
          {/* ── Blue 3D Casing Backing ── */}
          <div
            style={{
              position: "absolute",
              top: "-15px",
              right: "-25px",
              bottom: "-5px",
              left: "5px",
              background: "linear-gradient(145deg, #81b3ff 0%, #4f82e3 45%, #9fc3ff 100%)",
              borderRadius: "58px",
              border: "1px solid #3d6fcb",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.8), inset -5px -8px 12px rgba(35,71,146,0.35), 18px 28px 38px rgba(20,35,64,0.28)",
            }}
          >
            {/* Top highlight segment on casing */}
            <div style={{ position: "absolute", top: "0", right: "20%", width: "46%", height: "16px", background: "rgba(206,229,255,0.7)", borderRadius: "16px 16px 0 0" }} />
            {/* Left-side action + volume buttons */}
            <div style={{ position: "absolute", top: "130px", left: "-4px", width: "7px", height: "32px", background: "#74a8ff", borderRadius: "4px", border: "1px solid #3d6fcb" }} />
            <div style={{ position: "absolute", top: "178px", left: "-4px", width: "7px", height: "58px", background: "#74a8ff", borderRadius: "4px", border: "1px solid #3d6fcb" }} />
            <div style={{ position: "absolute", top: "248px", left: "-4px", width: "7px", height: "58px", background: "#74a8ff", borderRadius: "4px", border: "1px solid #3d6fcb" }} />
            {/* Right-side power button */}
            <div style={{ position: "absolute", top: "185px", right: "-4px", width: "7px", height: "84px", background: "#74a8ff", borderRadius: "4px", border: "1px solid #3d6fcb" }} />
          </div>

        {/* ── Front Glass / Frame ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg, #d7e7ff 0%, #a9c6f7 48%, #e9f2ff 100%)",
            borderRadius: "52px",
            border: "1px solid #6f94ca",
            boxShadow: "-4px -4px 14px rgba(255,255,255,0.7), inset 1px 1px 2px rgba(255,255,255,0.8), inset -1px -1px 3px rgba(57,74,101,0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "visible", // Must be visible for chart line to pop out
          }}
        >
          {/* Screen Content Wrapper with hidden overflow bounds */}
          <div
            style={{
              position: "absolute",
              inset: "7px",
              background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
              borderRadius: "45px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(15,27,46,0.22)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)",
            }}
          >
            {/* iPhone-style status bar */}
            <div
              style={{
                position: "absolute",
                top: "14px",
                left: "18px",
                right: "18px",
                zIndex: 30,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pointerEvents: "none",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#243553", letterSpacing: "0.2px" }}>9:41</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "1px", height: "10px" }}>
                  <span style={{ display: "block", width: "2px", height: "4px", background: "#243553", borderRadius: "1px" }} />
                  <span style={{ display: "block", width: "2px", height: "6px", background: "#243553", borderRadius: "1px" }} />
                  <span style={{ display: "block", width: "2px", height: "8px", background: "#243553", borderRadius: "1px" }} />
                  <span style={{ display: "block", width: "2px", height: "10px", background: "#243553", borderRadius: "1px" }} />
                </div>
                <svg width="14" height="10" viewBox="0 0 18 12" fill="none">
                  <path d="M1 11C2.5 7 5 5 9 5C13 5 15.5 7 17 11" stroke="#243553" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M4 11C5 8.8 6.5 7.8 9 7.8C11.5 7.8 13 8.8 14 11" stroke="#243553" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <div style={{ width: "20px", height: "10px", border: "1.5px solid #243553", borderRadius: "3px", position: "relative" }}>
                  <div style={{ position: "absolute", top: "1px", left: "1px", width: "13px", height: "6px", background: "#243553", borderRadius: "1px" }} />
                  <div style={{ position: "absolute", right: "-3px", top: "2px", width: "2px", height: "4px", background: "#243553", borderRadius: "0 1px 1px 0" }} />
                </div>
              </div>
            </div>

            {/* iPhone Dynamic Island / notch */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "122px",
                height: "34px",
                borderRadius: "999px",
                background: "#05070D",
                zIndex: 31,
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.12), 0 3px 7px rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 12px",
                pointerEvents: "none",
              }}
            >
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#0f1520", border: "1px solid #2c3340", boxShadow: "inset 0 0 3px rgba(65,117,189,0.35)" }} />
              <div style={{ width: "28px", height: "7px", borderRadius: "999px", background: "rgba(58,66,84,0.55)" }} />
            </div>

            {/* Light reflection on top glass */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "120px",
                background: "linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0))",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "66px 25px 15px", position: "relative", zIndex: 3 }}>
              <div style={{ width: "20px", height: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ height: "2px", background: "#6B85A1", borderRadius: "2px" }} />
                <div style={{ height: "2px", background: "#6B85A1", borderRadius: "2px" }} />
                <div style={{ height: "2px", background: "#6B85A1", borderRadius: "2px" }} />
              </div>
              <div style={{ fontWeight: 800, color: "#142A4A", fontSize: "16px" }}>Hey Ashwin</div>
              <div style={{ width: "22px", height: "16px", border: "2px solid #5C88B5", borderRadius: "3px", position: "relative" }}>
                 <div style={{ position: 'absolute', top: '1px', left: '1px', right: '1px', height: '4px', background: '#5C88B5', borderRadius: '1px' }} />
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 25px 25px" }}>
              {[
                { label: "Deposit", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>, cx: 'M8 10h8v4H8z M12 6v2' },
                { label: "Create", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> },
                { label: "Learn", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg> },
                { label: "Refer", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="14" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="22"></line><path d="M12 8H8a2 2 0 0 1 0-4h4v4z"></path><path d="M12 8h4a2 2 0 0 0 0-4h-4v4z"></path></svg> },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#E8F0FA", display: "flex", alignItems: "center", justifyContent: "center", color: "#5488C4" }}>
                    {i === 0 ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M12 12v6m-2-2l2 2 2-2"/></svg> : item.icon}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#6A8CBA" }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* ── Portfolio Value ── */}
            <div style={{ padding: "0 25px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "4px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#788C9F" }}>Total value (INR)</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#25B495" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#142A4A", letterSpacing: "-0.5px", lineHeight: 1 }}>₹15,68,819</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#788C9F" }}>Net deposits</span>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#E8F0FA", color: "#5488C4", fontSize: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>i</div>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#142A4A" }}>₹13,50,000</div>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px" }}>
                <span style={{ background: "#E2F5ED", color: "#25B495", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>+₹2,18,819</span>
                <span style={{ fontSize: "10px", fontWeight: 500, color: "#8E9EAF" }}>since 27 Apr 2021</span>
              </div>
            </div>

            {/* ── Chart Area inside screen bounds ── */}
            <div style={{ position: "relative", height: "146px", marginTop: "12px" }}>
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} preserveAspectRatio="none" viewBox="0 0 350 146">
                <defs>
                  <linearGradient id="heroTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4B78DF" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="#4B78DF" stopOpacity="0.04" />
                  </linearGradient>
                </defs>

                <rect x="0" y="0" width="350" height="146" fill="#F1F3F7" />

                {/* Horizontal guide lines like the reference graph */}
                <line x1="0" y1="28" x2="350" y2="28" stroke="#D2D8E3" strokeWidth="1" />
                <line x1="0" y1="56" x2="350" y2="56" stroke="#D2D8E3" strokeWidth="1" />
                <line x1="0" y1="84" x2="350" y2="84" stroke="#D2D8E3" strokeWidth="1" />
                <line x1="0" y1="112" x2="350" y2="112" stroke="#D2D8E3" strokeWidth="1" />

                {/* Soft area fill under the trend line */}
                <path
                  d="M8 112 L20 98 L32 104 L44 97 L56 106 L68 114 L80 109 L92 118 L104 122 L116 126 L128 120 L140 124 L152 114 L164 103 L176 94 L188 88 L200 84 L212 76 L224 71 L236 65 L248 58 L260 62 L272 54 L284 44 L296 24 L308 42 L320 16 L332 22 L338 12 L338 146 L8 146 Z"
                  fill="url(#heroTrendFill)"
                />

                {/* Blue jagged uptrend matching the attached chart style */}
                <polyline
                  points="8,112 20,98 32,104 44,97 56,106 68,114 80,109 92,118 104,122 116,126 128,120 140,124 152,114 164,103 176,94 188,88 200,84 212,76 224,71 236,65 248,58 260,62 272,54 284,44 296,24 308,42 320,16 332,22 338,12"
                  fill="none"
                  stroke="#2E6FE4"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "8px",
                  background: "#E8EEFC",
                  color: "#2E6FE4",
                  border: "1px solid #C8D5F5",
                  borderRadius: "999px",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "4px 9px",
                  boxShadow: "0 2px 8px rgba(46,111,228,0.16)",
                }}
              >
                +14.8%
              </div>
            </div>

            {/* ── Time Tabs ── */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 25px", marginTop: "-10px" }}>
              {["1M", "3M", "6M", "YTD", "1Y"].map(t => (
                <span key={t} style={{ fontSize: "10px", fontWeight: 700, color: "#A0B2C4" }}>{t}</span>
              ))}
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#25B495", background: "#E2F5ED", padding: "2px 8px", borderRadius: "10px" }}>All-time</span>
            </div>
            
            <div style={{ padding: "10px 25px 20px" }}>
              <p style={{ fontSize: "10px", color: "#8E9EAF" }}>
                <span style={{ textDecoration: "underline", textDecorationStyle: "dashed", textDecorationColor: "#25B495" }}>Exchange rates</span> and security prices as of 2 May 2025.
              </p>
            </div>

            {/* ── My Investments ── */}
            <div style={{ padding: "0 25px", flex: 1 }}>
              <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#142A4A", marginBottom: "15px" }}>My investments (INR)</h3>
              
              {/* Item 1 */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ width: "42px", height: "42px", background: "#E8F0FA", borderRadius: "8px", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "8px", marginRight: "15px" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "20px" }}>
                    <div style={{ width: "6px", height: "10px", background: "#4A82E8", borderRadius: "1px" }}/>
                    <div style={{ width: "6px", height: "16px", background: "#4A82E8", borderRadius: "1px" }}/>
                    <div style={{ width: "6px", height: "20px", background: "#4A82E8", borderRadius: "1px" }}/>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#142A4A" }}>Lisa&apos;s Education Fund</div>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "#8E9EAF" }}>SRI 22.0%</div>
                </div>
                <div style={{ textAlign: "right", marginRight: "10px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#142A4A" }}>₹2,56,000</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#25B495" }}>+₹10,000</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A0B2C4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>

              {/* Item 2 */}
              <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                <div style={{ width: "42px", height: "42px", background: "#E8F0FA", borderRadius: "8px", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "8px", marginRight: "15px" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "20px" }}>
                    <div style={{ width: "6px", height: "10px", background: "#4A82E8", borderRadius: "1px" }}/>
                    <div style={{ width: "6px", height: "14px", background: "#4A82E8", borderRadius: "1px" }}/>
                    <div style={{ width: "6px", height: "18px", background: "#4A82E8", borderRadius: "1px" }}/>
                  </div>
                </div>
                {/* SRS Badge */}
                <div style={{ position: "absolute", top: "-6px", left: "20px", background: "#3A72D8", color: "white", fontSize: "7px", fontWeight: "bold", padding: "2px 4px", borderRadius: "8px" }}>SRS</div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#142A4A" }}>Retire &amp; Chill Fund</div>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "#8E9EAF" }}>SRI 14.0%</div>
                </div>
                <div style={{ textAlign: "right", marginRight: "10px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#142A4A" }}>₹53,642</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#25B495" }}>+₹1,464</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A0B2C4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </div>

            {/* ── Space Blob inside screen bottom ── */}
            <div style={{ position: "absolute", bottom: -5, right: -5, zIndex: 0 }}>
              <svg width="160" height="90" viewBox="0 0 160 90" fill="none">
                <path d="M160 90H20C20 90 40 85 50 65C62 40 85 45 100 25C115 5 130 -5 160 10V90Z" fill="#E8F2FF" />
                {/* Stars in blob */}
                <circle cx="100" cy="45" r="1.5" fill="#7FA2CF" />
                <circle cx="140" cy="30" r="1" fill="#7FA2CF" />
                <circle cx="125" cy="60" r="2" fill="#7FA2CF" opacity="0.8" />
                <circle cx="70" cy="65" r="1" fill="#7FA2CF" opacity="0.6" />
                <circle cx="150" cy="70" r="1.5" fill="#7FA2CF" />
              </svg>
            </div>

            {/* ── Bottom Nav ── */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 30px 20px", position: "relative", zIndex: 1 }}>
              {[
                 { label: "Home", active: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#142A4A" stroke="#142A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
                 { label: "Invest", active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A0B2C4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
                 { label: "Transfer", active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A0B2C4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg> },
                 { label: "Insights", active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A0B2C4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="2" x2="12" y2="12"></line><line x1="12" y1="12" x2="22" y2="12"></line></svg> },
                 { label: "Learn", active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A0B2C4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg> }
              ].map(item => (
                 <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                   {item.icon}
                   <span style={{ fontSize: "10px", fontWeight: item.active ? 800 : 600, color: item.active ? "#142A4A" : "#A0B2C4" }}>{item.label}</span>
                 </div>
              ))}
            </div>
            
            {/* Bottom active indicator */}
            <div style={{ position: "absolute", bottom: "8px", left: "100px", width: "40px", height: "4px", background: "#7DB2C9", borderRadius: "2px" }} />

          </div>


          {/* ── Animated Rocket & Sparkles Group ── */}
          <div 
            style={{ 
              position: "absolute", 
              top: "-20px", 
              right: "-130px", 
              width: "200px", 
              height: "200px",
              pointerEvents: "none",
              zIndex: 20,
              animation: "rocketFly 3s ease-in-out infinite",
            }}
          >
             {/* Sparkles */}
             <svg width="24" height="24" viewBox="0 0 24 24" fill="#3B7DE6" style={{ position: "absolute", bottom: "80px", left: "20px", opacity: 0.8 }}>
               <path d="M12 0 C12 7 17 12 24 12 C17 12 12 17 12 24 C12 17 7 12 0 12 C7 12 12 7 12 0 Z" />
             </svg>
             <svg width="34" height="34" viewBox="0 0 24 24" fill="#3B7DE6" style={{ position: "absolute", bottom: "50px", left: "40px" }}>
               <path d="M12 0 C12 7 17 12 24 12 C17 12 12 17 12 24 C12 17 7 12 0 12 C7 12 12 7 12 0 Z" />
             </svg>

             {/* The Rocket */}
             <svg width="100" height="120" viewBox="0 0 100 120" fill="none" style={{ position: "absolute", top: "20px", left: "40px", transform: "rotate(30deg)" }}>
                {/* Flame */}
                <path d="M35 80 Q50 110 65 80 Q50 90 35 80 Z" fill="#FFEAA0">
                   <animate attributeName="d" values="M35 80 Q50 115 65 80 Q50 90 35 80 Z; M35 80 Q50 100 65 80 Q50 85 35 80 Z; M35 80 Q50 115 65 80 Q50 90 35 80 Z" dur="0.4s" repeatCount="indefinite" />
                </path>
                <path d="M42 80 Q50 100 58 80 Q50 85 42 80 Z" fill="#FBA653">
                   <animate attributeName="d" values="M42 80 Q50 105 58 80 Q50 88 42 80 Z; M42 80 Q50 95 58 80 Q50 85 42 80 Z; M42 80 Q50 105 58 80 Q50 88 42 80 Z" dur="0.3s" repeatCount="indefinite" />
                </path>

                {/* Left Fin */}
                <path d="M35 70 L20 85 L28 60 Z" fill="#4A82E8"/>
                {/* Right Fin */}
                <path d="M65 70 L80 85 L72 60 Z" fill="#4A82E8"/>

                {/* Body */}
                <path d="M30 75 C30 75 25 40 50 10 C75 40 70 75 70 75 Z" fill="#FFFFFF" stroke="#D1DEE8" strokeWidth="1"/>
                <path d="M30 75 C30 75 25 40 50 10 C45 40 45 75 45 75 Z" fill="#E8EEF5" opacity="0.6"/>

                {/* Nose Cone */}
                <path d="M43 23 C43 23 48 12 50 10 C52 12 57 23 57 23 C52 25 48 25 43 23 Z" fill="#4A82E8" />
                <path d="M50 10 C48 12 45 20 46 24 C46 24 49 14 50 10 Z" fill="#FFFFFF" opacity="0.4"/>

                {/* Porthole */}
                <circle cx="50" cy="45" r="8" fill="#A8D0E6" stroke="#4A82E8" strokeWidth="2"/>
                <circle cx="48" cy="43" r="3" fill="#FFFFFF" opacity="0.8"/>
             </svg>
          </div>
        </div>
      </div>
      </div>

      <style jsx>{`
        @keyframes rocketFly {
          0% { transform: translate(0, 0); }
          50% { transform: translate(15px, -15px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
}
