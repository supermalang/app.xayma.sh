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
    static targets = ['input', 'preview'];
    connect() {
        //this.previewTarget.textContent = 'Hello Stimulus! Edit me in assets/controllers/hello_controller.js';
        this.previewTarget.innerHTML = 'Hello Stimulus! Edit me in assets/controllers/hello_controller.js';
    }
}
