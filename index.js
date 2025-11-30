import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.post('/api/run', async (req, res) => {
  try {
    const { inputFields, payload } = req.body;
    const itemName = payload.trigger.item.name;
    const boardId = inputFields.boardId;
    const keeperGroupId = inputFields.keeperGroupId;
    const token = req.headers.authorization.replace('Bearer ', '');

    // Find all items with the same name
    const searchQuery = `{ items_by_column_values(board_ids: ${boardId}, column_id: "name", column_value: "${itemName}") { id group { id } } }`;
    const searchRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery })
    });
    const data = await searchRes.json();
    const duplicates = data.data.items_by_column_values || [];

    // Delete every duplicate that is NOT in the keeper group
    for (const item of duplicates) {
      if (item.group.id !== keeperGroupId) {
        await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: { 'Authorization': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation { delete_item(item_id: ${item.id}) { id } }`
          })
        });
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
