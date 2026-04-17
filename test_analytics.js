const { google } = require('googleapis');
const { authenticate } = require('./auth_youtube');

authenticate().then(async (auth) => {
  const ya = google.youtubeAnalytics({ version: 'v2', auth });
  const res = await ya.reports.query({
    ids: 'channel==MINE',
    startDate: '2026-04-15',
    endDate: '2026-04-18',
    metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage',
    dimensions: 'video',
    filters: 'video==a2ogLWolN3s',
  });
  console.log(JSON.stringify(res.data, null, 2));
}).catch(console.error);