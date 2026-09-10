document.addEventListener("DOMContentLoaded", () => {

    // ── 0. Style CodeVerseAI Title: 'Code' (white) + 'VerseAI' (purple/pink) with Shine ──
    const brandTitle = document.querySelector(".hero-title");
    if (brandTitle) {
        // Robust check: matches CodeVerseAI regardless of spaces or capital letters
        if (!brandTitle.querySelector("span") && /CodeVerse\s?AI/i.test(brandTitle.textContent)) {
            brandTitle.innerHTML = 'Code<span>VerseAI</span>';
        }
        
        brandTitle.style.setProperty("display", "inline-block", "important");
        brandTitle.style.setProperty("font-size", "8rem", "important");
        brandTitle.style.setProperty("margin-bottom", "30px", "important");
        brandTitle.style.setProperty("color", "#ffffff", "important");
        
        // Subtle "dim shine" shadow pulse for a premium look
        brandTitle.style.setProperty("filter", "drop-shadow(0 0 8px rgba(168, 85, 247, 0.2))", "important");
        brandTitle.style.setProperty("animation", "titleGlowShine 4s ease-in-out infinite alternate", "important");

        const brandSpan = brandTitle.querySelector("span");
        if (brandSpan) {
            // VerseAI gradient: Purple (#a855f7) to Pink (#ec4899) matching the buttons perfectly
            brandSpan.style.setProperty("background", "linear-gradient(90deg, #a855f7, #ec4899, #a855f7)", "important");
            brandSpan.style.setProperty("background-size", "200% 100%", "important");
            brandSpan.style.setProperty("-webkit-background-clip", "text", "important");
            brandSpan.style.setProperty("-webkit-text-fill-color", "transparent", "important");
            brandSpan.style.setProperty("animation", "textGradientMove 5s linear infinite", "important");
            brandSpan.style.setProperty("display", "inline-block", "important");

            if (!document.getElementById("brand-anim-css")) {
                const styleNode = document.createElement("style");
                styleNode.id = "brand-anim-css";
                styleNode.textContent = `
@keyframes textGradientMove {
    0% { background-position: 0% center; }
    100% { background-position: 200% center; }
}
@keyframes titleGlowShine {
    from { text-shadow: 0 0 5px rgba(255, 255, 255, 0.15); }
    to { text-shadow: 0 0 15px rgba(255, 255, 255, 0.45), 0 0 10px rgba(168, 85, 247, 0.2); }
}
`;
                document.head.appendChild(styleNode);
            }
        }
    }

    // ── 0.1 Style Welcome Message & Emoji Color Fix ─────────────────────
    // Search for the subtitle or any element containing the welcome message
    const heroSubtitle = document.querySelector(".hero-subtitle") || document.querySelector("p.welcome-text");
    
    if (heroSubtitle) {
        // Force reset any gradient/clipping that turns the emoji purple/pink
        heroSubtitle.style.setProperty("font-size", "1.1rem", "important");
        heroSubtitle.style.setProperty("white-space", "nowrap", "important");
        heroSubtitle.style.setProperty("background", "none", "important");
        heroSubtitle.style.setProperty("-webkit-text-fill-color", "initial", "important");
        heroSubtitle.style.setProperty("-webkit-background-clip", "initial", "important");
        
        const content = heroSubtitle.innerHTML;
        if (content.includes('🔥')) {
            const parts = content.split('🔥');
            // Wrap text parts in spans with muted gray, leaving the fire emoji outside to keep its orange color
            heroSubtitle.innerHTML = `<span style="color: #94a3b8 !important;">${parts[0]}</span>🔥<span style="color: #94a3b8 !important;">${parts[1] || ''}</span>`;
        } else {
            heroSubtitle.style.setProperty("color", "#94a3b8", "important");
        }
    }
    // ── Module progress data (match your actual values) ───────────────────
    const algoData = JSON.parse(localStorage.getItem("algorithmProgress")) || {};
    const memData = JSON.parse(localStorage.getItem("memoryProgress")) || {};
    const sqlAttempts = Number(localStorage.getItem("sqlAttempted") || 0);
    const sqlCorrect = Number(localStorage.getItem("sqlCorrect") || 0);

    const MODULE_PROGRESS = {
        algorithms: Math.min(100, Math.round(((algoData.runs || 0) * 5) + ((algoData.correct || 0) * 10))),
        memory: Math.min(100, Math.round(((memData.actions || 0) * 2) + ((memData.quizCorrect || 0) * 15))),
        sql: Math.min(100, Math.round((sqlAttempts * 5) + (sqlCorrect * 10)))
    };

    // ── 1. Inject SVG gradient defs for ring charts ───────────────────────
    const svgDefs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgDefs.setAttribute("width", "0");
    svgDefs.setAttribute("height", "0");
    svgDefs.style.position = "absolute";
    svgDefs.innerHTML = `
        <defs>
            <linearGradient id="algoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#a855f7"/>
                <stop offset="100%" stop-color="#ec4899"/>
            </linearGradient>
            <linearGradient id="memGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#a855f7"/>
                <stop offset="100%" stop-color="#ec4899"/>
            </linearGradient>
            <linearGradient id="sqlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#a855f7"/>
                <stop offset="100%" stop-color="#ec4899"/>
            </linearGradient>
        </defs>
    `;
    document.body.prepend(svgDefs);

    // ── 2. Animate progress bars on load ─────────────────────────────────
    const fills = document.querySelectorAll(".fill");
    fills.forEach(fill => {
        const target = fill.style.getPropertyValue("--target") || "0%";
        setTimeout(() => { fill.style.width = target; }, 300);
    });

    // ── 3. Overall progress bar ───────────────────────────────────────────
    const values = Object.values(MODULE_PROGRESS);
    const overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const overallFill = document.getElementById("overall-fill");
    const overallPct  = document.getElementById("overall-pct");
    if (overallFill && overallPct) {
        setTimeout(() => {
            overallFill.style.width = overall + "%";
            overallPct.textContent = overall + "%";
        }, 400);
    }

    // ── 4. Smart AI Insight (based on actual progress) ────────────────────
    const streakDataObj = JSON.parse(localStorage.getItem("cvai_streak") || "{}");
    const currentStreakCount = streakDataObj.count || 0;

    const aiMsg = document.getElementById("dynamic-ai-msg");
    const aiSuggestion = document.getElementById("ai-suggestion-text");
    
    fetch("/api/dashboard-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...MODULE_PROGRESS, streak: currentStreakCount })
    })
    .then(r => r.json())
    .then(chosen => {
        if (aiMsg) {
            const targetHTML = chosen.main;
            const targetPlain = targetHTML.replace(/<[^>]+>/g, "");
            aiMsg.innerHTML = "";
            let i = 0;
            function typeWriter() {
                if (i < targetPlain.length) {
                    aiMsg.textContent = targetPlain.substring(0, i + 1);
                    i++;
                    setTimeout(typeWriter, 20);
                } else {
                    aiMsg.innerHTML = targetHTML;
                }
            }
            setTimeout(typeWriter, 800);
        }
        if (aiSuggestion) {
            aiSuggestion.textContent = chosen.tip;
        }
    })
    .catch(e => console.error("Insight error:", e));

    // ── 5. Dynamic Learning Streak (localStorage-based, updates daily) ────
    const TODAY = new Date().toDateString();
    const streakData = JSON.parse(localStorage.getItem("cvai_streak") || "{}");

    // streakData shape: { count: Number, lastVisit: DateString, startDate: DateString }
    let { count = 0, lastVisit = null } = streakData;

    if (lastVisit === TODAY) {
        // Already visited today — streak unchanged
    } else if (lastVisit) {
        const last = new Date(lastVisit);
        const today = new Date(TODAY);
        const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Consecutive day — extend streak
            count += 1;
        } else if (diffDays > 1) {
            // Missed a day — reset
            count = 1;
        }
    } else {
        // First ever visit
        count = 1;
    }

    localStorage.setItem("cvai_streak", JSON.stringify({ count, lastVisit: TODAY }));

    // Render streak value
    const streakValueEl = document.getElementById("streak-value");
    const streakMsgEl   = document.getElementById("streak-msg");
    const streakDotsEl  = document.getElementById("streak-dots");

    if (streakValueEl) streakValueEl.textContent = `${count} Day${count !== 1 ? "s" : ""}`;

    if (streakMsgEl) {
        if (count >= 30)      streakMsgEl.textContent = "You're on fire! Legendary streak! 🏆";
        else if (count >= 14) streakMsgEl.textContent = "Two weeks strong! You're unstoppable 🔥";
        else if (count >= 7)  streakMsgEl.textContent = "One week streak! Amazing consistency 🚀";
        else if (count >= 3)  streakMsgEl.textContent = "Keep going! You're building momentum 🚀";
        else if (count === 2) streakMsgEl.textContent = "Two days in! Come back tomorrow 💪";
        else                  streakMsgEl.textContent = "Great start! Come back tomorrow to build your streak 🌟";
    }

    if (streakDotsEl) {
        // Show last 7 days as dots
        const dotsToShow = Math.min(count, 7);
        const totalDots  = 7;
        streakDotsEl.innerHTML = "";

        for (let d = 0; d < totalDots; d++) {
            const dot = document.createElement("span");
            dot.className = "streak-dot " + (d < dotsToShow ? "active" : "inactive");
            dot.textContent = d < dotsToShow ? "✓" : "";
            streakDotsEl.appendChild(dot);
        }
    }

    // ── 6. Interactive parallax glows on mousemove ───────────────────────
    const glow1 = document.querySelector(".glow1");
    const glow2 = document.querySelector(".glow2");

    document.addEventListener("mousemove", (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        if (glow1) glow1.style.transform = `translate(${x * 70}px, ${y * 70}px)`;
        if (glow2) glow2.style.transform = `translate(${-x * 70}px, ${-y * 70}px)`;
    });

    // ── 7. Highlight active nav link based on current URL ────────────────
    const navLinks = document.querySelectorAll(".nav-links a");
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === currentPath) link.classList.add("active");
    });

    if (currentPath === "/" || currentPath === "/index.html") {
        const homeLink = document.querySelector(".nav-links a[href='/']");
        if (homeLink) homeLink.classList.add("active");
    }

    // ── 8. Hide navbar when scrolling down, show when scrolling up ───────
    const navbar = document.querySelector(".navbar");
    let lastScrollY = 0;

    window.addEventListener("scroll", () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 80) {
            navbar.classList.add("hidden");
        } else {
            navbar.classList.remove("hidden");
        }
        lastScrollY = currentScrollY;
    }, { passive: true });

    // ── 9. Module card hover — 3D tilt + lift effect ──────────────────────
    const moduleCards = document.querySelectorAll(".module-card");
    moduleCards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) / (rect.width / 2);
            const dy = (e.clientY - cy) / (rect.height / 2);
            card.style.transform = `translateY(-14px) scale(1.03) rotateX(${-dy * 5}deg) rotateY(${dx * 5}deg)`;
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "";
        });
    });

    // ── 10. Progress card hover pulse ────────────────────────────────────
    const progressCards = document.querySelectorAll(".progress-card");
    progressCards.forEach(card => {
        card.addEventListener("mouseenter", () => {
            const fill = card.querySelector(".fill");
            if (fill) fill.style.boxShadow = "0 0 12px rgba(168,85,247,0.6)";
        });
        card.addEventListener("mouseleave", () => {
            const fill = card.querySelector(".fill");
            if (fill) fill.style.boxShadow = "";
        });
    });

    // ── 11. SQL terminal blinking cursor ─────────────────────────────────
    const sqlTerminal = document.querySelector(".sql-terminal");
    if (sqlTerminal) {
        const cursor = document.createElement("span");
        cursor.textContent = "█";
        cursor.style.cssText = `
            color: #22c55e;
            animation: blink 1s step-end infinite;
            margin-left: 4px;
            font-size: 0.75rem;
        `;
        sqlTerminal.appendChild(cursor);

        if (!document.getElementById("blink-style")) {
            const s = document.createElement("style");
            s.id = "blink-style";
            s.textContent = `
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0; }
                }
            `;
            document.head.appendChild(s);
        }
    }

    // ── 12. Mini bars animate on page load ───────────────────────────────
    const miniBarContainers = document.querySelectorAll(".mini-bars");
    miniBarContainers.forEach(container => {
        const spans = container.querySelectorAll("span");
        const heights = [35, 85, 55, 100];
        spans.forEach((span, i) => {
            span.style.height = "0%";
            setTimeout(() => {
                span.style.transition = `height 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 0.1}s`;
                span.style.height = heights[i] + "%";
            }, 500);
        });
    });

    // ── 13. Add "Built by Naazmeen" Credit ──────────────────────────────
    const footerCredit = document.createElement("div");
    footerCredit.style.cssText = `
        width: 100%;
        text-align: center;
        padding: 50px 0 30px 0;
        color: #94a3b8;
        font-size: 1.2rem;
        font-family: 'Poppins', sans-serif;
        opacity: 0.7;
        letter-spacing: 0.05em;
    `;
    footerCredit.innerHTML = 'Designed & Built by <span style="color: #ffffff; font-weight: 600;">Naazmeen</span>';
    document.body.appendChild(footerCredit);

});
