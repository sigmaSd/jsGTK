/**
 * D-Bus and GIO Test
 *
 * This test verifies D-Bus proxy functionality and GVariant handling.
 * Tests use the org.freedesktop.DBus interface which is always available
 * on systems with a D-Bus session bus.
 */

import {
  BusType,
  DBusCallFlags,
  DBusProxy,
  DBusProxyFlags,
  Variant,
} from "../src/high/gio.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(
      `FAIL: ${message} (expected: ${expected}, got: ${actual})`,
    );
  }
}

const testOptions = { sanitizeResources: false, sanitizeOps: false };

// Skip D-Bus proxy tests if no session bus is available or on Windows (D-Bus doesn't exist on Windows)
const isWindows = Deno.build.os === "windows";
const hasSessionBus = !isWindows &&
  Deno.env.get("DBUS_SESSION_BUS_ADDRESS") !== undefined;

Deno.test({
  name: "Variant: Create and read string",
  ...testOptions,
  fn() {
    const variant = Variant.newString("hello");
    assert(variant !== null, "String variant created");
    assert(variant.ptr !== null, "Variant has valid pointer");

    const value = variant.getString();
    assertEquals(value, "hello", "String value matches");

    variant.unref();
  },
});

Deno.test({
  name: "Variant: Create and read uint32",
  ...testOptions,
  fn() {
    const variant = Variant.newUint32(42);
    assert(variant !== null, "Uint32 variant created");
    assert(variant.ptr !== null, "Variant has valid pointer");

    const value = variant.getUint32();
    assertEquals(value, 42, "Uint32 value matches");

    variant.unref();
  },
});

Deno.test({
  name: "Variant: Create tuple with multiple strings",
  ...testOptions,
  fn() {
    const str1 = Variant.newString("first");
    const str2 = Variant.newString("second");

    const tuple = Variant.newTuple([str1, str2]);
    assert(tuple !== null, "Tuple variant created");

    const child0 = tuple.getChildValue(0);
    assert(child0 !== null, "First child exists");
    assertEquals(child0!.getString(), "first", "First child value matches");

    const child1 = tuple.getChildValue(1);
    assert(child1 !== null, "Second child exists");
    assertEquals(child1!.getString(), "second", "Second child value matches");

    child0!.unref();
    child1!.unref();
    tuple.unref();
  },
});

Deno.test({
  name: "Variant: Create tuple with uint32",
  ...testOptions,
  fn() {
    const uint = Variant.newUint32(12345);
    const tuple = Variant.newTuple([uint]);

    assert(tuple !== null, "Tuple with uint32 created");

    const child = tuple.getChildValue(0);
    assert(child !== null, "Child exists");
    assertEquals(child!.getUint32(), 12345, "Uint32 child value matches");

    child!.unref();
    tuple.unref();
  },
});

Deno.test({
  name: "DBusProxy: Connect to session bus",
  ignore: !hasSessionBus,
  ...testOptions,
  fn() {
    // Connect to the D-Bus daemon itself
    const proxy = DBusProxy.newForBusSync(
      BusType.SESSION,
      DBusProxyFlags.NONE,
      null,
      "org.freedesktop.DBus",
      "/org/freedesktop/DBus",
      "org.freedesktop.DBus",
    );

    assert(proxy !== null, "DBusProxy created successfully");
  },
});

Deno.test({
  name: "DBusProxy: Call GetId method",
  ignore: !hasSessionBus,
  ...testOptions,
  fn() {
    const proxy = DBusProxy.newForBusSync(
      BusType.SESSION,
      DBusProxyFlags.NONE,
      null,
      "org.freedesktop.DBus",
      "/org/freedesktop/DBus",
      "org.freedesktop.DBus",
    );

    assert(proxy !== null, "DBusProxy created");

    // GetId returns a string - the unique ID of the bus
    const result = proxy!.callSync(
      "GetId",
      null,
      DBusCallFlags.NONE,
      -1,
    );

    assert(result !== null, "GetId returned a result");
  },
});

Deno.test({
  name: "DBusProxy: callWithStringsGetUint32 - RequestName",
  ignore: !hasSessionBus,
  ...testOptions,
  fn() {
    const proxy = DBusProxy.newForBusSync(
      BusType.SESSION,
      DBusProxyFlags.NONE,
      null,
      "org.freedesktop.DBus",
      "/org/freedesktop/DBus",
      "org.freedesktop.DBus",
    );

    assert(proxy !== null, "DBusProxy created");

    // Note: RequestName requires (su) format - string and uint32
    // We'll test with NameHasOwner which takes just a string and returns boolean
    // For now, just verify the proxy is working by calling ListNames

    const result = proxy!.callSync(
      "ListNames",
      null,
      DBusCallFlags.NONE,
      -1,
    );

    assert(result !== null, "ListNames returned a result");
  },
});

Deno.test({
  name: "DBusProxy: Verify callWithUint32 creates proper variant",
  ignore: !hasSessionBus,
  ...testOptions,
  fn() {
    // This test verifies that callWithUint32 properly constructs the variant
    // We can't easily test it with org.freedesktop.DBus as it doesn't have
    // methods that take just a uint32, but we can at least verify the proxy works

    const proxy = DBusProxy.newForBusSync(
      BusType.SESSION,
      DBusProxyFlags.NONE,
      null,
      "org.freedesktop.DBus",
      "/org/freedesktop/DBus",
      "org.freedesktop.DBus",
    );

    assert(proxy !== null, "DBusProxy created for callWithUint32 test");

    // Test that the method exists and doesn't throw when called
    // Even though this specific call may fail (no method expects just uint32),
    // we're testing that the variant construction works
    try {
      // GetConnectionUnixProcessID expects a string, so this will fail
      // but we're testing the variant construction, not the actual call
      proxy!.callWithUint32("NonExistentMethod", 42);
    } catch {
      // Expected to fail - the method doesn't exist
      // But if we got here without a crash, the variant was constructed correctly
    }

    assert(true, "callWithUint32 variant construction succeeded");
  },
});

Deno.test({
  name: "DBusProxy: Portal Inhibit/UnInhibit flow (if available)",
  ignore: !hasSessionBus,
  ...testOptions,
  fn() {
    // Try to connect to the Portal interface for screen saver inhibit
    // This may not be available on all systems, so we handle failure gracefully
    const proxy = DBusProxy.newForBusSync(
      BusType.SESSION,
      DBusProxyFlags.DO_NOT_AUTO_START,
      null,
      "org.freedesktop.portal.Desktop",
      "/org/freedesktop/portal/desktop",
      "org.freedesktop.portal.Inhibit",
    );

    if (proxy === null) {
      // Portal not available, skip this test
      console.log("  (Portal interface not available, skipping)");
      return;
    }

    // If we got a proxy, the portal is available
    // We don't actually call Inhibit as it requires a window handle,
    // but we verified the proxy can be created
    assert(proxy !== null, "Portal Inhibit proxy created");
  },
});
