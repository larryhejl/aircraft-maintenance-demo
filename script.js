// Sample maintenance events (demo data only).
// Generated to cover roughly a year with 100+ events, with randomized combinations
// of aircraft, system, event type, and status to avoid unrealistic pairings.
function createDemoEvents() {
    const aircraftTypes = ['F-16C', 'F-15E', 'C-130J'];
    const systems = ['Engine', 'Avionics', 'Hydraulics', 'Flight Controls', 'Landing Gear', 'Propeller'];
    const eventTypes = ['Unscheduled Repair', 'Scheduled Inspection', 'Time Change'];
    const statuses = ['Complete', 'In Work', 'Awaiting Parts'];
    const tailNumbersByAircraft = {
        'F-16C': ['89-2034', '90-1023'],
        'F-15E': ['96-0201', '97-0218'],
        'C-130J': ['04-1289', '05-1432']
    };

    const events = [];

    const start = new Date('2025-05-01T00:00:00Z');
    const end = new Date('2026-04-30T00:00:00Z');
    const spanMs = end.getTime() - start.getTime();

    for (let id = 1; id <= 120; id++) {
        const offsetMs = Math.random() * spanMs;
        const date = new Date(start.getTime() + offsetMs);

        const aircraft = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];
        const tails = tailNumbersByAircraft[aircraft];
        const tailNumber = tails[Math.floor(Math.random() * tails.length)];
        const system = systems[Math.floor(Math.random() * systems.length)];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const hoursDown = 4 + Math.floor(Math.random() * 44); // 4–47 hours

        events.push({
            id,
            aircraft,
            tailNumber,
            system,
            eventType,
            status,
            date: date.toISOString().slice(0, 10), // YYYY-MM-DD
            hoursDown,
            description: `${eventType} on ${system.toLowerCase()} for ${aircraft} ${tailNumber}.`
        });
    }

    return events;
}

const maintenanceEvents = createDemoEvents();

// DOM references
const aircraftFilter = document.getElementById('aircraft-filter');
const eventTypeFilter = document.getElementById('event-type-filter');
const systemFilter = document.getElementById('system-filter');
const statusFilter = document.getElementById('status-filter');
const dateRangeFilter = document.getElementById('date-range-filter');
const eventsTableBody = document.querySelector('#events-table tbody');
const eventDetail = document.getElementById('event-detail');
const chartContainer = document.getElementById('chart-container');
const chartLegend = document.getElementById('chart-legend');
const chartFacetSelect = document.getElementById('chart-facet');
const statusPieRoot = document.getElementById('status-pie');
const statusPieLegend = document.getElementById('status-pie-legend');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');

// Test dashboard wiring: these elements are updated using the summary that
// comes back from window.runAllTests(), which should be defined in tests.js.
// Expected shape:
//   window.runAllTests() => {
//     total, passed, failed, coveragePercent,
//     results: [{ name, status: 'passed' | 'failed', durationMs, details? }, ...]
//   }
const runTestsButton = document.getElementById('run-tests-button');
const testRunStatus = document.getElementById('test-run-status');
const metricTotalTests = document.getElementById('metric-total-tests');
const metricTestsRun = document.getElementById('metric-tests-run');
const metricTestsPassed = document.getElementById('metric-tests-passed');
const metricTestsFailed = document.getElementById('metric-tests-failed');
const metricCoverage = document.getElementById('metric-coverage');
const testResultsBody = document.querySelector('#test-results tbody');
const testPassFailChart = document.getElementById('test-passfail-chart');
const testCoverageChart = document.getElementById('test-coverage-chart');

// Utility: parse YYYY-MM-DD into Date (with validation)
function parseEventDate(event) {
    if (!event || !event.date || typeof event.date !== 'string') {
        return null;
    }
    const d = new Date(event.date + 'T00:00:00Z');
    if (isNaN(d.getTime())) {
        return null;
    }
    return d;
}

// Filter events based on current selections
function filterEvents(events, filters) {
    const now = new Date();

    return events.filter((e) => {
        if (filters.aircraft && filters.aircraft !== 'all' && e.aircraft !== filters.aircraft) {
            return false;
        }
        if (filters.eventType && filters.eventType !== 'all' && e.eventType !== filters.eventType) {
            return false;
        }
        if (filters.system && filters.system !== 'all' && e.system !== filters.system) {
            return false;
        }
        if (filters.status && filters.status !== 'all' && e.status !== filters.status) {
            return false;
        }
        if (filters.dateRangeDays && filters.dateRangeDays !== 'all') {
            const days = Number(filters.dateRangeDays);
            const cutoff = new Date(now);
            cutoff.setDate(cutoff.getDate() - days);
            const parsed = parseEventDate(e);
            if (!parsed || parsed < cutoff) {
                return false;
            }
        }
        return true;
    });
}

