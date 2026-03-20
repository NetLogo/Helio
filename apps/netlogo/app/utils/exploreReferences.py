import json
import ollama

MODEL_NAME = "gemma3:1b"


with open("exploreReferences.json", "r", encoding="utf-8") as f:
    data = json.load(f)

count = 0
for item in data:
    
    # count = 0
    
    reference_text = item.get("reference", "").strip()

    prompt = f"""
    You are a classifier.
    Based on the following academic reference, 
    respond with ONLY THESE SUBJECT AREAS AND NOTHING ELSE: Biology, Ecology, Archaeology, Computer Science, Economics, History, Physics, Chemistry, Urban Studies, Social Science, Education, Epidemiology, and Miscellaneous.
    Always respond with a list of subject(s) from the list above for each reference, even if the reference has only one subject area. A reference may have multiple subject areas.
    Do not include Miscellaneous with a reference if it belongs to another subject area of the list. 
    A reference should only be classified as Miscellaneous if it does not belong to any of the other subject areas in the list.

    Reference:
    {reference_text}

    Respond with only the subject name.
    """

    response = ollama.chat(
        model=MODEL_NAME,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    subject = response["message"]["content"].strip()


    item["subject"] = subject

    count += 1
    if count % 10 == 0:
        print(f"Processed {count} references.")

    # print(reference_text)

# Write updated data back to file
with open("exploreReferences.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4)

print("Finished updating JSON file.")