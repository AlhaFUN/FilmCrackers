const fetch = require('node-fetch');

const getSettings = async () => {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY },
  });
  const json = await res.json();
  return json.record;
};

const saveSettings = async (data) => {
  await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': process.env.JSONBIN_API_KEY,
    },
    body: JSON.stringify(data),
  });
};

module.exports = { getSettings, saveSettings };
