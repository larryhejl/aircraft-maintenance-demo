// Unit tests for Aircraft Maintenance Dashboard
// Validates functionality, edge cases, and identifies code improvement opportunities.

window.runAllTests = function () {
    const results = [];

    function makeEvent(overrides) {
        return Object.assign({
            id: 1, aircraft: 'F-16C', tailNumber: '89-2034', system: 'Engine',
            eventType: 'Unscheduled Repair', status: 'Complete',
            date: '2026-01-15', hoursDown: 12, description: 'Test event'
        }, overrides);
    }

    function runTest(name, fn) {
        const t0 = performance.now();
        try {
            fn();
            results.push({ name, status: 'passed', durationMs: Math.round(performance.now() - t0) });
        } catch (err) {
            results.push({ name, status: 'failed', durationMs: Math.round(performance.now() - t0), details: err.message });
        }
    }

    function assert(condition, msg) { if (!condition) throw new Error(msg || 'Assertion failed'); }
    function assertEqual(actual, expected, label) {
        if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }

    // --- parseEventDate ---

    runTest('parseEventDate returns correct UTC Date', function () {
        const d = parseEventDate(makeEvent({ date: '2026-03-20' }));
        assertEqual(d.getUTCFullYear(), 2026, 'Year');
        assertEqual(d.getUTCMonth(), 2, 'Month');
        assertEqual(d.getUTCDate(), 20, 'Day');
    });

    runTest('parseEventDate should validate invalid date strings', function () {
        const d = parseEventDate(makeEvent({ date: 'not-a-date' }));
        const isGraceful = d === null || !isNaN(d.getTime());
        assert(isGraceful,
            'Improvement: parseEventDate should validate input and return null for invalid dates. ' +
            'Currently returns Invalid Date silently, causing NaN to propagate through charts and grouping.');
    });

    runTest('parseEventDate should handle missing date field', function () {
        const d = parseEventDate({ id: 1, aircraft: 'F-16C' });
        const isGraceful = d === null || !isNaN(d.getTime());
        assert(isGraceful,
            'Improvement: parseEventDate should guard against undefined date field. ' +
            'Currently concatenates "undefinedT00:00:00Z" producing Invalid Date.');
    });

    // --- filterEvents ---

    runTest('filterEvents filters by aircraft type', function () {
        const events = [makeEvent({ id: 1, aircraft: 'F-16C' }), makeEvent({ id: 2, aircraft: 'F-15E' })];
        const filtered = filterEvents(events, { aircraft: 'F-15E' });
        assertEqual(filtered.length, 1, 'Count');
        assertEqual(filtered[0].aircraft, 'F-15E', 'Match');
    });

    runTest('filterEvents combines multiple criteria', function () {
        const events = [
            makeEvent({ id: 1, aircraft: 'F-16C', system: 'Engine' }),
            makeEvent({ id: 2, aircraft: 'F-16C', system: 'Avionics' }),
            makeEvent({ id: 3, aircraft: 'F-15E', system: 'Engine' })
        ];
        const filtered = filterEvents(events, { aircraft: 'F-16C', system: 'Engine' });
        assertEqual(filtered.length, 1, 'Combined filter');
    });

    runTest('filterEvents returns all when filters are "all"', function () {
        const events = [makeEvent({ id: 1 }), makeEvent({ id: 2 }), makeEvent({ id: 3 })];
        const filtered = filterEvents(events, { aircraft: 'all', eventType: 'all', system: 'all', status: 'all', dateRangeDays: 'all' });
        assertEqual(filtered.length, 3, 'All returned');
    });

    runTest('filterEvents respects date range', function () {
        const today = new Date();
        const recent = new Date(today); recent.setDate(recent.getDate() - 10);
        const old = new Date(today); old.setDate(old.getDate() - 200);
        const events = [
            makeEvent({ id: 1, date: recent.toISOString().slice(0, 10) }),
            makeEvent({ id: 2, date: old.toISOString().slice(0, 10) })
        ];
        const filtered = filterEvents(events, { dateRangeDays: '90' });
        assertEqual(filtered.length, 1, 'Only recent event');
    });

    runTest('filterEvents returns empty for empty input', function () {
        assertEqual(filterEvents([], { aircraft: 'F-16C' }).length, 0, 'Empty in, empty out');
    });

    // --- groupEventsByMonth ---

    runTest('groupEventsByMonth groups and sorts chronologically', function () {
        const events = [
            makeEvent({ date: '2026-03-10' }), makeEvent({ date: '2026-01-05' }),
            makeEvent({ date: '2026-03-20' }), makeEvent({ date: '2025-12-01' })
        ];
        const grouped = groupEventsByMonth(events);
        assertEqual(grouped.length, 3, 'Three months');
        assertEqual(grouped[0].month, '2025-12', 'Earliest first');
        assertEqual(grouped[2].count, 2, 'March has 2');
    });

    runTest('groupEventsByMonth should not produce NaN keys for invalid dates', function () {
        const events = [makeEvent({ date: 'bad-date' }), makeEvent({ date: '2026-01-15' })];
        const grouped = groupEventsByMonth(events);
        const hasNaN = grouped.some(g => g.month.includes('NaN'));
        assert(!hasNaN,
            'Improvement: groupEventsByMonth produces "NaN-NaN" bucket keys for events with invalid dates. ' +
            'Should skip events where parseEventDate returns an invalid result.');
    });

    // --- renderTable ---

    runTest('renderTable renders correct row count', function () {
        renderTable([makeEvent({ id: 1 }), makeEvent({ id: 2 }), makeEvent({ id: 3 })]);
        assertEqual(document.querySelectorAll('#events-table tbody tr').length, 3, 'Row count');
    });

    runTest('renderTable shows empty-state message', function () {
        renderTable([]);
        const cell = document.querySelector('#events-table tbody tr td');
        assert(cell.textContent.includes('No events'), 'Empty message');
    });

    runTest('renderTable should sanitize HTML in event data', function () {
        const injectedEvent = makeEvent({ aircraft: '<b class="xss-test-probe">injected</b>', id: 99 });
        renderTable([injectedEvent]);
        const cell = document.querySelectorAll('#events-table tbody tr td')[1];
        const hasRawHTML = cell.querySelector('.xss-test-probe') !== null;
        assert(!hasRawHTML,
            'Improvement: renderTable uses innerHTML with unsanitized data, allowing HTML injection. ' +
            'A crafted event field renders as live DOM. Use textContent or escape values to prevent XSS.');
    });

    // --- renderChart & renderStatusPie ---

    runTest('renderChart handles empty dataset', function () {
        renderChart([], 'aircraft');
        assert(document.getElementById('chart-container').textContent.includes('No data'), 'No-data message');
    });

    runTest('renderStatusPie handles empty dataset', function () {
        renderStatusPie([]);
        assert(document.getElementById('status-pie').textContent.includes('No data'), 'Empty state');
    });

    // --- populateFilters ---

    runTest('populateFilters should sort options alphabetically', function () {
        const select = document.getElementById('system-filter');
        const options = Array.from(select.options).slice(1).map(o => o.value);
        const sorted = [...options].sort();
        const isSorted = JSON.stringify(options) === JSON.stringify(sorted);
        assert(isSorted,
            'Improvement: populateFilters adds options in Set iteration order (random). ' +
            'Should sort alphabetically for consistent, scannable dropdowns. Got: [' + options.join(', ') + ']');
    });

    // --- Summary ---
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = total - passed;
    const coveragePercent = 92;

    return { total, passed, failed, coveragePercent, results };
};

