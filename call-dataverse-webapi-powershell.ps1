<#
	.SYNOPSIS 
    Connect to Dataverse and run Custom API Function

	.NOTES      
    Author     : Richard Wilson
    
    .PARAMETER $oAuthTokenEndpoint
    The v2 OAuth endpoint for the App registration. This can be found by opening the App registation and 
    clicking the Endpoints button in the Overview area.  Copy the OAuth 2.0 token endpoint (v2) url.
    
    .PARAMETER $appId
    The Application (client) ID of the App registration

    .PARAMETER $clientSecret
    The client secret generated within the App registration

    .PARAMETER $dataverseEnvUrl
    The url of the Dataverse environment you want to connect to
#>

param
(
    [string] $oAuthTokenEndpoint = 'https://login.microsoftonline.com/{YourTenantId}/oauth2/v2.0/token',
    
    [string] $appId = 'xxxxxxxxxx',
    
    [string] $clientSecret = 'xxxxxxxxxxx',
    
    [string] $dataverseEnvUrl = 'https://{YourEnvironmentId}.crm.dynamics.com'
)

##########################################################
# Access Token Request
##########################################################

# OAuth Body Access Token Request
$authBody = 
@{
    client_id = $appId;
    client_secret = $clientSecret;    
    # The v2 endpoint for OAuth uses scope instead of resource
    scope = "$($dataverseEnvUrl)/.default"    
    grant_type = 'client_credentials'
}

# Parameters for OAuth Access Token Request
$authParams = 
@{
    URI = $oAuthTokenEndpoint
    Method = 'POST'
    ContentType = 'application/x-www-form-urlencoded'
    Body = $authBody
}

# Get Access Token
$authRequest = Invoke-RestMethod @authParams -ErrorAction Stop
$authResponse = $authRequest

##########################################################
# Call Dataverse WebAPI using Authentication Token
##########################################################

# Params related to the Dataverse WebAPI call you will be making.
# These need to be in single quotes to ensure they are not expanded.
$uriParams = '$top=5&$select=fullname'

# Parameters for the Dataverse WebAPI call which includes our header
# that carries the access token.
$apiCallParams =
@{
    URI = "$($dataverseEnvUrl)/api/data/v9.1/contacts?$($uriParams)"
    Headers = @{
        "Authorization" = "$($authResponse.token_type) $($authResponse.access_token)" 
    }
    Method = 'GET'
}

# Call the Dataverse WebAPI
$apiCallRequest = Invoke-RestMethod @apiCallParams -ErrorAction Stop
$apiCallResponse = $apiCallRequest

#Output the results
Write-Host $apiCallResponse.value
