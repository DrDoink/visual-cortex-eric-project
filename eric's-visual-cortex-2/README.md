# Eric's Visual Cortex (Multimodal Prototype)

## Overview
**Eric's Visual Cortex** is a Multimodal React application. It acts as the visual reasoning center for an ElevenLabs Conversational Agent. 

The system runs two parallel processes:
1.  **Vision Loop:** Periodically captures webcam frames, processes them with Google Gemini Flash 2.0, and extracts visual context.
2.  **Voice Loop:** Maintains a real-time conversational session with an ElevenLabs Agent.

A "Passive Bridge" connects the two: when Gemini detects a visual change, it silently pushes the observation into the ElevenLabs agent's context window, allowing the voice agent to "see" and react dynamically.

## ⚠️ Security & Configuration
**IMPORTANT:** This is a public repository.
*   **NEVER** hardcode your API Keys.
*   The application uses `process.env`.
*   Ensure the following environment variables are set:
    *   `API_KEY` (Google Gemini API Key)
    *   `AGENT_ID` (ElevenLabs Agent ID)

## Technical Specifications

### 1. Vision Stack
- **Model:** `gemini-3-flash-preview`
- **Resolution:** 512px width (Resized via Canvas).
- **Format:** JPEG (0.8 quality).
- **Prompt Persona:** "Visual Observer" (Short, dry, factual).

### 2. Voice Stack
- **Provider:** ElevenLabs Conversational AI SDK (`@11labs/client`).
- **Interaction:** Real-time bi-directional voice.
- **Bridge Method:** `conversation.sendContextualUpdate(text)`.

### 3. The Bridge Loop
- **Interval:** 4000ms.
- **Logic:**
  1. Capture Frame.
  2. Send to Gemini (Context: Current + Previous Frame).
  3. If Gemini returns `NO_CHANGE` -> Do nothing.
  4. If Gemini returns new observation -> Log visual event.
  5. **IF** Voice Agent is `CONNECTED`:
     *   Call `sendContextualUpdate` with the observation.
     *   Log `[BRIDGE]` event.

## Architecture

### Components
*   **`App.tsx`**: Orchestrates the dual-loop system (Vision Interval + Voice Session).
*   **`components/LiveFeed.tsx`**: Webcam management and frame extraction.
*   **`components/Terminal.tsx`**: Displays system logs, including distinct visual observations and bridge events.
*   **`services/geminiService.ts`**: Handles the Gemini API interaction.

## Changelog
*   **v3.1:**
    *   Implemented robust error classification for Gemini API calls (Rate limits, Safety blocks, Network issues, Service Overload).
*   **v3.0 (Multimodal):**
    *   Integrated ElevenLabs SDK.
    *   Implemented "Passive Bridge" for context injection.
    *   Added `AGENT_ID` requirement.
    *   UI updated to show Voice connection status.
*   **v2.1:**
    *   Security hardening.
*   **v2.0:**
    *   Vision optimization (4s interval, 512px, context comparison).
