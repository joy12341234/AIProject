import { useCallback, useEffect, useRef, useState } from "react";
import Cursor from "./components/Cursor.jsx";
import Header from "./components/Header.jsx";
import SaveBar from "./components/SaveBar.jsx";
import Detail from "./pages/Detail.jsx";
import Editing from "./pages/Editing.jsx";
import Gallery from "./pages/Gallery.jsx";
import Home from "./pages/Home.jsx";
import MyProjects from "./pages/MyProjects.jsx";
import PlanSelect from "./pages/PlanSelect.jsx";
import Shooting from "./pages/Shooting.jsx";
import Storyboard from "./pages/Storyboard.jsx";
import {
  createEditGuide,
  createPlans,
  createSceneImage,
  createShootingGuide,
  createStoryboard,
  getHealth,
  getProject,
  markUse,
  refinePlan,
  runQueue,
  saveProject,
} from "./api.js";
import { initFx, scrollToTop } from "./fx.js";

const LOADING_TEXT = {
  plan: "AI가 기획안을 만들고 있어요",
  refine: "AI가 의견을 반영해 기획을 다듬고 있어요",
  storyboard: "AI가 콘티를 짜고 있어요",
  shooting: "AI가 촬영 가이드를 만들고 있어요",
  editing: "AI가 편집 가이드를 만들고 있어요",
  save: "저장하고 있어요",
  open: "콘티를 불러오고 있어요",
};

