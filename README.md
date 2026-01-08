# Eric's Visual Cortex (Multimodal Prototype)

## Overview
**Eric's Visual Cortex** is a multimodal React application designed to serve as the visual reasoning center for an ElevenLabs Conversational Agent.

The system operates two parallel processes:
1.  **Vision Loop:** Periodically captures frames from the user's webcam, processes them using Google Gemini Flash 2.0 to extract visual context.
2.  **Voice Loop:** Maintains a real-time conversational session with an ElevenLabs Agent.

A "Passive Bridge" connects these distinct loops. When the Gemini model detects a significant visual change, it silently injects the observation into the ElevenLabs agent's context window. This allows the voice agent to perceive and react to its environment dynamically without explicit verbal prompting.

## Security & Configuration
**Important:** This is a public repository.
*   **Do not** hardcode your API Keys.
*   The application utilizes `process.env` for configuration.
*   Ensure the following environment variables are set in your `.env` file or deployment environment:
    *   `GEMINI_API_KEY` (Google Gemini API Key)
    *   `AGENT_ID` (ElevenLabs Agent ID)

## Technical Milestone: Version 3.3 (Build Stability)

**The Challenge**
We encountered a critical initialization failure caused by an architecture conflict between browser-native module loading (`importmap`) and the Vite bundler. The application attempted to load dependencies from external CDNs while compiled code expected local bundles, resulting in version mismatches and runtime crashes.

**The Solution**
To resolve this, the `importmap` was removed entirely. The project now relies strictly on `vite.config.ts` and `package.json` for deterministic dependency resolution.

## Technical Specifications

### 1. Vision Stack
- **Model:** `gemini-3-flash-preview`
- **Resolution:** 512px width (Resized via Canvas).
- **Format:** JPEG (0.8 quality).
- **Prompt Persona:** "Visual Observer" (Short, dry, factual).

### 2. Voice Stack
- **Provider:** ElevenLabs Conversational AI React SDK (`@elevenlabs/react`).
- **Interaction:** Real-time bi-directional voice.
- **Bridge Method:** `conversation.sendContextualUpdate(text)`.

### 3. The Bridge Loop
- **Interval:** 4000ms.
- **Logic Sequence:**
  1. Capture Frame.
  2. Send to Gemini (Context: Current + Previous Frame).
  3. If Gemini returns `NO_CHANGE`, no action is taken.
  4. If Gemini returns a new observation, the visual event is logged.
  5. If the Voice Agent is `CONNECTED`, `sendContextualUpdate` is called with the observation.

## Architecture

### Components
*   **`App.tsx`**: Orchestrates the dual-loop system (Vision Interval + Voice Session) using the `useConversation` hook.
*   **`components/LiveFeed.tsx`**: Manages webcam access and frame extraction.
*   **`components/Terminal.tsx`**: Displays system logs, differentiating between visual observations and bridge events.
*   **`services/geminiService.ts`**: Handles interactions with the Gemini API.

## Changelog
*   **v3.3:**
    *   Removed `importmap` to resolve conflict with Vite bundler.
    *   Fixed `process.env` polyfills for browser runtime.
    *   Stabilized React 18.2.0 dependencies.
*   **v3.2:**
    *   Migrated from deprecated `@11labs/client` to official `@elevenlabs/react` SDK.
    *   Updated build configuration to inject environment variables via Vite.
    *   Refactored `App.tsx` to use `useConversation` hook.
*   **v3.1:**
    *   Implemented robust error classification for Gemini API calls (Rate limits, Safety blocks, Network issues).
*   **v3.0 (Multimodal):**
    *   Integrated ElevenLabs SDK.
    *   Implemented "Passive Bridge" for context injection.
    *   Added `AGENT_ID` requirement.
    *   UI updated to show Voice connection status.
*   **v2.1:**
    *   Security hardening.
*   **v2.0:**
    *   Vision optimization (4s interval, 512px, context comparison).