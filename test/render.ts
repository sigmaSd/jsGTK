/**
 * Tests for drawing widgets into images: snapshots, render nodes,
 * transforms, the Cairo renderer, textures and `Widget.renderToPng`.
 */

import {
  GskRenderNodeType,
  GskTransformCategory,
  Label,
  Snapshot,
  Texture,
  Transform,
  TransformNode,
  WidgetPaintable,
} from "../src/high/gtk4.ts";
import { AdwWindow } from "../src/high/adw.ts";
import { File } from "../src/high/gio.ts";
import { EventLoop } from "../src/high/eventloop.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (String(actual) !== String(expected)) {
    throw new Error(
      `FAIL: ${message} (expected: ${expected}, got: ${actual})`,
    );
  }
}

function assertThrows(fn: () => unknown, text: string, message: string) {
  try {
    fn();
  } catch (error) {
    assert(String(error).includes(text), `${message}: ${error}`);
    return;
  }
  throw new Error(`FAIL: ${message} (nothing thrown)`);
}

const testOptions = { sanitizeResources: false, sanitizeOps: false };

async function waitFor(predicate: () => boolean, message: string) {
  const deadline = performance.now() + 2000;
  while (!predicate()) {
    assert(performance.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** A path in the system's temporary folder, removed by `remove()`. */
function scratchPath(name: string): string {
  const dir = Deno.env.get("TMPDIR") ?? Deno.env.get("TEMP") ?? "/tmp";
  return `${dir}/jsgtk-${Date.now()}-${
    Math.random().toString(36).slice(2)
  }-${name}`;
}

function remove(path: string) {
  try {
    File.newForPath(path).delete(null);
  } catch {
    // Already gone.
  }
}

Deno.test("Transforms are immutable steps", testOptions, () => {
  const identity = new Transform();
  assertEquals(
    identity.getCategory(),
    GskTransformCategory.IDENTITY,
    "A new transform is the identity",
  );
  const scaled = identity.scale(2, 3)!;
  assertEquals(scaled.toString(), "scale(2, 3)", "Scale step");
  const rotated = scaled.rotate(90)!;
  assert(rotated.toString().includes("rotate(90)"), "Rotate step");
  // Each step took its own reference: the earlier transform is unchanged.
  assertEquals(scaled.toString(), "scale(2, 3)", "Earlier step unchanged");
  const again = new Transform().scale(2, 3)!;
  assert(scaled.equal(again), "Equal transforms compare equal");
  assert(!scaled.equal(rotated), "Different transforms differ");
  for (const t of [identity, scaled, rotated, again]) t.unref();
  identity.unref(); // A second unref does nothing.
});

Deno.test(
  "A widget paints into a snapshot as render nodes",
  testOptions,
  async () => {
    const window = new AdwWindow();
    window.setContent(new Label("Rendered by jsGTK"));
    window.setDefaultSize(240, 120);
    const loop = new EventLoop({ pollInterval: 1 });
    const running = loop.start();
    const path = scratchPath("node.txt");
    try {
      window.present();
      await waitFor(() => window.getWidth() > 0, "The window gets a size");
      const paintable = new WidgetPaintable(window);
      assert(
        paintable.getWidget()?.equals(window) ?? false,
        "Paints the window",
      );
      const snapshot = new Snapshot();
      paintable.snapshot(snapshot, window.getWidth(), window.getHeight());
      const node = snapshot.toNode()!;
      assert(node !== null, "The snapshot holds a node");
      assert(
        Object.values(GskRenderNodeType).includes(node.getNodeType()),
        "The node has a known type",
      );
      const scale = new Transform().scale(2, 2)!;
      const scaled = new TransformNode(node, scale);
      assertEquals(
        scaled.getNodeType(),
        GskRenderNodeType.TRANSFORM_NODE,
        "A transform node",
      );
      assertEquals(
        scaled.getChild().getNodeType(),
        node.getNodeType(),
        "It holds the child",
      );
      const held = scaled.getTransform();
      assert(held.equal(scale), "It holds the transform");
      held.unref();
      assert(scaled.writeToFile(path), "A node serializes to a file");
      for (const counted of [scaled, scale, node]) counted.unref();
      snapshot.unref();
      paintable.unref();
    } finally {
      remove(path);
      window.destroy();
      loop.stop();
      await running;
    }
  },
);

Deno.test("Widgets render to PNG at any scale", testOptions, async () => {
  const window = new AdwWindow();
  window.setContent(new Label("Rendered by jsGTK"));
  window.setDefaultSize(240, 120);
  const loop = new EventLoop({ pollInterval: 1 });
  const running = loop.start();
  const paths = [scratchPath("1x.png"), scratchPath("2x.png")];
  try {
    window.present();
    await waitFor(() => window.getWidth() > 0, "The window gets a size");
    const [width, height] = [window.getWidth(), window.getHeight()];
    window.renderToPng(paths[0]);
    window.renderToPng(paths[1], { scale: 2 });
    for (const [i, scale] of [1, 2].entries()) {
      const texture = Texture.newFromFilename(paths[i]);
      assertEquals(texture.getWidth(), width * scale, `Width at ${scale}x`);
      assertEquals(texture.getHeight(), height * scale, `Height at ${scale}x`);
      texture.unref();
    }
    assertThrows(
      () => window.renderToPng(paths[0], { scale: 0 }),
      "scale must be a positive number",
      "A zero scale is refused",
    );
    const hidden = new Label("Never shown");
    assertThrows(
      () => hidden.renderToPng(paths[0]),
      "no size yet",
      "A widget that isn't laid out is refused",
    );
    assertThrows(
      () => Texture.newFromFilename(`${paths[0]}.missing`),
      "",
      "Loading a missing file throws",
    );
  } finally {
    for (const path of paths) remove(path);
    window.destroy();
    loop.stop();
    await running;
  }
});
