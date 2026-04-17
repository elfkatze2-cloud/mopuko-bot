require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");
const http = require("http");
const url = require("url");

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube",
];
const TOKEN_PATH = "token.json";
const CREDENTIALS_PATH = "client_secret.json";

async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "http://localhost:3000"
  );

  // すでにトークンがある場合はそれを使う
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    console.log("✅ 既存のトークンを使用します。");
    return oAuth2Client;
  }

  // 認証URLを生成
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("🌐 以下のURLをブラウザで開いてください：");
  console.log(authUrl);
  console.log("");

  // ローカルサーバーでコールバックを受け取る
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const queryParams = url.parse(req.url, true).query;
      
      if (queryParams.code) {
        res.end("認証完了！このタブを閉じてください。");
        server.close();

        const { tokens } = await oAuth2Client.getToken(queryParams.code);
        oAuth2Client.setCredentials(tokens);

        // トークンを保存
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log("✅ 認証完了！token.jsonを保存しました。");
        resolve(oAuth2Client);
      }
    });

    server.listen(3000, () => {
      console.log("⏳ ブラウザで認証後、自動的に続行されます...");
    });
  });
}

module.exports = { authenticate };