import { Controller } from '@hotwired/stimulus';
import snarkdown from 'snarkdown';

/*
 * This is an example Stimulus controller!
 *
 * Any element with a data-controller="hello" attribute will cause
 * this controller to be executed. The name "hello" comes from the filename:
 * hello_controller.js -> "hello"
 *
 * Delete this file or adapt it for your use!
 */
export default class extends Controller {
    static targets = ["button"];
    static values = { checked: Boolean };

    connect() {
        this.buttonTarget.setAttribute("disabled", "disabled");
    }

    updateButtonState(event) {
        if (event.target.checked) {
            this.buttonTarget.removeAttribute("disabled");
        } else {
            this.buttonTarget.setAttribute("disabled", "disabled");
        }
    }
}
