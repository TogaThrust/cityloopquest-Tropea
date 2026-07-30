/**
 * i18n pages culture / annexes — complète le bootstrap inline si présent.
 */
(function () {
  if (window.__CLQ_CULTURE_I18N_INLINE__) {
    return;
  }

  const LANG_ALIASES = {
    ja: ["ja", "jp"],
    jp: ["jp", "ja"],
    cn: ["cn", "zh", "zh-cn"],
    zh: ["zh", "cn", "zh-cn"],
  };

  const BACK_BUTTON_LABELS = {
    fr: "RETOUR", en: "BACK", nl: "TERUG", de: "ZURÜCK", it: "INDIETRO",
    es: "VOLVER", pl: "POWRÓT", ar: "رجوع", cn: "返回", ja: "戻る", jp: "戻る", zh: "返回",
  };

  function normalizeLang(lang) {
    let code = String(lang || "").toLowerCase().trim();
    if (!code) code = String(localStorage.getItem("selectedLanguage") || "fr").toLowerCase();
    if (code === "jp") return "ja";
    if (code === "zh" || code === "zh-cn") return "cn";
    return code;
  }

  function resolveLang() {
    return normalizeLang(localStorage.getItem("selectedLanguage") || "") || "fr";
  }

  function pickStrict(map, lang) {
    if (!map || typeof map !== "object") return "";
    const codes = LANG_ALIASES[lang] || [lang];
    for (const code of codes) {
      const exact = map[code];
      if (exact != null && String(exact).trim() !== "") return exact;
    }
    return "";
  }

  function resolveCultureImageSrc(src) {
    const map = window.CLQ_CULTURE_IMAGE_URLS || {};
    return map[src] || src;
  }

  function cultureTextToHtml(text) {
    function esc(value) {
      return String(value || "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch]);
    }
    const blocks = String(text || "").split(/\n{2,}/).filter(Boolean);
    return blocks.map((block) => {
      const inline = block.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
      if (inline) {
        const caption = inline[1].trim();
        const src = resolveCultureImageSrc(inline[2].trim());
        return `<figure class="culture-inline-photo"><img src="${esc(src)}" alt="${esc(caption)}" loading="lazy" /><figcaption>${esc(caption)}</figcaption></figure>`;
      }
      return `<p>${esc(block).replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
  }

  function applyCultureBackButton(lang) {
    const code = normalizeLang(lang);
    const label = BACK_BUTTON_LABELS[code] || BACK_BUTTON_LABELS.fr;
    document.querySelectorAll('[data-translate="back_button"]').forEach((el) => {
      el.textContent = label;
    });
  }

  function applyCulturePageI18n() {
    const opts = window.CLQ_CULTURE_I18N_OPTS || {};
    const contentSelector = opts.contentSelector || ".info-text";
    const linkSelector = opts.linkSelector || "[data-title-i18n]";
    const appTitle = opts.appTitle || "";
    const lang = resolveLang();
    const data = window.CLQ_PAGE_I18N || {};

    const title = pickStrict(data.title, lang);
    if (title) {
      document.title = appTitle ? `${title} - ${appTitle}` : title;
      const pageTitle = document.querySelector("[data-culture-page-title]") || document.querySelector("body > h1");
      if (pageTitle) pageTitle.textContent = title;
    }

    const container = document.querySelector(contentSelector);
    const strictContent = pickStrict(data.content, lang);
    if (container) {
      const appliedLang = container.getAttribute("data-culture-lang");
      const storedLang = normalizeLang(localStorage.getItem("selectedLanguage") || "");
      const skipContent = appliedLang && appliedLang !== "fr" && storedLang && storedLang !== "fr" && lang === "fr";
      if (!skipContent) {
        if (strictContent) {
          container.innerHTML = cultureTextToHtml(strictContent);
          container.setAttribute("data-culture-lang", lang);
        } else if (lang === "fr") {
          const frContent = pickStrict(data.content, "fr");
          if (frContent) {
            container.innerHTML = cultureTextToHtml(frContent);
            container.setAttribute("data-culture-lang", "fr");
          }
        }
      }
    }

    document.querySelectorAll(linkSelector).forEach((el) => {
      try {
        const map = JSON.parse(el.getAttribute("data-title-i18n") || "{}");
        const label = pickStrict(map, lang);
        if (label) {
          const prefix = el.getAttribute("data-title-prefix") || "";
          el.textContent = prefix + label;
        }
      } catch {
        // ignore
      }
    });

    applyCultureBackButton(lang);
    document.documentElement.lang = lang === "cn" ? "zh" : (lang === "ja" ? "ja" : lang);
  }

  window.applyCulturePageI18n = applyCulturePageI18n;

  document.addEventListener("languageChanged", () => {
    applyCulturePageI18n();
  });

  function boot() {
    applyCulturePageI18n();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
