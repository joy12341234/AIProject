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
PLAN_SYSTEM = (
    "너는 영상 제작이 처음인 사람을 돕는 영상 기획 디렉터다. "
    "사용자가 스마트폰 하나와 셀카봉·삼각대 정도로 직접 찍을 수 있는 현실적인 기획만 제안한다. "
    "서로 방향이 다른 기획안 3개를 만든다. 모든 답변은 한국어로 쉽게 쓴다. "
    "기획안 단계이므로 컷 단위 세부 연출은 쓰지 않는다."
)

PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["plans"],
    "properties": {
        "plans": {
            "type": "array",
            "minItems": 3,
            "maxItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "concept", "hook", "target", "mood", "duration_sec", "flow", "point"],
                "properties": {
                    "title": {"type": "string", "description": "영상 제목 (20자 이내)"},
                    "concept": {"type": "string", "description": "어떤 영상인지 한두 문장"},
                    "hook": {"type": "string", "description": "도입부 훅 (숏폼은 첫 3초, 롱폼은 인트로)"},
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
            },
        }
    },
}


def plan_messages(req: PlanRequest) -> list:
    style = f"\n참고할 인기 포맷: {req.style}" if req.style else ""
    user = f"영상 주제: {req.topic}\n{FORMAT_RULES[req.format]}{style}"
    return [
        {"role": "system", "content": PLAN_SYSTEM},
        {"role": "user", "content": user},
    ]


# ---------- 콘티 ----------
SHOT_SIZES = ["익스트림 클로즈업", "클로즈업", "미디엄 클로즈업", "미디엄샷", "풀샷", "와이드샷"]
ANGLES = ["아이레벨", "하이앵글", "로우앵글", "탑뷰", "1인칭 POV", "오버더숄더"]
MOVES = ["고정", "패닝", "틸트", "줌 인", "줌 아웃", "트래킹", "핸드헬드"]

STORYBOARD_SYSTEM = (
    "너는 초보 크리에이터를 돕는 콘티 작가 겸 촬영 감독이다. "
    "선택된 기획안을 실제로 찍을 수 있는 컷 단위 콘티로 만든다. "
    "모든 컷은 스마트폰과 셀카봉·삼각대로 1~3명이 촬영할 수 있어야 한다. "
    "image_prompt와 characters만 영어로 쓰고, 나머지는 한국어로 쉽게 쓴다."
)

STORYBOARD_RULES = {
    "short": (
        "컷 수 5~8개. 첫 컷은 반드시 훅. 컷 길이는 대부분 2~5초. "
        "모든 컷 길이의 합이 기획안 전체 길이와 같아야 한다."
    ),
    "long": (
        "챕터를 대표하는 핵심 장면 6~10개. title 앞에 [인트로], [챕터1]처럼 구간을 붙인다. "
        "duration_sec은 그 장면이 대표하는 구간 길이이며 합이 기획안 전체 길이와 같아야 한다."
    ),
}

STORYBOARD_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["characters", "scenes"],
    "properties": {
        "characters": {
            "type": "string",
            "description": "등장인물의 나이대·머리·옷차림 영어 묘사. 모든 컷 그림에 똑같이 쓰임. 인물이 없으면 주요 피사체 묘사",
        },
        "scenes": {
            "type": "array",
            "minItems": 4,
            "maxItems": 10,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "title", "description", "shot_size", "angle", "camera_move",
                    "dialogue", "duration_sec", "transition", "shooting_tip", "image_prompt",
                ],
                "properties": {
                    "title": {"type": "string", "description": "장면 이름 (12자 이내)"},
                    "description": {"type": "string", "description": "화면에 보이는 장면 내용 한두 문장"},
                    "shot_size": {"type": "string", "enum": SHOT_SIZES},
                    "angle": {"type": "string", "enum": ANGLES},
                    "camera_move": {"type": "string", "enum": MOVES},
                    "dialogue": {"type": "string", "description": "대사 또는 화면 자막. 없으면 빈 문자열"},
                    "duration_sec": {"type": "integer", "description": "컷 길이(초)"},
                    "transition": {"type": "string", "description": "다음 컷으로 넘어가는 편집 전환 (예: 컷, 줌 전환, 페이드)"},
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
        f"콘티 규칙: {STORYBOARD_RULES[req.format]}\n"
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
