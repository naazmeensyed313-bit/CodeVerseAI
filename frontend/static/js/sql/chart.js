let activeChart = null;

export function updateChart(rows, config) {
    const canvas = document.getElementById("resultChart");
    const chartHelp = document.getElementById("chartHelp");
    if (!canvas || !window.Chart) return;

    if (activeChart) {
        activeChart.destroy();
        activeChart = null;
    }

    if (!config || !rows.length) {
        if (chartHelp) {
            chartHelp.innerText = "No chart for this query yet. Charts are useful when SQL returns numbers, like COUNT, AVG, or score comparisons.";
        }
        activeChart = new Chart(canvas, {
            type: "bar",
            data: {
                labels: ["No numeric result"],
                datasets: [{ label: "Waiting", data: [0], backgroundColor: "rgba(168, 85, 247, 0.28)" }]
            },
            options: chartOptions()
        });
        return;
    }

    const labelKey = Object.keys(rows[0]).find(key => key !== config.key);
    if (chartHelp) {
        chartHelp.innerText = `Execution chart: labels use "${labelKey || "result"}" and values use "${config.key}".`;
    }
    activeChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: rows.map((row, index) => labelKey ? row[labelKey] : `Result ${index + 1}`),
            datasets: [{
                label: config.label || config.key,
                data: rows.map(row => Number(row[config.key]) || 0),
                backgroundColor: "rgba(236, 72, 153, 0.62)",
                borderColor: "rgba(255,255,255,0.45)",
                borderWidth: 1
            }]
        },
        options: chartOptions()
    });
}

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420 },
        plugins: { legend: { labels: { color: "#d1d5db" } } },
        scales: {
            x: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.08)" } },
            y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.08)" }, beginAtZero: true }
        }
    };
}
