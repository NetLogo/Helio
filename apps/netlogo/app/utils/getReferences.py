import requests
import json

# CONFIG
DIRECTUS_URL = "https://backend.netlogo.org"
COLLECTION_NAME = "References"


endpoint = f"{DIRECTUS_URL}/items/{COLLECTION_NAME}?limit=-1"

response = requests.get(endpoint)

if response.status_code == 200:
    data = response.json()["data"]

    
    with open("exploreReferences.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    print(f"Data saved to exploreReferences.json ({len(data)} items)")
else:
    print(f"Error: {response.status_code}")
    print(response.text)