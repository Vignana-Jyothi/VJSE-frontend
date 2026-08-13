import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { LoginGate } from "../components/LoginGate";
import { domainOptions } from "../data/network";

interface AdminPageProps {
  user: { id: number; fullName: string; email: string; role: string } | null;
  onLogin: () => void;
  onUserRefresh?: (updatedUser: { id: number; fullName: string; email: string; role: string }) => void;
}

export function AdminPage({ user, onLogin, onUserRefresh }: AdminPageProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [introRequests, setIntroRequests] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [filterDomain, setFilterDomain] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [filterBlacklist, setFilterBlacklist] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleSuccessId, setRoleSuccessId] = useState<number | null>(null);
  const [viewLeadsUserId, setViewLeadsUserId] = useState<number | null>(null);

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
        handled: c.status !== "Pending"
      }));
      setIntroRequests(mappedRequests);

      // 3. Fetch all platform users
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData);
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

  async function handleBlacklistToggle(userId: number, currentBlocked: boolean) {
    try {
      const res = await fetch(`/api/users/${userId}/blacklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !currentBlocked }),
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        setError("Failed to update user blacklist status.");
      }
    } catch (err) {
      console.error(err);
      setError("Error toggling blacklist status.");
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
      return domainMatch && statusMatch;
    });
  }, [filterDomain, filterStatus, leads]);

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

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Total Leads</p>
          <p className="mt-4 text-3xl font-semibold text-[#3B82F6]">{leads.length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Verified</p>
          <p className="mt-4 text-3xl font-semibold text-[#22C55E]">{leads.filter((lead) => lead.verified).length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Pending</p>
          <p className="mt-4 text-3xl font-semibold text-[#F59E0B]">{leads.filter((lead) => !lead.verified).length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Introduction Requests</p>
          <p className="mt-4 text-3xl font-semibold text-[#3B82F6]">{activeRequests.length}</p>
        </Card>
      </div>

      <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-6 shadow-xl">
        <Tabs defaultValue="all">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all">All Leads</TabsTrigger>
              <TabsTrigger value="requests">Introduction Requests</TabsTrigger>
              <TabsTrigger value="access">Manage Access</TabsTrigger>
            </TabsList>
          </div>

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
                <Card key={request.id} className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
                  <div className="space-y-4 text-[#ffffff]">
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-[0.24em] text-[#9CA3AF]">Requesting founder</p>
                      <p className="text-lg font-semibold">{request.founder}</p>
                      <p className="text-sm text-[#9CA3AF]">{request.email}</p>
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
                </Card>
              ))}
              {activeRequests.length === 0 && (
                <p className="text-sm text-[#9CA3AF] py-6 w-full text-center">No introduction requests pending right now.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            {/* --- Flagged Sourcers Section --- */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white uppercase tracking-widest">🚩 Flagged Sourcers</h2>
                <span className="text-xs text-[#9CA3AF] font-medium">(5+ rejections from leads)</span>
              </div>
              {flaggedSourcers.length === 0 ? (
                <div className="rounded-xl border border-green-800/40 bg-green-950/20 px-5 py-4 text-sm text-green-400 flex items-center gap-2">
                  <span>✅</span>
                  <span>All sourcers are within acceptable limits.</span>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {flaggedSourcers.map((u: any) => (
                    <div
                      key={u.id}
                      className="rounded-[20px] border border-red-700/60 bg-red-950/20 p-5 space-y-3 shadow-lg shadow-red-950/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white text-sm leading-tight">{u.name}</p>
                          <p className="text-xs text-[#9CA3AF] break-all">{u.email}</p>
                        </div>
                        <span className="shrink-0 inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                          {u.rejectionCount} rejections
                        </span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">
                        Leads submitted:{" "}
                        <span className="font-semibold text-white">{getSourcerLeadCount(u.id)}</span>
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewLeadsUserId(viewLeadsUserId === u.id ? null : u.id)}
                          className="text-xs border-[#3B82F6] text-[#3B82F6] hover:bg-[#1D4ED8]/10 rounded-lg flex-1"
                        >
                          {viewLeadsUserId === u.id ? "Hide Leads" : "View Leads"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleBlockSourcer(u.id)}
                          className="text-xs bg-red-700 hover:bg-red-800 text-white rounded-lg flex-1 font-semibold"
                        >
                          Block Sourcer
                        </Button>
                      </div>
                      {/* Inline lead list for this sourcer */}
                      {viewLeadsUserId === u.id && (
                        <div className="border-t border-red-800/30 pt-3 space-y-2">
                          {leads.filter((l: any) => l.sourcerId === u.id).length === 0 ? (
                            <p className="text-xs text-[#9CA3AF]">No leads found for this sourcer.</p>
                          ) : (
                            leads.filter((l: any) => l.sourcerId === u.id).map((l: any) => (
                              <div key={l.id} className="rounded-lg bg-[#0A0A0A] border border-[#1F2937] px-3 py-2">
                                <p className="text-xs font-semibold text-white">{l.name}</p>
                                <p className="text-[10px] text-[#9CA3AF]">{l.organization} · {l.domain}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[#1F2937]" />

            {/* --- Full User List --- */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-[#27272A] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#3B82F6]"
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="rounded-xl border border-[#27272A] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#3B82F6]"
                >
                  <option value="All">All Roles</option>
                  <option value="Student">Student</option>
                  <option value="Mentor">Mentor</option>
                  <option value="Founder">Founder</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="Admin">Admin</option>
                </select>

                <select
                  value={filterBlacklist}
                  onChange={(e) => setFilterBlacklist(e.target.value)}
                  className="rounded-xl border border-[#27272A] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#3B82F6]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>

                <span className="text-xs text-[#9CA3AF]">
                  Total: <span className="font-bold text-white">{filteredUsers.length}</span>
                </span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="text-[#9CA3AF]">
                  <TableHead>User Name</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Blacklist Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-[#9CA3AF]">
                      No user accounts found matching "{userSearch}".
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} className="border-b border-[#1F2937]/50">
                      <TableCell className="text-white font-semibold">{u.name}</TableCell>
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
                            <span className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5 animate-pulse">
                              ✓ Updated!
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.isBlocked 
                            ? "bg-red-500/15 text-red-400 border border-red-500/20" 
                            : "bg-green-500/15 text-green-400 border border-green-500/20"
                        }`}>
                          {u.isBlocked ? "Blacklisted" : "Active"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBlacklistToggle(u.id, u.isBlocked)}
                            className={`text-xs font-semibold rounded-lg ${
                              u.isBlocked
                                ? "border-green-600 text-green-400 hover:bg-green-950/30"
                                : "border-yellow-600 text-yellow-400 hover:bg-yellow-950/30"
                            }`}
                          >
                            {u.isBlocked ? "Un-Blacklist" : "Blacklist"}
                          </Button>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs"
                                onClick={() => setSelectedUserId(u.id)}
                              >
                                Kick / Remove
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[32px] bg-[#111111] border border-[#1F2937] p-6 text-white">
                              <DialogHeader>
                                <DialogTitle>Kick user account?</DialogTitle>
                                <DialogDescription className="text-[#9CA3AF]">
                                  Are you sure you want to remove <span className="text-white font-semibold">{u.name} ({u.email})</span> from the platform?
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="gap-2 mt-4">
                                <DialogClose asChild>
                                  <Button variant="outline" className="border-[#3B82F6] text-[#3B82F6]">
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button variant="destructive" onClick={confirmKickUser}>
                                    Kick Account
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
