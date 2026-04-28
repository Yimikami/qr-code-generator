/* =====================================================
   QR Studio · application logic
   Uses qr-code-styling (loaded via CDN in index.html)
   ===================================================== */

(() => {
  "use strict";

  /** @type {any} */
  const QRCodeStylingLib = window.QRCodeStyling;
  if (!QRCodeStylingLib) {
    console.error("qr-code-styling failed to load");
    return;
  }

  // -------- Helpers --------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const debounce = (fn, ms = 80) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  const escapeWifi = (s = "") =>
    s.replace(/([\\;,":])/g, "\\$1");

  // -------- Default state --------
  const defaults = {
    type: "url",
    text: "https://github.com/yimikami",
    wifi: { ssid: "", pass: "", enc: "WPA", hidden: false },
    email: { to: "", subject: "", body: "" },
    sms: { to: "", body: "" },
    vcard: {
      first: "",
      last: "",
      org: "",
      phone: "",
      email: "",
      url: "",
    },

    logo: null, // data URL
    logoSize: 0.4,
    logoMargin: 6,
    hideDots: true,

    dotsType: "dots",
    cornerSqType: "extra-rounded",
    cornerDotType: "dot",

    dotColor: "#000000",
    bgColor: "#ffffff",
    bgTransparent: false,
    cornerSqColor: "#000000",
    cornerDotColor: "#000000",

    useGradient: false,
    gradStart: "#7170ff",
    gradEnd: "#5e6ad2",
    gradType: "linear",

    ecLevel: "Q",
    qrMargin: 10,

    exportSize: 1024,
  };

  /** @type {typeof defaults} */
  let state = structuredClone(defaults);

  // -------- Build payload from state --------
  const buildPayload = () => {
    switch (state.type) {
      case "wifi": {
        const w = state.wifi;
        const enc = w.enc === "nopass" ? "nopass" : w.enc;
        return `WIFI:T:${enc};S:${escapeWifi(w.ssid)};${
          enc === "nopass" ? "" : `P:${escapeWifi(w.pass)};`
        }${w.hidden ? "H:true;" : ""};`;
      }
      case "email": {
        const e = state.email;
        const params = [];
        if (e.subject) params.push(`subject=${encodeURIComponent(e.subject)}`);
        if (e.body) params.push(`body=${encodeURIComponent(e.body)}`);
        return `mailto:${e.to}${params.length ? `?${params.join("&")}` : ""}`;
      }
      case "sms": {
        const s = state.sms;
        return `SMSTO:${s.to}:${s.body}`;
      }
      case "vcard": {
        const v = state.vcard;
        return [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `N:${v.last};${v.first}`,
          `FN:${[v.first, v.last].filter(Boolean).join(" ")}`,
          v.org ? `ORG:${v.org}` : "",
          v.phone ? `TEL:${v.phone}` : "",
          v.email ? `EMAIL:${v.email}` : "",
          v.url ? `URL:${v.url}` : "",
          "END:VCARD",
        ]
          .filter(Boolean)
          .join("\n");
      }
      case "url":
      default:
        return state.text || " ";
    }
  };

  // -------- QR Code instance --------
  const PREVIEW_SIZE = 320;

  const buildOptions = (size = PREVIEW_SIZE) => {
    const opts = {
      width: size,
      height: size,
      type: "canvas",
      data: buildPayload(),
      margin: state.qrMargin,
      qrOptions: {
        errorCorrectionLevel: state.ecLevel,
      },
      backgroundOptions: {
        color: state.bgTransparent ? "transparent" : state.bgColor,
      },
      dotsOptions: {
        type: state.dotsType,
        color: state.dotColor,
      },
      cornersSquareOptions: {
        type: state.cornerSqType,
        color: state.cornerSqColor,
      },
      cornersDotOptions: {
        type: state.cornerDotType,
        color: state.cornerDotColor,
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: state.logoMargin,
        imageSize: state.logoSize,
        hideBackgroundDots: state.hideDots,
      },
    };

    if (state.useGradient) {
      opts.dotsOptions = {
        type: state.dotsType,
        gradient: {
          type: state.gradType,
          rotation: state.gradType === "linear" ? Math.PI / 4 : 0,
          colorStops: [
            { offset: 0, color: state.gradStart },
            { offset: 1, color: state.gradEnd },
          ],
        },
      };
    }

    if (state.logo) {
      opts.image = state.logo;
    }

    return opts;
  };

  const qrCanvas = $("#qrCanvas");
  // Recreate the QR instance every render so option changes (including
  // unsetting the logo image) reliably take effect.
  const renderQR = debounce(() => {
    qrCanvas.innerHTML = "";
    const inst = new QRCodeStylingLib(buildOptions());
    inst.append(qrCanvas);
  }, 60);

  // -------- Range value reflection --------
  const reflectRange = (input) => {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const v = Number(input.value);
    const pct = ((v - min) / (max - min)) * 100;
    input.style.setProperty("--val", `${pct}%`);
  };
  $$("input[type=range]").forEach(reflectRange);

  // -------- Form: TYPE switching --------
  const typeSelect = $("#qrType");
  const typePanels = $$(".type-panel");
  const showTypePanel = (type) => {
    typePanels.forEach((p) => {
      p.classList.toggle("hidden", p.dataset.typePanel !== type);
    });
  };
  typeSelect.addEventListener("change", () => {
    state.type = typeSelect.value;
    showTypePanel(state.type);
    renderQR();
  });

  // -------- Content fields --------
  $("#qrText").addEventListener("input", (e) => {
    state.text = e.target.value;
    renderQR();
  });

  // Wifi
  $("#wifiSsid").addEventListener("input", (e) => {
    state.wifi.ssid = e.target.value;
    renderQR();
  });
  $("#wifiPass").addEventListener("input", (e) => {
    state.wifi.pass = e.target.value;
    renderQR();
  });
  $("#wifiEnc").addEventListener("change", (e) => {
    state.wifi.enc = e.target.value;
    renderQR();
  });
  $("#wifiHidden").addEventListener("change", (e) => {
    state.wifi.hidden = e.target.checked;
    renderQR();
  });

  // Email
  $("#emailTo").addEventListener("input", (e) => {
    state.email.to = e.target.value;
    renderQR();
  });
  $("#emailSubject").addEventListener("input", (e) => {
    state.email.subject = e.target.value;
    renderQR();
  });
  $("#emailBody").addEventListener("input", (e) => {
    state.email.body = e.target.value;
    renderQR();
  });

  // SMS
  $("#smsTo").addEventListener("input", (e) => {
    state.sms.to = e.target.value;
    renderQR();
  });
  $("#smsBody").addEventListener("input", (e) => {
    state.sms.body = e.target.value;
    renderQR();
  });

  // vCard
  const vMap = {
    "#vcFirst": "first",
    "#vcLast": "last",
    "#vcOrg": "org",
    "#vcPhone": "phone",
    "#vcEmail": "email",
    "#vcUrl": "url",
  };
  Object.entries(vMap).forEach(([sel, key]) => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener("input", (e) => {
      state.vcard[key] = e.target.value;
      renderQR();
    });
  });

  // -------- Logo --------
  const dropzone = $("#dropzone");
  const logoInput = $("#logoInput");
  const logoPick = $("#logoPick");
  const logoPreview = $("#logoPreview");
  const logoThumb = $("#logoThumb");
  const logoName = $("#logoName");
  const logoRemove = $("#logoRemove");

  const setLogo = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Unsupported file. Please choose an image.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.logo = String(reader.result || "");
      logoThumb.src = state.logo;
      logoName.textContent = file.name;
      logoPreview.classList.remove("hidden");
      renderQR();
    };
    reader.onerror = () => setStatus("Could not read that image.", "error");
    reader.readAsDataURL(file);
  };

  logoPick.addEventListener("click", () => logoInput.click());
  // Click anywhere on the dropzone (except buttons/preview controls) opens picker
  dropzone.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    if (e.target.closest(".logo-preview")) return;
    logoInput.click();
  });
  logoInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    setLogo(file);
    e.target.value = "";
  });

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("is-drag");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("is-drag");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer && e.dataTransfer.files[0];
    setLogo(file);
  });

  logoRemove.addEventListener("click", (e) => {
    e.stopPropagation();
    state.logo = null;
    logoThumb.removeAttribute("src");
    logoPreview.classList.add("hidden");
    renderQR();
  });

  // Logo size / margin / hide
  const logoSize = $("#logoSize");
  const logoSizeVal = $("#logoSizeVal");
  logoSize.addEventListener("input", (e) => {
    state.logoSize = Number(e.target.value);
    logoSizeVal.textContent = state.logoSize.toFixed(2);
    reflectRange(e.target);
    renderQR();
  });

  const logoMargin = $("#logoMargin");
  const logoMarginVal = $("#logoMarginVal");
  logoMargin.addEventListener("input", (e) => {
    state.logoMargin = Number(e.target.value);
    logoMarginVal.textContent = `${state.logoMargin} px`;
    reflectRange(e.target);
    renderQR();
  });

  $("#hideDots").addEventListener("change", (e) => {
    state.hideDots = e.target.checked;
    renderQR();
  });

  // -------- Style chips --------
  const wireChips = (rootSel, key) => {
    const root = $(rootSel);
    root.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      $$(".chip", root).forEach((c) => c.classList.remove("is-active"));
      btn.classList.add("is-active");
      state[key] = btn.dataset.value;
      renderQR();
    });
  };
  wireChips("#dotsTypeChips", "dotsType");
  wireChips("#cornerSqChips", "cornerSqType");
  wireChips("#cornerDotChips", "cornerDotType");

  // -------- Color pickers --------
  const wireColorPair = (colorSel, hexSel, key) => {
    const c = $(colorSel);
    const h = hexSel ? $(hexSel) : null;
    c.addEventListener("input", (e) => {
      state[key] = e.target.value;
      if (h) h.value = e.target.value;
      renderQR();
    });
    if (h) {
      h.addEventListener("change", (e) => {
        const v = e.target.value.trim();
        if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(v)) {
          state[key] = v;
          c.value = v.length === 4
            ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
            : v;
          renderQR();
        } else {
          h.value = state[key];
        }
      });
    }
  };
  wireColorPair("#dotColor", "#dotColorHex", "dotColor");
  wireColorPair("#bgColor", "#bgColorHex", "bgColor");
  wireColorPair("#cornerSqColor", "#cornerSqColorHex", "cornerSqColor");
  wireColorPair("#cornerDotColor", "#cornerDotColorHex", "cornerDotColor");
  wireColorPair("#gradStart", "#gradStartHex", "gradStart");
  wireColorPair("#gradEnd", "#gradEndHex", "gradEnd");

  // Background transparency toggle
  const bgTransparent = $("#bgTransparent");
  const bgColorInput = $("#bgColor");
  const bgColorHex = $("#bgColorHex");
  const reflectBgDisabled = () => {
    const off = state.bgTransparent;
    bgColorInput.disabled = off;
    bgColorHex.disabled = off;
    bgColorInput.parentElement.style.opacity = off ? "0.5" : "";
    bgColorInput.parentElement.style.pointerEvents = off ? "none" : "";
  };
  bgTransparent.addEventListener("change", (e) => {
    state.bgTransparent = e.target.checked;
    reflectBgDisabled();
    qrCanvas.classList.toggle("qr--checker", state.bgTransparent);
    renderQR();
  });

  // Gradient toggle
  const useGradient = $("#useGradient");
  const gradientGroup = $("#gradientGroup");
  useGradient.addEventListener("change", (e) => {
    state.useGradient = e.target.checked;
    gradientGroup.classList.toggle("hidden", !state.useGradient);
    renderQR();
  });
  $("#gradType").addEventListener("change", (e) => {
    state.gradType = e.target.value;
    renderQR();
  });

  // EC level / margin
  $("#ecLevel").addEventListener("change", (e) => {
    state.ecLevel = e.target.value;
    renderQR();
  });
  const qrMargin = $("#qrMargin");
  const qrMarginVal = $("#qrMarginVal");
  qrMargin.addEventListener("input", (e) => {
    state.qrMargin = Number(e.target.value);
    qrMarginVal.textContent = `${state.qrMargin} px`;
    reflectRange(e.target);
    renderQR();
  });

  // -------- Export --------
  const exportSize = $("#exportSize");
  const exportSizeVal = $("#exportSizeVal");
  exportSize.addEventListener("input", (e) => {
    state.exportSize = Number(e.target.value);
    exportSizeVal.textContent = `${state.exportSize} px`;
    reflectRange(e.target);
  });

  const setStatus = (msg, kind = "") => {
    const el = $("#status");
    el.textContent = msg || "";
    el.classList.remove("is-success", "is-error");
    if (kind) el.classList.add(`is-${kind}`);
    if (msg) {
      clearTimeout(setStatus._t);
      setStatus._t = setTimeout(() => {
        el.textContent = "";
        el.classList.remove("is-success", "is-error");
      }, 2400);
    }
  };

  const buildExportInstance = (extension) => {
    const opts = buildOptions(state.exportSize);
    opts.type = extension === "svg" ? "svg" : "canvas";
    return new QRCodeStylingLib(opts);
  };

  $("#downloadPng").addEventListener("click", async () => {
    try {
      const inst = buildExportInstance("png");
      await inst.download({ name: "qr-studio", extension: "png" });
      setStatus("PNG downloaded.", "success");
    } catch (err) {
      console.error(err);
      setStatus("Download failed.", "error");
    }
  });

  $("#downloadSvg").addEventListener("click", async () => {
    try {
      const inst = buildExportInstance("svg");
      await inst.download({ name: "qr-studio", extension: "svg" });
      setStatus("SVG downloaded.", "success");
    } catch (err) {
      console.error(err);
      setStatus("Download failed.", "error");
    }
  });

  $("#copyImg").addEventListener("click", async () => {
    try {
      const inst = buildExportInstance("png");
      const blob = await inst.getRawData("png");
      if (!blob) throw new Error("no blob");
      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setStatus("Copied to clipboard.", "success");
    } catch (err) {
      console.error(err);
      setStatus("Copy failed — try downloading instead.", "error");
    }
  });

  // -------- Reset --------
  $("#resetBtn").addEventListener("click", () => {
    state = structuredClone(defaults);
    applyStateToDOM();
    renderQR();
    setStatus("Reset to defaults.", "success");
  });

  // -------- Apply state -> DOM (used by reset and presets) --------
  function applyStateToDOM() {
    typeSelect.value = state.type;
    showTypePanel(state.type);

    $("#qrText").value = state.text;

    $("#wifiSsid").value = state.wifi.ssid;
    $("#wifiPass").value = state.wifi.pass;
    $("#wifiEnc").value = state.wifi.enc;
    $("#wifiHidden").checked = state.wifi.hidden;

    $("#emailTo").value = state.email.to;
    $("#emailSubject").value = state.email.subject;
    $("#emailBody").value = state.email.body;

    $("#smsTo").value = state.sms.to;
    $("#smsBody").value = state.sms.body;

    Object.entries(vMap).forEach(([sel, key]) => {
      const el = $(sel);
      if (el) el.value = state.vcard[key];
    });

    // Logo
    if (state.logo) {
      logoThumb.src = state.logo;
      logoPreview.classList.remove("hidden");
    } else {
      logoThumb.removeAttribute("src");
      logoPreview.classList.add("hidden");
    }

    logoSize.value = String(state.logoSize);
    logoSizeVal.textContent = state.logoSize.toFixed(2);
    reflectRange(logoSize);

    logoMargin.value = String(state.logoMargin);
    logoMarginVal.textContent = `${state.logoMargin} px`;
    reflectRange(logoMargin);

    $("#hideDots").checked = state.hideDots;

    // Chips
    const setChip = (rootSel, value) => {
      const root = $(rootSel);
      $$(".chip", root).forEach((c) =>
        c.classList.toggle("is-active", c.dataset.value === value)
      );
    };
    setChip("#dotsTypeChips", state.dotsType);
    setChip("#cornerSqChips", state.cornerSqType);
    setChip("#cornerDotChips", state.cornerDotType);

    // Colors
    $("#dotColor").value = state.dotColor;
    $("#dotColorHex").value = state.dotColor;
    $("#bgColor").value = state.bgColor;
    $("#bgColorHex").value = state.bgColor;
    bgTransparent.checked = state.bgTransparent;
    reflectBgDisabled();
    qrCanvas.classList.toggle("qr--checker", state.bgTransparent);
    $("#cornerSqColor").value = state.cornerSqColor;
    $("#cornerSqColorHex").value = state.cornerSqColor;
    $("#cornerDotColor").value = state.cornerDotColor;
    $("#cornerDotColorHex").value = state.cornerDotColor;

    useGradient.checked = state.useGradient;
    gradientGroup.classList.toggle("hidden", !state.useGradient);
    $("#gradStart").value = state.gradStart;
    $("#gradStartHex").value = state.gradStart;
    $("#gradEnd").value = state.gradEnd;
    $("#gradEndHex").value = state.gradEnd;
    $("#gradType").value = state.gradType;

    $("#ecLevel").value = state.ecLevel;
    qrMargin.value = String(state.qrMargin);
    qrMarginVal.textContent = `${state.qrMargin} px`;
    reflectRange(qrMargin);

    exportSize.value = String(state.exportSize);
    exportSizeVal.textContent = `${state.exportSize} px`;
    reflectRange(exportSize);
  }


  // ============================================================
  //   Visual chip icons — render small previews of each shape
  // ============================================================

  const SHAPE_LABELS = {
    square: "Square",
    dots: "Dots",
    rounded: "Rounded",
    "extra-rounded": "Extra rounded",
    classy: "Classy",
    "classy-rounded": "Classy rounded",
    dot: "Dot",
  };

  // Body shape: render an actual mini QR code so the user sees exactly
  // how that dot style looks when scanned at small size.
  const renderDotPreview = (chip, dotsType) => {
    chip.innerHTML = "";
    const inst = new QRCodeStylingLib({
      width: 56,
      height: 56,
      type: "canvas",
      data: "preview",
      margin: 0,
      qrOptions: { errorCorrectionLevel: "L" },
      backgroundOptions: { color: "transparent" },
      dotsOptions: { type: dotsType, color: "#f7f8f8" },
      cornersSquareOptions: { type: "extra-rounded", color: "#f7f8f8" },
      cornersDotOptions: { type: "dot", color: "#f7f8f8" },
    });
    inst.append(chip);
  };

  // Eye frame (corner square): show a finder-pattern outline.
  const buildCornerSqIcon = (type) => {
    let r = 0;
    if (type === "extra-rounded") r = 12;
    if (type === "dot") r = 22;
    return `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" fill="currentColor" fill-rule="evenodd">
      <path d="
        M 6 ${6 + r}
        A ${r} ${r} 0 0 1 ${6 + r} 6
        L ${50 - r} 6
        A ${r} ${r} 0 0 1 50 ${6 + r}
        L 50 ${50 - r}
        A ${r} ${r} 0 0 1 ${50 - r} 50
        L ${6 + r} 50
        A ${r} ${r} 0 0 1 6 ${50 - r}
        Z
        M 14 14 L 14 42 L 42 42 L 42 14 Z
      "/>
    </svg>`;
  };

  // Eye ball (corner dot): just the inner block.
  const buildCornerDotIcon = (type) => {
    const inner =
      type === "square"
        ? `<rect x="14" y="14" width="28" height="28"/>`
        : `<circle cx="28" cy="28" r="14"/>`;
    return `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${inner}</svg>`;
  };

  const initVisualChips = () => {
    $("#dotsTypeChips").classList.add("chips--visual");
    $$("#dotsTypeChips .chip").forEach((chip) => {
      const value = chip.dataset.value;
      const label = SHAPE_LABELS[value] || value;
      chip.classList.add("chip--visual");
      chip.setAttribute("title", label);
      chip.setAttribute("aria-label", label);
      renderDotPreview(chip, value);
    });

    $("#cornerSqChips").classList.add("chips--visual");
    $$("#cornerSqChips .chip").forEach((chip) => {
      const value = chip.dataset.value;
      const label = SHAPE_LABELS[value] || value;
      chip.classList.add("chip--visual");
      chip.setAttribute("title", label);
      chip.setAttribute("aria-label", label);
      chip.innerHTML = buildCornerSqIcon(value);
    });

    $("#cornerDotChips").classList.add("chips--visual");
    $$("#cornerDotChips .chip").forEach((chip) => {
      const value = chip.dataset.value;
      const label = SHAPE_LABELS[value] || value;
      chip.classList.add("chip--visual");
      chip.setAttribute("title", label);
      chip.setAttribute("aria-label", label);
      chip.innerHTML = buildCornerDotIcon(value);
    });
  };
  initVisualChips();

  // ============================================================
  //   Logo presets — popular brand icons
  // ============================================================

  const LOGO_PRESETS = [
    { name: "Instagram",  url: "https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg" },
    { name: "X",          url: "https://upload.wikimedia.org/wikipedia/commons/c/cc/X_icon.svg" },
    { name: "YouTube",    url: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" },
    { name: "WhatsApp",   url: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" },
    { name: "Facebook",   url: "https://upload.wikimedia.org/wikipedia/commons/b/b9/2023_Facebook_icon.svg" },
    { name: "GitHub",     url: "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" },
    { name: "LinkedIn",   url: "https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg" },
    { name: "TikTok",     url: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Tiktok_icon.svg" },
    { name: "Spotify",    url: "https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg" },
    { name: "Apple",      url: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
    { name: "Discord",    url: "https://cdn.simpleicons.org/discord/5865F2" },
    { name: "Telegram",   url: "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" },
  ];

  const renderLogoPresets = () => {
    const root = $("#logoPresets");
    if (!root) return;
    root.innerHTML = LOGO_PRESETS.map(
      (p, i) =>
        `<button type="button" class="logo-preset" data-i="${i}" title="${p.name}" aria-label="${p.name}">
          <span class="logo-preset__thumb"><img src="${p.url}" alt="${p.name}" loading="lazy"/></span>
          <span class="logo-preset__name">${p.name}</span>
        </button>`
    ).join("");

    root.addEventListener("click", (e) => {
      const btn = e.target.closest(".logo-preset");
      if (!btn) return;
      const idx = Number(btn.dataset.i);
      const preset = LOGO_PRESETS[idx];
      if (!preset) return;
      state.logo = preset.url;
      logoThumb.src = preset.url;
      logoName.textContent = `${preset.name}.svg`;
      logoPreview.classList.remove("hidden");
      $$(".logo-preset", root).forEach((b) =>
        b.classList.toggle("is-active", b === btn)
      );
      renderQR();
      setStatus(`Applied ${preset.name} logo.`, "success");
    });
  };
  renderLogoPresets();

  // Clear preset highlight when the user removes the logo or uploads a custom one.
  const clearPresetActive = () => {
    $$("#logoPresets .logo-preset").forEach((b) =>
      b.classList.remove("is-active")
    );
  };
  logoRemove.addEventListener("click", clearPresetActive);
  logoInput.addEventListener("change", clearPresetActive);
  dropzone.addEventListener("drop", clearPresetActive);

  // -------- Initial paint --------
  applyStateToDOM();
  renderQR();
})();
