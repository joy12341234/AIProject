import json

from .schemas import PlanRequest, Scene, StoryboardRequest

FORMAT_RULES = {
    "short": (
        "형식: 숏폼(릴스·쇼츠). 세로 9:16, 전체 15~60초. "
        "첫 1~3초 안에 시선을 붙잡는 강한 훅, 2~4초 단위의 빠른 컷 전환, "
        "다시 보고 싶게 만드는 마무리. 전체 5~8컷."
    ),
    "long": (
        "형식: 롱폼(유튜브). 가로 16:9, 전체 5~20분. "
        "인트로에서 영상 내용을 예고하고, 도입-전개-마무리 챕터로 구성. "
        "챕터마다 핵심 장면을 두고, 중간에 다음 내용을 예고해 이탈을 막음."
    ),
}

# ---------- 기획안 ----------
# 요즘 숏폼에서 자주 쓰이는 포맷·연출 장치 (이름만 붙이지 말고 주제에 맞게 응용하도록 안내)
TREND_FORMATS = (
    "POV 상황극(시청자가 주인공이 되는 1인칭), 기대 vs 현실, Before/After 한 번에 전환, "
    "매치컷(같은 동작·물건으로 장소나 옷이 바뀜), 손으로 렌즈 가리기 전환, 휙 패닝 전환, "
    "루프 엔딩(마지막 컷이 첫 컷으로 이어짐), 3초 컷으로 하루 압축, 텍스트 훅 후 리빌, "
    "디테일 클로즈업(ASMR 느낌), 리액션 컷, 랭킹·카운트다운, 1인 다역 상황극"
)

PLAN_SYSTEM = (
    "너는 조회수와 공유를 잘 아는 숏폼·유튜브 기획 디렉터다. "
    "사용자가 스마트폰 하나와 셀카봉·삼각대 정도로 직접 찍을 수 있는 현실적인 기획만 제안한다. "
    "무난한 장면 나열은 피한다. 기획안마다 시청자가 끝까지 보게 만드는 장치(반전, 펀치라인, 리빌, 예상 깨기)가 분명히 있어야 한다. "
    "서로 방향이 다른 기획안 3개를 만든다: 하나는 인기 포맷을 응용, 하나는 이야기·반전 중심, 하나는 저장하고 싶은 정보·노하우 중심. "
    f"참고할 포맷·연출 장치: {TREND_FORMATS}. 포맷 이름만 붙이지 말고 이 주제에 맞게 구체적으로 응용한다. "
    "훅은 첫 장면의 행동이나 첫 자막 문장을 구체적으로 쓴다(예: '캐리어를 열자 옷 대신 라면만 가득'). "
    "'예쁜 장면 보여주기' 같은 막연한 표현은 쓰지 않는다. "
    "모든 답변은 한국어로 쉽게 쓴다. 기획안 단계이므로 컷 단위 세부 연출은 쓰지 않는다."
)

PLAN_ITEM = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "concept", "format_ref", "hook", "twist", "target", "mood", "duration_sec", "flow", "point"],
    "properties": {
        "title": {"type": "string", "description": "영상 제목 (20자 이내)"},
        "concept": {"type": "string", "description": "어떤 영상인지 한두 문장"},
        "format_ref": {"type": "string", "description": "활용한 포맷이나 연출 장치 이름 (15자 이내, 예: 매치컷 전환)"},
        "hook": {"type": "string", "description": "도입부 훅: 첫 장면의 행동이나 첫 자막 문장 (숏폼은 첫 2초, 롱폼은 인트로)"},
        "twist": {"type": "string", "description": "끝까지 보게 만드는 재미 장치 한 문장 (반전·펀치라인·리빌 등 구체적으로)"},
        "target": {"type": "string", "description": "타깃 시청자"},
        "mood": {"type": "string", "description": "분위기 키워드 2~3개"},
        "duration_sec": {"type": "integer", "description": "전체 길이(초)"},
        "flow": {
            "type": "array",
            "items": {"type": "string"},
            "description": "전체 흐름 4~6단계. 각 단계는 15자 이내의 짧은 구 (시간·카메라 설명 금지)",
        },
        "point": {"type": "string", "description": "이 기획이 잘 먹히는 이유 한 문장"},
    },
}

PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["plans"],
    "properties": {"plans": {"type": "array", "minItems": 3, "maxItems": 3, "items": PLAN_ITEM}},
}


def plan_messages(req: PlanRequest) -> list:
    style = f"\n꼭 활용할 포맷: {req.style}" if req.style else ""
    user = f"영상 주제: {req.topic}\n{FORMAT_RULES[req.format]}{style}"
    return [
        {"role": "system", "content": PLAN_SYSTEM},
        {"role": "user", "content": user},
    ]


# ---------- 기획안 다듬기 (사용자 추가 의견 반영) ----------
REFINE_SYSTEM = (
    "너는 영상 기획 디렉터다. 사용자가 고른 기획안을 사용자의 추가 의견에 맞게 다듬는다. "
    "의견에서 언급하지 않은 좋은 부분은 그대로 살린다. "
    "의견이 다른 기획안(기획 1~3)을 가리키면 그 요소를 가져와 자연스럽게 합친다. "
    "빼 달라는 내용은 확실히 빼고, 더해 달라는 내용은 flow·hook·twist에 구체적으로 녹인다. "
    "스마트폰으로 찍을 수 있어야 하며, 위험하거나 불가능한 요청은 가장 비슷한 안전한 방법으로 바꾼다. "
    "changes에는 무엇을 어떻게 바꿨는지 사용자가 바로 확인할 수 있게 짧게 쓴다. 한국어로 쉽게 쓴다."
)

REFINE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["plan", "changes"],
    "properties": {
        "plan": PLAN_ITEM,
        "changes": {"type": "array", "items": {"type": "string"}, "description": "바뀐 점 2~4개, 각 30자 이내"},
    },
}


def refine_messages(req) -> list:
    listing = "\n".join(
        f"기획 {i + 1}{' (선택됨)' if i == req.index else ''}: {json.dumps(p.model_dump(), ensure_ascii=False)}"
        for i, p in enumerate(req.plans)
    )
    user = (
        f"영상 주제: {req.topic}\n{FORMAT_RULES[req.format]}\n"
        f"기획안 목록:\n{listing}\n\n"
        f"다듬을 기획: 기획 {req.index + 1}\n사용자 의견: {req.feedback}"
    )
    return [{"role": "system", "content": REFINE_SYSTEM}, {"role": "user", "content": user}]


# ---------- 콘티 ----------
SHOT_SIZES = ["익스트림 클로즈업", "클로즈업", "미디엄 클로즈업", "미디엄샷", "풀샷", "와이드샷"]
ANGLES = ["아이레벨", "하이앵글", "로우앵글", "탑뷰", "1인칭 POV", "오버더숄더"]
MOVES = ["고정", "패닝", "틸트", "줌 인", "줌 아웃", "트래킹", "핸드헬드"]
BEATS = ["훅", "셋업", "전개", "고조", "반전", "마무리"]

STORYBOARD_SYSTEM = (
    "너는 숏폼·유튜브 콘티 작가 겸 촬영 감독이다. "
    "선택된 기획안을 실제로 찍을 수 있으면서 끝까지 보게 되는 컷 단위 콘티로 만든다. "
    "모든 컷은 스마트폰과 셀카봉·삼각대로 1~3명이 촬영할 수 있어야 한다. "
    "image_prompt와 characters만 영어로 쓰고, 나머지는 한국어로 쉽게 쓴다."
)

