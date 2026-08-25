import { CURRENT_PLAYER_STATE_VERSION, type PlayerState } from "../game/player-state";
import { button, createDialog, element } from "./dom";

export interface SettingsOptions {
  readonly state: PlayerState;
  readonly canInstall: boolean;
  readonly standalone: boolean;
  readonly online: boolean;
  readonly onInstall: () => void;
  readonly onExport: () => void;
  readonly onImport: (file: File) => void;
  readonly onReset: () => void;
}

function settingsAction(
  title: string,
  description: string,
  control: HTMLElement,
): HTMLElement {
  const row = element("div", "settings-row");
  const copy = element("div", "settings-row__copy");
  copy.append(
    element("strong", "settings-row__title", title),
    element("span", "settings-row__description", description),
  );
  row.append(copy, control);
  return row;
}

export function renderSettingsDialog(options: SettingsOptions): HTMLDialogElement {
  const { dialog, body } = createDialog("Settings", "settings-title");
  const status = element("div", "settings-status");
  status.append(
    element(
      "span",
      `status-dot ${options.online ? "is-online" : "is-offline"}`,
    ),
    element("span", undefined, options.online ? "Online · progress remains local" : "Offline · training stays local"),
  );
  body.append(status);

  const install = button(
    "secondary-button",
    options.standalone ? "Installed" : options.canInstall ? "Install" : "Browser menu",
    options.onInstall,
  );
  install.disabled = options.standalone || !options.canInstall;
  body.append(
    settingsAction(
      "Install Rusty Ninja",
      options.canInstall || options.standalone
        ? "Launch standalone and keep the training engine cached."
        : "Use your browser's Add to Home Screen action on this device.",
      install,
    ),
  );

  body.append(
    settingsAction(
      "Export progress",
      `${options.state.totalAnswered} answers · schema v${CURRENT_PLAYER_STATE_VERSION}`,
      button("secondary-button", "Export JSON", options.onExport),
    ),
  );

  const input = element("input", "visually-hidden");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) options.onImport(file);
    input.value = "";
  });
  const importButton = button("secondary-button", "Choose file", () => input.click());
  const importControl = element("div", "inline-control");
  importControl.append(importButton, input);
  body.append(
    settingsAction(
      "Import progress",
      "Validate and restore a compatible Rusty Ninja JSON export.",
      importControl,
    ),
  );

  body.append(
    settingsAction(
      "Reset progress",
      "Erase this device's local rating, history, and Rusty repairs.",
      button("danger-button", "Reset", options.onReset),
    ),
  );

  const footnote = element("p", "settings-footnote", "cargo audit is not an audit.");
  body.append(footnote);
  return dialog;
}
