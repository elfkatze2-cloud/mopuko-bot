require("dotenv").config();
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

const IMPROVEMENTS_PATH = path.join(__dirname, "output", "improvements.json");

function showMenu(improvements) {
  console.log("\n=====================================");
  console.log("🔧 改善案を選択してください");
  console.log("=====================================");
  improvements.forEach((item) => {
    const priorityMark = item.priority === "高" ? "🔴" : item.priority === "中" ? "🟡" : "🟢";
    const difficultyMark = item.difficulty === "高" ? "★★★" : item.difficulty === "中" ? "★★☆" : "★☆☆";
    console.log(`\n  ${item.id}. ${item.title}`);
    console.log(`     ${item.detail}`);
    console.log(`     優先度：${priorityMark} ${item.priority}　難易度：${difficultyMark}`);
  });
  console.log("\n  0. 自分で改善内容を入力する");
  console.log("  s. スキップ（今回は改善しない）");
  console.log("=====================================");
}

async function main() {
  // improvements.jsonが存在するか確認
  if (!fs.existsSync(IMPROVEMENTS_PATH)) {
    console.error("❌ improvements.jsonが見つかりません。先にanalyze_analytics.jsを実行してください。");
    process.exit(1);
  }

  const improvements = JSON.parse(fs.readFileSync(IMPROVEMENTS_PATH, "utf-8"));

  showMenu(improvements);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question("\n番号を入力してください: ", resolve);
  });

  // スキップ
  if (answer.toLowerCase() === "s") {
    console.log("⏭️ スキップしました。");
    rl.close();
    return;
  }

  let instruction = "";
  let branchName = "";

  // 能動的な改善依頼
  if (answer === "0") {
    instruction = await new Promise((resolve) => {
      rl.question("改善内容を入力してください: ", resolve);
    });
    branchName = "improvement/manual-" + Date.now();
  } else {
    const id = parseInt(answer);
    const selected = improvements.find((item) => item.id === id);
    if (!selected) {
      console.log("❌ 無効な番号です。");
      rl.close();
      return;
    }
    instruction = `以下の改善を実施してください。\n\n【改善タイトル】${selected.title}\n【詳細】${selected.detail}\n\n関連するファイルを確認し、適切な変更を加えてください。変更後はgitでブランチを作成してコミットしてください。`;
    branchName = `improvement/${selected.id}-${selected.title.replace(/\s+/g, "-").slice(0, 20)}`;
    console.log(`\n✅ 選択：${selected.title}`);
  }

  rl.close();

  // 指示内容をファイルに保存（Claude Codeに渡すため）
  const instructionPath = path.join(__dirname, "output", "improvement_instruction.txt");
  fs.writeFileSync(instructionPath, `ブランチ名：${branchName}\n\n${instruction}`, "utf-8");

  console.log("\n📋 改善指示を保存しました：output/improvement_instruction.txt");
  console.log("\n🤖 Claude Codeを起動します...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Claude Codeが起動したら以下を貼り付けてください：");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`output/improvement_instruction.txtを読んで、指示通りに実装してください。`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Claude Codeを起動
  try {
    execSync("claude", { stdio: "inherit", cwd: __dirname });
  } catch (err) {
    // Claude Codeが終了しても正常
  }
}

main().catch(console.error);