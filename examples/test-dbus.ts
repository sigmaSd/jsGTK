#!/usr/bin/env -S deno run --allow-ffi

import { DBusProxy, BusType, DBusProxyFlags } from "@sigmasd/gtk/gio";

const DDC_BUS = "ddccontrol.DDCControl";
const DDC_PATH = "/ddccontrol/DDCControl";
const DDC_IFACE = "ddccontrol.DDCControl";

async function main() {
  console.log("Creating D-Bus proxy...");
  const proxy = DBusProxy.newForBusSync(
    BusType.SYSTEM,
    DBusProxyFlags.NONE,
    null,
    DDC_BUS,
    DDC_PATH,
    DDC_IFACE,
  );
  
  if (!proxy) {
    console.error("Failed to create proxy");
    return;
  }
  console.log("Proxy created OK");

  console.log("\nCalling GetMonitors with sync...");
  const result = proxy.callSyncWithStrings("GetMonitors");
  console.log("Sync call completed");
  if (!result) {
    console.error("GetMonitors returned null");
    return;
  }
  
  console.log("Result type:", result.getTypeString());
  console.log("Children count:", result.getChildrenCount());
  
  for (let i = 0; i < result.getChildrenCount(); i++) {
    const child = result.getChildValue(i);
    if (child) {
      console.log(`Child ${i}: type=${child.getTypeString()}`);
      if (child.getTypeString() === "as") {
        console.log(`  strv:`, child.getStrv());
      }
    }
  }

  console.log("\nCalling GetControl on dev:/dev/i2c-4 with mixed types...");
  const brightness = proxy.callSyncWithMixed("GetControl", "dev:/dev/i2c-4", 16);
  console.log("GetControl completed");
  if (!brightness) {
    console.error("GetControl returned null");
    return;
  }
  
  console.log("Brightness result type:", brightness.getTypeString());
  console.log("Brightness children:", brightness.getChildrenCount());
  
  for (let i = 0; i < brightness.getChildrenCount(); i++) {
    const child = brightness.getChildValue(i);
    if (child) {
      console.log(`  Child ${i}: type=${child.getTypeString()}, value=${child.getInt32()}`);
    }
  }

  // Extract value and max
  const resultVal = brightness.getChildValue(0)?.getInt32();
  const value = brightness.getChildValue(1)?.getUint16();
  const max = brightness.getChildValue(2)?.getUint16();
  console.log(`Result: ${resultVal}, Value: ${value}, Max: ${max}`);

  // Test SetControl with correct params (device, control, value)
  console.log("\nTesting SetControl to 50...");
  const setResult = proxy.callSyncWithMixed("SetControl", "dev:/dev/i2c-4", 16, 50);
  console.log("SetControl result:", setResult?.getTypeString(), setResult?.getChildrenCount());
  
  // Read back
  const brightness2 = proxy.callSyncWithMixed("GetControl", "dev:/dev/i2c-4", 16);
  if (brightness2) {
    const resultCode = brightness2.getChildValue(0)?.getInt32();
    const value2 = brightness2.getChildValue(1)?.getUint16();
    const max2 = brightness2.getChildValue(2)?.getUint16();
    console.log(`After set: result=${resultCode}, Value: ${value2}, Max: ${max2}`);
  }
}

main();