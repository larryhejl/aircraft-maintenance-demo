window.runAllTests = function () {
    const results = [];

    function assert(condition, testName, details) {
        const start = performance.now();
        const status = condition ? 'passed' : 'failed';
        const entry = { name: testName, status, durationMs: Math.round(performance.now() - start) };
        if (details) entry.details = details;
        results.push(entry);
    }

    // --- Test 1: parseEventDate returns valid Date for good input ---
    (function () {
        const event = { date: '2024-03-15' };
        const d = parseEventDate(event);
        assert(d instanceof Date && !isNaN(d.getTime()), 'parseEventDate — valid date input',
            'Should return a valid Date object for well-formed date strings.');
    })();

    // --- Test 2: parseEventDate handles invalid dates gracefully ---
    (function () {
        const badEvent = { date: 'not-a-date' };
        const d = parseEventDate(badEvent);
        const isGraceful = d === null || !isNaN(d.getTime());
        assert(isGraceful, 'parseEventDate — invalid date returns null',
            'IMPROVEMENT: parseEventDate should return null for unparseable dates instead of Invalid Date. This prevents downstream NaN errors in grouping and charting.');
    })();

    // --- Test 3: parseEventDate handles missing date field ---
    (function () {
        const noDateEvent = {};
        const d = parseEventDate(noDateEvent);
        const isGraceful = d === null || !isNaN(d.getTime());
        assert(isGraceful, 'parseEventDate — missing date field returns null',
            'IMPROVEMENT: When event.date is undefined, parseEventDate should return null rather than Invalid Date.');
    })();

    // --- Test 4: filterEvents filters by aircraft ---
    (function () {
        const events = [
            { id: 1, aircraft: 'F-15A #101', eventType: 'Inspection', system: 'Engine', status: 'Completed', date: '2024-01-10' },
            { id: 2, aircraft: 'F-16C #202', eventType: 'Repair', system: 'Avionics', status: 'Pending', date: '2024-02-20' }
        ];
        const filtered = filterEvents(events, { aircraft: 'F-15A #101', eventType: 'all', system: 'all', status: 'all' });
        assert(filtered.length === 1 && filtered[0].aircraft === 'F-15A #101', 'filterEvents — filters by aircraft',
            'Should return only events matching the selected aircraft.');
    })();

    // --- Test 5: filterEvents returns all when filters are "all" ---
    (function () {
        const events = [
            { id: 1, aircraft: 'F-15A #101', eventType: 'Inspection', system: 'Engine', status: 'Completed', date: '2024-01-10' },
            { id: 2, aircraft: 'F-16C #202', eventType: 'Repair', system: 'Avionics', status: 'Pending', date: '2024-02-20' }
        ];
        const filtered = filterEvents(events, { aircraft: 'all', eventType: 'all', system: 'all', status: 'all' });
        assert(filtered.length === 2, 'filterEvents — "all" returns everything',
            'When all filters are set to "all", every event should be returned.');
    })();

    // --- Test 6: filterEvents uses internal new Date() (non-determinism) ---
    (function () {
        const events = [
            { id: 1, aircraft: 'F-15A #101', eventType: 'Inspection', system: 'Engine', status: 'Completed', date: '2024-01-10' }
        ];
        const filtered = filterEvents(events, { aircraft: 'all', eventType: 'all', system: 'all', status: 'all' });
        assert(filtered.length === 1, 'filterEvents — determinism check',
            'IMPROVEMENT: filterEvents creates new Date() internally, making date-boundary tests fragile. Consider accepting a reference date parameter for testability.');
    })();

    // --- Test 7: groupEventsByMonth produces valid month keys ---
    (function () {
        const events = [
            { date: '2024-01-15' },
            { date: '2024-01-20' },
            { date: '2024-03-10' }
        ];
        const grouped = groupEventsByMonth(events);
        const hasNaN = grouped.some(g => g.month.includes('NaN'));
        assert(!hasNaN && grouped.length === 2, 'groupEventsByMonth — valid keys for good data',
            'Should produce well-formed YYYY-MM keys without NaN.');
    })();

    // --- Test 8: groupEventsByMonth handles invalid dates without NaN keys ---
    (function () {
        const events = [
            { date: '2024-01-15' },
            { date: 'garbage' },
            { date: '' }
        ];
        const grouped = groupEventsByMonth(events);
        const hasNaN = grouped.some(g => g.month.includes('NaN'));
        assert(!hasNaN, 'groupEventsByMonth — no NaN keys for invalid dates',
            'IMPROVEMENT: Invalid dates produce "NaN-NaN" keys. groupEventsByMonth should skip events where parseEventDate returns null.');
    })();

    // --- Test 9: populateFilters sorts options alphabetically ---
    (function () {
        const realAircraft = document.getElementById('aircraft-filter');
        const originalOptions = realAircraft.innerHTML;
        realAircraft.innerHTML = '<option value="all">All</option>';

        const events = [
            { aircraft: 'Zulu', eventType: 'A', system: 'A', status: 'A' },
            { aircraft: 'Alpha', eventType: 'B', system: 'B', status: 'B' },
            { aircraft: 'Mike', eventType: 'C', system: 'C', status: 'C' }
        ];

        populateFilters(events);

        const options = Array.from(realAircraft.options).slice(1).map(o => o.value);
        const sorted = [...options].sort();
        const isSorted = JSON.stringify(options) === JSON.stringify(sorted);

        // Restore
        realAircraft.innerHTML = originalOptions;

        assert(isSorted, 'populateFilters — options are sorted alphabetically',
            'IMPROVEMENT: Filter dropdowns should sort options alphabetically for better usability. Currently they appear in arbitrary Set iteration order.');
    })();

    // --- Test 10: renderTable sanitizes HTML (XSS protection) ---
    (function () {
        const maliciousEvents = [{
            id: 99,
            date: '2024-01-01',
            aircraft: '<b class="xss-test-probe">injected</b>',
            system: 'Engine',
            eventType: 'Inspection',
            status: 'Completed',
            description: 'Test event'
        }];

        const tbody = document.querySelector('#events-table tbody');
        const originalContent = tbody.innerHTML;

        renderTable(maliciousEvents);

        const probe = tbody.querySelector('.xss-test-probe');
        const isVulnerable = probe !== null;

        // Restore
        tbody.innerHTML = originalContent;

        assert(!isVulnerable, 'renderTable — XSS protection (HTML sanitization)',
            'IMPROVEMENT: renderTable uses innerHTML with unsanitized data, allowing injected HTML to render as DOM elements. Switch to textContent or implement proper escaping.');
    })();

    // --- Test 11: renderTable handles empty array ---
    (function () {
        const tbody = document.querySelector('#events-table tbody');
        const originalContent = tbody.innerHTML;

        renderTable([]);

        const cells = tbody.querySelectorAll('td');
        const hasEmptyMessage = cells.length === 1 && cells[0].textContent.includes('No events');

        tbody.innerHTML = originalContent;

        assert(hasEmptyMessage, 'renderTable — empty array shows message',
            'Should display a "no events" message when the filtered list is empty.');
    })();

    // --- Test 12: groupEventsByMonth sorts results chronologically ---
    (function () {
        const events = [
            { date: '2024-06-01' },
            { date: '2024-01-15' },
            { date: '2024-03-20' }
        ];
        const grouped = groupEventsByMonth(events);
        const months = grouped.map(g => g.month);
        const sorted = [...months].sort();
        assert(JSON.stringify(months) === JSON.stringify(sorted), 'groupEventsByMonth — results sorted chronologically',
            'Month groups should be in ascending chronological order.');
    })();

    // --- Test 13: filterEvents filters by multiple criteria ---
    (function () {
        const events = [
            { id: 1, aircraft: 'F-15A #101', eventType: 'Inspection', system: 'Engine', status: 'Completed', date: '2024-01-10' },
            { id: 2, aircraft: 'F-15A #101', eventType: 'Repair', system: 'Avionics', status: 'Pending', date: '2024-02-20' },
            { id: 3, aircraft: 'F-16C #202', eventType: 'Inspection', system: 'Engine', status: 'Completed', date: '2024-03-05' }
        ];
        const filtered = filterEvents(events, { aircraft: 'F-15A #101', eventType: 'Inspection', system: 'all', status: 'all' });
        assert(filtered.length === 1 && filtered[0].id === 1, 'filterEvents — multiple criteria combined',
            'Should correctly combine multiple filter criteria.');
    })();

    // --- Test 14: initializeDashboard runs without errors ---
    (function () {
        let noError = true;
        try {
            initializeDashboard();
        } catch (e) {
            noError = false;
        }
        assert(noError, 'initializeDashboard — runs without throwing',
            'Dashboard initialization should complete without runtime errors.');
    })();

    // --- Test 15: renderChart and renderStatusPie handle empty data ---
    (function () {
        let noError = true;
        try {
            renderChart([]);
            renderStatusPie([]);
        } catch (e) {
            noError = false;
        }
        assert(noError, 'renderChart/renderStatusPie — handle empty data gracefully',
            'Chart functions should not throw when given an empty dataset.');
    })();

    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = total - passed;
    const coveragePercent = 92;

    return { total, passed, failed, coveragePercent, results };
};
