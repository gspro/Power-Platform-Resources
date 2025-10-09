var FSCMIntegration = FSCMIntegration || {

    fscmOauthApiKey: 'xxxxx',
    fscmPricingIntegrationUrl: `xxxxx`,

    commands: {
        async clickOpportunity(primaryControl) {
            Xrm.Utility.closeProgressIndicator();
            try {
                if(!primaryControl) throw new Error(FSCMIntegration.errors.missingPrimaryControl);
                let opp = await FSCMIntegration.core.getEntityReference(primaryControl);
                if(!opp) return;

                let details = await FSCMIntegration.core.getOpportunityProducts(opp.id);
                if(details == null) return;

                console.log("Opportunity Details", details);

                let detailQueryErrors = [];
                let detailQuerySummary = [];

                Xrm.Utility.showProgressIndicator("Getting opportunity prices...");

                for (let detail of details) {
                    let hasErrors = false;
                    let id = detail['opportunityproductid'];
                    if (!id) {
                        detailQueryErrors.push({ name: name, error: "The opportunity product id is missing."});
                        hasErrors = true;
                    }

                    let name = detail['opportunityproductname'];
                    if (!name) {
                        detailQueryErrors.push({ name: name, error: "The opportunity product name is missing."});
                        hasErrors = true;
                    }

                    Xrm.Utility.showProgressIndicator(`Getting Prices for Opportunity Products... ${name}`);

                    let companyId = detail['t.pri_fscm_company_id'];
                    if (!companyId) {
                        detailQueryErrors.push({ name: name, error: "Missing FSCM company id for the assigned operating region."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `company id: ${companyId}` });
                
                    let customerData = await FSCMIntegration.core.getCustomer(companyId, detail._pri_billtocustomer_value);
                    if (!customerData || customerData.length === 0) {
                        detailQueryErrors.push({ name: name, error: "The billing customer is missing."});
                        hasErrors = true;
                    }
                        console.log("customer data: ", customerData);
                        detailQuerySummary.push({ name: name, message: `customer data: ${customerData}` });

                    let custAccount = null;
                    if(customerData.length > 0) {
                        custAccount = customerData[0].pri_fscm_customer_number;
                        if (!custAccount) {
                            detailQueryErrors.push({ name: name, error: "The assigned billing customer does not have an FSCM customer number for company: " + companyId});
                            hasErrors = true;
                        }
                    }
                    detailQuerySummary.push({ name: name, message: `custAccount: ${custAccount}` });

                    let siteId = detail['s.pri_fscm_site_id'];
                    if (!siteId) {
                        detailQueryErrors.push({ name: name, error: "The assigned location does not have an FSCM site id assigned."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `siteId: ${siteId}` });

                    let itemId = detail['p.productnumber'];
                    if (!itemId) {
                        detailQueryErrors.push({ name: name, error: "The assigned product or service does not have an item number."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `itemId: ${itemId}` });

                    let unitId = detail['u.name'];
                    if (!unitId) {
                        detailQueryErrors.push({ name: name, error: "A unit of measure is missing."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `unitId: ${unitId}` });

                    let priceDate = new Date().toISOString().split('T')[0]; // current date
                        console.log("priceDate: ", priceDate);

                    let quantity = detail.quantity;
                    if (!quantity) {
                        detailQueryErrors.push({ name: name, error: "A quantity is missing."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `quantity: ${quantity}` });

                    if(hasErrors) continue;

                    let priceData = await FSCMIntegration.core.getFscmPrice(custAccount, itemId, siteId, unitId, priceDate, companyId, quantity);
                        console.log(`The returned price for item ${itemId} is ${priceData.NetAmount}`);
                        detailQuerySummary.push({ name: name, message: `The returned price for item ${itemId} is ${priceData.NetAmount}` });

                    if(priceData == null) {
                        detailQueryErrors.push({ name: name, error: "The FSCM pricing service did not return a price or a default price."});
                        continue;
                    }

                    // update the opportunity product with the price
                    //6/26/25-gs- new reqs from client
					let updateQuery = await FSCMIntegration.core.updateRecord('opportunityproduct', { priceperunit: priceData.Price, pri_service_total_price: priceData.NetAmount, pri_netamountnumber: priceData.NetAmount }, id);
					
                        console.log("Updated record: ", updateQuery);
                        detailQuerySummary.push({ name: name, message: `Updated record: ${updateQuery}` });

                }

                Xrm.Utility.closeProgressIndicator();
              
                if(detailQueryErrors.length > 0) {
                    console.log("Errors encountered while getting prices. ", detailQueryErrors);
                    let errorList = detailQueryErrors.map(e => `${e.name}: ${e.error}\n\n`).join('');
                    Xrm.Navigation.openAlertDialog({ title: "Price Update Errors Summary", text: errorList }, { height: 600, width: 800 });
                } 

            } catch (e) {
                Xrm.Utility.closeProgressIndicator();
                console.log(e.message);
                Xrm.Navigation.openAlertDialog({ title: "Price Update Error", text: e.message }, { height: 600, width: 800 });
            }

            // save and refresh the form
            primaryControl.data.refresh(true);

        },

        async clickWorkOrder(primaryControl) {
            Xrm.Utility.closeProgressIndicator();

            try {
                if(!primaryControl) throw new Error(FSCMIntegration.errors.missingPrimaryControl);
                let wo = await FSCMIntegration.core.getEntityReference(primaryControl);
                if(!wo) return;

                // let woQuery = await FSCMIntegration.core.getRecord('msdyn_workorder', ['msdyn_billingaccount'], `msdyn_workorderid eq ${wo.id}`);
                let details = await FSCMIntegration.core.getWorkorderProducts(wo.id);
                if(details == null) return;

                console.log("Workorder Details", details);

                let detailQueryErrors = [];
                let detailQuerySummary = [];

                Xrm.Utility.showProgressIndicator("Getting work order prices...");

                for (let detail of details) {
                    let hasErrors = false;
                    let id = detail['msdyn_workorderproductid'];
                    if (!id) {
                        detailQueryErrors.push({ name: name, error: "The work order product id is missing."});
                        hasErrors = true;
                    }

                    let name = detail['p.name'];
                    if (!name) {
                        detailQueryErrors.push({ name: name, error: "The work order product name is missing."});
                        hasErrors = true;
                    }

                    Xrm.Utility.showProgressIndicator(`Getting Prices for work order products... ${name}`);

                    let companyId = detail['t.pri_fscm_company_id'];
                    if (!companyId) {
                        detailQueryErrors.push({ name: name, error: "Missing FSCM company id for the assigned price list."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `company id: ${companyId}` });

                    let customerData = await FSCMIntegration.core.getCustomer(companyId, detail['wo.msdyn_billingaccount']);
                    if (!customerData || customerData.length === 0) {
                        detailQueryErrors.push({ name: name, error: `The billing customer number is missing for FSCM company ${companyId}.`});
                        hasErrors = true;
                    }
                    console.log("customer data: ", customerData);
                    detailQuerySummary.push({ name: name, message: `customer data: ${customerData}` });

                    let custAccount = null;
                    if(customerData.length > 0) {
                        custAccount = customerData[0].pri_fscm_customer_number;
                        if (!custAccount) {
                            detailQueryErrors.push({ name: name, error: "The assigned billing customer does not have an FSCM customer number for company: " + companyId});
                            hasErrors = true;
                        }
                    }
                    detailQuerySummary.push({ name: name, message: `custAccount: ${custAccount}` });

                    let siteId = detail['s.pri_fscm_site_id'];
                    if (!siteId) {
                        detailQueryErrors.push({ name: name, error: "The assigned location does not have an FSCM site id assigned."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `siteId: ${siteId}` });

                    let itemId = detail['p.productnumber'];
                    if (!itemId) {
                        detailQueryErrors.push({ name: name, error: "The assigned product or service does not have an item number."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `itemId: ${itemId}` });

                    let unitId = detail['u.name'];
                    if (!unitId) {
                        detailQueryErrors.push({ name: name, error: "A unit of measure is missing."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `unitId: ${unitId}` });

                    let priceDate = FSCMIntegration.core.getValue(primaryControl, 'msdyn_timefrompromised').toISOString().split('T')[0]; // current date
                    // let priceDate = new Date().toISOString().split('T')[0]; // current date
                        console.log("priceDate: ", priceDate);

                    let quantity = detail.msdyn_quantity;
                    if (!quantity) {
                        detailQueryErrors.push({ name: name, error: "A quantity is missing."});
                        hasErrors = true;
                    }
                    detailQuerySummary.push({ name: name, message: `quantity: ${quantity}` });

                    if(hasErrors) continue;

                    let priceData = await FSCMIntegration.core.getFscmPrice(custAccount, itemId, siteId, unitId, priceDate, companyId, quantity);

                    debugger;

                    if(priceData == null) {
                        detailQueryErrors.push({ name: name, error: "The FSCM pricing service did not return a price or a default price."});
                        continue;
                    } else {
                        console.log(`The returned price for item ${itemId} is ${priceData.NetAmount}`);
                        detailQuerySummary.push({ name: name, message: `The returned price for item ${itemId} is ${priceData.NetAmount}` });
                    }

                    // update the work order product with the price only if the priceData.Price > 0
					//6/26/25 -gs - need to look at netamount also
                    if(priceData.Price > 0 || priceData.NetAmount > 0) {
                    //let updateQuery = await FSCMIntegration.core.updateRecord('msdyn_workorderproduct', { msdyn_totalamount: priceData.NetAmount, msdyn_unitamount: priceData.Price, pri_priceunit: priceData.//PriceUnit }, id);
					let updateQuery = await FSCMIntegration.core.updateRecord('msdyn_workorderproduct', { msdyn_totalamount: priceData.NetAmount,pri_netamountnumber: priceData.NetAmount, msdyn_unitamount: priceData.Price, pri_priceunit: priceData.PriceUnit }, id);
                        console.log("Updated record: ", updateQuery);
                        detailQuerySummary.push({ name: name, message: `Updated record: ${updateQuery}` });
                    }
                }

                Xrm.Utility.closeProgressIndicator();
              
                if(detailQueryErrors.length > 0) {
                    console.log("Errors encountered while getting prices. ", detailQueryErrors);
                    let errorList = detailQueryErrors.map(e => `${e.name}: ${e.error}\n\n`).join('');
                    Xrm.Navigation.openAlertDialog({ title: "Price Update Errors Summary", text: errorList }, { height: 600, width: 800 });
                }

            } catch (e) {
                Xrm.Utility.closeProgressIndicator();
                console.log(e.message);
                Xrm.Navigation.openAlertDialog({ title: "Price Update Error", text: e.message }, { height: 600, width: 800 });
            }

            // save and refresh the form
            primaryControl.data.refresh(true);
        }
    },

    core: {
        async getFscmPrice(custAccount, itemId, siteId, unitId, priceDate, companyId, quantity) {
            try {
                /*
                    200 returns:
                    {
                        ok: true,
                        message: null,
                        data: {
                            Currency: "",
                            NetAmount: 100.00,
                            Price: 100.00,
                            PriceUnit: 1000
                        }
                    }

                    400+ returns:
                    {
                        ok: false,
                        message: "Error message from the flow",
                        data: null
                    }
                */
                const response = await fetch(FSCMIntegration.fscmPricingIntegrationUrl, {
                    mode: "cors",
                    method: "POST",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'x-api-key': `${FSCMIntegration.fscmOauthApiKey}`
                    },
                    body: JSON.stringify({
                        CustAccount: custAccount,
                        ItemId: itemId,
                        SiteId: siteId,
                        UnitId: unitId,
                        PriceDate: priceDate,
                        CompanyId: companyId,
                        Quantity: quantity
                    })
                });
        
                let data = await response.json();
                if(data.ok) {
                    console.log("FSCM Pricing Service Response: ", data);
                    return data.data;
                } else {
                    throw new Error(data.message);
                }
            } catch (e) {
                console.log(e.message);
            }
        },
        async getOpportunityProducts(opportunityId) {
            try {
                return await FSCMIntegration.core.fetchRecords('opportunityproduct', `
                    <fetch>
                        <entity name='opportunityproduct'>
                            <attribute name='opportunityproductid' />
                            <attribute name='opportunityproductname' />
                            <attribute name='createdon' />
                            <attribute name='quantity' />
                            <attribute name='pri_billtocustomer' />
                            <link-entity name='territory' to='pri_region' from='territoryid' alias='t' link-type='outer'>
                                <attribute name='pri_fscm_company_id' />
                            </link-entity>
                            <link-entity name='msdyn_functionallocation' to='pri_location' from='msdyn_functionallocationid' alias='s' link-type='outer'>
                                <attribute name='pri_fscm_site_id' />
                            </link-entity>
                            <link-entity name='product' to='productid' from='productid' alias='p' link-type='outer'>
                                <attribute name='productnumber' />
                            </link-entity>
                            <link-entity name='uom' to='uomid' from='uomid' alias='u' link-type='outer'>
                                <attribute name='name' />
                            </link-entity>
                            <filter>
                                <condition attribute='opportunityid' operator='eq' value='${opportunityId}' />
                            </filter>
                        </entity>
                    </fetch>
                `);
            } catch (e) {
                console.log(e.message);
            }
        },
        async getWorkorderProducts(workorderId) {
            try {
                return await FSCMIntegration.core.fetchRecords('msdyn_workorderproduct', `
                    <fetch>
                        <entity name='msdyn_workorderproduct'>
                            <attribute name='createdon' />
                            <attribute name='msdyn_quantity' />
                            <link-entity name='pricelevel' to='msdyn_pricelist' from='pricelevelid' alias='t' link-type='outer'>
                                <attribute name='pri_fscm_company_id' />
                            </link-entity>
                            <link-entity name='msdyn_functionallocation' to='pri_location' from='msdyn_functionallocationid' alias='s' link-type='outer'>
                                <attribute name='pri_fscm_site_id' />
                            </link-entity>
                            <link-entity name='product' to='msdyn_product' from='productid' alias='p' link-type='outer'>
                                <attribute name='name' />
                                <attribute name='productnumber' />
                            </link-entity>
                            <link-entity name='uom' to='msdyn_unit' from='uomid' alias='u' link-type='outer'>
                                <attribute name='name' />
                            </link-entity>
                            <link-entity name='msdyn_workorder' to='msdyn_workorder' from='msdyn_workorderid' alias='wo' link-type='outer'>
                                <attribute name='msdyn_billingaccount' />
                            </link-entity>
                            <filter>
                                <condition attribute='msdyn_workorder' operator='eq' value='${workorderId}' />
                            </filter>
                        </entity>
                    </fetch>
                `);
            } catch (e) {
                console.log(e.message);
            }
        },
        async getCustomer(companyNumber, accountId) {
            try {
                return await FSCMIntegration.core.fetchRecords('pri_fscm_account_company', `
                    <fetch>
                        <entity name='pri_fscm_account_company'>
                        <attribute name='pri_fscm_customer_number' />
                        <filter>
                            <condition attribute='pri_account' operator='eq' value='${accountId}' />
                            <condition attribute='pri_company_id' operator='eq' value='${companyNumber}' />
                        </filter>
                        </entity>
                    </fetch>    
                `);
            } catch (e) {
                console.log(e.message);
            }
        },
        async getEntityReference(primaryControl) {
            if(!primaryControl) throw new Error(FSCMIntegration.errors.missingPrimaryControl);
            let entRef = primaryControl.data.entity.getEntityReference();
            if(!entRef.entityType && !entRef.id) return null;
            if(entRef.id == "" || entRef.id == "00000000-0000-0000-0000-000000000000") return null;
            entRef.id.replace("{", "").replace("}", "");
            return entRef;
        },
        async fetchRecords(entityName, fetchString) {
            try {
                let entityPluralName = await FSCMIntegration.core.getEntitySet(entityName);
                const baseUrl = Xrm.Utility.getGlobalContext().getClientUrl();
                // removes whitespace from the fetch string and encodes it
                let fetchStr = encodeURIComponent(fetchString.replace(/\s*(<[^>]+>)\s*/g, '$1').trim());
                const apiUrl = `${baseUrl}/api/data/v9.2/${entityPluralName}?fetchXml=${fetchStr}`;

                const response = await fetch(apiUrl, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "OData-MaxVersion": "4.0",
                        "OData-Version": "4.0",
                        "Prefer": "odata.include-annotations=*"
                    }
                });

                let data = await response.json();

                if (!response.ok) {
                    throw new Error(`Error querying records: ${data.error.message}`);
                }

                if(data != null && Array.isArray(data.value)) {
                    return data.value;
                }

                return null;

            } catch (e) {
                console.log(e.message);
            }
        },
        async getRecords(entityName, fields, filter) {
            try {
                let entityPluralName = await FSCMIntegration.core.getEntitySet(entityName);
                const baseUrl = Xrm.Utility.getGlobalContext().getClientUrl();
                let fieldStr = fields.slice(0, -1).join(',');
                let filterStr = encodeURIComponent(filter);
                const apiUrl = `${baseUrl}/api/data/v9.2/${entityPluralName}?$select=${fieldStr}&$filter=${filterStr}`;

                const response = await fetch(apiUrl, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "OData-MaxVersion": "4.0",
                        "OData-Version": "4.0",
                        "Prefer": "odata.include-annotations=*"
                    }
                });

                let data = await response.json();

                if (!response.ok) {
                    throw new Error(`Error querying records: ${data.error.message}`);
                }

                if(data != null && Array.isArray(data.value)) {
                    return data.value;
                }

                return null;

            } catch (e) {
                console.log(e.message);
            }
        },
        async getRecord(entityName, fields, filter) {
            try {
                let query = await FSCMIntegration.core.getRecords(entityName, fields, filter);
                if(query != null && query.length > 0) {
                    return query[0];
                }
                return null;
            } catch (e) {
                console.log(e.message);
            }
        },
        async updateRecord(entityName, entityObject, entityId) {
            try {
                let entityPluralName = await FSCMIntegration.core.getEntitySet(entityName);
                const baseUrl = Xrm.Utility.getGlobalContext().getClientUrl();
                
                let id = "";
                if (entityId == null) {
                    id = entityObject[`${logicalName}id`];
                } else {
                    id = entityId;
                }
                if (id == null || id === "") throw new Error(`There is no id specified for entity update: ${logicalName}`);
    
                let url = `${baseUrl}/api/data/v9.2/${entityPluralName}(${id.replace('{', '').replace('}', '')})`;
                const response = await fetch(url, {
                    method: "PATCH",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'OData-MaxVersion': '4.0',
                        'OData-Version': '4.0'
                    },
                    body: JSON.stringify(entityObject)
                });
    
                if (!response.ok) {
                    let error = JSON.parse(await response.text());
                    throw new Error(error);
                }
                
                let returnUrl = await response.headers.get('OData-EntityId');
                let regExp = /\(([^)]+)\)/;
                let matches = regExp.exec(returnUrl);
                entityObject[`${entityName}id`] = matches[1];
                return entityObject;
            } catch (e) {
                console.error(e);
            }
        },
        async getEntitySet(logicalName) {
            try {
                const baseUrl = Xrm.Utility.getGlobalContext().getClientUrl();
                const apiUrl = `${baseUrl}/api/data/v9.2/EntityDefinitions?$select=EntitySetName&$filter=LogicalName eq '${logicalName}'`;
                const response = await fetch(apiUrl, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "OData-MaxVersion": "4.0",
                        "OData-Version": "4.0",
                        "Prefer": "odata.include-annotations=*"
                    }
                });
                let data = await response.json();

                if (!response.ok) {
                    throw new Error(`Error querying records: ${data.error.message}`);
                }

                if(data != null && Array.isArray(data.value) && data.value.length > 0) {
                    return data.value[0].EntitySetName;
                }

                return null;

            } catch (e) {
                console.log(e.message);
            }
        },
        getValue(control, field) {
            // simple values return as strings or numbers
            // option sets return as integers
            // lookups return as an array of objects { entityType: "entityName", id: "guid", name: "name" }
            try {
                let val = control.getAttribute(field).getValue();
                return val;
            } catch (e) {
                console.log(e.message);
            }
        },
        setValue(control, field, value) {
            try {
                control.getAttribute(field).setValue(value);
            } catch (e) {
                console.log(e.message);
            }
        },
    },

    errors: {
        missingPrimaryControl: "The primary control was not passed to this function from the power command. Check the configuration"
    }

}
