// Cairo 2 - 2D Graphics Library FFI bindings
// Cairo GIR describes cairo-gobject types. These drawing calls come from libcairo.
import "@sigma/deno-compat";
import { LIB_PATHS } from "./paths/mod.ts";

export const cairo = Deno.dlopen(LIB_PATHS.cairo, {
  cairo_set_source_rgb: {
    parameters: ["pointer", "f64", "f64", "f64"],
    result: "void",
  },
  cairo_set_source_rgba: {
    parameters: ["pointer", "f64", "f64", "f64", "f64"],
    result: "void",
  },
  cairo_set_line_width: { parameters: ["pointer", "f64"], result: "void" },
  cairo_move_to: {
    parameters: ["pointer", "f64", "f64"],
    result: "void",
  },
  cairo_line_to: {
    parameters: ["pointer", "f64", "f64"],
    result: "void",
  },
  cairo_stroke: { parameters: ["pointer"], result: "void" },
  cairo_fill: { parameters: ["pointer"], result: "void" },
  cairo_rectangle: {
    parameters: ["pointer", "f64", "f64", "f64", "f64"],
    result: "void",
  },
  cairo_arc: {
    parameters: ["pointer", "f64", "f64", "f64", "f64", "f64"],
    result: "void",
  },
  cairo_paint: { parameters: ["pointer"], result: "void" },
  cairo_scale: { parameters: ["pointer", "f64", "f64"], result: "void" },
  cairo_translate: { parameters: ["pointer", "f64", "f64"], result: "void" },
  cairo_new_path: { parameters: ["pointer"], result: "void" },
  cairo_close_path: { parameters: ["pointer"], result: "void" },
  cairo_fill_preserve: { parameters: ["pointer"], result: "void" },
  cairo_curve_to: {
    parameters: ["pointer", "f64", "f64", "f64", "f64", "f64", "f64"],
    result: "void",
  },
  cairo_set_line_join: { parameters: ["pointer", "i32"], result: "void" },
  cairo_set_line_cap: { parameters: ["pointer", "i32"], result: "void" },
  cairo_save: { parameters: ["pointer"], result: "void" },
  cairo_restore: { parameters: ["pointer"], result: "void" },
});
