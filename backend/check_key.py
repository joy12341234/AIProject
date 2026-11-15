"""
API 키로 쓸 수 있는 모델 확인 + 텍스트/이미지 테스트
실행: check_key.bat 더블클릭 (또는 python check_key.py)
"""
import base64
import sys
from pathlib import Path

from dotenv import dotenv_values
from openai import OpenAI

ENV_PATH = Path(__file__).parent / ".env"


def line(title=""):
    print("\n" + "=" * 60)
    if title:
        print(" " + title)
        print("=" * 60)


def main():
    env = dotenv_values(ENV_PATH, encoding="utf-8")
    key = (env.get("OPENAI_API_KEY") or "").strip()
    text_model = (env.get("TEXT_MODEL") or "").strip()
    image_model = (env.get("IMAGE_MODEL") or "").strip()

    if not key.startswith("sk-"):
        print("[X] backend\\.env 에 OPENAI_API_KEY 가 없습니다.")
        print("    .env 파일을 메모장으로 열어 키를 붙여넣고 저장한 뒤 다시 실행하세요.")
        return

    client = OpenAI(api_key=key)

    # 1) 모델 목록
    line("1. 이 키로 보이는 모델 목록")
    ids = []
    try:
        ids = sorted(m.id for m in client.models.list())
    except Exception as e:
        print(f"[!] 모델 목록을 볼 권한이 없거나 오류가 났어요: {e}")

    groups = {"텍스트": [], "이미지": [], "음성": []}
    for mid in ids:
        if "image" in mid or mid.startswith("dall-e"):
            groups["이미지"].append(mid)
        elif any(k in mid for k in ("tts", "transcribe", "whisper", "audio", "realtime")):
            groups["음성"].append(mid)
        elif mid.startswith(("gpt-", "o1", "o3", "o4", "chatgpt")):
            groups["텍스트"].append(mid)
    for name, items in groups.items():
        print(f"\n[{name}] {len(items)}개")
        for mid in items:
            print("  -", mid)

    if ids:
        print()
        for label, m in (("TEXT_MODEL", text_model), ("IMAGE_MODEL", image_model)):
            mark = "OK" if m in ids else "목록에 없음 -> .env 수정 필요"
            print(f"  .env {label} = {m}  [{mark}]")

    # 2) 텍스트 테스트 (비용 거의 없음)
    line(f"2. 텍스트 테스트 ({text_model})")
    try:
        res = client.chat.completions.create(
            model=text_model,
            messages=[{"role": "user", "content": "영상 기획 도우미로서 한 문장으로 인사해줘."}],
        )
        print("[OK]", res.choices[0].message.content.strip())
    except Exception as e:
        print(f"[X] 실패: {e}")

    # 3) 이미지 테스트 (선택, 저화질 1장)
    line(f"3. 이미지 테스트 ({image_model}, low 화질 1장)")
    answer = input("이미지 1장을 생성해 볼까요? 비용이 조금 듭니다. (y/n): ").strip().lower()
    if answer != "y":
        print("건너뜀")
        return
    try:
        res = client.images.generate(
            model=image_model,
            prompt="pencil sketch storyboard frame, light watercolor, a young person filming a vlog "
                   "with a smartphone on a selfie stick at sunset, vertical composition, no text",
            size="1024x1536",
            quality="low",
        )
        out = Path(__file__).parent / "check_image.png"
        out.write_bytes(base64.b64decode(res.data[0].b64_json))
        print(f"[OK] 저장 완료: {out}")
    except Exception as e:
        print(f"[X] 실패: {e}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
