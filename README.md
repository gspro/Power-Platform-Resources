## Power Platform Resources

### ALM CI/CD
+ [PowerPlatform ALM](https://sharepains.com/2021/08/24/application-lifecycle-management/?utm_campaign=Power%20Platform%20Developers%20Weekly&utm_medium=email&utm_source=Revue%20newsletter)

### Architecture
+ [North Star Architecture (Microsoft)](https://github.com/microsoft/industry/tree/main/foundations/powerPlatform)

### DataVerse
+ [Create and use Custom APIs](https://docs.microsoft.com/en-us/powerapps/developer/data-platform/custom-api)

+ [Sample Code](https://docs.microsoft.com/en-us/dynamics365/customerengagement/on-premises/developer/sample-code-directory?view=op-9-1)

#### Power apps
+ [Teams samples github repo](https://github.com/OfficeDev)

+ [AprilDunnamRepo](https://github.com/gspro/PowerApps)

+ [PowerFx samples (and some powerapps)](https://pnp.github.io/powerplatform-samples/samples/powerapps/)

+ [PowerFx custom date functions](https://github.com/pnp/powerfx-samples/blob/main/samples/date-functions/sourcecode/Src/Title%20Screen.fx.yaml)

+ [Power Apps function list](https://www.matthewdevaney.com/the-complete-power-apps-functions-list/)

+ Format currency: `"$" & Text(ThisItem.Cost,"[$-en-US]#,##0.00")`
+ Change canvas app owner: `Powershell: $EnvironmentName = 'Default-f1b8b509-50a4-4a5c-8e48-bf3d3e7c10ed'
$AppName = '3b328263-ef5e-4db8-b360-d74eb474b8af'
$NewAppOwner = '6857d910-10c3-485e-a492-6456ce2f1625'
Set-AdminPowerAppOwner –AppName $AppName -AppOwner $NewAppOwner –EnvironmentName $EnvironmentName`

+[Error handling](https://platformsofpower.net/power-apps-error-handling-essentials/?utm_source=substack&utm_medium=email)

#### Power Automate
+ [Snippets](https://crmtipoftheday.com/pages/power-automate-gymnastics-reference-guide/)
+ [Kahils cheatsheet](https://danikahil.com/2022/04/power-automate-dataverse-cheatsheet.html )
+ [Matt D's Coding Standards] (https://www.matthewdevaney.com/power-automate-coding-standards-for-cloud-flows/)
+ [Dave Wyatts 11](https://dev.to/wyattdave/series/21919)

#### Typescript
+ [Olivers TS](https://www.oliverflint.co.uk/2020/03/07/D365-Typescript-Webresources-Part-1/)
+ [Scott D's Typescript Web Resources class](https://learn.develop1.net/courses/building-javascript-web-resources-using-typescript/contents/60a9660f607a8)
+ [Typescript Webpack template](https://xrm.al/blog/typescript-dataverse?utm_campaign=Power%20Platform%20Developers%20Weekly&utm_medium=email&utm_source=Revue%20newsletter)
+ [ESLint power platform](https://www.develop1.net/public/post/2022/07/21/power-apps-eslint-plugin-replaces-solution-checker-for-typescript-code?utm_campaign=Power%20Platform%20Developers%20Weekly&utm_medium=email&utm_source=Revue%20newsletter)

#### Web Resources
+ [SPKL deployment](https://benediktbergmann.eu/2021/06/16/add-sparkle-xrm-to-a-webresources-project/?utm_campaign=PP-Weekly&utm_medium=email&utm_source=Revue%20newsletter)

+ [JS samples](https://neilparkhurst.com/2017/02/25/javascript-my-collection/)

+ [DaniKahil js cheatsheet](https://danikahil.com/wp-content/uploads/2022/09/Power-Apps-Model-Driven-Apps-JavaScript-cheatsheet-1.pdf)
#### PCF
+ [React TS Template](https://github.com/gspro/pcf-react-typescript)
+ [MS Tutorial](https://docs.microsoft.com/en-us/powerapps/developer/component-framework/tutorial-create-model-driven-field-component)

+ [Virtual (react) controls](https://www.develop1.net/public/post/2022/04/07/how-to-convert-pcf-to-virtual-control?utm_campaign=Power%20Platform%20Developers%20Weekly&utm_medium=email&utm_source=Revue%20newsletter)

### UI/UX
+ [App Examples - Mobbin](https://mobbin.com/browse/ios/apps)
+ [US Tools](https://uxtools.co/)
+ [icons - iconsax](https://iconsax.io/)
+ [icons - flaticons](https://www.flaticon.com/)
+ [Material Design palette](https://www.materialpalette.com/)
+ [SVG Icons] (https://github.com/tabler/tabler-icons)
+ [More icons] (https://phosphoricons.com/)
+ [yCombinator post with lots of icon refs] (https://news.ycombinator.com/item?id=35720720)

### Azure
+ [MS Docs Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=v3%2Cwindows%2Ccsharp%2Cportal%2Cbash%2Ckeda)

### OmniChannel
+ [Crm Ninja blog](https://thecrm.ninja/omnichannel-for-dynamics-365/)

+ [Proactive Chat](https://carldesouza.com/use-omnichannel-proactive-chat-to-engage-with-your-customers/?utm_campaign=Power%20Platform%20Developers%20Weekly&utm_medium=email&utm_source=Revue%20newsletter)

### Connectivity
+ [a better app reg article](https://www.m365princess.com/blogs/2022-07-25-why-your-service-principal-doesnt-need-a-dynamics-user_impersonation-scope/?utm_campaign=Power%20Platform%20Developers%20Weekly&utm_medium=email&utm_source=Revue%20newsletter)

+ [App registration, service principle creation](https://www.matthewdevaney.com/a-visual-guide-to-power-platform-service-principal-setup/?s=03)

+ [Create an App Registration](https://docs.microsoft.com/en-us/powerapps/developer/data-platform/walkthrough-register-app-azure-active-directory)

+ [Create Client Secret](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#option-2-create-a-new-application-secret)

+  [Extend client secret expiration > 2 yrs](https://crmtipoftheday.com/1404/app-secrets-that-last-longer-than-2-years/?utm_campaign=PP-Weekly&utm_medium=email&utm_source=Revue%20newsletter)

+ Extend secret:  Install-Module AzureAD
                  $startDate = Get-Date
                  $endDate = $startDate.AddYears(5)
                  Connect-AzureAD -TenantId ad2f1e0f-b97e-4858-b3ab-7c4a814da8ce -Confirm
                  $aadappsecret = New-AzureADApplicationPasswordCredential -ObjectId 34264b0d-38d4-4582-9895-383b608c17d7 -CustomKeyIdentifier "D365 Access" -StartDate $startDate -EndDate $enddate
                  $aadappsecret


+ [Add App User to DataVerse](https://docs.microsoft.com/en-us/power-platform/admin/manage-application-users)

+ [Call WebAPI using Client Creds from PowerShell](https://github.com/gspro/Power-Platform-Resources/commit/eca877be69a8017af44c6fbf2713f001ceae04ac)

+ [Call WebAPI using XrmTooling from PowerShell](https://docs.microsoft.com/en-us/powerapps/developer/data-platform/xrm-tooling/use-powershell-cmdlets-xrm-tooling-connect)

### Data and SQL
+ [Improve Kingswaysoft Performance](https://nishantrana.me/2021/06/15/how-to-improve-data-migration-performance-ssis-azure-data-factory-dataverse-dynamics-365/)

+ [Export/Create Environment Variables](https://github.com/gspro/SQLResources/blob/main/ExportEnvVars.sql)
+ [Kingsway update download link](https://www.kingswaysoft.com/downloads/releases/ssis/dynamics-365/IntegrationToolkit-Dynamics365-x64.zip)
### SSRS/PBI
+ [Set up SSRS for D365](https://readyxrm.blog/2021/01/23/ssrsdataverse2021/)

### On prem
+ [Service Accounts](https://docs.microsoft.com/en-us/previous-versions/dynamicscrm-2016/deployment-administrators-guide/hh699825(v=crm.8)?redirectedfrom=MSDN#BKMK_sandbox_perm)

+ [Org Import](https://docs.microsoft.com/en-us/dynamics365/customerengagement/on-premises/deploy/import-an-organization?view=op-9-1)

+ [System Req's](https://docs.microsoft.com/en-us/dynamics365/customerengagement/on-premises/deploy/system-requirements-required-technologies?view=op-9-1)

+ [Ports](https://docs.microsoft.com/en-us/dynamics365/customerengagement/on-premises/deploy/network-ports-for-microsoft-dynamics-365?view=op-9-1)

+ [SMTP Email Profile with Unsecure connection](https://github.com/gspro/SQLResources/blob/main/CrmOnPremEmailUnsecureConnection.sql)

### Field Service
+ [Quick ref](https://nishantrana.me/2021/08/17/quick-reference-dynamics-365-field-service/)

### Useful Blogs
+ [PowerApps Raw](https://www.richardawilson.com/)

### Utility
+ To get an advanced find window in teh new UI, suffix this:  /main.aspx?app=d365default&forceUCI=1&pagetype=advancedfind

+ To enable telnet -> Dism /Online /Enable-feature /FeatureName:TelnetClient

+ Screenshot / Demo live utility ->   type start->run->psr

+ [Set up postman to work with DataVerse](https://youtu.be/HpUj11yU0fY)
+ [Another postman article docs.microsoft](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/setup-postman-environment)

+ [Query Expression to FetchXml c# (can just use xrmTB FXB instead)](https://github.com/gspro/Power-Platform-Fetch-XML/blob/main/QueryExpressionToFetchXml.cs)

+ [D365 Dev Extensions (2019)](https://github.com/tsharp/D365DeveloperExtensions)

+ [Chrome dark mode](https://www.tomsguide.com/news/how-to-enable-chrome-dark-mode)  browse here: "chrome://flags/#enable-force-dark"
+ [Notebooks - rajyraman](https://github.com/rajyraman/Dataverse-Interactive-Notebook)
+ [Loading images (gifs, svgs)](https://loading.io/)
+ [SMTP Trap - PaperCut](https://github.com/ChangemakerStudios/Papercut)

### Project Managment, Requirements
+ [Requirements for a Power Platform project](https://www.apprising.co.nz/post/gathering-defining-power-platform-requirements?utm_campaign=Power%20Platform%20Developers%20Weekly&utm_medium=email&utm_source=Revue%20newsletter)

### Certifications
+ [List of MS Certs](https://query.prod.cms.rt.microsoft.com/cms/api/am/binary/RE2PjDI)
