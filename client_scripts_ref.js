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

