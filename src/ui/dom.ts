export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(
  className: string,
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const node = element("button", className, label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

export function formatPercent(value: number): string {
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}

export function formatDelta(value: number): string {
  if (value === 0) return "±0.00";
  if (Math.abs(value) < 0.005) {
    return `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export function slugLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function renderCode(source: string, compact = false): HTMLElement {
  const frame = element("div", compact ? "code-frame code-frame--compact" : "code-frame");
  const pre = element("pre", "code-block");
  const list = element("ol", "code-lines");
  list.setAttribute("aria-label", "Rust code");

  for (const line of source.split("\n")) {
    const item = element("li");
    const code = element("code");
    code.textContent = line || " ";
    item.append(code);
    list.append(item);
  }

  pre.append(list);
  frame.append(pre);
  return frame;
}

export function createDialog(
  title: string,
  labelledBy: string,
): { dialog: HTMLDialogElement; body: HTMLElement } {
  const dialog = element("dialog", "modal");
  dialog.setAttribute("aria-labelledby", labelledBy);
  const shell = element("div", "modal__shell");
  const header = element("header", "modal__header");
  const heading = element("h2", "modal__title", title);
  heading.id = labelledBy;
  const close = button("icon-button", "×", () => dialog.close());
  close.setAttribute("aria-label", `Close ${title}`);
  const body = element("div", "modal__body");
  header.append(heading, close);
  shell.append(header, body);
  dialog.append(shell);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  return { dialog, body };
}
