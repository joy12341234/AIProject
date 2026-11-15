import { useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import PlanSelect from "./pages/PlanSelect.jsx";
import Storyboard from "./pages/Storyboard.jsx";
import { createPlans, createSceneImage, createStoryboard, getHealth, runQueue } from "./api.js";

// 0 홈, 1 기획안 선택, 2 콘티 (촬영·편집은 다음 단계에서 추가)
export default function App() {
  const [health, setHealth] = useState(null);
  const [step, setStep] = useState(0);

  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("short");
  const [style, setStyle] = useState(null);

  const [plans, setPlans] = useState([]);
  const [mock, setMock] = useState(false);
  const [selected, setSelected] = useState(null);

  const [storyboard, setStoryboard] = useState(null);
  const [images, setImages] = useState({}); // scene_no -> { status, url, error }
  const boardId = useRef(0); // 콘티를 새로 만들면 이전 그림 결과는 무시

  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  // 백엔드가 늦게 켜져도 상태 표시가 갱신되도록 5초마다 확인
  useEffect(() => {
    const check = () => getHealth().then(setHealth).catch(() => setHealth(null));
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  async function generatePlans() {
    setLoading("plan");
    setError("");
    try {
      const data = await createPlans({ topic: topic.trim(), format, style });
      setPlans(data.plans);
      setMock(data.mock);
      setSelected(null);
      setStep(1);
    } catch (e) {
      setError(`⚠️ ${e.message}`);
    } finally {
      setLoading("");
    }
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

  async function generateStoryboard() {
    const plan = plans[selected];
    setLoading("storyboard");
    setError("");
    try {
      const sb = await createStoryboard({ topic: topic.trim(), format, plan });
      const id = ++boardId.current;
      setStoryboard(sb);
      setImages({});
      setStep(2);
      // 숏폼은 전체 컷, 롱폼은 앞 4장면만 자동으로 그림 (비용 절약)
      const auto = sb.format === "short" ? sb.scenes : sb.scenes.slice(0, 4);
      runQueue(auto, 3, (s) => drawScene(s, sb, id));
    } catch (e) {
      setError(`⚠️ ${e.message}`);
    } finally {
      setLoading("");
    }
  }

  function goHome() {
    setStep(0);
    setError("");
  }

  return (
    <div className="app">
      <div className="bg-glow" />
      {/* 홈·기획안 선택은 둘 다 '기획' 단계 */}
      <Header step={step <= 1 ? 0 : step - 1} health={health} onHome={goHome} />

      {error && (
        <div className="toast" onClick={() => setError("")}>
          {error}
        </div>
      )}

      {loading && (
        <div className="overlay">
          <div className="overlay-box glass">
            <span className="spinner big" />
            <b>{loading === "plan" ? "AI가 기획안을 만들고 있어요" : "AI가 콘티를 짜고 있어요"}</b>
            <span className="muted">10~40초 정도 걸릴 수 있어요</span>
          </div>
        </div>
      )}

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
          onBack={() => setStep(1)}
          onNext={() => setError("촬영 가이드는 다음 단계에서 연결됩니다. 🙂")}
          loading={!!loading}
        />
      )}
    </div>
  );
}
