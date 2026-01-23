import { gio } from "../low/gio.ts";
import { glib } from "../low/glib.ts";
import { cstr, readCStr } from "../low/utils.ts";
import { GObject } from "./gobject.ts";

// GMenu extends GMenuModel extends GObject
export class Menu extends GObject {
  constructor() {
    const ptr = gio.symbols.g_menu_new();
    super(ptr);
  }

  append(label: string, detailedAction: string): void {
    const labelCStr = cstr(label);
    const actionCStr = cstr(detailedAction);
    gio.symbols.g_menu_append(this.ptr, labelCStr, actionCStr);
  }
}

// GSimpleAction extends GObject
export class SimpleAction extends GObject {
  constructor(name: string) {
    const nameCStr = cstr(name);
    const ptr = gio.symbols.g_simple_action_new(nameCStr, null);
    super(ptr);
  }
}

export class ListStore extends GObject {
  constructor(type: number | bigint) {
    const ptr = gio.symbols.g_list_store_new(BigInt(type));
    super(ptr);
  }
  append(item: GObject): void {
    gio.symbols.g_list_store_append(this.ptr, item.ptr);
  }
}

export class File extends GObject {
  constructor(ptr?: Deno.PointerValue) {
    super(ptr ?? null!); // Allow wrapping existing pointer
  }

  static newForPath(path: string): File {
    const ptr = gio.symbols.g_file_new_for_path(cstr(path));
    return new File(ptr);
  }

  static getType(): bigint {
    return BigInt(gio.symbols.g_file_get_type());
  }

  getPath(): string | null {
    const ptr = gio.symbols.g_file_get_path(this.ptr);
    return ptr ? readCStr(ptr) : null;
  }

  loadContents(): [boolean, Uint8Array] {
    const contents = new BigUint64Array(1);
    const length = new BigUint64Array(1);
    const etag_out = new BigUint64Array(1);

    const success = gio.symbols.g_file_load_contents(
      this.ptr,
      null,
      Deno.UnsafePointer.of(contents),
      Deno.UnsafePointer.of(length),
      Deno.UnsafePointer.of(etag_out),
    );

    if (success) {
      const len = Number(length[0]);
      const ptr = Deno.UnsafePointer.create(contents[0]);
      if (ptr) {
        const view = new Deno.UnsafePointerView(ptr);
        const arr = new Uint8Array(len);
        view.copyInto(arr);
        glib.symbols.g_free(ptr);
        return [true, arr];
      }
    }
    return [false, new Uint8Array(0)];
  }
}

export class AsyncResult extends GObject {}
