import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, LogIn, Eye, EyeOff, ChevronDown, Search, X, Check } from "lucide-react";
import { LoginResponse, User } from "../types.ts";

interface Props {
  onLogin: (token: string, user: User) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch team list for the dropdown
  useEffect(() => {
    fetch("/api/teams")
      .then(r => r.json())
      .then(d => { if (d.success) setAvailableTeams(d.teams); })
      .catch(() => {})
      .finally(() => setTeamsLoading(false));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [dropdownOpen]);

  const toggleTeam = (team: string) => {
    setSelected(prev =>
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
    setError(null);
  };

  const removeTeam = (team: string) => {
    setSelected(prev => prev.filter(t => t !== team));
  };

  const filteredTeams = availableTeams.filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) {
      setError("Please select at least one team.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: selected, password }),
      });
      const data: LoginResponse = await res.json();
      if (data.success && data.token && data.teams && data.role) {
        onLogin(data.token, { teams: data.teams, role: data.role });
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 bg-blue-500 rounded-sm flex items-center justify-center font-bold text-white text-sm">
            BD
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-tight leading-tight">Budget Dashboard</h1>
            <p className="text-slate-500 text-[10px] font-mono tracking-widest leading-none mt-0.5">VER 2.4.0</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-slate-100 font-bold text-xl mb-1 tracking-tight">Sign in</h2>
          <p className="text-slate-400 text-xs mb-7">
            Select your team(s) and enter the shared password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Team multi-select dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Team / Department
              </label>

              <div className="relative" ref={dropdownRef}>
                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(v => !v)}
                  className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-sm flex items-center justify-between transition-all ${
                    dropdownOpen
                      ? "border-blue-500 ring-2 ring-blue-500/30"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                >
                  <span className={selected.length === 0 ? "text-slate-600" : "text-slate-200"}>
                    {teamsLoading
                      ? "Loading teams..."
                      : selected.length === 0
                        ? "Select team(s)..."
                        : selected.length === 1
                          ? selected[0]
                          : `${selected.length} teams selected`}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown panel */}
                {dropdownOpen && (
                  <div className="absolute z-50 top-full mt-1.5 w-full bg-slate-900 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
                    {/* Search */}
                    <div className="p-2.5 border-b border-slate-700/80">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <input
                          ref={searchRef}
                          type="text"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search teams..."
                          className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                        />
                        {search && (
                          <button type="button" onClick={() => setSearch("")}>
                            <X className="w-3 h-3 text-slate-500" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Team list */}
                    <div className="max-h-52 overflow-y-auto">
                      {filteredTeams.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No teams found</p>
                      ) : (
                        filteredTeams.map(team => {
                          const isSelected = selected.includes(team);
                          return (
                            <button
                              key={team}
                              type="button"
                              onClick={() => toggleTeam(team)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-sm ${
                                isSelected
                                  ? "bg-blue-600/15 text-blue-300"
                                  : "text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              {/* Checkbox */}
                              <span
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? "bg-blue-600 border-blue-600"
                                    : "border-slate-600"
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </span>
                              {team}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Done button */}
                    {selected.length > 0 && (
                      <div className="p-2 border-t border-slate-700/80">
                        <button
                          type="button"
                          onClick={() => { setDropdownOpen(false); setSearch(""); }}
                          className="w-full py-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Done — {selected.length} selected
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected badges */}
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {selected.map(t => (
                    <span
                      key={t}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/20 text-blue-300 text-[11px] font-medium rounded-full border border-blue-500/30"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTeam(t)}
                        className="text-blue-400 hover:text-blue-200 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter team password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || selected.length === 0}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-6">
          Access restricted to authorized team members only.
        </p>
      </div>
    </div>
  );
}
