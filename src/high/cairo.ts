import { cairo } from "../low/cairo.ts";

// Cairo Context Wrapper
export class CairoContext {
  private ptr: Deno.PointerValue;

  constructor(ptr: Deno.PointerValue) {
    this.ptr = ptr;
  }

  setSourceRgb(r: number, g: number, b: number): void {
    cairo.symbols.cairo_set_source_rgb(this.ptr, r, g, b);
  }

  setSourceRgba(r: number, g: number, b: number, a: number): void {
    cairo.symbols.cairo_set_source_rgba(this.ptr, r, g, b, a);
  }

  setLineWidth(width: number): void {
    cairo.symbols.cairo_set_line_width(this.ptr, width);
  }

  moveTo(x: number, y: number): void {
    cairo.symbols.cairo_move_to(this.ptr, x, y);
  }

  lineTo(x: number, y: number): void {
    cairo.symbols.cairo_line_to(this.ptr, x, y);
  }

  stroke(): void {
    cairo.symbols.cairo_stroke(this.ptr);
  }

  fill(): void {
    cairo.symbols.cairo_fill(this.ptr);
  }

  rectangle(x: number, y: number, width: number, height: number): void {
    cairo.symbols.cairo_rectangle(this.ptr, x, y, width, height);
  }

  arc(
    xc: number,
    yc: number,
    radius: number,
    angle1: number,
    angle2: number,
  ): void {
    cairo.symbols.cairo_arc(this.ptr, xc, yc, radius, angle1, angle2);
  }

  paint(): void {
    cairo.symbols.cairo_paint(this.ptr);
  }
}