# 무난한 콘티를 막기 위한 연출 규칙
STORYBOARD_CRAFT = (
    "좋은 콘티 규칙:\n"
    "1) 구조: beat 순서대로 이야기가 쌓인다. 훅 → 셋업 → 전개 → 고조 → 반전 → 마무리. "
    "반전(예상 깨기·펀치라인·리빌) 컷이 반드시 하나 있다.\n"
    "2) 연결: 모든 컷은 앞 컷에서 이어진다. link에는 다음 컷으로 넘어가는 구체적인 촬영 방법을 쓴다 "
    "(같은 동작 이어 찍기, 같은 물건·모양으로 매치컷, 손이나 물건으로 렌즈 가리기, 휙 패닝, 다음 컷 소리 먼저 깔기 등). "
    "마지막 컷은 첫 컷과 이어지는 루프나 여운 있는 엔딩으로 끝낸다.\n"
    "3) 재미: fun에는 그 컷에서 시청자가 계속 보게 되는 이유를 쓴다 "
    "(예상 깨기, 표정 리액션, 자막 펀치라인, 디테일 리빌, 효과음 타이밍 등). 같은 장치를 모든 컷에 반복하지 않는다.\n"
    "4) 구체성: description에는 누가 무엇을 어떻게 하는지 행동·표정·소품을 구체적으로 쓴다. "
    "'~ 장면을 보여준다' 같은 막연한 문장은 쓰지 않는다.\n"
    "5) 다양성: 이어지는 두 컷이 같은 샷 크기와 앵글을 함께 쓰지 않는다. 디테일 클로즈업과 넓은 샷을 섞어 리듬을 만든다.\n"
    "6) 자막: dialogue는 짧은 구어체로, 읽자마자 다음이 궁금해지게 쓴다.\n"
    "7) 기획안의 hook, twist, format_ref를 콘티에서 확실히 살린다."
)

STORYBOARD_RULES = {
    "short": (
        "컷 수 5~8개. 첫 컷은 반드시 훅. 컷 길이는 대부분 2~5초. "
        "모든 컷 길이의 합이 기획안 전체 길이와 같아야 한다."
    ),
    "long": (
        "챕터를 대표하는 핵심 장면 6~10개. title 앞에 [인트로], [챕터1]처럼 구간을 붙인다. "
        "duration_sec은 그 장면이 대표하는 구간 길이이며 합이 기획안 전체 길이와 같아야 한다. "
        "챕터가 넘어갈 때 다음 내용을 예고해 이탈을 막는다."
    ),
}

STORYBOARD_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["characters", "direction", "scenes"],
    "properties": {
        "characters": {
            "type": "string",
            "description": "등장인물의 나이대·머리·옷차림 영어 묘사. 모든 컷 그림에 똑같이 쓰임. 인물이 없으면 주요 피사체 묘사",
        },
        "direction": {"type": "string", "description": "이 콘티의 연출 포인트 한두 문장 (재미 구조와 컷 연결 방식 요약)"},
        "scenes": {
            "type": "array",
            "minItems": 4,
            "maxItems": 10,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "title", "beat", "description", "shot_size", "angle", "camera_move", "dialogue",
                    "fun", "duration_sec", "link", "transition", "shooting_tip", "image_prompt",
                ],
                "properties": {
                    "title": {"type": "string", "description": "장면 이름 (12자 이내)"},
                    "beat": {"type": "string", "enum": BEATS, "description": "이야기 구조에서 이 컷의 역할"},
                    "description": {"type": "string", "description": "누가 무엇을 어떻게 하는지 행동·표정·소품까지 한두 문장"},
                    "shot_size": {"type": "string", "enum": SHOT_SIZES},
                    "angle": {"type": "string", "enum": ANGLES},
                    "camera_move": {"type": "string", "enum": MOVES},
                    "dialogue": {"type": "string", "description": "대사 또는 화면 자막 (짧은 구어체). 없으면 빈 문자열"},
                    "fun": {"type": "string", "description": "이 컷의 재미 포인트 한 문장"},
                    "duration_sec": {"type": "integer", "description": "컷 길이(초)"},
                    "link": {"type": "string", "description": "다음 컷으로 이어지는 구체적인 촬영 방법 한 문장. 마지막 컷은 엔딩 방식"},
                    "transition": {"type": "string", "description": "편집 전환 이름만 짧게 (예: 컷, 매치컷, 휩팬, 점프컷, 페이드)"},
                    "shooting_tip": {
                        "type": "string",
                        "description": "스마트폰 촬영 팁 한두 문장: 폰 높이·거리·거치 방법·조명 등 초보자가 바로 따라 할 수 있게",
                    },
                    "image_prompt": {
                        "type": "string",
                        "description": "콘티 그림용 영어 묘사: 인물의 행동, 장소, 시간대·조명, 화면 구도. 화풍·글자·인물 외모는 쓰지 않음",
                    },
                },
            },
        },
    },
}


