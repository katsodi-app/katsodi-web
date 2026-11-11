---
title: "Microphone Check"
type: feature
status: implemented
created: 2026-11-03
updated: 2026-11-03
tags: [katsodi/feature, katsodi/voice]
---

# Microphone Check

> English · [[docs/Features/Microphone Check|Russian original]]

## Purpose

Check the device and browser permission before connecting LiveKit — [[docs/en/Features/Voice Chat]]. Also works when the voice server is unavailable.

## Users and roles

Available to shared-room members before a call. This local test does not create a voice session or change membership/server permissions.

## User journeys

Open Test microphone, explicitly press Start test, allow audio and speak. The bar shows relative signal level. After permission, choose an audioinput; changing devices stops the test and requires another explicit start. The in-memory choice is used when subsequently joining voice.

## Behavior

Opening the panel does not request microphone access. Only explicit start invokes getUserMedia with audio and video=false. No speaker monitoring, recording, forwarding or audio storage. Calls still start with the microphone off. Closing the panel, joining voice, leaving/hiding the page and a 30-second timer release the device. Streams arriving after permission cancellation are immediately stopped. Application code cannot guarantee closing the browser permission dialog.

## Interface and states

Collapsible Katsodi-themed panel, device selection, accessible 0–100 meter, idle/requesting/active/error states, start/cancel/stop buttons and RU/EN. Errors: denied permission, missing/disconnected or busy microphone, unavailable deviceId, unsupported browser/insecure origin. The working application does not simulate level readings.

## Implementation

MicrophoneTest manages getUserMedia and an AudioContext with no destination connection. AnalyserNode reads time-domain samples; RMS becomes a bounded relative level every 100ms. This is not a calibrated dB/SPL meter. An epoch protects against late permission after cancellation; stop ends all tracks, closes AudioContext and clears timers. The React panel frees resources on unmount, visibilitychange and pagehide. The controller has no recording or network calls.

## Data and access

No database, LiveKit, keys or migrations. Device IDs/levels remain in page memory, not localStorage or analytics. Device lists appear after browser permission.

## Security and privacy

Requires HTTPS or localhost and Web Audio/getUserMedia. The browser/OS may retain permission after stopping; stop ends capture but does not revoke site permission. The test does not prove another participant can hear audio or that the SFU is available.

## Acceptance criteria

Unit: RMS, audio-only constraints, automatic stop, cancellation with a late stream, device loss, error classification and unsupported context. Browser: opening without capture, synthetic Web Audio measurement, stop before call, late permission and RU/EN errors. Automation does not use the user's actual microphone. Results: [[docs/en/Verification]].

## Limitations and next steps

The test measures device input, not networking/TURN, another client's echo cancellation or actual call acoustics. Live voice-server acceptance remains in [[docs/en/Voice Setup]].

## Sources

- [MediaStreamTrack.stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop).
- [AnalyserNode.getFloatTimeDomainData](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData).

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Voice Chat]]
- [[docs/en/Voice Setup]]
- [[docs/en/Verification]]
