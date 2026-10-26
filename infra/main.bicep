@description('Azure region for all resources.')
param location string = 'eastus'

@description('Password for the PostgreSQL administrator. Must meet Azure complexity rules.')
@secure()
param postgresPassword string

@description('Secret used to sign login cookies.')
@secure()
param authSecret string

@description('Secret required by the weekly group job.')
@secure()
param cronSecret string

@description('Availability zone for the database server.')
param postgresZone string = '1'

var suffix = uniqueString(resourceGroup().id)
var postgresName = 'fs-pg-${suffix}'
var postgresAdmin = 'fsadmin'
var storageName = toLower('fs${suffix}')
var planName = 'fs-plan-${suffix}'
var webName = 'fs-web-${suffix}'
var logicName = 'fs-cron-${suffix}'
var postgresHost = '${postgresName}.postgres.database.azure.com'
var databaseUrl = 'postgresql://${postgresAdmin}:${uriComponent(postgresPassword)}@${postgresHost}:5432/friendspace?sslmode=require'

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdmin
    administratorLoginPassword: postgresPassword
    availabilityZone: postgresZone
    storage: {
      storageSizeGB: 32
      autoGrow: 'Disabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'friendspace'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource allowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource photos 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'photos'
  properties: {
    publicAccess: 'None'
  }
}

var storageConnection = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource web 'Microsoft.Web/sites@2023-12-01' = {
  name: webName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appCommandLine: 'node server.js'
      alwaysOn: true
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'DATABASE_URL'
          value: databaseUrl
        }
        {
          name: 'AUTH_SECRET'
          value: authSecret
        }
        {
          name: 'CRON_SECRET'
          value: cronSecret
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: storageConnection
        }
        {
          name: 'AZURE_STORAGE_CONTAINER'
          value: 'photos'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
      ]
    }
  }
  dependsOn: [
    database
    allowAzure
    photos
  ]
}

resource logic 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicName
  location: location
  properties: {
    state: 'Enabled'
    definition: {
      '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion: '1.0.0.0'
      parameters: {}
      triggers: {
        daily: {
          type: 'Recurrence'
          recurrence: {
            frequency: 'Day'
            interval: 1
            timeZone: 'UTC'
            schedule: {
              hours: [
                8
              ]
              minutes: [
                0
              ]
            }
          }
        }
      }
      actions: {
        Post_groups: {
          type: 'Http'
          inputs: {
            method: 'POST'
            uri: 'https://${web.properties.defaultHostName}/api/cron/groups'
            headers: {
              Authorization: 'Bearer ${cronSecret}'
            }
          }
        }
      }
      outputs: {}
    }
  }
}

output webAppName string = web.name
output webAppUrl string = 'https://${web.properties.defaultHostName}'
output postgresHost string = postgresHost
output storageAccountName string = storage.name
output logicAppName string = logic.name
