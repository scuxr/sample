// Make every figure page show only the figure, filling the window: the text under the card is removed,
// and a thin band under the figure names the module, its definition and its main techniques.
// Run after any build:  node fill.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const MODULES = {
  "01.ballet-mirror/ballet-mirror": {
    n: "01", name: "현장몰입 모듈",
    def: "실제 학습 공간에 디지털 영상과 학습 보조정보를 결합하여 시연자와 같은 실제 대상이나 상황이 현장에 존재하는 것과 같은 실감형 환경에서 실습할 수 있도록 구현하는 기법",
    tags: ["투명 LED", "실물 크기 영상 송출", "좌우 반전", "영상 중첩", "실습 환경 연출"],
  },
  "02.walking-replay/walking-replay": {
    n: "02", name: "공간확장 모듈",
    def: "물리적 공간에서 직접 관찰하기 어려운 대상이나 장면을 실시간 또는 사전 촬영하고, 그 영상을 재구성·송출함으로써 물리적·시각적·시간적 제약을 넘어 비교·관찰·분석할 수 있도록 구현하는 기법",
    tags: ["투명 LED", "다중 영상 송출", "화면 분할", "영상 합성", "리플레이", "비교 영상"],
  },
  "06.golf-swing/golf-swing": {
    n: "06", name: "뷰 선택 모듈",
    def: "동일한 학습 대상이나 실습 과정을 교육 목적에 따라 서로 다른 위치, 방향 및 구도로 촬영하고, 학습자가 필요한 촬영 시점을 선택하여 관찰할 수 있도록 구현하는 기법",
    tags: ["다중 카메라", "정면·측면·후면·부감 촬영", "영상 동기화", "채널별 영상 선택"],
  },
  "04.experience-360/experience-360": {
    n: "04", name: "경험확장 모듈",
    def: "학습자가 직접 참여하거나 수행하기 어려운 상황을 수행자 중심의 시점으로 촬영하여, 해당 활동에 직접 참여하거나 수행하는 것과 유사한 경험을 제공하는 기법",
    tags: ["1인칭 시점 촬영(POV)", "360° VR 촬영", "바디캠", "공간음향"],
  },
  "03.greenhouse-360/greenhouse-360": {
    n: "03", name: "공간탐색 모듈",
    def: "실제 학습 대상 공간을 다양한 위치와 방향에서 촬영하고, 학습자가 관찰 방향이나 위치를 능동적으로 조작하여 공간의 구조와 구성 요소를 자율적으로 탐색할 수 있도록 구현하는 기법",
    tags: ["360° 카메라", "파노라마 촬영", "지점별 촬영", "가상투어"],
  },
  "07.zoom-greenhouse/zoom-greenhouse": {
    n: "07", name: "인터랙션 모듈",
    def: "교수자와 학습자 또는 온·오프라인 참여자 간 양방향 영상·음향 및 학습정보 교환 환경을 구성하여 질의응답, 토론, 실습 및 피드백 과정을 구현하는 기법",
    tags: ["실시간 영상·음향 송수신", "화상회의", "라이브 방송", "실습 결과 공유"],
  },
  "05.makeup-array/makeup-array": {
    n: "05", name: "다각도 관찰 모듈(VX)",
    def: "동일한 피사체를 중심으로 다수의 카메라를 일정한 각도와 간격으로 배열하여 동시 촬영하고, 촬영 영상을 동기화·통합함으로써 학습자가 피사체의 관찰 시점을 연속적으로 전환할 수 있도록 구현하는 기법",
    tags: ["카메라 어레이(Camera Array)", "정밀 다각도 동시 촬영", "영상 동기화", "연속 시점 전환"],
  },
};

const NOTE_H = 92;
const CSS = `<style data-fill>
html,body{height:100%;margin:0;overflow:hidden}
.iso-page{width:100vw!important;max-width:none!important;margin:0!important;height:calc(100vh - ${NOTE_H}px)}
.iso-figure{margin:0!important;height:calc(100vh - ${NOTE_H}px)}
.iso-legend{display:none!important}
.iso-plate{height:calc(100vh - ${NOTE_H}px);padding:44px 20px 40px!important;display:flex;align-items:center;justify-content:center}
.iso-stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
.iso-stage>.iso-svg{width:100%;height:100%;max-height:100%}
.module-note{position:fixed;left:0;right:0;bottom:0;height:${NOTE_H}px;box-sizing:border-box;padding:12px 28px 14px;display:grid;grid-template-columns:auto 1fr;column-gap:22px;row-gap:6px;align-items:start;
 background:var(--anatomy-page);color:var(--anatomy-text);font-family:Pretendard,"Malgun Gothic",system-ui,sans-serif;letter-spacing:0;border-top:1px solid rgba(127,127,127,.25)}
.module-note .mn-name{grid-row:1/3;display:flex;flex-direction:column;gap:2px;padding-right:22px;border-right:1px solid rgba(127,127,127,.25);min-width:132px}
.module-note .mn-k{font-size:10.5px;opacity:.55;letter-spacing:.06em}
.module-note .mn-t{font-size:16px;font-weight:700;white-space:nowrap}
.module-note .mn-def{font-size:12.5px;line-height:1.55;opacity:.85;margin:0}
.module-note .mn-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.module-note .mn-tags b{font-size:10.5px;font-weight:600;opacity:.55;margin-right:4px}
.module-note .mn-tags span{font-size:11px;padding:2px 9px;border-radius:999px;border:1px solid rgba(127,127,127,.35);opacity:.9}
</style>`;

const noteOf = (m) => `<aside class="module-note">
<div class="mn-name"><span class="mn-k">MODULE ${m.n}</span><span class="mn-t">${m.name}</span></div>
<p class="mn-def">${m.def}</p>
<div class="mn-tags"><b>주요 구현 기법</b>${m.tags.map((t) => `<span>${t}</span>`).join("")}</div>
</aside>`;

for (const [base, m] of Object.entries(MODULES)) {
  for (const rel of [base + ".html", base + "-light.html"]) {
    const file = join(HERE, rel);
    if (!existsSync(file)) { console.log("skip", rel); continue; }
    let html = readFileSync(file, "utf8");
    html = html.replace(/<style data-fill>[\s\S]*?<\/style>/, "");
    html = html.replace(/<aside class="module-note">[\s\S]*?<\/aside>/, "");
    // The legend and caption under the card are taken out of the page, not just hidden.
    html = html.replace(/<figcaption class="iso-legend">[\s\S]*?<\/figcaption>/, "");
    html = html.replace("</head>", CSS + "</head>");
    html = html.replace("</figure></main>", "</figure>" + noteOf(m) + "</main>");
    writeFileSync(file, html);
    console.log("filled", rel);
  }
}
