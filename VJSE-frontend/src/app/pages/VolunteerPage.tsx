import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  Clock, 
  AlertCircle, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  UserMinus,
  Bell,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { UserRole } from "../data/network";
import { LoginGate } from "../components/LoginGate";

interface VolunteerPageProps {
  user: { id: number; fullName: string; email: string; role: UserRole } | null;
  onLogin: () => void;
}

interface Lead {
  id: number;
  name: string;
  email: string;
  domain: string;
  organization: string;
  skills: string;
  verified: boolean;
  status: string;
  rejectionReason: string;
  invited: boolean;
  createdAt: string;
  sourcerId?: number | null;
  sourcer?: { id: number; name: string; email: string; phone: string; year: string; branch: string; rejectionCount: number; isBlocked: boolean } | null;
  approvedByVolunteer?: { id: number; name: string; email: string } | null;
  approvedAt?: string | null;
}

export function VolunteerPage({ user, onLogin }: VolunteerPageProps) {
  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  
  // Rejection Dialog State
  const [rejectingLeadId, setRejectingLeadId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState("");

  // Notifications State
  const [declinedNotifications, setDeclinedNotifications] = useState<any[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Timeline State
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [expandedConnections, setExpandedConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchNotifications();

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 60000); // 60 seconds

    return () => clearInterval(intervalId);
  }, []);

  async function fetchLeads() {
    setLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        setActionError("Failed to retrieve leads from API.");
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications/sourcer-declined");
      if (res.ok) {
        const data = await res.json();
        setDeclinedNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }

  function handleMarkHandled(id: number) {
    setDeclinedNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function handleToggleTimeline(leadId: number) {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
      return;
    }
    
    setExpandedLeadId(leadId);
    setLoadingConnections(true);
    setExpandedConnections([]);
    
    try {
      const res = await fetch(`/api/connections?leadId=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedConnections(data);
      }
    } catch (err) {
      console.error("Failed to fetch connections", err);
    } finally {
      setLoadingConnections(false);
    }
  }

  async function handleApprove(leadId: number) {
    try {
      const res = await fetch(`/api/leads/${leadId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        await fetchLeads();
      } else {
        setActionError("Failed to approve the lead.");
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to connect to server for approval.");
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingLeadId || !rejectionReason.trim()) return;

    try {
      const res = await fetch(`/api/leads/${rejectingLeadId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason })
      });
      if (res.ok) {
        setRejectingLeadId(null);
        setRejectionReason("");
        await fetchLeads();
      } else {
        setActionError("Failed to submit rejection.");
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to connect to server for rejection.");
    }
  }

  async function handleInvite(leadId: number) {
    try {
      const res = await fetch(`/api/leads/${leadId}/invite`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchLeads();
      } else {
        setActionError("Failed to dispatch invitation.");
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to connect to server for invitation.");
    }
  }

  const filteredLeads = leads.filter(l => {
    const status = l.status || "Pending";
    return status === activeTab;
  });

  const stats = {
    pending: leads.filter(l => (l.status || "Pending") === "Pending").length,
    approved: leads.filter(l => l.status === "Approved").length,
    rejected: leads.filter(l => l.status === "Rejected").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <span className="inline-flex items-center rounded-full bg-gray-500/20 px-2 py-0.5 text-xs font-semibold text-gray-400">Pending</span>;
      case 'Sourcer Accepted':
        return <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">Sourcer Accepted</span>;
      case 'Sourcer Declined':
        return <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">Sourcer Declined</span>;
      case 'Intro Made':
        return <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-400">Intro Made</span>;
      case 'Connected':
        return <span className="inline-flex items-center rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-400">Connected</span>;
      case 'Declined':
        return <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">Mentor Declined</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-500/20 px-2 py-0.5 text-xs font-semibold text-gray-400">{status}</span>;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Title Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#1F2937] pb-6">
        <div className="space-y-2 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Volunteer Workspace</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Volunteer Review Panel</h1>
          <p className="max-w-2xl text-base leading-7 text-[#9CA3AF]">
            Review startup lead submissions from students. Verify credibility, reject submissions with written reasons, and invite approved mentors.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            className="border-[#1F2937] bg-[#111111] text-white hover:bg-[#1C1C1C]"
            onClick={fetchLeads}
          >
            <RefreshCw className="mr-2 h-4 w-4 text-[#3B82F6]" />
            Refresh Leads
          </Button>

          {/* Notifications Bell */}
          <button 
            onClick={() => setIsPanelOpen(true)}
            className="relative p-2 rounded-full hover:bg-[#1F2937] transition text-white border border-[#1F2937] bg-[#111111]"
          >
            <Bell className="h-5 w-5" />
            {declinedNotifications.length > 0 && (
              <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center -mt-1 -mr-1">
                {declinedNotifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div 
          onClick={() => setActiveTab("Pending")}
          className={`cursor-pointer rounded-[24px] border p-6 text-white shadow-sm transition duration-200 ${
            activeTab === "Pending" ? "border-yellow-500/50 bg-yellow-950/10" : "border-[#1F2937] bg-[#111111] hover:border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-[#9CA3AF] font-bold">Pending Review</p>
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="mt-4 text-4xl font-bold text-yellow-500">{stats.pending}</p>
        </div>

        <div 
          onClick={() => setActiveTab("Approved")}
          className={`cursor-pointer rounded-[24px] border p-6 text-white shadow-sm transition duration-200 ${
            activeTab === "Approved" ? "border-green-500/50 bg-green-950/10" : "border-[#1F2937] bg-[#111111] hover:border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-[#9CA3AF] font-bold">Approved Leads</p>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-4 text-4xl font-bold text-green-500">{stats.approved}</p>
        </div>

        <div 
          onClick={() => setActiveTab("Rejected")}
          className={`cursor-pointer rounded-[24px] border p-6 text-white shadow-sm transition duration-200 ${
            activeTab === "Rejected" ? "border-red-500/50 bg-red-950/10" : "border-[#1F2937] bg-[#111111] hover:border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-[#9CA3AF] font-bold">Rejected Leads</p>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-4 text-4xl font-bold text-red-500">{stats.rejected}</p>
        </div>
      </div>

      {/* Tabs list view */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading leads database...</div>
      ) : filteredLeads.length === 0 ? (
        <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-12 text-center text-[#9CA3AF]">
          <ShieldCheck className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-white">No leads in "{activeTab}" status</p>
          <p className="text-sm mt-1">Everything looks caught up in this tab!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="rounded-[24px] border border-[#1F2937] bg-[#111111] shadow-xl space-y-4 hover:border-gray-800 transition duration-200 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-2.5 py-0.5 rounded-full">
                          {lead.domain}
                        </span>
                        {lead.invited && (
                          <span className="text-[10px] uppercase font-bold text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Invited
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleToggleTimeline(lead.id)}
                        className="text-xs text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1 bg-[#3B82F6]/10 px-2 py-1 rounded"
                      >
                        {expandedLeadId === lead.id ? (
                          <><ChevronUp className="h-3 w-3" /> Hide Timeline</>
                        ) : (
                          <><ChevronDown className="h-3 w-3" /> View Timeline</>
                        )}
                      </button>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mt-2">{lead.name}</h3>
                    <p className="text-sm text-[#9CA3AF]">
                      Organization: <span className="text-white font-medium">{lead.organization}</span> • Contact: <span className="text-white font-medium">{lead.email}</span>
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0 md:self-end mt-4 md:mt-0">
                    {/* Actions depending on Status */}
                    {(lead.status || "Pending") === "Pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(lead.id)}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 h-9 font-semibold text-xs"
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          Approve Lead
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectingLeadId(lead.id)}
                          className="border-red-600 text-red-500 hover:bg-red-950/20 rounded-lg px-4 h-9 font-semibold text-xs"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          Reject Lead
                        </Button>
                      </>
                    )}

                    {lead.status === "Approved" && !lead.invited && (
                      <Button
                        size="sm"
                        onClick={() => handleInvite(lead.id)}
                        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg px-4 h-9 font-semibold text-xs"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Send Join Invite
                      </Button>
                    )}

                    {lead.status === "Approved" && lead.invited && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1.5 text-xs text-green-400 font-semibold">
                        <Mail className="h-3.5 w-3.5" />
                        Invitation Sent
                      </span>
                    )}
                  </div>
                </div>

                {/* Skills Area */}
                {lead.skills && (
                  <div className="border-t border-[#1F2937] pt-4 mt-4 space-y-1.5">
                    <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Expertise / Skills Provided:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.skills.split(",").map((s) => (
                        <span key={s.trim()} className="rounded-md bg-[#0A0A0A] px-2 py-1 text-xs text-[#3B82F6] border border-[#1F2937]">
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection reason details */}
                {lead.status === "Rejected" && lead.rejectionReason && (
                  <div className="border-t border-red-900/40 bg-red-950/10 p-4 rounded-xl mt-4 space-y-1">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserMinus className="h-3.5 w-3.5" />
                      Written Rejection Reason:
                    </p>
                    <p className="text-sm text-red-200 italic">"{lead.rejectionReason}"</p>
                  </div>
                )}
              </div>

              {/* Expandable Timeline Section */}
              {expandedLeadId === lead.id && (
                <div className="bg-[#0A0A0A] border-t border-[#1F2937] p-6 space-y-6">
                  
                  {/* Metadata Details */}
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    {/* Sourcer Info */}
                    <div className="p-4 rounded-lg bg-[#111111] border border-[#1F2937]">
                      <h4 className="font-semibold text-white mb-2 uppercase tracking-wide text-xs">Sourcer Details</h4>
                      {lead.sourcer ? (
                        <ul className="space-y-1 text-[#9CA3AF]">
                          <li><span className="font-medium text-white">{lead.sourcer.name}</span></li>
                          <li><a href={`mailto:${lead.sourcer.email}`} className="text-[#3B82F6] hover:underline">{lead.sourcer.email}</a></li>
                          <li><a href={`tel:${lead.sourcer.phone}`} className="text-[#3B82F6] hover:underline">{lead.sourcer.phone || 'N/A'}</a></li>
                          <li>{lead.sourcer.year || 'N/A'} - {lead.sourcer.branch || 'N/A'}</li>
                          <li>Date Submitted: {new Date(lead.createdAt).toLocaleDateString()}</li>
                        </ul>
                      ) : (
                        <p className="text-gray-500 italic">No sourcer attached.</p>
                      )}
                    </div>

                    {/* Approval Info */}
                    <div className="p-4 rounded-lg bg-[#111111] border border-[#1F2937]">
                      <h4 className="font-semibold text-white mb-2 uppercase tracking-wide text-xs">Approval Details</h4>
                      {lead.approvedByVolunteer ? (
                        <ul className="space-y-1 text-[#9CA3AF]">
                          <li>Approved by: <span className="font-medium text-white">{lead.approvedByVolunteer.name}</span></li>
                          <li>Date: {lead.approvedAt ? new Date(lead.approvedAt).toLocaleString() : 'Unknown'}</li>
                        </ul>
                      ) : (
                        <p className="text-gray-500 italic">Not approved yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Connection Requests List */}
                  <div>
                    <h4 className="font-semibold text-white mb-4 border-b border-[#1F2937] pb-2">Connection Requests History</h4>
                    
                    {loadingConnections ? (
                      <p className="text-[#9CA3AF] text-sm animate-pulse">Loading connections...</p>
                    ) : expandedConnections.length === 0 ? (
                      <p className="text-[#9CA3AF] text-sm italic">No founder connections requested yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {expandedConnections.map(conn => (
                          <div key={conn.id} className="p-4 rounded border border-[#1F2937] bg-[#111111] flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <p className="text-white font-medium">{conn.user?.name || "A Founder"}</p>
                              <p className="text-xs text-[#9CA3AF]">Requested: {new Date(conn.createdAt).toLocaleDateString()}</p>
                            </div>
                            
                            <div className="text-xs text-[#9CA3AF] space-y-1 flex-1 px-4">
                              <p>Sourcer Response: <span className="text-white font-semibold capitalize">{conn.sourcerResponse || "Not contacted"}</span> {conn.sourcerRespondedAt && `(${new Date(conn.sourcerRespondedAt).toLocaleDateString()})`}</p>
                              <p>Mentor Response: <span className="text-white font-semibold capitalize">{conn.status === 'Declined' ? 'Declined' : conn.status === 'Intro Made' ? 'Accepted' : (conn.mentorNotifiedAt ? 'Pending' : 'Not contacted')}</span></p>
                            </div>

                            <div className="shrink-0 text-right">
                              {getStatusBadge(conn.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Slide-in Notifications Panel */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsPanelOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#121212] h-full shadow-2xl border-l border-[#1F2937] flex flex-col animate-in slide-in-from-right overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#1F2937]">
              <h2 className="text-xl font-bold text-white">Declined Notifications</h2>
              <button onClick={() => setIsPanelOpen(false)} className="text-[#9CA3AF] hover:text-white transition">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {declinedNotifications.length === 0 ? (
                <div className="text-center text-[#9CA3AF] pt-10">
                  <Bell className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No pending notifications</p>
                </div>
              ) : (
                declinedNotifications.map(notification => (
                  <div key={notification.id} className="bg-[#1C1C1C] rounded-lg p-5 border border-red-900/30">
                    <p className="text-red-400 font-bold text-xs uppercase tracking-wider mb-2">Sourcer Declined Introduction</p>
                    
                    {notification.lead?.sourcer && (
                      <div className="mb-4 space-y-1">
                        <p className="text-xl font-bold text-white">{notification.lead.sourcer.name}</p>
                        <p className="text-sm">
                          <a href={`mailto:${notification.lead.sourcer.email}`} className="text-[#3B82F6] hover:underline">{notification.lead.sourcer.email}</a>
                        </p>
                        <p className="text-sm">
                          <a href={`tel:${notification.lead.sourcer.phone}`} className="text-[#3B82F6] hover:underline">{notification.lead.sourcer.phone || 'N/A'}</a>
                        </p>
                        <p className="text-xs text-[#9CA3AF]">{notification.lead.sourcer.year} • {notification.lead.sourcer.branch}</p>
                      </div>
                    )}

                    <div className="text-sm text-[#9CA3AF] bg-[#111111] p-3 rounded space-y-1 mb-4">
                      <p>Mentor: <span className="text-white font-medium">{notification.lead?.name}</span></p>
                      <p>Requested By: <span className="text-white font-medium">{notification.user?.name}</span></p>
                      <p>Declined On: {new Date(notification.sourcerRespondedAt).toLocaleString()}</p>
                    </div>

                    <button 
                      onClick={() => handleMarkHandled(notification.id)}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition"
                    >
                      Mark as Handled
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {rejectingLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-2xl space-y-5">
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Reject Lead Submission
              </CardTitle>
              <CardDescription className="text-sm text-[#9CA3AF]">
                Provide a detailed written explanation for rejecting this lead. This will be logged on the platform.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#9CA3AF]">Rejection Explanation</label>
                <Textarea
                  placeholder="e.g. Lead works in a domain that is currently outside our network focus, or email credentials could not be validated."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="border-[#1F2937] bg-[#0A0A0A] text-white focus:border-red-500 rounded-xl min-h-[100px] resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRejectingLeadId(null);
                    setRejectionReason("");
                  }}
                  className="border-[#1F2937] bg-[#111111] hover:bg-[#1C1C1C] text-white rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                >
                  Submit Rejection
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
