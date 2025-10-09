/*  CRM Core JS
    Josh Pelkola
    
    This class provides base API functionality 
    to interact with the D365 CE web API.
    This file is intended as a dependency for all other
    JS files that require communicating with the web api
    inside of D365 forms and web resources.
*/
var CRMCore = CRMCore || {

    // returns the URL of the instance "eg: https://<org domain>.crm.dynamics.com"
    getUrl() {
        let gblCtx = Xrm.Utility.getGlobalContext();
        return gblCtx.getClientUrl();
    },

    // returns the API URL of the instance "eg: https://<org domain>.crm.dynamics.com/api/data/v9.2/"
    getBaseUrl() {
        let gblCtx = Xrm.Utility.getGlobalContext();
        if (gblCtx.getVersion() == null) return "";
        let versionArr = gblCtx.getVersion().split(".");
        if (versionArr.length < 2) return "";
        var url = gblCtx.getClientUrl() + "/api/data/v" + versionArr[0] + "." + versionArr[1] + "/";
        return url;
    },

    // returns an entity by record id or null
    async getEntityById(logicalName, fieldArr, id) {
        try {
            return await CRMCore.getEntity(logicalName, fieldArr, [`${logicalName}id eq ${id}`]);
        } catch (e) {
            console.error(e);
        }
    },

    // returns an entity record or null
    async getEntity(logicalName, fieldArr, filterArr) {
        try {
            let baseUrl = CRMCore.getBaseUrl();
            let entSet = await CRMCore.meta._getEntitySet(logicalName);
            let url = `${baseUrl}${entSet}${CRMCore._buildSelect(fieldArr)}${CRMCore._buildFilters(filterArr)}&$top=1`;
            let response = await CRMCore._httpGet(url);
            if (response.value == null) return null;
            if (response.value.length > 0) return response.value[0];
        } catch (e) {
            console.error(e);
        }
    },

    // returns an array of entity records or []
    async getEntities(logicalName, fieldArr, filterArr) {
        try {
            let baseUrl = CRMCore.getBaseUrl();
            let entSet = await CRMCore.meta._getEntitySet(logicalName);
            let url = `${baseUrl}${entSet}${CRMCore._buildSelect(fieldArr)}${CRMCore._buildFilters(filterArr)}`;
            let result = await CRMCore._httpGet(url);
            if (result == null || result.value == null) return [];
            return result.value;
        } catch (e) {
            console.error(e);
        }
    },

    // returns an array of entity records using fetch xml or []
    async fetchEntities(logicalName, fetchString) {
        try {
            let baseUrl = CRMCore.getBaseUrl();
            let entSet = await CRMCore.meta._getEntitySet(logicalName);
            let url = `${baseUrl}${entSet}?fetchXml=${encodeURIComponent(fetchString)}`;
            let result = await CRMCore._httpGet(url);
            if (result == null || result.value == null) return [];
            return result.value;
        } catch (e) {
            console.error(e);
        }
    },

    // create a new entity record
    // returns record id on success
    async createEntity(logicalName, entityObject) {
        try {
            let baseUrl = CRMCore.getBaseUrl();
            let entSet = await CRMCore.meta._getEntitySet(logicalName);

            let url = `${baseUrl}${entSet}`;
            const response = await fetch(url, {
                method: "POST",
                headers: CRMCore._fetchPostHeaders(),
                body: JSON.stringify(entityObject)
            });

            await CRMCore._handleResponseErrors(response);

            // return the id of the created entity back to the caller
            // using the create object with the primary key attached
            let returnUrl = await response.headers.get('OData-EntityId');
            let regExp = /\(([^)]+)\)/;
            let matches = regExp.exec(returnUrl);
            entityObject[`${logicalName}id`] = matches[1];
            return entityObject;

        } catch (e) {
            console.error(e);
        }
    },

    // updates an existing entity record by id
    // returns record id on success
    async updateEntity(logicalName, entityObject, entityId) {
        try {
            let baseUrl = CRMCore.getBaseUrl();
            let entSet = await CRMCore.meta._getEntitySet(logicalName);

            let id = "";
            if (entityId == null) {
                id = entityObject[`${logicalName}id`];
            } else {
                id = entityId;
            }
            if (id == null || id === "") throw new Error(`There is no id specified for entity update: ${logicalName}`);

            let url = `${baseUrl}${entSet}(${id.replace('{', '').replace('}', '')})`;
            const response = await fetch(url, {
                method: "PATCH",
                headers: CRMCore._fetchPostHeaders(),
                body: JSON.stringify(entityObject)
            });

            await CRMCore._handleResponseErrors(response);

            let returnUrl = await response.headers.get('OData-EntityId');
            let regExp = /\(([^)]+)\)/;
            let matches = regExp.exec(returnUrl);
            entityObject[`${logicalName}id`] = matches[1];
            return entityObject;
        } catch (e) {
            console.error(e);
        }
    },

    // delete an entity record
    // returns true or false
    async deleteEntity(logicalName, entityId) {
        try {
            let baseUrl = CRMCore.getBaseUrl();
            let entSet = await CRMCore.meta._getEntitySet(logicalName);
            entityId = entityId.replace('{', '').replace('}', '');
            let url = `${baseUrl}${entSet}(${entityId})`;
            const response = await fetch(url, {
                method: "DELETE",
                headers: CRMCore._fetchPostHeaders()
            });

            await CRMCore._handleResponseErrors(response);
            return response.ok;
        } catch (e) {
            console.error(e);
        }
    },

    async callFlow() {
        // https://prod-157.westus.logic.azure.com:443/workflows/d23a5e79430c4c429a784c15c819f8e5/triggers/manual/paths/invoke?api-version=2016-06-01

        let entityObject = {
            entity: "opportunity",
            id: "058dea81-2a49-ef11-a316-0022480a3707",
            CustAccount: "CUS000049",
            ItemId: "000010",
            SiteId: "01",
            UnitId: "HR",
            PriceDate: "2024-10-30",
            CompanyId: "100",
            Quantity: 1
        };

        let url = `https://prod-157.westus.logic.azure.com:443/workflows/d23a5e79430c4c429a784c15c819f8e5/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=TXLzb8uuZpb5q4qCa2jBH4sl5vfI7hXxAmPxDLKfMdA`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-api-key': 'ABCD1234'
            },
            body: JSON.stringify(entityObject)
        });

        await CRMCore._handleResponseErrors(response);

        console.log(await response.json());
    },

    // handle errors from http calls
    async _handleResponseErrors(response) {
        if (response != null) {
            if (!response.ok) {
                let error = JSON.parse(await response.text());
                console.log("ERROR: ", error);
                throw new Error(error);
            }
        }

        return response;
    },

    // builds the select string for odata entity calls
    _buildSelect(fieldArr) {
        let urlPart = "?$select=";
        if (fieldArr == null) fieldArr = ["*"];
        if (fieldArr.length === 0) fieldArr = ["*"];
        for (let i = 0; i < fieldArr.length; i++) {
            if (i === fieldArr.length - 1) {
                urlPart += fieldArr[i];
            } else {
                urlPart += fieldArr[i] + ',';
            }
        }
        return urlPart;
    },

    // builds the filter string for odata entity calls
    _buildFilters(filterArr) {
        let urlPart = "";
        if (filterArr != null) {
            if (filterArr.length === 0) return urlPart;
            urlPart = "&$filter=";
            for (let i = 0; i < filterArr.length; i++) {
                if (i === filterArr.length - 1) {
                    urlPart += filterArr[i];
                } else {
                    urlPart += filterArr[i] + ' and ';
                }
            }
        }
        return urlPart;
    },

    // returns http headers for fetch post http
    _fetchPostHeaders() {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
        }
    },

    // returns http headers for fetch get http
    _fetchGetHeaders() {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Prefer': 'odata.include-annotations="*"'
        }
    },

    async _httpGet(url) {
        const response = await fetch(url, {
            method: "GET",
            headers: CRMCore._fetchGetHeaders()
        });

        await CRMCore._handleResponseErrors(response);
        return response.json();
    },

    meta: {
        async getEntityInfo(logicalName) {
            var url = CRMCore.getBaseUrl() + "EntityDefinitions?$select=ObjectTypeCode,EntitySetName&$filter=LogicalName eq '" + logicalName + "'";
            let entSetQuery = await CRMCore._httpGet(url);
            if (entSetQuery.value == null) throw new Error("The entity set name could not be found. logical name: ", logicalName);
            if (entSetQuery.value[0] == null) throw new Error("The entity metadata could not be found. logical name: ", logicalName);
            return entSetQuery.value[0];
        },

        // returns the entity set (plural) name for an entity
        async _getEntitySet(logicalName) {
            var url = CRMCore.getBaseUrl() + "EntityDefinitions?$select=EntitySetName&$filter=LogicalName eq '" + logicalName + "'";
            let entSetQuery = await CRMCore._httpGet(url);
            if (entSetQuery.value == null) throw new Error("The entity set name could not be found. logical name: ", logicalName);
            if (entSetQuery.value[0].EntitySetName == null) throw new Error("The entity set name could not be found. logical name: ", logicalName);
            return entSetQuery.value[0].EntitySetName;
        },

        // returns an array of global option set names and ids
        async getSystemOptionSets() {
            let qry = await CRMCore._httpGet(`${CRMCore.getBaseUrl()}GlobalOptionSetDefinitions?$select=Name`);
            if (qry == null) return [];
            if (qry.value == null) return [];
            return qry.value;
        },

        // returns a list of option set values for a global option set by its metadata id
        async getSystemOptionSetValues(metadataId) {
            let qry = await CRMCore._httpGet(`${CRMCore.getBaseUrl()}GlobalOptionSetDefinitions(${metadataId})`);
            if (qry == null) return [];
            if (qry.Options == null) return [];

            // remap to simple object list
            let results = [];
            for (var i = 0; i < qry.Options.length; i++) {
                let opt = qry.Options[i];
                // set value
                let result = {};
                result.value = opt.Value;

                // set display
                if (opt.Label != null && opt.Label.UserLocalizedLabel != null && opt.Label.UserLocalizedLabel.Label != null) {
                    result.display = opt.Label.UserLocalizedLabel.Label;
                } else if (opt.Label != null && opt.Label.LocalizedLabels != null && opt.Label.LocalizedLabels[0] != null && opt.Label.LocalizedLabels[0].Label != null) {
                    result.display = opt.Label.LocalizedLabels[0].Label;
                } else {
                    result.display = "ERROR";
                }

                results.push(result);
            }

            return results;
        }
    }
}

