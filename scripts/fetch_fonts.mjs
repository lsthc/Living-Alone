/**
 * 발표장 와이파이를 믿을 수 없으므로 폰트를 전부 로컬 번들에 넣는다.
 * Google Fonts CSS 를 받아 woff2 파일을 모두 내려받고, CSS 의 URL 을 상대경로로 바꾼다.
 * (한글 폰트는 유니코드 구간별로 잘게 쪼개져 있어 파일 수가 많다. 브라우저는 필요한 조각만 받는다.)
 *
 * 실행: node scripts/fetch_fonts.mjs
 * 결과: public/fonts/*.woff2 , public/fonts/fonts.css
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/fonts');
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
// woff2 를 주는 최신 브라우저인 척해야 한다. 아니면 구형 ttf 를 내려준다.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();

  const urls = [...new Set(css.match(/https:\/\/[^)]*\.woff2/g) ?? [])];
  console.log(`woff2 ${urls.length}개 내려받는 중…`);

  let done = 0;
  for (const url of urls) {
    // .../ijwSs5nh....0.woff2 → 파일명만 남긴다
    const name = url.split('/').slice(-2).join('_');
    const file = path.join(OUT, name);
    if (!fs.existsSync(file)) {
      const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
      fs.writeFileSync(file, buf);
    }
    css = css.split(url).join(`./${name}`);
    if (++done % 40 === 0) console.log(`  ${done}/${urls.length}`);
  }

  // Pretendard 변수 폰트는 별도로 받아둔 Pretendard.woff2 를 쓴다
  const pretendard = `@font-face {
  font-family: 'Pretendard';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('./Pretendard.woff2') format('woff2-variations');
}

`;
  fs.writeFileSync(path.join(OUT, 'fonts.css'), pretendard + css);
  console.log(`완료 — public/fonts/fonts.css (${urls.length + 1}개 파일)`);
}

main();
