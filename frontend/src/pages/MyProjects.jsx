import { useEffect, useState } from "react";
import { deleteProject, getMyProjects } from "../api.js";
import FrameCard from "../components/FrameCard.jsx";
import PageHero, { EmptyFrame, pad } from "../components/PageHero.jsx";

export default function MyProjects({ onOpen, onView, onCreate, notify }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    getMyProjects()
      .then(setItems)
      .catch((e) => notify(e.message));
  }, [notify]);

  async function remove(id) {
    if (!window.confirm("이 콘티를 지울까요? 받은 좋아요와 후기도 함께 지워져요.")) return;
    try {
      await deleteProject(id);
      setItems((list) => list.filter((i) => i.id !== id));
    } catch (e) {
      notify(e.message);
    }
  }

  const count = items?.length ?? 0;
  const pub = items?.filter((i) => i.shared).length ?? 0;

  return (
    <main className="gpage">
      <PageHero
        word="ARCHIVE"
        micro="My storyboards — 내 콘티 보관함"
        title="내 콘티"
        desc="이 브라우저에서 저장한 콘티예요. 카드를 누르면 촬영·편집 가이드까지 이어서 작업할 수 있어요."
        hud={
          <>
            <span className="rec">
              <i />
              REC
            </span>
            <span>SAVED {pad(count, 3)}</span>
            <span>PUBLIC {pad(pub, 3)}</span>
          </>
        }
        action={
          <button className="btn-primary big" onClick={onCreate} data-cursor="NEW">
            + 새 콘티 만들기
          </button>
        }
      />

      <div className="page wide after-hero">
        {items && count === 0 && (
          <EmptyFrame
            title="아직 저장한 콘티가 없어요"
            desc="콘티를 만든 뒤 ‘저장하기’를 누르면 여기에 모여요. 다른 기기에서는 보이지 않아요."
            action={
              <button className="btn-primary" onClick={onCreate}>
                첫 콘티 만들기 ↗
              </button>
            }
          />
        )}

        {count > 0 && (
          <div className="sec-head" data-reveal>
            <div>
              <span className="micro">Takes</span>
              <h2>저장한 콘티 {count}개</h2>
            </div>
            <span className="muted small">공개한 콘티 {pub}개 · 비공개 {count - pub}개</span>
          </div>
        )}

        <div className="fgrid">
          {items?.map((it, k) => (
            <FrameCard key={it.id} item={it} index={k} onOpen={onOpen} cursor="OPEN">
              {/* 영화 슬레이트(클래퍼보드) 모양의 정보·버튼 영역 */}
              <div className="slate" onClick={(e) => e.stopPropagation()}>
                <div className="slate-stripes" aria-hidden="true" />
                <dl className="slate-info">
                  <div>
                    <dt>Roll</dt>
                    <dd>{pad(k + 1)}</dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>{it.format === "short" ? "숏폼" : "롱폼"}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd className={`chip ${it.shared ? "chip-on" : ""}`}>{it.shared ? "공개" : "비공개"}</dd>
                  </div>
                </dl>
                <div className="slate-actions">
                  <button className="btn-mini" onClick={() => onOpen(it.id)}>
                    이어서 작업
                  </button>
                  {it.shared && (
                    <button className="btn-mini" onClick={() => onView(it.id)}>
                      갤러리 보기
                    </button>
                  )}
                  <button className="btn-mini danger" onClick={() => remove(it.id)}>
                    삭제
                  </button>
                </div>
              </div>
            </FrameCard>
          ))}
        </div>
      </div>
    </main>
  );
}
