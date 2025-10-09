/*  
    Josh Pelkola 

    Base form functionality for interacting with 
    form specific JS files used for customizing client 
    side code.

    If API access to call entities is required, use 
    crm_core.js

    The context parameter (ctx) is to interact
    with the CE form components. The variable is attached 
    to the Xrm object that exists on the D365 CE client side 
    
    When initialized, the form context is cached, and checked
    in order to interact with entity attributes. If left null
    or undefined, the system checks for a cached object, otherwise
    the ctx object can be inserted from the event handler directly
    in the form setup.
*/
var CRMUI = CRMUI || {

    // should be called to set the form context in form ui libs during form onload
    onLoad(ctx) {
        Xrm.crmui = {
            form: ctx.getFormContext(),
            ctx: ctx
        };

        if (!CRMUI.isFormCtxReady(ctx))
            throw new Error("The CRM form context could not be initialized.");
    },

    // should be called to set the form context in form ui libs during form onload
    onLoadPrimaryControl(ctx) {
        Xrm.crmui = {
            form: ctx,
            ctx: ctx
        };

        if (!CRMUI.isFormCtxReady(ctx))
            throw new Error("The CRM form context could not be initialized.");
    },

    // id of the entity record
    getId(ctx) {
        if (CRMUI.isFormCtxReady(ctx)) {
            var id = Xrm.crmui.form.data.entity.getId();
            if (id != null && id !== "")
                return id.replace("{", "").replace("}", "");
        }
        return null;
    },

    // get the assigned business unit information for the record
    // specific to Pritchard. remove the reference to types in the BU lookup to reuse.
    async getRecordSecurityProfile(ownertEntityRef, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                var entity = Xrm.crmui.form.data.entity.getEntityName();
                var id = Xrm.crmui.form.data.entity.getId();
                if (id != null && id !== "") {
                    let entityId = id.replace("{", "").replace("}", "");
                    // console.log("entity and id", entity, id);
    
                    let response = {}
                    let currentBusinessUnitId = null;
                    // generate owner information from the entity record.
                    if(!ownertEntityRef || ownertEntityRef == null || !ownertEntityRef.hasOwnProperty('entityType') || !ownertEntityRef.hasOwnProperty('id')) {
                        var record = await CRMCore.getEntityById(entity, [
                            "_ownerid_value",
                            "_owningbusinessunit_value",
                            "_owningteam_value",
                            "_owninguser_value"
                        ], entityId);
        
                        currentBusinessUnitId = record._owningbusinessunit_value;

                        response = {
                            userId: record._owninguser_value,
                            userName: "",
                            teamId: record._owningteam_value,
                            teamName: "",
                            businessUnits: []
                        };
                    } else { // generate owner information from he owner entity reference if provided and valid.
                        response = {
                            userId: ownertEntityRef.entityType == "systemuser" ? ownertEntityRef.id : null,
                            userName: "",
                            teamId: ownertEntityRef.entityType == "team" ? ownertEntityRef.id : null,
                            teamName: "",
                            businessUnits: []
                        };
                    }
    
                    // get the user information
                    if(response.userId != null) {
                        let userQuery = await CRMCore.getEntityById('systemuser', ["fullname", "_businessunitid_value"], response.userId);
                        response.userName = userQuery.fullname;
                        if(currentBusinessUnitId == null) currentBusinessUnitId = userQuery._businessunitid_value;
                    } 
    
                    // get the team information
                    if(response.teamId != null) {
                        let teamQuery = await CRMCore.getEntityById('team', ["name", "_businessunitid_value"], response.teamId);
                        response.teamName = teamQuery.name;
                        if(currentBusinessUnitId == null) currentBusinessUnitId = teamQuery._businessunitid_value;
                    }
    
                    // get the business unit and parents
                    let counter = 0;
                    while(currentBusinessUnitId != null) {
                        let buQuery = await CRMCore.getEntityById('businessunit', ["name", "pri_businessunittype", "_parentbusinessunitid_value", "pri_fscm_region_code"], currentBusinessUnitId);
                        // console.log("query business unit: ", buQuery);
                        let buName = buQuery.name;
                        let buType = buQuery.pri_businessunittype;
                        let buRegion = buQuery.pri_fscm_region_code;
                        let buTypeName = buType != null ? buQuery["pri_businessunittype@OData.Community.Display.V1.FormattedValue"] : null;
                        let buParent = buQuery._parentbusinessunitid_value;
                        response.businessUnits.push({
                            index: counter,
                            id: currentBusinessUnitId,
                            name: buName,
                            region: buRegion,
                            type: buType,
                            typeName: buTypeName,
                            parent: buParent
                        });
                        currentBusinessUnitId = buParent;
                        counter++;
                    }
    
                    return response;
                } 
            }
        } catch (e) {
            console.log(`CRMUI.getRecordSecurityProfile: ${e}`);
        }
        return null;
    },

    //gets the current user
    getUser() {
        return {
            id: Xrm.Utility.getGlobalContext().userSettings.userId.replace("{", "").replace("}", ""),
            name: Xrm.Utility.getGlobalContext().userSettings.userName,
            entityType: "systemuser"
        }
    },

    // get the current user's sec roles
    getUserRoles() {
        return Xrm.Utility.getGlobalContext().userSettings.roles.get();
    },

    // checks if the user is a sys admin
    curUserIsAdmin() {
        let roles = CRMUI.getUserRoles();
        for (var i = 0; i < roles.length; i++) {
            if (roles[i].name === "System Administrator")
                return true;
        }
        return false;
    },

    // opens a lookup control's record into a modal window to the side
    openLookupSideModal(lookupSchema, width) {
        try {
            if (CRMUI.isFormCtxReady()) {
                let ctl = Xrm.crmui.form.getControl(lookupSchema);
                if (ctl != null) {
                    if (ctl.addOnLookupTagClick != null) {
                        ctl.addOnLookupTagClick(function (data) {
                            var ent = CRMUI.getLookup(lookupSchema);
                            if (ent !== null) {
                                CRMUI.modal.openEntitySide(ent.entityType, ent.id, width);
                            }

                            var args = data._eventArgs;
                            args._preventDefault = true;
                        });
                    } else {
                        throw new Error("The function for lookup controls does not have the addOnLookupTagClick function loading. Please contact support.");
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.onClickOpenModal: ${e}`);
        }
    },

    // returns true if the current tab is open by name
    tabIsActive(tabName, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                var tab = Xrm.crmui.form.ui.tabs.get(tabName);
                if (tab == null) throw new Error(`The tab name ${tabName} is not valid`);
                return tab.getDisplayState() === "expanded";
            }
        } catch (e) {
            console.log(`CRMUI.tabIsActive: ${e}`);
        }
    },

    // returns an entity ref obj for a lookup control or null
    // { id: <guid record id>, name: <primary fld str val>, entityType: <entity schema name> }
    getLookup(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr != null) {
                    var atrVal = atr.getValue();
                    if (atrVal === null) return null;
                    if (atrVal.length > 0) {
                        return {
                            id: atrVal[0].id.replace("{", "").replace("}", ""),
                            name: atrVal[0].name,
                            entityType: atrVal[0].entityType
                        };
                    }
                }
                return null;
            }
        } catch (e) {
            console.log(`CRMUI.getLookup: ${e}`);
        }
    },

    // returns an entity ref obj for a lookup from odata api object
    // returns null if guid is not present
    convertODataLookup(odataLookupField, odataEntityData) {
        try {
            if (odataEntityData == null) return null;
            if (odataLookupField.indexOf("_value") < 0) {
                odataLookupField = `_${odataLookupField}_value`;
            }

            let id = odataEntityData[odataLookupField];
            if (id === undefined) throw new Error(`The specified field ${odataLookupField} is invalid`);
            if (id === null) return null;

            let entityType = odataEntityData[`${odataLookupField}@Microsoft.Dynamics.CRM.lookuplogicalname`];
            let name = odataEntityData[`${odataLookupField}@OData.Community.Display.V1.FormattedValue`];

            return {
                id: id,
                name: name,
                entityType: entityType
            };
        } catch (e) {
            console.log(`CRMUI.convertODataLookup: ${e}`);
        }
    },

    // returns string or ""
    getString(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr !== null) {
                    let val = atr.getValue();
                    if (val === null) return "";
                    return val;
                } else {
                    return "";
                }
            }
        } catch (e) {
            console.log(`CRMUI.getString: ${e}`);
        }
    },

    // returns decimal or 0
    getDecimal(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr !== null) {
                    let val = atr.getValue();
                    if (val === null) return 0;
                    return val;
                } else {
                    return 0;
                }
            }
        } catch (e) {
            console.log(`CRMUI.getDecimal: ${e}`);
        }
    },

    // returns money or 0
    getMoney(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr !== null) {
                    let val = atr.getValue();
                    if (val === null) return 0;
                    return val;
                } else {
                    return 0;
                }
            }
        } catch (e) {
            console.log(`CRMUI.getMoney: ${e}`);
        }
    },

    // returns int or 0
    getInt(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr !== null) {
                    let val = atr.getValue();
                    if (val === null) return 0;
                    return val;
                } else {
                    return 0;
                }
            }
        } catch (e) {
            console.log(`CRMUI.getInt: ${e}`);
        }
    },

    // returns double / float or 0
    getDouble(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr !== null) {
                    let val = atr.getValue();
                    if (val === null) return 0;
                    return val;
                } else {
                    return 0;
                }
            }
        } catch (e) {
            console.log(`CRMUI.getDouble: ${e}`);
        }
    },

    // returns bool or false
    getBool(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr !== null) {
                    let val = atr.getValue();
                    if (val === null) return false;
                    return val;
                } else {
                    return false;
                }
            }
        } catch (e) {
            console.log(`CRMUI.getBool: ${e}`);
        }
    },

    // returns date or null
    getDate(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr !== null) {
                    let val = atr.getValue();
                    if (val === null) return null;
                    return val;
                } else {
                    return null;
                }
            }
        } catch (e) {
            console.log(`CRMUI.getDate: ${e}`);
        }
    },

    // returns option set obj or null
    // { d: <option set text>, v: <option set int value> } 
    getOptionSet(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr !== null) {
                    return {
                        v: atr.getValue(),
                        d: atr.getText()
                    };
                } else {
                    return null;
                }
            }
        } catch (e) {
            console.log(`CRMUI.getOptionSet: ${e}`);
        }
    },

    // sets a lookup field. If any input is null, null is set
    // optional ctx to override form context
    setLookup(attribute, entity, id, primaryValue, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);
                if (id != null && primaryValue != null && entity != null) {
                    let lookupVal = [{
                        entityType: entity,
                        name: primaryValue,
                        id: id.replace("{", "").replace("}", "")
                    }];
                    atr.setValue(lookupVal);
                } else {
                    atr.setValue(null);
                }
            }
        } catch (e) {
            console.log(`CRMUI.setLookup: ${e}`);
        }
    },

    // sets a lookup field from odata object. If any input is null, null is set
    // optional ctx to override form context
    setLookupFromOdata(attribute, odataRecord, odataField, ctx) {
        try {
            var id = odataRecord[odataField];
            var logicalName = odataRecord[`${odataField}@Microsoft.Dynamics.CRM.lookuplogicalname`];
            var primaryVal = odataRecord[`${odataField}@OData.Community.Display.V1.FormattedValue`];
            CRMUI.setLookup(attribute, logicalName, id, primaryVal, ctx);
        } catch (e) {
            console.log(`CRMUI.setLookupFromOdata: ${e}`);
        }
    },

    // sets a string value or ""
    // optional ctx to override form context
    setString(attribute, value, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);
                if (value != null) {
                    atr.setValue(value);
                } else {
                    atr.setValue("");
                }
            }
        } catch (e) {
            console.log(`CRMUI.setString: ${e}`);
        }
    },

    // sets a decimal value or 0
    // optional ctx to override form context
    setDecimal(attribute, value, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);
                if (value != null) {
                    atr.setValue(value);
                } else {
                    atr.setValue(0);
                }
            }
        } catch (e) {
            console.log(`CRMUI.setDecimal: ${e}`);
        }
    },

    // sets a money value or 0
    // optional ctx to override form context
    setMoney(attribute, value, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);
                if (value != null) {
                    atr.setValue(value);
                } else {
                    atr.setValue(0);
                }
            }
        } catch (e) {
            console.log(`CRMUI.setMoney: ${e}`);
        }
    },

    // sets a double / float value or 0
    // optional ctx to override form context
    setDouble(attribute, value, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);
                if (value != null) {
                    atr.setValue(value);
                } else {
                    atr.setValue(0);
                }
            }
        } catch (e) {
            console.log(`CRMUI.setDouble: ${e}`);
        }
    },

    // sets an int value or 0
    // optional ctx to override form context
    setInt(attribute, value, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);
                if (value != null) {
                    atr.setValue(value);
                } else {
                    atr.setValue(0);
                }
            }
        } catch (e) {
            console.log(`CRMUI.setInt: ${e}`);
        }
    },

    // sets a bool value or false
    // optional ctx to override form context
    setBool(attribute, value, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);
                if (value != null) {
                    atr.setValue(value);
                } else {
                    atr.setValue(false);
                }
            }
        } catch (e) {
            console.log(`CRMUI.setBool: ${e}`);
        }
    },

    // sets a UTC date only value
    // value may be a string or date obj
    // optional ctx to override form context
    setDate(attribute, value, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                var dateVal = null;

                // is a date
                var isDate = typeof value.getMonth === "function";

                // is a string
                var isString = typeof value === "string";

                if (isDate) {
                    dateVal = value;
                    dateVal.setHours(12,0,0,0);
                }

                if (isString) {
                    dateVal = value;
                }

                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);
                if (value != null) {
                    atr.setValue(dateVal);
                }
            }
        } catch (e) {
            console.log(`CRMUI.setDate: ${e}`);
        }
    },

    // sets a date time value
    // optional ctx to override form context
    setDateTime(attribute, value, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                var dateVal = null;

                // is a date
                var isDate = typeof value.getMonth === "function";

                // is a string
                var isString = typeof value === "string";

                if (isDate) {
                    dateVal = value;
                }

                if (isString) {
                    dateVal = value;
                }

                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);
                if (value != null) {
                    atr.setValue(dateVal);
                }
            }
        } catch (e) {
            console.log(`CRMUI.setDate: ${e}`);
        }
    },

    // sets an option set value or null
    // optSetValue may be int or { d: <opt text>, v: <int value> } 
    // optional ctx to override form context
    setOptionSet(attribute, optSetValue, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr == null) throw new Error(`The field with name (${attribute}) is not valid`);

                if (optSetValue == null) {
                    atr.setValue(null);
                    return;
                }

                if (optSetValue.v != null) {
                    atr.setValue(optSetValue.v);
                } else {
                    atr.setValue(optSetValue);
                }
            }
        } catch (e) {
            console.log(`CRMUI.setOptionSet: ${e}`);
        }
    },

    // formats a date to odata format "mm-DD-yyyy"
    formatDate(date) {
        if (date == null) return "";
        var d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2)
            month = '0' + month;
        if (day.length < 2)
            day = '0' + day;

        return [year, month, day].join('-');
    },

    // add days to date
    // returns a date obj
    addDateDays(date, days) {
        try {
            var result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        } catch (e) {
            console.log(e);
        }
    },

    // sets all fields to required from string arr of attr names
    // optional ctx to override form context
    requireFields(attributeArr, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                let attrs = Xrm.crmui.form.data.entity.attributes.get();
                for (var a in attrs) {
                    let attrName = attrs[a].getName();
                    if (attributeArr.indexOf(attrName) >= 0) {
                        attrs[a].setRequiredLevel("required");
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.required: ${e}`);
        }
    },

    // sets all fields to not required from string arr of attr names
    // optional ctx to override form context
    notRequireFields(attributeArr, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                let attrs = Xrm.crmui.form.data.entity.attributes.get();
                for (var a in attrs) {
                    let attrName = attrs[a].getName();
                    if (attributeArr.indexOf(attrName) >= 0) {
                        attrs[a].setRequiredLevel("none");
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.notRequired: ${e}`);
        }
    },

    // enables all fields from string arr of attr names
    // optional ctx to override form context
    enableFields(attributeArr, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                let ctls = Xrm.crmui.form.ui.controls.get();
                for (var c in ctls) {
                    let ctlName = ctls[c].getName();
                    if (attributeArr.indexOf(ctlName) >= 0) {
                        ctls[c].setDisabled(false);
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.enableFields: ${e}`);
        }
    },

    // disables all fields from string arr of attr names
    // optional ctx to override form context
    disableFields(attributeArr, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                let ctls = Xrm.crmui.form.ui.controls.get();
                for (var c in ctls) {
                    let ctlName = ctls[c].getName();
                    if (attributeArr.indexOf(ctlName) >= 0) {
                        ctls[c].setDisabled(true);
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.disableFields: ${e}`);
        }
    },

    // disables all fields on a form
    // optional ctx to override form context
    disableAllFields(ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                let ctls = Xrm.crmui.form.ui.controls.get();
                for (var c in ctls) {
                    ctls[c].setDisabled(true);
                }
            }
        } catch (e) {
            console.log(`CRMUI.disableFields: ${e}`);
        }
    },

    // hides a section on a form
    // optional ctx to override form context
    hideSection(tabName, sectionName, hide, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                let tab = Xrm.crmui.form.ui.tabs.get(tabName);
                if (tab != null) {
                    let section = tab.sections.get(sectionName);
                    if (section != null) {
                        if (hide)
                            section.setVisible(false);
                        else
                            section.setVisible(true);
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.hideSections: ${e}`);
        }
    },

    // hides fields from a string arr of attr names
    // optional ctx to override form context
    hideFields(attributeArr, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                let ctls = Xrm.crmui.form.ui.controls.get();
                for (var c in ctls) {
                    let ctlName = ctls[c].getName();
                    if (attributeArr.indexOf(ctlName) >= 0) {
                        ctls[c].setVisible(false);
                        ctls[c].getAttribute().setSubmitMode("always");
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.enableFields: ${e}`);
        }
    },

    // shows fields from a string arr of attr names
    // optional ctx to override form context
    showFields(attributeArr, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {

                let ctls = Xrm.crmui.form.ui.controls.get();
                for (var c in ctls) {
                    let ctlName = ctls[c].getName();
                    if (attributeArr.indexOf(ctlName) >= 0) {
                        ctls[c].setVisible(true);
                        ctls[c].getAttribute().setSubmitMode("always");
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.enableFields: ${e}`);
        }
    },

    // changes the label title of a section
    // optional ctx to override form context
    changeSectionLabel(tabName, sectionName, label, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let tab = Xrm.crmui.form.ui.tabs.get(tabName);
                if (tab != null) {
                    let section = tab.sections.get(sectionName);
                    if (section != null) {
                        section.setLabel(label);
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.changeFieldLabel: ${e}`);
        }
    },

    // changes a field label on form
    // optional ctx to override form context
    changeFieldLabel(attribute, label, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                var ctl = Xrm.crmui.form.getControl(attribute);
                if (ctl != null) {
                    ctl.setLabel(label);
                }
            }
        } catch (e) {
            console.log(`CRMUI.changeFieldLabel: ${e}`);
        }
    }, 

    // clears a single field 
    // optional ctx to override form context
    clearField(attribute, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr != null)
                    atr.setValue(null);
            }
        } catch (e) {
            console.log(`CRMUI.clearField: ${e}`);
        }
    },

    // clears fields by string arr of attr names
    // optional ctx to override form context
    clearFields(attributeArr, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                for (a in attributeArr) {
                    let atr = Xrm.crmui.form.getAttribute(attributeArr[a]);
                    if (atr != null)
                        atr.setValue(null);
                }
            }
        } catch (e) {
            console.log(`CRMUI.clearFields: ${e}`);
        }
    },

    // adds an onchange event handler for a field on form 
    // optional ctx to override form context
    addOnChange(attribute, eventCallbackFn, ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let atr = Xrm.crmui.form.getAttribute(attribute);
                if (atr != null) {
                    if (atr.addOnChange != null) {
                        atr.addOnChange(eventCallbackFn);
                    } else {
                        throw new Error(`The function for attribute (${attribute}) does not have the addOnChange function loading. Please contact support.`);
                    }
                }
            }
        } catch (e) {
            console.log(`CRMUI.addOnChange: ${e}`);
        }
    },

    // returns true if any fields on a form have changes
    // optional ctx to override form context
    requiresSave(ctx) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                return Xrm.crmui.form.data.entity.getIsDirty();
            }
        } catch (e) {
            console.log(`CRMUI.requiresSave: ${e}`);
        }
    },

    // clears a forms save by setting fields to not submit data changes
    clearSave(ctx, closeForm) {
        try {
            if (CRMUI.isFormCtxReady(ctx)) {
                let formCtx = ctx.getFormContext();
                if (closeForm === undefined) closeForm = false;
                var attrs = formCtx.data.entity.attributes.get();
                for (var i in attrs) {
                    attrs[i].setSubmitMode("never");
                }

                if (closeForm) {
                    formCtx.ui.close();
                }
            }
        } catch (e) {
            console.log(`CRMUI.clearSave: ${e}`);
        }
    },

    // creates an internal D365 alert popup
    alert(message, title, height, width) {
        try {
            if (title == null) title = "D365 Notification";
            if (height == null) height = 240;
            if (width == null) width = 320;

            Xrm.Navigation.openAlertDialog({ title: title, text: message }, { height: height, width: width });
        } catch (e) {
            console.log(e);
        }
    },

    // simple sort by value type or attribute of object in array  
    // if sortAttribute is not given, the array is assumed to be single value types
    arrSort(array, sortAttribute) {
        if (array.length > 0) {
            if (sortAttribute != null) {
                array.sort(function (a, b) {
                    // Use toUpperCase() to ignore character casing
                    var recA = a[sortAttribute].toString().toUpperCase();
                    var recB = b[sortAttribute].toString().toUpperCase();

                    var comparison = 0;
                    if (recA > recB) {
                        comparison = 1;
                    } else if (recA < recB) {
                        comparison = -1;
                    }
                    return comparison;
                });
            } else {
                array.sort(function (a, b) {
                    var comparison = 0;
                    if (a > b) {
                        comparison = 1;
                    } else if (a < b) {
                        comparison = -1;
                    }
                    return comparison;
                });
            }
        }

        return array;
    },

    // web resource functions
    webres: {
        // force refresh a web resource on form 
        // optional ctx to override form context
        refresh(resourceName, ctx) {
            try {
                if (ctx == null && Xrm.crmui.ctx != null)
                    ctx = Xrm.crmui.ctx;

                if (CRMUI.isFormCtxReady(ctx)) {

                    debugger;

                    var control = Xrm.crmui.form.getControl(resourceName).getObject();
                    if (control !== null) {
                        let src = control.getSrc();
                        control.setSrc(null);
                        control.setSrc(src);
                    }
                }
            } catch (e) {
                console.log(`CRMUI.webres.refresh: ${e}`);
            }
        },

        // returns form data passed to web resource or null
        // location obj passed in from the web resource
        // will try to parse the data as object or return the string
        // form param data eg: {"foo":"bar"} will pass back an obj, otherwise a string is passed back, or null
        getFormData(location) {
            if (location == null) return null;
            if (location.search == "") return null;
            let valsArr = location.search.substr(1).split("&");

            // break down sub array pairs in the values array
            for (let i = 0; i < valsArr.length; i++) {
                valsArr[i] = valsArr[i].replace(/\+/g, " ").split("=");
            }

            // loop through values sub arr for param "data" and return value
            for (let i = 0; i < valsArr.length; i++) {
                if (valsArr[i][0].toLowerCase() == "data") {
                    let objStr = decodeURIComponent(valsArr[i][1]);
                    try {
                        return JSON.parse(objStr);
                    } catch {
                        return objStr;
                    }  
                }
            }

            return null;
        }
    },

    // sub grid, editable grid functions
    grid: {
        // force refresh of subgrid on form
        // optional ctx to override form context
        refresh(resourceName, ctx) {
            try {
                if (CRMUI.isFormCtxReady(ctx)) {
                    Xrm.crmui.form.getControl(resourceName).refresh();
                }
            } catch (e) {
                console.log(`CRMUI.grid.refresh: ${e}`);
            }
        },

        openModal(selectedRowCtx) {
            try {
                var selected = selectedRowCtx.getFormContext().data.entity;
                var id = selected.getId();
                var name = selected.getEntityName();

                if (id != null) {
                    CRMUI.modal.openEntity(name, id, 75);
                }
                } catch (e) {
                    console.log(`CRMUI.grid.openModal: ${e}`);
                }
        },

        disableFields(selectedRowCtx, fieldArr) {
            try {
                if (fieldArr == null) fieldArr = new Array();

                var entity = selectedRowCtx.getFormContext().data.entity;
                entity.attributes.forEach((attr, i)=>{
                    var ctl = attr.controls.get(0);

                    // disable if the list array is empty (disable all fields)
                    // or if the name of the attribute is in the list to disable
                    if(fieldArr.length == 0 || fieldArr.indexOf(ctl.name) > -1) {
                        ctl.setDisabled(true);
                    } 
                });

            } catch (e) {
                console.log(`CRMUI.grid.disableFields: ${e}`);
            }
        }
    },

    // open modal for entity or web resources
    modal: {
        open(parameters, options, callbackFn) {
            Xrm.Navigation.navigateTo(parameters, options)
                .then(function (data) {
                    if (callbackFn != null)
                        callbackFn(data);
                },
                    function (error) {
                        CRMUI.error.handle(error);
                    });
        },
        openEntity(entityName, entityId, widthPct, formId, data) {
            if (entityName === undefined) return;
            if (entityName === null) return;
            if (entityName.trim() === "") return;
            if (entityId === undefined) entityId = null;
            if (entityId === "") entityId = null;
            if (formId === undefined) formId = null;
            if (formId === "") formId = null;
            if (data === undefined) data = null;

            if (widthPct === undefined) widthPct = 50;
            if (isNaN(widthPct)) widthPct = 50;

            var params = {};
            params.pageType = "entityrecord";
            params.entityName = entityName;

            if (entityId !== null)
                params.entityId = entityId;

            if (data !== null)
                params.data = data;

            if (formId !== null)
                params.formId = formId;

            var options = {
                target: 2, // 1=inline, 2=dialog
                width: {
                    value: widthPct,
                    unit: "%" // % or px
                },
                height: {
                    value: 100,
                    unit: "%" // % or px
                },
                position: 1 // 1=center, 2=side
            };
            this.open(params, options);
        },
        openEntitySide(entityName, entityId, widthPct, formId, data) {
            if (entityName === undefined) return;
            if (entityName === null) return;
            if (entityName.trim() === "") return;
            if (entityId === undefined) entityId = null;
            if (entityId === "") entityId = null;
            if (formId === undefined) formId = null;
            if (formId === "") formId = null;
            if (data === undefined) data = null;

            if (widthPct === undefined) widthPct = 50;
            if (isNaN(widthPct)) widthPct = 50;

            var params = {};
            params.pageType = "entityrecord";
            params.entityName = entityName;

            if (entityId !== null)
                params.entityId = entityId;

            if (data !== null)
                params.data = data;

            if (formId !== null)
                params.formId = formId;

            var options = {
                target: 2, // 1=inline, 2=dialog
                width: {
                    value: widthPct,
                    unit: "%" // % or px
                },
                height: {
                    value: 100,
                    unit: "%" // % or px
                },
                position: 2 // 1=center, 2=side
            };
            this.open(params, options);
        },
        openWebresource(name, widthPct, data) {
            if (name === undefined) return;
            if (name === null) return;
            if (name.trim() === "") return;

            if (data === undefined) data = null;

            if (widthPct === undefined) widthPct = 50;
            if (isNaN(widthPct)) widthPct = 50;

            var params = {};
            params.pageType = "webresource";
            params.webresourceName = name;

            if (data !== null)
                params.data = data;

            var options = {
                target: 2, // 1=inline, 2=dialog
                width: {
                    value: widthPct,
                    unit: "%" // % or px
                },
                height: {
                    value: 100,
                    unit: "%" // % or px
                },
                position: 1 // 1=center, 2=side
            };
            this.open(params, options);
        },
        openWebresourceSide(name, widthPct, data) {
            if (name === undefined) return;
            if (name === null) return;
            if (name.trim() === "") return;

            if (data === undefined) data = null;

            if (widthPct === undefined) widthPct = 50;
            if (isNaN(widthPct)) widthPct = 50;

            var params = {};
            params.pageType = "webresource";
            params.webresourceName = name;

            if (data != null)
                params.data = data;

            var options = {
                title: "",
                // 1=inline, 2=dialog
                target: 2,
                // % or px
                width: { value: widthPct, unit: "%" },
                // % or px
                height: { value: 100, unit: "%" },
                position: 2 // 1=center, 2=side
            };
            this.open(params, options);
        }
    },

    // global form error handler
    // handles different error object types
    // simple try/catch usage CRMUI.error.handle(e);
    error: {
        handle(e) {
            if (Xrm == null) {
                console.log("D365 Form Error: ", e);
            }

            Xrm.Utility.closeProgressIndicator();
            if (e.message == null) {
                CRMUI.alert(`${e}`, "D365 Error", 240, 320);
            } else if (e.error != null) {
                CRMUI.alert(`${e.error.message}`, "D365 Error", 240, 320);
            } else {
                CRMUI.alert(`${e.message}`, "D365 Error", 240, 320);
            }
        }
    },

    // checks to ensure the form ctx is valid
    isFormCtxReady(ctx) {
        try {
            if (Xrm.crmui == null) Xrm.crmui = {
                form: null
            };

            if (ctx != null) {
                // could be from a primary control button context
                if(!ctx.hasOwnProperty("_formContext") && ctx.hasOwnProperty("_applicationContext")) return true;
                // otherwise get the form context
                Xrm.crmui.form = ctx.getFormContext();
            } else {
                if (Xrm.crmui.form == null)
                    return false;
            }
            return true;
        } catch (e) {
            console.log(e);
        }
    }
}

var PriQuote = PriQuote || {
    async onClickCloseWon(primaryControl) {
        try {
            if(!primaryControl) throw new Error("The form context could not be loaded. Please contact support"); 
           
            let curId = primaryControl.data.entity.getId().replace("{", "").replace("}", "");
            if(!curId) return;
            
            var quoteclose = {
                "quoteid@odata.bind": `/quotes(${curId})`,
                "actualend": new Date()
            };

            var winQuoteRequest = {
                QuoteClose: quoteclose,
                Status: 4, // Won
        
                getMetadata: function () {
                    return {
                        boundParameter: null,
                        parameterTypes: {
                            "QuoteClose": {
                                "typeName": "mscrm.quoteclose",
                                "structuralProperty": 5
                            },
                            "Status": {
                                "typeName": "Edm.Int32",
                                "structuralProperty": 1
                            }
                        },
                        operationType: 0,
                        operationName: "WinQuote"
                    };
                }
            };

            Xrm.WebApi.online.execute(winQuoteRequest).then(
                function success(result) {
                    if (result.ok) {
                        primaryControl.data.refresh(false);
                    }
                },
                function (e) {
                    CRMUI.error.handle(e);
                }
            );
        } catch (e) {
            CRMUI.error.handle(e);
        }
    }
}

var PriCifApproval = PriCifApproval || {
    debugging: false,

    onClickApprove(primaryControl, approvalSecurityRoleName) {
        try {
            if(!primaryControl) throw new Error("The form context could not be loaded. Please contact support"); 

            // if no security role is passed into the Power Command button, use System Administrator as the default
            if(!approvalSecurityRoleName) approvalSecurityRoleName = "System Administrator";
            if(PriCifApproval.debugging) console.log("");

            let user = CRMUI.getUser();
            if(PriCifApproval.debugging) console.log("Approval Process Initiated");
            if(PriCifApproval.debugging) console.log("User: ", user);
            if(!user) throw new Error(`The system user record is missing. Please contact support.`);

            let userRoles = CRMUI.getUserRoles();
            if(PriCifApproval.debugging) console.log("User Roles: ", userRoles);
            if(PriCifApproval.debugging) console.log("Checking for user role: ", approvalSecurityRoleName);
            if(!PriCifApproval.hasSecurityRole(approvalSecurityRoleName)) throw new Error(`Unable to Approve; missing the approval security role ${approvalSecurityRoleName}.`);
            
            let state = CRMUI.getOptionSet('statecode', primaryControl);
            if(PriCifApproval.debugging) console.log("State: ", state);
            if(!state || state.v == 1) throw new Error(`The record state is inactive.`);

            let status = CRMUI.getOptionSet('statuscode', primaryControl);
            if(PriCifApproval.debugging) console.log("Status: ", status);
            if(!status) throw new Error(`The record status is invalid.`);

            let integrateStatus = CRMUI.getOptionSet('pri_integration_status', primaryControl);
            if(PriCifApproval.debugging) console.log("Integration Status: ", integrateStatus);
            if(!integrateStatus) throw new Error(`The integration status is not valid.`);
            if(integrateStatus.v === PriCifApproval.integrationStatus.hasErrors) throw new Error(`This integration has errors. Please reopen the opportunity, review, and close again to generate a new record to approve.`);
            if(integrateStatus.v === PriCifApproval.integrationStatus.complete) throw new Error(`This integration has been completed.`);
            if(integrateStatus.v === PriCifApproval.integrationStatus.integrating) throw new Error(`This integration is currently integrating.`);
            if(integrateStatus.v === PriCifApproval.integrationStatus.ready) throw new Error(`This integration is currently awaiting integration.`);

            let fscmCompany = CRMUI.getLookup('pri_fscm_company', primaryControl);
            if(PriCifApproval.debugging) console.log("Opportunity: ", fscmCompany);
            if(!fscmCompany) throw new Error(`The opportunity record is missing or contains an invalid FSCM company reference.`);

            let opportunity = CRMUI.getLookup('pri_opportunity', primaryControl);
            if(PriCifApproval.debugging) console.log("Opportunity: ", opportunity);
            if(!opportunity) throw new Error(`The opportunity record is missing or invalid.`);

            let account = CRMUI.getLookup('pri_account', primaryControl);
            if(!account) throw new Error(`The account record is missing or invalid.`);
            if(PriCifApproval.debugging) console.log("Account: ", account);
            if(!account) throw new Error(`The account record is missing or invalid.`);
            
            // pri_billing_account
            let billAccount = CRMUI.getLookup('pri_billing_account', primaryControl);
            if(!billAccount) throw new Error(`The billing account record is missing or invalid.`);
            if(PriCifApproval.debugging) console.log("Billing Account: ", billAccount);
            if(!billAccount) throw new Error(`The billing account record is missing or invalid.`);

            // process the approval
            CRMUI.notRequireFields(['pri_notes'], primaryControl);
            CRMUI.setLookup('pri_approval_by_user', user.entityType, user.id, user.name, primaryControl);
            CRMUI.setDate('pri_approval_date', new Date(), primaryControl);
            CRMUI.setOptionSet('pri_integration_status', PriCifApproval.integrationStatus.ready, primaryControl);
            CRMUI.setOptionSet('statuscode', 1, primaryControl); // more information needed
            //pri_approval_date
        } catch(e) {
            CRMUI.error.handle(e);
        }
    },

    onClickReject(primaryControl, approvalSecurityRoleName) {
        try {
            if(!primaryControl) throw new Error("The form context could not be loaded. Please contact support"); 
            // CRMUI.onLoadPrimaryControl(primaryControl);

            // if no security role is passed into the Power Command button, use System Administrator as the default
            if(!approvalSecurityRoleName) approvalSecurityRoleName = "System Administrator";
            if(PriCifApproval.debugging) console.log("");

            // var globalContext = Xrm.Utility.getGlobalContext();
            let user = CRMUI.getUser();
            if(PriCifApproval.debugging) console.log("Approval Process Initiated");
            if(PriCifApproval.debugging) console.log("User: ", user);
            if(!user) throw new Error(`The system user record is missing. Please contact support.`);

            let userRoles = CRMUI.getUserRoles();
            if(PriCifApproval.debugging) console.log("User Roles: ", userRoles);
            if(PriCifApproval.debugging) console.log("Checking for user role: ", approvalSecurityRoleName);
            if(!PriCifApproval.hasSecurityRole(approvalSecurityRoleName)) throw new Error(`Unable to Approve; missing the approval security role ${approvalSecurityRoleName}.`);
            
            let state = CRMUI.getOptionSet('statecode', primaryControl);
            if(PriCifApproval.debugging) console.log("State: ", state);
            if(!state || state.v == 1) throw new Error(`The record state is inactive.`);

            let status = CRMUI.getOptionSet('statuscode', primaryControl);
            if(PriCifApproval.debugging) console.log("Status: ", status);
            if(!status) throw new Error(`The record status is invalid.`);

            let integrateStatus = CRMUI.getOptionSet('pri_integration_status', primaryControl);
            if(PriCifApproval.debugging) console.log("Integration Status: ", integrateStatus);
            if(!integrateStatus) throw new Error(`The integration status is not valid.`);
            if(integrateStatus.v === PriCifApproval.integrationStatus.hasErrors) throw new Error(`This integration has errors. Please reopen the opportunity, review, and close again to generate a new record to approve.`);
            if(integrateStatus.v === PriCifApproval.integrationStatus.complete) throw new Error(`This integration has been completed.`);
            if(integrateStatus.v === PriCifApproval.integrationStatus.integrating) throw new Error(`This integration is currently integrating.`);
            
            // process the rejection
            let currentNotes = CRMUI.getString('pri_notes');
            CRMUI.setOptionSet('statuscode', 166090000, primaryControl); // more information needed
            // CRMUI.clearFields(['pri_notes', 'pri_approval_by_user'], primaryControl);
            CRMUI.clearFields(['pri_approval_by_user','pri_approval_date'], primaryControl);
            CRMUI.requireFields(['pri_notes'], primaryControl);
            CRMUI.setOptionSet('pri_integration_status', PriCifApproval.integrationStatus.draft, primaryControl);
            if(!currentNotes) CRMUI.alert("Please provide a reason for the rejection in the notes, and save.");
            
        } catch(e) {
            CRMUI.error.handle(e);
        }
    },

    hasSecurityRole(arr, roleName) {
        let hasRole = false;
        for(let a of arr) {
            if(a.name == roleName || a.name == "System Administrator") {
                hasRole = true;
                break;
            }
        }
        return hasRole;
    },

    integrationStatus: {
        draft: 166090000,
        ready: 166090001,
        integrating: 166090002,
        complete: 166090003,
        hasErrors: 166090004
    }
}

const ValidStates = [
    { code: "AL", name: "alabama", country: "USA" },
    { code: "AK", name: "alaska", country: "USA" },
    { code: "AZ", name: "arizona", country: "USA" },
    { code: "AR", name: "arkansas", country: "USA" },
    { code: "CA", name: "california", country: "USA" },
    { code: "CO", name: "colorado", country: "USA" },
    { code: "CT", name: "connecticut", country: "USA" },
    { code: "DE", name: "delaware", country: "USA" },
    { code: "FL", name: "florida", country: "USA" },
    { code: "GA", name: "georgia", country: "USA" },
    { code: "HI", name: "hawaii", country: "USA" },
    { code: "ID", name: "idaho", country: "USA" },
    { code: "IL", name: "illinois", country: "USA" },
    { code: "IN", name: "indiana", country: "USA" },
    { code: "IA", name: "iowa", country: "USA" },
    { code: "KS", name: "kansas", country: "USA" },
    { code: "KY", name: "kentucky", country: "USA" },
    { code: "LA", name: "louisiana", country: "USA" },
    { code: "ME", name: "maine", country: "USA" },
    { code: "MD", name: "maryland", country: "USA" },
    { code: "MA", name: "massachusetts", country: "USA" },
    { code: "MI", name: "michigan", country: "USA" },
    { code: "MN", name: "minnesota", country: "USA" },
    { code: "MS", name: "mississippi", country: "USA" },
    { code: "MO", name: "missouri", country: "USA" },
    { code: "MT", name: "montana", country: "USA" },
    { code: "NE", name: "nebraska", country: "USA" },
    { code: "NV", name: "nevada", country: "USA" },
    { code: "NH", name: "new hampshire", country: "USA" },
    { code: "NJ", name: "new jersey", country: "USA" },
    { code: "NM", name: "new mexico", country: "USA" },
    { code: "NY", name: "new york", country: "USA" },
    { code: "NC", name: "north carolina", country: "USA" },
    { code: "ND", name: "north dakota", country: "USA" },
    { code: "OH", name: "ohio", country: "USA" },
    { code: "OK", name: "oklahoma", country: "USA" },
    { code: "OR", name: "oregon", country: "USA" },
    { code: "PA", name: "pennsylvania", country: "USA" },
    { code: "RI", name: "rhode island", country: "USA" },
    { code: "SC", name: "south carolina", country: "USA" },
    { code: "SD", name: "south dakota", country: "USA" },
    { code: "TN", name: "tennessee", country: "USA" },
    { code: "TX", name: "texas", country: "USA" },
    { code: "UT", name: "utah", country: "USA" },
    { code: "VT", name: "vermont", country: "USA" },
    { code: "VA", name: "virginia", country: "USA" },
    { code: "WA", name: "washington", country: "USA" },
    { code: "WV", name: "west virginia", country: "USA" },
    { code: "WI", name: "wisconsin", country: "USA" },
    { code: "WY", name: "wyoming", country: "USA" },
    { code: "DC", name: "district of columbia", country: "USA" },
    { code: "AS", name: "american samoa", country: "ASM" },
    { code: "GU", name: "guam", country: "GUM" },
    { code: "MP", name: "northern mariana islands", country: "MNP" },
    { code: "PR", name: "puerto rico", country: "PRI" },
    { code: "UM", name: "united states minor outlying islands", country: "UMI" },
    { code: "VI", name: "u.s. virgin islands", country: "VIR" },
    { code: "AB", name: "alberta", country: "CAN" },
    { code: "BC", name: "british columbia", country: "CAN" },
    { code: "MB", name: "manitoba", country: "CAN" },
    { code: "NB", name: "new brunswick", country: "CAN" },
    { code: "NL", name: "newfoundland", country: "CAN" },
    { code: "NL", name: "labrador", country: "CAN" },
    { code: "NS", name: "nova scotia", country: "CAN" },
    { code: "ON", name: "ontario", country: "CAN" },
    { code: "PE", name: "prince edward island", country: "CAN" },
    { code: "QC", name: "quebec", country: "CAN" },
    { code: "SK", name: "saskatchewan", country: "CAN" },
    { code: "NT", name: "northwest territories", country: "CAN" },
    { code: "NU", name: "nunavut", country: "CAN" },
    { code: "YT", name: "yukon", country: "CAN" }
];

const ValidCountries = [
    { name: "afghanistan", iso: "AFG" },
    { name: "albania", iso: "ALB" },
    { name: "algeria", iso: "DZA" },
    { name: "american samoa", iso: "ASM" },
    { name: "andorra", iso: "AND" },
    { name: "angola", iso: "AGO" },
    { name: "anguilla", iso: "AIA" },
    { name: "antarctica", iso: "ATA" },
    { name: "antigua and barbuda", iso: "ATG" },
    { name: "argentina", iso: "ARG" },
    { name: "armenia", iso: "ARM" },
    { name: "aruba", iso: "ABW" },
    { name: "australia", iso: "AUS" },
    { name: "austria", iso: "AUT" },
    { name: "azerbaijan", iso: "AZE" },
    { name: "bahamas", iso: "BHS" },
    { name: "bahrain", iso: "BHR" },
    { name: "bangladesh", iso: "BGD" },
    { name: "barbados", iso: "BRB" },
    { name: "belarus", iso: "BLR" },
    { name: "belgium", iso: "BEL" },
    { name: "belize", iso: "BLZ" },
    { name: "benin", iso: "BEN" },
    { name: "bermuda", iso: "BMU" },
    { name: "bhutan", iso: "BTN" },
    { name: "bolivia", iso: "BOL" },
    { name: "bonaire", iso: "BES" },
    { name: "bosnia and herzegovina", iso: "BIH" },
    { name: "botswana", iso: "BWA" },
    { name: "bouvet island", iso: "BVT" },
    { name: "brazil", iso: "BRA" },
    { name: "british indian ocean territory", iso: "IOT" },
    { name: "brunei darussalam", iso: "BRN" },
    { name: "bulgaria", iso: "BGR" },
    { name: "burkina faso", iso: "BFA" },
    { name: "burundi", iso: "BDI" },
    { name: "cabo verde", iso: "CPV" },
    { name: "cambodia", iso: "KHM" },
    { name: "cameroon", iso: "CMR" },
    { name: "canada", iso: "CAN" },
    { name: "cayman islands", iso: "CYM" },
    { name: "central african republic", iso: "CAF" },
    { name: "chad", iso: "TCD" },
    { name: "chile", iso: "CHL" },
    { name: "china", iso: "CHN" },
    { name: "christmas island", iso: "CXR" },
    { name: "cocos islands", iso: "CCK" },
    { name: "colombia", iso: "COL" },
    { name: "comoros", iso: "COM" },
    { name: "democratic republic of the congo", iso: "COD" },
    { name: "congo", iso: "COG" },
    { name: "cook islands", iso: "COK" },
    { name: "costa rica", iso: "CRI" },
    { name: "croatia", iso: "HRV" },
    { name: "cuba", iso: "CUB" },
    { name: "cyprus", iso: "CYP" },
    { name: "czechia", iso: "CZE" },
    { name: "denmark", iso: "DNK" },
    { name: "djibouti", iso: "DJI" },
    { name: "dominica", iso: "DMA" },
    { name: "dominican republic", iso: "DOM" },
    { name: "ecuador", iso: "ECU" },
    { name: "egypt", iso: "EGY" },
    { name: "el salvador", iso: "SLV" },
    { name: "equatorial guinea", iso: "GNQ" },
    { name: "eritrea", iso: "ERI" },
    { name: "estonia", iso: "EST" },
    { name: "eswatini", iso: "SWZ" },
    { name: "ethiopia", iso: "ETH" },
    { name: "falkland islands", iso: "FLK" },
    { name: "faroe islands", iso: "FRO" },
    { name: "fiji", iso: "FJI" },
    { name: "finland", iso: "FIN" },
    { name: "france", iso: "FRA" },
    { name: "french guiana", iso: "GUF" },
    { name: "french polynesia", iso: "PYF" },
    { name: "gabon", iso: "GAB" },
    { name: "gambia", iso: "GMB" },
    { name: "georgia", iso: "GEO" },
    { name: "germany", iso: "DEU" },
    { name: "ghana", iso: "GHA" },
    { name: "gibraltar", iso: "GIB" },
    { name: "greece", iso: "GRC" },
    { name: "greenland", iso: "GRL" },
    { name: "grenada", iso: "GRD" },
    { name: "guadeloupe", iso: "GLP" },
    { name: "guam", iso: "GUM" },
    { name: "guatemala", iso: "GTM" },
    { name: "guernsey", iso: "GGY" },
    { name: "guinea", iso: "GIN" },
    { name: "guinea-bissau", iso: "GNB" },
    { name: "guyana", iso: "GUY" },
    { name: "haiti", iso: "HTI" },
    { name: "honduras", iso: "HND" },
    { name: "hong kong", iso: "HKG" },
    { name: "hungary", iso: "HUN" },
    { name: "iceland", iso: "ISL" },
    { name: "india", iso: "IND" },
    { name: "indonesia", iso: "IDN" },
    { name: "ireland", iso: "IRL" },
    { name: "isle of man", iso: "IMN" },
    { name: "israel", iso: "ISR" },
    { name: "italy", iso: "ITA" },
    { name: "jamaica", iso: "JAM" },
    { name: "japan", iso: "JPN" },
    { name: "jersey", iso: "JEY" },
    { name: "jordan", iso: "JOR" },
    { name: "kazakhstan", iso: "KAZ" },
    { name: "kenya", iso: "KEN" },
    { name: "kiribati", iso: "KIR" },
    { name: "korea", iso: "KOR" },
    { name: "kuwait", iso: "KWT" },
    { name: "kyrgyzstan", iso: "KGZ" },
    { name: "lao people's democratic republic", iso: "LAO" },
    { name: "latvia", iso: "LVA" },
    { name: "lebanon", iso: "LBN" },
    { name: "lesotho", iso: "LSO" },
    { name: "liberia", iso: "LBR" },
    { name: "libya", iso: "LBY" },
    { name: "liechtenstein", iso: "LIE" },
    { name: "lithuania", iso: "LTU" },
    { name: "luxembourg", iso: "LUX" },
    { name: "macao", iso: "MAC" },
    { name: "madagascar", iso: "MDG" },
    { name: "malawi", iso: "MWI" },
    { name: "malaysia", iso: "MYS" },
    { name: "maldives", iso: "MDV" },
    { name: "mali", iso: "MLI" },
    { name: "malta", iso: "MLT" },
    { name: "marshall islands", iso: "MHL" },
    { name: "martinique", iso: "MTQ" },
    { name: "mauritania", iso: "MRT" },
    { name: "mauritius", iso: "MUS" },
    { name: "mayotte", iso: "MYT" },
    { name: "mexico", iso: "MEX" },
    { name: "micronesia", iso: "FSM" },
    { name: "moldova", iso: "MDA" },
    { name: "monaco", iso: "MCO" },
    { name: "mongolia", iso: "MNG" },
    { name: "montenegro", iso: "MNE" },
    { name: "montserrat", iso: "MSR" },
    { name: "morocco", iso: "MAR" },
    { name: "mozambique", iso: "MOZ" },
    { name: "myanmar", iso: "MMR" },
    { name: "namibia", iso: "NAM" },
    { name: "nauru", iso: "NRU" },
    { name: "nepal", iso: "NPL" },
    { name: "netherlands", iso: "NLD" },
    { name: "new caledonia", iso: "NCL" },
    { name: "new zealand", iso: "NZL" },
    { name: "nicaragua", iso: "NIC" },
    { name: "niger", iso: "NER" },
    { name: "nigeria", iso: "NGA" },
    { name: "niue", iso: "NIU" },
    { name: "norfolk island", iso: "NFK" },
    { name: "northern mariana islands", iso: "MNP" },
    { name: "norway", iso: "NOR" },
    { name: "oman", iso: "OMN" },
    { name: "pakistan", iso: "PAK" },
    { name: "palau", iso: "PLW" },
    { name: "palestine", iso: "PSE" },
    { name: "panama", iso: "PAN" },
    { name: "papua new guinea", iso: "PNG" },
    { name: "paraguay", iso: "PRY" },
    { name: "peru", iso: "PER" },
    { name: "philippines", iso: "PHL" },
    { name: "pitcairn", iso: "PCN" },
    { name: "poland", iso: "POL" },
    { name: "portugal", iso: "PRT" },
    { name: "puerto rico", iso: "PRI" },
    { name: "qatar", iso: "QAT" },
    { name: "republic of north macedonia", iso: "MKD" },
    { name: "romania", iso: "ROU" },
    { name: "russian federation", iso: "RUS" },
    { name: "rwanda", iso: "RWA" },
    { name: "saint helena, ascension and tristan da cunha", iso: "SHN" },
    { name: "saint kitts and nevis", iso: "KNA" },
    { name: "saint lucia", iso: "LCA" },
    { name: "saint martin", iso: "MAF" },
    { name: "saint pierre and miquelon", iso: "SPM" },
    { name: "saint vincent and the grenadines", iso: "VCT" },
    { name: "samoa", iso: "WSM" },
    { name: "san marino", iso: "SMR" },
    { name: "sao tome and principe", iso: "STP" },
    { name: "saudi arabia", iso: "SAU" },
    { name: "senegal", iso: "SEN" },
    { name: "serbia", iso: "SRB" },
    { name: "seychelles", iso: "SYC" },
    { name: "sierra leone", iso: "SLE" },
    { name: "singapore", iso: "SGP" },
    { name: "sint maarten", iso: "SXM" },
    { name: "slovakia", iso: "SVK" },
    { name: "slovenia", iso: "SVN" },
    { name: "solomon islands", iso: "SLB" },
    { name: "somalia", iso: "SOM" },
    { name: "south africa", iso: "ZAF" },
    { name: "south georgia", iso: "SGS" },
    { name: "south sudan", iso: "SSD" },
    { name: "spain", iso: "ESP" },
    { name: "sri lanka", iso: "LKA" },
    { name: "sudan", iso: "SDN" },
    { name: "suriname", iso: "SUR" },
    { name: "svalbard and jan mayen", iso: "SJM" },
    { name: "sweden", iso: "SWE" },
    { name: "switzerland", iso: "CHE" },
    { name: "syrian arab republic", iso: "SYR" },
    { name: "taiwan", iso: "TWN" },
    { name: "tajikistan", iso: "TJK" },
    { name: "tanzania", iso: "TZA" },
    { name: "thailand", iso: "THA" },
    { name: "timor-leste", iso: "TLS" },
    { name: "togo", iso: "TGO" },
    { name: "tokelau", iso: "TKL" },
    { name: "tonga", iso: "TON" },
    { name: "trinidad and tobago", iso: "TTO" },
    { name: "tunisia", iso: "TUN" },
    { name: "turkey", iso: "TUR" },
    { name: "turkmenistan", iso: "TKM" },
    { name: "turks and caicos islands", iso: "TCA" },
    { name: "tuvalu", iso: "TUV" },
    { name: "uganda", iso: "UGA" },
    { name: "ukraine", iso: "UKR" },
    { name: "united arab emirates", iso: "ARE" },
    { name: "united kingdom", iso: "GBR" },
    { name: "united states minor outlying islands", iso: "UMI" },
    { name: "united states of america", iso: "USA" },
    { name: "united states", iso: "USA" },
    { name: "uruguay", iso: "URY" },
    { name: "uzbekistan", iso: "UZB" },
    { name: "vanuatu", iso: "VUT" },
    { name: "venezuela", iso: "VEN" },
    { name: "viet nam", iso: "VNM" },
    { name: "virgin islands", iso: "VIR" },
    { name: "wallis and futuna", iso: "WLF" },
    { name: "western sahara", iso: "ESH" },
    { name: "yemen", iso: "YEM" },
    { name: "zambia", iso: "ZMB" },
    { name: "zimbabwe", iso: "ZWE" }
];

var CRMAddressValidation = CRMAddressValidation || {

    getValidState(stateValue) {
        try {
            let checkByName = false;

            if (stateValue.length !== 2) {
                checkByName = true;
            }

            for (var i = 0; i < ValidStates.length; i++) {
                let state = ValidStates[i];
                if (checkByName) {
                    if (state.name == stateValue.toLowerCase())
                        return state.code;
                } else {
                    if (state.code == stateValue.toUpperCase())
                        return state.code;
                }
            }
            return "";
        } catch (e) {
            console.log(e);
        }
    },

    getValidCountry(stateValue, countryValue) {
        try {
            let checkByName = false;

            if (stateValue.length !== 2) {
                checkByName = true;
            }

            if (stateValue.length > 0) {
                // check for the country by state
                for (var i = 0; i < ValidStates.length; i++) {
                    let state = ValidStates[i];
                    if (checkByName) {
                        if (state.name.trim() == stateValue.toLowerCase())
                            return state.country;
                    } else {
                        if (state.code.trim() == stateValue.toUpperCase())
                            return state.country;
                    }
                }
            }

            // check by country if no state combo is found
            if (countryValue != null) {
                let checkCountryByName = false;
                if (countryValue.length !== 2) {
                    checkCountryByName = true;
                }

                for (var i = 0; i < ValidCountries.length; i++) {
                    let country = ValidCountries[i];
                    if (checkCountryByName) {
                        if (country.name.trim() == countryValue.toLowerCase())
                            return country.iso;
                    } else {
                        if (country.iso.trim() == countryValue.toUpperCase())
                            return country.iso;
                    }
                }
            }

            return "";
        } catch (e) {
            console.log(e);
        }
    }
}