// word template functionality
var PriWord = PriWord || {
    defaultLanguageCode: 1033,
    templateType: 9940,

    // entity parameters
    parameters: {
        id: null,
        typeName: "",
        type: 0
    },

    async onClickGenerateTemplate(primaryControl, primaryItemIds, primaryEntityTypeCode, templateName) {
        let recordId = primaryControl.data.entity.getId().replace("{","").replace("}","");
        PriWord.parameters.id = recordId;
        PriWord.parameters.typeName = "msdyn_workorder";
        PriWord.parameters.type = primaryEntityTypeCode;
        //get user security roles
        debugger;
        let roles = await PriWord.getUserRoles();
        let roleNames = roles.map(r => r.name);
        let hasSmmRole = roleNames.some(name => name && name.startsWith("*SMM"));
        let hasPritchardRole = roleNames.some(name => name && name.startsWith("*Pritchard"));
        let isAdmin = roleNames.some(name => name && name === "System Administrator");

        if (templateName.startsWith("SMM") && !hasSmmRole && !isAdmin) {
            alert("You do not have access to this template.");
            return;
        }
        if(templateName ==="Pritchard WO - No Price" && !hasPritchardRole && !isAdmin ) {
            alert("You do not have access to this template.");
            return;
        }
         if(templateName ==="Pritchard WO - Price" && (!hasPritchardRole || roleNames.includes("*Pritchard - Supervisor") ) && !isAdmin) {
            alert("You do not have access to this template.");
            return;
        }

        await PriWord.download(templateName, `${templateName}.docx`);
        // console.log(`onClickGenerateTemplate for ${templateName}`, recordId, primaryItemIds, primaryEntityTypeCode);
        // alert("ouch... stop");
    },
    async getUserRoles(userId) {
        try {
            // if no id passed, use current user
            if (!userId) {
                let gblCtx = Xrm.Utility.getGlobalContext();
                userId = gblCtx.userSettings.userId;
            }
            userId = userId.replace('{', '').replace('}', '');
            let url = `${CRMCore.getBaseUrl()}systemusers(${userId})/systemuserroles_association?$select=roleid,name`;
            let result = await CRMCore._httpGet(url);
            if (result == null || result.value == null) return [];
            return result.value; // array of role objects { roleid, name, ... }
        } catch (e) {
            console.error(e);
            return [];
        }
    },
    async getTemplateId (templateName, languagecode) {
        if(!languagecode) languagecode = PriWord.defaultLanguageCode;
        let query = await CRMCore.getEntity('documenttemplate', ["documenttemplateid"], [`name eq '${templateName}' and languagecode eq ${languagecode}`]);
        if(!query || !query["documenttemplateid"]) return null;
        return query["documenttemplateid"];
    },

    async download(templateName, filename, languagecode) {
        if(!PriWord.parameters.id) return;
        if(!PriWord.parameters.type) return;
        let templateId = await PriWord.getTemplateId(templateName, languagecode);
        
        let exportUrl = `${CRMCore.getBaseUrl()}ExportWordDocument`;
        let postBody = JSON.stringify({
            EntityTypeCode: PriWord.parameters.type,
            SelectedRecords: `["${PriWord.parameters.id}"]`,
            SelectedTemplate: {
                '@odata.type': 'Microsoft.Dynamics.CRM.documenttemplate',
                documenttemplateid: templateId
            }
        });

        fetch(exportUrl, {
            method: 'POST',
            body: postBody,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Language': '*'
            }
        })
        .then((response) => response.json())
        .then((json) => {
            const binaryString = window.atob(json.WordFile);
            const bytes = new Uint8Array(binaryString.length);
            const arrayBuffer = bytes.map((byte, i) => binaryString.charCodeAt(i));

            const blob = new Blob([arrayBuffer]);
            if (navigator.msSaveOrOpenBlob) {
                // IE 10+
                navigator.msSaveOrOpenBlob(blob, filename);
            } else {
                const link = document.createElement('a');
                // Browsers that support HTML5 download attribute
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        });
    }                
}
