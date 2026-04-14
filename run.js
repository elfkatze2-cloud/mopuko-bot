const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("=================================");
console.log("🎬 動画制作パイプライン スタート");
console.log("=================================");

// テーマ選択
console.log("\n🎯 テーマを選択しています...");
execSync("node generate_theme.js", { stdio: "inherit" });

// ① 台本生成
console.log("\n📝 ステップ① 台本を生成しています...");
execSync("node generate_script.js", { stdio: "inherit" });

// ② 検証・整形
console.log("\n✅ ステップ② 台本を検証・整形しています...");
execSync("node validate_script.js", { stdio: "inherit" });

// 画像生成
console.log("\n🎨 背景画像を生成しています...");
execSync("node generate_images.js", { stdio: "inherit" });

// ファイルをremotionにコピー
console.log("\n📂 ファイルをremotionにコピーしています...");

const srcAudioDir = path.join(__dirname, "output", "audio");
const dstAudioDir = path.join(__dirname, "remotion", "public", "audio");
const srcScript = path.join(__dirname, "output", "script.json");
const dstScript = path.join(__dirname, "remotion", "public", "script.json");
const srcDurations = path.join(__dirname, "output", "audio_durations.json");
const dstDurations = path.join(__dirname, "remotion", "public", "audio_durations.json");
const srcImages = path.join(__dirname, "remotion", "public", "images");

if (!fs.existsSync(dstAudioDir)) {
  fs.mkdirSync(dstAudioDir, { recursive: true });
}

fs.copyFileSync(srcScript, dstScript);
console.log("✅ コピー完了：script.json");

// ③ 音声生成
console.log("\n🎙️ ステップ③ 音声を生成しています...");
execSync("node generate_audio.js", { stdio: "inherit" });

// 音声を1.3倍速に変換
console.log("\n⚡ 音声を1.3倍速に変換しています...");
execSync("python speed_up_audio.py", { stdio: "inherit" });

// 音声の長さを取得
console.log("\n⏱️ 音声の長さを取得しています...");
execSync("python get_audio_duration.py", { stdio: "inherit" });

// 音声ファイルをremotionにコピー
const audioFiles = fs.readdirSync(srcAudioDir).filter(f => f.endsWith(".mp3"));
audioFiles.forEach(file => {
  fs.copyFileSync(
    path.join(srcAudioDir, file),
    path.join(dstAudioDir, file)
  );
  console.log(`✅ コピー完了：${file}`);
});

fs.copyFileSync(srcDurations, dstDurations);
console.log("✅ コピー完了：audio_durations.json");

// ④ 動画合成
console.log("\n🎥 ステップ④ 動画を合成しています...");
console.log("（しばらく時間がかかります）");
execSync(
  "npx remotion render MyComp output.mp4 --codec h264 --crf 18 --timeout 240000",
  {
    stdio: "inherit",
    cwd: path.join(__dirname, "remotion"),
  }
);

console.log("【手順1】YouTubeにアップロード（video-botフォルダで実行）");
console.log("  node upload_youtube.js");