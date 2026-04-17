require("dotenv").config();
const https = require("https");

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const body = JSON.stringify({
  name: "mopuko-pronunciation",
  rules: [
    {
      type: "alias",
      string_to_replace: "おりこうさん",
      alias: "おりこう さん",
    },
    {
      type: "alias",
      string_to_replace: "お利口さん",
      alias: "おりこう さん",
    },
  ],
});

const options = {
  hostname: "api.elevenlabs.io",
  path: "/v1/pronunciation-dictionaries/add-from-rules",
  method: "POST",
  headers: {
    "xi-api-key": ELEVENLABS_API_KEY,
    "Content-Type": "application/json",
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const result = JSON.parse(data);
    console.log("結果：", JSON.stringify(result, null, 2));
    if (result.id) {
      console.log(`\n✅ 発音辞書ID: ${result.id}`);
      console.log(`✅ バージョンID: ${result.version_id}`);
      console.log("\n.envに以下を追加してください：");
      console.log(`PRONUNCIATION_DICT_ID=${result.id}`);
      console.log(`PRONUNCIATION_DICT_VERSION=${result.version_id}`);
    }
  });
});

req.on("error", console.error);
req.write(body);
req.end();