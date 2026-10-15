import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';
import {
  Bot, Briefcase, FileText, MapPin, LogOut, Search,
  SlidersHorizontal, ChevronLeft, ChevronRight, UploadCloud,
  Bookmark, BookmarkCheck, ExternalLink, Loader2, Star, CheckCircle2,
  BarChart3, Download, Check, ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────
interface JobCard {
  job_hash: string;
  title: string;
  company: string;
  description: string | null;
  salary: string | null;
  location: string | null;
  posted_date: string | null;
  url: string;
  source: string | null;
  relevance_score: number | null;
  score_note?: string | null;
  matched_keywords?: string[];
  missing_keywords?: string[];
  areas_to_improve: string[];
  is_saved: boolean;
  is_visited: boolean;
}

type ActiveView = 'search' | 'profile' | 'saved' | 'visited' | 'analytics';

const SOURCES = ['LinkedIn', 'Indeed', 'Naukri', 'Workable', 'Greenhouse', 'Wellfound', 'Lever'] as const;

// ── Source colour map ─────────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  LinkedIn: 'bg-sky-50 text-sky-700 border-sky-200',
  Indeed: 'bg-blue-50 text-blue-800 border-blue-300',
  Naukri: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Workable: 'bg-blue-50 text-blue-700 border-blue-200',
  Greenhouse: 'bg-green-50 text-green-700 border-green-200',
  Wellfound: 'bg-purple-50 text-purple-700 border-purple-200',
  Lever: 'bg-orange-50 text-orange-700 border-orange-200',
};

// ── Score badge colour ────────────────────────────────────────────────────────
function scoreBadge(score: number | null) {
  if (score === null) return 'bg-gray-100 text-gray-500';
  if (score >= 70) return 'bg-green-100 text-green-700 border border-green-200';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  return 'bg-red-50 text-red-700 border border-red-200';
}

