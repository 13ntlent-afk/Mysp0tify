# Azure Static Web App + Azure Cosmos DB — First Deployment Guide

This focused guide walks through a first-time deployment of a static web application to Azure Static Web Apps with an Azure Cosmos DB (SQL API) backend. It covers installation of local dependencies, Azure CLI usage, resource group creation, GitHub integration, provisioning of a Static Web App, provisioning Cosmos DB, wiring secrets, and doing a first deployment using GitHub Actions.

Target audience: Developers deploying a Node-based static site (React, Vite, Angular, or vanilla) that may use Azure Functions for the server-side work that interacts with Cosmos DB.

Contents
- Prerequisites and local setup
- Create resource group
- Provision Cosmos DB (SQL API): account, database, container
- Create Azure Static Web App and GitHub integration
- Configure secrets / app settings
- Deploy and verify
- Example Azure Function code snippet
- Troubleshooting and tips

---

Prerequisites

- Azure subscription (active)
- GitHub repository containing your app
- Local dev machine with:
  - Git
  - Node.js (LTS) and npm or yarn
  - Azure CLI (az)
  - (Optional) Azure Static Web Apps CLI: npm i -g @azure/static-web-apps-cli

Verify tools:

  node --version
  npm --version
  git --version
  az version

Login and subscription selection

  az login
  az account list --output table
  az account set --subscription "<SUBSCRIPTION-NAME-OR-ID>"

Choose names and variables (pick values and reuse them):

  $RG = "rg-spotify-web"
  $LOCATION = "eastus"
  $COSMOS = "myspotifycosmos"          # globally unique
  $DB = "myspotify-db"
  $CONTAINER = "subscriptions"
  $SWA = "swa-spotify-web"             # unique name for Static Web App
  $BRANCH = "main"
  $APP_LOCATION = "/"                  # or folder where package.json lives
  $API_LOCATION = "api"                # where Azure Functions code lives, if any
  $OUTPUT_LOCATION = "build"           # build folder (create-react-app) or dist

1) Create resource group

  az group create --name $RG --location $LOCATION

2) Create Azure Cosmos DB (SQL API)

- Create the account (Core/SQL API):

  az cosmosdb create \
    --name $COSMOS \
    --resource-group $RG \
    --kind GlobalDocumentDB \
    --locations regionName=$LOCATION \
    --default-consistency-level Session

- Create the database:

  az cosmosdb sql database create \
    --account-name $COSMOS \
    --resource-group $RG \
    --name $DB

- Create a container (choose partition key carefully):

  az cosmosdb sql container create \
    --account-name $COSMOS \
    --resource-group $RG \
    --database-name $DB \
    --name $CONTAINER \
    --partition-key-path "/email" \
    --throughput 400

- Fetch the primary connection string (save it for later):

  az cosmosdb keys list \
    --name $COSMOS \
    --resource-group $RG \
    --type connection-strings \
    --query "connectionStrings[0].connectionString" -o tsv

Note: For production, prefer using managed identities or Azure RBAC where possible; do not embed primary keys in client-side code.

3) Prepare your repo for Static Web Apps

- Ensure repo has a build command and an output folder. Typical examples:
  - Create React App: "build" -> build/
  - Vite: "build" -> dist/
  - If your site is static without a build step, set app location to root and output location empty.

- If you have server-side functionality, add an Azure Functions project in the repository under the $API_LOCATION (e.g., api/).
  - The Functions project should read the connection string from environment: process.env.COSMOSDB_CONNECTION_STRING

- Confirm your app works locally and builds:

  npm install
  npm run build

4) Create Static Web App and integrate with GitHub

Option A — Use Azure Portal (GUI)
- Portal: Create a Static Web App -> sign into GitHub when prompted -> choose repository and branch -> set App location, API location (if any), and Output location -> Create.
- The portal will create a GitHub Actions workflow in your repo automatically which deploys on push.

Option B — Use Azure CLI

  az staticwebapp create \
    --name $SWA \
    --resource-group $RG \
    --source https://github.com/<GITHUB_USER_OR_ORG>/<REPO> \
    --branch $BRANCH \
    --app-location "$APP_LOCATION" \
    --api-location "$API_LOCATION" \
    --output-location "$OUTPUT_LOCATION"

Notes on the CLI approach:
- The CLI may open a browser to authenticate GitHub so it can create the workflow and a deployment token. Follow the prompts.
- The created GitHub Actions workflow (in .github/workflows/) will contain the build and deploy steps for Static Web Apps.

5) Add Cosmos DB connection string as secret (GitHub) or application setting (Static Web App)

