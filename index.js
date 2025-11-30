const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

app.post('/run', async (req, res) => {
  try {
    const { inputFields, payload } = req.body;
    const itemId = payload.trigger.item.ids[0];
    const itemName = payload.trigger.item.name;
    const boardId = inputFields.boardId;
    const keeperGroupId = inputFields.keeperGroupId;
    const token = req.headers.authorization.replace('Bearer ', '');

    // Search for duplicates (exact name match)
    const query = `{ items_by_column_values(board_ids: ${boardId}, column_id: "name", column_value: "${itemName}") { id name group { id } } }`;
    const searchRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await searchRes.json();
    const duplicates = data.data.items_by_column_values || [];

    // Delete all except keeper group
    for (const dup of duplicates) {
      if (dup.group.id !== keeperGroupId) {
        await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: { 'Authorization': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `mutation { delete_item(item_id: ${dup.id}) { id } }` })
        });
      }
    }
    res.status(200).send({ status: 'success' });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000);
