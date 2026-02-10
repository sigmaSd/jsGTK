# Gemini GTK: API & Type Safety Improvements

This document outlines the missing architectural pieces in the current codebase
and provides a roadmap for implementing a robust, type-safe, and memory-managed
GObject wrapper system.

## 1. Runtime Type Identification (The Registry) ! Maybe

### The Problem

Currently, many methods (like `Builder.get` or `box.getFirstChild`) return
generic `Widget` or `GObject` instances. Developers must manually cast these to
the correct subclass (e.g., `Button`), which is error-prone and doesn't support
`instanceof` checks.

### The Solution

Implement a **Class Registry** that maps GTK C-type names (e.g., `GtkButton`) to
TypeScript constructors.

- **`GObject.register(name, constructor)`**: A static method to populate the
  registry.
- **`GObject.fromPtr<T>(ptr)`**: A static factory method that:
  1. Queries the pointer's GType name using `g_type_name_from_instance`.
  2. Looks up the constructor in the registry.
  3. Returns the existing wrapper (via a `WeakMap` cache) or creates a new,
     specific subclass instance.

---

## 2. Type-Safe Signals and Properties ! Seems a good idea

### The Problem

`connect` and `setProperty` currently use strings and `any`, providing no
autocompletion or compile-time validation.

### The Solution

Use **TypeScript Generics** and **Mapped Types** in the base `GObject` class.

- **Signal Interfaces**: Define interfaces for each widget's signals.
- **Property Interfaces**: Define interfaces for each widget's properties.
- **Generic Constraints**:
  ```typescript
  class GObject<S extends GObjectSignals, P extends GObjectProperties> {
    connect<K extends keyof S>(signal: K, callback: S[K]): number;
    setProperty<K extends keyof P>(name: K, value: P[K]): void;
  }
  ```

---

## 3. Automatic Memory Management !!! Ignore for now, seems hard to do safely

### The Problem

Manual `unref()` calls are tedious and lead to memory leaks or segmentation
faults (double-frees).

### The Solution

Leverage **`FinalizationRegistry`** and **`g_object_ref_sink`**.

- **Floating References**: Use `g_object_ref_sink(ptr)` in the base constructor.
  This "takes ownership" of new widgets (which start with a floating ref) and
  adds a reference to existing ones.
- **Garbage Collection**: Register the pointer with a `FinalizationRegistry`
  that calls `g_object_unref(ptr)` when the JavaScript wrapper is garbage
  collected.
- **Object Identity**: Maintain a `WeakMap<bigint, WeakRef<GObject>>` to ensure
  that a single C pointer always maps to the same JavaScript object instance.

---

## 4. API Consistency
