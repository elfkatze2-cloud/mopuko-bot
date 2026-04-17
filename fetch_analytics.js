const { google } = require("googleapis");
const { authenticate } = require("./auth_youtube");
const fs = require("fs");
const path = require("path");

const CHANNEL_START_DATE = new Date("2026-04-15T02:38:00Z");

async function fetchAnalytics() {
  const auth = await authenticate();
  const youtubeAnalytics = google.youtubeAnalytics({ version: "v2", auth });
  const youtube = google.youtube({ version: "v3", auth });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const formatDate = (d) => d.toISOString().split("T")[0];

  console.log("📊 YouTubeアナリティクスを取得中...");

  // チャンネルIDを取得
  const channelRes = await youtube.channels.list({
    part: "id,contentDetails",
    mine: true,
  });
  const channel = channelRes.data.items[0];
  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

  // アップロード済み動画一覧を取得
  let allVideos = [];
  let pageToken = null;
  do {
    const playlistRes = await youtube.playlistItems.list({
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: pageToken,
    });
    allVideos = allVideos.concat(playlistRes.data.items);
    pageToken = playlistRes.data.nextPageToken;
  } while (pageToken);

  // CHANNEL_START_DATE以降の動画だけフィルタ
  const targetVideos = allVideos.filter((item) => {
    const publishedAt = new Date(item.snippet.publishedAt);
    return publishedAt >= CHANNEL_START_DATE;
  });

  console.log(`✅ 対象動画数：${targetVideos.length}件`);

  if (targetVideos.length === 0) {
    console.log("対象動画がありません。");
    return;
  }

  const targetVideoIds = targetVideos.map(
    (item) => item.snippet.resourceId.videoId
  );

  // Data APIでリアルタイムに近い統計を取得（再生数・いいね・コメント）
  const statsRes = await youtube.videos.list({
    part: "statistics,snippet",
    id: targetVideoIds.join(","),
  });

  const statsMap = {};
  statsRes.data.items?.forEach((item) => {
    statsMap[item.id] = {
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      views: parseInt(item.statistics.viewCount || 0),
      likes: parseInt(item.statistics.likeCount || 0),
      comments: parseInt(item.statistics.commentCount || 0),
    };
  });

  // Analytics APIで平均視聴時間・視聴維持率を取得（反映済み動画のみ）
  const analyticsRes = await youtubeAnalytics.reports.query({
    ids: "channel==MINE",
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage",
    dimensions: "video",
    sort: "-views",
    filters: `video==${targetVideoIds.join(",")}`,
  });

  const analyticsMap = {};
  (analyticsRes.data.rows || []).forEach((row) => {
    analyticsMap[row[0]] = {
      estimatedMinutesWatched: row[2],
      averageViewDuration: row[3],
      averageViewPercentage: row[4],
    };
  });

  // チャンネル全体の基本指標
  const channelStats = await youtubeAnalytics.reports.query({
    ids: "channel==MINE",
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost",
  });

  // 全動画のデータを統合
  const videos = targetVideoIds.map((id) => {
    const stats = statsMap[id] || {};
    const analytics = analyticsMap[id] || {};
    return {
      videoId: id,
      title: stats.title || "不明",
      publishedAt: stats.publishedAt,
      views: stats.views,
      likes: stats.likes,
      comments: stats.comments,
      // Analytics反映済みの場合のみ追加
      ...(analytics.averageViewDuration !== undefined && {
        estimatedMinutesWatched: analytics.estimatedMinutesWatched,
        averageViewDuration: analytics.averageViewDuration,
        averageViewPercentage: analytics.averageViewPercentage,
      }),
    };
  });

  // 再生数の多い順に並べ替え
  videos.sort((a, b) => b.views - a.views);

  // レポートを整形
  const report = {
    period: {
      start: formatDate(startDate),
      end: formatDate(endDate),
    },
    channelOverall: {
      headers: channelStats.data.columnHeaders?.map((h) => h.name),
      data: channelStats.data.rows?.[0] || [],
    },
    videos,
  };

  // outputフォルダに保存
  const outputPath = path.join(__dirname, "output", "analytics_report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`✅ アナリティクスレポートを保存しました：${outputPath}`);
  console.log(JSON.stringify(report, null, 2));

  return report;
}

fetchAnalytics().catch(console.error);