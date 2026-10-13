import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';
import {
  Bot, Briefcase, FileText, MapPin, LogOut, Search,
  SlidersHorizontal, ChevronLeft, ChevronRight, UploadCloud,
  Bookmark, BookmarkCheck, ExternalLink, Loader2, Star, CheckCircle2,
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
  areas_to_improve: string[];
  is_saved: boolean;
  is_visited: boolean;
}

type ActiveView = 'search' | 'profile' | 'saved' | 'visited';

const SOURCES = ['Workable', 'Greenhouse', 'Wellfound', 'Lever'] as const;

// ── Source colour map ─────────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  Workable: 'bg-blue-50 text-blue-700 border-blue-200',
  Greenhouse: 'bg-green-50 text-green-700 border-green-200',
  Wellfound: 'bg-purple-50 text-purple-700 border-purple-200',
  Lever: 'bg-orange-50 text-orange-700 border-orange-200',
};

// ── Score badge colour ────────────────────────────────────────────────────────
function scoreBadge(score: number | null) {
  if (score === null) return 'bg-gray-100 text-gray-500';
  if (score >= 75) return 'bg-green-100 text-green-700';
  if (score >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-600';
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('search');

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Profile / saved / visited state ──────────────────────────────────────
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [savedJobs, setSavedJobs] = useState<JobCard[]>([]);
  const [visitedJobs, setVisitedJobs] = useState<JobCard[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

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
      setProfileData(res.data.profile);
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
            <span className="font-bold text-xl tracking-tight text-black">JobHunters</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {[
            { view: 'search' as ActiveView, icon: <Search className="h-5 w-5 flex-shrink-0" />, label: 'Discover Jobs' },
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
          <h1 className="text-2xl font-bold text-black">
            {activeView === 'search' && 'Discover Jobs'}
            {activeView === 'profile' && 'Resume Profile'}
            {activeView === 'saved' && 'Saved Jobs'}
            {activeView === 'visited' && 'Visited Jobs'}
          </h1>
          <div className="text-sm text-gray-500">
            Welcome back, <span className="font-semibold text-gray-900">{user?.first_name}</span>
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

                <Button variant="outline" className="h-12 w-12 p-0 rounded-lg border border-gray-200 shadow-sm">
                  <SlidersHorizontal className="h-5 w-5 text-gray-600" />
                </Button>
              </div>

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
                  <span className="ml-3 text-gray-500">Searching and scoring jobs…</span>
                </div>
              )}

              {!isSearching && hasSearched && jobs.length === 0 && (
                <div className="text-center py-20 text-gray-400">No jobs found. Try different keywords or sources.</div>
              )}

              {!isSearching && jobs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {jobs.map((job) => (
                    <JobCardComponent
                      key={job.job_hash}
                      job={job}
                      onSave={handleSave}
                      onApply={handleApply}
                    />
                  ))}
                </div>
              )}

              {!hasSearched && (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                  <Search className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg">Search a role to discover jobs across platforms</p>
                </div>
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
  readonly = false,
}: {
  job: JobCard;
  onSave: (job: JobCard) => void;
  onApply: (job: JobCard) => void;
  readonly?: boolean;
}) {
  const srcColor = SOURCE_COLORS[job.source || ''] ?? 'bg-gray-50 text-gray-600 border-gray-200';

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
          <span className="text-xs text-green-700 font-medium">{job.salary}</span>
        )}
        {job.posted_date && (
          <span className="text-xs text-gray-400 ml-auto">{job.posted_date}</span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{job.description}</p>
      )}

      {/* AI relevance score */}
      {job.relevance_score !== null && (
        <div className="flex items-start gap-2">
          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreBadge(job.relevance_score)}`}>
            <Star className="h-3 w-3" /> {job.relevance_score}% match
          </span>
        </div>
      )}

      {/* Areas to improve */}
      {job.areas_to_improve.length > 0 && (
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-700">To improve before applying:</p>
          <ul className="list-disc list-inside space-y-0.5">
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
        {profile.summary && (
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
                  {exp.is_internship && (
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-full text-xs">Internship</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{exp.company as string}</p>
                {(exp.start_date || exp.end_date) && (
                  <p className="text-xs text-gray-400 mt-1">{exp.start_date as string} — {(exp.end_date as string) || 'Present'}</p>
                )}
                {exp.description && <p className="text-xs text-gray-500 mt-2">{exp.description as string}</p>}
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
                  {proj.url && (
                    <a href={proj.url as string} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                      <ExternalLink className="h-3 w-3 inline" /> link
                    </a>
                  )}
                </div>
                {(proj.start_date || proj.end_date) && (
                  <p className="text-xs text-gray-400">{proj.start_date as string} — {(proj.end_date as string) || 'Present'}</p>
                )}
                {proj.description && <p className="text-xs text-gray-500 mt-1">{proj.description as string}</p>}
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