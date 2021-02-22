const { ipcRenderer } = require("electron");

const xmlNs = "http://www.w3.org/2000/xmlns/";
const svgNs = "http://www.w3.org/2000/svg";

const getDimension = (el, clone, dim) => {
  const v =
    (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
    (clone.getAttribute(dim) !== null &&
      !clone.getAttribute(dim).match(/%$/) &&
      parseInt(clone.getAttribute(dim))) ||
    el.getBoundingClientRect()[dim] ||
    parseInt(clone.style[dim]) ||
    parseInt(window.getComputedStyle(el).getPropertyValue(dim));
  return typeof v === "undefined" || v === null || isNaN(parseFloat(v)) ? 0 : v;
};

const getDimensions = (el, clone) => ({
  width: getDimension(el, clone, "width"),
  height: getDimension(el, clone, "height"),
});

const reEncode = (data) =>
  decodeURIComponent(
    encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      const c = String.fromCharCode(`0x${p1}`);
      return c === "%" ? "%25" : c;
    })
  );

const prepareSvg = (el, options) => {
  const { left = 0, top = 0 } = options || {};

  let clone = el.cloneNode(true);
  clone.style.backgroundColor = el.style.backgroundColor;
  const { width, height } = getDimensions(el, clone);

  clone.setAttribute("version", "1.1");
  clone.setAttribute("viewBox", [left, top, width, height].join(" "));
  if (!clone.getAttribute("xmlns")) {
    clone.setAttributeNS(xmlNs, "xmlns", svgNs);
  }
  if (!clone.getAttribute("xmlns:xlink")) {
    clone.setAttributeNS(xmlNs, "xmlns:xlink", "http://www.w3.org/1999/xlink");
  }

  clone.setAttribute("width", width);
  clone.setAttribute("height", height);
  const outer = document.createElement("div");
  outer.appendChild(clone);
  return outer.innerHTML;
};

const svgAsDataUri = (el) => {
  const doctype =
    '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';
  return `data:image/svg+xml;base64,${window.btoa(
    reEncode(doctype + prepareSvg(el, {}))
  )}`;
};

const sendSVGAsPNG = (el) => {
  let uri = svgAsDataUri(el);
  const image = new Image();
  let width = 100;
  let height = 100;
  image.onload = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    context.drawImage(image, 0, 0);
    try {
      ipcRenderer.send(
        "asynchronous-message",
        canvas.toDataURL("image/png", 0.8)
      );
    } catch (e) {}
  };
  image.src = uri;
};

let game = document.getElementById("game");
let player = document.getElementById("player");
let cpu = document.getElementById("cpu");
let ball = document.getElementById("ball");

let leftWall = (x, y) => x <= 0;
let rightWall = (x, y) => x >= 100;
let ceiling = (x, y) => y <= 0;
let floor = (x, y) => y >= 100;

let defaultBallVelocity = 0.4;
let defaultPlayerVelocity = 0.6;
let ballVelocityX = defaultBallVelocity;
let ballVelocityY = defaultBallVelocity;

function gameLoop() {
  sendSVGAsPNG(game);
  let currentBallX = Number(ball.getAttribute("x"));
  let currentBallY = Number(ball.getAttribute("y"));
  let currentCPUPosition = Number(cpu.getAttribute("y"));
  let currentPlayerPosition = Number(player.getAttribute("y"));

  let newBallX = currentBallX + ballVelocityX;
  let newBallY = currentBallY + ballVelocityY;

  if (rightWall(newBallX, newBallY) || leftWall(newBallX, newBallY)) {
    ballVelocityX = -ballVelocityX;
    newBallX = currentBallX + ballVelocityX;
  }

  if (floor(newBallX, newBallY) || ceiling(newBallX, newBallY)) {
    ballVelocityY = -ballVelocityY;
    newBallY = currentBallY + ballVelocityY;
  }

  let newCPUPosition =
    currentCPUPosition +
    (defaultPlayerVelocity * (currentCPUPosition >= newBallY) ? -1 : 1);
  cpu.setAttribute("y", newCPUPosition);

  let newPlayerPosition =
    currentPlayerPosition +
    (defaultPlayerVelocity * (currentPlayerPosition >= newBallY) ? -1 : 1);
  player.setAttribute("y", newPlayerPosition);

  ball.setAttribute("x", newBallX);
  ball.setAttribute("y", newBallY);
  window.requestAnimationFrame(gameLoop);
}

window.requestAnimationFrame(gameLoop);
