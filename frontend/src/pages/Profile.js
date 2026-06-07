import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#2c3e50",
  fontWeight: "600",
};

const sectionTitleStyle = {
  textAlign: "center",
  color: "#3498db",
  marginTop: "20px",
  marginBottom: "8px",
};

const subsectionTitleStyle = {
  color: "#2c3e50",
  marginTop: "12px",
  marginBottom: "4px",
};

const twoColumnStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const occupationOptions = [
  "Government Employee",
  "Private Employee",
  "Business",
  "Farmer",
  "Self Employed",
  "Daily Wage Worker",
  "Teacher",
  "Doctor",
  "Engineer",
  "Driver",
  "Homemaker",
  "Retired",
  "Unemployed",
  "Other",
];

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Profile() {
  const [authReady, setAuthReady] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [caste, setCaste] = useState("");
  const [religion, setReligion] = useState("");

  const [educationLevel, setEducationLevel] = useState("");
  const [tenthMarks, setTenthMarks] = useState("");
  const [tenthSchool, setTenthSchool] = useState("");
  const [tenthAddress, setTenthAddress] = useState("");
  const [tenthPercentage, setTenthPercentage] = useState("");
  const [twelfthMarks, setTwelfthMarks] = useState("");
  const [twelfthSchool, setTwelfthSchool] = useState("");
  const [twelfthPercentage, setTwelfthPercentage] = useState("");
  const [twelfthCutoff, setTwelfthCutoff] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [collegeCgpa, setCollegeCgpa] = useState("");
  const [firstGraduate, setFirstGraduate] = useState("");

  const [fatherName, setFatherName] = useState("");
  const [fatherOccupation, setFatherOccupation] = useState("");
  const [fatherIncome, setFatherIncome] = useState("");
  const [fatherStatus, setFatherStatus] = useState("Alive");

  const [motherName, setMotherName] = useState("");
  const [motherOccupation, setMotherOccupation] = useState("");
  const [motherIncome, setMotherIncome] = useState("");
  const [motherStatus, setMotherStatus] = useState("Alive");

  const [siblingsPresent, setSiblingsPresent] = useState("No");
  const [siblingsCount, setSiblingsCount] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthReady(true);
        navigate("/auth", { replace: true });
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const profile = userDoc.exists() ? userDoc.data() : {};

        setName(profile.name || "");
        setGender(profile.gender || "");
        setAge(profile.age || "");
        setEmail(profile.email || user.email || "");
        setPhone(profile.phone || "");
        setCaste(profile.caste || "");
        setReligion(profile.religion || "");
        setEducationLevel(profile.educationLevel || "");
        setTenthMarks(profile.tenthMarks || "");
        setTenthSchool(profile.tenthSchool || "");
        setTenthAddress(profile.tenthAddress || "");
        setTenthPercentage(profile.tenthPercentage || "");
        setTwelfthMarks(profile.twelfthMarks || "");
        setTwelfthSchool(profile.twelfthSchool || "");
        setTwelfthPercentage(profile.twelfthPercentage || "");
        setTwelfthCutoff(profile.twelfthCutoff || "");
        setCollegeName(profile.collegeName || "");
        setCollegeCgpa(profile.collegeCgpa || "");
        setFirstGraduate(profile.firstGraduate || "");
        setFatherName(profile.fatherName || "");
        setFatherOccupation(profile.fatherOccupation || "");
        setFatherIncome(profile.fatherIncome || "");
        setFatherStatus(profile.fatherStatus || "Alive");
        setMotherName(profile.motherName || "");
        setMotherOccupation(profile.motherOccupation || "");
        setMotherIncome(profile.motherIncome || "");
        setMotherStatus(profile.motherStatus || "Alive");
        setSiblingsPresent(profile.siblingsPresent || "No");
        setSiblingsCount(profile.siblingsCount || "");
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first!");
      return;
    }

    try {
      await setDoc(doc(db, "users", user.uid), {
        name,
        gender,
        age,
        email: email || user.email,
        phone,
        caste,
        religion,
        fatherName,
        fatherOccupation,
        fatherIncome,
        fatherStatus,
        motherName,
        motherOccupation,
        motherIncome,
        motherStatus,
        siblingsPresent,
        siblingsCount: siblingsPresent === "Yes" ? siblingsCount : "0",
        educationLevel,
        tenthMarks,
        tenthSchool,
        tenthAddress,
        tenthPercentage,
        twelfthMarks,
        twelfthSchool,
        twelfthPercentage,
        twelfthCutoff,
        collegeName,
        collegeCgpa,
        firstGraduate,
        role: "student",
      }, { merge: true });
      alert("Profile saved successfully!");
      navigate("/chatbot");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile.");
    }
  };

  const showTenthSection = educationLevel !== "middle_school" && educationLevel !== "";
  const showTwelfthSection = educationLevel === "higher_secondary" || educationLevel === "under_grad";
  const showCollegeSection = educationLevel === "under_grad";

  if (!authReady) {
    return null;
  }

  return (
    <div style={{ backgroundColor: "#f0f2f5", minHeight: "100vh", paddingTop: "70px" }}>
      <Navbar />
      <div
        style={{
          padding: "20px",
          maxWidth: "850px",
          margin: "20px auto",
          backgroundColor: "white",
          minHeight: "calc(100vh - 90px)",
          borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ textAlign: "center", color: "#3498db", marginBottom: "20px" }}>
          Student Profile
        </h1>

        <h2 style={sectionTitleStyle}>Student Details</h2>

        <form style={{ display: "flex", flexDirection: "column", gap: "12px" }} onSubmit={handleSubmit}>
          <Field label="Full Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              required
            />
          </Field>

          <div style={twoColumnStyle}>
            <Field label="Gender">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </Field>

            <Field label="Age">
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>
          </div>

          <div style={twoColumnStyle}>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>

            <Field label="Phone Number">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>
          </div>

          <div style={twoColumnStyle}>
            <Field label="Caste">
              <select
                value={caste}
                onChange={(e) => setCaste(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">Select Caste</option>
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="Other">Other</option>
              </select>
            </Field>

            <Field label="Religion">
              <select
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">Select Religion</option>
                <option value="Hindu">Hindu</option>
                <option value="Muslim">Muslim</option>
                <option value="Christian">Christian</option>
                <option value="Sikh">Sikh</option>
                <option value="Buddhist">Buddhist</option>
                <option value="Jain">Jain</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>

          <hr style={{ border: "none", borderTop: "2px solid #3498db", margin: "30px 0" }} />

          <h2 style={sectionTitleStyle}>Family Details</h2>

          <div style={twoColumnStyle}>
            <Field label="Father's Name">
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>

            <Field label="Father's Occupation">
              <select
                value={fatherOccupation}
                onChange={(e) => setFatherOccupation(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">Select Father's Occupation</option>
                {occupationOptions.map((occupation) => (
                  <option key={occupation} value={occupation}>
                    {occupation}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={twoColumnStyle}>
            <Field label="Father's Annual Income">
              <input
                type="number"
                value={fatherIncome}
                onChange={(e) => setFatherIncome(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>

            <Field label="Father Status">
              <select
                value={fatherStatus}
                onChange={(e) => setFatherStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="Alive">Alive</option>
                <option value="Deceased">Deceased</option>
              </select>
            </Field>
          </div>

          <div style={twoColumnStyle}>
            <Field label="Mother's Name">
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>

            <Field label="Mother's Occupation">
              <select
                value={motherOccupation}
                onChange={(e) => setMotherOccupation(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">Select Mother's Occupation</option>
                {occupationOptions.map((occupation) => (
                  <option key={occupation} value={occupation}>
                    {occupation}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={twoColumnStyle}>
            <Field label="Mother's Annual Income">
              <input
                type="number"
                value={motherIncome}
                onChange={(e) => setMotherIncome(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>

            <Field label="Mother Status">
              <select
                value={motherStatus}
                onChange={(e) => setMotherStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="Alive">Alive</option>
                <option value="Deceased">Deceased</option>
              </select>
            </Field>
          </div>

          <div>
            <label style={labelStyle}>Any siblings present?</label>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              <label>
                <input
                  type="radio"
                  name="siblings"
                  value="Yes"
                  checked={siblingsPresent === "Yes"}
                  onChange={(e) => setSiblingsPresent(e.target.value)}
                />
                {" "}Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="siblings"
                  value="No"
                  checked={siblingsPresent === "No"}
                  onChange={(e) => setSiblingsPresent(e.target.value)}
                />
                {" "}No
              </label>
            </div>
          </div>

          {siblingsPresent === "Yes" && (
            <Field label="Number of Siblings">
              <input
                type="number"
                value={siblingsCount}
                onChange={(e) => setSiblingsCount(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>
          )}

          <hr style={{ border: "none", borderTop: "2px solid #3498db", margin: "30px 0" }} />

          <h2 style={sectionTitleStyle}>Academic Details</h2>

          <Field label="Highest Completed Education">
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Select Completed Education</option>
              <option value="middle_school">Middle School</option>
              <option value="high_school">High School</option>
              <option value="higher_secondary">Higher Secondary</option>
              <option value="under_grad">Under Graduate</option>
            </select>
          </Field>

          <div>
            <label style={labelStyle}>First Graduate</label>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              <label>
                <input
                  type="radio"
                  name="firstGraduate"
                  value="Yes"
                  checked={firstGraduate === "Yes"}
                  onChange={(e) => setFirstGraduate(e.target.value)}
                  required
                />
                {" "}Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="firstGraduate"
                  value="No"
                  checked={firstGraduate === "No"}
                  onChange={(e) => setFirstGraduate(e.target.value)}
                  required
                />
                {" "}No
              </label>
            </div>
          </div>

          {showTenthSection && (
            <>
              <h3 style={subsectionTitleStyle}>10th Details</h3>
              <div style={twoColumnStyle}>
                <Field label="10th School Name">
                  <input
                    type="text"
                    value={tenthSchool}
                    onChange={(e) => setTenthSchool(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>

                <Field label="10th School Address">
                  <input
                    type="text"
                    value={tenthAddress}
                    onChange={(e) => setTenthAddress(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>
              </div>

              <div style={twoColumnStyle}>
                <Field label="10th Marks">
                  <input
                    type="number"
                    value={tenthMarks}
                    onChange={(e) => setTenthMarks(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>

                <Field label="10th Percentage">
                  <input
                    type="number"
                    step="0.01"
                    value={tenthPercentage}
                    onChange={(e) => setTenthPercentage(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>
              </div>
            </>
          )}

          {showTwelfthSection && (
            <>
              <h3 style={subsectionTitleStyle}>12th Details</h3>
              <div style={twoColumnStyle}>
                <Field label="12th School Name">
                  <input
                    type="text"
                    value={twelfthSchool}
                    onChange={(e) => setTwelfthSchool(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>

                <Field label="12th Marks">
                  <input
                    type="number"
                    value={twelfthMarks}
                    onChange={(e) => setTwelfthMarks(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>
              </div>

              <div style={twoColumnStyle}>
                <Field label="12th Percentage">
                  <input
                    type="number"
                    step="0.01"
                    value={twelfthPercentage}
                    onChange={(e) => setTwelfthPercentage(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>

                <Field label="12th Cutoff">
                  <input
                    type="number"
                    step="0.01"
                    value={twelfthCutoff}
                    onChange={(e) => setTwelfthCutoff(e.target.value)}
                    style={inputStyle}
                    required={educationLevel === "higher_secondary"}
                  />
                </Field>
              </div>
            </>
          )}

          {showCollegeSection && (
            <>
              <h3 style={subsectionTitleStyle}>College Details</h3>
              <div style={twoColumnStyle}>
                <Field label="College Name">
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>

                <Field label="College CGPA">
                  <input
                    type="number"
                    step="0.01"
                    value={collegeCgpa}
                    onChange={(e) => setCollegeCgpa(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>
              </div>
            </>
          )}

          <button
            type="submit"
            style={{ backgroundColor: "#3498db", color: "white", padding: "12px", border: "none", borderRadius: "5px" }}
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
