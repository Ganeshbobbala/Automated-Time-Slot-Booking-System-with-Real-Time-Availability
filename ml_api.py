from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

# Load model and encoders
model = joblib.load("ration_model.pkl")
le_district = joblib.load("le_district.pkl")
le_gas = joblib.load("le_gas.pkl")
le_status = joblib.load("le_status.pkl")
le_card = joblib.load("le_card.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        
        # Extract features with defaults
        district = data.get("district", "Hyderabad")
        family_members = data.get("family_members", 3)
        monthly_income = data.get("monthly_income", 5000)
        rice_quota_kg = data.get("rice_quota_kg", 25)
        wheat_quota_kg = data.get("wheat_quota_kg", 10)
        sugar_quota_kg = data.get("sugar_quota_kg", 2)
        gas_connection = data.get("gas_connection", "Yes")
        status = data.get("status", "Active")

        input_data = pd.DataFrame([{
            "district": le_district.transform([district])[0],
            "family_members": family_members,
            "monthly_income": monthly_income,
            "rice_quota_kg": rice_quota_kg,
            "wheat_quota_kg": wheat_quota_kg,
            "sugar_quota_kg": sugar_quota_kg,
            "gas_connection": le_gas.transform([gas_connection])[0],
            "status": le_status.transform([status])[0]
        }])

        prediction = model.predict(input_data)
        result = le_card.inverse_transform(prediction)[0]

        return jsonify({"predicted_card_type": result})
    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({"predicted_card_type": "BPL (White)", "error": str(e)})

if __name__ == "__main__":
    app.run(port=5001, debug=True)