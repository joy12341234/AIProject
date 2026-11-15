import { useEffect, useState } from "react";
import { addReview, deleteReview, getProject, getReviews, timeAgo, toggleLike, youtubeThumb } from "../api.js";
import { RankChart, Stars, StatTiles } from "../components/Charts.jsx";
import SceneCard from "../components/SceneCard.jsx";
import Timeline from "../components/Timeline.jsx";

const DIFFICULTY = ["", "아주 쉬움", "쉬움", "보통", "어려움", "아주 어려움"];
const avg = (list, key) => (list.length ? list.reduce((a, r) => a + r[key], 0) / list.length : 0);

function ReviewForm({ onSubmit }) {
  const [f, setF] = useState({ nickname: "", rating: 5, similarity: 4, difficulty: 3, comment: "", video_url: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit({ ...f, video_url: f.video_url.trim() || null });
    setBusy(false);
    if (ok) setF((p) => ({ ...p, comment: "", video_url: "" }));
  }

  return (
    <form className="review-form glass card-pad" onSubmit={submit}>
      <h4>이 콘티로 찍어 봤다면 후기를 남겨 주세요</h4>
      <div className="form-grid">
        <label>
          닉네임
          <input value={f.nickname} onChange={(e) => set("nickname")(e.target.value)} maxLength={20} required />
        </label>
        <label>
          <span>
            영상 링크 <span className="muted small">(선택 · 쇼츠·릴스 등)</span>
          </span>
          <input value={f.video_url} onChange={(e) => set("video_url")(e.target.value)} placeholder="https://" maxLength={300} />
        </label>
      </div>
      <div className="form-grid three">
        <div>
          만족도
          <Stars value={f.rating} onChange={set("rating")} label="만족도" />
        </div>
        <div>
          콘티대로 찍힌 정도
          <Stars value={f.similarity} onChange={set("similarity")} label="콘티 재현도" />
        </div>
        <div>
          <span>
            촬영 난이도 <span className="muted small">· {DIFFICULTY[f.difficulty]}</span>
          </span>
          <Stars value={f.difficulty} onChange={set("difficulty")} label="촬영 난이도" />
        </div>
      </div>
      <label>
        어떤 느낌으로 찍혔나요?
        <textarea
          value={f.comment}
          onChange={(e) => set("comment")(e.target.value)}
          rows={3}
          maxLength={500}
          minLength={2}
          required
          placeholder="예: 3번 컷 로우앵글이 생각보다 멋지게 나왔어요. 실내 컷은 조명이 부족했어요."
        />
      </label>
      <button className="btn-primary" disabled={busy}>
        {busy ? "등록 중..." : "후기 등록"}
      </button>
    </form>
  );
}

export default function Detail({ id, onUse, onOpenMine, notify }) {
  const [p, setP] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setP(null);
    setError("");
    Promise.all([getProject(id), getReviews(id)])
      .then(([proj, rv]) => {
        setP(proj);
        setReviews(rv);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <main className="page"><div className="empty glass">{error}</div></main>;
  if (!p) return <main className="page"><div className="empty glass"><span className="spinner" /></div></main>;

  const images = Object.fromEntries(Object.entries(p.images).map(([k, url]) => [k, { status: "done", url }]));

  async function like() {
    try {
      const r = await toggleLike(id);
      setP((x) => ({ ...x, liked: r.liked, likes: r.likes }));
    } catch (e) {
      notify(e.message);
    }
  }

  async function submitReview(body) {
    try {
      const r = await addReview(id, body);
      setReviews((list) => [r, ...list]);
      setP((x) => ({ ...x, reviews: x.reviews + 1 }));
      notify("후기를 등록했어요. 고마워요!");
      return true;
    } catch (e) {
      notify(e.message);
      return false;
    }
  }

  async function removeReview(rid) {
    if (!window.confirm("이 후기를 지울까요?")) return;
    try {
      await deleteReview(rid);
      setReviews((list) => list.filter((r) => r.id !== rid));
      setP((x) => ({ ...x, reviews: x.reviews - 1 }));
    } catch (e) {
      notify(e.message);
    }
  }

  const dist = [5, 4, 3, 2, 1].map((n) => ({
    key: n,
    label: `${"★".repeat(n)}`,
    value: reviews.filter((r) => r.rating === n).length,
    tip: `${n}점 ${reviews.filter((r) => r.rating === n).length}명`,
  }));

  return (
    <main className="page wide">
      <section className="detail-head glass">
        <div>
          <span className="chip chip-on">{p.format === "short" ? "숏폼 · 9:16" : "롱폼 · 16:9"}</span>
          <h2>{p.storyboard.title}</h2>
          <p className="muted">{p.plan.concept}</p>
          <div className="g-stats big">
            <span>♥ {p.likes}</span>
            <span>조회 {p.views}</span>
            <span>사용 {p.uses}</span>
            <span>후기 {p.reviews}</span>
          </div>
        </div>
        <div className="detail-actions">
          <button className={`btn-ghost ${p.liked ? "liked" : ""}`} onClick={like}>
            {p.liked ? "♥ 좋아요 취소" : "♡ 좋아요"}
          </button>
          {p.mine ? (
            <button className="btn-primary" onClick={() => onOpenMine(p)}>
              내 콘티 수정하기 ↗
            </button>
          ) : (
            <button className="btn-primary" onClick={() => onUse(p)}>
              이 콘티로 촬영하기 ↗
            </button>
          )}
        </div>
      </section>

      <div className={`scene-grid ${p.format === "short" ? "v" : "h"}`}>
        {p.storyboard.scenes.map((s, i, all) => (
          <SceneCard key={s.scene_no} scene={s} format={p.format} image={images[s.scene_no]} last={i === all.length - 1} readOnly />
        ))}
      </div>
      <div className="board-bottom">
        <Timeline scenes={p.storyboard.scenes} total={p.storyboard.total_sec} />
      </div>

      <h3 className="sub-title">촬영 후기 · 실제로 찍어 보니</h3>
      {reviews.length > 0 && (
        <div className="review-summary">
          <StatTiles
            items={[
              { label: "평균 만족도", value: `★ ${avg(reviews, "rating").toFixed(1)}`, sub: `${reviews.length}명 참여` },
              { label: "콘티 재현도", value: `${avg(reviews, "similarity").toFixed(1)} / 5`, sub: "콘티대로 찍힌 정도" },
              { label: "촬영 난이도", value: DIFFICULTY[Math.round(avg(reviews, "difficulty"))], sub: `${avg(reviews, "difficulty").toFixed(1)} / 5` },
            ]}
          />
          <div className="glass card-pad chart-card">
            <div className="chart-head">
              <h4>만족도 분포</h4>
              <span className="muted small">후기 {reviews.length}개</span>
            </div>
            <RankChart rows={dist} unit="명" />
          </div>
        </div>
      )}

      <div className="review-layout">
        <ReviewForm onSubmit={submitReview} />
        <div className="review-list">
          {reviews.length === 0 && (
            <div className="empty glass">
              <p>아직 후기가 없어요.</p>
              <p className="muted">이 콘티로 찍어 보고 첫 후기를 남겨 주세요!</p>
            </div>
          )}
          {reviews.map((r) => {
            const thumb = youtubeThumb(r.video_url);
            return (
              <article key={r.id} className="review glass">
                <div className="review-top">
                  <b>{r.nickname}</b>
                  <Stars value={r.rating} />
                  <span className="muted small">{timeAgo(r.created_at)}</span>
                  {r.mine && (
                    <button className="btn-mini" onClick={() => removeReview(r.id)}>
                      삭제
                    </button>
                  )}
                </div>
                <p>{r.comment}</p>
                <div className="review-meta">
                  <span>콘티 재현도 {r.similarity}/5</span>
                  <span>난이도 {DIFFICULTY[r.difficulty]}</span>
                </div>
                {r.video_url && (
                  <a className="video-link" href={r.video_url} target="_blank" rel="noopener noreferrer nofollow">
                    {thumb && <img src={thumb} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />}
                    <span>완성 영상 보기 ↗</span>
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
