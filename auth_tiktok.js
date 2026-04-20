require("dotenv").config();
const https = require("https");
const http = require("http");
const url = require("url");
const fs = require("fs");
const crypto = require("crypto");

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = "https://elfkatze2-cloud.github.io/mopuko-bot/";
const TOKEN_PATH = "tiktok_token.json";

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

async function authenticate() {
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    console.log("✅ 既存のTikTokトークンを使用します。");
    return token.access_token;
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  fs.writeFileSync("output/tiktok_verifier.txt", codeVerifier);

  const scope = "user.info.basic,video.publish,video.upload";
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${CLIENT_KEY}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=mopuko&code_challenge=${codeChallenge}&code_challenge_method=S256&sandbox=true`;

  console.log("🌐 以下のURLをブラウザで開いてください：");
  console.log(authUrl);
  console.log("");

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const queryParams = url.parse(req.url, true).query;

      if (queryParams.code) {
        res.end("TikTok認証完了！このタブを閉じてください。");
        server.close();

        const tokenData = await getAccessToken(queryParams.code, codeVerifier);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
        console.log("✅ TikTok認証完了！tiktok_token.jsonを保存しました。");
        resolve(tokenData.access_token);
      }
    });

    server.listen(3000, () => {
      console.log("⏳ ブラウザで認証後、自動的に続行されます...");
    });
  });
}

async function getAccessToken(code, codeVerifier) {
  const body = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    code: code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  }).toString();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "open.tiktokapis.com",
      path: "/v2/oauth/token/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          console.log("トークンレスポンス：", result);
          resolve(result);
        } catch (err) {
          reject(new Error("トークン取得失敗: " + data));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = { authenticate };

if (require.main === module) {
  authenticate().then((token) => {
    console.log("✅ アクセストークン取得完了！");
    process.exit(0);
  }).catch(console.error);
}