def storyboard_messages(req: StoryboardRequest) -> list:
    plan = json.dumps(req.plan.model_dump(), ensure_ascii=False)
    user = (
        f"영상 주제: {req.topic}\n{FORMAT_RULES[req.format]}\n"
        f"콘티 규칙: {STORYBOARD_RULES[req.format]}\n{STORYBOARD_CRAFT}\n"
        f"선택된 기획안(JSON): {plan}"
    )
    return [
        {"role": "system", "content": STORYBOARD_SYSTEM},
        {"role": "user", "content": user},
    ]


# ---------- 콘티 그림 ----------
IMAGE_STYLE = (
    "hand-drawn film storyboard frame, pencil sketch with light watercolor wash, "
    "soft warm colors, clean expressive linework, cinematic composition"
)

SHOT_EN = {
    "익스트림 클로즈업": "extreme close-up",
    "클로즈업": "close-up",
    "미디엄 클로즈업": "medium close-up",
    "미디엄샷": "medium shot",
    "풀샷": "full shot",
    "와이드샷": "wide establishing shot",
}
ANGLE_EN = {
    "아이레벨": "eye-level angle",
    "하이앵글": "high angle looking down",
    "로우앵글": "low angle looking up",
    "탑뷰": "top-down overhead view",
    "1인칭 POV": "first-person POV",
    "오버더숄더": "over-the-shoulder view",
}
IMAGE_SIZE = {"short": "1024x1536", "long": "1536x1024"}


def image_prompt(scene: Scene, characters: str, fmt: str) -> str:
    frame = "vertical 9:16 frame" if fmt == "short" else "horizontal 16:9 frame"
    shot = SHOT_EN.get(scene.shot_size, scene.shot_size)
    angle = ANGLE_EN.get(scene.angle, scene.angle)
    parts = [
        f"{IMAGE_STYLE}, {frame}.",
        f"Camera: {shot}, {angle}.",
        f"Characters (keep identical across all frames): {characters}." if characters else "",
        f"Scene: {scene.image_prompt.strip().rstrip('.')}.",
        "No text, no letters, no captions, no watermark.",
    ]
    return " ".join(p for p in parts if p)


# ---------- 촬영 가이드 ----------
def _scene_brief(sb) -> str:
    # 이미지 프롬프트는 빼고 가이드에 필요한 정보만 전달
    keep = ("scene_no", "title", "beat", "description", "shot_size", "angle", "camera_move", "dialogue",
            "fun", "link", "transition", "start_sec", "end_sec", "duration_sec", "shooting_tip")
    scenes = [{k: getattr(s, k, "") for k in keep} for s in sb.scenes]
    return json.dumps(scenes, ensure_ascii=False)


SHOOTING_SYSTEM = (
    "너는 스마트폰으로 영상을 처음 찍는 사람을 돕는 촬영 감독이다. "
    "콘티 순서와 실제 촬영 순서는 다르다: 같은 장소·같은 세팅의 컷을 묶어서 이동과 세팅 시간을 줄인다. "
    "사용자의 인원·장비·장소에 맞춰 바로 따라 할 수 있게 한국어로 쉽게 쓴다. "
    "콘티의 link(컷 연결)가 매끄럽게 이어지도록 앞뒤 컷의 동작 방향·소품·폰 위치를 맞추는 방법을 setup이나 checks에 넣는다."
)

SHOOTING_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["summary", "prep", "order", "scenes", "tips"],
    "properties": {
        "summary": {"type": "string", "description": "촬영 전체 요약 한두 문장 (예상 소요 시간 포함)"},
        "prep": {"type": "array", "items": {"type": "string"}, "description": "준비물 3~8개"},
        "order": {
            "type": "array",
            "description": "효율적인 촬영 순서. 같은 장소·세팅끼리 묶은 그룹 목록",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["place", "scene_nos", "reason"],
                "properties": {
                    "place": {"type": "string", "description": "장소·세팅 이름"},
                    "scene_nos": {"type": "array", "items": {"type": "integer"}},
                    "reason": {"type": "string", "description": "이렇게 묶는 이유 한 문장"},
                },
            },
        },
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["scene_no", "setup", "checks", "caution"],
                "properties": {
                    "scene_no": {"type": "integer"},
                    "setup": {"type": "string", "description": "폰 위치·높이·거리·거치 방법 한두 문장"},
                    "checks": {"type": "array", "items": {"type": "string"}, "description": "촬영 전 확인할 항목 2~4개"},
                    "caution": {"type": "string", "description": "초보자가 실수하기 쉬운 점 한 문장"},
                },
            },
        },
        "tips": {"type": "array", "items": {"type": "string"}, "description": "전체 촬영 팁 3~5개"},
    },
}


