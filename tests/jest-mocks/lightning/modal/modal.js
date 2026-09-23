import { LightningElement, api } from 'lwc';
let rejectSummary = false;
export function rejectModalSummaryEvents(value) { rejectSummary = value; }
export default class LightningModal extends LightningElement {
    static open = jest.fn().mockResolvedValue(undefined);
    dispatchEvent(event) {
        if (rejectSummary && event.type === 'summarychange') throw new TypeError('dispatchEvent: parameter 1 is not of type Event');
        return super.dispatchEvent(event);
    }
    @api close(result) { this.dispatchEvent(new CustomEvent('modalclose', { detail: result })); }
}