// Group events by year-month and count
function groupEventsByMonth(events) {
    const buckets = {};

    events.forEach((e) => {
        const d = parseEventDate(e);
        if (!d) return;
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        if (!buckets[key]) {
            buckets[key] = 0;
        }
        buckets[key] += 1;
    });

    // Convert to sorted array
    return Object.entries(buckets)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => (a.month < b.month ? -1 : 1));
}

// Populate filters from data
function populateFilters(events) {
    const aircraftSet = new Set();
    const eventTypeSet = new Set();
    const systemSet = new Set();
    const statusSet = new Set();

    events.forEach((e) => {
        aircraftSet.add(e.aircraft);
        eventTypeSet.add(e.eventType);
        systemSet.add(e.system);
        statusSet.add(e.status);
    });

    for (const value of Array.from(aircraftSet).sort()) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        aircraftFilter.appendChild(option);
    }

    for (const value of Array.from(eventTypeSet).sort()) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        eventTypeFilter.appendChild(option);
    }

    for (const value of Array.from(systemSet).sort()) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        systemFilter.appendChild(option);
    }

    for (const value of Array.from(statusSet).sort()) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        statusFilter.appendChild(option);
    }
}

// Render table rows
function renderTable(events) {
    eventsTableBody.innerHTML = '';

    if (events.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = 'No events match the current filters.';
        row.appendChild(cell);
        eventsTableBody.appendChild(row);
        eventDetail.innerHTML = '<p>No event selected.</p>';
        return;
    }

    events.forEach((e) => {
        const row = document.createElement('tr');
        row.dataset.id = String(e.id);

        const cellDate = document.createElement('td');
        cellDate.textContent = e.date;
        const cellAircraft = document.createElement('td');
        cellAircraft.textContent = e.aircraft;
        const cellSystem = document.createElement('td');
        cellSystem.textContent = e.system;
        const cellEventType = document.createElement('td');
        cellEventType.textContent = e.eventType;
        const cellStatus = document.createElement('td');
        cellStatus.textContent = e.status;

        row.appendChild(cellDate);
        row.appendChild(cellAircraft);
        row.appendChild(cellSystem);
        row.appendChild(cellEventType);
        row.appendChild(cellStatus);

        row.addEventListener('click', () => showEventDetail(e));
        eventsTableBody.appendChild(row);
    });

    // Show first event by default
    showEventDetail(events[0]);
}

// Render event detail
function showEventDetail(event) {
    eventDetail.innerHTML = `
        <dl>
            <dt>Date</dt><dd>${event.date}</dd>
            <dt>Aircraft</dt><dd>${event.aircraft}</dd>
            <dt>Tail #</dt><dd>${event.tailNumber}</dd>
            <dt>System</dt><dd>${event.system}</dd>
            <dt>Event Type</dt><dd>${event.eventType}</dd>
            <dt>Status</dt><dd>${event.status}</dd>
            <dt>Hours Down</dt><dd>${event.hoursDown}</dd>
            <dt>Description</dt><dd>${event.description}</dd>
        </dl>
    `;
}

