import firebase_admin
from firebase_admin import credentials, firestore
from scholarship_catalog import SCHOLARSHIPS

# Initialize Firebase Admin SDK
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Sample user profile matching the current profile form fields
test_uid = "testUser123"
user_profile = {
    "name": "Ananya Sharma",
    "gender": "Female",
    "age": "19",
    "email": "ananya@example.com",
    "phone": "9876543210",
    "caste": "SC",
    "religion": "Hindu",
    "educationLevel": "under_grad",
    "tenthPercentage": "89",
    "twelfthPercentage": "86",
    "collegeCgpa": "8.4",
    "fatherIncome": "120000",
    "motherIncome": "80000",
    "role": "student"
}

scholarships_ref = db.collection("scholarships")
for doc in scholarships_ref.stream():
    doc.reference.delete()
print("Cleared existing scholarships")

for scholarship in SCHOLARSHIPS:
    doc_ref = db.collection("scholarships").document()
    doc_ref.set(scholarship)
    print(f"Added scholarship: {scholarship['name']}")

db.collection("users").document(test_uid).set(user_profile)
print(f"Added user profile for UID: {test_uid}")

print(f"\nSuccessfully added {len(SCHOLARSHIPS)} Indian government scholarships to database!")
