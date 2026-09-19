import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { LoginGate } from "../components/LoginGate";
import { domainOptions } from "../data/network";
import { ChevronDown, ChevronUp, X } from "lucide-react";

interface AdminPageProps {
  user: { id: number; fullName: string; email: string; role: string } | null;
  onLogin: () => void;
  onUserRefresh?: (updatedUser: { id: number; fullName: string; email: string; role: string }) => void;
}

export function AdminPage({ user, onLogin, onUserRefresh }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [leads, setLeads] = useState<any[]>([]);
  const [introRequests, setIntroRequests] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [filterDomain, setFilterDomain] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [filterBlacklist, setFilterBlacklist] = useState("All");
  const [filterSourcerId, setFilterSourcerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleSuccessId, setRoleSuccessId] = useState<number | null>(null);
  const [viewLeadsUserId, setViewLeadsUserId] = useState<number | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  useEffect(() => {
    if (user && user.role === "Admin") {
      fetchAdminData();
    }
  }, [user]);

  async function fetchAdminData() {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch leads
      const leadsRes = await fetch("/api/leads");
      if (!leadsRes.ok) throw new Error("Failed to fetch leads");
      const leadsData = await leadsRes.json();
      setLeads(leadsData);

      // 2. Fetch connection requests
      const connRes = await fetch("/api/connections");
      if (!connRes.ok) throw new Error("Failed to fetch connection requests");
      const connData = await connRes.json();
      
      const mappedRequests = connData.map((c: any) => ({
        id: c.id,
        founder: c.user?.name || `Founder (ID: ${c.userId})`,
        email: c.user?.email || "",
        leadName: c.lead?.name || `Lead (ID: ${c.leadId})`,
        leadRole: c.lead?.skills || "Mentor",
        leadOrg: c.lead?.organization || "",
        timestamp: new Date(c.createdAt).toLocaleDateString(),
        status: c.status,
        handled: c.status !== "Pending",
        sourcer: c.lead?.sourcer || null,
        approvedByVolunteer: c.lead?.approvedByVolunteer || null,
        approvedAt: c.lead?.approvedAt || null,
        leadCreatedAt: c.lead?.createdAt || null,
        sourcerResponse: c.sourcerResponse,
        sourcerRespondedAt: c.sourcerRespondedAt,
        mentorNotifiedAt: c.mentorNotifiedAt,
      }));
      setIntroRequests(mappedRequests);

      // 3. Fetch all platform users
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData);
      }

      // 4. Fetch login logs
      const logsRes = await fetch("/api/logs/logins");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLoginLogs(logsData);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve admin data from backend.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userObj: any, newRole: string) {
    if (userObj.role === newRole) return;

    const confirmed = window.confirm(
      `Are you sure you want to change the role of ${userObj.name} (${userObj.email}) from "${userObj.role}" to "${newRole}"?`
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/users/${userObj.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        // Refresh users table
        await fetchAdminData();

        // Show per-row success indicator
        setRoleSuccessId(userObj.id);
        setTimeout(() => setRoleSuccessId(null), 2000);

        // Fix 5: If admin changed their own role, refresh the top-level session
        if (user && userObj.id === user.id && onUserRefresh) {
          try {
            const sessionRes = await fetch("/check-auth");
            if (sessionRes.ok) {
              const sessionData = await sessionRes.json();
              const fresh = sessionData.user || sessionData;
              if (fresh && fresh.email) {
                onUserRefresh({
                  id: fresh.id,
                  fullName: fresh.fullName || fresh.name || "VJ User",
                  email: fresh.email,
                  role: fresh.role,
                });
              }
            }
          } catch (refreshErr) {
            console.error("Failed to refresh own session after role change:", refreshErr);
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to update user role.");
      }
    } catch (err) {
      console.error(err);
      setError("Error changing user role.");
    }
  }

  async function handleBlockSourcer(userId: number) {
    const confirmed = window.confirm("Block this sourcer? They will be prevented from logging in.");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/users/${userId}/blacklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: true }),
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        setError("Failed to block sourcer.");
      }
    } catch (err) {
      console.error(err);
      setError("Error blocking sourcer.");
    }
  }

  function getSourcerLeadCount(userId: number) {
    return leads.filter((l: any) => l.sourcerId === userId).length;
  }

  async function confirmKickUser() {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/users/${selectedUserId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        setError("Failed to kick user.");
      }
    } catch (err) {
      console.error(err);
      setError("Error kicking user.");
    } finally {
      setSelectedUserId(null);
    }
  }

  const flaggedSourcers = useMemo(() => {
    return usersList.filter((u: any) => (u.rejectionCount ?? 0) >= 5 && !u.isBlocked);
  }, [usersList]);

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch = !userSearch.trim() || 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.email.toLowerCase().includes(userSearch.toLowerCase());

      const matchesRole = filterRole === "All" || u.role === filterRole;

      const matchesBlacklist = 
        filterBlacklist === "All"
          ? true
          : filterBlacklist === "Blacklisted"
            ? Boolean(u.isBlocked)
            : !u.isBlocked;

      return matchesSearch && matchesRole && matchesBlacklist;
    });
  }, [usersList, userSearch, filterRole, filterBlacklist]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const domainMatch = filterDomain ? lead.domain === filterDomain : true;
      const statusMatch =
        filterStatus === "All"
          ? true
          : filterStatus === "Verified"
            ? lead.verified
            : !lead.verified;
      const sourcerMatch = filterSourcerId ? lead.sourcerId === filterSourcerId : true;
      return domainMatch && statusMatch && sourcerMatch;
    });
  }, [filterDomain, filterStatus, leads, filterSourcerId]);

  const activeRequests = introRequests.filter((request) => !request.handled);

  const csvData = [
    ["Name", "Email", "Organisation", "Domain", "Skills", "Status", "Invited", "Created At"],
    ...leads.map((lead) => [
      lead.name,
      lead.email,
      lead.organization,
      lead.domain,
      lead.skills,
      lead.status,
      lead.invited ? "Invited" : "No",
      new Date(lead.createdAt).toLocaleDateString(),
    ]),
  ]
    .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
    .join("\n");

  function downloadCsv() {
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vj-network-leads.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleVerifyToggle(leadId: number, currentVerified: boolean) {
    try {
      const res = await fetch(`/api/leads/${leadId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verified: !currentVerified
        })
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        setError("Failed to toggle verification status.");
      }
    } catch (err) {
      console.error(err);
      setError("Error calling verification API.");
    }
  }

  async function confirmDelete() {
    if (!selectedLeadId) return;
    try {
      const res = await fetch(`/api/leads/${selectedLeadId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        setError("Failed to delete lead.");
      }
    } catch (err) {
      console.error(err);
      setError("Error calling delete API.");
    } finally {
      setSelectedLeadId(null);
    }
  }

  async function markHandled(connectionId: number) {
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Accepted"
        })
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        setError("Failed to update connection request status.");
      }
    } catch (err) {
      console.error(err);
      setError("Error updating connection status.");
    }
  }

  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  if (user.role !== "Admin") {
    return (
      <div className="text-center text-red-500 py-12">
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="mt-2 text-sm text-[#9CA3AF]">You do not have permission to view the Admin panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Admin Control Panel</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Admin Control Panel</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-[#9CA3AF] py-6">
          Loading admin database...
        </div>
      )}

      <Card className="rounded-[32px] border border-[#1F2937] bg-[#111111] p-6 shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#0A0A0A] p-1 border border-[#1F2937]">
            <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-[#1F2937] data-[state=active]:text-white">
              All Platform Leads
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-md data-[state=active]:bg-[#1F2937] data-[state=active]:text-white">
              Intro Requests ({activeRequests.length})
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="rounded-md data-[state=active]:bg-[#1F2937] data-[state=active]:text-white"
            >
              Manage Access
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className="rounded-md data-[state=active]:bg-[#1F2937] data-[state=active]:text-white"
            >
              Login Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3">
                <select
                  value={filterDomain}
                  onChange={(event) => setFilterDomain(event.target.value)}
                  className="rounded-xl border border-[#27272A] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#3B82F6]"
                >
                  <option value="">Filter domain</option>
                  {domainOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                  className="rounded-xl border border-[#27272A] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#3B82F6]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Verified">Verified</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>
              <Button variant="outline" onClick={downloadCsv} className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#1D4ED8]/10">
                ⬇ Download CSV
              </Button>
            </div>

            {filterSourcerId && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-white bg-[#1F2937] px-3 py-1.5 rounded-full flex items-center gap-2">
                  Filtering by Sourcer ID: {filterSourcerId}
                  <button onClick={() => setFilterSourcerId(null)} className="text-red-400 hover:text-red-300">
                    <X className="h-4 w-4" />
                  </button>
                </span>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow className="text-[#9CA3AF]">
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-[#9CA3AF]">
                      Loading leads from database...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-[#9CA3AF]">
                      No leads found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-white font-semibold">{lead.name}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.organization}</TableCell>
                      <TableCell>{lead.domain}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          lead.verified ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
                        }`}>
                          {lead.verified ? "Verified" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell>{lead.invited ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={lead.verified}
                            onCheckedChange={() => handleVerifyToggle(lead.id, lead.verified)}
                          />
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="border-[#EF4444] text-white"
                                onClick={() => setSelectedLeadId(lead.id)}
                              >
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[32px] bg-[#111111] border border-[#1F2937] p-6 text-white">
                              <DialogHeader>
                                <DialogTitle>Delete this lead?</DialogTitle>
                                <DialogDescription className="text-[#9CA3AF]">
                                  This action will remove the lead from the list. It cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                  <Button variant="outline" className="border-[#3B82F6] text-[#3B82F6]">
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button variant="destructive" onClick={confirmDelete}>
                                    Delete
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="requests">
            <div className="grid gap-4 xl:grid-cols-3">
              {activeRequests.map((request) => (
                <Card key={request.id} className="rounded-[24px] border border-[#1F2937] bg-[#111111] shadow-sm overflow-hidden">
                  <div className="p-6 space-y-4 text-[#ffffff]">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-sm uppercase tracking-[0.24em] text-[#9CA3AF]">Requesting founder</p>
                        <p className="text-lg font-semibold">{request.founder}</p>
                        <p className="text-sm text-[#9CA3AF]">{request.email}</p>
                      </div>
                      <button 
                        onClick={() => setExpandedRequestId(expandedRequestId === request.id ? null : request.id)}
                        className="text-xs text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1 bg-[#3B82F6]/10 px-2 py-1 rounded"
                      >
                        {expandedRequestId === request.id ? (
                          <><ChevronUp className="h-3 w-3" /> Hide Timeline</>
                        ) : (
                          <><ChevronDown className="h-3 w-3" /> View Timeline</>
                        )}
                      </button>
                    </div>
                    
                    <div className="rounded-3xl bg-[#121212] p-4 border border-[#1F2937]/50">
                      <p className="text-sm text-[#9CA3AF]">Lead Profile</p>
                      <p className="mt-2 font-semibold text-white">{request.leadName}</p>
                      <p className="text-sm text-[#9CA3AF]">{request.leadRole} • {request.leadOrg}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[#9CA3AF]">
                      <span>{request.timestamp}</span>
                      <Button variant="outline" size="sm" onClick={() => markHandled(request.id)} className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#1D4ED8]/10">
                        Mark Handled
                      </Button>
                    </div>
                  </div>

                  {expandedRequestId === request.id && (
                    <div className="bg-[#0A0A0A] border-t border-[#1F2937] p-6 space-y-6">
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="p-4 rounded-lg bg-[#111111] border border-[#1F2937]">
                          <h4 className="font-semibold text-white mb-2 uppercase tracking-wide text-xs">Sourcer Details</h4>
                          {request.sourcer ? (
                            <ul className="space-y-1 text-[#9CA3AF]">
                              <li><span className="font-medium text-white">{request.sourcer.name}</span></li>
                              <li>{request.sourcer.email}</li>
                              <li>{request.sourcer.phone || 'N/A'}</li>
                              <li>{request.sourcer.year || 'N/A'} - {request.sourcer.branch || 'N/A'}</li>
                              <li>Rejections: <span className={request.sourcer.rejectionCount >= 5 ? 'text-red-500 font-bold' : ''}>{request.sourcer.rejectionCount}</span></li>
                              <li>Status: <span className={request.sourcer.isBlocked ? 'text-red-500 font-bold' : 'text-green-500'}>{request.sourcer.isBlocked ? 'Blocked' : 'Active'}</span></li>
                              <li className="pt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setFilterSourcerId(request.sourcer.id);
                                    setActiveTab("all");
                                  }}
                                  className="w-full border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 text-xs h-7 mt-2"
                                >
                                  View All Leads by This Sourcer
                                </Button>
                              </li>
                            </ul>
                          ) : (
                            <p className="text-gray-500 italic">No sourcer attached.</p>
                          )}
                        </div>

                        <div className="p-4 rounded-lg bg-[#111111] border border-[#1F2937]">
                          <h4 className="font-semibold text-white mb-2 uppercase tracking-wide text-xs">Timeline</h4>
                          <ul className="space-y-2 text-[#9CA3AF]">
                            <li>Submitted: {request.leadCreatedAt ? new Date(request.leadCreatedAt).toLocaleDateString() : 'Unknown'}</li>
                            <li>Approved by: <span className="font-medium text-white">{request.approvedByVolunteer?.name || 'N/A'}</span></li>
                            <li>Approved on: {request.approvedAt ? new Date(request.approvedAt).toLocaleDateString() : 'Unknown'}</li>
                            <li className="pt-2 border-t border-[#1F2937] mt-2">Sourcer Response: <span className="text-white font-semibold capitalize">{request.sourcerResponse || "Not contacted"}</span></li>
                            <li>Mentor Response: <span className="text-white font-semibold capitalize">{request.status === 'Declined' ? 'Declined' : request.status === 'Intro Made' ? 'Accepted' : (request.mentorNotifiedAt ? 'Pending' : 'Not contacted')}</span></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              {activeRequests.length === 0 && (
                <p className="text-sm text-[#9CA3AF] py-6 w-full text-center col-span-full">No introduction requests pending right now.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <Card className="border border-[#1F2937] bg-[#111111]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-[#1F2937] bg-[#0A0A0A]/50">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-[#6B7280]">Name</TableHead>
                      <TableHead className="text-xs font-semibold text-[#6B7280]">Email</TableHead>
                      <TableHead className="text-xs font-semibold text-[#6B7280]">Role</TableHead>
                      <TableHead className="text-xs font-semibold text-[#6B7280]">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-[#6B7280]">Rejections</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-[#6B7280]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id} className="border-b border-[#1F2937]/50 hover:bg-[#1F2937]/20">
                          <TableCell className="font-medium text-white">{u.name}</TableCell>
                          <TableCell className="text-[#D1D5DB]">{u.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u, e.target.value)}
                                className="rounded-lg border border-[#27272A] bg-[#0A0A0A] px-3 py-1.5 text-xs text-white outline-none focus:border-[#3B82F6]"
                              >
                                <option value="Student">Student</option>
                                <option value="Mentor">Mentor</option>
                                <option value="Founder">Founder</option>
                                <option value="Volunteer">Volunteer</option>
                                <option value="Admin">Admin</option>
                              </select>
                              {roleSuccessId === u.id && (
                                <span className="text-xs text-green-500">Updated</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {u.isBlocked ? (
                              <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-500/20">
                                Blocked
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                                Active
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm ${u.rejectionCount >= 5 ? 'font-bold text-red-400' : 'text-[#9CA3AF]'}`}>
                              {u.rejectionCount || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {u.id !== user?.id && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setSelectedUserId(u.id)}
                                    className="h-8 rounded-lg text-red-400 hover:bg-red-950/30 hover:text-red-300"
                                  >
                                    Kick User
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="border-[#27272A] bg-[#0A0A0A] sm:max-w-[425px]">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">Kick User</DialogTitle>
                                    <DialogDescription className="text-[#9CA3AF]">
                                      Are you sure you want to permanently delete this user?
                                      They will lose all access to the platform. This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0">
                                    <DialogClose asChild>
                                      <Button variant="outline" className="border-[#27272A] bg-transparent text-white hover:bg-[#111111] hover:text-white sm:mr-2">
                                        Cancel
                                      </Button>
                                    </DialogClose>
                                    <Button 
                                      variant="destructive"
                                      onClick={confirmKickUser}
                                      className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                      Yes, Kick User
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-[#6B7280]">
                          No users found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <Card className="border border-[#1F2937] bg-[#111111]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-[#1F2937] bg-[#0A0A0A]/50">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-[#6B7280]">User</TableHead>
                      <TableHead className="text-xs font-semibold text-[#6B7280]">Role</TableHead>
                      <TableHead className="text-xs font-semibold text-[#6B7280]">Email</TableHead>
                      <TableHead className="text-xs font-semibold text-[#6B7280]">IP Address</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-[#6B7280]">Login Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginLogs.length > 0 ? (
                      loginLogs.map((log) => (
                        <TableRow key={log.id} className="border-b border-[#1F2937]/50 hover:bg-[#1F2937]/20">
                          <TableCell className="font-medium text-white">{log.user?.name || "Unknown"}</TableCell>
                          <TableCell className="text-[#D1D5DB]">{log.user?.role || "N/A"}</TableCell>
                          <TableCell className="text-[#D1D5DB]">{log.user?.email || "N/A"}</TableCell>
                          <TableCell className="text-[#9CA3AF]">{log.ipAddress || "N/A"}</TableCell>
                          <TableCell className="text-right text-[#9CA3AF]">{new Date(log.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-[#6B7280]">
                          No login logs available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
