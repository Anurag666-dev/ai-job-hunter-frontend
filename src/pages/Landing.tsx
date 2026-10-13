// src/pages/Landing.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Briefcase, Sparkles, Search, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() { 
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-white text-gray-900">
      
      {/* Navigation */}
      <header className="flex items-center justify-between p-6 max-w-7xl mx-auto border-b border-gray-100">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-gray-900">
          <Bot className="h-6 w-6 text-green-600" />
          <span>AI Job Hunter</span>
        </div>
        <nav className="flex gap-4 items-center">
          <Button variant="ghost" onClick={() => navigate('/signin')} className="text-gray-600 hover:text-gray-900">Sign In</Button>
          <Button onClick={() => navigate('/signup')} className="bg-green-600 hover:bg-green-700 text-white font-medium">Get Started</Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center flex flex-col items-center">
        <div className="mb-6 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 shadow-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> AI-Powered Job Discovery & Resume Intelligence
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl text-gray-900">
          Search once. Hunt across <span className="text-green-600">all job boards</span> instantly.
        </h1>
        
        <p className="text-xl text-gray-600 mb-10 max-w-2xl leading-relaxed">
          Stop opening 20 tabs. Upload your resume, let our AI extract your core profile, and discover precise matches across Greenhouse, Lever, Workable, and more—complete with match scores and gap analysis.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button size="lg" className="h-14 px-8 text-base bg-green-600 hover:bg-green-700 text-white font-medium shadow-md" onClick={() => navigate('/signup')}>
            Start Hunting Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </main>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-gray-100">
        <div className="grid md:grid-cols-3 gap-12 text-left">
          
          <div className="flex flex-col gap-4 p-6 rounded-xl border border-gray-100 bg-gray-50/50 shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center text-green-700">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Multi-Platform Search</h3>
            <p className="text-gray-600">Query Brave Search across Greenhouse, Lever, Workable, and Wellfound in a single unified search box.</p>
          </div>
          
          <div className="flex flex-col gap-4 p-6 rounded-xl border border-gray-100 bg-gray-50/50 shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Match Percentage & Insights</h3>
            <p className="text-gray-600">AI evaluates your uploaded resume against live job descriptions to give you clear match ratings and tailored profile tips.</p>
          </div>
          
          <div className="flex flex-col gap-4 p-6 rounded-xl border border-gray-100 bg-gray-50/50 shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Smart Resume Tailoring</h3>
            <p className="text-gray-600">Discover exactly what keywords, skills, or projects you should add to your resume before applying to boost your interview chances.</p>
          </div>

        </div>
      </section>
    </div>
  );
}