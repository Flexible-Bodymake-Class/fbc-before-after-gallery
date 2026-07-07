/* =========================================================================
   FBC Before / After Gallery
   バニラJS。data/gallery.json を読み込み、新着ハイライト＋グリッドを描画。
   ========================================================================= */

// 実運用時に差し替えるプレースホルダ
const CONFIG = {
  formUrl: "FORM_URL_PLACEHOLDER",
  discordChannelUrl: "DISCORD_URL_PLACEHOLDER"
};

// フィルタ用テーマ語彙（gallery.json の themes と一致させる）
const THEMES = ["土台編", "ツイスト・側屈", "ダウンドッグ・前屈", "縦開脚", "スワン", "ブリッジ", "キングピジョン", "横開脚", "X脚改善", "O脚改善", "習慣化", "姿勢", "ボディメイク", "その他"];

const EMPTY_MESSAGE = "まだ投稿がありません。最初の一歩を、あなたから。";
const NO_MATCH_MESSAGE = "選んだテーマの記録は、まだありません。";

let allEntries = [];
let activeFilter = "すべて";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  applyConfigLinks();

  try {
    const res = await fetch("data/gallery.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    allEntries = Array.isArray(data.entries) ? data.entries : [];
  } catch (err) {
    console.error("gallery.json の読み込みに失敗しました:", err);
    allEntries = [];
  }

  render();
  setupReveal();
}

/* CONFIG のリンクを反映 */
function applyConfigLinks() {
  const form = document.getElementById("cta-form");
  const discord = document.getElementById("cta-discord");
  if (form) form.href = CONFIG.formUrl;
  if (discord) discord.href = CONFIG.discordChannelUrl;
}

/* ---- 全体描画 --------------------------------------------------------- */
function render() {
  const featuredSection = document.getElementById("featured-section");
  const filter = document.getElementById("filter");
  const gallery = document.getElementById("gallery");
  const empty = document.getElementById("empty");

  // 0件：空状態のみ表示
  if (allEntries.length === 0) {
    if (featuredSection) featuredSection.hidden = true;
    if (filter) filter.hidden = true;
    gallery.innerHTML = "";
    empty.textContent = EMPTY_MESSAGE;
    empty.hidden = false;
    return;
  }

  if (featuredSection) featuredSection.hidden = false;
  if (filter) filter.hidden = false;

  renderFeatured(allEntries[0]);
  buildFilter();
  renderGallery();
}

/* ---- 新着ハイライト --------------------------------------------------- */
function renderFeatured(entry) {
  const slot = document.getElementById("featured");
  slot.innerHTML = "";
  const card = buildCard(entry, { featured: true });
  slot.appendChild(card);
}

/* ---- フィルタボタン --------------------------------------------------- */
function buildFilter() {
  const filter = document.getElementById("filter");
  filter.innerHTML = "";
  const items = ["すべて", ...THEMES];

  items.forEach((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", String(label === activeFilter));
    btn.addEventListener("click", () => {
      activeFilter = label;
      filter.querySelectorAll(".chip").forEach((c) =>
        c.setAttribute("aria-pressed", String(c.textContent === activeFilter))
      );
      renderGallery();
    });
    filter.appendChild(btn);
  });
}

/* ---- グリッド --------------------------------------------------------- */
function renderGallery() {
  const gallery = document.getElementById("gallery");
  const empty = document.getElementById("empty");
  gallery.innerHTML = "";

  const list = allEntries.filter(
    (e) => activeFilter === "すべて" || (Array.isArray(e.themes) && e.themes.includes(activeFilter))
  );

  if (list.length === 0) {
    empty.textContent = NO_MATCH_MESSAGE;
    empty.hidden = false;
  } else {
    empty.hidden = true;
    const frag = document.createDocumentFragment();
    list.forEach((entry) => frag.appendChild(buildCard(entry)));
    gallery.appendChild(frag);
  }

  setupReveal();
}

/* ---- カード生成 ------------------------------------------------------- */
function buildCard(entry, opts = {}) {
  const tpl = document.getElementById("card-template");
  const card = tpl.content.firstElementChild.cloneNode(true);
  card.id = "entry-" + entry.id;

  if (opts.featured) {
    card.classList.remove("card");
    card.classList.add("featured-card");
  }

  const q = (sel) => card.querySelector(sel);
  const cls = opts.featured ? "featured-card" : "card";

  // a. 困っていたこと
  const concern = q("." + cls + "__concern") || q(".card__concern");
  concern.textContent = entry.concern || "";

  // b. BA写真
  const media = q("." + cls + "__media") || q(".card__media");
  media.appendChild(buildMedia(entry));

  // c. メタ行
  const meta = q("." + cls + "__meta") || q(".card__meta");
  meta.appendChild(buildMeta(entry));

  // テーマタグ
  const themesBox = q(".card__themes");
  (entry.themes || []).forEach((t) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = t;
    themesBox.appendChild(tag);
  });

  // d. 本人メッセージ
  const message = q("." + cls + "__message") || q(".card__message");
  if (entry.memberMessage) {
    message.textContent = entry.memberMessage;
  } else {
    message.remove();
  }

  // e. Taichiより
  const taichiText = q(".card__taichi-text");
  const taichiBlock = q(".card__taichi");
  if (entry.taichiMessage) {
    taichiText.textContent = entry.taichiMessage;
  } else if (taichiBlock) {
    taichiBlock.remove();
  }

  return card;
}

/* BA写真ブロック（2枚 or combined 1枚） */
function buildMedia(entry) {
  const wrap = document.createElement("div");
  const name = entry.nickname || "会員";

  if (entry.combinedImage) {
    wrap.className = "card__media card__media--single";
    wrap.appendChild(makeBa(entry.combinedImage, name + "さんのBefore / After写真", null));
  } else {
    wrap.className = "card__media card__media--pair";
    wrap.appendChild(makeBa(entry.beforeImage, name + "さんのBefore写真", "Before"));
    wrap.appendChild(makeBa(entry.afterImage, name + "さんのAfter写真", "After"));
  }
  return wrap;
}

function makeBa(src, alt, label) {
  const fig = document.createElement("div");
  fig.className = "ba";
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  img.decoding = "async";
  fig.appendChild(img);
  if (label) {
    const tag = document.createElement("span");
    tag.className = "ba__label";
    tag.textContent = label;
    fig.appendChild(tag);
  }
  return fig;
}

/* メタ行（ニックネーム / 年代 / 継続期間） */
function buildMeta(entry) {
  const frag = document.createDocumentFragment();

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = entry.nickname || "会員";
  frag.appendChild(name);

  [entry.ageGroup, entry.duration].filter(Boolean).forEach((val) => {
    const dot = document.createElement("span");
    dot.className = "dot";
    frag.appendChild(dot);
    const span = document.createElement("span");
    span.textContent = val;
    frag.appendChild(span);
  });

  return frag;
}

/* ---- スクロールで現れる控えめなアニメーション ------------------------ */
let revealObserver = null;
function setupReveal() {
  const targets = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
  }
  targets.forEach((el) => revealObserver.observe(el));
}
