## 2025-05-15 - [Suggested Actions and Keyboard Activation]
**Learning:** In GTK applications, users expect primary actions to be visually distinct (using `suggested-action` CSS class) and forms to be keyboard-accessible (pressing Enter in an entry should trigger the primary action).
**Action:** Always provide helper methods for standard action styles and ensure `onActivate` is connected for primary form entries.