def shooting_messages(req) -> list:
    gear = ", ".join(req.gear) if req.gear else "스마트폰만"
    user = (
        f"영상 제목: {req.storyboard.title} ({'숏폼 9:16' if req.storyboard.format == 'short' else '롱폼 16:9'})\n"
        f"촬영 환경: 인원 {req.people}, 장비 {gear}, 장소 {req.place}\n"
        f"콘티(JSON): {_scene_brief(req.storyboard)}\n"
        "모든 컷이 order와 scenes에 빠짐없이 한 번씩 들어가야 한다."
    )
    return [{"role": "system", "content": SHOOTING_SYSTEM}, {"role": "user", "content": user}]


# ---------- 편집 가이드 ----------
EDIT_SYSTEM = (
    "너는 초보 크리에이터를 돕는 영상 편집 코치다. 콘티를 기준으로 컷마다 편집 방법을 안내한다. "
    "숏폼은 화면 아래쪽과 오른쪽이 플랫폼 버튼·설명에 가려지므로 자막은 중앙이나 상단에 둔다. "
    "배경음악은 저작권 걱정이 없는 무료 음원이나 앱 기본 음원을 쓰도록 안내한다. "
    "콘티의 link(컷 연결)와 fun(재미 포인트)을 살리는 편집을 안내한다: 매치컷 자르는 지점, 효과음 위치, 속도 변화, 자막 펀치라인 타이밍. "
    "편집 앱 메뉴 이름이 확실하지 않으면 일반적인 표현으로 쓴다. 한국어로 쉽게 쓴다."
)

EDIT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["summary", "tone", "sound", "cuts", "titles", "hashtags", "thumbnail_text", "upload_tip"],
    "properties": {
        "summary": {"type": "string", "description": "편집 방향 한두 문장"},
        "tone": {"type": "string", "description": "색감·보정 방향"},
        "sound": {"type": "string", "description": "배경음악·효과음 가이드"},
        "cuts": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["scene_no", "edit", "transition", "subtitle", "subtitle_pos"],
                "properties": {
                    "scene_no": {"type": "integer"},
                    "edit": {"type": "string", "description": "자르기·속도·효과 등 편집 방법 한두 문장"},
                    "transition": {"type": "string", "description": "다음 컷으로 넘어가는 전환"},
                    "subtitle": {"type": "string", "description": "화면에 넣을 자막 문구. 없으면 빈 문자열"},
                    "subtitle_pos": {"type": "string", "enum": ["상단", "중앙", "하단", "없음"]},
                },
            },
        },
        "titles": {"type": "array", "items": {"type": "string"}, "description": "업로드 제목 후보 3개"},
        "hashtags": {"type": "array", "items": {"type": "string"}, "description": "#을 붙인 해시태그 5~10개"},
        "thumbnail_text": {"type": "string", "description": "썸네일 문구 (12자 이내)"},
        "upload_tip": {"type": "string", "description": "업로드 팁 한두 문장"},
    },
}


def edit_messages(req) -> list:
    user = (
        f"영상 제목: {req.storyboard.title} ({'숏폼 9:16' if req.storyboard.format == 'short' else '롱폼 16:9'})\n"
        f"편집 앱: {req.app}\n"
        f"콘티(JSON): {_scene_brief(req.storyboard)}\n"
        "cuts에는 모든 컷이 순서대로 한 번씩 들어가야 한다."
    )
    return [{"role": "system", "content": EDIT_SYSTEM}, {"role": "user", "content": user}]
