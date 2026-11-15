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
            hook="마지막 노을 장면을 먼저 보여주고 '이걸 보기까지 12시간'" if short else "오늘 영상의 하이라이트 3장면 예고",
            format_ref="루프 엔딩",
            twist="마지막 컷이 첫 컷과 같은 구도로 이어져 다시 보게 됨",
            target="10대~20대",
            mood="감성, 여유, 따뜻함",
            duration_sec=dur[0],
            flow=["하이라이트 훅", "출발·준비", "메인 장소", "소소한 순간", "노을로 마무리"],
            point="일상적인 소재라도 컷 템포와 색감만으로 몰입감을 줄 수 있어요.",
        ),
        Plan(
            title=f"POV: {head(20)}",
            concept=f"시청자가 직접 '{t}'를 겪는 듯한 1인칭 상황극",
            hook="'POV: 계획형 친구와 즉흥형 친구가 같이 여행 감' 자막으로 시작",
            format_ref="POV 상황극",
            twist="철저한 계획이 첫 장소에서 무너지고, 즉흥 코스가 더 재밌어지는 반전",
            target="공감 콘텐츠를 좋아하는 20대",
            mood="공감, 유쾌함",
            duration_sec=dur[1],
            flow=["상황 제시", "예상 밖 전개", "반전", "공감 포인트 마무리"],
            point="1인칭 시점은 시청자가 주인공이 된 느낌을 줘서 댓글·공유가 많아요.",
        ),
        Plan(
            title=f"{head(12)} 꿀팁 정리",
            concept=f"'{t}'에 대한 핵심 정보를 빠르게 정리하는 정보형 영상",
            hook="'여기 모르고 가면 3만 원 손해'라는 자막과 영수증 클로즈업",
            format_ref="카운트다운 랭킹",
            twist="1위를 마지막까지 숨겼다가 의외의 장소로 리빌",
            target="정보를 빠르게 얻고 싶은 사람",
            mood="깔끔, 신뢰, 빠른 템포",
            duration_sec=dur[2],
            flow=["질문형 훅", "핵심 팁 1", "핵심 팁 2", "핵심 팁 3", "저장 유도 마무리"],
            point="저장하고 다시 볼 이유가 있는 영상은 알고리즘 노출에 유리해요.",
        ),
    ]


def mock_refine(req) -> tuple:
    """의견을 흐름에 반영한 것처럼 보이는 샘플 (실제 AI는 의견 내용에 맞춰 다시 씀)"""
    p = req.plans[req.index].model_copy(deep=True)
    fb = req.feedback.strip()
    short_fb = fb if len(fb) <= 24 else fb[:24] + "…"
    p.concept = p.concept.split(" — 의견 반영:")[0] + f" — 의견 반영: {short_fb}"
    if "의견 반영 장면" not in p.flow:
        p.flow = (p.flow[:-1] + ["의견 반영 장면"] + p.flow[-1:])[:6]
    changes = [
        f"‘{short_fb}’ 의견을 흐름에 반영",
        "마무리 앞에 장면 1개 추가",
        "훅과 재미 장치는 그대로 유지",
    ]
    return p, changes


_SHOTS = [
    ("클로즈업", "아이레벨", "고정"),
    ("미디엄샷", "하이앵글", "핸드헬드"),
    ("와이드샷", "아이레벨", "패닝"),
    ("익스트림 클로즈업", "탑뷰", "고정"),
    ("미디엄샷", "로우앵글", "트래킹"),
    ("풀샷", "아이레벨", "줌 아웃"),
]


_FUN = [
    "결과를 먼저 보여줘서 '어떻게 저렇게 됐지?' 궁금하게 만듦",
    "예상 밖 소품이 나오는 순간에 효과음",
    "친구의 과장된 표정 리액션 클로즈업",
    "자막 펀치라인으로 상황을 한 번 뒤집기",
    "디테일 클로즈업으로 숨겨둔 걸 리빌",
    "첫 컷과 같은 구도로 끝나 다시 보게 됨",
]
_LINK = [
    ("손으로 렌즈를 가리며 끝내고, 다음 컷은 손을 치우며 시작", "커버 전환"),
    ("문을 여는 동작을 다음 장소에서 그대로 이어 찍기", "액션 매치"),
    ("오른쪽으로 휙 패닝하며 끝내고, 다음 컷도 같은 방향으로 시작", "휩팬"),
    ("다음 컷의 웃음소리를 0.5초 먼저 깔기", "J컷"),
    ("둥근 컵 → 둥근 노을처럼 같은 모양으로 매치컷", "매치컷"),
]


