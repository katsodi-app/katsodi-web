---
title: "Room Studio"
type: feature
status: implemented
created: 2026-11-09
updated: 2026-11-10
tags: [katsodi/feature, katsodi/ui, katsodi/rooms]
---
# Adjustable rooms and creation

> English · [[docs/Features/Room Studio|Russian original]]

## Why
Give the stage and conversation more flexible space, improve creation and distinguish music rooms.

## Users and roles
Layout is a preference of the current visitor. Existing permissions control server membership, sources and media. Local rooms remain local drafts.

## User journeys
Wide screens support dragging the separator, moving panels by their grip, undocking, resizing floating panels, placing conversation left or right, minimizing, expanding and resetting. Layout survives entering/exiting fullscreen until navigation. Narrow screens stack the panels.

## Behavior
Media keep the same DOM parents and do not remount during layout changes. Floating panels stay inside the room. Arrow keys move and resize a panel; the separator also supports Home and End. Minimized contents leave keyboard focus. Fullscreen demo tools unfold from an edge handle and tuck away after choosing a tool.

## Interface and states
Demo comes first among available stages. Music rooms keep demo and a music player, queue/platform guidance, and omit Website and shared Browser. Format cards show existing fandom and catalogue album artwork. Creation preview follows the form. Fandom is optional; unassociated rooms display Other.

The docked display window supports width/height resizing from its bottom-right corner. Display window size accepts pixel dimensions; Fit to window restores automatic sizing. Sizes are bounded by the room and the same iframe stays mounted. Manually sized windows use the edge tool drawer in normal mode too, leaving more height for the demo. Short fullscreen viewports and browser zoom use compact headings/spacing and an exit button in the room bar, keeping the demo shell within the viewport. Long external sites scroll inside their iframe.

## Implementation
Expand with chat in the demo header expands the room and fills the stage area, hiding its pane handle and source switcher. Panes dock and a hidden or minimized conversation returns in its own column. Current-tab presenters use the in-page fullscreen layout; viewers and presenters before capture use the room's Fullscreen API. If the room was already fullscreen, restoring the demo leaves the room fullscreen. Native fullscreen is enabled again for the demo iframe and nested players: the source player can fill the screen as before. Katsodi's Expand with chat / Normal view with chat control remains independent and does not replace the external player's fullscreen button.

The tool drawer opens from the left while conversation is docked right. Moving conversation left mirrors the tools to the right. Hidden tools do not intercept chat interaction; selecting a tool in fullscreen closes the list. See [[docs/en/Features/Link Demo]].

RoomLayout changes CSS grid, sizes and coordinates of stable panes. room-studio.css contains adaptive layout, edge tools and styling. prepare-room-palettes.mjs extracts three colors from local artwork into JSON palettes. Reduced-motion disables iridescent animation. Russian tags wrap inside their cards.

## Data and access
Migration 20261109002400_optional_room_fandom.sql allows null fandom in public create_room calls. It preserves verified_user, advisory locking, the 20-room limit, foreign keys, owner membership and RPC grants. Other describes a missing association rather than an invented fandom.

## Security and privacy
No additional keys, access grants or external mutations. Capture still requires the browser picker and existing cropping. Album artwork uses the existing catalogue CDN. Minimizing keeps application state.

## Acceptance criteria
Unit covers optional fandom on both boundaries and database authorization/limits. Playwright covers movement, resizing, minimization, tools, demo continuity, creation without a fandom and Russian tags. Results and screenshots: [[TASKS]].

## Limits and next steps
Server creation without a fandom needs migration 24 applied. Local development does not automatically publish it to a remote database. Narrow screens stack panes; free movement targets wide screens. Positions are not persisted across reloads.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Platform UX]]
- [[docs/en/Features/Link Demo]]
- [[docs/en/Features/Music Player]]
