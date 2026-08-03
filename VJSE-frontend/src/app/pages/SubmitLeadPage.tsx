import { FormEvent, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { LoginGate } from "../components/LoginGate";
import {
  cityOptions,
  domainOptions,
  helpOptions,
  organisationTypes,
  relationshipOptions,
  professionOptions,
} from "../data/network";

interface SubmitLeadPageProps {
  user: { fullName: string; email: string } | null;
  onLogin: () => void;
  onSubmit: () => void;
}

export function SubmitLeadPage({ user, onLogin, onSubmit }: SubmitLeadPageProps) {
  const [yourName, setYourName] = useState(user?.fullName || "");

  useEffect(() => {
    if (user?.fullName) {
      setYourName(user.fullName);
    }
  }, [user]);

  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [socialMedia, setSocialMedia] = useState("");
  const [relationship, setRelationship] = useState(relationshipOptions[0]);
  const [professionSelect, setProfessionSelect] = useState(professionOptions[0]);
  const [customProfession, setCustomProfession] = useState("");
  const [organisationType, setOrganisationType] = useState(organisationTypes[0]);
  const [organisationName, setOrganisationName] = useState("");
  const [city, setCity] = useState(cityOptions[0]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedHelps, setSelectedHelps] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  const toggleDomain = (domain: string) => {
    setSelectedDomains((current) =>
      current.includes(domain) ? current.filter((item) => item !== domain) : [...current, domain],
    );
  };

  const toggleHelp = (help: string) => {
    setSelectedHelps((current) =>
      current.includes(help) ? current.filter((item) => item !== help) : [...current, help],
    );
  };

  function validateLeadEmail(emailToTest: string): boolean {
    const trimmed = emailToTest.trim().toLowerCase();
    return trimmed.endsWith("@gmail.com") || trimmed.endsWith("@vnrvjiet.in");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      return;
    }

    const trimmedEmail = leadEmail.trim().toLowerCase();
    const isStandardDomain = trimmedEmail.endsWith("@gmail.com") || trimmedEmail.endsWith("@vnrvjiet.in");
    if (!isStandardDomain) {
      const confirmed = window.confirm(
        `The email domain "${trimmedEmail.split('@')[1] || trimmedEmail}" is non-standard (not @gmail.com or @vnrvjiet.in).\n\nDo you want to proceed with this email address?`
      );
      if (!confirmed) {
        return;
      }
    }

    const finalRole = professionSelect === "Other" ? (customProfession.trim() || "Other") : professionSelect;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          socialMedia: socialMedia,
          role: finalRole,
          domain: selectedDomains[0] || "Other",
          organization: organisationName,
          skills: selectedHelps.join(", "),
          sourcerId: user.id
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit lead.");
      }

      onSubmit();
      setLeadName("");
      setLeadEmail("");
      setLeadPhone("");
      setSocialMedia("");
      setProfessionSelect(professionOptions[0]);
      setCustomProfession("");
      setOrganisationName("");
      setSelectedDomains([]);
      setSelectedHelps([]);
      setConsent(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Submit a Professional Lead</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Submit a Professional Lead</h1>
        <p className="max-w-2xl text-base leading-7 text-[#D1D5DB]">
          Know someone who can help a startup? Refer them here.
        </p>
      </div>

      <Card className="mx-auto w-full rounded-[28px] border border-[#1F2937] bg-[#111111] shadow-xl shadow-black/20">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm text-[#E5E7EB]">Your Name</Label>
                <Input
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-[#111111] text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#E5E7EB]">Your Email (Autofilled)</Label>
                <div className="relative">
                  <Input disabled value={user.email} className="pr-10 bg-[#111111] text-white cursor-not-allowed opacity-80" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                    <Lock className="size-4" />
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-[#1F2937]" />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="leadName" className="text-sm text-[#E5E7EB]">Lead's Full Name</Label>
                <Input
                  id="leadName"
                  value={leadName}
                  onChange={(event) => setLeadName(event.target.value)}
                  placeholder="Enter full name"
                  className="bg-[#111111] text-white"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="leadEmail" className="text-sm text-[#E5E7EB]">Lead's Email</Label>
                  <Input
                    id="leadEmail"
                    type="email"
                    value={leadEmail}
                    onChange={(event) => setLeadEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="bg-[#111111] text-white"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="leadPhone" className="text-sm text-[#E5E7EB]">Lead's Phone Number</Label>
                  <Input
                    id="leadPhone"
                    type="tel"
                    value={leadPhone}
                    onChange={(event) => setLeadPhone(event.target.value)}
                    placeholder="+91 9876543210"
                    className="bg-[#111111] text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="socialMedia" className="text-sm text-[#E5E7EB]">Social Media Handle / Personal Website / LinkedIn Profile</Label>
                <Input
                  id="socialMedia"
                  type="url"
                  value={socialMedia}
                  onChange={(event) => setSocialMedia(event.target.value)}
                  placeholder="https://linkedin.com/in/username or https://example.com"
                  className="bg-[#111111] text-white"
                  required
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="relationship" className="text-sm text-[#E5E7EB]">Your Relationship</Label>
                  <select
                    id="relationship"
                    value={relationship}
                    onChange={(event) => setRelationship(event.target.value)}
                    className="w-full rounded-md border border-[#27272A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#3B82F6]"
                  >
                    {relationshipOptions.map((option) => (
                      <option key={option} value={option} className="bg-[#111111] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="professionSelect" className="text-sm text-[#E5E7EB]">Their Profession / Domain</Label>
                  <select
                    id="professionSelect"
                    value={professionSelect}
                    onChange={(event) => setProfessionSelect(event.target.value)}
                    className="w-full rounded-md border border-[#27272A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#3B82F6]"
                  >
                    {professionOptions.map((option) => (
                      <option key={option} value={option} className="bg-[#111111] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {professionSelect === "Other" && (
                <div className="grid gap-2">
                  <Label htmlFor="customProfession" className="text-sm text-[#E5E7EB]">Specify Other Profession</Label>
                  <Input
                    id="customProfession"
                    value={customProfession}
                    onChange={(event) => setCustomProfession(event.target.value)}
                    placeholder="Enter specific profession"
                    className="bg-[#111111] text-white"
                    required
                  />
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="organisationType" className="text-sm text-[#E5E7EB]">Organisation Type</Label>
                  <select
                    id="organisationType"
                    value={organisationType}
                    onChange={(event) => setOrganisationType(event.target.value)}
                    className="w-full rounded-md border border-[#27272A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#3B82F6]"
                  >
                    {organisationTypes.map((option) => (
                      <option key={option} value={option} className="bg-[#111111] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="organisationName" className="text-sm text-[#E5E7EB]">Organisation Name</Label>
                  <Input
                    id="organisationName"
                    value={organisationName}
                    onChange={(event) => setOrganisationName(event.target.value)}
                    placeholder="Organisation name"
                    className="bg-[#111111] text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="city" className="text-sm text-[#E5E7EB]">City / Location</Label>
                  <select
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="w-full rounded-md border border-[#27272A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#3B82F6]"
                  >
                    {cityOptions.map((option) => (
                      <option key={option} value={option} className="bg-[#111111] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm text-[#E5E7EB]">Domain</Label>
                <div className="flex flex-wrap gap-2">
                  {domainOptions.map((domain) => {
                    const active = selectedDomains.includes(domain);
                    return (
                      <button
                        type="button"
                        key={domain}
                        onClick={() => toggleDomain(domain)}
                        className={`rounded-full border px-3 py-2 text-sm transition ${
                          active
                            ? "border-[#3B82F6] bg-[#1D4ED8] text-white"
                            : "border-[#27272A] bg-[#111111] text-[#D1D5DB] hover:border-[#3B82F6]"
                        }`}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm text-[#E5E7EB]">How can they help?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {helpOptions.map((help) => {
                    const active = selectedHelps.includes(help);
                    return (
                      <button
                        type="button"
                        key={help}
                        onClick={() => toggleHelp(help)}
                        className={`rounded-full border px-3 py-2 text-sm text-left transition ${
                          active
                            ? "border-[#3B82F6] bg-[#1D4ED8] text-white"
                            : "border-[#27272A] bg-[#111111] text-[#D1D5DB] hover:border-[#3B82F6]"
                        }`}
                      >
                        {help}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1F2937] bg-[#111111] p-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-[#E5E7EB]">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="h-4 w-4 rounded border border-[#27272A] bg-[#111111] text-[#3B82F6] focus:ring-[#3B82F6]"
                    required
                  />
                  <span>I confirm the information provided above is true and accurate</span>
                </label>
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={loading || !consent}
                  className="w-full rounded-xl bg-[#3B82F6] px-6 py-3 text-white hover:bg-[#1D4ED8]"
                >
                  {loading ? "Submitting..." : "Submit Lead →"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
