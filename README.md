# Slack External Contacts

A Slack app to associate external contacts with slack posts.

## Development Setup

1. Create a new slack app at https://api.slack.com/apps.
1. Use a service such as ngrok to setup a tunnel to your http://localhost:9000.
1. Turn on `Interactivity & Shortcuts`.
1. Add https://yourdomain.ngrok.io/slack/events (replace with your tunnel url) to the Request URL and Options Load URL fields.
1. Setup a shortcut with the Callback ID `record_contact`.
1. Add a `/contacts` slack command (with the same tunnel url as above).
1. Add a `/organisation` slack command (with the same tunnel url as above).
1. Add the following permissions: `chat:write`, `commands`, `incoming-webhook`, `reactions:write`
1. Copy `.env.example` to `.env` (or set env variables) and copy environment variables from slack app setup.
1. Run `nodemon npm run dev`
