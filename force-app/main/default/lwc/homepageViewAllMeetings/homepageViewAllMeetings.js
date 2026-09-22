import { api, wire } from 'lwc';
import { gql, graphql } from 'lightning/graphql';
import USER_ID from '@salesforce/user/Id';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import LOCALE from '@salesforce/i18n/locale';
import LightningModal from 'lightning/modal';
const MEETINGS_QUERY = gql`
    query HomepageMeetings($sellerId: ID!, $recordTypeIds: [ID!]!,
        $rangeStart: DateTime!, $rangeEnd: DateTime!, $dateEnd: Date!,
        $utcStart: DateTime!, $asOf: DateTime!, $after: String) {
        uiapi { query { Event(first: 100, after: $after,
            where: { and: [
                { OwnerId: { eq: $sellerId } }
                { Status__c: { in: ["Scheduled", "Rescheduling"] } }
                { What: { Opportunity: { RecordTypeId: { in: $recordTypeIds } } } }
                { EndDateTime: { gt: { value: $asOf } } }
                { or: [
                    { and: [
                        { IsAllDayEvent: { eq: false } }
                        { StartDateTime: { lt: { value: $rangeEnd } } }
                        { or: [
                            { EndDateTime: { gt: { value: $rangeStart } } }
                            { StartDateTime: { gte: { value: $rangeStart } } }
                        ] }
                    ] }
                    { and: [
                        { IsAllDayEvent: { eq: true } }
                        { ActivityDate: { lt: { value: $dateEnd } } }
                        { EndDateTime: { gt: { value: $utcStart } } }
                    ] }
                ] }
            ] }, orderBy: { StartDateTime: { order: ASC }, Id: { order: ASC } }) {
                edges { cursor node {
                    Id OwnerId { value } Subject { value }
                    StartDateTime { value } EndDateTime { value }
                    IsAllDayEvent { value } ActivityDate { value }
                    status: Status__c { value }
                    topic: Topic__c @optional { value }
                    category: Interaction_Category__c @optional { value }
                    WhatId { value } WhoId @optional { value }
                    What { ... on Opportunity { Id Name { value } RecordTypeId { value } } }
                    Who @optional {
                        ... on Contact { Id Name @optional { value } }
                        ... on Lead { Id Name @optional { value } }
                    }
                } }
                pageInfo { startCursor endCursor hasNextPage }
            }
        } }
    }
`;
// Kept local deliberately: there is no sixth utility or query bundle.
const field = (value) => value?.value;
export function dateKey(instant, zone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(instant));
    const part = (name) => parts.find((p) => p.type === name).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}