// Render line chart of events per month by chosen facet and total
function renderChart(events, facet) {
    chartContainer.innerHTML = '';
    chartLegend.innerHTML = '';

    const grouped = groupEventsByMonth(events);
    if (grouped.length === 0) {
        chartContainer.textContent = 'No data to display.';
        return;
    }

    const months = grouped.map((g) => g.month);

    const facetConfig = {
        aircraft: { field: 'aircraft', labelPrefix: 'Aircraft' },
        system: { field: 'system', labelPrefix: 'System' },
        eventType: { field: 'eventType', labelPrefix: 'Event Type' },
        status: { field: 'status', labelPrefix: 'Status' }
    };

    const activeFacet = facetConfig[facet] || facetConfig.aircraft;
    const field = activeFacet.field;
    const labelPrefix = activeFacet.labelPrefix;

    // Build counts per month and facet value
    const countsByMonth = {};
    const categorySet = new Set();

    events.forEach((e) => {
        const d = parseEventDate(e);
        if (!d) return;
        const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const value = e[field];
        categorySet.add(value);
        if (!countsByMonth[monthKey]) {
            countsByMonth[monthKey] = {};
        }
        countsByMonth[monthKey][value] = (countsByMonth[monthKey][value] || 0) + 1;
    });

    const categorySeries = Array.from(categorySet)
        .sort()
        .map((value) => ({
            label: value,
            values: months.map((m) => (countsByMonth[m] && countsByMonth[m][value]) || 0)
        }));

    if (categorySeries.length === 0) {
        chartContainer.textContent = 'No data to display.';
        return;
    }

    const totalSeries = {
        label: 'Total',
        values: months.map((_, idx) =>
            categorySeries.reduce((sum, s) => sum + s.values[idx], 0)
        )
    };

    const allSeries = [...categorySeries, totalSeries];

    let maxCount = 0;
    allSeries.forEach((s) => {
        s.values.forEach((v) => {
            if (v > maxCount) maxCount = v;
        });
    });
    if (maxCount === 0) {
        chartContainer.textContent = 'No data to display.';
        return;
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const width = Math.max(120, (months.length - 1) * 40 + 30);
    const height = 100;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const paddingLeft = 10;
    const paddingRight = 10;
    const paddingTop = 10;
    const paddingBottom = 18;

    const usableWidth = width - paddingLeft - paddingRight;
    const usableHeight = height - paddingTop - paddingBottom;

    const seriesColors = ['#1f77b4', '#2ca02c', '#ff7f0e', '#9467bd', '#8c564b', '#e377c2'];
    const totalColor = '#111111';

    function getColor(label) {
        if (label === 'Total') return totalColor;
        const index = categorySeries.findIndex((s) => s.label === label);
        return seriesColors[(index >= 0 ? index : 0) % seriesColors.length];
    }

    // Draw x-axis labels (months)
    months.forEach((month, index) => {
        const x = months.length === 1
            ? paddingLeft + usableWidth / 2
            : paddingLeft + (usableWidth * index) / (months.length - 1);
        const label = document.createElementNS(svgNS, 'text');
        label.setAttribute('x', String(x));
        label.setAttribute('y', String(height - 4));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '6');
        label.textContent = month.slice(2); // YY-MM
        svg.appendChild(label);
    });

    // Draw each series (facet values + total)
    allSeries.forEach((series) => {
        const color = getColor(series.label);
        const points = [];

        series.values.forEach((value, index) => {
            const ratio = value / maxCount;
            const x = months.length === 1
                ? paddingLeft + usableWidth / 2
                : paddingLeft + (usableWidth * index) / (months.length - 1);
            const y = paddingTop + usableHeight * (1 - ratio);
            points.push(`${x},${y}`);

            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', String(x));
            circle.setAttribute('cy', String(y));
            circle.setAttribute('r', series.label === 'Total' ? '1.8' : '1.4');
            circle.setAttribute('fill', color);
            svg.appendChild(circle);
        });

        const polyline = document.createElementNS(svgNS, 'polyline');
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', color);
        polyline.setAttribute('stroke-width', series.label === 'Total' ? '2' : '1');
        polyline.setAttribute('points', points.join(' '));
        svg.insertBefore(polyline, svg.firstChild);
    });

    const xAxis = document.createElementNS(svgNS, 'line');
    xAxis.setAttribute('x1', String(paddingLeft));
    xAxis.setAttribute('y1', String(height - paddingBottom));
    xAxis.setAttribute('x2', String(width - paddingRight));
    xAxis.setAttribute('y2', String(height - paddingBottom));
    xAxis.setAttribute('stroke', '#cccccc');
    xAxis.setAttribute('stroke-width', '1');
    svg.insertBefore(xAxis, svg.firstChild);

    chartContainer.appendChild(svg);

    // Legend: one entry per facet value plus total
    const legendParts = [];
    categorySeries.forEach((s) => {
        const color = getColor(s.label);
        legendParts.push(
            `<span><span class="swatch" style="background-color: ${color}"></span>${labelPrefix}: ${s.label}</span>`
        );
    });
    legendParts.push(
        `<span><span class="swatch" style="background-color: ${totalColor}"></span>Total</span>`
    );

    chartLegend.innerHTML = legendParts.join(' ');
}

