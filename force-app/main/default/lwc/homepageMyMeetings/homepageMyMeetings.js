import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { gql, graphql } from 'lightning/graphql';
import USER_ID from '@salesforce/user/Id';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import HomepageViewAllMeetings from 'c/homepageViewAllMeetings';

const OPPORTUNITY_METADATA = gql`
    query HomepageMeetingRecordTypes {
        uiapi { objectInfos(apiNames: ["Opportunity"]) {
            ApiName recordTypeInfos { name recordTypeId }
        } }
    }
`;

export default class HomepageMyMeetings extends NavigationMixin(LightningElement) {
    @api maxVisibleMeetings = 3;
    @api manageMeetingsUrl;
    @api displayZone = TIME_ZONE;
    @api integrationConfig;
    // Optional reviewed mapping for translated labels. Must include the exact two labels.
    @api recordTypeMapping;
    activeTab = 'today';
    isExpanded = false;
    selectedDate;
    count = null;
    scopeConfig;
    setupError = '';
    modalError = '';
    @wire(graphql, { query: OPPORTUNITY_METADATA })
    metadata({ data, errors }) {
        if (errors?.length) { this.scopeConfig = undefined; this.setupError = 'Opportunity record type metadata unavailable. Contact your administrator.'; return; }
        if (!data) return;
        const types = data.uiapi?.objectInfos?.find((o) => o.ApiName === 'Opportunity')?.recordTypeInfos || [];
        const labels = ['Renewal Opportunity', 'Growth Opportunity'];
        const ids = labels.map((label) => {
            const configured = this.recordTypeMapping?.[label];
            const matches = types.filter((r) => configured ? r.recordTypeId === configured : r.name === label);
            return matches.length === 1 ? matches[0].recordTypeId : null;
        });
        if (ids.some((id) => !id) || new Set(ids).size !== 2) {
            this.scopeConfig = undefined;
            this.setupError = 'Meeting setup pending: resolve Renewal Opportunity and Growth Opportunity record types.';
            return;
        }
        this.scopeConfig = Object.freeze({ sellerId: USER_ID, recordTypeIds: Object.freeze(ids) });
        this.setupError = '';
    }
    get ready() { return Boolean(this.scopeConfig) && !this.isExpanded; }
    get showToday() { return this.ready && this.activeTab === 'today'; }
    get showTomorrow() { return this.ready && this.activeTab === 'tomorrow'; }
    get showCalendar() { return this.ready && this.activeTab === 'calendar'; }
    get todayLabel() { return this.activeTab === 'today' && this.count !== null ? `Today (${this.count})` : 'Today'; }
    get tomorrowLabel() { return this.activeTab === 'tomorrow' && this.count !== null ? `Tomorrow (${this.count})` : 'Tomorrow'; }
    get dashboardUrl() {
        try {
            const raw = this.manageMeetingsUrl;
            if (!raw || /[\\\s]/.test(raw)) return null;
            const url = new URL(raw, window.location.origin);
            return url.origin === window.location.origin && !url.username && !url.password &&
                url.pathname.startsWith('/lightning/') ? url.href : null;
        } catch { return null; }
    }
    handleTab(event) { const value = event.target.value; if (!['today','tomorrow','calendar'].includes(value) || value === this.activeTab) return; this.activeTab = value; this.count = null; }
    handleSummary(event) { this.count = event.detail.completeness === 'complete' ? event.detail.exactCountOrNull : null; }
    handleDate(event) { this.selectedDate = event.detail.date; }
    refreshMeetings() { this.template.querySelector('c-homepage-todays-meeting, c-homepage-tomorrow-meetings, c-homepage-calendar-meetings')?.refreshMeetings(); }
    navigate(event) {
        const detail = event.detail;
        if (!['Event','Opportunity'].includes(detail?.objectApiName) || !/^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$/.test(detail.recordId)) return;
        this[NavigationMixin.Navigate]({ type: 'standard__recordPage', attributes: { ...detail, actionName: 'view' } });
    }
    async expand(event) {
        if (this.isExpanded) return;
        const source = this.activeTab;
        this.selectedDate = event.detail.date;
        this.isExpanded = true; this.count = null; this.modalError = '';
        try {
            // Let LWC unmount the compact wire before opening the independently wired modal.
            await Promise.resolve();
            const result = await HomepageViewAllMeetings.open({
                size: 'large', description: 'Upcoming and ongoing Opportunity meetings',
                initialDate: this.selectedDate, initialMode: event.detail.mode,
                scopeConfig: this.scopeConfig, displayZone: this.displayZone,
                integrationConfig: { ...this.integrationConfig, manageMeetingsUrl: this.dashboardUrl }
            });
            if (result?.navigation) this.navigate({ detail: result.navigation });
            if (result?.date) this.selectedDate = result.date;
        } catch { this.modalError = 'Could not open meetings. Please try again.'; }
        finally {
            this.activeTab = source; this.isExpanded = false; this.count = null;
            await Promise.resolve();
            this.template.querySelector('[data-heading]')?.focus();
        }
    }
}
