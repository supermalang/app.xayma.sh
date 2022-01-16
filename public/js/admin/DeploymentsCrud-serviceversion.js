window.onload = function() {
    
    serviceField = $(".ServiceField").parent();
    serviceFieldClasses = $(".ServiceField").parent().attr('class');
    serviceOptions = $(".ServiceField select");
    
    selectedServiceId = serviceOptions.find(":selected").val();
    
    rowBreak = '<div class="flex-fill"></div>';
    ServiceVersionWidget = '<div class="'+serviceFieldClasses+'">\
                                <div class="field-association ServiceVersionField form-group">\
                                    <label class="form-control-label required" for="" id="">Version</label>\
                                    <div class="form-widget">\
                                        <select id="" name=""  class="form-select" tabindex="-1">\
                                        </select>\
                                    </div>\
                                </div>\
                            </div>';
                                
    serviceField.after(rowBreak+ServiceVersionWidget);
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