export function addDays(key, days) {
    return new Date(Date.parse(`${key}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function validDate(key) {
    return /^\d{4}-\d{2}-\d{2}$/.test(key || '') &&
        Number.isFinite(Date.parse(`${key}T00:00:00Z`)) &&
        new Date(`${key}T00:00:00Z`).toISOString().slice(0, 10) === key;
}
// Find the first instant of a local calendar date, independently for each bound.
// Binary search handles midnight gaps/repeats; no guessed offset or 24-hour day.
const midnightCache = new Map();
export function midnight(key, zone) {
    const cacheKey = `${key}|${zone}`;
    if (midnightCache.has(cacheKey)) return midnightCache.get(cacheKey);
    if (!validDate(key)) throw new Error('Invalid calendar date');
    const anchor = Date.parse(`${key}T00:00:00Z`);
    let low = anchor - 36 * 3600000;
    let high = anchor + 36 * 3600000;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (dateKey(mid, zone) < key) low = mid + 1;
        else high = mid;
    }
    // A skipped civil day is an empty interval at the following day's boundary.
    if (midnightCache.size >= 256) midnightCache.delete(midnightCache.keys().next().value);
    midnightCache.set(cacheKey, low);
    return low;
}
export function intersects(m, start, end, zone) {
    if (m.isAllDay) return m.startDate < end && m.endDate > start;
    const a = midnight(start, zone), b = midnight(end, zone);
    return m.start < b && (m.end > a || (m.start === m.end && m.start >= a));
}
export function safeExternalUrl(raw, hosts = []) {
    try {
        const url = new URL(raw);
        return url.protocol === 'https:' && !url.username && !url.password &&
            hosts.includes(url.hostname) ? url.href : null;
    } catch { return null; }
}
export function normalize(node, scope, now) {
    const start = Date.parse(field(node.StartDateTime)), end = Date.parse(field(node.EndDateTime));
    const opp = node.What;
    if (!node.Id || !Number.isFinite(start) || !Number.isFinite(end) || end < start || end <= now ||
        field(node.OwnerId) !== scope.sellerId ||
        !['Scheduled', 'Rescheduling'].includes(field(node.status)) || !opp?.Id ||
        opp.Id !== field(node.WhatId) || !scope.recordTypeIds.includes(field(opp.RecordTypeId))) return null;
    if (typeof field(node.IsAllDayEvent) !== 'boolean') return null;
    const isAllDay = field(node.IsAllDayEvent) === true;
    const startDate = field(node.ActivityDate), endDate = new Date(end).toISOString().slice(0, 10);
    if (isAllDay && (!validDate(startDate) || startDate >= endDate ||
        new Date(end).toISOString().slice(11) !== '00:00:00.000Z')) return null;
    const display = (v) => v === undefined ? 'Unavailable' : field(v) || 'Not specified';
    return { id: node.Id, start, end, isAllDay, startDate, endDate,
        subject: display(node.Subject), opportunityId: opp.Id, opportunity: display(opp.Name),
        topic: display(node.topic), category: display(node.category),
        personId: node.Who?.Id, person: node.Who ? display(node.Who.Name) :
            (node.WhoId === undefined || field(node.WhoId) ? 'Unavailable' : 'Not specified'),
        rescheduling: field(node.status) === 'Rescheduling',
        eventUrl: `/lightning/r/Event/${encodeURIComponent(node.Id)}/view`,
        opportunityUrl: `/lightning/r/Opportunity/${encodeURIComponent(opp.Id)}/view`
    };
}
export function selectCards(records, max, today, now) {
    const limit = Math.min(3, Math.max(1, Math.floor(Number(max) || 3)));
    const eligible = records.filter((m) => m.end > now);
    const rank = (m) => m.isAllDay ? 0 : today && m.start <= now ? 1 : 2;
    return [...eligible].sort((a, b) => rank(a) - rank(b) || a.start - b.start || a.id.localeCompare(b.id))
        .slice(0, limit).sort((a, b) => Number(b.isAllDay) - Number(a.isAllDay) || a.start - b.start || a.id.localeCompare(b.id));
}

export default class HomepageViewAllMeetings extends LightningModal {
    @api scopeConfig;
    @api displayZone = TIME_ZONE;
    @api maxVisibleMeetings = 3;
    @api integrationConfig;
    records = [];
    after = null;
    nextCursor = null;
    hasMore = false;
    loading = true;
    complete = false;
    errorMessage = '';
    announcement = '';
    queryAsOf;
    rangeStart;
    rangeEnd;
    dateStart;
    dateEnd;
    lastCheckedAt;
    searchTerm = '';
    sortDescending = false;
    _pages = new Map();
    _refresh;
    _connected = false;
    _timer;
    _pageBudget = 1000;
    _invalid = false;
    _scopeKey = '';
    _wake = () => {
        if (document.visibilityState === 'hidden') { clearTimeout(this._timer); return; }
        this.prune();
        if (this.rollover()) return;
        if (!this.lastCheckedAt || Date.now() - Date.parse(this.lastCheckedAt) > 300000) this.refreshMeetings();
    };
    connectedCallback() {
        this._connected = true;
        this.initializeView();
        this.loadRange();
        window.addEventListener('focus', this._wake);
        window.addEventListener('pageshow', this._wake);
        document.addEventListener('visibilitychange', this._wake);
    }
    disconnectedCallback() {
        this._resizeObserver?.disconnect();
        this._connected = false;
        clearTimeout(this._timer);
        window.removeEventListener('focus', this._wake);
        window.removeEventListener('pageshow', this._wake);
        document.removeEventListener('visibilitychange', this._wake);
    }
    get configured() {
        return this.scopeConfig?.sellerId === USER_ID &&
            this.scopeConfig?.recordTypeIds?.length === 2 &&
            this.scopeConfig.recordTypeIds.every((id) => /^012[a-zA-Z0-9]{12}(?:[a-zA-Z0-9]{3})?$/.test(id));
    }
    get activeQuery() { return this._connected && this.configured && this.viewActive && this.rangeStart ? MEETINGS_QUERY : undefined; }
    get queryVariables() {
        return { sellerId: this.scopeConfig?.sellerId, recordTypeIds: this.scopeConfig?.recordTypeIds,
            rangeStart: this.rangeStart, rangeEnd: this.rangeEnd, dateEnd: this.dateEnd,
            utcStart: this.dateStart ? `${this.dateStart}T00:00:00.000Z` : undefined,
            asOf: this.queryAsOf, after: this.after };
    }
    loadRange() {
        clearTimeout(this._timer);
        try {
            const [start, end] = this.calculateRange();
            this.dateStart = start; this.dateEnd = end;
            this.rangeStart = new Date(midnight(start, this.displayZone)).toISOString();
            this.rangeEnd = new Date(midnight(end, this.displayZone)).toISOString();
            this.queryAsOf = new Date().toISOString();
            this._scopeKey = JSON.stringify([this.rangeStart, this.rangeEnd, this.queryAsOf, this.scopeConfig]);
            this.after = null; this.nextCursor = null; this.hasMore = false;
            this._pages = new Map(); this.records = []; this.complete = false; this._invalid = false;
            this.loading = this.configured && this.viewActive; this.errorMessage = '';
            this._pageBudget = 1000;
            this.emitSummary(); this.armTimer();
        } catch {
            this.rangeStart = undefined; this.loading = false;
            this.errorMessage = 'Meetings unavailable: check the configured timezone and date.';
        }
    }
    @wire(graphql, { query: '$activeQuery', variables: '$queryVariables' })
    wiredMeetings({ data, errors, refresh }) {
        if (!this.activeQuery) return;
        if (typeof refresh === 'function') {
            this._refresh = refresh;
        }
        if (errors?.length) {
            this.errorMessage = 'Could not load meetings. Required fields or meeting access may be unavailable. Retry or contact your Salesforce administrator.';
            this.loading = false; this.complete = false;
            // Fail closed: errors cannot establish the eligibility of partial data.
            this.records = []; this._pages.clear(); this.hasMore = false;
            this.emitSummary(); return;
        }
        if (!data) { this.loading = true; return; }
        const connection = data.uiapi?.query?.Event;
        if (!connection?.pageInfo || !Array.isArray(connection.edges)) {
            this.errorMessage = 'Meetings unavailable: the response could not be verified.';
            this.loading = false; this.complete = false; this.emitSummary(); return;
        }
        const now = Date.now();
        const normalized = connection.edges.map(({ node }) => normalize(node, this.scopeConfig, now));
        // The adapter does not expose response variables. Out-of-range data is rejected;
        // empty/overlapping stale emissions still require target-adapter race validation.
        if (normalized.some((m) => m && !intersects(m, this.dateStart, this.dateEnd, this.displayZone))) return;
        this._invalid = this._invalid || connection.edges.some(({ node }, i) => !normalized[i] && !(Date.parse(field(node.EndDateTime)) <= now));
        const pageKey = connection.pageInfo.startCursor || '__empty__';
        const known = this._pages.get(pageKey);
        const isCurrentPage = !known || known.after === this.after;
        this._pages.set(pageKey, { after: known ? known.after : this.after, records: normalized.filter(Boolean) });
        const changedIds = new Set(connection.edges.map(({ node }) => node.Id));
        for (const [key, page] of this._pages) {
            if (key !== pageKey) page.records = page.records.filter((m) => !changedIds.has(m.id));
        }
        const unique = new Map();
        for (const page of this._pages.values()) for (const m of page.records) if (m.end > now) unique.set(m.id, m);
        this.records = [...unique.values()];
        if (isCurrentPage) {
            this.nextCursor = connection.pageInfo.endCursor;
            this.hasMore = connection.pageInfo.hasNextPage;
            this.complete = !this.hasMore && !this._invalid;
        }
        this.loading = false; this.errorMessage = this._invalid ? 'Some meetings could not be verified. Results are incomplete.' : '';
        this.lastCheckedAt = new Date(now).toISOString();
        this.prune();
        if (isCurrentPage && this.hasMore && this._pages.size * 100 < this._pageBudget) {
            const scopeKey = this._scopeKey;
            Promise.resolve().then(() => { if (this._connected && !this.loading && this._scopeKey === scopeKey) this.loadMore(); });
        }
    }
    loadMore() {
        if (this.loading || !this.hasMore || !this.nextCursor || this.nextCursor === this.after) return;
        this._pageBudget = Math.max(this._pageBudget, (this._pages.size + 1) * 100);
        this.after = this.nextCursor; this.loading = true;
    }
    @api async refreshMeetings() {
        if (!this.viewActive) { this.template.querySelector('c-homepage-calendar-meetings')?.refreshMeetings(); return; }
        this.prune();
        // Refresh the currently wired collection through the v2 contract, then restart membership.
        const refresh = this._refresh;
        try { if (refresh) await refresh(); }
        catch { this.errorMessage = 'Could not refresh meetings. Please retry.'; return; }
        if (this._connected) this.loadRange();
    }
    prune() {
        const now = Date.now();
        const removed = this.records.filter((m) => m.end <= now);
        const activeId = this.template.activeElement?.dataset?.eventId;
        this.records = this.records.filter((m) => m.end > now);
        if (removed.some((m) => m.id === activeId || m.id === this.detailId)) {
            this.detailId = null;
            this.announcement = 'Meeting ended and was removed.';
            Promise.resolve().then(() => this.template.querySelector('[data-heading]')?.focus());
        }
        this.emitSummary(); this.armTimer();
    }
    armTimer() {
        clearTimeout(this._timer);
        if (!this._connected || !this.viewActive || document.visibilityState === 'hidden') return;
        const now = Date.now();
        const next = Math.min(now + 60000, ...this.records.filter((m) => m.end > now).map((m) => m.end));
        this._timer = setTimeout(() => { this.prune(); this.rollover(); }, Math.max(1, next - now));
    }
    rollover() {
        const today = dateKey(Date.now(), this.displayZone);
        if (this._todayKey !== today) {
            this._todayKey = today;
            this.onDayRollover(); return true;
        }
        return false;
    }
    emitSummary() {
        this.dispatchEvent(new CustomEvent('summarychange', { detail: {
            dateKey: this.selectedKey, exactCountOrNull: this.complete ? this.records.filter((m) => m.end > Date.now()).length : null,
            completeness: this.complete ? 'complete' : this.errorMessage ? 'failed' : this.loading ? 'loading' : 'partial',
            lastCheckedAt: this.lastCheckedAt
        } }));
    }
    get heading() {
        return `${new Intl.DateTimeFormat(LOCALE, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${this.selectedKey}T12:00:00Z`))} · ${this.displayZone}`;
    }
    get setupMessage() { return this.configured ? '' : 'Meeting setup pending: the two Opportunity record types must be resolved.'; }
    get statusText() {
        if (this.loading) return 'Loading meetings…';
        return this.complete ? `${this.records.filter((m) => m.end > Date.now()).length} meetings · All loaded` : 'Results incomplete · Continue loading when available';
    }
    get searchLabel() { return this.complete ? 'Search this day' : 'Search loaded meetings'; }
    handleSearch(event) { this.searchTerm = event.target.value || ''; }
    get filteredRecords() {
        const term = this.searchTerm.toLocaleLowerCase(LOCALE);
        return this.records.filter((m) => m.end > Date.now() &&
            [m.subject, m.opportunity, m.topic, m.category, m.person].join(' ').toLocaleLowerCase(LOCALE).includes(term))
            .sort((a, b) => Number(b.isAllDay) - Number(a.isAllDay) ||
                (this.sortDescending ? b.start - a.start : a.start - b.start) || a.id.localeCompare(b.id));
    }
    viewModel(m) {
        const time = new Intl.DateTimeFormat(LOCALE, { timeZone: this.displayZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'shortOffset' });
        const full = new Intl.DateTimeFormat(LOCALE, { timeZone: this.displayZone, dateStyle: 'medium', timeStyle: 'long' });
        const impactUrl = safeExternalUrl(this.resolveImpactAssessmentUrl({ eventId: m.id, opportunityId: m.opportunityId }), this.integrationConfig?.approvedImpactHosts);
        return { ...m, timeLabel: m.isAllDay ? 'All day' : `${time.format(m.start)} – ${time.format(m.end)}`,
            fullTime: m.isAllDay ? `${m.startDate} through ${addDays(m.endDate, -1)} · All day` : `${full.format(m.start)} – ${full.format(m.end)}`,
            timing: m.isAllDay ? '' : m.start <= Date.now() ? 'In progress' : 'Upcoming',
            impactUrl, impactDisabled: !impactUrl };
    }
    // Arun: implement this same extension point in each of the four consumers.
    resolveImpactAssessmentUrl({ eventId, opportunityId }) {
        void eventId; void opportunityId;
        return null;
    }
    handleImpact(event) {
        const m = this.records.find((r) => r.id === event.currentTarget.dataset.eventId);
        if (!m || m.end <= Date.now()) { event.preventDefault(); this.prune(); return; }
        const url = safeExternalUrl(this.resolveImpactAssessmentUrl({ eventId: m.id, opportunityId: m.opportunityId }), this.integrationConfig?.approvedImpactHosts);
        if (!url || url !== event.currentTarget.href) event.preventDefault();
    }
    handleRecord(event) {
        event.preventDefault();
        const m = this.records.find((r) => r.id === event.currentTarget.dataset.eventId);
        if (!m || m.end <= Date.now()) { this.prune(); return; }
        const opportunity = event.currentTarget.dataset.kind === 'opportunity';
        this.navigateRecord({ recordId: opportunity ? m.opportunityId : m.id, objectApiName: opportunity ? 'Opportunity' : 'Event' });
    }
    navigateRecord(detail) { this.dispatchEvent(new CustomEvent('requestnavigation', { detail })); }
    handleViewAll() { this.dispatchEvent(new CustomEvent('viewall', { detail: { date: this.selectedKey, mode: 'list' } })); }
    handleExpand() { this.dispatchEvent(new CustomEvent('expand', { detail: { date: this.selectedKey, mode: 'calendar' } })); }

    @api initialDate;
    @api initialMode = 'list';
    availableWidth = 0;
    _resizeObserver;
    get showTable() { return this.availableWidth >= 760; }
    selectedKey;
    _todayKey;
    mode = 'list';
    activeTab = 'today';
    initializeView() {
        if (typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver((entries) => { this.availableWidth = entries[0]?.contentRect.width || 0; });
            this._resizeObserver.observe(this.hostElement);
        }
        this._todayKey = dateKey(Date.now(), this.displayZone);
        this.selectedKey = validDate(this.initialDate) ? this.initialDate : this._todayKey;
        this.mode = this.initialMode === 'calendar' ? 'calendar' : 'list';
        this.activeTab = this.mode === 'calendar' ? 'calendar' : this.selectedKey === this._todayKey ? 'today' :
            this.selectedKey === addDays(this._todayKey, 1) ? 'tomorrow' : 'selected';
    }
    calculateRange() { return [this.selectedKey, addDays(this.selectedKey, 1)]; }
    onDayRollover() {
        if (this.activeTab === 'today' || this.activeTab === 'tomorrow') this.selectedKey = addDays(this._todayKey, this.activeTab === 'tomorrow' ? 1 : 0);
        this.loadRange();
    }
    get viewActive() { return this.mode === 'list'; }
    get showCalendar() { return this.mode === 'calendar'; }
    get showSelected() { return this.activeTab === 'selected'; }
    get visibleMeetings() { return this.filteredRecords.map((m) => this.viewModel(m)); }
    get isEmpty() { return this.complete && !this.visibleMeetings.length; }
    get sortDisabled() { return !this.complete; }
    get sortLabel() { return this.sortDescending ? 'Sort start time ascending' : 'Sort start time descending'; }
    sortTime() { if (this.complete) this.sortDescending = !this.sortDescending; }
    get dashboardUrl() {
        try {
            const raw = this.integrationConfig?.manageMeetingsUrl;
            if (!raw || /[\\\s]/.test(raw)) return null;
            const url = new URL(raw, window.location.origin);
            return url.origin === window.location.origin && url.pathname.startsWith('/lightning/') && !url.username && !url.password ? url.href : null;
        } catch { return null; }
    }
    handleTab(event) {
        const value = event.target.value;
        if (!['today', 'tomorrow', 'calendar', 'selected'].includes(value) || value === this.activeTab) return;
        this.activeTab = value;
        this.mode = value === 'calendar' ? 'calendar' : 'list';
        if (value === 'today' || value === 'tomorrow') this.selectedKey = addDays(dateKey(Date.now(), this.displayZone), value === 'tomorrow' ? 1 : 0);
        this.searchTerm = ''; this.loadRange();
    }
    handleCalendarList(event) { this.selectedKey = event.detail.date; this.activeTab = 'selected'; this.mode = 'list'; this.searchTerm = ''; this.loadRange(); }
    handleCalendarDate(event) { this.selectedKey = event.detail.date; }
    handleCalendarNavigation(event) { this.navigateRecord(event.detail); }
    navigateRecord(navigation) { this.close({ navigation, date: this.selectedKey }); }
    closeModal() { this.close({ date: this.selectedKey }); }
}
