import json
import os
import sys
from mutagen.mp3 import MP3

sys.stdout.reconfigure(encoding="utf-8")

audio_dir = os.path.join("output", "audio")
durations = {}

for i in range(1, 6):
    file_path = os.path.join(audio_dir, f"scene_{i}.mp3")
    if os.path.exists(file_path):
        audio = MP3(file_path)
        durations[f"scene_{i}"] = round(audio.info.length, 2)
        print(f"scene_{i}: {durations[f'scene_{i}']}秒")

output_path = os.path.join("output", "audio_durations.json")
with open(output_path, "w") as f:
    json.dump(durations, f, indent=2)

print(f"\n✅ 音声の長さを {output_path} に保存しました。")