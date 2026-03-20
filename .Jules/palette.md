## 2025-05-14 - Keyboard-Driven Form Submission Pattern
**Learning:** Modern desktop applications often miss standard keyboard interactions like pressing "Enter" to submit a form when high-level bindings are manually implemented. GTK provides `activates-default` and `default-widget` properties specifically for this.
**Action:** Always ensure `setActivatesDefault(true)` is called on primary entry fields and `setDefaultWidget(button)` is set on the window's primary action button to maintain user expectations for keyboard accessibility.
