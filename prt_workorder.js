var PriWorkOrder = PriWorkOrder || {
    async onLoad(ctx) {
        CRMUI.onLoad(ctx);
        PriWorkOrder.setProductViewOnGrid(ctx);
        // Register pri_approval_status_onChange handler
        CRMUI.addOnChange('pri_approval_status', PriWorkOrder.pri_approval_status_onChange, ctx);
        await this.validate();
        await this.checkForDetails();
    },
    // Event handler for pri_approval_status field
    pri_approval_status_onChange: function(ctx) {
        CRMUI.getOptionSet('pri_approval_status').v === 166090001 ?
            CRMUI.requireFields('pri_notes', true) :
            CRMUI.requireFields('pri_notes', false);
      
    },
    async onSave(ctx) {
        await this.validate();
    },

    async validate() {
        try {
            let pricelist = CRMUI.getLookup('msdyn_pricelist');
            if(!pricelist) throw new Error("Price List is required.");
            let pricelistQry = await CRMCore.getEntity('pricelevel', ["pri_fscm_company_id"], [`pricelevelid eq ${pricelist.id}`]);
            let companyId = pricelistQry != null ? pricelistQry.pri_fscm_company_id : null;
            if(!companyId) {
                CRMUI.clearFields(['msdyn_pricelist']);
                throw new Error("The selected Price List is not associated with an FSCM company.");
            }

            let location = CRMUI.getLookup('msdyn_functionallocation');
            if(!location) throw new Error("The location is required.");
            let locationQry = await CRMCore.getEntity('pri_fscm_location_company', ["pri_name"], [`_pri_location_value eq ${location.id} and pri_company_id eq '${companyId}'`]);
            if(!locationQry) {
                CRMUI.clearFields(['msdyn_functionallocation']);
                throw new Error(`The selected location does not have a site number for the selected company ${companyId}.`);
            }

            let billingCustomer = CRMUI.getLookup('msdyn_billingaccount');
            if(!billingCustomer) throw new Error("The billing customer is required.");
            let billingCustomerQry = await CRMCore.getEntity('pri_fscm_account_company', ["pri_name"], [`_pri_account_value eq ${billingCustomer.id} and pri_company_id eq '${companyId}'`]);
            if(!billingCustomerQry) {
                CRMUI.clearFields(['msdyn_billingaccount']);
                CRMUI.clearFields(['msdyn_serviceaccount']);
                throw new Error(`The selected billing customer does not have a customer number for the selected company ${companyId}.`);
            }
            console.log("Validation passed.", pricelistQry, billingCustomerQry);
        } catch (e) { 
            CRMUI.error.handle(e);
        }
    },

    async checkForDetails() {
        let woid = CRMUI.getId();
        let detailsExist = false;
        if(!woid) {
            CRMUI.setBool('pri_has_wo_details', detailsExist);
            return;
        }
        let details = await CRMCore.getEntities('msdyn_workorderproduct', ["msdyn_workorderproductid"], [`_msdyn_workorder_value eq ${woid}`]);
        
        if(details && Array.isArray(details) && details.length > 0) {
            detailsExist = true;
        }

        CRMUI.setBool('pri_has_wo_details', detailsExist);
    },

    setProductViewOnGrid(ctx) {
        const roleNames = ["*Pritchard - Supervisor", "*SMM - Supervisors"];
        const viewId = "2ed77715-1321-f011-998a-7c1e525d07df";
        const viewName = "Pritchard Supervisor Products view";
        const gridName = "products_subgrid";

        const userRoles = CRMUI.getUserRoles().map(role => role.name);
        const isSupervisor = roleNames.some(roleName => userRoles.includes(roleName));
        if(isSupervisor) {
            PriWorkOrder.setGridView(ctx, gridName, viewId, viewName);
        }
    },

    setGridView(ctx, gridName, viewId, viewName) {
        const formCtx = ctx.getFormContext();

        const gridCtx = formCtx.getControl(gridName);
        if (gridCtx && gridCtx.getViewSelector()) {
            const newView = {
                entityType: 1039, // Saved Query entity type
                id: viewId,
                name: viewName
            };
            gridCtx.getViewSelector().setCurrentView(newView);
            gridCtx.refresh(); // Refresh the grid to apply the new view
        }
    }
}
