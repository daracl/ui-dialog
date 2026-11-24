// 타입 테스트 (tsc -p tsconfig.typecheck.json). 실행하지 않는다.
import Dialog, { Dialog as NamedDialog, DialogOptions } from "../../types/index";

const options: DialogOptions = {
  title: "dialog",
  width: 500,
  height: "auto",
  icon: "info",
  isModal: true,
  resizable: true,
  autoOpen: false,
  template: "<p>x</p>",
  sanitize: true,
  theme: "dark",
  buttons: [{ label: "ok", styleClass: "info", callback: (e: Event) => e.type }],
  afterOpen(element) {
    this.setTheme("light");
    element.focus();
  },
};

const d: NamedDialog = Dialog.create(options).show().hide();
d.setTheme();
d.destroy();
