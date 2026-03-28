# Phase 02 User Setup

Status: Incomplete

## ViolentMonkey

Why: Venice bridge automation requires a local browser userscript.

### Checklist
- Install ViolentMonkey or an equivalent userscript extension in the browser used for local testing.
- Install or update the Venice bridge userscript from `https://b-althazard.github.io/vixenlabs_cx/vixenlabs-venice-bridge.user.js` or use the in-app `Install Bridge Script` button.
- Confirm the extension is enabled for the same browser profile used by this app.

## Venice

Why: The bridge can only automate a browser session that is already authenticated.

### Checklist
- Open `https://venice.ai/` in the same browser profile used for local testing.
- Sign in before starting a generation from Vixen Labs CX.
- Keep a Venice tab visible when the bridge reports a visibility wait or recovery state.

## Verification
- Open the app locally and confirm the prompt panel no longer shows a bridge unavailable warning.
- Start a generation and confirm the latest job moves from queued to running when the bridge is active.