// Render status pie chart
function renderStatusPie(events) {
    statusPieRoot.innerHTML = '';
    statusPieLegend.innerHTML = '';

    if (!events.length) {
        statusPieRoot.textContent = 'No data to display.';
        return;
    }

    const counts = {};
    events.forEach((e) => {
        counts[e.status] = (counts[e.status] || 0) + 1;
    });

    const entries = Object.entries(counts);
    const total = events.length;
    if (!entries.length) {
        statusPieRoot.textContent = 'No data to display.';
        return;
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const size = 80;
    const radius = 30;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * radius;

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

    const statusColors = {
        Complete: '#4c9aff',
        'In Work': '#ffcc00',
        'Awaiting Parts': '#d62728'
    };

    let offset = 0;
    entries.forEach(([status, count]) => {
        const fraction = count / total;
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', String(radius));
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', statusColors[status] || '#999999');
        circle.setAttribute('stroke-width', '14');
        circle.setAttribute('stroke-dasharray', `${fraction * circumference} ${circumference}`);
        circle.setAttribute('stroke-dashoffset', String(-offset));
        circle.setAttribute(
            'transform',
            `rotate(-90 ${cx} ${cy})`
        );
        svg.appendChild(circle);
        offset += fraction * circumference;
    });

    statusPieRoot.appendChild(svg);

    const legendItems = entries.map(([status, count]) => {
        const percent = Math.round((count / total) * 100);
        const color = statusColors[status] || '#999999';
        return `<span><span class="swatch" style="background-color: ${color}"></span>${status} (${percent}%)</span>`;
    });

    statusPieLegend.innerHTML = legendItems.join(' ');
}

// ---- Test dashboard helpers ----

// Simple simulated test run so the dashboard has something to visualize
function createSimulatedTestRun() {
    return [
        { name: 'filterEvents filters by aircraft', status: 'passed', durationMs: 12 },
        { name: 'filterEvents respects date range', status: 'passed', durationMs: 18 },
        { name: 'groupEventsByMonth sorts chronologically', status: 'passed', durationMs: 9 },
        {
            name: 'renderChart handles empty input',
            status: 'failed',
            durationMs: 6,
            details: 'Expected graceful message for empty dataset.'
        },
        { name: 'renderStatusPie aggregates by status', status: 'passed', durationMs: 11 },
        { name: 'initializeDashboard wires tab handlers', status: 'passed', durationMs: 7 }
    ];
}

// Pass/fail donut chart
function renderTestPassFailChart(summary) {
    if (!testPassFailChart) return;

    const { passed, failed, total } = summary;
    testPassFailChart.innerHTML = '';

    if (!total) {
        testPassFailChart.textContent = 'No test results yet.';
        return;
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const size = 90;
    const radius = 28;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * radius;

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.classList.add('test-chart-svg');

    // Background ring represents the *missing* coverage (orange).
    const bg = document.createElementNS(svgNS, 'circle');
    bg.setAttribute('cx', String(cx));
    bg.setAttribute('cy', String(cy));
    bg.setAttribute('r', String(radius));
    bg.setAttribute('fill', 'none');
    bg.setAttribute('stroke', '#ff7f0e');
    bg.setAttribute('stroke-width', '14');
    svg.appendChild(bg);

    let offset = 0;

    const segments = [];
    if (passed > 0) {
        segments.push({ label: 'Passed', count: passed, color: '#2ca02c' });
    }
    if (failed > 0) {
        segments.push({ label: 'Failed', count: failed, color: '#d62728' });
    }

    segments.forEach(({ count, color }) => {
        const fraction = count / total;
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', String(radius));
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', '14');
        circle.setAttribute('stroke-dasharray', `${fraction * circumference} ${circumference}`);
        circle.setAttribute('stroke-dashoffset', String(-offset));
        circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
        svg.appendChild(circle);
        offset += fraction * circumference;
    });

    // Center label
    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', String(cx));
    label.setAttribute('y', String(cy + 2));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '10');
    label.textContent = `${passed}/${total}`;
    svg.appendChild(label);

    testPassFailChart.appendChild(svg);

    const legend = document.createElement('div');
    legend.className = 'test-passfail-legend';
    const pieces = [];
    if (passed > 0) {
        pieces.push(
            `<span><span class="test-chart-legend-swatch" style="background-color:#2ca02c"></span>Passed (${passed})</span>`
        );
    }
    if (failed > 0) {
        pieces.push(
            `<span><span class="test-chart-legend-swatch" style="background-color:#d62728"></span>Failed (${failed})</span>`
        );
    }
    legend.innerHTML = pieces.join(' ');
    testPassFailChart.appendChild(legend);
}

// Coverage ring chart
function renderTestCoverageChart(coveragePercent) {
    if (!testCoverageChart) return;

    testCoverageChart.innerHTML = '';

    if (coveragePercent == null) {
        testCoverageChart.textContent = 'No coverage data yet.';
        return;
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const size = 90;
    const radius = 28;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * radius;

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.classList.add('test-chart-svg');

    // Background ring: uncovered portion (orange)
    const bg = document.createElementNS(svgNS, 'circle');
    bg.setAttribute('cx', String(cx));
    bg.setAttribute('cy', String(cy));
    bg.setAttribute('r', String(radius));
    bg.setAttribute('fill', 'none');
    bg.setAttribute('stroke', '#ff7f0e');
    bg.setAttribute('stroke-width', '14');
    svg.appendChild(bg);

    const fraction = Math.max(0, Math.min(1, coveragePercent / 100));

    // Covered portion is always green; the remaining ring shows as orange.
    const color = '#2ca02c';

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '14');

    if (coveragePercent >= 99) {
        // Full circle when we are effectively at 100% coverage.
        circle.setAttribute('stroke-dasharray', `${circumference} 0`);
        circle.setAttribute('stroke-dashoffset', '0');
    } else {
        // Partial arc proportional to coverage starting at the top.
        circle.setAttribute('stroke-dasharray', `${fraction * circumference} ${circumference}`);
        circle.setAttribute('stroke-dashoffset', '0');
    }

    circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
    svg.appendChild(circle);

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', String(cx));
    label.setAttribute('y', String(cy + 3));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '11');
    label.textContent = `${coveragePercent}%`;
    svg.appendChild(label);

    testCoverageChart.appendChild(svg);

    const desc = document.createElement('div');
    desc.className = 'test-coverage-label';
    desc.textContent = 'Approximate statement coverage';
    testCoverageChart.appendChild(desc);
}

