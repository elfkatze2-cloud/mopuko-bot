import os
import sys
import subprocess

sys.stdout.reconfigure(encoding="utf-8")

SPEED = 1.3  # 速度倍率
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "audio")

files = [f for f in os.listdir(AUDIO_DIR) if f.endswith(".mp3")]

for file in sorted(files):
    input_path = os.path.join(AUDIO_DIR, file)
    temp_path = os.path.join(AUDIO_DIR, f"temp_{file}")

    command = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-filter_complex", f"[0:a]atempo={SPEED}[sped];aevalsrc=0:d=0.3[silence];[sped][silence]concat=n=2:v=0:a=1",
        temp_path
    ]

    subprocess.run(command, capture_output=True)
    os.replace(temp_path, input_path)
    print(f"✅ {file} → {SPEED}倍速に変換完了")

print("\n🎉 全ファイルの速度変換完了！")