const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

console.log("=================================");
console.log("🎬 動画制作パイプライン スタート");
console.log("=================================");

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n📅 実行モードを選択してください：");
  console.log("  1. 朝（7:00投稿）- 最初から全部実行");
  console.log("  2. 夜（20:00投稿）- 最初から全部実行");
  console.log("  3. 音声から再生成（台本・画像はそのまま）");
  console.log("  4. 画像を指定して再生成");

  const mode = await question(rl, "\n番号を入力してください: ");

  // モード③：音声から再生成
  if (mode === "3") {
    rl.close();
    await regenerateFromAudio();
    return;
  }

  // モード④：画像を指定して再生成
  if (mode === "4") {
    const input = await question(rl, "再生成するシーン番号をカンマ区切りで入力してください（例：1,3）: ");
    rl.close();
    const sceneNumbers = input.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    await regenerateImages(sceneNumbers);
    return;
  }

  // モード①②：最初から全部実行
  let slot = "evening";
  if (mode === "1") {
    slot = "morning";
    console.log("✅ 朝の投稿向けで生成します");
  } else if (mode === "2") {
    slot = "evening";
    console.log("✅ 夜の投稿向けで生成します");
  } else {
    console.log("無効な入力です。夜（20:00）で進めます");
  }
  rl.close();

  fs.writeFileSync("output/slot.txt", slot);

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
  copyScriptToRemotion();

  // ③ 音声生成
  await generateAudioStep();

  // 動画合成
  renderVideo();

  console.log("【手順1】YouTubeにアップロード（video-botフォルダで実行）");
  console.log("  node upload_youtube.js");
}

// script.jsonに置換処理を適用してscript_for_audio.jsonを生成
function applyReplacements() {
  const scriptData = JSON.parse(fs.readFileSync("output/script.json", "utf8"));
  scriptData.scenes.forEach((scene) => {
    scene.narration = scene.narration
      .replace(/【([^】]*)】/g, " $1 ")
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/6割/g, "ろくわり")
      .replace(/7割/g, "ななわり")
      .replace(/8割/g, "はちわり")
      .replace(/1割/g, "いちわり")
      .replace(/2割/g, "にわり")
      .replace(/おりこうさん/g, "「お利口」")
      .replace(/お利口さん/g, "「お利口」")
      .replace(/おりこうだね/g, "「お利口」だね")
      .replace(/おりこうだ/g, "「お利口」だ")
      .replace(/(?<![一-龯])家(?![一-龯])/g, "いえ")
      .replace(/通勤/g, "つうきん")
      .replace(/重曹/g, "じゅうそう")
      .replace(/SNS/g, "エスエヌエス")
      .replace(/YouTube/g, "ユーチューブ")
      .replace(/AI/g, "エーアイ")
      .replace(/\s+/g, " ")
      .trim();
  });
  fs.writeFileSync("output/script_for_audio.json", JSON.stringify(scriptData, null, 2));
  console.log("✅ output/script_for_audio.json を生成しました。");
}

async function generateAudioStep() {
  // 置換処理を適用してscript_for_audio.jsonを生成
  applyReplacements();

  // ユーザーに編集の機会を与える
  console.log("\n📝 output/script_for_audio.json を確認・編集してください。");
  console.log("   編集が完了したらEnterを押してください（編集不要な場合もEnterを押してください）");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => rl.question("", () => { rl.close(); resolve(); }));

  // 音声生成（script_for_audio.jsonを使用・置換なし）
  console.log("\n🎙️ ステップ③ 音声を生成しています...");
  execSync("node generate_audio.js --use-prepared", { stdio: "inherit" });

  // 音声を1.3倍速に変換
  console.log("\n⚡ 音声を1.3倍速に変換しています...");
  execSync("python speed_up_audio.py", { stdio: "inherit" });

  // 音声の長さを取得
  console.log("\n⏱️ 音声の長さを取得しています...");
  execSync("python get_audio_duration.py", { stdio: "inherit" });

  // 音声ファイルをremotionにコピー
  const srcAudioDir = path.join(__dirname, "output", "audio");
  const dstAudioDir = path.join(__dirname, "remotion", "public", "audio");
  const srcDurations = path.join(__dirname, "output", "audio_durations.json");
  const dstDurations = path.join(__dirname, "remotion", "public", "audio_durations.json");

  const audioFiles = fs.readdirSync(srcAudioDir).filter(f => f.endsWith(".mp3"));
  audioFiles.forEach(file => {
    fs.copyFileSync(path.join(srcAudioDir, file), path.join(dstAudioDir, file));
    console.log(`✅ コピー完了：${file}`);
  });
  fs.copyFileSync(srcDurations, dstDurations);
  console.log("✅ コピー完了：audio_durations.json");
}

async function regenerateFromAudio() {
  console.log("\n🔄 音声から再生成します...");
  await generateAudioStep();
  renderVideo();
  console.log("【手順1】YouTubeにアップロード（video-botフォルダで実行）");
  console.log("  node upload_youtube.js");
}

async function regenerateImages(sceneNumbers) {
  console.log(`\n🎨 シーン${sceneNumbers.join(",")}の画像を再生成します...`);
  fs.writeFileSync("output/regenerate_scenes.txt", sceneNumbers.join(","));
  execSync("node generate_images.js --scenes", { stdio: "inherit" });
  fs.unlinkSync("output/regenerate_scenes.txt");
  copyScriptToRemotion();
  await generateAudioStep();
  renderVideo();
  console.log("【手順1】YouTubeにアップロード（video-botフォルダで実行）");
  console.log("  node upload_youtube.js");
}

function copyScriptToRemotion() {
  console.log("\n📂 ファイルをremotionにコピーしています...");
  const srcScript = path.join(__dirname, "output", "script.json");
  const dstScript = path.join(__dirname, "remotion", "public", "script.json");
  const dstAudioDir = path.join(__dirname, "remotion", "public", "audio");
  if (!fs.existsSync(dstAudioDir)) {
    fs.mkdirSync(dstAudioDir, { recursive: true });
  }
  fs.copyFileSync(srcScript, dstScript);
  console.log("✅ コピー完了：script.json");
}

function renderVideo() {
  console.log("\n🎥 ステップ④ 動画を合成しています...");
  console.log("（しばらく時間がかかります）");
  execSync(
    "npx remotion render MyComp output.mp4 --codec h264 --crf 18 --timeout 240000",
    { stdio: "inherit", cwd: path.join(__dirname, "remotion") }
  );
}

main();