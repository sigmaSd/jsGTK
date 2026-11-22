import { cairo } from "../low/cairo.ts";

// cairo_line_join_t
export const LineJoin = { MITER: 0, ROUND: 1, BEVEL: 2 } as const;
// cairo_line_cap_t
export const LineCap = { BUTT: 0, ROUND: 1, SQUARE: 2 } as const;

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

  newPath(): void {
    cairo.symbols.cairo_new_path(this.ptr);
  }

  closePath(): void {
    cairo.symbols.cairo_close_path(this.ptr);
  }

  /** Fill the current path and keep it, so it can also be stroked. */
  fillPreserve(): void {
    cairo.symbols.cairo_fill_preserve(this.ptr);
  }

  curveTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): void {
    cairo.symbols.cairo_curve_to(this.ptr, x1, y1, x2, y2, x3, y3);
  }

  /** One of {@link LineJoin}. */
  setLineJoin(join: number): void {
    cairo.symbols.cairo_set_line_join(this.ptr, join);
  }

  /** One of {@link LineCap}. */
  setLineCap(cap: number): void {
    cairo.symbols.cairo_set_line_cap(this.ptr, cap);
  }

  scale(sx: number, sy: number): void {
    cairo.symbols.cairo_scale(this.ptr, sx, sy);
  }

  translate(tx: number, ty: number): void {
    cairo.symbols.cairo_translate(this.ptr, tx, ty);
  }

  save(): void {
    cairo.symbols.cairo_save(this.ptr);
  }

  restore(): void {
    cairo.symbols.cairo_restore(this.ptr);
  }
}
