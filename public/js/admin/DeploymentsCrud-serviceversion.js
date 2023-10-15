
// We use this js file to retrieve the service's versions
window.onload = function() {

    // Get the URLSearchParams object for the current URL
    const urlSearchParams = new URLSearchParams(window.location.search);
    
    serviceField = $(".ServiceField");
    serviceFieldClasses = $(".ServiceField").prevUntil('div[class^="col-md-"]').prev().attr('class');
    serviceOptions = $(".ServiceField select");

    selectedServiceId = urlSearchParams.get('id');

    ServiceVersionWidget = '<div class="'+serviceFieldClasses+'">\
                                <div class="field-association ServiceVersionField form-group">\
                                    <label class="form-control-label required" for="" id="">Version</label>\
                                    <div class="form-widget">\
                                        <select id="" name=""  class="form-select" tabindex="-1">\
                                        </select>\
                                    </div>\
                                </div>\
                            </div>';
                                
    serviceField.after(ServiceVersionWidget);
    ServiceVersionField = $(".ServiceVersionField select");


    // WHen the page first loads
    if (selectedServiceId) {
        ServiceVersionField.empty();
        
        $.get("/api/services/"+selectedServiceId).done(function( data ) {
            selectedServiceVersions = data.version.split(',').sort();
            
            selectedServiceVersions.forEach(item => {
                ServiceVersionField.append(new Option(item, item));
            });
            
            $('input#Deployments_ServiceVersion').val(selectedServiceVersions[0]);
        });

    }

    getServiceVersions = function(){
        selectedServiceId = this.value;
        ServiceVersionField.empty();

        $.get("/api/services/"+selectedServiceId).done(function( data ) {
            selectedServiceVersions = data.version.split(',').sort();
            selectedServiceVersions.forEach(item => {
                ServiceVersionField.append(new Option(item, item));
            });

            $('input#Deployments_ServiceVersion').val(selectedServiceVersions[0]);
        });
    };

    serviceOptions.on('change', getServiceVersions);

    ServiceVersionField.on('change', function() {
        selectedVersion = this.value;
        $('input#Deployments_ServiceVersion').val(selectedVersion);
    });
};