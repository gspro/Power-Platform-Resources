//Lock a field
function LockUnlock(executionContext) {

    //Initiated Form Context.
    var formContext = executionContext.getFormContext();

    //Getting Value From Field Account Name.
    var AccountName = formContext.getAttribute("accountname").getValue();

    //Condition If Account Name Is Null.
    if (AccountName === null || AccountName === undefined) {

        //Using SetVisible propertly for locking field Account Address.
        formContext.getControl("accountaddress").setDisabled(true);
    }
  
  //set visible
  formContext.getControl("rboc_currentage").setVisible(age <= 17);
    
  //address a tab, hide a section
  formContext.ui.tabs.get("SUMMARY_TAB").sections.get("section_opportunitychild").setVisible(false);
    
    
   //set attribute
    function pageOnLoad(executionContext) {
    try {
        debugger;
        var formContext = executionContext.getFormContext();
        formContext.getAttribute("_companyname").addOnChange(() => {
            var lower = formContext.getAttribute("_companyname").getValue();
            console.log(`before: ${lower}`);
            if (lower) {
                formContext.getAttribute("_companyname").setValue(lower.toUpperCase());
            }
            
        });
    }

    catch (error) {
        logError("pageOnLoad", error);
    }
}
   function getRecordId(ctx) {
        let selectedRecord = executionContext.getFormContext().data.entity;
        let Id = selectedRecord.getId().replace(/[{}]/g, ""); 
   }
    

