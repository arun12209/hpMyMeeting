import { LightningElement, api } from 'lwc';
export default class LightningModal extends LightningElement {
    static open = jest.fn().mockResolvedValue(undefined);
    @api close(result) { this.dispatchEvent(new CustomEvent('modalclose', { detail: result })); }
}
