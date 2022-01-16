import Tagin from './tagin.module.min.js'

const tagin = new Tagin(document.querySelector('.supportedVersions-tagin div.form-widget input'), {
    separator: ',',
    duplicate: false,
    enter: false, // default: false
    placeholder: 'Type supported versions separated by commas'
});

var inputElement = document.querySelector('.supportedVersions-tagin div.form-widget input');
inputElement.style.display = "none";