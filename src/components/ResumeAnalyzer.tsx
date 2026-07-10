/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle, ListTodo, AlertCircle, Plus } from 'lucide-react';

export function ResumeAnalyzer() {
  const [resumeText, setResumeText] = useState('');
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunAnalysis = async () => {
    if (!resumeText.trim()) return;
    setIsLoading(true);
    setAnalysis(null);

    try {
      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText })
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateResumeUpload = () => {
    const mockResume = `Monish Sai\nEmail: monishsai581@gmail.com\n\nExperience:\n- Backend Engineer Intern at TechCorp\n- Created full-stack APIs using Node.js and Express\n- Wrote tests and managed relational MySQL data stores\n\nKeywords: REST API, Express.js, JavaScript, React, MySQL, MongoDB.`;
    setResumeText(mockResume);
  };

  return (
    <div className="space-y-6" id="resume-analyzer-layout">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left pane: Inputs box */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#161D2F] border border-slate-800 rounded-xl p-5" id="resume-input-pane">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">ATS Resume Scanner</h3>
              </div>
              <button
                type="button"
                onClick={handleSimulateResumeUpload}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 px-2 rounded-lg font-semibold"
              >
                Insert Demo Template
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-normal mb-4">
              Our AI parser scans your formatting parameters, cross-examines missing keywords against FAANG standards, and ranks ATS compliance.
            </p>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste the plain-text contents of your resume here, listing experiences, tools used and educational accomplishments..."
              className="w-full h-[280px] p-3 text-xs bg-slate-900 border border-slate-800 rounded-xl outline-none text-slate-200 resize-none font-sans leading-relaxed"
              id="resume-textarea"
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isLoading || !resumeText.trim()}
                id="analyze-resume-btn"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/25"
              >
                {isLoading ? "Analyzing..." : "Scanner ATS Compatibility"}
              </button>
            </div>
          </div>
        </div>

        {/* Right pane: Analysis reports output */}
        <div className="lg:col-span-6 space-y-4">
          {analysis ? (
            <div className="bg-[#161D2F] border border-slate-800 rounded-xl p-5 space-y-5" id="analysis-report-box">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <span className="text-[10px] text-indigo-300 font-mono font-bold tracking-widest uppercase">Report Analytics</span>
                <span className="text-xs bg-cyan-950/40 text-cyan-400 px-2.5 py-0.5 rounded border border-cyan-500/20 font-mono">Verified ATS Screen</span>
              </div>

              {/* Grid indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">COMPLIANCE SCORE</p>
                  <div className="text-3xl font-mono font-bold text-white mb-1">{analysis.atsScore}%</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${analysis.atsScore}%` }}></div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">FORMAT CHECK</p>
                  <p className="text-sm font-bold text-cyan-400 mt-2">{analysis.formattingIndex || "Acceptable"}</p>
                </div>
              </div>

              {/* Skill gap feedback */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Deficiencies & Skills Gap
                </p>
                <p className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-850 leading-relaxed font-sans">
                  {analysis.skillsGap}
                </p>
              </div>

              {/* Missing keywords list */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ListTodo className="w-3.5 h-3.5 text-slate-400" /> Missing Industry Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.missingKeywords?.map((kw: string, i: number) => (
                    <span key={i} className="text-xs bg-red-950/25 text-red-400 border border-red-500/10 px-2 py-0.5 rounded-md font-mono">{kw}</span>
                  ))}
                </div>
              </div>

              {/* ATS Recommendations lists */}
              <div className="space-y-2 pt-2 border-t border-slate-850">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> ATS Optimization Actions
                </h4>
                <ul className="space-y-2 text-xs text-slate-300 font-sans pl-2">
                  {analysis.suggestions?.map((sug: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-400 shrink-0 select-none">&rarr;</span>
                      <p className="leading-relaxed">{sug}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-[#161D2F] border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center h-full min-h-[300px]" id="empty-state">
              <FileText className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-xs font-bold text-white mb-1">Scanner Report Ready To Begin</p>
              <p className="text-xs text-slate-400 max-w-xs">Write or paste your CV inputs, check missing technology keywords, and raise your placement readiness index!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
