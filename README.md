# Visual Reasoning Connector for ElevenLabs Conversational Agents (Alpha 0.2)

## Overview
This application serves as a **Visual Reasoning Connector** for ElevenLabs Conversational Agents. It bridges the gap between visual perception and voice interaction by enabling a digital agent to "see" and react to its environment in real-time.

The system operates two parallel processes:
1.  **Vision Loop:** Periodically captures frames from the user's webcam and processes them using **Google Gemini Flash 2.0** to extract visual context.
2.  **Voice Loop:** Maintains a real-time conversational session with an **ElevenLabs Agent**.

A "Passive Bridge" connects these distinct loops. When the Gemini model detects a significant visual change, it silently injects the observation into the ElevenLabs agent's context window. This allows the voice agent to perceive and react to its environment dynamically without explicit verbal prompting.

## Security & Configuration
**Important:** This is a client-side application.
*   **Do not** hardcode your API Keys in the source code.
*   The application utilizes `process.env` for configuration.
*   Ensure the following environment variables are set in your `.env` file or deployment environment:
    *   `GEMINI_API_KEY` (Google Gemini API Key)
    *   `AGENT_ID` (ElevenLabs Agent ID)

## Technical Specifications (Alpha 0.2)

### 1. Vision Stack
- **Model:** `gemini-3-flash-preview`
- **Resolution:** 512px width (Resized via Canvas).
- **Format:** JPEG (0.8 quality).
- **Prompt Strategy:** "Visual Observer" (Detailed visual descriptions focused on changes).

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
*   **`App.tsx`**: Orchestrates the dual-loop system (Vision Interval + Voice Session).
*   **`components/LiveFeed.tsx`**: Manages webcam access, frame extraction, and strict ready-state gating.
*   **`components/Terminal.tsx`**: Displays system logs, differentiating between visual observations and bridge events.
*   **`services/geminiService.ts`**: Handles interactions with the Gemini API.

## Changelog
*   **Alpha 0.2:**
    *   Renamed project to "Visual Reasoning Connector".
    *   Cleaned repository structure.
    *   Updated Gemini prompt for more vivid visual descriptions.
*   **Alpha 0.1 (Formerly v3.4):**
    *   Stability Milestone: Zero-latency startup fix.
    *   Unified Voice/Visual conversation state management.
    *   Implemented "Passive Bridge" for context injection.