// Update view based on filters
function updateView() {
    const filters = {
        aircraft: aircraftFilter.value,
        eventType: eventTypeFilter.value,
        system: systemFilter.value,
        status: statusFilter.value,
        dateRangeDays: dateRangeFilter.value === 'all' ? 'all' : dateRangeFilter.value
    };

    const filtered = filterEvents(maintenanceEvents, filters);
    renderTable(filtered);
    const facet = chartFacetSelect ? chartFacetSelect.value : 'aircraft';
    renderChart(filtered, facet);
    renderStatusPie(filtered);
}

// Init
function initializeDashboard() {
    // Tab switching
    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabButtons.forEach((b) => b.classList.toggle('tab-active', b === btn));
            tabPanels.forEach((panel) =>
                panel.classList.toggle('tab-active', panel.id === `${target}-tab`)
            );
        });
    });

    populateFilters(maintenanceEvents);

    aircraftFilter.addEventListener('change', updateView);
    eventTypeFilter.addEventListener('change', updateView);
    systemFilter.addEventListener('change', updateView);
    statusFilter.addEventListener('change', updateView);
    dateRangeFilter.addEventListener('change', updateView);
    if (chartFacetSelect) {
        chartFacetSelect.addEventListener('change', updateView);
    }

    if (runTestsButton) {
        runTestsButton.addEventListener('click', () => {
            const now = new Date();

            if (typeof window.runAllTests !== 'function') {
                testRunStatus.textContent = `Last run: ${now.toLocaleTimeString()} — no unit tests are wired up yet.`;

                metricTotalTests.textContent = '0';
                metricTestsRun.textContent = '0';
                metricTestsPassed.textContent = '0';
                metricTestsFailed.textContent = '0';
                metricCoverage.textContent = '—';

                if (testResultsBody) {
                    testResultsBody.innerHTML =
                        '<tr><td colspan="4">No unit tests are defined yet. Use your AI assistant to generate them, then wire this button to run them.</td></tr>';
                }

                return;
            }

            const summary = window.runAllTests();
            const { total, passed, failed, coveragePercent, results } = summary;

            testRunStatus.textContent = `Last run: ${now.toLocaleTimeString()} — ${passed}/${total} passed`;

            metricTotalTests.textContent = String(total);
            metricTestsRun.textContent = String(total);
            metricTestsPassed.textContent = String(passed);
            metricTestsFailed.textContent = String(failed);
            metricCoverage.textContent = `${coveragePercent}%`;

            if (testResultsBody) {
                testResultsBody.innerHTML = '';
                results.forEach((t) => {
                    const row = document.createElement('tr');
                    const statusLabel = t.status === 'passed' ? 'Passed' : 'Failed';
                    const statusClass = t.status === 'passed' ? 'passed' : 'failed';

                    row.innerHTML = `
                        <td>${t.name}</td>
                        <td class="${statusClass}">${statusLabel}</td>
                        <td>${t.durationMs} ms</td>
                        <td>${t.details || ''}</td>
                    `;

                    testResultsBody.appendChild(row);
                });
            }

            renderTestPassFailChart({ total, passed, failed });
            renderTestCoverageChart(coveragePercent);
        });
    }

    updateView();
}

// Run on load
document.addEventListener('DOMContentLoaded', initializeDashboard);

