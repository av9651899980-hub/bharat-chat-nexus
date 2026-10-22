# BharatChat launch animation

- Replace the current rings-and-skip intro with a nine-second deep-navy sequence: sparse gold/cyan particles, restrained metallic light sweep, centered BharatChat branding and “INDIA’S TRUSTED PLATFORM”, then dissolve into the existing app.
- Remove all skip controls and Escape dismissal. Play on each fresh page launch, not navigation; reduced motion shows a brief static brand/fade.
- Preserve authentication, messaging, roles and all existing routes.

## Asset assumption
The reference video and approved tricolor/Ashoka Chakra emblem are not currently available in the upload mounts or listed project assets. Use the existing BharatChat wordmark without inventing an emblem; exact logo/reference matching remains blocked until those assets are supplied.

## Technical details
Keep the root-mounted CSS-only overlay, use transforms/opacity and existing semantic tokens, and replace persistent seen storage with root-lifetime state. Update intro timing tests and verify desktop/mobile launch, navigation, reduced motion and authenticated dashboard when an authorized session is available. Check preview build diagnostics without deploying.