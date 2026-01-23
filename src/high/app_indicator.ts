import { app_indicator } from "../low/app_indicator.ts";
import { cstr } from "../low/utils.ts";
import { G_TYPE_BOOLEAN, GObject } from "./gobject.ts";
import type { Menu } from "./gtk3.ts";

export enum IndicatorCategory {
  APPLICATION_STATUS = 0,
  SYSTEM_SERVICES = 1,
  HARDWARE = 2,
  OTHER = 3,
}

export enum IndicatorStatus {
  PASSIVE = 0,
  ACTIVE = 1,
  ATTENTION = 2,
}

export class Indicator extends GObject {
  constructor(id: string, iconName: string, category: IndicatorCategory) {
    const ptr = app_indicator.symbols.app_indicator_new(
      cstr(id),
      cstr(iconName),
      category,
    );
    super(ptr);
  }

  setStatus(status: IndicatorStatus): void {
    app_indicator.symbols.app_indicator_set_status(this.ptr, status);
  }

  setMenu(menu: Menu): void {
    app_indicator.symbols.app_indicator_set_menu(this.ptr, menu.ptr);
  }

  setTitle(title: string): void {
    app_indicator.symbols.app_indicator_set_title(this.ptr, cstr(title));
  }

  get props(): { connected: boolean } {
    return {
      connected: this.getProperty("connected", G_TYPE_BOOLEAN) as boolean,
    };
  }
}
