import "./styles/main.css";
import { RustyNinjaApp } from "./app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Missing #app root");
}

new RustyNinjaApp(root).start();
