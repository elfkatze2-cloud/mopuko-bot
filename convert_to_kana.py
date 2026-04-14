import json
import pykakasi

kks = pykakasi.kakasi()

def convert_to_kana(text):
    result = kks.convert(text)
    output = ""
    for item in result:
        if item['hira']:
            output += item['hira']
        else:
            output += item['orig']
    return output

# テスト
test = "即レスが大切です"
print("テスト変換：", convert_to_kana(test))

# script.jsonを読み込む
import os
script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "script.json")
with open(script_path, "r", encoding="utf-8") as f:
    script_data = json.load(f)

# 各シーンのナレーションを変換
for scene in script_data["scenes"]:
    original = scene["narration"]
    converted = convert_to_kana(original)
    scene["narration"] = converted
    print(f"\nシーン{scene['scene_number']}")
    print(f"  元：{original[:50]}")
    print(f"  後：{converted[:50]}")

# 上書き保存
with open(script_path, "w", encoding="utf-8") as f:
    json.dump(script_data, f, ensure_ascii=False, indent=2)

print("\n✅ 変換完了！")