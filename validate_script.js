require("dotenv").config();
const fs = require("fs");

function validateAndFormat(scriptData) {
  const errors = [];

  // ① シーン数チェック
 if (scriptData.scenes.length !== 4) {
    errors.push(`❌ シーン数が${scriptData.scenes.length}つです。4つである必要があります。`);
  }
  
  // ② 各シーンのチェック
  scriptData.scenes.forEach((scene) => {
    // ナレーションの長さチェック（150文字以内）
    if (scene.narration.length > 150) {
      errors.push(`❌ シーン${scene.scene_number}のナレーションが長すぎます（${scene.narration.length}文字）。150文字以内にしてください。`);
    }

    // テロップの長さチェック（20文字以内）
    if (scene.caption.length > 20) {
      errors.push(`❌ シーン${scene.scene_number}のテロップが長すぎます（${scene.caption.length}文字）。20文字以内にしてください。`);
    }
  });

  // エラーがあれば表示して終了
  if (errors.length > 0) {
    console.log("⚠️ 以下の問題が見つかりました：");
    errors.forEach((e) => console.log(e));
    process.exit(1);
  }

// ③ 発音改善のための置換
  scriptData.scenes.forEach((scene) => {
    scene.narration = scene.narration
      // 数字の読み方
      .replace(/6割/g, "ろくわり")
      .replace(/7割/g, "ななわり")
      .replace(/8割/g, "はちわり")
      .replace(/1割/g, "いちわり")
      .replace(/2割/g, "にわり")
      // よく間違える単語
      .replace(/即レス/g, "そくれす")
      .replace(/絞る/g, "しぼる")
      .replace(/スッキリ/g, "すっきり")
      .replace(/切れるからね/g, "きれるからね")
      // 英数字混じりの表現
      .replace(/SNS/g, "エスエヌエス")
      .replace(/YouTube/g, "ユーチューブ")
      .replace(/AI/g, "エーアイ");
  });

  // ③ 投稿文の整形
  scriptData.post_text = scriptData.post_text
    .replace(/、/g, "")   // 読点を削除
    .replace(/。/g, "")   // 句点を削除
    .replace(/　/g, " "); // 全角スペースを半角に

  console.log("✅ チェック完了！問題ありません。");
  console.log("✅ 投稿文の整形完了！");

  return scriptData;
}

// script.jsonを読み込む
const rawData = fs.readFileSync("output/script.json", "utf8");
const scriptData = JSON.parse(rawData);

// 検証と整形を実行
const formattedData = validateAndFormat(scriptData);

// 整形済みデータを上書き保存
fs.writeFileSync(
  "output/script.json",
  JSON.stringify(formattedData, null, 2)
);

console.log("✅ output/script.json を更新しました。");