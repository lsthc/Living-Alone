import { DataProvider } from '@/lib/DataProvider';
import { Ch0Window } from '@/chapters/Ch0_Window';
import { Ch1Faster } from '@/chapters/Ch1_Faster';
import { Ch2Where } from '@/chapters/Ch2_Where';
import { Ch3Who } from '@/chapters/Ch3_Who';
import { Ch4MyFamily } from '@/chapters/Ch4_MyFamily';
import { Ch5WhatNow } from '@/chapters/Ch5_WhatNow';
import { Ch6ResearchNote } from '@/chapters/Ch6_ResearchNote';

/**
 * 단일 페이지 스크롤 내러티브. 라우팅 없음.
 * 챕터는 순서대로 하나씩 추가한다 (현재 Ch0~Ch4).
 *
 * Ch0~Ch3 은 심야 남색(body 배경), Ch4 부터는 챕터가 종이색 배경을 직접 깔고 시작한다.
 */
export default function App() {
  return (
    <DataProvider>
      <main className="min-h-screen">
        <Ch0Window />
        <Ch1Faster />
        <Ch2Where />
        <Ch3Who />
        <Ch4MyFamily />
        <Ch5WhatNow />
        <Ch6ResearchNote />
      </main>
    </DataProvider>
  );
}
