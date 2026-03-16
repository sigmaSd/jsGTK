#!/usr/bin/env -S deno run --allow-ffi

import {
  Application,
  ApplicationFlags,
  Box,
  Button,
  Label,
  Orientation,
} from "../src/high/gtk4.ts";
import {
  AdwApplicationWindow,
  Carousel,
  CarouselIndicatorDots,
  HeaderBar,
  ToolbarView,
} from "../src/high/adw.ts";

const app = new Application("com.example.CarouselDemo", ApplicationFlags.NONE);

app.onActivate(() => {
  const win = new AdwApplicationWindow(app);
  win.setTitle("Adw.Carousel Demo");
  win.setDefaultSize(400, 300);

  const toolbarView = new ToolbarView();
  const headerBar = new HeaderBar();
  toolbarView.addTopBar(headerBar);

  const mainBox = new Box(Orientation.VERTICAL, 20);
  mainBox.setMarginTop(30);
  mainBox.setMarginBottom(30);
  mainBox.setMarginStart(30);
  mainBox.setMarginEnd(30);

  const infoLabel = new Label("Swipe or scroll to navigate between pages");
  infoLabel.addCssClass("title-2");
  mainBox.append(infoLabel);

  const carousel = new Carousel();
  carousel.setVexpand(true);
  carousel.setHexpand(true);
  carousel.allowMouseDrag = true;

  // Add some colorful pages to the carousel
  const pages = [
    { title: "Welcome to Adw.Carousel", icon: "💎", color: "blue" },
    { title: "Smooth Transitions", icon: "🚀", color: "green" },
    { title: "Interactive Widgets", icon: "🎮", color: "orange" },
  ];

  for (const [_i, p] of pages.entries()) {
    const page = new Box(Orientation.VERTICAL, 15);
    page.setValign(3); // Center
    page.setHalign(3); // Center

    const iconLabel = new Label(p.icon);
    iconLabel.addCssClass("title-1");
    // Use large font size for the emoji/icon
    iconLabel.setMarginBottom(10);
    page.append(iconLabel);

    const titleLabel = new Label(p.title);
    titleLabel.addCssClass("title-3");
    page.append(titleLabel);

    const btn = new Button(`Action on ${p.title}`);
    btn.addCssClass("suggested-action");
    btn.onClick(() => console.log(`Action clicked on: ${p.title}`));
    page.append(btn);

    carousel.append(page);
  }

  const indicator = new CarouselIndicatorDots();
  indicator.carousel = carousel;
  indicator.setMarginBottom(10);

  mainBox.append(carousel);
  mainBox.append(indicator);

  const footerLabel = new Label(`Page 1 of ${pages.length}`);
  footerLabel.addCssClass("caption");
  mainBox.append(footerLabel);

  // Update footer when carousel scrolls
  // (In a real app we'd connect to notify::position, but here we just show the structure)

  toolbarView.setContent(mainBox);
  win.setContent(toolbarView);
  win.present();
});

app.run(Deno.args);
