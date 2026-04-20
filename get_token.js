require("dotenv").config();
const https = require("https");
const fs = require("fs");

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = "https://elfkatze2-cloud.github.io/mopuko-bot/";

// URLから取得したcodeをここに貼り付ける
const CODE = "0MA2corDZ6YxTPRcxAxhcUDG18e9-ZqCOyzxxfKcSFer6yFTKvLlGQCDcyrnvJfeQv_CvRFXGAp63I_eINZ8_6NJ1dUwfxVmqKH9BJeLeyKBk9I2Bj3JgD7vNacDhOT3fuXztPwYjT43nIsvvFjBNANSJmlBhV8_wnl1Sm8ZNBarp6QQkQg2H5LPbSIEKK2rQGEw94AtQ3KBiNp8nqiExmc1ed8UFAJ4S1X0ZO070GJenzrCiTfI0Xf-h9M*v!5302.s1";

// auth_tiktok.jsで生成されたcode_verifierが必要
// output/tiktok_verifier.txtに保存する仕組みを追加します
const CODE_VERIFIER = fs.readFileSync("output/tiktok_verifier.txt", "utf8").trim();

const body = new URLSearchParams({
  client_key: CLIENT_KEY,
  client_secret: CLIENT_SECRET,
  code: CODE,
  grant_type: "authorization_code",
  redirect_uri: REDIRECT_URI,
  code_verifier: CODE_VERIFIER,
}).toString();

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
    console.log("レスポンス：", data);
    try {
      const result = JSON.parse(data);
      if (result.access_token) {
        fs.writeFileSync("tiktok_token.json", JSON.stringify(result, null, 2));
        console.log("✅ tiktok_token.jsonを保存しました！");
      }
    } catch (err) {
      console.error("パースエラー:", err);
    }
  });
});

req.on("error", console.error);
req.write(body);
req.end();