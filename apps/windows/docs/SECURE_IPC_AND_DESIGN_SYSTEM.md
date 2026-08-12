# Secure IPC and Design System — 0.6.0

This milestone hardens the renderer/main boundary and introduces the first reusable visual language.

## Security
- Renderer receives only a frozen `contextBridge` API.
- Every IPC request validates sender and payload size.
- Receipt input is parsed again in the main process.
- Every response uses a typed success/failure envelope.
- Long-running calls have a safe timeout.

## Design System
- Shared color, radius, shadow and spacing tokens.
- Reusable button, statistic card, status badge, empty state and toast patterns.
- RTL-first dashboard layout.
- Keyboard focus indicators.
- Responsive desktop layout.

This remains a development foundation. The next milestone is the real receipt form and onboarding flow.
