import { LightningElement, api, wire } from 'lwc';
import { gql, graphql } from 'lightning/graphql';
import USER_ID from '@salesforce/user/Id';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import LOCALE from '@salesforce/i18n/locale';
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

export function weekStart(key, firstDay = 1) {
    const day = new Date(`${key}T12:00:00Z`).getUTCDay();
    return addDays(key, -((day - firstDay + 7) % 7));
}
export function monthGrid(key, firstDay = 1) {
    const start = weekStart(key.slice(0, 7) + '-01', firstDay);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function layoutEvents(records, start, end) {
    const items = records.map((m) => ({ ...m, segmentStart: Math.max(m.start, start), segmentEnd: Math.min(m.end, end) }))
        .sort((a, b) => a.segmentStart - b.segmentStart || a.id.localeCompare(b.id));
    let group = [], lanes = [], groupEnd = -Infinity;
    const finalize = () => { for (const m of group) m.lanes = lanes.length; group = []; lanes = []; };
    for (const m of items) {
        // Reserve visual space for point/short events as well as real overlap.
        const visualEnd = Math.max(m.segmentEnd, m.segmentStart + 30 * 60000);
        if (m.segmentStart >= groupEnd) finalize();
        let lane = lanes.findIndex((until) => until <= m.segmentStart);
        if (lane < 0) lane = lanes.length;
        lanes[lane] = visualEnd; m.lane = lane; group.push(m); groupEnd = Math.max(groupEnd, visualEnd);
    }
    finalize();
    return items.map((m) => ({ ...m, position: `top:${(m.segmentStart - start) / 3600000 * 48}px;height:${Math.max(24, (m.segmentEnd - m.segmentStart) / 3600000 * 48)}px;left:${m.lane * 100 / m.lanes}%;width:${100 / m.lanes}%;` }));
}

export default class HomepageCalendarMeetings extends LightningElement {
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
        this._connected = false;
        this._resizeObserver?.disconnect();
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

    @api displayMode = 'compact';
    @api selectedDate;
    @api initialView = 'week';
    selectedKey;
    view = 'month';
    _todayKey;
    availableWidth = 0;
    detailId;
    _resizeObserver;
    initializeView() {
        this._todayKey = dateKey(Date.now(), this.displayZone);
        this.selectedKey = validDate(this.selectedDate) ? this.selectedDate : this._todayKey;
        this.view = this.displayMode === 'compact' ? 'month' :
            ['week','workweek','month','agenda'].includes(this.initialView) ? this.initialView : 'week';
        if (typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver((entries) => { this.availableWidth = entries[0]?.contentRect.width || 0; });
            this._resizeObserver.observe(this.hostElement);
        }
    }
    get firstWeekday() {
        try { const locale = new Intl.Locale(LOCALE.replace('_', '-')); return (locale.getWeekInfo?.() || locale.weekInfo)?.firstDay % 7 || 0; }
        catch { return 1; }
    }
    calculateRange() {
        if (this.view === 'month') { const keys = monthGrid(this.selectedKey, this.firstWeekday); return [keys[0], addDays(keys[41], 1)]; }
        if (this.view === 'week' || this.view === 'workweek') {
            const start = weekStart(this.selectedKey, this.view === 'workweek' ? 1 : this.firstWeekday);
            return [start, addDays(start, this.view === 'workweek' ? 5 : 7)];
        }
        return [this.selectedKey, addDays(this.selectedKey, 1)];
    }
    onDayRollover() { this.loadRange(); }
    get viewActive() { return true; }
    get isExpanded() { return this.displayMode === 'expanded'; }
    get showMonth() { return !this.isExpanded || this.view === 'month' && this.availableWidth >= 760; }
    get showTimeGrid() { return this.isExpanded && ['week','workweek'].includes(this.view) && this.availableWidth >= 760 && !this.detailId; }
    get showAgenda() { return !this.showTimeGrid && !this.detailId; }
    get showSearch() { return this.isExpanded; }
    get searchLabel() { return this.complete ? 'Search this range' : 'Search loaded meetings'; }
    get monthHeading() { return new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${this.selectedKey}T12:00:00Z`)); }
    get rangeHeading() { return `${this.dateStart} – ${addDays(this.dateEnd, -1)}`; }
    get viewOptions() { return [{label:'Week',value:'week'},{label:'Workweek',value:'workweek'},{label:'Month',value:'month'},{label:'Agenda',value:'agenda'}]; }
    get dayNames() {
        const base = weekStart('2026-09-20', this.firstWeekday);
        return Array.from({length:7}, (_,i) => ({id:String(i),label:new Intl.DateTimeFormat(LOCALE,{weekday:'short',timeZone:'UTC'}).format(new Date(`${addDays(base,i)}T12:00:00Z`))}));
    }
    meetingsForDay(key) { return this.filteredRecords.filter((m) => intersects(m, key, addDays(key,1), this.displayZone)); }
    get weeks() {
        const cells = monthGrid(this.selectedKey, this.firstWeekday).map((key) => {
            const meetings = this.meetingsForDay(key);
            const exact = this.complete ? `, ${meetings.length} meetings` : ', meeting count incomplete';
            const today = key === this._todayKey;
            return { key, number:Number(key.slice(8)), selected:key === this.selectedKey,
                current:today ? 'date' : null, tabIndex:key === this.selectedKey ? '0' : '-1',
                label:`${new Intl.DateTimeFormat(LOCALE,{dateStyle:'full',timeZone:'UTC'}).format(new Date(`${key}T12:00:00Z`))}${exact}${today ? ', Today' : ''}`,
                cellClass:`day ${key === this.selectedKey ? 'selected' : ''} ${today ? 'today' : ''} ${key.slice(0,7) !== this.selectedKey.slice(0,7) ? 'adjacent' : ''}`,
                dots: meetings.length ? '•'.repeat(Math.min(3, meetings.length)) : '',
                titles: this.isExpanded ? meetings.slice(0,2).map((m) => ({id:m.id,subject:m.subject})) : [],
                overflow: this.isExpanded && meetings.length > 2 ? `+${meetings.length-2} more` : '' };
        });
        return Array.from({length:6},(_,i)=>({key:cells[i*7].key,days:cells.slice(i*7,i*7+7)}));
    }
    get visibleMeetings() {
        const records = this.isExpanded && (!this.showMonth || this.view !== 'month') ? this.filteredRecords : this.meetingsForDay(this.selectedKey);
        return (this.isExpanded ? records : selectCards(records,this.maxVisibleMeetings,true,Date.now())).map((m) => { const model = this.viewModel(m); return {...model, timeLabel:this.isExpanded ? model.fullTime : model.timeLabel}; });
    }
    get isEmpty() { return this.complete && !this.visibleMeetings.length; }
    changeView(event) { this.view = event.detail.value; this.detailId = null; this.loadRange(); }
    movePeriod(direction) {
        if (this.view === 'month') {
            const d = new Date(`${this.selectedKey.slice(0,7)}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth()+direction);
            this.selectedKey = d.toISOString().slice(0,10);
        } else this.selectedKey = addDays(this.selectedKey, direction * (this.view === 'agenda' ? 1 : 7));
        this.detailId = null; this.loadRange(); this.reportDate();
    }
    previousPeriod() { this.movePeriod(-1); }
    nextPeriod() { this.movePeriod(1); }
    goToday() { this.selectedKey = dateKey(Date.now(), this.displayZone); this.detailId = null; this.loadRange(); this.reportDate(); }
    selectDay(event) { this.setDate(event.currentTarget.dataset.date); }
    setDate(key) {
        const previousMonth = this.selectedKey.slice(0,7);
        this.selectedKey = key; this.detailId = null;
        if (this.view !== 'month' || key.slice(0,7) !== previousMonth) this.loadRange();
        this.reportDate();
    }
    reportDate() { this.dispatchEvent(new CustomEvent('datechange',{detail:{date:this.selectedKey}})); }
    handleDateKey(event) {
        const moves = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
        let key = event.currentTarget.dataset.date;
        if (Object.prototype.hasOwnProperty.call(moves,event.key)) key = addDays(key,moves[event.key]);
        else if (event.key === 'Home') key = weekStart(key,this.firstWeekday);
        else if (event.key === 'End') key = addDays(weekStart(key,this.firstWeekday),6);
        else if (event.key === 'PageUp' || event.key === 'PageDown') {
            const d = new Date(`${key}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth()+(event.key === 'PageUp' ? -1 : 1)); key = d.toISOString().slice(0,10);
        } else return;
        event.preventDefault(); this.setDate(key);
        Promise.resolve().then(()=>this.template.querySelector(`[data-date="${key}"]`)?.focus());
    }
    overflow(event) { this.selectedKey = event.currentTarget.dataset.date; this.handleViewAll(); }
    openDetail(event) {
        const id = event.currentTarget.dataset.eventId;
        if (!this.records.some((m)=>m.id === id && m.end > Date.now())) { this.prune(); return; }
        this.detailId = id;
        Promise.resolve().then(()=>this.template.querySelector('[data-detail-heading]')?.focus());
    }
    get detailMeetings() { return this.records.filter((m)=>m.id===this.detailId && m.end>Date.now()).map((m)=>this.viewModel(m)); }
    closeDetail() {
        const id = this.detailId; this.detailId = null;
        Promise.resolve().then(()=>{ const target=this.template.querySelector(`[data-event-id="${id}"]`) || this.template.querySelector('[data-heading]'); target?.focus(); });
    }
    detailKey(event) { if (event.key === 'Escape' && this.detailId) { event.stopPropagation(); this.closeDetail(); } }
    get gridDays() {
        if (!this.showTimeGrid) return [];
        const days = [];
        for (let key=this.dateStart; key<this.dateEnd; key=addDays(key,1)) {
            const start=midnight(key,this.displayZone),end=midnight(addDays(key,1),this.displayZone);
            const records=this.meetingsForDay(key);
            const hours=[];
            const time=new Intl.DateTimeFormat(LOCALE,{timeZone:this.displayZone,hour:'numeric',minute:'2-digit',timeZoneName:'shortOffset'});
            for(let instant=start; instant<end; instant+=3600000) hours.push({id:String(instant),label:time.format(instant)});
            const now=Date.now();
            days.push({key,label:new Intl.DateTimeFormat(LOCALE,{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${key}T12:00:00Z`)),
                allDay:records.filter((m)=>m.isAllDay).map((m)=>this.viewModel(m)),hours,
                height:`height:${(end-start)/3600000*48}px`,
                events:layoutEvents(records.filter((m)=>!m.isAllDay),start,end).map((m)=>({...this.viewModel(m),position:m.position})),
                isToday:now>=start && now<end, nowPosition:`top:${(now-start)/3600000*48}px`});
        }
        return days;
    }

}
