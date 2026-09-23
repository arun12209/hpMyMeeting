import { LightningElement, api, wire } from 'lwc';
import { gql, graphql } from 'lightning/graphql';
import USER_ID from '@salesforce/user/Id';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import LOCALE from '@salesforce/i18n/locale';
// The target org rejected What.RecordTypeId on the polymorphic Name entity.
// A reference semi-join filters Opportunity directly. Three disjoint operations
// avoid combining a semi-join with OR; only one connection is active at a time.
const MEETINGS_QUERY = gql`
    query HomepageStartingMeetings($sellerId: ID!, $recordTypeIds: [ID!]!,
        $rangeStart: DateTime!, $rangeEnd: DateTime!, $asOf: DateTime!, $after: String) {
        uiapi { query { Event(first: 100, after: $after,
            where: {
                OwnerId: { eq: $sellerId }
                Status__c: { in: ["Scheduled", "Rescheduling"] }
                WhatId: { inq: { Opportunity: { RecordTypeId: { in: $recordTypeIds } }, ApiName: "Id" } }
                EndDateTime: { gt: { value: $asOf } }
                IsAllDayEvent: { eq: false }
                StartDateTime: { gte: { value: $rangeStart }, lt: { value: $rangeEnd } }
            }, orderBy: { StartDateTime: { order: ASC }, Id: { order: ASC } }) {
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
        } } }
    }
    query HomepageContinuingMeetings($sellerId: ID!, $recordTypeIds: [ID!]!,
        $rangeStart: DateTime!, $asOf: DateTime!, $after: String) {
        uiapi { query { Event(first: 100, after: $after,
            where: {
                OwnerId: { eq: $sellerId }
                Status__c: { in: ["Scheduled", "Rescheduling"] }
                WhatId: { inq: { Opportunity: { RecordTypeId: { in: $recordTypeIds } }, ApiName: "Id" } }
                EndDateTime: { gt: { value: $asOf } }
                IsAllDayEvent: { eq: false }
                StartDateTime: { lt: { value: $rangeStart } }
                and: [{ EndDateTime: { gt: { value: $rangeStart } } }]
            }, orderBy: { StartDateTime: { order: ASC }, Id: { order: ASC } }) {
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
        } } }
    }
    query HomepageAllDayMeetings($sellerId: ID!, $recordTypeIds: [ID!]!,
        $dateEnd: Date!, $utcStart: DateTime!, $asOf: DateTime!, $after: String) {
        uiapi { query { Event(first: 100, after: $after,
            where: {
                OwnerId: { eq: $sellerId }
                Status__c: { in: ["Scheduled", "Rescheduling"] }
                WhatId: { inq: { Opportunity: { RecordTypeId: { in: $recordTypeIds } }, ApiName: "Id" } }
                EndDateTime: { gt: { value: $asOf } }
                IsAllDayEvent: { eq: true }
                ActivityDate: { lt: { value: $dateEnd } }
                and: [{ EndDateTime: { gt: { value: $utcStart } } }]
            }, orderBy: { StartDateTime: { order: ASC }, Id: { order: ASC } }) {
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
        } } }
    }
`;
// Kept local deliberately: there is no sixth utility or query bundle.
const field = (value) => value?.value;
const formatters = new Map();
function formatter(locale, options) {
    const key = JSON.stringify([locale, options]);
    if (!formatters.has(key)) {
        if (formatters.size >= 64) formatters.delete(formatters.keys().next().value);
        formatters.set(key, new Intl.DateTimeFormat(locale, options));
    }
    return formatters.get(key);
}
export function dateKey(instant, zone) {
    const parts = formatter('en-CA', {
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
export function formatTime(instant, zone, locale) {
    const wall = formatter('en-CA', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    const label = wall.format(instant);
    const ambiguous = [-120,-60,-30,30,60,120].some((minutes) => wall.format(instant + minutes * 60000) === label);
    return formatter(locale, {timeZone:zone,hour:'numeric',minute:'2-digit', ...(ambiguous ? {timeZoneName:'shortOffset'} : {})}).format(instant);
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

export default class HomepageTodaysMeeting extends LightningElement {
    _scopeConfig;
    @api get scopeConfig() { return this._scopeConfig; }
    set scopeConfig(value) {
        const changed = JSON.stringify(value) !== JSON.stringify(this._scopeConfig);
        this._scopeConfig = value;
        if (changed && this._connected) this.loadRange();
    }
    @api displayZone = TIME_ZONE;
    @api maxVisibleMeetings = 3;
    @api integrationConfig;
    records = [];
    _nextId;
    _lane = 0;
    _connectionHasMore = false;
    after = null;
    nextCursor = null;
    hasMore = false;
    loading = true;
    complete = false;
    errorMessage = '';
    errorDetails = '';
    announcement = '';
    queryAsOf;
    rangeStart;
    rangeEnd;
    dateStart;
    dateEnd;
    lastCheckedAt;
    sortDescending = false;
    _pages = new Map();
    _refresh;
    _refreshing;
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
    get activeOperation() { return ['HomepageStartingMeetings', 'HomepageContinuingMeetings', 'HomepageAllDayMeetings'][this._lane]; }
    get queryVariables() {
        return { sellerId: this.scopeConfig?.sellerId, recordTypeIds: this.scopeConfig?.recordTypeIds,
            rangeStart: this.rangeStart, rangeEnd: this.rangeEnd, dateEnd: this.dateEnd,
            utcStart: this.dateStart ? `${this.dateStart}T00:00:00.000Z` : undefined,
            asOf: this.queryAsOf, after: this.after };
    }
    setFailure(error, stage = 'Loading meetings') {
        const errors = Array.isArray(error) ? error : [error];
        this.errorDetails = errors.map((item) => {
            const code = item?.extensions?.errorCode || item?.errorCode || item?.name;
            const message = item?.message || item?.body?.message || String(item);
            return `${code ? `${code}: ` : ''}${message}`;
        }).join('\n');
        this.errorMessage = `${stage} failed.`;
        this.loading = false;
        this.complete = false;
    }
    loadRange() {
        clearTimeout(this._timer);
        let start, end, rangeStart, rangeEnd;
        try {
            [start, end] = this.calculateRange();
            rangeStart = new Date(midnight(start, this.displayZone)).toISOString();
            rangeEnd = new Date(midnight(end, this.displayZone)).toISOString();
        } catch (error) {
            this.rangeStart = undefined;
            this.setFailure(error, 'Preparing meeting dates');
            return;
        }
        this.dateStart = start; this.dateEnd = end;
        this.rangeStart = rangeStart; this.rangeEnd = rangeEnd;
        this.queryAsOf = new Date().toISOString();
        this._scopeKey = JSON.stringify([rangeStart, rangeEnd, this.queryAsOf, this.scopeConfig]);
        this._refresh = undefined;
        this._lane = 0; this._connectionHasMore = false;
        this.after = null; this.nextCursor = null; this.hasMore = false;
        this._pages = new Map(); this.records = []; this.complete = false; this._invalid = false;
        this.loading = this.configured && this.viewActive; this.errorMessage = ''; this.errorDetails = '';
        this._pageBudget = 1000;
        this.emitSummary(); this.armTimer();
    }
    @wire(graphql, { query: '$activeQuery', variables: '$queryVariables', operationName: '$activeOperation' })
    wiredMeetings({ data, errors, refresh }) {
        if (!this.activeQuery) return;
        if (typeof refresh === 'function') {
            this._refresh = refresh;
        }
        if (errors?.length) {
            this.lastCheckedAt = new Date().toISOString();
            this.setFailure(errors);
            this.loading = false; this.complete = false;
            // Fail closed: errors cannot establish the eligibility of partial data.
            this.records = []; this._pages.clear(); this.hasMore = false;
            this.emitSummary(); return;
        }
        if (!data) { this.loading = true; return; }
        const connection = data.uiapi?.query?.Event;
        if (!connection?.pageInfo || !Array.isArray(connection.edges)) {
            this.setFailure(new Error('Expected Event edges and pageInfo were not returned.'));
            this.loading = false; this.complete = false; this.emitSummary(); return;
        }
        const now = Date.now();
        const normalized = connection.edges.map(({ node }) => normalize(node, this.scopeConfig, now));
        // The adapter does not expose response variables. Out-of-range data is rejected;
        // empty/overlapping stale emissions still require target-adapter race validation.
        if (normalized.some((m) => m && !intersects(m, this.dateStart, this.dateEnd, this.displayZone))) return;
        this._invalid = this._invalid || connection.edges.some(({ node }, i) => !normalized[i] && !(Date.parse(field(node.EndDateTime)) <= now));
        const pageKey = `${this._lane}:${connection.pageInfo.startCursor || '__empty__'}`;
        const known = this._pages.get(pageKey);
        const isCurrentPage = !known || known.after === this.after;
        this._pages.set(pageKey, { after: known ? known.after : this.after, records: normalized.filter(Boolean) });
        const changedIds = new Set(connection.edges.map(({ node }) => node.Id));
        for (const [key, page] of this._pages) {
            if (key !== pageKey) page.records = page.records.filter((m) => !changedIds.has(m.id));
        }
        const unique = new Map();
        for (const page of this._pages.values()) for (const m of page.records) if (m.end > now) unique.set(m.id, m);
        const previousRecords = this.records;
        this.records = [...unique.values()];
        if (isCurrentPage) {
            this.nextCursor = connection.pageInfo.endCursor;
            this._connectionHasMore = connection.pageInfo.hasNextPage;
            this.hasMore = this._connectionHasMore || this._lane < 2;
            this.complete = !this.hasMore && !this._invalid;
        }
        this.loading = false; this.errorMessage = this._invalid ? 'Some meetings could not be verified. Results are incomplete.' : '';
        this.errorDetails = this._invalid ? 'One or more returned events had missing or inconsistent required fields, eligibility, or all-day dates. These events were excluded; the meeting count is incomplete.' : '';
        this.lastCheckedAt = new Date(now).toISOString();
        this.prune(previousRecords);
        if (isCurrentPage && this.hasMore && this._pages.size * 100 < this._pageBudget) {
            const scopeKey = this._scopeKey;
            Promise.resolve().then(() => { if (this._connected && !this.loading && this._scopeKey === scopeKey) this.loadMore(); });
        }
    }
    loadMore() {
        if (this.loading || !this.hasMore) return;
        if (this._connectionHasMore) {
            if (!this.nextCursor || this.nextCursor === this.after) {
                this.setFailure(new Error('Salesforce returned a non-advancing meeting cursor.'));
                return;
            }
            this.after = this.nextCursor;
        } else if (this._lane < 2) {
            this._lane += 1; this.after = null; this.nextCursor = null;
        } else return;
        this._pageBudget = Math.max(this._pageBudget, (this._pages.size + 1) * 100);
        this.loading = true;
    }
    @api async refreshMeetings() {
        if (this._refreshing) return this._refreshing;
        this._refreshing = this.performRefresh();
        try { await this._refreshing; }
        finally { this._refreshing = undefined; }
        return undefined;
    }
    async performRefresh() {
        if (!this.viewActive) { this.template.querySelector('c-homepage-calendar-meetings')?.refreshMeetings(); return; }
        this.prune();
        // Refresh the currently wired collection through the v2 contract, then restart membership.
        const refresh = this._refresh;
        const scopeKey = this._scopeKey;
        try { if (refresh) await refresh(); }
        catch (error) { this.setFailure(error, 'Refreshing meetings'); return; }
        if (this._connected && this._scopeKey === scopeKey) this.loadRange();
    }
    prune(previousRecords = this.records) {
        const now = Date.now();
        const removed = previousRecords.filter((m) => m.end <= now);
        const activeId = this.template.activeElement?.dataset?.eventId;
        this.records = this.records.filter((m) => m.end > now);
        this._nextId = this.records.filter((m) => !m.isAllDay && m.start > now).sort((a,b) => a.start-b.start || a.id.localeCompare(b.id))[0]?.id;
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
        return `${formatter(LOCALE, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${this.selectedKey}T12:00:00Z`))} · ${this.displayZone}`;
    }
    get setupMessage() { return this.configured ? '' : 'Meeting setup pending: the two Opportunity record types must be resolved.'; }
    get statusText() {
        if (this.errorMessage || this.loading || !this.configured) return '';
        const count = this.records.filter((m) => m.end > Date.now()).length;
        return this.complete ? `${count} ${count === 1 ? 'meeting' : 'meetings'}` : `${count} loaded`;
    }
    get showFooter() { return !this.errorMessage && this.configured && (this.records.length > 0 || this.complete); }
    get viewAllLabel() { return this.complete ? `View all ${this.records.length} meetings` : 'View all meetings'; }
    get filteredRecords() {
        return this.records.filter((m) => m.end > Date.now())
            .sort((a, b) => Number(b.isAllDay) - Number(a.isAllDay) ||
                (this.sortDescending ? b.start - a.start : a.start - b.start) || a.id.localeCompare(b.id));
    }
    viewModel(m) {
        const full = formatter(LOCALE, { timeZone: this.displayZone, dateStyle: 'medium', timeStyle: 'long' });
        const impactUrl = safeExternalUrl(this.resolveImpactAssessmentUrl({ eventId: m.id, opportunityId: m.opportunityId }), this.integrationConfig?.approvedImpactHosts);
        return { ...m, timeLabel: m.isAllDay ? 'All day' : `${formatTime(m.start, this.displayZone, LOCALE)} – ${formatTime(m.end, this.displayZone, LOCALE)}`,
            fullTime: m.isAllDay ? `${m.startDate} through ${addDays(m.endDate, -1)} · All day` : `${full.format(m.start)} – ${full.format(m.end)}`,
            timing: m.isAllDay ? '' : m.start <= Date.now() ? 'In progress' : this._nextId === m.id ? 'Next' : 'Upcoming',
            timingClass: m.start <= Date.now() && !m.isAllDay ? 'timing ongoing' : this._nextId === m.id ? 'timing next' : 'timing',
            eventClass: m.rescheduling ? 'grid-event rescheduling-event' : 'grid-event',
            startTime: m.isAllDay ? 'All day' : formatTime(m.start,this.displayZone,LOCALE),
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

    _todayKey;
    selectedKey;
    initializeView() { this._todayKey = dateKey(Date.now(), this.displayZone); this.selectedKey = this._todayKey; }
    calculateRange() { return [this.selectedKey, addDays(this.selectedKey, 1)]; }
    onDayRollover() { this.selectedKey = this._todayKey; this.loadRange(); }
    get viewActive() { return true; }
    get visibleMeetings() { return selectCards(this.filteredRecords, this.maxVisibleMeetings, true, Date.now()).map((m) => this.viewModel(m)); }
    get isEmpty() { return this.complete && !this.visibleMeetings.length; }
    get emptyText() { return 'No upcoming or ongoing Opportunity meetings today'; }
}
