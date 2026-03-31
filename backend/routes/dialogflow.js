const express = require('express');
const router = express.Router();
const dialogflow = require('@google-cloud/dialogflow');
const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');

const resolveCredentialsPath = (credentialsPath) => {
  if (!credentialsPath) {
    return null;
  }

  if (path.isAbsolute(credentialsPath)) {
    return credentialsPath;
  }

  return path.resolve(backendRoot, credentialsPath);
};

// project id from your Dialogflow agent (can also be set via env var)
let projectId = process.env.DF_PROJECT_ID;
const credentialsPath = resolveCredentialsPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);

// if DF_PROJECT_ID isn't provided explicitly, and we have a credentials file,
// try to infer from it.
if (!projectId && credentialsPath) {
  try {
    const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    if (creds && creds.project_id) {
      projectId = creds.project_id;
      console.log('inferred projectId from credentials file:', projectId);
    }
  } catch (e) {
    console.warn('unable to read project_id from credentials file', e);
  }
}

if (!projectId) {
  console.error('DF_PROJECT_ID environment variable is not set and could not be inferred');
}


// the client will automatically pick up the credentials pointed to by
// GOOGLE_APPLICATION_CREDENTIALS environment variable.  make sure the
// JSON key you downloaded (wise-logic-485115-d5-b4e5ffc115bb.json) is
// available on the server and that you set:
//
//   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/wise-logic-485115-d5-b4e5ffc115bb.json"
//
// set DF_PROJECT_ID to the numeric project id (not the display name) or
// you may hard‑code it here if you prefer.

let sessionClient;

// attempt to construct client using explicit keyFilename to avoid relying on
// environment discovery. this matches the snippet you provided.
if (credentialsPath) {
  if (!fs.existsSync(credentialsPath)) {
    console.error(`Dialogflow credentials file not found at ${credentialsPath}`);
  } else {
    try {
      sessionClient = new dialogflow.SessionsClient({
        keyFilename: credentialsPath
      });
      console.log('created Dialogflow SessionsClient with keyFilename', credentialsPath);
    } catch (err) {
      console.error('failed to create dialogflow session client', err);
    }
  }
} else {
  console.error('GOOGLE_APPLICATION_CREDENTIALS not set');
}

router.post('/', async (req, res) => {
  const { message, sessionId, intentName } = req.body;
  console.log('Dialogflow hit, message="' + message + '", sessionId=' + sessionId + ', intentName=' + intentName);

  if (!projectId) {
    // this should never happen if process.env is configured correctly
    console.error('DF_PROJECT_ID is missing, cannot send request');
    return res.status(500).json({ error: 'Server misconfiguration: DF_PROJECT_ID not set' });
  }

  if (!sessionClient) {
    console.error('sessionClient not initialized');
    return res.status(500).json({ error: 'Dialogflow client unavailable' });
  }

  if (!message && !intentName) {
    console.warn('Dialogflow request missing fields');
    return res.status(400).json({ error: 'message or intentName is required' });
  }

  try {
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
    
    let request;
    
    // If intentName is provided, we'll try to set it as the query result
    // Otherwise, use normal text input
    if (intentName) {
      // For direct intent triggering, we still need to send text
      // but we can include parameters in the queryInput
      request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: message || `trigger ${intentName}`,
            languageCode: 'en-US'
          }
        },
        // Include queryParameters to help route to specific intent
        queryParams: {
          parameters: {
            intentTrigger: intentName
          }
        }
      };
    } else {
      request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: message,
            languageCode: 'en-US'
          }
        }
      };
    }

    const responses = await sessionClient.detectIntent(request);
    console.log('detectIntent returned', responses.length, 'items');
    const result = responses[0].queryResult;
    console.log('intent=', result.intent?.displayName, 'fulfillment=', result.fulfillmentText);
    res.json({
      text: result.fulfillmentText,
      intent: result.intent?.displayName || null,
      parameters: result.parameters
    });
  } catch (err) {
    console.error('Dialogflow request failed', err);
    res.status(500).json({
      error: 'Dialogflow request failed',
      details: err.message
    });
  }
});

module.exports = router;
