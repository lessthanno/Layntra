import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("Figma companion is an English-only connection control", async () => {
  const html = await readFile("apps/figma-plugin/ui.html", "utf8");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Layntra connection control<\/title>/);
  assert.match(html, /Layntra for Figma/);
  assert.match(html, /Auto-connect/);
  assert.match(html, /role="switch"/);
  assert.match(html, /aria-checked=/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /client: "layntra-figma"/);
  assert.match(html, /44px/);
  assert.match(html, /Bridge unavailable/);
  assert.match(html, /Connection off/);
  assert.match(html, /without hosted MCP/);
  assert.match(html, /connection-preference-changed/);
  assert.doesNotMatch(html, /[\u3400-\u9fff]/);
  assert.doesNotMatch(html, /language|three steps|\$layntra status/i);
});

test("Figma runtime persists connection preference and adds a quick reopen action", async () => {
  const code = await readFile("apps/figma-plugin/code.js", "utf8");
  assert.match(code, /clientStorage\.getAsync\(/);
  assert.match(code, /clientStorage\.setAsync\(/);
  assert.match(code, /connection-preference/);
  assert.match(code, /setRelaunchData\(/);
});

test("connection control follows preference, connection, retry, and off states", async () => {
  const html = await readFile("apps/figma-plugin/ui.html", "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "inline companion runtime is missing");

  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      const attributes = new Map();
      elements.set(id, {
        dataset: {},
        disabled: false,
        textContent: "",
        title: "",
        onclick: null,
        setAttribute(name, value) { attributes.set(name, value); },
        getAttribute(name) { return attributes.get(name); }
      });
    }
    return elements.get(id);
  };

  const posted = [];
  const timers = [];
  class FakeWebSocket {
    static OPEN = 1;
    static instances = [];
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.sent = [];
      FakeWebSocket.instances.push(this);
    }
    send(value) { this.sent.push(value); }
    close() {
      this.readyState = 3;
      this.onclose?.();
    }
  }

  const context = {
    WebSocket: FakeWebSocket,
    clearTimeout(id) { if (id) id.cancelled = true; },
    document: { getElementById: element },
    parent: { postMessage(message) { posted.push(message.pluginMessage); } },
    setTimeout(callback, delay) {
      const timer = { callback, delay, cancelled: false };
      timers.push(timer);
      return timer;
    }
  };
  vm.runInNewContext(script, context);

  assert.equal(JSON.stringify(posted.at(-1)), JSON.stringify({ type: "connection-preference-requested" }));
  assert.equal(element("connection-toggle").disabled, true);

  context.onmessage({ data: { pluginMessage: {
    type: "connection-preference",
    enabled: true,
    fileName: "Checkout",
    pageName: "Desktop"
  } } });
  assert.equal(FakeWebSocket.instances.length, 1);
  assert.equal(element("connection-status").dataset.state, "connecting");
  assert.equal(element("connection-toggle").getAttribute("aria-checked"), "true");
  assert.equal(element("file-name").textContent, "Checkout");

  const socket = FakeWebSocket.instances[0];
  socket.readyState = FakeWebSocket.OPEN;
  socket.onopen();
  assert.equal(element("connection-status").dataset.state, "connected");
  assert.match(socket.sent[0], /layntra-figma/);

  element("connection-toggle").onclick();
  assert.equal(element("connection-status").dataset.state, "off");
  assert.equal(element("connection-toggle").getAttribute("aria-checked"), "false");
  assert.equal(
    JSON.stringify(posted.at(-1)),
    JSON.stringify({ type: "connection-preference-changed", enabled: false })
  );

  element("connection-toggle").onclick();
  const reconnectingSocket = FakeWebSocket.instances[1];
  reconnectingSocket.onclose();
  assert.equal(element("connection-status").dataset.state, "unavailable");
  assert.equal(timers.at(-1).delay, 1000);
  timers.at(-1).callback();
  assert.equal(FakeWebSocket.instances.length, 3);
  assert.equal(element("connection-status").dataset.state, "connecting");
});

test("Figma manifest exposes only the local Layntra companion", async () => {
  const manifest = JSON.parse(await readFile("apps/figma-plugin/manifest.json", "utf8"));
  assert.equal(manifest.name, "Layntra for Figma");
  assert.equal(manifest.main, "code.js");
  assert.equal(manifest.ui, "ui.html");
  assert.deepEqual(manifest.editorType, ["figma"]);
  assert.equal(manifest.documentAccess, "dynamic-page");
  assert.deepEqual(manifest.networkAccess.allowedDomains.sort(), ["http://localhost:3846", "ws://localhost:3846"]);
  assert.deepEqual(manifest.relaunchButtons, [
    { command: "open", name: "Open Layntra", multipleSelection: true }
  ]);
});