// view: create(만들기) / gallery / detail / my
// step: 0 홈, 1 기획안 선택, 2 콘티, 3 촬영 가이드, 4 편집 가이드
export default function App() {
  const [health, setHealth] = useState(null);
  const [view, setView] = useState("create");
  const [detailId, setDetailId] = useState(null);
  const [step, setStep] = useState(0);

  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("short");
  const [style, setStyle] = useState(null);

  const [plans, setPlans] = useState([]);
  const [mock, setMock] = useState(false);
  const [selected, setSelected] = useState(null);
  // 기획안 다듬기 기록: { 기획 번호: { history: [이전 버전들], changes, feedback } }
  const [revisions, setRevisions] = useState({});

  const [storyboard, setStoryboard] = useState(null);
  const [images, setImages] = useState({}); // scene_no -> { status, url, error }
  const boardId = useRef(0); // 콘티를 새로 만들면 이전 그림 결과는 무시
  const [shooting, setShooting] = useState(null);
  const [editing, setEditing] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [shared, setShared] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const [loading, setLoading] = useState("");
  const [toast, setToast] = useState("");
  const notify = useCallback((msg) => setToast(msg), []);

  // 백엔드가 늦게 켜져도 상태 표시가 갱신되도록 5초마다 확인
  useEffect(() => initFx(), []);

  useEffect(() => {
    const check = () => getHealth().then(setHealth).catch(() => setHealth(null));
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  async function run(kind, fn) {
    setLoading(kind);
    try {
      return await fn();
    } catch (e) {
      notify(e.message);
    } finally {
      setLoading("");
    }
  }

  function resetProject() {
    setShooting(null);
    setEditing(null);
    setProjectId(null);
    setShared(false);
    setSavedAt(null);
  }

  // ---------- 만들기 흐름 ----------
  const generatePlans = () =>
    run("plan", async () => {
      const data = await createPlans({ topic: topic.trim(), format, style });
      setPlans(data.plans);
      setMock(data.mock);
      setSelected(null);
      setRevisions({});
      setStoryboard(null);
      resetProject();
      setStep(1);
      scrollToTop();
    });

  // 고른 기획안에 사용자 의견을 반영해 새 버전으로 교체 (이전 버전은 되돌리기용으로 보관)
  const refineSelected = (feedback) =>
    run("refine", async () => {
      const i = selected;
      const data = await refinePlan({ topic: topic.trim(), format, plans, index: i, feedback });
      setRevisions((r) => ({
        ...r,
        [i]: { history: [...(r[i]?.history ?? []), plans[i]], changes: data.changes, feedback },
      }));
      setPlans((ps) => ps.map((p, j) => (j === i ? data.plan : p)));
      notify("의견을 반영했어요. 바뀐 점을 확인해 보세요.");
      return true;
    });

  function undoRefine() {
    const i = selected;
    const rev = revisions[i];
    if (!rev?.history.length) return;
    const prev = rev.history[rev.history.length - 1];
    const history = rev.history.slice(0, -1);
    setPlans((ps) => ps.map((p, j) => (j === i ? prev : p)));
    setRevisions((r) => ({ ...r, [i]: history.length ? { history, changes: null, feedback: "" } : undefined }));
  }

  async function drawScene(scene, sb, id = boardId.current) {
    const set = (v) => id === boardId.current && setImages((prev) => ({ ...prev, [scene.scene_no]: v }));
    set({ status: "loading" });
    try {
      const data = await createSceneImage({ scene, characters: sb.characters, format: sb.format });
      set({ status: "done", url: data.image_url });
    } catch (e) {
      set({ status: "error", error: e.message });
    }
  }

  const generateStoryboard = () =>
    run("storyboard", async () => {
      const sb = await createStoryboard({ topic: topic.trim(), format, plan: plans[selected] });
      const id = ++boardId.current;
      setStoryboard(sb);
      setImages({});
      resetProject();
      setStep(2);
      scrollToTop();
      // 숏폼은 전체 컷, 롱폼은 앞 4장면만 자동으로 그림 (비용 절약)
      const auto = sb.format === "short" ? sb.scenes : sb.scenes.slice(0, 4);
      runQueue(auto, 3, (s) => drawScene(s, sb, id));
    });

  const generateShooting = (env) =>
    run("shooting", async () => {
      const data = await createShootingGuide({ storyboard, ...env });
      setShooting({ ...data, env, progress: { done: {}, checks: {}, prep: {} } });
    });

  const generateEditing = (app) =>
    run("editing", async () => {
      const data = await createEditGuide({ storyboard, app });
      setEditing({ ...data, app });
    });

  // ---------- 저장·공유 ----------
  const save = (sharedOverride) =>
    run("save", async () => {
      const isShared = sharedOverride ?? shared;
      const done = Object.fromEntries(
        Object.entries(images)
          .filter(([, v]) => v.status === "done")
          .map(([k, v]) => [k, v.url])
      );
      const body = { topic, format, plan: plans[selected], storyboard, images: done, shooting, editing, shared: isShared };
      const { id } = await saveProject(projectId, body);
      setProjectId(id);
      setShared(isShared);
      setSavedAt(Date.now());
      notify(isShared ? "저장했어요. 갤러리에 공개됐어요." : "저장했어요. ‘내 콘티’에서 다시 열 수 있어요.");
      return id;
    });

  async function shareAndView() {
    const id = await save(true);
    if (id) openDetail(id);
  }

  // 갤러리·내 콘티에서 불러와 이어서 작업
  function loadProject(p, mine) {
    boardId.current += 1;
    setTopic(p.topic);
    setFormat(p.format);
    setStyle(null);
    setPlans([p.plan]);
    setSelected(0);
    setRevisions({});
    setMock(false);
    setStoryboard(p.storyboard);
    setImages(Object.fromEntries(Object.entries(p.images).map(([k, url]) => [k, { status: "done", url }])));
    setShooting(p.shooting ?? null);
    setEditing(p.editing ?? null);
    setProjectId(mine ? p.id : null); // 남의 콘티는 내 콘티로 새로 저장됨
    setShared(mine ? p.shared : false);
    setSavedAt(null);
    setView("create");
    setStep(2);
    scrollToTop();
  }

  async function takeProject(p) {
    markUse(p.id).catch(() => {});
    loadProject(p, false);
    notify("이 콘티를 가져왔어요. 촬영 가이드부터 이어서 진행해 보세요.");
  }

  const openMine = (id) => run("open", async () => loadProject(await getProject(id), true));

  function openDetail(id) {
    setDetailId(id);
    setView("detail");
    scrollToTop();
  }

  function nav(v) {
    setView(v);
    scrollToTop();
  }

  function goHome() {
    setView("create");
    setStep(0);
    scrollToTop();
  }

  function goStep(s) {
    setStep(s);
    scrollToTop();
  }

  const saveBar = (
    <SaveBar
      projectId={projectId}
      shared={shared}
      setShared={setShared}
      onSave={() => save()}
      saving={loading === "save"}
      savedAt={savedAt}
    />
  );

  // 헤더 단계 표시: 홈·기획안 선택은 둘 다 '기획'
  const stage = step <= 1 ? 0 : step - 1;
  const canStage = (i) => i === 0 || !!storyboard;
  const onStage = (i) => goStep(i === 0 ? (plans.length ? 1 : 0) : i + 1);

  return (
    <div className="app">
      <Cursor />
      <Header
        view={view}
        onNav={nav}
        stage={stage}
        canStage={canStage}
        onStage={onStage}
        showSteps={view === "create" && step > 0}
        health={health}
        onHome={goHome}
      />

      {toast && (
        <div className="toast" onClick={() => setToast("")}>
          {toast}
        </div>
      )}

      {loading && loading !== "save" && (
        <div className="overlay">
          <div className="overlay-box">
            <span className="rec">
              <i />
              REC
            </span>
            <b>{LOADING_TEXT[loading]}</b>
            <span className="muted">10~40초 정도 걸릴 수 있어요</span>
          </div>
        </div>
      )}

      {view === "gallery" && <Gallery onOpen={openDetail} onCreate={goHome} />}
      {view === "detail" && detailId && (
        <Detail id={detailId} onUse={takeProject} onOpenMine={(p) => loadProject(p, true)} notify={notify} />
      )}
      {view === "my" && <MyProjects onOpen={openMine} onView={openDetail} onCreate={goHome} notify={notify} />}

      {view === "create" && (
        <>
          {step === 0 && (
            <Home
              topic={topic}
              setTopic={setTopic}
              format={format}
              setFormat={setFormat}
              style={style}
              setStyle={setStyle}
              onStart={generatePlans}
              loading={!!loading}
              onGallery={() => nav("gallery")}
              onOpen={openDetail}
            />
          )}

          {step === 1 && (
            <PlanSelect
              topic={topic}
              format={format}
              plans={plans}
              mock={mock}
              selected={selected}
              setSelected={setSelected}
              onRetry={generatePlans}
              onNext={generateStoryboard}
              revisions={revisions}
              onRefine={refineSelected}
              onUndo={undoRefine}
              loading={!!loading}
            />
          )}

          {step === 2 && storyboard && (
            <Storyboard
              storyboard={storyboard}
              plan={plans[selected]}
              images={images}
              onDraw={(s) => drawScene(s, storyboard)}
              onRemake={generateStoryboard}
              onBack={() => goStep(1)}
              onNext={() => goStep(3)}
              loading={!!loading}
              saveBar={saveBar}
            />
          )}

          {step === 3 && storyboard && (
            <Shooting
              storyboard={storyboard}
              images={images}
              shooting={shooting}
              setShooting={setShooting}
              onGenerate={generateShooting}
              loading={!!loading}
              onNext={() => goStep(4)}
              saveBar={saveBar}
            />
          )}

          {step === 4 && storyboard && (
            <Editing
              storyboard={storyboard}
              images={images}
              editing={editing}
              onGenerate={generateEditing}
              loading={!!loading}
              saveBar={saveBar}
              onShare={shareAndView}
              shared={shared && !!projectId}
              notify={notify}
            />
          )}
        </>
      )}
    </div>
  );
}