- Option: Add as a **GitHub Actions secret** named e.g. COSMOSDB_CONNECTION_STRING (if your workflow needs to build artifacts referencing the string or to deploy functions with settings). Steps:
  - Repo -> Settings -> Secrets and variables -> Actions -> New repository secret
  - Name: COSMOSDB_CONNECTION_STRING
  - Value: (paste connection string from step 2)

- Alternative: Add as a Static Web App "Configuration" (portal) so the Functions runtime receives it as an environment variable. In Azure Portal -> Static Web App -> Configuration -> Add -> Name: COSMOSDB_CONNECTION_STRING, Value: <connection string>

6) Example: Azure Function using @azure/cosmos

- In api/ folder, install SDK:
  - cd api
  - npm init -y (if needed)
  - npm install @azure/cosmos

- Example function (index.js):

  const { CosmosClient } = require('@azure/cosmos');

  module.exports = async function (context, req) {
    const connStr = process.env.COSMOSDB_CONNECTION_STRING;
    if (!connStr) {
      context.log('Missing COSMOSDB_CONNECTION_STRING');
      context.res = { status: 500, body: 'Server config error' };
      return;
    }

    const client = new CosmosClient(connStr);
    const database = client.database(process.env.COSMOS_DB_NAME || '$DB');
    const container = database.container(process.env.COSMOS_CONTAINER_NAME || '$CONTAINER');

    // Simple query example:
    const { resources } = await container.items.query({ query: 'SELECT * FROM c OFFSET 0 LIMIT 10' }).fetchAll();

    context.res = {
      status: 200,
      body: resources
    };
  };

- Add environment variable names used in the function to portal Configuration or pass them via GitHub secrets if your workflow writes them to application settings.

7) Deploy via GitHub Actions

- If you used the Azure Portal to create the Static Web App, the workflow file is already created and present under .github/workflows/.
- Push a commit to the configured branch (e.g., main) to trigger the workflow:

  git add .
  git commit -m "Prepare Azure Static Web Apps deployment"
  git push origin main

- Check the Actions tab in GitHub for the deployment run.

8) Verify deployment

- In Azure Portal, open the Static Web App resource -> Overview -> click the generated URL. It should serve your site.
- API endpoints (if present) are under the same domain: https://<app>.azurestaticapps.net/api/<function>
- Confirm your function reads from Cosmos DB and returns expected data.

9) Post-deploy recommendations

- Do not expose the Cosmos DB primary key to client code. Always access Cosmos DB from server-side code (Functions) or via a secure backend.
- Configure alerts and monitoring for Cosmos DB RU/s usage and errors.
- Consider using serverless (autoscale) or manual throughput based on workload.
- If data privacy is a concern, set network restrictions on Cosmos DB (e.g., private endpoints or IP firewall rules).

10) Quick reference CLI summary (replace variables)

  az login
  az account set --subscription "<SUBSCRIPTION>"
  az group create --name rg-spotify-web --location eastus

  az cosmosdb create --name myspotifycosmos --resource-group rg-spotify-web --kind GlobalDocumentDB --locations regionName=eastus

  az cosmosdb sql database create --account-name myspotifycosmos --resource-group rg-spotify-web --name myspotify-db

  az cosmosdb sql container create --account-name myspotifycosmos --resource-group rg-spotify-web --database-name myspotify-db --name subscriptions --partition-key-path "/email" --throughput 400

  az cosmosdb keys list --name myspotifycosmos --resource-group rg-spotify-web --type connection-strings --query "connectionStrings[0].connectionString" -o tsv

  az staticwebapp create --name swa-spotify-web --resource-group rg-spotify-web --source https://github.com/<org>/<repo> --branch main --app-location "/" --api-location "api" --output-location "build"

11) Troubleshooting

- GitHub Actions fails to create the deployment: ensure GitHub OAuth consent completed when creating the Static Web App and that the repository allows actions to write workflow files.
- Functions return 500: check COSMOSDB_CONNECTION_STRING is correctly set in portal Configuration or available as an environment variable to Functions.
- Cosmos SDK errors: confirm DB/container names and partition key path match in code and in the CLI-created resources.

If you want, next steps can be:
- Add a sample Azure Function file to this repo that queries Cosmos DB and expose one API endpoint, and
- Add or adapt the GitHub Actions workflow file to include application settings from repository secrets.

---

References
- Azure Static Web Apps documentation: https://learn.microsoft.com/azure/static-web-apps/
- Azure Cosmos DB documentation: https://learn.microsoft.com/azure/cosmos-db/
- Azure CLI documentation: https://learn.microsoft.com/cli/azure/
