const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

app.post("/predict-card", async (req, res) => {
  try {
    const response = await axios.post("http://127.0.0.1:5000/predict", {
      district: req.body.district,
      family_members: req.body.family_members,
      monthly_income: req.body.monthly_income,
      rice_quota_kg: req.body.rice_quota_kg,
      wheat_quota_kg: req.body.wheat_quota_kg,
      sugar_quota_kg: req.body.sugar_quota_kg,
      gas_connection: req.body.gas_connection,
      status: req.body.status
    });

    res.json(response.data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Prediction failed" });
  }
});

app.listen(3000, () => {
  console.log("Node server running on port 3000");
});