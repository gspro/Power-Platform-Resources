//from here: https://www.itaintboring.com/powerapps/how-to-add-a-ribbon-button-that-calls-a-power-automate-flow/?utm_campaign=PP-Weekly&utm_medium=email&utm_source=Revue%20newsletter

function callHTTPFlow(primaryControl) {
	"use strict";
	debugger;
	Xrm.Utility.showProgressIndicator("Generating document...");
	getEnvironmentVariable("ita_documentgenerationflow", 
	    function(url){
			callHTTPFlowInternal(url, primaryControl);
	    },
		function(error){
			handleError(error);
		}
	);
}

function handleError(error)
{
	Xrm.Utility.closeProgressIndicator();
	showMessageDialog("Error", error);
}

function callHTTPFlowInternal(url, primaryControl) {
	"use strict";
	var fileName = "Summary.docx";
	var documentId = primaryControl.data.entity.getId();
	primaryControl.data.save().then(function() {
		
		documentId = documentId.replace("{", "").replace("}", "");
		url = url + "&id=" + documentId;

		fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			},
			body: null //JSON.stringify(data) 
		}).then(response => {
			Xrm.Utility.closeProgressIndicator();
			if (response.status == 200) {
				response.blob().then(blob => {
					downloadFile(blob, fileName);
					closePopups(primaryControl);
				});
			} else {
				response.text().then(body => {
					handleError(body);
				});
			}
		}).then(data => console.log(data))
		.catch(function(error) {
			handleError(error);
		});
	},
	function(error) {
		Xrm.Utility.closeProgressIndicator();
		showMessageDialog("Error", error.message);
	});
}

function closePopups(formContext) {
	formContext.data.refresh(false); 
	Xrm.Utility.closeProgressIndicator();
}
	
function downloadFile(blob, fileName) {
	if (navigator.msSaveBlob) { // IE 10+
		navigator.msSaveBlob(blob, fileName);
	} else {
		var link = document.createElement("a");
		if (link.download !== undefined) {
			var url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", fileName);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}
}

function showMessageDialog(messageTitle, message) {
	var alertStrings = {
		confirmButtonLabel: "OK",
		text: message,
		title: messageTitle
	};
	var alertOptions = {
		height: 120,
		width: 260
	};
	Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
}


function getEnvironmentVariable(varName, onSuccess, onError){
  "use strict";
   Xrm.WebApi.retrieveMultipleRecords("environmentvariabledefinition", "?$select=defaultvalue,displayname&$expand=environmentvariabledefinition_environmentvariablevalue($select=value)&$filter=schemaname eq '"+varName+"'").then(
		function success(result) {
			var varValue = null;
			for (var i = 0; i < result.entities.length; i++) {
			    
				if(typeof(result.entities[i]["environmentvariabledefinition_environmentvariablevalue"]) != "undefined"
				   && result.entities[i]["environmentvariabledefinition_environmentvariablevalue"].length > 0)
				{
				   varValue = result.entities[i]["environmentvariabledefinition_environmentvariablevalue"][0].value;
				}
				else if(typeof(result.entities[i].defaultvalue) != "undefined")
				{
				   varValue = result.entities[i].defaultvalue;
				}
				else{
				   varValue = null;
				}
			}    
			onSuccess(varValue);	
		},
		function (error) {
			console.log(error.message);
			onError(error);			
		}
	);
}
