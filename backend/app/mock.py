"""MOCK_MODE용 샘플 결과 (API 호출 없음)"""
from urllib.parse import quote

from .schemas import Plan, PlanRequest, Scene, Storyboard, StoryboardRequest


def mock_plans(req: PlanRequest) -> list:
    t = req.topic.strip()
    head = lambda n: t[:n].strip()  # 제목용으로 자르기
    short = req.format == "short"
    dur = [30, 25, 40] if short else [480, 600, 420]
    return [
        Plan(
            title=f"{head(12)} 감성 브이로그",
            concept=f"'{t}'의 하루를 감성적인 컷으로 담는 브이로그",
            hook="가장 예쁜 장면을 첫 2초에 먼저 보여주기" if short else "오늘 영상의 하이라이트 3장면 예고",
            target="10대~20대",
            mood="감성, 여유, 따뜻함",
            duration_sec=dur[0],
            flow=["하이라이트 훅", "출발·준비", "메인 장소", "소소한 순간", "노을로 마무리"],
            point="일상적인 소재라도 컷 템포와 색감만으로 몰입감을 줄 수 있어요.",
        ),
        Plan(
            title=f"POV: {head(20)}",
            concept=f"시청자가 직접 '{t}'를 겪는 듯한 1인칭 상황극",
            hook="'POV: 나만 이런 거 아니지?' 자막과 함께 바로 상황 시작",
            target="공감 콘텐츠를 좋아하는 20대",
            mood="공감, 유쾌함",
            duration_sec=dur[1],
            flow=["상황 제시", "예상 밖 전개", "반전", "공감 포인트 마무리"],
            point="1인칭 시점은 시청자가 주인공이 된 느낌을 줘서 댓글·공유가 많아요.",
        ),
        Plan(
            title=f"{head(12)} 꿀팁 정리",
            concept=f"'{t}'에 대한 핵심 정보를 빠르게 정리하는 정보형 영상",
            hook="'이거 모르면 손해' 같은 질문형 문장으로 시작",
            target="정보를 빠르게 얻고 싶은 사람",
            mood="깔끔, 신뢰, 빠른 템포",
            duration_sec=dur[2],
            flow=["질문형 훅", "핵심 팁 1", "핵심 팁 2", "핵심 팁 3", "저장 유도 마무리"],
            point="저장하고 다시 볼 이유가 있는 영상은 알고리즘 노출에 유리해요.",
        ),
    ]


_SHOTS = [
    ("클로즈업", "아이레벨", "고정"),
    ("미디엄샷", "하이앵글", "핸드헬드"),
    ("와이드샷", "아이레벨", "패닝"),
    ("익스트림 클로즈업", "탑뷰", "고정"),
    ("미디엄샷", "로우앵글", "트래킹"),
    ("풀샷", "아이레벨", "줌 아웃"),
]


def mock_storyboard(req: StoryboardRequest) -> Storyboard:
    flow = req.plan.flow[:6] or ["도입", "전개", "마무리"]
    each = max(1, req.plan.duration_sec // len(flow))
    scenes = []
    for i, step in enumerate(flow):
        shot, angle, move = _SHOTS[i % len(_SHOTS)]
        scenes.append(
            Scene(
                scene_no=i + 1,
                title=step[:12],
                description=f"'{step}' 장면을 보여줍니다.",
                shot_size=shot,
                angle=angle,
                camera_move=move,
                dialogue=req.plan.hook if i == 0 else "",
                duration_sec=each,
                transition="컷" if i < len(flow) - 1 else "페이드 아웃",
                shooting_tip="폰을 눈높이에 두고 양손으로 잡아 흔들림을 줄이세요.",
                image_prompt=f"scene about {step}",
            )
        )
    return Storyboard(
        title=req.plan.title,
        format=req.format,
        total_sec=0,
        characters="two friends in their early 20s in casual outfits",
        scenes=scenes,
        mock=True,
    )


def mock_image(scene: Scene, fmt: str) -> str:
    """API 대신 쓰는 SVG 자리 표시 이미지 (data URL)"""
    w, h = (900, 1600) if fmt == "short" else (1600, 900)
    svg = f"""<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
<stop offset='0' stop-color='#3b2f63'/><stop offset='1' stop-color='#6b2c52'/></linearGradient></defs>
<rect width='100%' height='100%' fill='url(#g)'/>
<text x='50%' y='45%' fill='#fff' font-size='{w // 9}' font-family='sans-serif' text-anchor='middle'>CUT {scene.scene_no}</text>
<text x='50%' y='55%' fill='#ddd' font-size='{w // 22}' font-family='sans-serif' text-anchor='middle'>{scene.shot_size} · {scene.angle}</text>
<text x='50%' y='62%' fill='#bbb' font-size='{w // 28}' font-family='sans-serif' text-anchor='middle'>샘플 이미지 (MOCK_MODE)</text>
</svg>"""
    return "data:image/svg+xml;charset=utf-8," + quote(svg)
