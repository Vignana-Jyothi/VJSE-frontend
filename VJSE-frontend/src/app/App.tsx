import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { LandingPage } from "./pages/LandingPage";
import { SubmitLeadPage } from "./pages/SubmitLeadPage";
import { SearchPage } from "./pages/SearchPage";
import { VolunteerPage } from "./pages/VolunteerPage";
import { AdminPage } from "./pages/AdminPage";
import { LoginPage } from "./pages/LoginPage";
import { StudentPage } from "./pages/StudentPage";
import { LeadsPage } from "./pages/LeadsPage";
import { FounderPage } from "./pages/FounderPage";
import { Toast } from "./components/Toast";
import { UserRole } from "./data/network";
import { api } from "./data/api";

type AppUser = {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  profileCompleted?: boolean;
};

const defaultUser: AppUser = {
  id: 3,
  fullName: "Aditi Sharma",
  email: "aditi.sharma@vj.edu",
  role: "Founder",
};

function ProfileCompletionModal({ onComplete, onLogout }: { onComplete: (phone: string, year: string, branch: string) => Promise<void>; onLogout: () => void }) {
  const [phone, setPhone] = useState("");
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !year || !branch) {
      setError("Please fill in all fields.");
      return;
    }
    // Phone number validation (must be 10 to 15 digits)
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onComplete(phone, year, branch);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please click 'Log Out' below and log in again.");
      } else {
        setError(err.response?.data?.error || err.message || "Failed to complete profile. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-lg bg-[#121212] p-8 shadow-2xl border border-white/10">
        <h2 className="text-2xl font-bold text-white text-center">Complete Your Profile</h2>
        <p className="mt-2 text-sm text-[#9CA3AF] text-center mb-6">
          Please provide your details so we can connect you with the right people.
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-500/20 p-3 text-sm text-red-400 border border-red-500/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Phone Number</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              className="w-full rounded bg-[#1F1F1F] border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              placeholder="e.g. +91 98765 43210" 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Year of Study</label>
            <select 
              value={year} 
              onChange={e => setYear(e.target.value)} 
              className="w-full rounded bg-[#1F1F1F] border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              required
            >
              <option value="" disabled>Select Year</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Branch</label>
            <select 
              value={branch} 
              onChange={e => setBranch(e.target.value)} 
              className="w-full rounded bg-[#1F1F1F] border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              required
            >
              <option value="" disabled>Select Branch</option>
              
              <optgroup label="CSE & IT" className="bg-[#1F1F1F] text-emerald-400 font-bold">
                <option value="Computer Science & Engineering (CSE and CSBS)" className="text-white font-normal">
                  Computer Science & Engineering (CSE and CSBS)
                </option>
                <option value="CSE (AI & ML) & IoT and R&AI" className="text-white font-normal">
                  CSE (AI & ML) & IoT and R&AI
                </option>
                <option value="CSE-(CyS,DS) and AI&DS" className="text-white font-normal">
                  CSE-(CyS,DS) and AI&DS
                </option>
                <option value="Information Technology" className="text-white font-normal">
                  Information Technology
                </option>
              </optgroup>

              <optgroup label="Engineering" className="bg-[#1F1F1F] text-emerald-400 font-bold">
                <option value="Automobile Engineering" className="text-white font-normal">
                  Automobile Engineering
                </option>
                <option value="Biotechnology" className="text-white font-normal">
                  Biotechnology
                </option>
                <option value="Civil Engineering" className="text-white font-normal">
                  Civil Engineering
                </option>
                <option value="Electrical & Electronics Engineering" className="text-white font-normal">
                  Electrical & Electronics Engineering
                </option>
                <option value="Electronics and Communication Engineering (ECE) & Electronics Engineering (VLSI Design and Technology - EVL)" className="text-white font-normal">
                  Electronics and Communication Engineering (ECE) & Electronics Engineering (VLSI Design and Technology - EVL)
                </option>
                <option value="Electronics and Instrumentation Engineering" className="text-white font-normal">
                  Electronics and Instrumentation Engineering
                </option>
                <option value="Mechanical Engineering" className="text-white font-normal">
                  Mechanical Engineering
                </option>
              </optgroup>

              <optgroup label="Other Disciplines" className="bg-[#1F1F1F] text-emerald-400 font-bold">
                <option value="Sciences & Humanities" className="text-white font-normal">
                  Sciences & Humanities
                </option>
                <option value="Other" className="text-white font-normal">
                  Other
                </option>
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button 
              type="button"
              onClick={onLogout}
              className="w-1/3 rounded border border-white/20 bg-transparent px-4 py-2.5 font-semibold text-white hover:bg-white/10 transition text-sm"
            >
              Log Out
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="w-2/3 rounded bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Restore authenticated session on mount
  useEffect(() => {
    async function checkAuthSession() {
      try {
        const response = await api.get("/check-auth");
        const userPayload = response.data.user || response.data;
        if (userPayload && userPayload.email) {
          setUser({
            id: userPayload.id || 1,
            fullName: userPayload.fullName || userPayload.name || "VJ User",
            email: userPayload.email,
            role: userPayload.role || "Student",
            profileCompleted: Boolean(userPayload.profileCompleted),
          });
        }
      } catch (err) {
        console.log("No active session found:", err);
        // Clear invalid token
        localStorage.removeItem("token");
        setUser(null);
      }
    }
    checkAuthSession();
  }, []);

  function handleLogin(
    loginData: UserRole | { id: number; name: string; email: string; role: UserRole },
    token?: string
  ) {
    if (token) {
      localStorage.setItem("token", token);
    }
    if (typeof loginData === "string") {
      setUser({
        id: loginData === "Student" ? 1 : loginData === "Founder" ? 3 : 2,
        fullName: `Demo ${loginData}`,
        email: `${loginData.toLowerCase()}@vnrvjiet.in`,
        role: loginData,
        profileCompleted: true,
      });
    } else {
      setUser({
        id: loginData.id,
        fullName: (loginData as any).fullName || loginData.name || "VJ User",
        email: loginData.email,
        role: loginData.role,
        profileCompleted: Boolean((loginData as any).profileCompleted),
      });
    }
  }

  async function handleLogout() {
    try {
      await api.post("/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  }

  function handleSubmitSuccess() {
    setToastMessage("Your lead has been submitted successfully.");
  }

  async function handleProfileComplete(phone: string, year: string, branch: string) {
    const res = await api.post("/api/users/complete-profile", { phone, year, branch });
    if (res.data && res.data.user) {
      const u = res.data.user;
      setUser({
        id: u.id,
        fullName: u.name || u.fullName,
        email: u.email,
        role: u.role,
        profileCompleted: u.profileCompleted
      });
    } else {
      throw new Error("Invalid response from server");
    }
  }

  return (
    <BrowserRouter>
      <div className="dark min-h-screen bg-[#0A0A0A] text-white">
        <TopNav user={user} onLogout={handleLogout} />
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Navigate replace to="/network" />} />
            <Route path="/network" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route
              path="/student"
              element={<StudentPage user={user} onLogin={() => handleLogin("Student")} onSubmit={handleSubmitSuccess} />}
            />
            <Route
              path="/submit-lead"
              element={<SubmitLeadPage user={user} onLogin={() => handleLogin("Student")} onSubmit={handleSubmitSuccess} />}
            />
            <Route
              path="/leads"
              element={<LeadsPage user={user} onLogin={() => handleLogin("Mentor")} />}
            />
            <Route path="/search" element={<SearchPage user={user} onLogin={() => handleLogin("Founder")} />} />
            <Route path="/founder" element={<FounderPage user={user} onLogin={() => handleLogin("Founder")} />} />
            <Route path="/volunteer" element={<VolunteerPage user={user} onLogin={() => handleLogin("Volunteer")} />} />
            <Route path="/admin" element={<AdminPage user={user} onLogin={() => handleLogin("Admin")} onUserRefresh={setUser} />} />
            <Route path="*" element={<Navigate replace to="/network" />} />
          </Routes>
        </main>
        {toastMessage ? <Toast message={toastMessage} /> : null}
        
        {user && user.profileCompleted === false && ['Student', 'Founder', 'Volunteer'].includes(user.role) && (
          <ProfileCompletionModal onComplete={handleProfileComplete} onLogout={handleLogout} />
        )}
      </div>
    </BrowserRouter>
  );
}