const JOBS_PER_PAGE = 20;

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('search');

  // ── Search & Filter state ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtering & Sorting
  const [sortBy, setSortBy] = useState<'match' | 'newest' | 'company'>('match');
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [hideUnscorable, setHideUnscorable] = useState(false);
  const [minScore, setMinScore] = useState<number | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // ── Profile / saved / visited state ──────────────────────────────────────
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [savedJobs, setSavedJobs] = useState<JobCard[]>([]);
  const [visitedJobs, setVisitedJobs] = useState<JobCard[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Pre-load profile on mount to sync user location automatically
  useEffect(() => {
    apiClient.get('/profile/me')
      .then((res) => {
        const p = res.data.profile;
        if (p) {
          setProfileData(p);
          if (p.location && typeof p.location === 'string') {
            setLocationQuery(p.location);
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── Source toggle ─────────────────────────────────────────────────────────
  const toggleSource = (src: string) => {
    setSelectedSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src],
    );
  };
  const selectAll = () =>
    setSelectedSources(selectedSources.length === SOURCES.length ? [] : [...SOURCES]);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1);
    try {
      const res = await apiClient.get('/jobs/search', {
        params: {
          query: searchQuery.trim(),
          location: locationQuery.trim(),
          sources: selectedSources.join(','),
        },
      });
      setJobs(res.data.jobs || []);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (detail === 'INVALID_JOB_QUERY') {
        toast.error('Please enter a job-related role (e.g. "Frontend Engineer", "Data Scientist")');
      } else {
        toast.error('Search failed. Please try again.');
      }
      setJobs([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, locationQuery, selectedSources]);

  // ── Save job ──────────────────────────────────────────────────────────────
  const handleSave = async (job: JobCard) => {
    try {
      if (job.is_saved) {
        await apiClient.delete(`/jobs/save/${job.job_hash}`);
        setJobs((prev) => prev.map((j) => j.job_hash === job.job_hash ? { ...j, is_saved: false } : j));
        toast.success('Removed from saved jobs');
      } else {
        await apiClient.post('/jobs/save', job);
        setJobs((prev) => prev.map((j) => j.job_hash === job.job_hash ? { ...j, is_saved: true } : j));
        toast.success('Job saved!');
      }
    } catch {
      toast.error('Failed to update saved status');
    }
  };

  // ── Apply / visit ─────────────────────────────────────────────────────────
  const handleApply = async (job: JobCard) => {
    // Mark as visited
    if (!job.is_visited) {
      try {
        await apiClient.post('/jobs/visit', job);
        setJobs((prev) => prev.map((j) => j.job_hash === job.job_hash ? { ...j, is_visited: true } : j));
      } catch { /* silently ignore */ }
    }
    window.open(job.url, '_blank', 'noopener,noreferrer');
  };

  // ── Load profile ──────────────────────────────────────────────────────────
  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await apiClient.get('/profile/me');
      setProfileData(res.data.profile);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // ── Upload CV ─────────────────────────────────────────────────────────────
  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCV(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await apiClient.post('/profile/upload-cv', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const p = res.data.profile;
      setProfileData(p);
      if (p?.location && typeof p.location === 'string') {
        setLocationQuery(p.location);
      }
      toast.success('CV uploaded and profile extracted!');
    } catch {
      toast.error('CV upload failed. Ensure it is a valid PDF.');
    } finally {
      setIsUploadingCV(false);
      e.target.value = '';
    }
  };

  // ── Load saved / visited ──────────────────────────────────────────────────
  const loadSaved = async () => {
    setIsLoadingList(true);
    try {
      const res = await apiClient.get('/jobs/saved');
      setSavedJobs(res.data.jobs || []);
    } catch { toast.error('Failed to load saved jobs'); }
    finally { setIsLoadingList(false); }
  };

  const loadVisited = async () => {
    setIsLoadingList(true);
    try {
      const res = await apiClient.get('/jobs/visited');
      setVisitedJobs(res.data.jobs || []);
    } catch { toast.error('Failed to load visited jobs'); }
    finally { setIsLoadingList(false); }
  };

  // ── Derived filtered & sorted jobs ───────────────────────────────────────
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Filter by single skill tag
    if (skillFilter) {
      result = result.filter((j) => {
        const text = `${j.title} ${j.description || ''} ${(j.matched_keywords || []).join(' ')} ${(j.missing_keywords || []).join(' ')}`.toLowerCase();
        return text.includes(skillFilter.toLowerCase());
      });
    }

    // Filter by disclosed salary
    if (salaryOnly) {
      result = result.filter((j) => Boolean(j.salary));
    }

    // Filter out unscorable jobs
    if (hideUnscorable) {
      result = result.filter((j) => !j.score_note);
    }

    // Filter by minimum score
    if (minScore !== 'all') {
      result = result.filter((j) => j.relevance_score !== null && j.relevance_score >= minScore);
    }

    // Sort jobs
    if (sortBy === 'match') {
      result.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
    } else if (sortBy === 'company') {
      result.sort((a, b) => a.company.localeCompare(b.company));
    } else if (sortBy === 'newest') {
      // Keep original order or age
      result.sort((a, b) => (a.posted_date ? 0 : 1) - (b.posted_date ? 0 : 1));
    }

    return result;
  }, [jobs, skillFilter, sortBy, salaryOnly, hideUnscorable, minScore]);

  // ── Market Intelligence Analytics Aggregation ─────────────────────────────
  const analyticsData = useMemo(() => {
    if (jobs.length === 0) return { skillCounts: [], avgScore: 0, salaryJobsCount: 0 };

    const skillMap: Record<string, number> = {};
    let totalScore = 0;
    let scoredCount = 0;
    let salaryCount = 0;

    for (const job of jobs) {
      if (job.relevance_score !== null && !job.score_note) {
        totalScore += job.relevance_score;
        scoredCount += 1;
      }
      if (job.salary) {
        salaryCount += 1;
      }

      // Aggregate matched and missing skills (only from scorable jobs with descriptions)
      if (!job.score_note) {
        const allJobSkills = new Set([...(job.matched_keywords || []), ...(job.missing_keywords || [])]);
        allJobSkills.forEach((s) => {
          skillMap[s] = (skillMap[s] || 0) + 1;
        });
      }
    }

    const scorableJobsCount = scoredCount || 1;

    const skillCounts = Object.entries(skillMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.min(100, Math.round((count / scorableJobsCount) * 100)),
      }))
      .sort((a, b) => b.count - a.count);

    const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

    return {
      skillCounts,
      avgScore,
      salaryJobsCount: salaryCount,
    };
  }, [jobs]);

  // ── Export Handlers ───────────────────────────────────────────────────────
  const exportToCSV = () => {
    if (jobs.length === 0) {
      toast.error('No jobs to export');
      return;
    }
    const headers = ['Title', 'Company', 'Source', 'Location', 'Salary', 'Match Score', 'Matched Skills', 'Missing Skills', 'URL'];
    const rows = jobs.map((j) => [
      `"${(j.title || '').replace(/"/g, '""')}"`,
      `"${(j.company || '').replace(/"/g, '""')}"`,
      `"${j.source || ''}"`,
      `"${j.location || ''}"`,
      `"${j.salary || ''}"`,
      j.relevance_score !== null ? `${j.relevance_score}%` : 'N/A',
      `"${(j.matched_keywords || []).join(', ')}"`,
      `"${(j.missing_keywords || []).join(', ')}"`,
      `"${j.url || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `job_hunter_${searchQuery || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported jobs to CSV!');
  };

  const exportToJSON = () => {
    if (jobs.length === 0) {
      toast.error('No jobs to export');
      return;
    }
    const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `job_hunter_${searchQuery || 'export'}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported jobs to JSON!');
  };

  const switchView = (view: ActiveView) => {
    setActiveView(view);
    if (view === 'profile') loadProfile();
    if (view === 'saved') loadSaved();
    if (view === 'visited') loadVisited();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-white overflow-hidden text-foreground">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`bg-transparent border-r flex flex-col transition-all duration-300 relative z-20 shadow-[0px_0px_5px_gray] ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-6 bg-white border rounded-full p-1 shadow hover:bg-gray-100 z-30"
        >
          {isSidebarCollapsed
            ? <ChevronRight size={14} className="text-black" />
            : <ChevronLeft size={14} className="text-black" />}
        </button>

        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b h-20">
          <Bot className="h-8 w-8 text-green-600 flex-shrink-0" />
          {!isSidebarCollapsed && (
            <span className="font-bold text-xl tracking-tight text-black">Tech Job Hunters</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {[
            { view: 'search' as ActiveView, icon: <Search className="h-5 w-5 flex-shrink-0" />, label: 'Discover Jobs' },
            { view: 'analytics' as ActiveView, icon: <BarChart3 className="h-5 w-5 flex-shrink-0 text-indigo-600" />, label: 'Market Analytics' },
            { view: 'profile' as ActiveView, icon: <FileText className="h-5 w-5 flex-shrink-0" />, label: 'Resume Profile' },
            { view: 'saved' as ActiveView, icon: <Briefcase className="h-5 w-5 flex-shrink-0" />, label: 'Saved Jobs' },
            { view: 'visited' as ActiveView, icon: <MapPin className="h-5 w-5 flex-shrink-0" />, label: 'Visited Jobs' },
          ].map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => switchView(view)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${activeView === view
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              {icon}
              {!isSidebarCollapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t flex flex-col gap-1">
          <button
            onClick={logout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b px-8 py-5 flex justify-between items-center z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-black">
              {activeView === 'search' && 'Discover Jobs'}
              {activeView === 'analytics' && 'Market Intelligence & Skill Analytics'}
              {activeView === 'profile' && 'Resume Profile'}
              {activeView === 'saved' && 'Saved Jobs'}
              {activeView === 'visited' && 'Visited Jobs'}
            </h1>
            {activeView === 'search' && jobs.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                {jobs.length} jobs fetched
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Export buttons when jobs are loaded */}
            {jobs.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-green-700"
                  title="Export results to CSV spreadsheet"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToJSON}
                  className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-blue-700"
                  title="Export results to JSON"
                >
                  <Download className="h-3.5 w-3.5" /> JSON
                </Button>
              </div>
            )}
            <div className="text-sm text-gray-500 border-l pl-3">
              Welcome back, <span className="font-semibold text-gray-900">{user?.first_name}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">

          {/* ── SEARCH VIEW ────────────────────────────────────────────── */}
          {activeView === 'search' && (
            <div className="p-8 flex flex-col gap-6">

              {/* Search bar row */}
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    placeholder="Search roles (e.g. Frontend React Engineer)"
                    className="pl-10 pr-4 h-12 w-full rounded-lg border border-gray-200 shadow-sm bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                <div className="relative w-56">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    placeholder="Location or remote"
                    className="pl-10 pr-4 h-12 w-full rounded-lg border border-gray-200 shadow-sm bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-12 px-4 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2 text-black ${showFilters ? 'bg-gray-100 font-bold' : 'bg-white hover:bg-gray-50'}`}
                >
                  <SlidersHorizontal className="h-4 w-4 text-black" />
                  <span className="text-xs font-semibold text-black">Controls</span>
                  {((sortBy !== 'match' ? 1 : 0) + (salaryOnly ? 1 : 0) + (hideUnscorable ? 1 : 0) + (minScore !== 'all' ? 1 : 0) + (skillFilter ? 1 : 0)) > 0 && (
                    <span className="h-4 px-1.5 rounded-full bg-green-600 text-[10px] font-bold text-white flex items-center justify-center">
                      {(sortBy !== 'match' ? 1 : 0) + (salaryOnly ? 1 : 0) + (hideUnscorable ? 1 : 0) + (minScore !== 'all' ? 1 : 0) + (skillFilter ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </div>

              {/* Advanced Sort & Controls Bar */}
              {showFilters && (
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/90 flex flex-col gap-3 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Sort group */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-black flex items-center gap-1.5">
                        <ArrowUpDown className="h-3.5 w-3.5 text-black" /> Sort:
                      </span>
                      {(['match', 'newest', 'company'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSortBy(s)}
                          className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors ${
                            sortBy === s
                              ? 'bg-green-600 text-white shadow-sm'
                              : 'bg-white border border-gray-200 text-black hover:bg-gray-100'
                          }`}
                        >
                          {s === 'match' ? 'Mathematical % Match' : s === 'newest' ? 'Newest' : 'Company (A–Z)'}
                        </button>
                      ))}
                    </div>

                    {/* Quick Filter Toggles */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-black">Filters:</span>

                      <button
                        onClick={() => setSalaryOnly(!salaryOnly)}
                        className={`px-3 py-1 text-xs rounded-md font-semibold border transition-colors ${
                          salaryOnly
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white border-gray-200 text-black hover:bg-gray-100'
                        }`}
                      >
                        Disclosed Pay Only
                      </button>

                      <button
                        onClick={() => setHideUnscorable(!hideUnscorable)}
                        className={`px-3 py-1 text-xs rounded-md font-semibold border transition-colors ${
                          hideUnscorable
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white border-gray-200 text-black hover:bg-gray-100'
                        }`}
                      >
                        With Description Only
                      </button>

                      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-0.5">
                        <span className="text-xs font-medium text-black">Min Match:</span>
                        <select
                          value={minScore}
                          onChange={(e) => setMinScore(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                          className="text-xs font-semibold bg-transparent text-black outline-none cursor-pointer"
                        >
                          <option value="all">All</option>
                          <option value="40">≥ 40%</option>
                          <option value="60">≥ 60%</option>
                          <option value="80">≥ 80%</option>
                        </select>
                      </div>

                      {((sortBy !== 'match' ? 1 : 0) + (salaryOnly ? 1 : 0) + (hideUnscorable ? 1 : 0) + (minScore !== 'all' ? 1 : 0) + (skillFilter ? 1 : 0)) > 0 && (
                        <button
                          onClick={() => {
                            setSortBy('match');
                            setSalaryOnly(false);
                            setHideUnscorable(false);
                            setMinScore('all');
                            setSkillFilter(null);
                          }}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 underline ml-2"
                        >
                          Reset All
                        </button>
                      )}
                    </div>
                  </div>

                  {skillFilter && (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-200 self-start">
                      <span>Filtered by skill: <strong>{skillFilter}</strong></span>
                      <button onClick={() => setSkillFilter(null)} className="hover:text-blue-900 font-bold ml-1">✕</button>
                    </div>
                  )}
                </div>
              )}

              {/* Source filter buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-500">Sources:</span>
                {SOURCES.map((src) => {
                  const active = selectedSources.includes(src);
                  return (
                    <button
                      key={src}
                      onClick={() => toggleSource(src)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        active
                          ? SOURCE_COLORS[src]
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {active && <span className="mr-1">✓</span>}{src}
                    </button>
                  );
                })}
                <button
                  onClick={selectAll}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    selectedSources.length === SOURCES.length
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {selectedSources.length === SOURCES.length ? '✓ All' : 'All'}
                </button>
              </div>

              {/* Jobs grid */}
              {isSearching && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <span className="ml-3 text-gray-500 font-medium">Extracting keywords & computing match percentages…</span>
                </div>
              )}

              {!isSearching && hasSearched && filteredJobs.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  {skillFilter
                    ? `No jobs found requiring '${skillFilter}'. Try clearing the skill filter.`
                    : 'No jobs found. Try different keywords or sources.'}
                </div>
              )}

              {!isSearching && filteredJobs.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>
                      Showing {((currentPage - 1) * JOBS_PER_PAGE) + 1}–{Math.min(currentPage * JOBS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} jobs
                    </span>
                    <span>Page {currentPage} of {Math.ceil(filteredJobs.length / JOBS_PER_PAGE)}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE).map((job) => (
                      <JobCardComponent
                        key={job.job_hash}
                        job={job}
                        onSave={handleSave}
                        onApply={handleApply}
                        onFilterBySkill={(skill) => setSkillFilter(skill)}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {Math.ceil(filteredJobs.length / JOBS_PER_PAGE) > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-8 pb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => {
                          setCurrentPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>

                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: Math.ceil(filteredJobs.length / JOBS_PER_PAGE) }).map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => {
                              setCurrentPage(i + 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                              currentPage === i + 1
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === Math.ceil(filteredJobs.length / JOBS_PER_PAGE)}
                        onClick={() => {
                          setCurrentPage((p) => Math.min(Math.ceil(filteredJobs.length / JOBS_PER_PAGE), p + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex items-center gap-1"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}

              {!hasSearched && (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                  <Search className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg">Search a role to discover jobs across platforms</p>
                </div>
              )}
            </div>
          )}

          {/* ── MARKET ANALYTICS VIEW ────────────────────────────────────── */}
          {activeView === 'analytics' && (
            <div className="p-8 max-w-6xl mx-auto space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Search Market Intelligence</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Aggregated skill demand, hiring volume, and tech stack distribution for "{searchQuery || 'current role'}"
                  {locationQuery ? ` in ${locationQuery}` : ''}.
                </p>
              </div>

              {jobs.length === 0 ? (
                <div className="p-12 text-center border rounded-2xl bg-gray-50 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="font-semibold text-lg text-gray-700">No Search Data Yet</h3>
                  <p className="text-sm text-gray-500 mt-1">Perform a job search in "Discover Jobs" to visualize real-time skill demand and hiring company distributions.</p>
                  <Button onClick={() => switchView('search')} className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                    Go to Search
                  </Button>
                </div>
              ) : (
                <>
                  {/* Top Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-5 rounded-xl border bg-white shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Positions</span>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{jobs.length}</p>
                      <span className="text-xs text-gray-400">Across {selectedSources.length || SOURCES.length} platforms</span>
                    </div>

                    <div className="p-5 rounded-xl border bg-white shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Profile Match</span>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{analyticsData.avgScore}%</p>
                      <span className="text-xs text-gray-400">Exact formula keyword match</span>
                    </div>

                    <div className="p-5 rounded-xl border bg-white shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Skills Tracked</span>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">{analyticsData.skillCounts.length}</p>
                      <span className="text-xs text-gray-400">Extracted from listings</span>
                    </div>

                    <div className="p-5 rounded-xl border bg-white shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transparent Salary</span>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{analyticsData.salaryJobsCount}</p>
                      <span className="text-xs text-gray-400">Listings disclosing pay</span>
                    </div>
                  </div>

                  {/* Skill Frequency Distribution Bars */}
                  <div className="p-6 rounded-2xl border bg-white shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">Most Demanded Skills & Technologies</h3>
                        <p className="text-xs text-gray-500">Percentage of active postings requiring each skill</p>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">Ranked by frequency</span>
                    </div>

                    <div className="space-y-3.5">
                      {analyticsData.skillCounts.slice(0, 12).map((item) => (
                        <div key={item.name} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-medium text-gray-700">
                            <span className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{item.name}</span>
                              <span className="text-gray-400 font-normal">({item.count} jobs)</span>
                            </span>
                            <span className="font-bold text-emerald-700">{item.percentage}%</span>
                          </div>
                          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </>
              )}
            </div>
          )}

          {/* ── PROFILE VIEW ───────────────────────────────────────────── */}
          {activeView === 'profile' && (
            <div className="p-8 max-w-4xl">
              <div className="mb-6 flex items-center gap-4">
                <label className="cursor-pointer">
                  <input type="file" accept=".pdf" className="hidden" onChange={handleCVUpload} />
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors">
                    {isUploadingCV
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <UploadCloud className="h-4 w-4" />}
                    {isUploadingCV ? 'Extracting…' : 'Upload CV (PDF)'}
                  </div>
                </label>
                {profileData && <span className="text-sm text-green-600 font-medium">✓ Profile loaded</span>}
              </div>

              {isLoadingProfile && (
                <div className="flex items-center gap-2 text-gray-500 py-10">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading profile…
                </div>
              )}

              {!isLoadingProfile && !profileData && (
                <div className="text-gray-400 py-10 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No profile yet. Upload your CV to get started.</p>
                </div>
              )}

              {profileData && <ProfileView profile={profileData} />}
            </div>
          )}

          {/* ── SAVED / VISITED VIEWS ───────────────────────────────────── */}
          {(activeView === 'saved' || activeView === 'visited') && (
            <div className="p-8">
              {isLoadingList && (
                <div className="flex items-center gap-2 text-gray-500 py-10">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
              )}
              {!isLoadingList && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {(activeView === 'saved' ? savedJobs : visitedJobs).map((job) => (
                    <JobCardComponent
                      key={job.job_hash}
                      job={job}
                      onSave={handleSave}
                      onApply={handleApply}
                      readonly
                    />
                  ))}
                  {(activeView === 'saved' ? savedJobs : visitedJobs).length === 0 && (
                    <div className="col-span-3 text-center py-20 text-gray-400">
                      {activeView === 'saved' ? 'No saved jobs yet.' : 'No visited jobs yet.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ── Job Card Component ────────────────────────────────────────────────────────
function JobCardComponent({
  job,
  onSave,
  onApply,
  onFilterBySkill,
  readonly = false,
}: {
  job: JobCard;
  onSave: (job: JobCard) => void;
  onApply: (job: JobCard) => void;
  onFilterBySkill?: (skill: string) => void;
  readonly?: boolean;
}) {
  const srcColor = SOURCE_COLORS[job.source || ''] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  const matched = job.matched_keywords || [];
  const missing = job.missing_keywords || [];
  const totalKeywords = matched.length + missing.length;

  return (
    <div className={`relative flex flex-col gap-3 p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow ${job.is_visited ? 'border-blue-200' : 'border-gray-200'}`}>

      {/* Visited badge */}
      {job.is_visited && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs text-blue-500 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" /> Applied
        </span>
      )}

      {/* Header */}
      <div className="pr-16">
        <h3 className="font-semibold text-gray-900 text-base leading-snug">{job.title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {job.source && (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${srcColor}`}>
            {job.source}
          </span>
        )}
        {job.location && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />{job.location}
          </span>
        )}
        {job.salary && (
          <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded border border-green-200">{job.salary}</span>
        )}
        {job.posted_date && (
          <span className="text-xs text-gray-400 ml-auto">{job.posted_date}</span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{job.description}</p>
      )}

      {/* Unscorable notification if description is not visible */}
      {job.score_note ? (
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            {job.score_note}
          </span>
          <span className="text-[11px] text-gray-400 italic">Open job link to read full listing</span>
        </div>
      ) : job.relevance_score !== null && (
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${scoreBadge(job.relevance_score)}`}>
              <Star className="h-3 w-3 fill-current" /> {job.relevance_score}% Match
            </span>
            {totalKeywords > 0 && (
              <span className="text-[11px] text-gray-500 font-medium">
                {matched.length}/{totalKeywords} required skills on your profile
              </span>
            )}
          </div>

          {/* Matched & Missing Skills Badges */}
          {(matched.length > 0 || missing.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {matched.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onFilterBySkill?.(skill)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  title={`Filter all jobs by ${skill}`}
                >
                  <Check className="h-3 w-3 text-emerald-600" /> {skill}
                </button>
              ))}

              {missing.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onFilterBySkill?.(skill)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                  title={`Required by job but not found on your profile. Click to filter.`}
                >
                  <span className="text-red-500 font-bold">✕</span> {skill}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Areas to improve */}
      {Array.isArray(job.areas_to_improve) && job.areas_to_improve.length > 0 && (
        <div className="text-xs text-gray-500 space-y-1 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
          <p className="font-semibold text-gray-700">To improve before applying:</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-600">
            {job.areas_to_improve.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
      )}

      {/* Actions */}
      {!readonly && (
        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={() => onApply(job)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Apply
          </button>
          <button
            onClick={() => onSave(job)}
            className={`flex items-center justify-center w-10 rounded-lg border transition-colors ${
              job.is_saved
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-500'
            }`}
          >
            {job.is_saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      )}

      {readonly && (
        <div className="mt-auto pt-2">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View Job
          </a>
        </div>
      )}
    </div>
  );
}

// ── Profile View Component ────────────────────────────────────────────────────
function ProfileView({ profile }: { profile: Record<string, unknown> }) {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{title}</h2>
      {children}
    </div>
  );

  const skills = profile.skills as string[] | undefined;
  const education = profile.education as Array<Record<string, string>> | undefined;
  const experience = profile.experience as Array<Record<string, unknown>> | undefined;
  const projects = profile.projects as Array<Record<string, unknown>> | undefined;
  const achievements = profile.achievements as Array<Record<string, string>> | undefined;

  return (
    <div className="space-y-2">
      {/* Basic Info */}
      <Section title="Basic Information">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {(['full_name', 'email', 'phone', 'location'] as const).map((key) =>
            profile[key] ? (
              <div key={key}>
                <span className="text-gray-400 capitalize">{key.replace('_', ' ')}: </span>
                <span className="text-gray-800 font-medium">{profile[key] as string}</span>
              </div>
            ) : null,
          )}
        </div>
        {Boolean(profile.summary) && (
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">{profile.summary as string}</p>
        )}
      </Section>

      {/* Skills */}
      {skills && skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <Section title="Education">
          <div className="space-y-3">
            {education.map((edu, i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-100 bg-gray-50">
                <p className="font-medium text-gray-800">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                <p className="text-sm text-gray-600">{edu.institution}</p>
                {(edu.start_date || edu.end_date) && (
                  <p className="text-xs text-gray-400 mt-1">{edu.start_date} — {edu.end_date || 'Present'}</p>
                )}
                {edu.description && <p className="text-xs text-gray-500 mt-1">{edu.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <Section title="Experience">
          <div className="space-y-3">
            {experience.map((exp, i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{exp.role as string}</p>
                  {Boolean(exp.is_internship) && (
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-full text-xs">Internship</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{exp.company as string}</p>
                {Boolean(exp.start_date || exp.end_date) && (
                  <p className="text-xs text-gray-400 mt-1">{exp.start_date as string} — {(exp.end_date as string) || 'Present'}</p>
                )}
                {Boolean(exp.description) && <p className="text-xs text-gray-500 mt-2">{exp.description as string}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-3">
            {projects.map((proj, i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{proj.name as string}</p>
                  {Boolean(proj.url) && (
                    <a href={proj.url as string} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                      <ExternalLink className="h-3 w-3 inline" /> link
                    </a>
                  )}
                </div>
                {Boolean(proj.start_date || proj.end_date) && (
                  <p className="text-xs text-gray-400">{proj.start_date as string} — {(proj.end_date as string) || 'Present'}</p>
                )}
                {Boolean(proj.description) && <p className="text-xs text-gray-500 mt-1">{proj.description as string}</p>}
                {(proj.tech_stack as string[])?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(proj.tech_stack as string[]).map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-xs">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <Section title="Achievements & Awards">
          <div className="space-y-2">
            {achievements.map((ach, i) => (
              <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p className="font-medium text-gray-800 text-sm">{ach.title}</p>
                {ach.date && <p className="text-xs text-gray-400">{ach.date}</p>}
                {ach.description && <p className="text-xs text-gray-500 mt-1">{ach.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}