def _beats(n: int) -> list:
    if n <= 3:
        return ["훅", "전개", "마무리"][:n]
    middle = [["셋업", "전개", "고조"][min(i, 2)] for i in range(n - 3)]
    return ["훅", *middle, "반전", "마무리"]


def mock_storyboard(req: StoryboardRequest) -> Storyboard:
    flow = req.plan.flow[:6] or ["도입", "전개", "마무리"]
    each = max(1, req.plan.duration_sec // len(flow))
    beats = _beats(len(flow))
    scenes = []
    for i, step in enumerate(flow):
        shot, angle, move = _SHOTS[i % len(_SHOTS)]
        last = i == len(flow) - 1
        link, trans = ("첫 컷과 같은 구도로 끝내 영상이 처음으로 이어지게", "루프") if last else _LINK[i % len(_LINK)]
        scenes.append(
            Scene(
                scene_no=i + 1,
                title=step[:12],
                beat=beats[i],
                description=f"'{step}' 순간, 인물이 카메라 쪽으로 다가오다 멈추고 표정으로 반응한다.",
                shot_size=shot,
                angle=angle,
                camera_move=move,
                dialogue=req.plan.hook if i == 0 else ("근데 여기서 반전" if beats[i] == "반전" else ""),
                fun=_FUN[min(i, len(_FUN) - 1)] if not last else _FUN[-1],
                duration_sec=each,
                link=link,
                transition=trans,
                shooting_tip="폰을 눈높이에 두고 양손으로 잡아 흔들림을 줄이세요.",
                image_prompt=f"scene about {step}",
            )
        )
    return Storyboard(
        title=req.plan.title,
        format=req.format,
        total_sec=0,
        characters="two friends in their early 20s in casual outfits",
        direction="훅에서 결과를 먼저 보여주고, 컷마다 동작·소리로 이어 붙여 끊김 없이 흐르게 했어요. 마지막 컷은 첫 컷 구도로 돌아가 루프를 만듭니다.",
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


def mock_shooting(req) -> dict:
    scenes = req.storyboard.scenes
    half = max(1, len(scenes) // 2)
    groups = [scenes[:half], scenes[half:]] if len(scenes) > 1 else [scenes]
    return {
        "summary": f"{req.people} 촬영 기준 약 {len(scenes) * 5}분 정도 걸려요. 장소별로 묶어서 찍으면 이동이 줄어듭니다.",
        "prep": ["스마트폰 (배터리 80% 이상)", "삼각대 또는 셀카봉", "렌즈 닦을 천", "여분 저장 공간"],
        "order": [
            {
                "place": f"장소 {i + 1}",
                "scene_nos": [s.scene_no for s in g],
                "reason": "같은 장소에서 찍는 컷이라 한 번에 촬영하면 세팅을 다시 할 필요가 없어요.",
            }
            for i, g in enumerate(groups) if g
        ],
        "scenes": [
            {
                "scene_no": s.scene_no,
                "setup": s.shooting_tip,
                "checks": ["렌즈가 깨끗한지 확인", "화면 비율이 맞는지 확인", "인물이 화면 중앙에 오는지 확인"],
                "caution": "촬영 버튼을 누르고 1초 기다린 뒤 연기를 시작하세요.",
            }
            for s in scenes
        ],
        "tips": ["같은 컷을 2~3번 찍어 두면 편집이 쉬워요.", "역광보다 빛을 정면으로 받는 쪽이 얼굴이 밝게 나와요."],
    }


def mock_editing(req) -> dict:
    short = req.storyboard.format == "short"
    return {
        "summary": "첫 컷에서 바로 훅을 보여주고, 컷마다 템포를 빠르게 유지하세요.",
        "tone": "밝기를 살짝 올리고 따뜻한 색감 필터를 약하게 적용하세요.",
        "sound": f"{req.app} 기본 음원이나 저작권 무료 음원을 쓰고, 컷 전환에 효과음을 넣어 보세요.",
        "cuts": [
            {
                "scene_no": s.scene_no,
                "edit": "앞뒤 여유 구간을 잘라 컷 길이를 콘티와 맞추세요.",
                "transition": s.transition,
                "subtitle": s.dialogue,
                "subtitle_pos": ("중앙" if short else "하단") if s.dialogue else "없음",
            }
            for s in req.storyboard.scenes
        ],
        "titles": [req.storyboard.title, f"{req.storyboard.title} | 브이로그", f"이렇게 찍었어요: {req.storyboard.title}"],
        "hashtags": ["#브이로그", "#일상", "#숏폼", "#릴스", "#vlog"],
        "thumbnail_text": req.storyboard.title[:12],
        "upload_tip": "업로드 후 첫 1시간 안에 달린 댓글에 답글을 달면 반응이 좋아요.",
    }
