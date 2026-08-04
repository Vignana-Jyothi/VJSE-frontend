import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { LoginGate } from "../components/LoginGate";
import { AlertCircle, RefreshCw, MessageSquare, Send } from "lucide-react";
import { UserRole } from "../data/network";

interface LeadsPageProps {
  user: { id: number; fullName: string; email: string; role: UserRole } | null;
  onLogin: () => void;
}

export function LeadsPage({ user, onLogin }: LeadsPageProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [leadRecord, setLeadRecord] = useState<any | null>(null);
  
  const [selectedStartupId, setSelectedStartupId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role === "Mentor") {
      fetchMentorData();
    }
  }, [user]);

  async function fetchMentorData() {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch all leads to find the matching lead record
      const leadsRes = await fetch("/api/leads");
      if (!leadsRes.ok) throw new Error("Failed to fetch leads");
      const leadsData = await leadsRes.json();
      setLeads(leadsData);

      const matchingLead = leadsData.find((l: any) => l.email.toLowerCase() === user?.email.toLowerCase());
      setLeadRecord(matchingLead || null);

      if (matchingLead) {
        // 2. Fetch connections
        const connRes = await fetch("/api/connections");
        if (connRes.ok) {
          const connData = await connRes.json();
          setConnections(connData);
        }

        // 3. Fetch startups
        const startupsRes = await fetch("/api/startups");
        if (startupsRes.ok) {
          const startupsData = await startupsRes.json();
          setStartups(startupsData);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  }

  const mentoredStartups = useMemo(() => {
    if (!leadRecord || connections.length === 0 || startups.length === 0) return [];
    
    // Find accepted connection requests for this lead
    const acceptedConns = connections.filter(
      (c) => c.leadId === leadRecord.id && c.status === "Accepted"
    );

    // Map accepted connections to the corresponding startups
    return acceptedConns.map((c) => {
      const startup = startups.find((s) => s.userId === c.userId);
      return {
        id: startup?.id || c.userId,
        userId: c.userId, // Founder userId
        name: startup?.name || c.user?.name || "Unnamed Startup",
        stage: startup?.stage || "Unknown Stage",
        focus: startup?.focus || "General Tech",
        currentGoal: startup?.currentGoal || "No current strategic goal listed.",
      };
    });
  }, [leadRecord, connections, startups]);

  const selectedStartup = useMemo(() => {
    if (mentoredStartups.length === 0) return null;
    return mentoredStartups.find((s) => s.id === selectedStartupId) || mentoredStartups[0];
  }, [selectedStartupId, mentoredStartups]);

  // Set default active startup ID
  useEffect(() => {
    if (mentoredStartups.length > 0 && selectedStartupId === null) {
      setSelectedStartupId(mentoredStartups[0].id);
    }
  }, [mentoredStartups, selectedStartupId]);

  // Poll chats every 3 seconds for active startup
  useEffect(() => {
    if (user && leadRecord && selectedStartup) {
      fetchChats(selectedStartup.userId, leadRecord.id);
      const interval = setInterval(() => {
        fetchChats(selectedStartup.userId, leadRecord.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedStartup, leadRecord, user]);

  async function fetchChats(founderId: number, leadId: number) {
    try {
      const res = await fetch(`/api/chats?userId=${founderId}&leadId=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !user || !leadRecord || !selectedStartup) return;

    const messageText = chatInput;
    setChatInput("");
    setSendingMessage(true);

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStartup.userId,
          leadId: leadRecord.id,
          sender: "Lead",
          content: messageText,
        }),
      });

      if (res.ok) {
        await fetchChats(selectedStartup.userId, leadRecord.id);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMessage(false);
    }
  }

  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  if (user.role !== "Mentor") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-red-500">
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="mt-2 text-sm text-[#9CA3AF]">You do not have permission to view the Mentor dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center text-sm text-[#9CA3AF] py-12">
        Loading mentor workspace...
      </div>
    );
  }

  if (!leadRecord && !loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-8 shadow-xl">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Mentor Profile Not Found</h2>
          <p className="mt-4 text-sm text-[#9CA3AF] max-w-lg mx-auto leading-relaxed">
            Your login email <span className="text-white font-semibold">{user.email}</span> does not match any approved Lead record in the database. 
          </p>
          <p className="mt-2 text-sm text-[#9CA3AF] max-w-lg mx-auto leading-relaxed">
            To view mentored startups, VNR VJIET student must submit your profile as a lead, and it must be verified by VJ STARTUPS volunteer.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Button
              onClick={fetchMentorData}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Check Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Mentor Dashboard</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Your Mentored Startups</h1>
        <p className="max-w-2xl text-base leading-7 text-[#D1D5DB]">
          View startups you mentor and track platform approved leads.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Connected startups</p>
          <p className="mt-4 text-3xl font-semibold text-[#3B82F6]">{mentoredStartups.length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Platform Approved Leads</p>
          <p className="mt-4 text-3xl font-semibold text-[#F59E0B]">{leads.filter((lead) => lead.verified).length}</p>
        </Card>
      </div>

      {mentoredStartups.length === 0 ? (
        <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-12 text-center text-[#9CA3AF]">
          <p className="text-lg font-semibold text-white">No active startup connections found</p>
          <p className="text-sm mt-1">Once a founder connects, their startup details will appear here.</p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {mentoredStartups.map((startup) => (
            <Card 
              key={startup.id} 
              className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm space-y-4"
            >
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#9CA3AF]">{startup.stage} Stage</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{startup.name}</h2>
                <p className="mt-2 text-sm text-[#D1D5DB]">Focus: {startup.focus}</p>
              </div>
              <div className="space-y-2 rounded-2xl bg-[#0A0A0A] p-4 text-xs text-[#9CA3AF] border border-[#1F2937]/50">
                <p className="font-semibold text-white">Current goal:</p>
                <p className="mt-1 leading-relaxed">{startup.currentGoal}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Network table of leads */}
      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">All platform leads</p>
          <h2 className="text-2xl font-semibold text-white">Professional Leads Directory</h2>
        </div>
        <div className="overflow-x-auto rounded-[24px] border border-[#27272A] bg-[#0A0A0A] p-4">
          <Table>
            <TableHeader>
              <TableRow className="text-[#9CA3AF]">
                <TableHead>Mentor Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-white font-semibold">{l.name}</TableCell>
                  <TableCell>{l.email}</TableCell>
                  <TableCell>{l.organization}</TableCell>
                  <TableCell>{l.domain}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      l.verified ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
                    }`}>
                      {l.verified ? "Verified" : "Pending"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
